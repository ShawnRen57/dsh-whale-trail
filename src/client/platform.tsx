/** Capability adapters for Harness rc.2/rc.3 and unknown hosts. No private renderer API. */
import {useEffect,useRef,useState,useSyncExternalStore,type ComponentType,type RefObject} from 'react';
import {watchOccupant} from './occupant.ts';
import type {Preferences} from '../collection.ts';
export interface SlotEntry {component:unknown;options:{priority?:number;[key:string]:unknown};locale?:string;children?:Record<string,unknown>;inject?:(...args:unknown[])=>Record<string,unknown>;}
export interface OptionalSlots {inject?(name:string,fn:()=>()=>void):()=>void;entries?(name:string):readonly SlotEntry[];register?(options:Record<string,unknown>,component:unknown):()=>void;}
export function isComponentType(component:unknown):boolean {return typeof component==='function'||(typeof component==='object'&&component!==null&&['react.memo','react.forward_ref','react.lazy'].some(name=>(component as {$$typeof?:symbol}).$$typeof===Symbol.for(name)));}
/** Single-slot decoration is safe only for entries that do not own child declarations. */
export function installOptionalSlot(slots:OptionalSlots,subscribe:(changed:()=>void)=>()=>void,name:string,decorate:(entry:SlotEntry)=>unknown,inject?:(entry:SlotEntry)=>SlotEntry['inject']):()=>void {
 if(typeof slots.inject!=='function'||typeof slots.entries!=='function'||typeof slots.register!=='function')return()=>{};
 try{return slots.inject(name,()=>{let adapter:unknown;return watchOccupant(()=>slots.entries!(name).find(entry=>entry.component!==adapter),subscribe,entry=>{
  if(!isComponentType(entry.component)||entry.children&&Object.keys(entry.children).length)return()=>{};
  adapter=decorate(entry);if(!isComponentType(adapter))return()=>{};
  try{return slots.register!({name,priority:(entry.options.priority??0)-1,locale:entry.locale,inject:inject?inject(entry):entry.inject},adapter);}catch(error){console.warn('[whale-trail] optional menu registration unavailable',error);return()=>{};}
 });});}catch(error){console.warn('[whale-trail] optional slot unavailable:',name,error instanceof Error?error.message:String(error));return()=>{};}
}
/** Declaration may be absent or appear later; optional visual surfaces are isolated. */
export function installOptionalOverlay(slots:OptionalSlots,component:unknown):()=>void {
 if(typeof slots.inject!=='function'||typeof slots.register!=='function')return()=>{};
 try{return slots.inject('shell.overlay',()=>{try{return slots.register!({name:'shell.overlay',id:'whale-trail.aquarium',priority:-100},component);}catch(error){console.warn('[whale-trail] optional background unavailable',error instanceof Error?error.message:String(error));return()=>{};}});}catch(error){console.warn('[whale-trail] optional background unavailable',error instanceof Error?error.message:String(error));return()=>{};}
}
const modalLayers:HTMLElement[]=[];
const focusable='button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';
/** Keep dialog focus/Escape behavior local instead of relying on an optional host export. */
export function useModalLayer(ref:RefObject<HTMLElement>,open:boolean,onClose:()=>void):void {
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const panel=ref.current;if(!open||!panel)return;const doc=panel.ownerDocument;const previous=doc.activeElement as HTMLElement|null;modalLayers.push(panel);
 const candidates=()=>Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter(el=>{const style=doc.defaultView?.getComputedStyle(el);return !el.closest('[hidden],[aria-hidden="true"]')&&el.getAttribute('type')!=='hidden'&&style?.display!=='none'&&style?.visibility!=='hidden';});
 (candidates()[0]??panel).focus();
 const keydown=(event:KeyboardEvent)=>{if(modalLayers.at(-1)!==panel)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close.current();}else if(event.key==='Tab'){const list=candidates();const first=list[0]??panel,last=list.at(-1)??panel;if(!panel.contains(doc.activeElement)||event.shiftKey&&doc.activeElement===first||!event.shiftKey&&doc.activeElement===last){event.preventDefault();(event.shiftKey?last:first).focus();}}};
 doc.addEventListener('keydown',keydown,true);return()=>{doc.removeEventListener('keydown',keydown,true);const i=modalLayers.indexOf(panel);if(i!==-1)modalLayers.splice(i,1);if(previous?.isConnected)previous.focus();};
 },[ref,open]);
}
export function publishPreferences(preferences:Preferences):void {if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('whale-trail:preferences',{detail:preferences}));}
/** One initial read shared across mounted page surfaces; saves publish events, never animation RPC. */
export function createPreferencesStore(read:()=>Promise<Preferences>,target:EventTarget=window){
 let value:Preferences|undefined;let live=false;let generation=0;const listeners=new Set<()=>void>();
 const publish=(next:Preferences)=>{value=next;for(const fn of listeners)fn();};
 const changed=(event:Event)=>{const next=(event as CustomEvent<Preferences>).detail;if(next&&typeof next==='object'&&next.aquarium){generation++;publish(next);}};
 return {getSnapshot:()=>value,subscribe:(fn:()=>void)=>{listeners.add(fn);if(!live){live=true;target.addEventListener('whale-trail:preferences',changed);const request=++generation;void read().then(next=>{if(live&&request===generation)publish(next);}).catch(error=>console.warn('[whale-trail] background preferences unavailable',error));}return()=>{listeners.delete(fn);if(!listeners.size){live=false;generation++;target.removeEventListener('whale-trail:preferences',changed);}};}};
}
export interface SurfaceRect {left:number;top:number;width:number;height:number;}
export interface SurfaceRegion extends SurfaceRect {mode:'full'|'composer';exclude?:SurfaceRect;}
const valid=(r:SurfaceRect)=>[r.left,r.top,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0;
function rectangle(el:Element):SurfaceRect {const r=el.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};}
/** Only read public addressable layout anchors. Unknown/settling/multiple main panels fail closed. */
export function readSurfaceRegion(doc:Document):SurfaceRegion|undefined {
 const roots=Array.from(doc.querySelectorAll('[data-slot="main.conversation"] > [data-phase]')).filter(el=>valid(rectangle(el)));
 if(roots.length!==1)return;const root=roots[0]!,phase=root.getAttribute('data-phase');if(phase!=='hero'&&phase!=='active')return;
 const rect=rectangle(root);const card=root.querySelector('[data-composer-card]');if(!card)return;const cardRect=rectangle(card);if(!valid(cardRect)||cardRect.left<rect.left-1||cardRect.top<rect.top-1||cardRect.left+cardRect.width>rect.left+rect.width+1||cardRect.top+cardRect.height>rect.top+rect.height+1)return;
 if(phase==='active'){const height=Math.min(96,cardRect.height);return {mode:'composer',left:cardRect.left,top:cardRect.top+cardRect.height-height,width:cardRect.width,height};}
 const seat=root.querySelector('[data-composer-seat]');if(!seat)return;const exclude=rectangle(seat);if(!valid(exclude))return;
 const header=root.querySelector('[data-slot="conversation.header"]');const headerBox=header?rectangle(header):undefined;const headerRect=headerBox&&valid(headerBox)?headerBox:header?.firstElementChild?rectangle(header.firstElementChild):undefined;const top=headerRect&&valid(headerRect)?Math.max(rect.top,headerRect.top+headerRect.height):rect.top;
 const result={mode:'full' as const,left:rect.left,top,width:rect.width,height:rect.top+rect.height-top,exclude};return valid(result)?result:undefined;
}
function cutout(region:SurfaceRegion):string|undefined {if(!region.exclude)return;const e=region.exclude,x=Math.max(0,e.left-region.left-8),y=Math.max(0,e.top-region.top-8),r=Math.min(region.width,e.left+e.width-region.left+8),b=Math.min(region.height,e.top+e.height-region.top+8);return `polygon(evenodd,0px 0px,${region.width}px 0px,${region.width}px ${region.height}px,0px ${region.height}px,0px 0px,${x}px ${y}px,${r}px ${y}px,${r}px ${b}px,${x}px ${b}px,${x}px ${y}px)`;}
/** Additive shell overlay; geometry updates are throttled and do not read conversation text. */
export function PageAquarium({store,Background}:{store:ReturnType<typeof createPreferencesStore>;Background:ComponentType<{preferences:Preferences;mode:'full'|'composer'|'preview'}>}){
 const preferences=useSyncExternalStore(store.subscribe,store.getSnapshot,()=>undefined);const [region,setRegion]=useState<SurfaceRegion>();
 useEffect(()=>{if(!preferences?.aquarium.enabled)return;if(typeof MutationObserver!=='function'){setRegion(undefined);return;}let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
 const update=()=>{timer=undefined;if(stopped)return;let next=document.hidden?undefined:readSurfaceRegion(document);if(next?.mode==='full'&&(!window.CSS?.supports||!window.CSS.supports('clip-path',cutout(next)!)))next=undefined;setRegion(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};
 const schedule=()=>{if(!timer&&!stopped)timer=setTimeout(update,80);};
 const observer=typeof MutationObserver==='function'?new MutationObserver(records=>{if(records.some(record=>record.attributeName==='data-phase'||Array.from(record.removedNodes).some(node=>node instanceof Element&&(node.matches('[data-slot="main.conversation"]')||node.querySelector('[data-slot="main.conversation"]')))))update();else schedule();}):undefined;observer?.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase','style','class']});
 window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);document.addEventListener('visibilitychange',schedule);update();
 return()=>{stopped=true;if(timer)clearTimeout(timer);observer?.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);document.removeEventListener('visibilitychange',schedule);};
 },[preferences?.aquarium.enabled]);
 if(!preferences?.aquarium.enabled||!region)return null;
 return <div data-whale-trail-surface={region.mode} aria-hidden="true" style={{position:'fixed',left:region.left,top:region.top,width:region.width,height:region.height,pointerEvents:'none',userSelect:'none',overflow:'hidden',clipPath:cutout(region),opacity:region.mode==='full'?0.65:0.45,zIndex:0,borderRadius:region.mode==='composer'?12:0}}><Background preferences={preferences} mode={region.mode}/></div>;
}
