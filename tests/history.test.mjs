import test from 'node:test';import assert from 'node:assert/strict';
let scanHistory;try{({scanHistory}=await import('../src/history.ts'));}catch{}
test('history listing failures become a visible scan result rather than a rejected startup promise',async()=>{assert.equal(typeof scanHistory,'function');const r=await scanHistory({list:async()=>{throw new Error('disk unavailable');}},()=>{},()=>false);assert.equal(r.failures,1);});
test('a read or close failure is contained while later sessions still scan',async()=>{
 let closed=0,ingested=0;const r=await scanHistory({list:async()=>[{header:{id:'a'}},{header:{id:'b'}}],open:async(id)=>({header:{id},inheritedEventCount:0,read:async()=>{if(id==='a')throw new Error('read');return {events:[]};},close:async()=>{closed++;if(id==='a')throw new Error('close');}})},()=>{ingested++;},()=>false);
 assert.equal(closed,2);assert.equal(ingested,1);assert.equal(r.failures,2);
});
