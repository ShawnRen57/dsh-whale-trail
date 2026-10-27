import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
let platform;
const scratch=await mkdtemp((await mkdir('.superpowers',{recursive:true}),'.superpowers/compat-'));
try {await build({entryPoints:['src/client/platform.tsx'],outfile:scratch+'/platform.mjs',bundle:true,platform:'node',format:'esm',packages:'external'});platform=await import(pathToFileURL(process.cwd()+'/'+scratch+'/platform.mjs'));} catch(error) {platform={loadError:error};}
test.after(async()=>{await rm(scratch,{recursive:true,force:true});});
test('manifest permits rc.2/rc.3 host capabilities without locking a release',async()=>{const p=JSON.parse(await readFile('package.json','utf8'));assert.equal(p.engines?.dsh,undefined);assert.ok(!/^\d+\.\d+\.\d+(?:-rc\.\d+)?$/.test(p.peerDependencies['@deepseek-ai/dsh-typert-protocol']));});
test('optional slots wait for a declaration, reject unsupported occupants and clean subscriptions',()=>{
 assert.equal(typeof platform.installOptionalSlot,'function');let entries=[],callback,declare,disposed=0,registered=0;
 const slots={inject:(name,fn)=>{declare=fn;return()=>{disposed++;};},entries:()=>entries,register:()=>{registered++;return()=>{disposed++;};}};
 const stop=platform.installOptionalSlot(slots,fn=>{callback=fn;return()=>{callback=undefined;};},'sample',()=>()=>null);
 assert.equal(registered,0);const undeclare=declare();assert.equal(registered,0);entries=[{component:{unsupported:true},options:{}}];callback();assert.equal(registered,0);entries=[{component:()=>null,options:{}}];callback();assert.equal(registered,1);undeclare();assert.equal(callback,undefined);stop();assert.equal(disposed,2);
 assert.doesNotThrow(()=>platform.installOptionalSlot({},()=>()=>{},'absent',()=>()=>null)());
});
test('memo and forwardRef are legal React occupants and child-owning entries are not shadowed',()=>{
 assert.equal(platform.isComponentType(React.memo(()=>null)),true);assert.equal(platform.isComponentType(React.forwardRef(()=>null)),true);assert.equal(platform.isComponentType({}),false);
 let registrations=0;const original={component:()=>null,options:{},children:{'sample.child':{kind:'single',scope:'root'}}};
 const slots={inject:(name,fn)=>fn(),entries:()=>[original],register:()=>{registrations++;return()=>{};}};
 const stop=platform.installOptionalSlot(slots,()=>()=>{},'sample',()=>()=>null);assert.equal(registrations,0);stop();
});
test('modal closes only the top layer, traps focus and cleans up on unmount',async()=>{
 assert.equal(typeof platform.useModalLayer,'function');const dom=new JSDOM('<html><body><button id="before">before</button><div id="root"></div></body></html>',{url:'http://localhost'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 document.getElementById('before').focus();let close=0;
 function Modal(){const ref=React.useRef(null);platform.useModalLayer(ref,true,()=>{close++;});return React.createElement('section',{ref,tabIndex:-1},React.createElement('button',{id:'first'},'first'),React.createElement('button',{id:'last'},'last'));}
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Modal)));assert.equal(document.activeElement.id,'first');document.getElementById('last').focus();document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(document.activeElement.id,'first');document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(close,1);await act(async()=>root.unmount());assert.equal(document.activeElement.id,'before');document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(close,1);dom.window.close();
});
test('preferences store shares one initial request and releases event listeners',async()=>{
 assert.equal(typeof platform.createPreferencesStore,'function');const target=new EventTarget();let requests=0;const initial={aquarium:{enabled:true}};
 const store=platform.createPreferencesStore(async()=>{requests++;return initial;},target);const seen=[];const a=store.subscribe(()=>seen.push(store.getSnapshot()));const b=store.subscribe(()=>{});await new Promise(r=>setImmediate(r));assert.equal(requests,1);assert.deepEqual(store.getSnapshot(),initial);
 const update=new Event('whale-trail:preferences');update.detail={aquarium:{enabled:false}};target.dispatchEvent(update);assert.equal(store.getSnapshot().aquarium.enabled,false);a();b();const last=store.getSnapshot();const ignored=new Event('whale-trail:preferences');ignored.detail=initial;target.dispatchEvent(ignored);assert.equal(store.getSnapshot(),last);
});
test('page geometry fails closed, masks the blank hero, and clips existing sessions to the card bottom',()=>{
 assert.equal(typeof platform.readSurfaceRegion,'function');const dom=new JSDOM('<div data-slot="main.conversation"><div data-phase="hero"><div data-slot="conversation.header"></div><div data-composer-seat><div data-composer-card></div></div></div></div>');const doc=dom.window.document;
 const box=(el,r)=>{el.getBoundingClientRect=()=>({...r,x:r.left,y:r.top,right:r.left+r.width,bottom:r.top+r.height});};
 const root=doc.querySelector('[data-phase]'),header=doc.querySelector('[data-slot="conversation.header"]'),seat=doc.querySelector('[data-composer-seat]'),card=doc.querySelector('[data-composer-card]');
 box(root,{left:200,top:0,width:900,height:700});box(header,{left:200,top:0,width:900,height:50});box(seat,{left:300,top:240,width:700,height:260});box(card,{left:320,top:370,width:660,height:110});
 const hero=platform.readSurfaceRegion(doc);assert.equal(hero.mode,'full');assert.equal(hero.top,50);assert.equal(hero.height,650);assert.deepEqual(hero.exclude,{left:300,top:240,width:700,height:260});
 root.setAttribute('data-phase','active');const composer=platform.readSurfaceRegion(doc);assert.equal(composer.mode,'composer');assert.equal(composer.left,320);assert.equal(composer.width,660);assert.equal(composer.top+composer.height,480);assert.ok(composer.height<=110);assert.ok(composer.top>=370);
 root.setAttribute('data-phase','settling');assert.equal(platform.readSurfaceRegion(doc),undefined);root.setAttribute('data-phase','active');card.remove();assert.equal(platform.readSurfaceRegion(doc),undefined);dom.window.close();
});
test('rc.2 and installed rc.3 SDK retain the specific public overlay and geometry contracts',async t=>{
 for(const [version,path]of [['0.2.1-rc.2','vendor/node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js'],['0.2.1-rc.3',process.env.WHALE_TRAIL_RC3_SDK??'/tmp/whale-trail-sdk-rc3/dsh-client-ui-conversation/lib/client.js']])await t.test(version,async t=>{let code;try{code=await readFile(path,'utf8');}catch{return t.skip('optional local distribution SDK unavailable');}const layout=await readFile(path.replace('dsh-client-ui-conversation','dsh-client-ui-layout'),'utf8');assert.match(layout,/"shell\.overlay": \{\s*kind: "list"/);for(const anchor of ['"data-phase": phase','"data-composer-card": true','"data-composer-seat": ""','name: "main.conversation"'])assert.ok(code.includes(anchor),version+' '+anchor);});
});
test('optional additive overlay cannot crash plugin when a late registration is unsupported',()=>{
 assert.equal(typeof platform.installOptionalOverlay,'function');let late;let removed=0;const slots={inject:(name,fn)=>{late=fn;return()=>{removed++;};},register:()=>{throw new Error('unsupported optional registration');}};
 const stop=platform.installOptionalOverlay(slots,()=>null);assert.doesNotThrow(()=>late());stop();assert.equal(removed,1);assert.doesNotThrow(()=>platform.installOptionalOverlay({},()=>null)());
});
test('geometry rejects a composer outside its current page',()=>{
 const dom=new JSDOM('<div data-slot="main.conversation"><div data-phase="active"><div data-composer-card></div></div></div>');const doc=dom.window.document;doc.querySelector('[data-phase]').getBoundingClientRect=()=>({left:200,top:0,width:900,height:700});doc.querySelector('[data-composer-card]').getBoundingClientRect=()=>({left:10,top:670,width:660,height:110});assert.equal(platform.readSurfaceRegion(doc),undefined);dom.window.close();
});
test('menu adapter retains the original injected face and argument channel',()=>{
 let options;const component=()=>null;const actions={open:()=>{}};const original={component,options:{priority:3},locale:'settings.account',inject:(sessionId)=>({actions,sessionId,hooks:{account:'observable'}})};
 const slots={inject:(name,fn)=>fn(),entries:()=>[original],register:(o)=>{options=o;return()=>{};}};const stop=platform.installOptionalSlot(slots,()=>()=>{},'settings.launcher',()=>()=>null,entry=>(...args)=>{const face=entry.inject(...args);return {...face,hooks:{...face.hooks,whaleLocale:'locale'}};});
 const face=options.inject('session-id');assert.equal(face.actions,actions);assert.equal(face.sessionId,'session-id');assert.deepEqual(face.hooks,{account:'observable',whaleLocale:'locale'});assert.equal(options.locale,'settings.account');assert.equal(options.priority,2);stop();
});
test('modal skips visually hidden upload controls when trapping focus',async()=>{
 const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
 function Modal(){const ref=React.useRef(null);platform.useModalLayer(ref,true,()=>{});return React.createElement('section',{ref,tabIndex:-1},React.createElement('input',{id:'hidden-upload',type:'file',style:{display:'none'}}),React.createElement('button',{id:'visible'},'visible'));}
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(Modal)));assert.equal(document.activeElement.id,'visible');await act(async()=>root.unmount());dom.window.close();
});
test('page overlay never captures input and immediately hides during a page transition, then releases observers',async()=>{
 const dom=new JSDOM('<div data-slot="main.conversation"><div data-phase="active"><div data-composer-card></div></div></div><div id="overlay"></div>',{url:'http://localhost',pretendToBeVisual:true});let disconnects=0;
 const NativeObserver=dom.window.MutationObserver;class Observer extends NativeObserver{disconnect(){disconnects++;super.disconnect();}}
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,MutationObserver:Observer,IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.querySelector('[data-phase]'),card=document.querySelector('[data-composer-card]');host.getBoundingClientRect=()=>({left:200,top:0,width:900,height:700});card.getBoundingClientRect=()=>({left:320,top:500,width:660,height:110});
 let requests=0;const prefs={aquarium:{enabled:true}};const store=platform.createPreferencesStore(async()=>{requests++;return prefs;},window);const Background=()=>React.createElement('canvas',{'data-background':true,style:{pointerEvents:'none'}});const root=createRoot(document.getElementById('overlay'));
 await act(async()=>root.render(React.createElement(platform.PageAquarium,{store,Background})));const overlay=document.querySelector('[data-whale-trail-surface]');assert.ok(overlay);assert.equal(overlay.style.pointerEvents,'none');assert.equal(overlay.getAttribute('aria-hidden'),'true');assert.equal(overlay.style.height,'96px');assert.equal(requests,1);
 await act(async()=>host.setAttribute('data-phase','settling'));assert.equal(document.querySelector('[data-whale-trail-surface]')===null,true);await act(async()=>root.unmount());assert.equal(disconnects,1);dom.window.close();
});
test('missing page-observation capability hides the optional background safely',async()=>{
 const dom=new JSDOM('<div data-slot="main.conversation"><div data-phase="active"><div data-composer-card></div></div></div><div id="overlay"></div>',{url:'http://localhost',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:undefined,IS_REACT_ACT_ENVIRONMENT:true});const host=document.querySelector('[data-phase]'),card=document.querySelector('[data-composer-card]');host.getBoundingClientRect=()=>({left:200,top:0,width:900,height:700});card.getBoundingClientRect=()=>({left:320,top:500,width:660,height:110});const prefs={aquarium:{enabled:true}},store=platform.createPreferencesStore(async()=>prefs,window),root=createRoot(document.getElementById('overlay'));await act(async()=>root.render(React.createElement(platform.PageAquarium,{store,Background:()=>React.createElement('canvas')})));const visible=!!document.querySelector('[data-whale-trail-surface]');await act(async()=>root.unmount());dom.window.close();assert.equal(visible,false);
});

test('production client factory evaluates without any unsupported host UI imports',async()=>{
 const source=await readFile('lib/client.js','utf8');let entry;vm.runInNewContext(source,{window:{__ModuleLoader__:{load:value=>{entry=value;}}}});assert.equal(entry.id,'dsh-whale-trail');const require=createRequire(import.meta.url),imports=[];const plugin=entry.factory(name=>{imports.push(name);return require(name);});assert.equal(typeof plugin.apply,'function');assert.deepEqual(Array.from(plugin.inject),['slots','locale','remote']);assert.ok(imports.every(name=>['react','react/jsx-runtime','react-dom','zod'].includes(name)));assert.ok(!source.includes('@deepseek-ai/dsh-client-ui-primitives'));
});
test('shell.overlay registers an identified list contribution as required by the release SDK',()=>{
 let accepted=0,entry;const slots={inject:(name,fn)=>fn(),register:options=>{if(typeof options.id!=='string'||!options.id)throw Error('list slot "shell.overlay" requires options.id');entry=options;accepted++;return()=>{};}};
 const stop=platform.installOptionalOverlay(slots,()=>null);assert.equal(accepted,1);assert.equal(entry.name,'shell.overlay');assert.equal(entry.id,'whale-trail.aquarium');stop();
});
