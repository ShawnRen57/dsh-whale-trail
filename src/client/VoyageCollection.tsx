import type {CollectionView} from '../collection.ts';
import {DECOR} from '../aquarium.ts';
export function VoyageCollection({collection,english=false,onAquarium}:{collection:CollectionView;english?:boolean;onAquarium:()=>void}) {return <div className="wt-voyage">
 <div className="wt-tab-intro"><span className="wt-eyebrow">THE VOYAGE COLLECTION</span><h2>{english?'Every chapter opens a new ocean.':'每一段航程，都有新的海洋。'}</h2><p>{english?'Chapters unlock automatically. Four aquarium pieces per chapter; no claim button or token spending required.':'章节达成后自动解锁，每章获得 4 件水族馆装饰。自然使用，无需领取。'}</p></div>
 <div className="wt-route">{collection.chapters.map((c,i)=>{const d=c.progress.days/c.days,r=c.progress.dialogues/c.dialogues;return <section className="wt-chapter" data-completed={c.unlocked} key={c.id}>
 <div className="wt-chapter-no">{String(i+1).padStart(2,'0')}<span>{c.unlocked?'✓':'·'}</span></div><div className="wt-chapter-body"><div className="wt-chapter-heading"><h3>{c.name}</h3><span>{c.unlocked?(english?'Completed':'已完成'):(english?'In progress':'航行中')}</span></div>
 <div className="wt-chapter-progress"><label>{english?'Active days':'累计使用'} <b>{c.progress.days} / {c.days} {english?'days':'天'}</b><progress value={d} max={1}/></label><label>{english?'Dialogue rounds':'完整对话'} <b>{c.progress.dialogues} / {c.dialogues} {english?'rounds':'轮'}</b><progress value={r} max={1}/></label></div>
 <div className="wt-reward-row">{c.rewards.map(id=>{const item=DECOR.find(a=>a.id===id);return <div className="wt-mini-reward" data-locked={!c.unlocked} key={id}><pre aria-hidden="true">{item?.frames[0]}</pre><span>{item?.name??id}</span></div>;})}</div>
 {c.unlocked&&<button className="wt-text-button" onClick={onAquarium}>{english?'Decorate my aquarium →':'布置我的水族馆 →'}</button>}</div>
 </section>;})}</div></div>;}
