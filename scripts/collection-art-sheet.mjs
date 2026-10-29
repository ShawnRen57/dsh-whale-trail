import sharp from'sharp';import{readFile}from'node:fs/promises';
const {items}=JSON.parse(await readFile('docs/art/collection-manifest.json','utf8'));
const names=['初见浅湾','珊瑚小径','潮汐花园','月光航道','暖流远航','深蓝回声','鲸落秘境','无垠大洋','星海归航'];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const width=1600,height=2700,rows=[];let svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:'PingFang SC','Arial',sans-serif;fill:#142b48}</style><text x="80" y="68" font-size="18" letter-spacing="4">WHALE TRAIL / THE VOYAGE COLLECTION</text><text x="80" y="124" font-size="38" font-weight="600">航海收藏册 · 36 件海洋收藏</text>`;
for(let chapter=0;chapter<9;chapter++){const top=170+chapter*280;svg+=`<text x="80" y="${top+102}" font-size="30" fill="#a4aebc">${String(chapter+1).padStart(2,'0')}</text><text x="80" y="${top+138}" font-size="19">${names[chapter]}</text>`;if(chapter)svg+=`<path d="M80 ${top-14}H1520" stroke="#e6e0d4" stroke-width="1"/>`;
 for(let col=0;col<4;col++){const item=items[chapter*4+col],left=220+col*320;rows.push({input:await sharp(item.file).resize(280,228,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),left,top});svg+=`<text x="${left+140}" y="${top+252}" text-anchor="middle" font-size="21">${escape(item.name)}</text>`;}}
svg+='</svg>';rows.push({input:Buffer.from(svg),left:0,top:0});await sharp({create:{width,height,channels:4,background:'#fbf7ee'}}).composite(rows).png().toFile('docs/images/collection-art-v1.0.1.png');
console.log('docs/images/collection-art-v1.0.1.png');
