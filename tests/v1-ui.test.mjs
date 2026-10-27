import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {BadgeDialog,AquariumEditor,NamecardEditor,zh} from '../qa/ui-test.mjs';

const image='data:image/png;base64,iVBORw0KGgo=';
const preferences=()=>({aquarium:{enabled:false,selected:[],density:8,speed:0.5,color:'#abcdef',reducedMotion:true},card:{badgeIds:[],signature:'我的航海签名'}});
const earned=(n=6)=>Array.from({length:n},(_,i)=>({id:'days.'+(i+1),name:'航迹徽章'+(i+1),family:'days',threshold:i+1,value:String(i+1),label:'DAYS',asset:'days.'+(i+1)+'.png',achievedAt:1792468800000}));
const collection=()=>({chapters:[{id:'c1',name:'初见浅湾',days:1,dialogues:1,rewards:['c1-whale','c1-clownfish','c1-kelp','c1-shell'],unlocked:true,completedAt:1792468800000,progress:{days:1,dialogues:1}},{id:'c2',name:'珊瑚小径',days:3,dialogues:10,rewards:['c2-ray','c2-tang','c2-coral','c2-anemone'],unlocked:false,progress:{days:1,dialogues:1}}],unlockedDecor:['c1-whale','c1-clownfish','c1-kelp','c1-shell']});
const snapshot=(n=6)=>({earned:earned(n),unearned:[],activeDates:['2026-10-20'],metrics:{days:1,streak:1,bestStreak:1,tokens:5641704,dialogues:1,missingUsage:0},timezone:'Asia/Shanghai',warnings:[],art:Object.fromEntries(earned(n).map(b=>[b.id,image])),collection:collection(),preferences:preferences()});

async function mount(t,element){
 const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost'});
 const previous=Object.fromEntries(['window','document','HTMLElement','Image','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,globalThis[key]]));
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.Image=dom.window.Image;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 // jsdom does not implement pixel canvases. These tests exercise controls and persistence,
 // so a missing rendering context uses the component's supported fallback.
 dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
 const root=createRoot(document.getElementById('root'));
 const render=async next=>{await act(async()=>root.render(next));};
 await render(element);
 t.after(async()=>{await act(async()=>root.unmount());dom.window.close();for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}});
 const button=(label)=>{const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label||b.getAttribute('aria-label')===label);assert.ok(found,'visible button: '+label);return found;};
 const click=async element=>{await act(async()=>element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));};
 return {dom,root,render,button,click};
}
const cardProps=(s,onSave)=>({preferences:s.preferences,earned:s.earned,art:s.art,metrics:s.metrics,onSave});

test('the collection shows automatically completed rewards and opens the aquarium without a claim step',async t=>{
 const s=snapshot();const ui=await mount(t,React.createElement(BadgeDialog,{api:{snapshot:async()=>structuredClone(s)},copy:zh,onClose:()=>{}}));
 await ui.click(ui.button('航海收藏册'));
 assert.match(document.body.textContent,/章节达成后自动解锁/);assert.match(document.body.textContent,/初见浅湾已完成/);assert.match(document.body.textContent,/珊瑚小径航行中/);
 for(const name of ['小蓝鲸','小丑鱼','摇曳海带','珍珠贝'])assert.ok(document.body.textContent.includes(name),name);
 assert.equal([...document.querySelectorAll('button')].some(b=>/^(领取|领取奖励|解锁章节|确认完成)$/.test(b.textContent.trim())),false);
 await ui.click(ui.button('布置我的水族馆 →'));
 assert.equal(ui.button('水族馆').getAttribute('aria-pressed'),'true');assert.ok(ui.button('保存水族馆'));
});

test('locked aquarium pieces cannot be selected and saving an unlocked piece sends the complete preferences',async t=>{
 const s=snapshot();s.preferences.card={badgeIds:earned(5).map(b=>b.id),signature:'保留名片内容'};const saves=[];
 const ui=await mount(t,React.createElement(AquariumEditor,{preferences:s.preferences,collection:s.collection,onSave:async p=>{saves.push(structuredClone(p));}}));
 const locked=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('鳐鱼'));assert.ok(locked);assert.equal(locked.disabled,true);await ui.click(locked);assert.equal(locked.getAttribute('aria-pressed'),'false');
 const whale=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('小蓝鲸'));assert.ok(whale);await ui.click(whale);assert.equal(whale.getAttribute('aria-pressed'),'true');
 const enabled=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('在 Harness 页面显示水族馆')).querySelector('input');await ui.click(enabled);
 await ui.click(ui.button('保存水族馆'));
 assert.deepEqual(saves,[{aquarium:{enabled:true,selected:['c1-whale'],density:8,speed:0.5,color:'#abcdef',reducedMotion:true},card:{badgeIds:earned(5).map(b=>b.id),signature:'保留名片内容'}}]);assert.match(document.querySelector('[role="status"]').textContent,/已保存/);
});

test('fewer than five earned badges keeps every card export disabled',async t=>{
 const s=snapshot(4),saves=[];const ui=await mount(t,React.createElement(NamecardEditor,cardProps(s,async p=>saves.push(p))));
 assert.match(document.body.textContent,/4 \/ 5/);assert.match(document.body.textContent,/目前已获得 4 枚/);
 for(const label of ['保存名片','分享高清名片','导出 PNG','导出动态 HTML'])assert.equal(ui.button(label).disabled,true,label);
 await ui.click(ui.button('导出动态 HTML'));assert.equal(saves.length,0);
});

test('exactly five selected badges enable export and a sixth earned badge can replace one selection',async t=>{
 const s=snapshot(),saves=[];const ui=await mount(t,React.createElement(NamecardEditor,cardProps(s,async p=>saves.push(structuredClone(p)))));
 for(const label of ['保存名片','分享高清名片','导出 PNG','导出动态 HTML'])assert.equal(ui.button(label).disabled,false,label);
 const pick=name=>{const button=[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.querySelector('span')?.textContent===name);assert.ok(button,name);return button;};
 assert.equal(pick('航迹徽章6').disabled,true);await ui.click(pick('航迹徽章1'));assert.equal(ui.button('导出 PNG').disabled,true);assert.equal(pick('航迹徽章6').disabled,false);
 await ui.click(pick('航迹徽章6'));assert.equal(ui.button('导出 PNG').disabled,false);assert.equal(pick('航迹徽章1').getAttribute('aria-pressed'),'false');assert.equal(pick('航迹徽章6').getAttribute('aria-pressed'),'true');
 await ui.click(ui.button('保存名片'));
 assert.deepEqual(saves,[{aquarium:s.preferences.aquarium,card:{badgeIds:['days.2','days.3','days.4','days.5','days.6'],signature:'我的航海签名'}}]);assert.match(document.querySelector('[role="status"]').textContent,/名片设置已保存/);
});

test('the save response updates the dialog snapshot and survives moving between feature tabs',async t=>{
 let current=snapshot();const saves=[];const api={snapshot:async()=>structuredClone(current),savePreferences:async p=>{saves.push(structuredClone(p));current={...current,preferences:structuredClone(p),metrics:{...current.metrics,tokens:777,dialogues:12}};return structuredClone(current);}};
 const ui=await mount(t,React.createElement(BadgeDialog,{api,copy:zh,onClose:()=>{}}));await ui.click(ui.button('水族馆'));
 const whale=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('小蓝鲸'));await ui.click(whale);await ui.click(ui.button('保存水族馆'));assert.equal(saves.length,1);
 await ui.click(ui.button('航海收藏册'));await ui.click(ui.button('水族馆'));const selected=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('小蓝鲸'));assert.equal(selected.getAttribute('aria-pressed'),'true');
 await ui.click(ui.button('我的徽章'));assert.equal(document.querySelector('[data-metric="tokens"] b').textContent,'777');assert.equal(document.querySelector('[data-metric="dialogues"] b').textContent,'12');
 await ui.click(ui.button('航海名片'));assert.equal(document.querySelector('textarea').value,'我的航海签名');assert.match(document.body.textContent,/Token 777/);
});

test('an older in-flight refresh cannot replace the snapshot returned by a newer preference save',async t=>{
 const initial=snapshot();let reads=0,resolveRefresh;const api={snapshot:async()=>++reads===1?structuredClone(initial):new Promise(resolve=>{resolveRefresh=resolve;}),savePreferences:async p=>({...structuredClone(initial),preferences:structuredClone(p)})};
 const ui=await mount(t,React.createElement(BadgeDialog,{api,copy:zh,onClose:()=>{}}));await ui.click(ui.button('刷新'));await ui.click(ui.button('水族馆'));await ui.click([...document.querySelectorAll('button')].find(b=>b.textContent.includes('小蓝鲸')));await ui.click(ui.button('保存水族馆'));
 await act(async()=>resolveRefresh(structuredClone(initial)));await ui.click(ui.button('航海收藏册'));await ui.click(ui.button('水族馆'));
 assert.equal([...document.querySelectorAll('button')].find(b=>b.textContent.includes('小蓝鲸')).getAttribute('aria-pressed'),'true');
});

test('five selected badges export a self-contained HTML card through the visible export control',async t=>{
 const s=snapshot();s.preferences.card={badgeIds:['days.2','days.3','days.4','days.5','days.6'],signature:'</script><img src=x onerror="alert(1)">'};s.preferences.aquarium.selected=['c1-whale'];const saves=[];let exported,download;
 const previousCreate=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;URL.createObjectURL=blob=>{exported=blob;return 'blob:whale-trail-test';};URL.revokeObjectURL=()=>{};t.after(()=>{URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;});
 const ui=await mount(t,React.createElement(NamecardEditor,cardProps(s,async p=>saves.push(structuredClone(p)))));ui.dom.window.HTMLAnchorElement.prototype.click=function(){download={name:this.download,href:this.href};};
 await ui.click(ui.button('导出动态 HTML'));
 assert.equal(exported?.type,'text/html;charset=utf-8');assert.ok(download.name.endsWith('.html'));const html=await exported.text(),file=new JSDOM(html);t.after(()=>file.window.close());
 assert.equal(file.window.document.querySelectorAll('[data-card-badge]').length,5);assert.deepEqual([...file.window.document.querySelectorAll('[data-card-badge]')].map(el=>el.getAttribute('data-card-badge')),['days.2','days.3','days.4','days.5','days.6']);assert.equal(file.window.document.querySelectorAll('script').length,1);assert.equal(file.window.document.querySelector('img[src=x]'),null);assert.equal(file.window.document.querySelector('details p').textContent,s.preferences.card.signature);assert.ok(!/src="https?:/.test(html));assert.deepEqual(saves,[s.preferences]);assert.match(document.querySelector('[role="status"]').textContent,/动态名片已导出/);
});
