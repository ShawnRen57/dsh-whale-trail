import {useCallback,useState,type ReactNode} from 'react';
import type {Context} from '@deepseek-ai/cordis';
import {TYPERT_REMOTE,type Request} from '../remote.ts';
import {BadgeDialog,type Api,type Snapshot} from './BadgeDialog.tsx';
import type {MergePreview} from '../engine.ts';
import {addBadgeMenu} from './menu-adapter.ts';
import {watchOccupant} from './occupant.ts';
import {en,zh} from './locales.ts';
import style from './style.css';
interface Observable {getSnapshot():{active:string};subscribe(fn:()=>void):()=>void;}
interface Entry {component:unknown;options:{priority?:number};locale?:string;inject?:()=>Record<string,unknown>;}
interface ClientContext extends Context {
 remote:{$mount(info:typeof TYPERT_REMOTE):Promise<()=>void>;whaleTrail:{request(request:Request):Promise<{ok:true;value:unknown}|{ok:false;error:Error}>}};
 locale:Observable;
 slots:{inject(name:string,fn:()=>()=>void):()=>void;entries(name:string):readonly Entry[];register(options:Record<string,unknown>,component:unknown):()=>void};
}
interface LauncherProps {useWhaleLocale:<T>(select:(snapshot:{active:string})=>T)=>T;[key:string]:unknown;}
export const inject=['slots','locale','remote'];
/** Install the browser face after the original account plugin has registered. */
export async function apply(base:Context):Promise<void>{const ctx=base as ClientContext;const unmount=await ctx.remote.$mount(TYPERT_REMOTE);ctx.effect(()=>unmount,'whale-trail: RPC contribution');ctx.plugin({name:'whale-trail-surface',inject:['slots','locale','remote','remote.whaleTrail'],apply:install});}
function install(base:Context):void{const ctx=base as ClientContext;
 const css=document.createElement('style');css.textContent=style;css.dataset.whaleTrail='';document.head.append(css);ctx.effect(()=>()=>css.remove(),'whale-trail: stylesheet');
 const send=async(request:Request)=>{const result=await ctx.remote.whaleTrail.request(request);if(!result.ok){console.error('[whale-trail] request failed',result.error.message);throw result.error;}return result.value as {type:string;data:Snapshot;text:string;preview:MergePreview};};
 const api:Api={snapshot:async()=>(await send({type:'snapshot'})).data,backup:async()=>(await send({type:'backup'})).text,inspect:async(text)=>(await send({type:'inspect',text})).preview,restore:async(text)=>(await send({type:'restore',text})).data};
 ctx.slots.inject('settings.launcher',()=>{
  let adapter:unknown;
  return watchOccupant(()=>ctx.slots.entries('settings.launcher').find(e=>e.component!==adapter),changed=>ctx.on('slots/changed',((key:string)=>{if(key==='settings.launcher')changed();}) as (...args:never[])=>void),(original)=>{
  if(typeof original.component!=='function')throw new Error('whale-trail: account launcher is incompatible; expected Harness 0.2.1-rc.2');
  // The stored component is the public single-slot occupant. Its hook sequence
  // remains unconditional and stable for this pinned adapter's lifetime.
  const useOriginalLauncher=original.component as (props:LauncherProps)=>ReactNode;
  function WhaleLauncher(props:LauncherProps){const accountTree=useOriginalLauncher(props);const language=props.useWhaleLocale(s=>s.active);const copy=language.startsWith('zh')?zh:en;const [open,setOpen]=useState(false);const close=useCallback(()=>setOpen(false),[]);return <>{addBadgeMenu(accountTree,copy.title,()=>setOpen(true))}{open&&<BadgeDialog api={api} copy={copy} onClose={close}/>}</>;}
  adapter=WhaleLauncher;
  return ctx.slots.register({name:'settings.launcher',priority:(original.options.priority??0)-1,locale:original.locale,inject:()=>{const face=original.inject?.()??{};const hooks=face.hooks as Record<string,unknown>|undefined;return {...face,hooks:{...hooks,whaleLocale:ctx.locale}};}},WhaleLauncher);
 });});
}
