/** Synthetic round evidence in an isolated QA ledger; never writes Harness sessions. */
import {Engine} from '../src/engine.ts';
import {fileURLToPath} from 'node:url';
const e=new Engine(fileURLToPath(new URL('../qa/test-home/profiles/dialogues-qa/whale-trail.sqlite',import.meta.url)),{profileId:'dialogues-qa',timezone:'Asia/Shanghai'});
const round=(base,turn,at)=>[{seq:base,type:'turn/start',time:at,data:{turn}},{seq:base+1,type:'user/message',time:at+10,data:{source:{kind:'user'},content:[{type:'text',text:'Synthetic QA question'}]}},{seq:base+2,type:'assistant/message',time:at+20,data:{turn,message:{content:[{type:'text',text:'Synthetic QA answer'}]},usage:{totalTokens:100000}}},{seq:base+3,type:'turn/end',time:at+30,data:{turn,reason:{kind:'completed'}}}];
const facts=[];for(let i=0;i<12;i++)facts.push(...round(i*4,i+1,Date.parse('2026-10-20T03:00:00Z')+i*1000));e.ingest('qa-dialogues',facts);
console.log('Isolated QA:',JSON.stringify(e.view().metrics));e.close();
