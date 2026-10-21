import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
await mkdir('qa',{recursive:true});
const catalog=JSON.parse(await readFile('assets/catalog.json','utf8'));
await mkdir('assets/web',{recursive:true});await mkdir('assets/png-256',{recursive:true});
const checks=[];for(const b of catalog){const input='assets/badges/'+b.id+'.png';const m=await sharp(input).metadata();if(!m.hasAlpha)throw Error('Missing alpha: '+b.id);
 await sharp(input).resize(384,384,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:88,alphaQuality:100}).toFile('assets/web/'+b.id+'.webp');
 await sharp(input).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile('assets/png-256/'+b.id+'.png');checks.push({id:b.id,width:m.width,height:m.height,alpha:m.hasAlpha});}
const placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="117" fill="#f1f0ec" stroke="#9ba3af" stroke-width="7"/><circle cx="128" cy="128" r="102" fill="none" stroke="#b6bbc3" stroke-width="2" stroke-dasharray="4 6"/><path d="M101 102a27 27 0 1 1 43 22c-12 8-16 10-16 26" fill="none" stroke="#9099a6" stroke-width="12" stroke-linecap="round"/><circle cx="128" cy="176" r="7" fill="#9099a6"/></svg>';
await writeFile('assets/hidden-placeholder.svg',placeholder);
const names={days:'累计天数 · 鲸鱼到航海家',streak:'连续天数 · 从信标到灯塔群',tokens:'Token 回响 · 从微光到海洋档案馆',dialogues:'累计对话 · 从初次问答到对话领航',festival:'2026 节日限定',hidden:'隐藏典藏 · 仅供物料审阅'};
const overlays=[];
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2190"><rect width="100%" height="100%" fill="#f8f6ef"/><g font-family="Arial Unicode MS, sans-serif" fill="#182b47"><text x="50" y="62" font-size="32" font-weight="bold">DSH 鲸迹 · 全量徽章物料 / 28枚</text><text x="50" y="100" font-size="18">圆形印章 · 固定数值牌 · 场景进化 · 2026 / v0.2.0</text>';
for(const [row,family] of Object.keys(names).entries()){
 const y=145+row*335;svg+=`<text x="50" y="${y}" font-size="22">${names[family]}</text><line x1="50" x2="1750" y1="${y+14}" y2="${y+14}" stroke="#ddd8cd"/>`;
 for(const [i,b]of catalog.filter(b=>b.family===family).entries()){const x=50+i*287;overlays.push({input:await sharp('assets/web/'+b.id+'.webp').resize(225,225).png().toBuffer(),left:x+25,top:y+30});svg+=`<text x="${x+137}" y="${y+282}" font-size="18" text-anchor="middle">${b.name}</text><text x="${x+137}" y="${y+309}" font-size="13" text-anchor="middle" fill="#738093">${b.value} / ${b.label}</text>`;}}
svg+='</g></svg>';await sharp(Buffer.from(svg)).composite(overlays).png().toFile('assets/全量28枚徽章_审阅总览.png');await writeFile('qa/materials.json',JSON.stringify(checks,null,2)+'\n');
console.log('28 transparent originals, 28 WebP, 28 PNG256, hidden placeholder, review overview verified');
