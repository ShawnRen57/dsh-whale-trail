import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useModalLayer} from '@deepseek-ai/dsh-client-ui-primitives';
import {BadgeIcon} from './BadgeIcon.ts';
import {RefreshIcon,CloseIcon} from './HeaderIcons.tsx';
import {Laurel} from './Laurel.tsx';
import type {LedgerView,BadgeView,MergePreview} from '../engine.ts';
import type {Copy} from './locales.ts';
export interface Snapshot extends LedgerView {art:Record<string,string>;}
export interface Api {snapshot():Promise<Snapshot>;backup():Promise<string>;inspect(text:string):Promise<MergePreview>;restore(text:string):Promise<Snapshot>;}
const families=['days','streak','tokens','dialogues','festival','hidden'] as const;
const hiddenPlaceholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="117" fill="#f1f0ec" stroke="#9ba3af" stroke-width="7"/><circle cx="128" cy="128" r="102" fill="none" stroke="#b6bbc3" stroke-width="2" stroke-dasharray="4 6"/><path d="M101 102a27 27 0 1 1 43 22c-12 8-16 10-16 26" fill="none" stroke="#9099a6" stroke-width="12" stroke-linecap="round"/><circle cx="128" cy="176" r="7" fill="#9099a6"/><path d="M50 187q78 42 156 0" fill="none" stroke="#b6bbc3" stroke-width="3"/></svg>');
function how(b:BadgeView,copy:Copy):string|undefined {if(!b.how)return;if(copy.title==='我的徽章')return b.how;const n=b.threshold.toLocaleString('en-US');return ({days:copy.howDays,streak:copy.howStreak,tokens:copy.howTokens,dialogues:copy.howDialogues,festival:copy.howFestival} as Record<string,string>)[b.family]?.replaceAll('{n}',n).replaceAll('{name}',b.name);}
/** Locked hidden badges intentionally receive no artwork URL or unlock text. */
export function BadgeCard({badge,art,copy,zone}:{badge:BadgeView;art:Record<string,string>;copy:Copy;zone:string}){
 const [show,setShow]=useState(false);const tip=useRef<HTMLDivElement>(null);const item=useRef<HTMLDivElement>(null);const locked=badge.achievedAt===undefined;const secret=badge.family==='hidden';
 const description=how(badge,copy);const date=badge.achievedAt===undefined?undefined:new Intl.DateTimeFormat(copy.title==='我的徽章'?'zh-CN':'en-GB',{timeZone:zone,dateStyle:'medium'}).format(badge.achievedAt);
 const id='wt-tip-'+badge.id.replaceAll('.','-');
 return <div className="wt-card" ref={item} tabIndex={0} data-badge-id={badge.id} data-locked={locked} aria-label={`${badge.name}${date?', '+copy.found+' '+date:''}`} aria-describedby={description?id:undefined}
 onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onFocus={()=>setShow(true)} onBlur={()=>setShow(false)}>
 <img className={locked&&!secret?'wt-badge wt-gray':'wt-badge'} src={locked&&secret?hiddenPlaceholder:art[badge.id]} alt="" loading="lazy" draggable={false}/>
 <div className="wt-badge-name">{badge.name}</div>{date&&<div className="wt-earned-date">{date}</div>}
 {description&&<div ref={tip} id={id} role="tooltip" className="wt-tooltip" data-visible={show}>{description}</div>}
 </div>;
}
/** The 800×800 geometry follows the shipped SettingsRoot panel exactly. */
export function BadgeDialog({api,copy,onClose}:{api:Api;copy:Copy;onClose:()=>void}){
 const [data,setData]=useState<Snapshot>();const [failed,setFailed]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [pending,setPending]=useState<{text:string;preview:MergePreview}>();const panel=useRef<HTMLDivElement>(null);const upload=useRef<HTMLInputElement>(null);const alive=useRef(true);const epoch=useRef(0);
 const load=async()=>{const revision=++epoch.current;setFailed(false);try{const v=await api.snapshot();if(alive.current&&revision===epoch.current)setData(v);}catch(error){console.error('[whale-trail] snapshot failed',error instanceof Error?error.message:String(error));if(alive.current&&revision===epoch.current)setFailed(true);}};
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[api]);
 useModalLayer(panel,true,onClose);
 const action=async(run:()=>Promise<void>)=>{epoch.current++;setBusy(true);setMessage('');try{await run();}catch{if(alive.current)setMessage(copy.operationFailed);}finally{if(alive.current)setBusy(false);}};
 const groups=data?families.map(f=>({family:f,badges:data.unearned.filter(b=>b.family===f)})):[];
 const body:ReactNode=failed?<div className="wt-state" role="alert"><p>{copy.failed}</p><button onClick={()=>void load()}>{copy.retry}</button></div>:!data?<div className="wt-state" role="status">{copy.loading}</div>:<>
  <div className="wt-summary">{[
   ['badges',data.earned.length,copy.badgeTotal],
   ['days',data.metrics.days,copy.activityDays],
   ['bestStreak',data.metrics.bestStreak,copy.bestStreakDays],
   ['streak',data.metrics.streak,copy.streakDays],
   ['tokens',data.metrics.tokens.toLocaleString('en-US'),copy.tokenTotal],
   ['dialogues',data.metrics.dialogues,copy.dialogueTotal]
  ].map(([id,n,label])=><div className="wt-stat" data-metric={id} key={id}>
   <div className="wt-stat-value"><Laurel side="left"/><b title={String(n)} style={{fontSize:Math.min(30,104/(String(n).length*.62))}}>{n}</b><Laurel side="right"/></div>
   <span className="wt-stat-label">{label}</span>
  </div>)}</div>
  <p className="wt-dialogue-hint">{copy.dialogueHint}</p>
  {data.warnings.filter(w=>w!=='usage').map(w=><p key={w} className="wt-warning" role="status">{w==='history'?copy.history:w==='dialogues'?copy.dialogueHistory:copy.clock}</p>)}
  <section aria-labelledby="wt-earned"><div className="wt-section-heading"><h2 id="wt-earned">{copy.title}</h2></div>
   {data.earned.length?<div className="wt-grid">{data.earned.map(b=><BadgeCard key={b.id} badge={b} art={data.art} copy={copy} zone={data.timezone}/>)}</div>:<div className="wt-empty"><span aria-hidden="true">～</span><p>{copy.empty}</p><small>{copy.emptyHint}</small></div>}
  </section>
  <section aria-labelledby="wt-unearned"><div className="wt-section-heading"><h2 id="wt-unearned">{copy.unearned}</h2><span>{data.unearned.length}</span></div>
   {groups.filter(g=>g.badges.length).map(g=><section className="wt-family" key={g.family} aria-label={copy[g.family]}><h3>{copy[g.family]}<span>{g.badges.length}</span></h3><div className="wt-grid">{g.badges.map(b=><BadgeCard key={b.id} badge={b} art={data.art} copy={copy} zone={data.timezone}/>)}</div></section>)}
  </section>
  <div className="wt-tools"><button disabled={busy} onClick={()=>void action(async()=>{const text=await api.backup();const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`whale-trail-${new Date().toISOString().slice(0,10)}.dshbadge`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage(copy.saved);})}>{copy.backup}</button><button disabled={busy} onClick={()=>upload.current?.click()}>{copy.restore}</button>
   <input ref={upload} type="file" accept=".dshbadge" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void action(async()=>{if(file.size>50*1024*1024)throw new Error('too large');const text=await file.text();const preview=await api.inspect(text);if(alive.current)setPending({text,preview});});}}/>
  </div>
  {pending&&<section className="wt-merge-preview" role="region" aria-label={copy.mergeTitle}><h3>{copy.mergeTitle}</h3><p>{pending.preview.legacy?copy.legacyMergeHint:copy.mergeHint}</p><p>{copy.mergeFacts}: {pending.preview.newFacts} · {copy.mergeDuplicates}: {pending.preview.duplicateFacts} · {copy.mergeEnriched}: {pending.preview.enrichedFacts} · {copy.mergeAwards}: {pending.preview.earnedAfter}</p><div><button disabled={busy} onClick={()=>setPending(undefined)}>{copy.mergeCancel}</button><button disabled={busy} onClick={()=>void action(async()=>{const v=await api.restore(pending.text);if(alive.current){setData(v);setPending(undefined);setMessage(copy.restored);}})}>{copy.mergeConfirm}</button></div></section>}
  <p className="wt-backup-hint">{copy.backupHint}</p>
 </>;
 return createPortal(<div className="wt-overlay" data-testid="whale-trail-dialog"><div className="wt-mask" onClick={onClose}/><div ref={panel} role="dialog" aria-modal="true" aria-labelledby="wt-title" className="wt-panel"><header><h1 id="wt-title"><BadgeIcon size={22}/><span>{copy.dialogTitle}</span></h1><div className="wt-header-actions"><button disabled={busy} onClick={()=>void load()} aria-label={copy.refresh} title={copy.refresh}><RefreshIcon/></button><button onClick={onClose} aria-label={copy.close} title={copy.close}><CloseIcon/></button></div></header><div className="wt-scroll">{body}</div><footer><span>{copy.readOnly}</span><span role="status">{message}</span></footer></div></div>,document.body);
}
