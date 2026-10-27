import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Engine} from '../src/engine.ts';
import {spawnSync} from 'node:child_process';
const now=Date.parse('2027-01-02T04:00:00Z');
const make=()=>new Engine(join(mkdtempSync(join(tmpdir(),'whale-upgrade-')),'ledger.sqlite'),{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});
const pack=p=>{const payload=JSON.stringify(p);return JSON.stringify({format:'dshbadge',checksum:createHash('sha256').update(payload).digest('hex'),payload});};
const unpack=b=>JSON.parse(JSON.parse(b).payload);
// Captured from rules v2 Engine.export() before catalog replacement; contains synthetic, fully closed evidence.
const genuineV2='{"format":"dshbadge","checksum":"c11149aec4b2e187944d746f0619f87526dde38818348bddb6c6ace82af258d1","payload":"{\\"schema\\":2,\\"rulesVersion\\":2,\\"calendar\\":{\\"version\\":\\"CN-2026-v1\\",\\"dates\\":{\\"new-year\\":\\"01-01\\",\\"spring\\":\\"02-17\\",\\"dragon-boat\\":\\"06-19\\",\\"mid-autumn\\":\\"09-25\\",\\"national-day-cn\\":\\"10-01\\",\\"programmer-day\\":\\"10-24\\"}},\\"artworkCatalogHash\\":\\"7eeb8d3ef71fd789aadde1042cdc17f9acd9f2cdcb5de85ea98ff016ccccd027\\",\\"profile\\":\\"test\\",\\"timezone\\":\\"Asia/Shanghai\\",\\"facts\\":[{\\"id\\":\\"old-real-round:0\\",\\"session\\":\\"old-real-round\\",\\"seq\\":0,\\"time\\":1792468800000,\\"type\\":\\"turn/start\\",\\"feature\\":{\\"turn\\":1}},{\\"id\\":\\"old-real-round:1\\",\\"session\\":\\"old-real-round\\",\\"seq\\":1,\\"time\\":1792468800001,\\"type\\":\\"user/message\\",\\"feature\\":{\\"human\\":true}},{\\"id\\":\\"old-real-round:2\\",\\"session\\":\\"old-real-round\\",\\"seq\\":2,\\"time\\":1792468800002,\\"type\\":\\"assistant/message\\",\\"feature\\":{\\"turn\\":1,\\"usage\\":100000,\\"visible\\":true}},{\\"id\\":\\"old-real-round:3\\",\\"session\\":\\"old-real-round\\",\\"seq\\":3,\\"time\\":1792468800003,\\"type\\":\\"turn/end\\",\\"feature\\":{\\"completed\\":true,\\"turn\\":1}}],\\"sessions\\":[{\\"id\\":\\"old-real-round\\",\\"meta\\":\\"{}\\"}],\\"operations\\":[],\\"awards\\":[{\\"id\\":\\"days.1\\",\\"time\\":1792468800002},{\\"id\\":\\"tokens.10000\\",\\"time\\":1792468800002},{\\"id\\":\\"tokens.100000\\",\\"time\\":1792468800002},{\\"id\\":\\"dialogues.1\\",\\"time\\":1792468800003}]}"}';
const event=(seq,type,data,time)=>({seq,type,data,time});
const round=(base=0,turn=1,time=now-10000,usage=0)=>[event(base,'turn/start',{turn},time),event(base+1,'user/message',{source:{kind:'user'},content:[{type:'text',text:'question'}]},time+1),event(base+2,'assistant/message',{turn,message:{content:[{type:'text',text:'answer'}]},usage:{totalTokens:usage}},time+2),event(base+3,'turn/end',{turn,reason:{kind:'completed'}},time+3)];
const earned=(e,id)=>e.view().earned.find(b=>b.id===id);
test('a genuine v2 backup drops obsolete awards while preserving facts and device',()=>{
 const e=make(),device=e.deviceId;e.import(genuineV2);e.import(genuineV2);const v=e.view();assert.equal(v.metrics.tokens,100000);assert.equal(v.metrics.dialogues,1);assert.equal(e.deviceId,device);
 for(const id of ['tokens.10000','tokens.100000']){assert.equal(earned(e,id),undefined);assert.equal(v.unearned.some(b=>b.id===id),false);assert.equal(unpack(e.export()).awards.some(b=>b.id===id),false);}
 const copy=make();copy.import(e.export());copy.import(e.export());assert.equal(copy.view().metrics.tokens,100000);assert.equal(copy.view().earned.length+copy.view().unearned.length,67);copy.close();e.close();
});
test('an interim v3 ledger removes obsolete grants once after a recovery snapshot',()=>{
 const e=make();e.ingest('new',round(0,1,now-10000,100000));for(const id of ['tokens.10000','tokens.100000'])e.db.prepare('INSERT INTO awards VALUES (?,?)').run(id,now-1);const file=e.file,device=e.deviceId;e.close();
 const next=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(next.deviceId,device);assert.equal(next.view().metrics.tokens,100000);assert.equal(next.db.prepare("SELECT COUNT(*) n FROM awards WHERE id IN ('tokens.10000','tokens.100000')").get().n,0);assert.equal(readdirSync(join(file,'..','backups')).length,1);next.close();
 const again=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(readdirSync(join(file,'..','backups')).length,1);again.close();
});
test('v2 database migration snapshots the untouched grant ledger before version changes',()=>{
 const e=make();const p=unpack(genuineV2);for(const s of p.sessions)e.db.prepare('INSERT INTO sessions VALUES (?,?)').run(s.id,s.meta);for(const f of p.facts)e.db.prepare('INSERT INTO facts VALUES (?,?,?,?,?,?)').run(f.id,f.session,f.seq,f.time,f.type,JSON.stringify(f.feature));for(const a of p.awards)e.db.prepare('INSERT INTO awards VALUES (?,?)').run(a.id,a.time);e.db.prepare('UPDATE config SET value=? WHERE key=?').run('2','rulesVersion');const file=e.file,device=e.deviceId;e.close();
 const upgraded=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});const snapshots=readdirSync(join(file,'..','backups')).filter(x=>x.startsWith('before-rules-v4-'));assert.equal(snapshots.length,1);const snapshot=join(file,'..','backups',snapshots[0]);assert.equal(statSync(snapshot).mode&0o777,0o600);const old=new DatabaseSync(snapshot,{readOnly:true});assert.equal(old.prepare("SELECT value FROM config WHERE key='rulesVersion'").get().value,'2');assert.equal(old.prepare('SELECT COUNT(*) AS n FROM awards').get().n,p.awards.length);old.close();assert.equal(upgraded.deviceId,device);assert.equal(upgraded.view().metrics.tokens,100000);assert.equal(upgraded.view().earned.some(b=>['tokens.10000','tokens.100000'].includes(b.id)),false);upgraded.close();
 const again=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(readdirSync(join(file,'..','backups')).length,1);again.close();
});
test('unsupported and mismatched backup metadata reject atomically before unioning any evidence',()=>{
 const e=make();const before=e.export();for(const mutate of [p=>p.schema=2,p=>p.rulesVersion=5,p=>p.calendar.dates['new-year']='2026-01-02',p=>p.calendar.version='unknown',p=>p.calendar.names.extra='unknown',p=>p.artworkCatalogHash='0'.repeat(64),p=>p.extra='unknown',p=>p.awards.push({id:'unknown',time:1})]){const p=unpack(before);mutate(p);assert.throws(()=>e.import(pack(p)));assert.equal(e.export(),before);}
 for(const mutate of [p=>p.schema=1,p=>p.calendar.dates.spring='02-18',p=>p.artworkCatalogHash=unpack(before).artworkCatalogHash]){const p=unpack(genuineV2);mutate(p);assert.throws(()=>e.import(pack(p)));assert.equal(e.export(),before);}e.close();
});
test('new token thresholds use actual usage and reach one hundred billion without conversion',()=>{
 for(const threshold of [1000000,10000000,100000000,1000000000,10000000000,100000000000]){const e=make();e.ingest('before',round(0,1,now-10000,threshold-1));assert.equal(earned(e,'tokens.'+threshold),undefined);e.ingest('cross',round(0,1,now-1000,1));assert.equal(e.view().metrics.tokens,threshold);assert.ok(earned(e,'tokens.'+threshold));e.close();}
});
test('every accumulated day and streak threshold unlocks exactly on its required date',()=>{
 const days=[1,3,7,14,30,60,100,180,365],streaks=[3,7,14,30,60,100];const e=make();for(let n=1;n<=365;n++){const time=Date.parse('2026-01-01T04:00:00Z')+(n-1)*86400000;e.ingest('date-'+n,round(0,1,time));if(days.includes(n)||days.includes(n+1)||streaks.includes(n)||streaks.includes(n+1)){const v=e.view();assert.equal(v.metrics.days,n);assert.deepEqual(v.earned.filter(b=>b.family==='days').map(b=>b.threshold).sort((a,b)=>a-b),days.filter(t=>t<=n));assert.deepEqual(v.earned.filter(b=>b.family==='streak').map(b=>b.threshold).sort((a,b)=>a-b),streaks.filter(t=>t<=n));}}e.close();
});
test('every dialogue threshold counts closed rounds including 1000 across reused chats',()=>{
 const thresholds=[1,10,20,50,100,200,500,1000],e=make();for(let n=1;n<=1000;n++){e.ingest('chat-'+Math.floor((n-1)/10),round((n-1)*4,n,now-100000+n*10));if(thresholds.includes(n)||thresholds.includes(n+1))assert.deepEqual(e.view().earned.filter(b=>b.family==='dialogues').map(b=>b.threshold).sort((a,b)=>a-b),thresholds.filter(t=>t<=n));}assert.equal(e.view().metrics.dialogues,1000);e.close();
});
test('calendar full dates drive every festival and backup carries the exact expanded calendar',()=>{
 const e=make(),calendar=JSON.parse(readFileSync('assets/calendar-2026.json','utf8'));assert.equal(Object.keys(calendar.dates).length,24);for(const [key,date] of Object.entries(calendar.dates)){const time=Date.parse(date+'T04:00:00Z');e.ingest(key,round(0,1,time));const badge=earned(e,'festival.'+key+'.2026');assert.ok(badge,key);assert.ok(badge.how.includes(calendar.names[key]),key);}assert.equal(e.view().earned.filter(b=>b.family==='festival').length,24);const p=unpack(e.export());assert.equal(p.schema,4);assert.equal(p.rulesVersion,4);assert.deepEqual(p.calendar,{version:calendar.version,timezone:calendar.timezone,dates:calendar.dates,names:calendar.names});e.close();
});

test('a single 1000-round chat remains usable at the expanded dialogue tier',()=>{
 const file=join(mkdtempSync(join(tmpdir(),'whale-long-chat-')),'ledger.sqlite');
 const input=`import {Engine} from ${JSON.stringify(new URL('../src/engine.ts',import.meta.url).href)};const now=${now};const e=new Engine(${JSON.stringify(file)},{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});const round=${round.toString()};const event=${event.toString()};e.ingest('long-chat',Array.from({length:1000},(_,i)=>round(i*4,i+1,now-100000+i*10)).flat());const v=e.view();console.log(JSON.stringify({rounds:v.metrics.dialogues,earned:v.earned.some(b=>b.id==='dialogues.1000')}));e.close();`;
 const result=spawnSync(process.execPath,['--input-type=module'],{input,encoding:'utf8',timeout:10000});assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),{rounds:1000,earned:true});
});

test('duplicate legacy backup facts preserve usage without reviving removed awards',()=>{
 const e=make();e.ingest('existing',round(0,1,now-10000,100000));const p=unpack(genuineV2);const usage=p.facts.find(f=>f.type==='assistant/message');usage.feature.usage=10000;p.facts.push(...Array.from({length:9},()=>structuredClone(usage)));e.import(pack(p));assert.equal(e.view().metrics.tokens,110000);assert.equal(e.view().metrics.dialogues,2);assert.equal(unpack(e.export()).awards.some(b=>['tokens.10000','tokens.100000'].includes(b.id)),false);e.close();
});
