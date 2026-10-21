import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {Context} from '@deepseek-ai/cordis';
import {WhaleTrail} from '../lib/index.js';
test('the real Cordis Host service returns JSON snapshot data without a manual progress command',async()=>{
 const ctx=new Context();ctx.provide('sessionPersistence',{list:async()=>[]});
 const service=new WhaleTrail(ctx,{dataRoot:mkdtempSync(join(tmpdir(),'whale-host-')),profileId:'test',timezone:'Asia/Shanghai',scanHistory:true});
 const result=await service.request({type:'snapshot'});assert.equal(result.type,'view');assert.equal(result.data?.metrics?.days,0);assert.ok(JSON.stringify(result).includes('hidden-placeholder.svg'));await assert.rejects(service.request({type:'complete',id:'s',done:true}));assert.equal(result.data.metrics.dialogues,0);assert.equal(result.data.tasks,undefined);service.engine.close();
});
