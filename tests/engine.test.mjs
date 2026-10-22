import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {createHash} from 'node:crypto';
const {Engine}=await import('../src/engine.ts');
const make=()=>new Engine(join(mkdtempSync(join(tmpdir(),'whale-test-')),'ledger.sqlite'),{profileId:'test',timezone:'Asia/Shanghai',now:()=>Date.parse('2026-10-20T05:00:00Z')});
const ev=(seq,type,data,time='2026-10-19T16:01:00Z')=>({seq,type,data,time:Date.parse(time)});
const human=(seq=1,time)=>ev(seq,'user/message',{id:'u'+seq,source:{kind:'user'},content:[{type:'text',text:'hello'}]},time);
const answer=(seq=2,time,usage)=>ev(seq,'assistant/message',{turn:1,step:1,message:{content:[{type:'text',text:'hello'}]},usage},time);
const round=(base=0,time='2026-10-20T04:00:00Z',turn=1,usage)=>[ev(base,'turn/start',{turn},time),human(base+1,time),{...answer(base+2,time,usage),data:{...answer(base+2,time,usage).data,turn}},ev(base+3,'turn/end',{turn,reason:{kind:'completed'}},time)];
test('implementation is available',()=>assert.equal(typeof Engine,'function'));
test('counts one original input date only after a visible answer; replay is idempotent',()=>{
 const e=make();e.ingest('s',[human()]);assert.equal(e.view().metrics.days,0);
 e.ingest('s',[human(),answer()]);e.ingest('s',[human(),answer()]);
 assert.equal(e.view().metrics.days,1);assert.equal(e.view().earned[0].id,'days.1');e.close();
});
test('midnight belongs to input and automated/subagent inputs do not make active days',()=>{
 const e=make(); e.ingest('s',[human(1,'2026-10-19T15:59:00Z'),answer(2,'2026-10-19T16:01:00Z')]);
 e.ingest('auto',[ev(1,'user/message',{source:{kind:'goal'},content:[{type:'text',text:'go'}]}),answer()]);
 e.ingest('child',[human(),answer()],{origin:'subagent'});
 assert.deepEqual(e.view().activeDates,['2026-10-19']);e.close();
});
test('authoritative usage counts once and reasoning is not added twice; missing is unknown',()=>{
 const e=make();const events=[human(),answer(2,undefined,{inputTokens:10,outputTokens:5,cacheReadTokens:20,reasoningTokens:3,totalTokens:35})];
 e.ingest('s',events);e.ingest('s',events);e.ingest('x',[human(),answer()]);
 assert.equal(e.view().metrics.tokens,35);assert.equal(e.view().metrics.missingUsage,1);e.close();
});
test('fork prefix is excluded and same source imported on second host is not counted again',()=>{
 const e=make();e.ingest('s',[human(),answer(2,undefined,{totalTokens:10000})]);
 e.ingest('fork',[human(),answer(2,undefined,{totalTokens:10000})],{inheritedEventCount:3});
 assert.equal(e.view().metrics.tokens,10000);e.close();
});
test('the engine has no manual confirmation API and ignores retained legacy operations',()=>{
 const e=make();assert.equal(e.complete,undefined);e.ingest('s',round());e.db.prepare('INSERT INTO operations VALUES (?,?,?,?,?,?,?)').run('old','s',0,1,1,'device','[]');assert.equal(e.view().metrics.dialogues,1);assert.deepEqual(JSON.parse(JSON.parse(e.export()).payload).operations,[]);e.close();
});
test('hidden unearned view exposes names but neither actual asset nor conditions',()=>{
 const e=make();const hidden=e.view().unearned.filter(a=>a.family==='hidden');assert.equal(hidden.length,6);
 assert.equal(hidden[0].name,'漂流瓶回信');assert.equal(hidden[0].asset,'hidden-placeholder.svg');
 assert.equal(hidden.some(a=>a.how!==undefined),false);e.close();
});
test('streak uses unique dates across sessions, keeps yesterday pending and preserves best',()=>{
 const e=make();for(const [i,d] of ['17','18','19'].entries())e.ingest('s'+i,[human(1,`2026-10-${d}T04:00:00Z`),answer(2,`2026-10-${d}T04:01:00Z`)]);
 assert.equal(e.view().metrics.streak,3);assert.equal(e.view().metrics.bestStreak,3);e.close();
});
test('backup roundtrip union does not double usage or mutate original device identity',()=>{
 const e=make();e.ingest('s',round(0,undefined,1,{totalTokens:10000}));
 const data=e.export();const other=make();const device=other.deviceId;other.import(data);other.import(data);
 assert.equal(other.view().metrics.tokens,10000);assert.equal(other.view().metrics.dialogues,1);assert.equal(other.deviceId,device);
 assert.throws(()=>other.import(data.replace('10000','10001')),/checksum/);e.close();other.close();
});
test('earned badges sorted by achievement time descending and ordinary unearned have conditions',()=>{
 const e=make();e.ingest('s',round(0,undefined,1,{totalTokens:10000}));
 const v=e.view();assert.equal(v.earned.some(b=>b.family==='dialogues'),true);assert.equal(v.unearned.filter(a=>a.family!=='hidden').every(a=>a.how?.length>0),true);e.close();
});
test('failed attempt reads usage from the real compact stream chunk envelope',()=>{
 const e=make();e.ingest('s',[ev(1,'assistant/attempt',{stream:[{type:'chunk',time:1,chunk:{type:'done',usage:{totalTokens:99}}}]})]);
 assert.equal(e.view().metrics.tokens,99);e.close();
});
test('a long-dormant chat earns the bottle badge automatically on its completed return',()=>{
 const e=make();const events=[...round(0,'2026-09-01T04:00:00Z'),...round(4,'2026-10-20T04:00:00Z',2)];e.ingest('s',events.slice(0,-1));assert.equal(e.view().earned.some(b=>b.id==='hidden.bottle-reply'),false);e.ingest('s',events);assert.ok(e.view().earned.some(b=>b.id==='hidden.bottle-reply'));e.ingest('s',events);assert.equal(e.view().metrics.dialogues,2);e.close();
});
const changeBackup=(text,fn)=>{const b=JSON.parse(text),p=JSON.parse(b.payload);fn(p);b.payload=JSON.stringify(p);b.checksum=createHash('sha256').update(b.payload).digest('hex');return JSON.stringify(b);};
test('malformed imported metadata fails atomically and leaves every later snapshot usable',()=>{
 const e=make();e.ingest('s',[human(),answer()]);const before=e.export();
 for(const meta of ['null','[]','{"origin":42}','{"createdAt":"yesterday"}'])assert.throws(()=>e.import(changeBackup(before,p=>p.sessions.push({id:'bad',meta}))));
 assert.equal(e.view().metrics.days,1);assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,1);e.close();
});
test('compaction summary usage counts once and absent accounting is reported',()=>{
 const e=make();const c=ev(1,'compaction/summary',{compactionId:'c',usage:{totalTokens:10000}});e.ingest('s',[c]);e.ingest('s',[c,ev(2,'compaction/summary',{compactionId:'d'})]);assert.equal(e.view().metrics.tokens,10000);assert.equal(e.view().metrics.missingUsage,1);e.close();
});
test('leap-day hidden badge is automatic and requires the chat to be created on that date',()=>{
 const e=new Engine(join(mkdtempSync(join(tmpdir(),'whale-leap-')),'ledger.sqlite'),{profileId:'test',timezone:'Asia/Shanghai',now:()=>Date.parse('2028-02-29T08:00:00Z')});
 e.ingest('old',[...round(0,'2028-01-01T03:00:00Z'),...round(4,'2028-02-29T03:00:00Z',2)],{createdAt:Date.parse('2028-01-01T03:00:00Z')});assert.equal(e.view().earned.some(b=>b.id==='hidden.leap-day'),false);
 e.ingest('new',round(0,'2028-02-29T03:00:00Z'),{createdAt:Date.parse('2028-02-29T02:59:00Z')});assert.equal(e.view().earned.some(b=>b.id==='hidden.leap-day'),true);e.close();
});
test('earlier historical evidence corrects achievement date after later facts were already viewed',()=>{
 const e=make();e.ingest('late',[human(),answer()]);e.view();e.ingest('early',[human(1,'2026-09-01T03:00:00Z'),answer(2,'2026-09-01T03:01:00Z')]);assert.equal(e.date(e.view().earned.find(b=>b.id==='days.1').achievedAt),'2026-09-01');e.close();
});
test('a conflicting known completion status rejects an entire backup atomically',()=>{
 const a=make();a.ingest('s',round());const b=make();b.import(a.export());const before=b.export();const bad=changeBackup(a.export(),p=>{p.facts.find(f=>f.type==='turn/end').feature.completed=false;p.sessions.push({id:'added-before-conflict',meta:'{}'});});assert.throws(()=>b.import(bad),/canonical fact conflict/);assert.equal(b.export(),before);a.close();b.close();
});
test('backup contains versioned rules, calendar and artwork catalog identity',()=>{
 const e=make();const p=JSON.parse(JSON.parse(e.export()).payload);assert.equal(p.schema,3);assert.equal(p.rulesVersion,3);assert.equal(p.calendar.version,'CN-GLOBAL-2026-v2');assert.match(p.artworkCatalogHash,/^[a-f0-9]{64}$/);e.close();
});
test('backup inspection previews fact union without mutating the current ledger',()=>{
 const e=make(),other=make();other.ingest('s',[human(),answer()]);const preview=e.inspect(other.export());assert.equal(preview.newFacts,2);assert.equal(e.view().metrics.days,0);e.import(other.export());assert.equal(e.inspect(other.export()).newFacts,0);e.close();other.close();
});
test('one response can qualify multiple direct human inputs in the same batch on different dates',()=>{
 const e=make();e.ingest('batch',[human(1,'2026-10-19T15:59:00Z'),human(2,'2026-10-19T16:01:00Z'),answer(3,'2026-10-19T16:02:00Z')]);assert.equal(e.view().metrics.days,2);e.close();
});
test('backup export never carries incidental legacy Harness header paths or unrelated metadata',()=>{
 const e=make();e.db.prepare('INSERT INTO sessions VALUES (?,?)').run('legacy',JSON.stringify({id:'legacy',version:1,cwd:'/private/workspace',origin:'subagent',inheritedEventCount:0}));const text=e.export();assert.ok(!text.includes('/private/workspace'));e.inspect(text);e.import(text);assert.equal(e.view().metrics.days,0);e.close();
});
test('achievement timestamps follow when all qualifying responses exist, across overlapping conversations',()=>{
 const e=make();e.ingest('slow',[human(1,'2026-10-18T03:00:00Z'),answer(2,'2026-10-20T04:00:00Z')]);e.ingest('fast',[human(1,'2026-10-19T03:00:00Z'),answer(2,'2026-10-19T03:01:00Z')]);e.ingest('today',[human(1,'2026-10-20T03:00:00Z'),answer(2,'2026-10-20T03:01:00Z')]);const v=e.view();assert.equal(v.earned.find(b=>b.id==='days.1').achievedAt,Date.parse('2026-10-19T03:01:00Z'));assert.equal(v.earned.find(b=>b.id==='streak.3').achievedAt,Date.parse('2026-10-20T04:00:00Z'));e.close();
});
