/** Local event-derived badge ledger. Raw prompts and tool output are never stored. */
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, chmodSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import {tmpdir} from 'node:os';
import { dirname, join } from 'node:path';
import {z} from 'zod';
const catalog = JSON.parse(readFileSync(new URL('../assets/catalog.json', import.meta.url),'utf8')) as Badge[];
export interface Badge { id:string; name:string; family:string; threshold:number; value:string; label:string; asset:string; }
export interface BadgeView extends Badge { achievedAt?:number; how?:string; }
export interface MergePreview {newFacts:number;duplicateFacts:number;enrichedFacts:number;legacy:boolean;earnedBefore:number;earnedAfter:number;}
export interface LedgerView { earned:BadgeView[]; unearned:BadgeView[]; activeDates:string[]; metrics:{days:number;streak:number;bestStreak:number;tokens:number;dialogues:number;missingUsage:number}; timezone:string; warnings:string[]; }
export interface InputEvent {seq:number;time:number;type:string;data:unknown;}
interface Meta {origin?:string;inheritedEventCount?:number;parentSession?:string;createdAt?:number;}
interface Feature {human?:boolean;visible?:boolean;usage?:number;missing?:boolean;success?:boolean;tools?:number;name?:string;compactionId?:string;turn?:number;completed?:boolean;}
interface Fact {id:string;session:string;seq:number;time:number;type:string;feature:Feature;}
interface Round {id:string;session:string;endSeq:number;time:number;inputs:Fact[];}
interface Options {profileId:string;timezone:string;now?:()=>number;}
function obj(x:unknown):Record<string,unknown>{return x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};}
function nonempty(content:unknown):boolean {return typeof content==='string'?content.trim().length>0:Array.isArray(content)&&content.some(v=>{const b=obj(v);return b.type==='text'?typeof b.text==='string'&&b.text.trim().length>0:['image','audio','file','video'].includes(String(b.type));});}
function count(x:unknown):number|undefined {return Number.isSafeInteger(x)&&Number(x)>=0?Number(x):undefined;}
function usage(x:unknown):number|undefined {const u=obj(x);if(count(u.totalTokens)!==undefined)return count(u.totalTokens);if(count(u.inputTokens)===undefined||count(u.outputTokens)===undefined)return;
 // Harness TokenUsage fields are disjoint; absent optional cache counters mean no reported cached tokens.
 return Number(u.inputTokens)+Number(u.outputTokens)+(count(u.cacheReadTokens)??0)+(count(u.cacheWriteTokens)??0);}
function streamUsage(x:unknown):number|undefined {if(!Array.isArray(x))return;let n:number|undefined;for(const v of x){const b=obj(v);const candidate=usage(obj(b.chunk).usage??b.usage??obj(b.data).usage);if(candidate!==undefined)n=candidate;}return n;}
function feature(e:InputEvent):Feature|undefined {const d=obj(e.data);switch(e.type){
 case 'turn/start':return {turn:count(d.turn)};
 case 'turn/end':return {turn:count(d.turn),...(typeof obj(d.reason).kind==='string'?{completed:obj(d.reason).kind==='completed'}:{})};
 case 'user/message':return {human:obj(d.source).kind==='user'&&nonempty(d.content)};
 case 'assistant/message':{const n=usage(d.usage);return {turn:count(d.turn),visible:nonempty(obj(d.message).content),...(n===undefined?{missing:true}:{usage:n})};}
 case 'assistant/attempt':{const n=streamUsage(d.stream);return n===undefined?{missing:true}:{usage:n};}
 case 'compaction/summary':{const n=usage(d.usage);return n===undefined?{missing:true}:{usage:n};}
 case 'tool/call':return {name:typeof d.name==='string'?d.name:String(obj(d.call).name??'unknown')};
 case 'tool/result':return {success:obj(d.message).isError!==true,turn:count(d.turn)};
 case 'request/header':{const h=obj(d.header);return Array.isArray(h.tools)?{tools:h.tools.length}:{};}
 case 'compaction/end':return {success:d.error===undefined,compactionId:typeof d.compactionId==='string'?d.compactionId:undefined};
 default:return;
}}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const canonical=(f:Feature)=>JSON.stringify(Object.fromEntries(Object.entries(f).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b))));
const dayMs=86400000;
const serial=(d:string)=>Date.parse(d+'T00:00:00Z')/dayMs;
const dateFromSerial=(n:number)=>new Date(n*dayMs).toISOString().slice(0,10);
// Legacy identities are frozen independently of the active catalog/calendar.
const legacyCatalog=JSON.parse(readFileSync(new URL('../assets/legacy-catalog-v2.json',import.meta.url),'utf8')) as Badge[];
const removedBadgeIds=new Set(['tokens.10000','tokens.100000']);
const legacyFestivalDates:Record<string,string>={'new-year':'01-01','spring':'02-17','dragon-boat':'06-19','mid-autumn':'09-25','national-day-cn':'10-01','programmer-day':'10-24'};
const calendarFile=JSON.parse(readFileSync(new URL('../assets/calendar-2026.json',import.meta.url),'utf8')) as {version:string;timezone:string;dates:Record<string,string>;names:Record<string,string>};
const currentCalendar={version:calendarFile.version,timezone:calendarFile.timezone,dates:calendarFile.dates,names:calendarFile.names};
const festivalDates=currentCalendar.dates;
const metaSchema=z.strictObject({origin:z.literal('subagent').optional(),inheritedEventCount:z.number().int().nonnegative().safe().optional(),parentSession:z.string().min(1).max(256).optional(),createdAt:z.number().int().nonnegative().safe().optional()});
const minimalMeta=(meta:unknown)=>{const value=z.record(z.string(),z.unknown()).parse(meta);return metaSchema.parse(Object.fromEntries(Object.entries(value).filter(([key])=>['origin','inheritedEventCount','parentSession','createdAt'].includes(key))));};
const idSchema=z.string().min(1).max(512);const integer=z.number().int().nonnegative().safe();
const featureSchema=z.strictObject({human:z.boolean().optional(),visible:z.boolean().optional(),usage:integer.optional(),missing:z.boolean().optional(),success:z.boolean().optional(),tools:integer.optional(),name:z.string().max(512).optional(),compactionId:z.string().max(512).optional(),turn:integer.optional(),completed:z.boolean().optional()});
const factTypes=['turn/start','turn/end','user/message','assistant/message','assistant/attempt','compaction/summary','tool/call','tool/result','request/header','compaction/end'] as const;
const calendarSchema=z.union([
 z.strictObject({version:z.literal('CN-2026-v1'),dates:z.record(z.string(),z.string())}),
 z.strictObject({version:z.literal('CN-GLOBAL-2026-v2'),timezone:z.literal('Asia/Shanghai'),dates:z.record(z.string(),z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),names:z.record(z.string(),z.string())})
]);
const backupSchema=z.strictObject({schema:z.union([z.literal(1),z.literal(2),z.literal(3)]),rulesVersion:z.union([z.literal(1),z.literal(2),z.literal(3)]),calendar:calendarSchema,artworkCatalogHash:z.string().regex(/^[a-f0-9]{64}$/),profile:idSchema,timezone:z.string().min(1).max(100),facts:z.array(z.strictObject({id:idSchema,session:idSchema,seq:integer,time:integer,type:z.enum(factTypes),feature:featureSchema})).max(200000),sessions:z.array(z.strictObject({id:idSchema,meta:z.string().max(2048)})).max(50000),operations:z.array(z.strictObject({id:idSchema,session:idSchema,done:z.boolean(),time:integer,clock:integer,device:idSchema,refs:z.array(idSchema).max(10000)})).max(100000),awards:z.array(z.strictObject({id:idSchema,time:integer})).max(1000)});
const identity=(badges:Badge[])=>hash(JSON.stringify(badges.map(({id,family,threshold})=>({id,family,threshold}))));
const catalogHash=identity(catalog);
const v2CatalogHash=identity(legacyCatalog);
const v1Catalog=legacyCatalog.map(b=>({...b,id:b.family==='dialogues'?b.id.replace('dialogues.','tasks.'):b.id,family:b.family==='dialogues'?'tasks':b.family}));
const v1CatalogHash=identity(v1Catalog);
const equalMetadata=(a:unknown,b:unknown):boolean=>{
 if(a===b)return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)||Array.isArray(b))return false;
 const left=a as Record<string,unknown>,right=b as Record<string,unknown>,keys=Object.keys(left);
 return keys.length===Object.keys(right).length&&keys.every(k=>Object.hasOwn(right,k)&&equalMetadata(left[k],right[k]));
};
/** Only the new closure flag may enrich legacy evidence; all known facts remain immutable. */
function mergeFeature(type:string,a:Feature,b:Feature):Feature {const {completed:x,...old}=a,{completed:y,...next}=b;
 if(canonical(old)!==canonical(next)||(x!==undefined&&y!==undefined&&x!==y)||(type!=='turn/end'&&(x!==undefined||y!==undefined)))throw new Error('canonical fact conflict');
 return {...old,...(x!==undefined||y!==undefined?{completed:x??y}:{})};
}

/** The SQLite file owns normalized evidence; every achievement is derived automatically. */
export class Engine {
 readonly db:DatabaseSync;readonly deviceId:string;private readonly now:()=>number;
 readonly file:string;readonly options:Options;
 constructor(file:string,options:Options){
  this.file=file;this.options=options;
  new Intl.DateTimeFormat('en-CA',{timeZone:options.timezone}).format();this.now=options.now??Date.now;
  const existed=existsSync(file);mkdirSync(dirname(file),{recursive:true,mode:0o700});this.db=new DatabaseSync(file);chmodSync(file,0o600);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS facts(id TEXT PRIMARY KEY,session TEXT NOT NULL,seq INTEGER NOT NULL,time INTEGER NOT NULL,type TEXT NOT NULL,feature TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,meta TEXT NOT NULL); CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,session TEXT NOT NULL,done INTEGER NOT NULL,time INTEGER NOT NULL,clock INTEGER NOT NULL,device TEXT NOT NULL); CREATE TABLE IF NOT EXISTS awards(id TEXT PRIMARY KEY,time INTEGER NOT NULL);');
  if(!this.db.prepare('PRAGMA table_info(operations)').all().some(c=>c.name==='refs'))this.db.exec("ALTER TABLE operations ADD COLUMN refs TEXT NOT NULL DEFAULT '[]'");
  const stored=this.config('profile');if(stored&&stored!==options.profileId)throw new Error('profile mismatch');
  const zone=this.config('timezone');if(zone&&zone!==options.timezone)throw new Error('timezone conflict; export before migration');
  const version=this.config('rulesVersion');
  if(version!==undefined&&!['1','2','3'].includes(version))throw new Error('unsupported ledger rules version');
  const obsoleteGrants=this.db.prepare("SELECT COUNT(*) n FROM awards WHERE id IN ('tokens.10000','tokens.100000')").get()?.n;
  if(version!=='3'||obsoleteGrants){
   // Snapshot before changing any version or catalog-dependent grant state, including empty v2 ledgers.
   if(existed){const folder=join(dirname(file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const backup=join(folder,(version==='3'?'before-catalog-v3-':'before-rules-v3-')+Date.now()+'-'+randomUUID()+'.sqlite');this.db.prepare('VACUUM INTO ?').run(backup);chmodSync(backup,0o600);}
   this.db.exec('BEGIN IMMEDIATE');try{
    if(version!=='2'&&version!=='3')this.db.exec("DELETE FROM awards WHERE id LIKE 'tasks.%' OR id LIKE 'hidden.%'");
    for(const id of removedBadgeIds)this.db.prepare('DELETE FROM awards WHERE id=?').run(id);
    this.setConfig('rulesVersion','3');this.db.exec('COMMIT');
   }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  this.setConfig('profile',options.profileId);this.setConfig('timezone',options.timezone);this.deviceId=this.config('device')??randomUUID();this.setConfig('device',this.deviceId);
 }
 private config(key:string):string|undefined{return (this.db.prepare('SELECT value FROM config WHERE key=?').get(key) as {value:string}|undefined)?.value;}
 private setConfig(key:string,value:string){this.db.prepare('INSERT OR REPLACE INTO config VALUES (?,?)').run(key,value);}
 private backupSessions():{id:string;meta:string}[]{return (this.db.prepare('SELECT * FROM sessions').all() as unknown as {id:string;meta:string}[]).map(row=>({id:row.id,meta:JSON.stringify(minimalMeta(JSON.parse(row.meta)))}));}
 date(time:number):string{return new Intl.DateTimeFormat('en-CA',{timeZone:this.options.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(time);}
 private facts():Fact[]{return (this.db.prepare('SELECT * FROM facts ORDER BY time,session,seq').all() as unknown as (Omit<Fact,'feature'>&{feature:string})[]).map(f=>({...f,feature:JSON.parse(f.feature) as Feature}));}
 private admitFact(f:Fact):void {if(f.id!==f.session+':'+f.seq)throw new Error('invalid canonical fact id');const prior=this.db.prepare('SELECT * FROM facts WHERE id=?').get(f.id);
  if(prior&&(prior.time!==f.time||prior.type!==f.type||prior.session!==f.session||prior.seq!==f.seq))throw new Error('canonical fact conflict');
  const value=prior?mergeFeature(f.type,JSON.parse(String(prior.feature)) as Feature,f.feature):mergeFeature(f.type,f.feature,f.feature);
  this.db.prepare('INSERT INTO facts VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET feature=excluded.feature').run(f.id,f.session,f.seq,f.time,f.type,canonical(value));
 }
 /** Admit only normalized metadata and new, non-inherited events. */
 ingest(session:string,events:readonly InputEvent[],meta:Meta={}):void {
  const normalized=metaSchema.parse(Object.fromEntries(Object.entries(meta).filter(([k])=>['origin','inheritedEventCount','parentSession','createdAt'].includes(k))));
  this.db.exec('BEGIN IMMEDIATE');try{
   const old=this.db.prepare('SELECT meta FROM sessions WHERE id=?').get(session) as {meta:string}|undefined;
   if(!old)this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(session,JSON.stringify(normalized));
   for(const e of events){if(e.seq<(meta.inheritedEventCount??0))continue;const f=feature(e);if(!f)continue;
    if(!Number.isSafeInteger(e.seq)||e.seq<0||!Number.isFinite(e.time))throw new Error('invalid event metadata');
    this.admitFact({id:session+':'+e.seq,session,seq:e.seq,time:e.time,type:e.type,feature:f});
   }this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 /** Redacted browser projection: locked hidden artwork and rules are absent. */
 view():LedgerView {
  // Repeated historical scans share civil-date conversions within one immutable evidence view.
  const dateCache=new Map<number,string>();const localDate=(time:number):string=>{let value=dateCache.get(time);if(value===undefined){value=this.date(time);dateCache.set(time,value);}return value;};
  const facts=this.facts();const metas=new Map((this.db.prepare('SELECT * FROM sessions').all() as unknown as {id:string;meta:string}[]).map(s=>[s.id,JSON.parse(s.meta) as Meta]));
  const active=new Map<string,number>();const interactions=new Map<string,Fact[]>();const sessions=new Map<string,Fact[]>();let tokens=0,missingUsage=0;
  const warnings:string[]=[];let future=false,legacyClosure=false;const rounds:Round[]=[];
  for(const f of facts){const a=sessions.get(f.session)??[];a.push(f);sessions.set(f.session,a);tokens+=f.feature.usage??0;if(f.feature.missing)missingUsage++;}
  for(const [id,unordered] of sessions){const list=unordered.sort((a,b)=>a.seq-b.seq);let pending:Fact[]=[];const isChild=metas.get(id)?.origin==='subagent';let start:Fact|undefined,reply:Fact|undefined;let inputs:Fact[]=[];
   for(const f of list){
    if(f.type==='turn/start'){if(start&&inputs.length&&reply)legacyClosure=true;start=f;reply=undefined;inputs=[];}
    if(f.type==='user/message'&&f.feature.human&&!isChild&&start){inputs.push(f);reply=undefined;}
    if(f.type==='assistant/message'&&f.feature.visible&&inputs.length&&start&&f.feature.turn===start.feature.turn)reply=f;
    if(f.type==='turn/end'){
     if(start&&start.feature.turn!==undefined&&f.feature.turn===start.feature.turn&&inputs.length&&reply){
      if(f.feature.completed===undefined)legacyClosure=true;
      const time=Math.max(f.time,reply.time,...inputs.map(i=>i.time));
      if(time>this.now()+300000)future=true;
      else if(f.feature.completed===true)rounds.push({id:start.id,session:id,endSeq:f.seq,time,inputs});
     }start=undefined;reply=undefined;inputs=[];
    }
    if(f.type==='turn/start'||f.type==='turn/end')pending=[];
    if(f.type==='user/message'&&f.feature.human&&!isChild)pending.push(f);
    if(pending.length&&(f.feature.visible||f.type==='tool/result'&&f.feature.success)){
     for(const input of pending){if(input.time>this.now()+300000){future=true;continue;}
     const d=localDate(input.time);active.set(d,Math.min(active.get(d)??Infinity,f.time));
     const a=interactions.get(id)??[];if(!a.some(v=>v.id===input.id))a.push(input);interactions.set(id,a);}pending=[];
    }
   }
   if(!isChild&&!list.some(f=>f.type==='turn/start')&&interactions.has(id)&&list.some(f=>f.feature.visible))legacyClosure=true;
  }
  rounds.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
  if(future)warnings.push('clock');if(missingUsage)warnings.push('usage');if(legacyClosure)warnings.push('dialogues');
  const dates=[...active.keys()].sort();let bestStreak=0,run=0,previous=-Infinity;const streakTimes=new Map<number,number>();
  let segment:number[]=[];const thresholds=catalog.filter(a=>a.family==='streak').map(a=>a.threshold);const maxWindow=Math.max(...thresholds);
  for(const d of dates){const n=serial(d);if(n!==previous+1)segment=[];run=n===previous+1?run+1:1;previous=n;bestStreak=Math.max(bestStreak,run);segment.push(active.get(d)!);if(segment.length>maxWindow)segment.shift();for(const threshold of thresholds)if(run>=threshold){const at=Math.max(...segment.slice(-threshold));streakTimes.set(threshold,Math.min(streakTimes.get(threshold)??Infinity,at));}}
  const dayProofTimes=[...active.values()].sort((a,b)=>a-b);
  const today=serial(localDate(this.now()));let streak=0;if(previous>=today-1&&previous<=today){let n=previous;const set=new Set(dates);while(set.has(dateFromSerial(n--)))streak++;}
  const qualified=new Map<string,number>();
  const award=(id:string,time:number)=>qualified.set(id,Math.min(qualified.get(id)??Infinity,time));
  for(const a of catalog){let at:number|undefined;
   if(a.family==='days'&&dates.length>=a.threshold)at=dayProofTimes[a.threshold-1];
   if(a.family==='streak'&&bestStreak>=a.threshold)at=streakTimes.get(a.threshold);
   if(a.family==='tokens'&&tokens>=a.threshold){let n=0;at=facts.find(f=>(n+=f.feature.usage??0)>=a.threshold)?.time;}
   if(a.family==='dialogues'&&rounds.length>=a.threshold)at=rounds[a.threshold-1]?.time;
   if(a.family==='festival'){const key=a.id.split('.')[1]!;const d=festivalDates[key];if(active.has(d))at=active.get(d);}
   if(at!==undefined)qualified.set(a.id,at);
  }
  for(const round of rounds){const list=(sessions.get(round.session)??[]).filter(f=>f.seq<=round.endSeq);const humans=list.filter(f=>f.type==='user/message'&&f.feature.human);
   const priorRounds=rounds.filter(r=>r.session===round.session&&r.endSeq<=round.endSeq);const completedHumans=priorRounds.flatMap(r=>r.inputs);
   const born=metas.get(round.session)?.createdAt;
   if(born!==undefined&&round.inputs.some(h=>{const d=localDate(h.time);return d.endsWith('-02-29')&&localDate(born)===d&&localDate(round.time)===d;}))award('hidden.leap-day',round.time);
   const compactions=list.filter(f=>f.type==='compaction/end'&&f.feature.success&&f.feature.compactionId);const ids=new Set(compactions.map(c=>c.feature.compactionId));
   if(ids.size>=2&&compactions.some((c,i)=>compactions.slice(i+1).some(n=>n.feature.compactionId!==c.feature.compactionId&&humans.some(h=>h.seq>c.seq&&h.seq<n.seq))))award('hidden.ocean-in-bottle',round.time);
   if(humans.some((h,i)=>{if(!i||!round.inputs.some(v=>v.id===h.id))return false;const gap=serial(localDate(h.time))-serial(localDate(humans[i-1]!.time));const delay=serial(localDate(round.time))-serial(localDate(h.time));return gap>=31&&delay>=0&&delay<=6;}))award('hidden.bottle-reply',round.time);
   // Child relationships must be known; missing tool evidence never means zero tools.
   const child=[...metas.values()].some(m=>m.origin==='subagent'&&m.parentSession===round.session);
   const header=list.find(f=>f.type==='request/header'&&f.feature.tools!==undefined);
   if(!child&&priorRounds.length>=3&&new Set(completedHumans.map(h=>localDate(h.time))).size>=2&&(header?.feature.tools??0)>=5&&!list.some(f=>f.type==='tool/call'&&!String(f.feature.name).startsWith('whale_trail')))award('hidden.empty-hands',round.time);
  }
  const earned:BadgeView[]=[],unearned:BadgeView[]=[];
  for(const badge of catalog){const {id,name,family,threshold,value,label,asset}=badge;const a={id,name,family,threshold,value,label,asset};const at=qualified.get(id);
   if(at!==undefined){this.db.prepare('INSERT INTO awards VALUES (?,?) ON CONFLICT(id) DO UPDATE SET time=MIN(time,excluded.time)').run(id,at);const first=Number(this.db.prepare('SELECT time FROM awards WHERE id=?').get(id)?.time??at);earned.push({...a,achievedAt:first,...family==='hidden'?{}:{how:this.how(badge)}});}
   else unearned.push({...a,asset:family==='hidden'?'hidden-placeholder.svg':asset,...family==='hidden'?{}:{how:this.how(badge)}});
  }
  earned.sort((a,b)=>(b.achievedAt??0)-(a.achievedAt??0)||a.id.localeCompare(b.id));
  return {earned,unearned,activeDates:dates,metrics:{days:dates.length,streak,bestStreak,tokens,dialogues:rounds.length,missingUsage},timezone:this.options.timezone,warnings};
 }
 private how(a:Badge):string {switch(a.family){case 'days':return `累计在 ${a.threshold} 个自然日有效使用 DeepSeek Harness。`;case 'streak':return `连续 ${a.threshold} 个自然日有效使用 DeepSeek Harness。`;case 'tokens':return `累计获得完整用量记录的 Token 达到 ${a.threshold.toLocaleString('en-US')}。`;case 'dialogues':return `累计完成 ${a.threshold} 轮有效对话：你发起一次输入，Agent 完成对应回复，自动计 1 轮。`;default:{const key=a.id.split('.')[1]!;return `在 ${festivalDates[key]} ${currentCalendar.names[key]}有效使用一次。`;}}}
 /** Validate a merge in an isolated temporary database before presenting counts. */
 inspect(text:string):MergePreview {const folder=mkdtempSync(join(tmpdir(),'whale-trail-merge-'));let stage:Engine|undefined;try{
  stage=new Engine(join(folder,'ledger.sqlite'),this.options);stage.import(this.export());const before=stage.view();const facts=Number(stage.db.prepare('SELECT COUNT(*) AS n FROM facts').get()?.n);
  const known=new Set(stage.facts().filter(f=>f.type==='turn/end'&&f.feature.completed!==undefined).map(f=>f.id));
  const after=stage.import(text);const added=Number(stage.db.prepare('SELECT COUNT(*) AS n FROM facts').get()?.n)-facts;
  const incoming=JSON.parse(JSON.parse(text).payload) as {rulesVersion:number;facts:Fact[]};
  const enriched=incoming.facts.filter(f=>f.type==='turn/end'&&f.feature.completed!==undefined&&!known.has(f.id)&&this.db.prepare('SELECT id FROM facts WHERE id=?').get(f.id)).length;
  return {newFacts:added,duplicateFacts:incoming.facts.length-added,enrichedFacts:enriched,legacy:incoming.rulesVersion===1,earnedBefore:before.earned.length,earnedAfter:after.earned.length};
 }finally{stage?.close();rmSync(folder,{recursive:true,force:true});}}
 /** One transaction yields a portable fact package; legacy manual operations are never exported. */
 export():string {this.view();this.db.exec('BEGIN');try{const payload=JSON.stringify({schema:3,rulesVersion:3,calendar:currentCalendar,artworkCatalogHash:catalogHash,profile:this.options.profileId,timezone:this.options.timezone,facts:this.facts(),sessions:this.backupSessions(),operations:[],awards:this.db.prepare('SELECT * FROM awards').all()});this.db.exec('COMMIT');return JSON.stringify({format:'dshbadge',checksum:hash(payload),payload});}catch(error){this.db.exec('ROLLBACK');throw error;}}
 /** Import evidence only. V1 manual operations and task/hidden award caches cannot grant anything. */
 import(text:string):LedgerView {
  if(text.length>50*1024*1024)throw new Error('backup too large');const box=z.strictObject({format:z.literal('dshbadge'),checksum:z.string(),payload:z.string()}).parse(JSON.parse(text));
  if(box.format!=='dshbadge'||typeof box.payload!=='string'||hash(box.payload)!==box.checksum)throw new Error('backup checksum mismatch');
  const data=backupSchema.parse(JSON.parse(box.payload));const legacy=data.rulesVersion===1;
  const expectedCalendar=data.rulesVersion===3?currentCalendar:{version:'CN-2026-v1',dates:legacyFestivalDates};
  const expectedHash=data.rulesVersion===1?v1CatalogHash:data.rulesVersion===2?v2CatalogHash:catalogHash;
  if(data.schema!==data.rulesVersion||data.profile!==this.options.profileId||data.timezone!==this.options.timezone||!equalMetadata(data.calendar,expectedCalendar)||data.artworkCatalogHash!==expectedHash)throw new Error('backup profile, timezone or rules mismatch');
  if(!legacy&&data.operations.length)throw new Error('manual operations are not supported');
  const sourceCatalog=data.rulesVersion===1?v1Catalog:data.rulesVersion===2?legacyCatalog:catalog;
  for(const award of data.awards)if(!sourceCatalog.some(b=>b.id===award.id))throw new Error('invalid award');
  this.db.exec('BEGIN IMMEDIATE');try{
   for(const s of data.sessions){const m=metaSchema.parse(JSON.parse(s.meta));const existing=this.db.prepare('SELECT meta FROM sessions WHERE id=?').get(s.id) as {meta:string}|undefined;if(existing){const old=minimalMeta(JSON.parse(existing.meta));for(const key of Object.keys(m) as (keyof typeof m)[])if(old[key]!==undefined&&old[key]!==m[key])throw new Error('session metadata conflict');this.db.prepare('UPDATE sessions SET meta=? WHERE id=?').run(JSON.stringify({...old,...m}),s.id);}else this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(s.id,JSON.stringify(m));}
   for(const f of data.facts)this.admitFact(f);
   for(const a of data.awards){const entry=sourceCatalog.find(c=>c.id===a.id)!;
    // V1 confirmations and cached dialogue/hidden awards never substitute for completed-round proof.
    if(entry.family==='tasks'||entry.family==='hidden'||entry.family==='dialogues')continue;
    if(removedBadgeIds.has(a.id))continue;
    this.db.prepare('INSERT INTO awards VALUES (?,?) ON CONFLICT(id) DO UPDATE SET time=MIN(time,excluded.time)').run(a.id,a.time);
   }
   const view=this.view();this.db.exec('COMMIT');return view;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
 close():void {this.db.close();}
}
