/** Mechanical exports from approved/generated originals; no illustration synthesis. */
import sharp from 'sharp';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('assets/catalog.json','utf8'));
for(const dir of ['qa','assets/web','assets/png-256','assets/previews'])await mkdir(dir,{recursive:true});
const checks=[];
for(const b of catalog){
 const input='assets/badges/'+b.id+'.png',m=await sharp(input).metadata();
 if(!m.hasAlpha||m.width<1024||m.height<1024)throw Error('Invalid original: '+b.id);
 const web='assets/web/'+b.id+'.webp',png='assets/png-256/'+b.id+'.png';
 // The hidden collection remains byte-for-byte unchanged when exports exist.
 const hidden=b.family==='hidden';
 for(const [path,size,format] of [[web,384,'webp'],[png,256,'png']]){
  let exists=false;try{await access(path);exists=true;}catch{}
  if(hidden&&exists)continue;
  const resize=sharp(input).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}});
  await(format==='webp'?resize.webp({quality:88,alphaQuality:100}):resize.png()).toFile(path);
 }
 checks.push({id:b.id,width:m.width,height:m.height,alpha:m.hasAlpha});
}
const names={days:'累计使用 · 从初潜到环球航海',streak:'连续使用 · 从信标到灯塔群',tokens:'Token 回响 · 从深海到鲸宇',dialogues:'累计对话 · 从初声到千轮鲸鸣',festival:'2026 节日限定 · 24 个相逢的日子',hidden:'隐藏典藏 · 仅供物料审阅'};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function sheet(path,title,groups){
 const columns=6,tile=280,width=1800,overlays=[];let y=154;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="HEIGHT"><rect width="100%" height="100%" fill="#f8f6ef"/><g font-family="Arial Unicode MS, sans-serif" fill="#182b47"><text x="60" y="66" font-size="34" font-weight="bold">${escape(title)}</text><text x="60" y="108" font-size="19">Whale Trail · 圆形印章 / 固定数值牌 / 场景进阶 · v0.3.0</text>`;
 for(const [heading,badges] of groups){
  svg+=`<text x="60" y="${y}" font-size="24" font-weight="bold">${escape(heading)}</text><line x1="60" x2="1740" y1="${y+18}" y2="${y+18}" stroke="#ddd8cd"/>`;
  for(const [i,b]of badges.entries()){
   const x=60+(i%columns)*tile,top=y+38+Math.floor(i/columns)*316;
   overlays.push({input:await sharp('assets/web/'+b.id+'.webp').resize(220,220).png().toBuffer(),left:x+30,top});
   svg+=`<text x="${x+140}" y="${top+249}" font-size="20" text-anchor="middle">${escape(b.name)}</text><text x="${x+140}" y="${top+278}" font-size="15" text-anchor="middle" fill="#627188">${escape(b.value+' / '+b.label)}</text>`;
  }
  y+=60+Math.ceil(badges.length/columns)*316;
 }
 svg+='</g></svg>';
 await sharp(Buffer.from(svg.replace('HEIGHT',String(y+25)))).composite(overlays).png().toFile(path);
}
await sheet('assets/全量59枚徽章_审阅总览.png','DSH 鲸迹 · 59 枚徽章',Object.keys(names).map(f=>[names[f],catalog.filter(b=>b.family===f)]));
await sheet('assets/previews/progression.png','航迹进阶 · 29 枚成长徽章',['days','streak','tokens','dialogues'].map(f=>[names[f],catalog.filter(b=>b.family===f)]));
await sheet('assets/previews/festivals.png',names.festival,[[names.festival,catalog.filter(b=>b.family==='festival')]]);
for(const f of ['days','streak','tokens','dialogues'])await sheet('assets/previews/'+f+'.png',names[f],[[names[f],catalog.filter(b=>b.family===f)]]);
await writeFile('qa/materials.json',JSON.stringify(checks,null,2)+'\n');
console.log(`${catalog.length} active, ${checks.length} transparent originals and exports; dynamic contact sheets ready`);
