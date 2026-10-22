import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
test('all active artwork decodes at shipping sizes and keeps transparent corners',async()=>{
 const badges=JSON.parse(await readFile('assets/catalog.json','utf8'));
 assert.equal(badges.length,59);
 for(const b of badges)for(const [dir,extension,size] of [['web','webp',384],['png-256','png',256]]){
  const file=`assets/${dir}/${b.id}.${extension}`,m=await sharp(file).metadata();assert.equal(m.width,size,b.id);assert.equal(m.height,size,b.id);assert.ok(m.hasAlpha,b.id);
  const {data,info}=await sharp(file).raw().toBuffer({resolveWithObject:true});assert.equal(data[info.channels-1],0,b.id+' corner must be transparent');
 }
});
test('dynamic review sheets contain badges and enough rows for expanded families',async()=>{
 for(const [file,minHeight] of [['assets/全量59枚徽章_审阅总览.png',3900],['assets/previews/progression.png',2200],['assets/previews/festivals.png',1400]]){
  const m=await sharp(file).metadata();assert.equal(m.width,1800);assert.ok(m.height>=minHeight,file);
  const stats=await sharp(file).extract({left:90,top:192,width:220,height:220}).stats();assert.ok(stats.channels[0].stdev>25,'review badge area must not be blank');
 }
});
