/** Rebuild the production artwork inventory from actual shipped files. */
import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/aquarium.ts'],bundle:true,platform:'node',format:'esm',write:false});const {DECOR}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
let previous;try{previous=JSON.parse(await readFile('docs/art/collection-manifest.json','utf8'));}catch{}
const items=[];for(const item of DECOR){let prompt=previous?.items?.find(d=>d.id===item.id)?.prompt;try{prompt=JSON.parse(await readFile(`qa/collection-art/${item.id}.json`,'utf8')).prompt??prompt;}catch{}
 const file=`assets/collection/${item.id}.webp`,bytes=await readFile(file),meta=await sharp(bytes).metadata();items.push({id:item.id,name:item.name,chapter:item.chapterId,kind:item.kind,prompt,file,width:meta.width,height:meta.height,alpha:meta.hasAlpha,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile('docs/art/collection-manifest.json',JSON.stringify({version:1,generatedWith:'Built-in Image Gen',style:'approved flat anime sticker reference 2',count:items.length,items},null,2)+'\n');
console.log(`${items.length} production illustrations, ${items.reduce((n,i)=>n+i.bytes,0)} bytes`);
