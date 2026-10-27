import {useCallback,useState,type ReactNode} from 'react';
import type {Context} from '@deepseek-ai/cordis';
import {TYPERT_REMOTE,type Request} from '../remote.ts';
import {BadgeDialog,type Api,type Snapshot} from './BadgeDialog.tsx';
import type {MergePreview} from '../engine.ts';
import type {Preferences} from '../collection.ts';
import {addBadgeMenu} from './menu-adapter.ts';
import {createPreferencesStore,installOptionalOverlay,installOptionalSlot,PageAquarium,publishPreferences,type OptionalSlots} from './platform.tsx';
import {Aquarium} from './Aquarium.tsx';
import {en,zh} from './locales.ts';
import style from './style.css';
interface Observable {getSnapshot():{active:string};subscribe(fn:()=>void):()=>void;}
interface ClientContext extends Context {
 remote:{$mount(info:typeof TYPERT_REMOTE):Promise<()=>void>;whaleTrail:{request(request:Request):Promise<{ok:true;value:unknown}|{ok:false;error:Error}>}};
 locale:Observable;
 slots:OptionalSlots;
}
interface LauncherProps {useWhaleLocale:<T>(select:(snapshot:{active:string})=>T)=>T;[key:string]:unknown;}
export const inject=['slots','locale','remote'];
/** Remote contribution is required; each optional page surface has its own capability boundary. */
export async function apply(base:Context):Promise<void>{const ctx=base as ClientContext;const unmount=await ctx.remote.$mount(TYPERT_REMOTE);ctx.effect(()=>unmount,'whale-trail: RPC contribution');ctx.plugin({name:'whale-trail-surface',inject:['slots','locale','remote','remote.whaleTrail'],apply:install});}
function AquariumBackground({preferences,mode}:{preferences:Preferences;mode:'full'|'composer'|'preview'}){return <Aquarium preferences={preferences.aquarium} mode={mode}/>;}
function install(base:Context):void{const ctx=base as ClientContext;
 const css=document.createElement('style');css.textContent=style;css.dataset.whaleTrail='';document.head.append(css);ctx.effect(()=>()=>css.remove(),'whale-trail: stylesheet');
 const send=async(request:Request)=>{const result=await ctx.remote.whaleTrail.request(request);if(!result.ok){console.error('[whale-trail] request failed',result.error.message);throw result.error;}return result.value as {type:string;data:Snapshot & {preferences:Preferences};text:string;preview:MergePreview};};
 const data=async(request:Request)=>{const result=(await send(request)).data;if(result.preferences)publishPreferences(result.preferences);return result;};
 const api:Api={snapshot:async()=>(await send({type:'snapshot'})).data,backup:async()=>(await send({type:'backup'})).text,inspect:async(text)=>(await send({type:'inspect',text})).preview,restore:async(text)=>data({type:'restore',text}),savePreferences:async(preferences)=>data({type:'preferences',preferences})};
 const preferencesStore=createPreferencesStore(async()=>(await api.snapshot()).preferences);
 function BackgroundSurface(){return <PageAquarium store={preferencesStore} Background={AquariumBackground}/>;}
 ctx.effect(()=>installOptionalOverlay(ctx.slots,BackgroundSurface),'whale-trail: optional page background');
 ctx.effect(()=>installOptionalSlot(ctx.slots,changed=>ctx.on('slots/changed',((key:string)=>{if(key==='settings.launcher')changed();}) as (...args:never[])=>void),'settings.launcher',original=>{
  // Account menu trees are inspectable for the two validated releases. Unknown
  // component representations retain the native menu and omit this contribution.
  if(typeof original.component!=='function'||original.component.prototype?.isReactComponent)return undefined;
  const useOriginalLauncher=original.component as (props:LauncherProps)=>ReactNode;
  function WhaleLauncher(props:LauncherProps){const accountTree=useOriginalLauncher(props);const language=props.useWhaleLocale(s=>s.active);const copy=language.startsWith('zh')?zh:en;const [open,setOpen]=useState(false);const close=useCallback(()=>setOpen(false),[]);return <>{addBadgeMenu(accountTree,copy.title,()=>setOpen(true))}{open&&<BadgeDialog api={api} copy={copy} onClose={close}/>}</>;}
  return WhaleLauncher;
 },original=>(...args)=>{const face=original.inject?.(...args)??{};const hooks=face.hooks as Record<string,unknown>|undefined;return {...face,hooks:{...hooks,whaleLocale:ctx.locale}};}),'whale-trail: account entry');
}
