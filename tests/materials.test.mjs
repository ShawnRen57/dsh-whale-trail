import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('sharp');
test('review overview includes actual badge pixels, not only text labels',async()=>{
 const stats=await sharp('assets/全量28枚徽章_审阅总览.png').extract({left:75,top:175,width:225,height:225}).stats();
 assert.ok(stats.channels[0].stdev>25,'badge image area must not be blank');
});
