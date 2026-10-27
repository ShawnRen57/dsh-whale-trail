import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Engine} from '../src/engine.ts';
const now=Date.parse('2028-01-01T04:00:00Z');
const make=()=>new Engine(join(mkdtempSync(join(tmpdir(),'whale-v1-')),'ledger.sqlite'),{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});
const ev=(seq,type,data,time=now-10000)=>({seq,type,data,time});
function round(base=0,turn=1,time=now-10000,tools=[],end='completed') {let seq=base;return [ev(seq++,'turn/start',{turn},time),ev(seq++,'user/message',{source:{kind:'user'},content:[{type:'text',text:'private question'}]},time),...tools.flatMap((tool,i)=>{const name=typeof tool==='string'?tool:tool.name,callId='call-'+base+'-'+i,step=1;return [ev(seq++,'tool/call',{turn,step,callId,name,arguments:'private arguments'},time),ev(seq++,'tool/result',{turn,step,message:{source:{kind:'tool',callId},content:[{type:'tool-result',toolCallId:callId,isError:tool.error??false,content:[{type:'text',text:'private output'}]}]}},time)];}),ev(seq++,'assistant/message',{turn,step:2,message:{content:[{type:'text',text:'private reply'}]},usage:{totalTokens:1}},time),ev(seq++,'turn/end',{turn,reason:{kind:end}},time)];}
const ids=e=>e.view().earned.map(b=>b.id);
const unpack=text=>JSON.parse(JSON.parse(text).payload);
const pack=p=>{const payload=JSON.stringify(p);return JSON.stringify({format:'dshbadge',payload,checksum:createHash('sha256').update(payload).digest('hex')});};
const prefs=(e,patch={})=>({...e.preferences(),...patch});

test('exploration tools require paired successful calls inside normally closed top-level human rounds',()=>{
 const e=make();e.ingest('open',round(0,1,undefined,['read']).slice(0,-1));e.ingest('failed',round(0,1,undefined,[{name:'write',error:true}]));e.ingest('cancelled',round(0,1,undefined,['bash'],'cancelled'));e.ingest('child',round(0,1,undefined,['search']),{origin:'subagent'});e.ingest('related',round(0,1,undefined,['grep']),{parentSession:'parent'});e.ingest('auto',round(0,1,undefined,['fetch']).map(x=>x.type==='user/message'?{...x,data:{...x.data,source:{kind:'goal'}}}:x));
 e.ingest('self',round(0,1,undefined,['whale_trail_snapshot','whaleTrail.backup','whale-trail.inspect']));assert.equal(ids(e).some(x=>x.startsWith('exploration.tools')),false);
 const broken=round(0,1,undefined,['read']);broken.find(x=>x.type==='tool/result').data.message.content[0].toolCallId='other';e.ingest('mismatch',broken);assert.equal(ids(e).includes('exploration.tools.1'),false);
 e.ingest('good',round(0,1,undefined,['read','read','write','bash']));assert.ok(ids(e).includes('exploration.tools.3'));assert.equal(ids(e).includes('exploration.tools.8'),false);
 e.ingest('more',round(0,1,undefined,['grep','glob','search','fetch','edit']));assert.ok(ids(e).includes('exploration.tools.8'));const before=e.export();e.ingest('more',round(0,1,undefined,['grep','glob','search','fetch','edit']));assert.equal(e.export(),before);assert.ok(!before.includes('private'));e.close();
});
test('exploration distinguishes unique completed sessions and distinct return dates in the same chat',()=>{
 const e=make();for(let i=0;i<10;i++)e.ingest('chat'+i,round(0,1,now-10000-i*86400000));assert.ok(ids(e).includes('exploration.sessions.10'));assert.equal(ids(e).includes('exploration.revisit.3'),false);
 for(let i=0;i<7;i++)e.ingest('same',round(i*10,i+1,now-10000-i*86400000));assert.ok(ids(e).includes('exploration.revisit.7'));e.close();
});
test('compaction exploration needs matching successful lifecycle then a subsequent human input and normal reply',()=>{
 const e=make();const compact=[ev(0,'compaction/start',{turn:null,compactionId:'c'}),ev(1,'compaction/summary',{turn:null,compactionId:'c',usage:{totalTokens:1}}),ev(2,'compaction/end',{turn:null,compactionId:'c'})];e.ingest('chat',[...compact,...round(3)]);assert.ok(ids(e).includes('exploration.compaction.1'));e.close();
 for(const broken of [compact.slice(1),compact.filter(x=>x.type!=='compaction/summary'),compact.map(x=>x.type==='compaction/end'?{...x,data:{...x.data,error:'failed'}}:x),compact.map(x=>x.type==='compaction/end'?{...x,data:{...x.data,compactionId:'other'}}:x)]){const x=make();x.ingest('chat',[...broken,...round(3)]);assert.equal(ids(x).includes('exploration.compaction.1'),false);x.close();}
 const x=make();const r=round();x.ingest('chat',[r[0],r[1],...compact.map((v,i)=>({...v,seq:2+i,data:{...v.data,turn:1}})),...r.slice(2).map((v,i)=>({...v,seq:5+i}))]);assert.equal(ids(x).includes('exploration.compaction.1'),false);x.close();
});
test('nine chapters unlock exactly four rewards at both day and completed-round thresholds',()=>{
 const e=make();assert.equal(e.view().collection.chapters.length,9);assert.deepEqual(e.view().collection.unlockedDecor,[]);
 e.ingest('first',round());let v=e.view();assert.deepEqual(v.collection.unlockedDecor,['c1-whale','c1-clownfish','c1-kelp','c1-shell']);assert.equal(v.collection.chapters[0].unlocked,true);assert.equal(v.collection.chapters[1].unlocked,false);
 for(let i=0;i<1000;i++)e.ingest('full',round(i*10,i+1,Date.parse('2026-01-01T04:00:00Z')+Math.min(i,364)*86400000));v=e.view();assert.equal(v.collection.chapters.filter(c=>c.unlocked).length,9);assert.equal(new Set(v.collection.unlockedDecor).size,36);assert.equal(v.collection.chapters.every(c=>c.rewards.length===4),true);e.close();
});
test('preferences persist but locked decor and unearned showcase cannot grant progress',()=>{
 const e=make();assert.equal(e.preferences().aquarium.enabled,false);assert.throws(()=>e.setPreferences(prefs(e,{aquarium:{...e.preferences().aquarium,selected:['c9-beluga']}})),/locked|unlocked/);assert.throws(()=>e.setPreferences(prefs(e,{card:{badgeIds:['days.365'],signature:''}})),/five|5|earned/);
 e.ingest('first',round());const input=prefs(e,{aquarium:{...e.preferences().aquarium,enabled:true,selected:['c1-whale'],speed:0.5,density:8,color:'#abcdef',reducedMotion:true},card:{badgeIds:[],signature:'<script>hello</script>'}});e.setPreferences(input);const file=e.file,device=e.deviceId;e.close();const next=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.deepEqual(next.preferences(),input);assert.equal(next.deviceId,device);assert.equal(next.view().metrics.dialogues,1);assert.throws(()=>next.setPreferences({...input,card:{badgeIds:[],signature:'x'.repeat(121)}}));next.close();
});
test('five distinct earned showcases are allowed and backup restores sanitized display preferences atomically',()=>{
 const a=make();for(let i=0;i<10;i++)a.ingest('s'+i,round(0,1,now-10000-i*86400000,['read','write','bash']));const badgeIds=['days.1','days.3','days.7','dialogues.1','dialogues.10'];a.setPreferences(prefs(a,{card:{badgeIds,signature:'Hello 鲸鱼'},aquarium:{...a.preferences().aquarium,enabled:true,selected:['c1-whale']}}));assert.throws(()=>a.setPreferences(prefs(a,{card:{badgeIds:Array(5).fill('days.1'),signature:''}})));
 const b=make();b.import(a.export());assert.deepEqual(b.preferences(),a.preferences());b.import(a.export());assert.equal(b.view().metrics.dialogues,10);
 const malicious=unpack(a.export());malicious.facts=[];malicious.sessions=[];malicious.awards=[];malicious.preferences.aquarium.selected=['c9-beluga'];malicious.preferences.card.badgeIds=['days.365'];const clean=make();clean.import(pack(malicious));assert.deepEqual(clean.preferences().aquarium.selected,[]);assert.deepEqual(clean.preferences().card.badgeIds,[]);assert.equal(clean.view().collection.unlockedDecor.length,0);
 const before=b.export(),bad=unpack(a.export());bad.preferences.aquarium.speed=-1;assert.throws(()=>b.import(pack(bad)));assert.equal(b.export(),before);a.close();b.close();clean.close();
});
test('frozen genuine v3 identity imports without resetting preferences and upgrade snapshots evidence once',()=>{
 const e=make();e.ingest('s',round());e.setPreferences(prefs(e,{card:{badgeIds:[],signature:'keep'}}));const p=unpack(e.export());p.schema=3;p.rulesVersion=3;delete p.preferences;const old=JSON.parse(readFileSync('assets/legacy-catalog-v3.json','utf8'));p.artworkCatalogHash=createHash('sha256').update(JSON.stringify(old.map(({id,family,threshold})=>({id,family,threshold})))).digest('hex');p.awards=p.awards.filter(x=>old.some(y=>y.id===x.id));e.import(pack(p));assert.equal(e.preferences().card.signature,'keep');p.artworkCatalogHash='f'.repeat(64);assert.throws(()=>e.import(pack(p)),/mismatch/);
 e.db.prepare("UPDATE config SET value='3' WHERE key='rulesVersion'").run();const file=e.file;e.close();const next=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(next.view().metrics.dialogues,1);assert.equal(readdirSync(join(file,'..','backups')).filter(x=>x.startsWith('before-rules-v4-')).length,1);next.close();const again=new Engine(file,{profileId:'test',timezone:'Asia/Shanghai',now:()=>now});assert.equal(readdirSync(join(file,'..','backups')).length,1);again.close();
});

test('imported display settings preserve an existing local choice while old backups never reset it',()=>{
 const a=make(),b=make();a.setPreferences(prefs(a,{card:{badgeIds:[],signature:'source'}}));b.setPreferences(prefs(b,{card:{badgeIds:[],signature:'local'}}));b.import(a.export());assert.equal(b.preferences().card.signature,'local');a.close();b.close();
});
test('late session metadata excludes inherited and child evidence without rewriting facts',()=>{
 const e=make();const events=round(0,1,undefined,['read']);e.ingest('fork',events);e.ingest('fork',events,{inheritedEventCount:events.length});assert.equal(e.view().metrics.dialogues,0);assert.equal(ids(e).includes('exploration.tools.1'),false);assert.equal(unpack(e.export()).facts.length,events.length);assert.throws(()=>e.ingest('fork',[],{inheritedEventCount:events.length+1}),/metadata conflict/);e.close();
 const x=make();x.ingest('child',round(0,1,undefined,['write']));x.ingest('child',[],{origin:'subagent'});assert.equal(ids(x).includes('exploration.tools.1'),false);x.close();
});
test('rescanning old v3 tool facts enriches missing pairing coordinates without altering evidence',()=>{
 const e=make();const source=make();source.ingest('chat',round(0,1,undefined,['read']));const p=unpack(source.export());p.schema=3;p.rulesVersion=3;delete p.preferences;p.artworkCatalogHash=createHash('sha256').update(JSON.stringify(JSON.parse(readFileSync('assets/legacy-catalog-v3.json','utf8')).map(({id,family,threshold})=>({id,family,threshold})))).digest('hex');p.awards=p.awards.filter(x=>!x.id.startsWith('exploration.'));for(const f of p.facts){delete f.feature.callId;delete f.feature.step;delete f.feature.verifiedSuccess;if(f.type==='tool/call')delete f.feature.turn;}e.import(pack(p));assert.equal(ids(e).includes('exploration.tools.1'),false);e.ingest('chat',round(0,1,undefined,['read']));assert.ok(ids(e).includes('exploration.tools.1'));e.import(pack(p));assert.ok(ids(e).includes('exploration.tools.1'));e.close();source.close();
});

test('unknown tool identity, missing explicit success and mismatched coordinates never count as exploration',()=>{
 for(const mutate of [r=>delete r.find(x=>x.type==='tool/call').data.name,r=>r.find(x=>x.type==='tool/call').data.name='',r=>delete r.find(x=>x.type==='tool/result').data.message.content[0].isError,r=>r.find(x=>x.type==='tool/result').data.step=2,r=>r.find(x=>x.type==='tool/result').data.turn=2,r=>r.find(x=>x.type==='tool/result').data.error={name:'Error',code:'FAILED'}]){const e=make(),r=round(0,1,undefined,['read']);mutate(r);e.ingest('s',r);assert.equal(ids(e).includes('exploration.tools.1'),false);e.close();}
});
test('a chapter needs its round requirement even when the day requirement has already been met',()=>{
 const e=make();for(let i=0;i<9;i++)e.ingest('s',round(i*10,i+1,now-10000-(i%3)*86400000));assert.equal(e.view().collection.chapters[1].unlocked,false);e.ingest('s',round(90,10,now-1000));assert.equal(e.view().collection.chapters[1].unlocked,true);assert.equal(e.view().collection.unlockedDecor.length,8);e.close();
});

test('actual SDK compaction summaries omit turn and still pair with a numbered owner before the next human round',()=>{
 const e=make(),first=round(),time=now-20000;const compact=[ev(2,'compaction/start',{turn:1,compactionId:'sdk'} ,time),ev(3,'compaction/summary',{compactionId:'sdk',usage:{totalTokens:1}},time),ev(4,'compaction/end',{turn:1,compactionId:'sdk'},time)];e.ingest('s',[...first.slice(0,2).map(v=>({...v,time})),...compact,...first.slice(2).map((v,i)=>({...v,seq:5+i,time})),...round(7,2)]);assert.ok(ids(e).includes('exploration.compaction.1'));e.close();
});

test('installed rc.3 native role tool result envelope pairs by source and top-level toolCallId',()=>{
 for(const isError of [false,true]){const e=make(),r=round(0,1,undefined,['bash']);const result=r.find(x=>x.type==='tool/result'),callId=result.data.message.source.callId;result.data.message={id:'tool-message',role:'tool',source:{kind:'tool',callId},toolCallId:callId,isError,content:[{type:'text',text:'private result'}]};e.ingest('native',r);assert.equal(ids(e).includes('exploration.tools.1'),!isError);e.close();}
});
