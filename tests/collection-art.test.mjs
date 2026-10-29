import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';import {existsSync} from 'node:fs';
import sharp from 'sharp';import {build} from 'esbuild';
const result=await build({entryPoints:['src/aquarium.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {DECOR}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('all36 chapter rewards ship separate valid transparent sticker illustrations',async()=>{
 const files=(await readdir('assets/collection')).filter(x=>x.endsWith('.webp'));assert.equal(files.length,36);
 for(const item of DECOR){const path='assets/collection/'+item.id+'.webp';assert.ok(existsSync(path),item.id);const meta=await sharp(path).metadata();assert.equal(meta.format,'webp');assert.equal(meta.hasAlpha,true,item.id);assert.ok(meta.width>=400&&meta.width<=512);assert.ok(meta.height>=400&&meta.height<=512);const stats=await sharp(path).stats();assert.ok(stats.channels.at(-1).min<50,item.id+' must retain transparent margin');assert.ok(stats.channels.at(-1).max>240,item.id+' must contain visible art');}
});
test('collection and selection both consume offline bundled images instead of line-art pre elements',async()=>{
 for(const file of ['src/client/VoyageCollection.tsx','src/client/AquariumEditor.tsx']){const source=await readFile(file,'utf8');assert.ok(source.includes('DecorPortrait'),file);assert.equal(source.includes('<pre'),false,file);}
 assert.ok(existsSync('src/client/collection-art.ts'));
 const bundle=await build({entryPoints:['src/client/collection-art.ts'],bundle:true,platform:'node',format:'esm',loader:{'.webp':'dataurl'},write:false});
 const {COLLECTION_ART}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
 assert.deepEqual(Object.keys(COLLECTION_ART).sort(),DECOR.map(d=>d.id).sort());for(const src of Object.values(COLLECTION_ART))assert.match(src,/^data:image\/webp;base64,/);
});
