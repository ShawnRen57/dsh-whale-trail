import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Engine} from '../src/engine.ts';
const now=Date.parse('2026-10-20T09:00:00Z');
const make=()=>new Engine(join(mkdtempSync(join(tmpdir(),'whale-dialogues-')),'ledger.sqlite'),{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});
const event=(seq,type,data,time=now-10000+seq)=>({seq,type,data,time});
const human=(seq)=>event(seq,'user/message',{source:{kind:'user'},content:[{type:'text',text:'question'}]});
const answer=(seq,turn=1)=>event(seq,'assistant/message',{turn,message:{content:[{type:'text',text:'answer'}]},usage:{totalTokens:10}});
const round=(seq=0,turn=1,kind='completed')=>[event(seq,'turn/start',{turn}),human(seq+1),answer(seq+2,turn),event(seq+3,'turn/end',{turn,reason:{kind}})];
test('one full human/assistant round earns a dialogue automatically only after successful closure',()=>{
 const e=make();const facts=round();e.ingest('s',facts.slice(0,3));assert.equal(e.view().metrics.dialogues,0);e.ingest('s',facts);const v=e.view();assert.equal(v.metrics.dialogues,1);assert.ok(v.earned.some(b=>b.id==='dialogues.1'));assert.equal(v.earned.find(b=>b.id==='dialogues.1').achievedAt,facts[3].time);e.close();
});
test('several rounds inside the same chat count separately; replay and fork inheritance do not add rounds',()=>{
 const e=make();const facts=[...round(),...round(4,2),...round(8,3)];e.ingest('s',facts);e.ingest('s',facts);e.ingest('fork',facts,{inheritedEventCount:12});assert.equal(e.view().metrics.dialogues,3);e.close();
});
test('tool steps and model retries are not additional dialogues',()=>{
 const e=make();const facts=round();facts.splice(3,0,event(3,'tool/call',{name:'read_file'}),event(4,'tool/result',{turn:1,message:{isError:false}}),answer(5),event(6,'assistant/attempt',{stream:[]}));facts.at(-1).seq=7;e.ingest('s',facts);assert.equal(e.view().metrics.dialogues,1);e.close();
});
test('queued human messages sharing one completed response form one round',()=>{
 const e=make();e.ingest('s',[event(0,'turn/start',{turn:1}),human(1),human(2),answer(3),event(4,'turn/end',{turn:1,reason:{kind:'completed'}})]);assert.equal(e.view().metrics.dialogues,1);e.close();
});
test('aborted, failed, empty-answer, tools-only, background and child turns do not count',()=>{
 const e=make();for(const kind of ['aborted','error','interrupted','blocked','max-tokens'])e.ingest(kind,round(0,1,kind));
 e.ingest('background',round().map(f=>f.type==='user/message'?{...f,data:{...f.data,source:{kind:'goal'}}}:f));
 e.ingest('child',round(),{origin:'subagent'});e.ingest('tools-only',round().filter(f=>f.type!=='assistant/message'));
 e.ingest('empty',round().map(f=>f.type==='assistant/message'?{...f,data:{...f.data,message:{content:[]}}}:f));assert.equal(e.view().metrics.dialogues,0);e.close();
});
test('dialogue backup merges are idempotent and keep event-derived progress',()=>{
 const a=make(),b=make();a.ingest('s',[...round(),...round(4,2)]);b.import(a.export());b.import(a.export());assert.equal(b.view().metrics.dialogues,2);assert.equal(JSON.parse(JSON.parse(b.export()).payload).rulesVersion,4);a.close();b.close();
});
test('legacy confirmations and legacy task awards cannot create dialogue progress',()=>{
 const a=make(),b=make();a.ingest('s',round());const box=JSON.parse(a.export()),p=JSON.parse(box.payload);p.rulesVersion=1;p.schema=1;delete p.preferences;p.calendar={version:'CN-2026-v1',dates:{'new-year':'01-01',spring:'02-17','dragon-boat':'06-19','mid-autumn':'09-25','national-day-cn':'10-01','programmer-day':'10-24'}};const catalog=JSON.parse(readFileSync('assets/legacy-catalog-v2.json','utf8'));p.artworkCatalogHash=createHash('sha256').update(JSON.stringify(catalog.map(({id,family,threshold})=>({id:family==='dialogues'?id.replace('dialogues.','tasks.'):id,family:family==='dialogues'?'tasks':family,threshold})))).digest('hex');
 p.facts=p.facts.map(f=>f.type==='turn/end'?{...f,feature:{turn:1}}:f);p.operations=[{id:'legacy-manual',session:'s',done:true,time:now,clock:now,device:'old-device',refs:[]}];p.awards=[{id:'tasks.200',time:now}];box.payload=JSON.stringify(p);box.checksum=createHash('sha256').update(box.payload).digest('hex');
 b.import(JSON.stringify(box));assert.equal(b.view().metrics.dialogues,0);assert.ok(!b.view().earned.some(x=>x.id.startsWith('tasks.')||x.id.startsWith('dialogues.')));a.close();b.close();
});
test('history replay can enrich legacy turn closure evidence without canonical conflicts',()=>{
 const e=make();const facts=round();e.ingest('s',facts);e.db.prepare('UPDATE facts SET feature=? WHERE id=?').run('{"turn":1}','s:3');assert.equal(e.view().metrics.dialogues,0);e.ingest('s',facts);assert.equal(e.view().metrics.dialogues,1);e.close();
});
test('v1 database upgrade snapshots original state and derives rounds without legacy award times',()=>{
 const e=make(),file=e.file,device=e.deviceId;e.ingest('s',round());e.view();e.db.prepare('DELETE FROM config WHERE key=?').run('rulesVersion');e.db.prepare('INSERT OR REPLACE INTO awards VALUES (?,?)').run('tasks.200',1);e.db.prepare('INSERT OR REPLACE INTO awards VALUES (?,?)').run('hidden.bottle-reply',1);e.db.prepare('UPDATE facts SET feature=? WHERE id=?').run('{"turn":1}','s:3');e.close();
 const fresh=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(fresh.deviceId,device);assert.equal(fresh.view().metrics.dialogues,0);assert.equal(fresh.view().metrics.tokens,10);assert.equal(fresh.db.prepare("SELECT COUNT(*) AS n FROM awards WHERE id LIKE 'tasks.%' OR id LIKE 'hidden.%'").get().n,0);const backups=readdirSync(join(file,'..','backups'));assert.equal(backups.filter(x=>x.startsWith('before-rules-v4-')).length,1);fresh.ingest('s',round());assert.equal(fresh.view().metrics.dialogues,1);fresh.close();
});
test('enriched completion evidence merges in either order without losing known status',()=>{
 const a=make(),b=make();a.ingest('s',round());const full=a.export();a.db.prepare('UPDATE facts SET feature=? WHERE id=?').run('{"turn":1}','s:3');const old=a.export();b.import(old);const preview=b.inspect(full);assert.equal(preview.enrichedFacts,1);assert.equal(b.view().metrics.dialogues,0);b.import(full);b.import(old);assert.equal(b.view().metrics.dialogues,1);a.close();b.close();
});
test('hidden compaction and no-tools badges trigger from completed rounds with no confirmation',()=>{
 const a=make();a.ingest('s',[...round(),event(4,'compaction/end',{compactionId:'first'}),...round(5,2),event(9,'compaction/end',{compactionId:'second'}),...round(10,3)]);assert.ok(a.view().earned.some(b=>b.id==='hidden.ocean-in-bottle'));a.close();
 const b=make();const first=round(1).map(f=>({...f,time:f.time-86400000}));b.ingest('s',[event(0,'request/header',{header:{tools:['a','b','c','d','e']}}),...first,...round(5,2),...round(9,3)]);assert.ok(b.view().earned.some(x=>x.id==='hidden.empty-hands'));b.close();
});
test('a closing event for another turn and future evidence cannot create a round',()=>{
 const e=make();const wrong=round();wrong.at(-1).data.turn=2;e.ingest('wrong',wrong);e.ingest('future',round().map(f=>({...f,time:now+600000+f.seq})));assert.equal(e.view().metrics.dialogues,0);assert.ok(e.view().warnings.includes('clock'));e.close();
});
test('three queued inputs across only two rounds cannot earn the three-round hidden badge',()=>{
 const e=make();const old=now-86400000;const first=[event(1,'turn/start',{turn:1},old),{...human(2),time:old+1},{...human(3),time:old+2},{...answer(4),time:old+3},event(5,'turn/end',{turn:1,reason:{kind:'completed'}},old+4)];e.ingest('s',[event(0,'request/header',{header:{tools:['a','b','c','d','e']}}),...first,...round(6,2)]);assert.equal(e.view().metrics.dialogues,2);assert.equal(e.view().earned.some(x=>x.id==='hidden.empty-hands'),false);e.close();
});
test('an aborted first return cannot be replaced by a later round to claim dormancy',()=>{
 for(const dates of [['2026-09-01','2026-10-19','2026-10-20'],['2026-08-01','2026-10-01','2026-10-20']]){const e=make();const dated=(base,turn,kind,date)=>round(base,turn,kind).map(f=>({...f,time:Date.parse(date+'T03:00:00Z')+f.seq}));e.ingest('s',[...dated(0,1,'completed',dates[0]),...dated(4,2,'aborted',dates[1]),...dated(8,3,'completed',dates[2])]);assert.equal(e.view().earned.some(x=>x.id==='hidden.bottle-reply'),false,dates.join(','));e.close();}
});
test('legacy human and assistant evidence without turn boundaries is visibly incomplete',()=>{
 const e=make();e.ingest('s',[human(1),answer(2)]);assert.equal(e.view().metrics.dialogues,0);assert.ok(e.view().warnings.includes('dialogues'));e.close();
});
