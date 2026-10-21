import test from 'node:test';import assert from 'node:assert/strict';
let watchOccupant;
try{({watchOccupant}=await import('../src/client/occupant.ts'));}catch{}
test('waits for a real account occupant after its slot declaration, and removes stale adapter',()=>{
 assert.equal(typeof watchOccupant,'function');let entry;let change;let mounted=0,removed=0;
 const stop=watchOccupant(()=>entry,fn=>{change=fn;return()=>{change=undefined;}},()=>{mounted++;return()=>{removed++;};});
 assert.equal(mounted,0);entry={};change();assert.equal(mounted,1);change();assert.equal(mounted,1);entry=undefined;change();assert.equal(removed,1);stop();assert.equal(change,undefined);
});
