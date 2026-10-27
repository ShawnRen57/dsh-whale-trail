import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
let rendererPromise;
function renderer() {
 assert.ok(existsSync('src/aquarium.ts'), 'the shared aquarium renderer must exist');
 return rendererPromise ??= build({entryPoints:['src/aquarium.ts'],bundle:true,platform:'node',format:'esm',write:false}).then(result=>import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64')));
}
function context() {
 const calls=[];const gradient={addColorStop:(...args)=>calls.push(['stop',...args])};
 return new Proxy({calls,measureText:t=>({width:t.length*7}),createLinearGradient:(...args)=>{calls.push(['gradient',...args]);return gradient;}},{get(target,key){if(key in target)return target[key];return (...args)=>calls.push([key,...args]);},set(target,key,value){calls.push(['set',key,value]);target[key]=value;return true;}});
}
test('nine chapters provide four distinct original ASCII rewards each',async()=>{
 const {DECOR}=await renderer();assert.equal(DECOR.length,36);assert.equal(new Set(DECOR.map(d=>d.id)).size,36);
 for(let n=1;n<=9;n++)assert.equal(DECOR.filter(d=>d.chapterId==='c'+n).length,4);
 for(const d of DECOR){assert.ok(d.name);assert.match(d.color,/^#[0-9a-f]{6}$/i);assert.ok(d.frames.length>=2);assert.ok(d.frames.every(f=>/^[\x20-\x7e\n]+$/.test(f)));}
 assert.ok(new Set(DECOR.map(d=>d.frames[0])).size>=35,'the rewards have individually drawn silhouettes');
});
test('the same time gives the same scene, only selected rewards appear, and school fish move together',async()=>{
 const {getAquariumScene}=await renderer();const selected=['c1-whale','c3-sardines'];
 const a=getAquariumScene(960,600,3800,selected,{density:1});assert.deepEqual(a,getAquariumScene(960,600,3800,selected,{density:1}));
 assert.ok(a.length>2);assert.ok(a.every(d=>selected.includes(d.id)));assert.ok(a.filter(d=>d.id==='c3-sardines').length>=4);
 assert.notDeepEqual(a,getAquariumScene(960,600,7800,selected,{density:1}));
 const fish=a.filter(d=>d.id==='c3-sardines');assert.ok(Math.max(...fish.map(d=>d.y))-Math.min(...fish.map(d=>d.y))<100);
});
test('scene dimensions remain finite and clipped safely at small sizes and density has a hard cap',async()=>{
 const {getAquariumScene,DECOR}=await renderer();
 for(const [w,h] of [[960,600],[100,32],[1,1],[0,100],[-4,20],[NaN,20]]){
  const scene=getAquariumScene(w,h,1e12,DECOR,{density:1e8,speed:Infinity});assert.ok(scene.length<=64);
  for(const item of scene){assert.ok([item.x,item.y,item.width,item.height,item.fontSize,item.opacity].every(Number.isFinite));assert.ok(item.x>=0&&item.y>=0);assert.ok(item.x+item.width<=w+.01);assert.ok(item.y+item.height<=h+.01);}
 }
 assert.deepEqual(getAquariumScene(960,600,0,[],{}),[]);
});
test('reduced motion is a still scene and composer uses a transparent top gradient',async()=>{
 const {getAquariumScene,drawAquarium}=await renderer();const items=['c1-whale','c1-kelp'];
 assert.deepEqual(getAquariumScene(800,180,0,items,{reducedMotion:true}),getAquariumScene(800,180,45000,items,{reducedMotion:true}));
 const ctx=context();drawAquarium(ctx,800,180,2000,items,{mode:'composer'});assert.ok(ctx.calls.some(c=>c[0]==='fillText'));
 assert.ok(ctx.calls.some(c=>c[0]==='stop'&&c[1]===0&&c[2].endsWith(',0)')));
 assert.ok(ctx.calls.some(c=>c[0]==='set'&&c[1]==='globalCompositeOperation'&&c[2]==='destination-in'));
});
test('offline source uses the same renderer without browser globals or external dependencies',async()=>{
 const {aquariumRuntimeSource,drawAquarium}=await renderer();const runtime=Function('return '+aquariumRuntimeSource())();const a=context(),b=context();
 drawAquarium(a,720,420,2100,['c1-whale'],{color:'#8cbad7'});runtime.drawAquarium(b,720,420,2100,['c1-whale'],{color:'#8cbad7'});assert.deepEqual(a.calls,b.calls);
});
test('Canvas is passive, respects its parent, pauses when hidden or motion is reduced, and cleans up',async()=>{
 await renderer();assert.ok(existsSync('src/client/Aquarium.tsx'));
 const result=await build({entryPoints:['src/client/Aquarium.tsx'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,plugins:[{name:'resolve-react',setup(b){b.onResolve({filter:/^react(?:\/|$)/},args=>({path:import.meta.resolve(args.path),external:true}));}}]});
 const {Aquarium}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 let hidden=false;Object.defineProperty(document,'hidden',{get:()=>hidden});let next=0;const rafs=new Map();let disconnected=0;let mediaListener;
 window.requestAnimationFrame=callback=>{rafs.set(++next,callback);return next;};window.cancelAnimationFrame=id=>rafs.delete(id);
 window.matchMedia=()=>({matches:false,addEventListener:(_type,callback)=>{mediaListener=callback;},removeEventListener:()=>{mediaListener=undefined;}});
 window.ResizeObserver=class {observe(){}disconnect(){disconnected++;}};
 window.HTMLCanvasElement.prototype.getContext=()=>context();window.HTMLElement.prototype.getBoundingClientRect=()=>({width:800,height:180});
 const root=createRoot(document.getElementById('root'));const preferences={enabled:true,selected:['c1-whale'],density:1,speed:1,color:'#8cbad7',reducedMotion:false};
 await act(async()=>root.render(React.createElement(Aquarium,{preferences,mode:'composer'})));
 let canvas=document.querySelector('canvas');assert.equal(canvas.getAttribute('aria-hidden'),'true');assert.equal(canvas.style.pointerEvents,'none');assert.equal(canvas.style.maxHeight,'100%');assert.equal(canvas.style.background,'transparent');assert.equal(rafs.size,1);
 hidden=true;await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(rafs.size,0);
 hidden=false;await act(async()=>document.dispatchEvent(new window.Event('visibilitychange')));assert.equal(rafs.size,1);
 await act(async()=>mediaListener({matches:true}));assert.equal(rafs.size,0);
 await act(async()=>root.unmount());assert.equal(rafs.size,0);assert.equal(disconnected,1);assert.equal(mediaListener,undefined);dom.window.close();
});
test('school members and repeated large creatures have room to be recognized',async()=>{
 const {getAquariumScene}=await renderer();
 for(const id of ['c3-sardines','c8-bluewhale']){
  const scene=getAquariumScene(1200,800,4200,[id],{density:100});
  for(let a=0;a<scene.length;a++)for(let b=a+1;b<scene.length;b++){
   const left=scene[a],right=scene[b];const overlapWidth=Math.max(0,Math.min(left.x+left.width,right.x+right.width)-Math.max(left.x,right.x));const overlapHeight=Math.max(0,Math.min(left.y+left.height,right.y+right.height)-Math.max(left.y,right.y));
   assert.ok(overlapWidth*overlapHeight<Math.min(left.width*left.height,right.width*right.height)*.2,'swimming silhouettes should not pile on top of one another');
  }
 }
});
