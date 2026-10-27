/** Cordis Host plugin: local recognition, supported read handles, strict RPC projection. */
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {readFileSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Context} from '@deepseek-ai/cordis';
import {Remote,TypertRemoteService} from '@deepseek-ai/dsh-typert-protocol';
import z from '@deepseek-ai/schemastery';
import {Engine,type InputEvent} from './engine.ts';
import {requestSchema,type Request} from './remote.ts';
import {scanHistory,type Persistence} from './history.ts';
interface Header {id:string;origin?:string;parentSession?:string;}
interface Handle {header:Header;inheritedEventCount:number;read(offset?:number):Promise<{events:readonly InputEvent[]}>;close():Promise<void>;}
interface HostContext extends Context {sessionPersistence:Persistence;}
interface LiveSession {id:string;header:Header;inheritedEventCount:number;}
export interface Config {dataRoot:string;profileId:string;timezone:string;scanHistory:boolean;}
export const name='whale-trail';
export const inject=['sessionPersistence','typert','typertGateway'];
export const Config=z.object({dataRoot:z.string().default(join(homedir(),'.dsh-whale-trail')),profileId:z.string().default('personal'),timezone:z.string().default('Asia/Shanghai'),scanHistory:z.boolean().default(true)});
export class WhaleTrail extends TypertRemoteService {
 readonly engine:Engine;private ready:Promise<void>;private stopped=false;private historyErrors=0;private writeError:Error|undefined;private readonly art=new Map<string,string>();
 constructor(ctx:HostContext,config:Config){
  super(ctx,'whaleTrail',{namespace:'whaleTrail'});
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(config.profileId))throw new Error('whale-trail: invalid profileId');
  this.engine=new Engine(join(resolve(config.dataRoot),'profiles',config.profileId,'whale-trail.sqlite'),{profileId:config.profileId,timezone:config.timezone});
  ctx.on('session/event',((session:LiveSession,event:InputEvent)=>{if(this.stopped)return;try{this.engine.ingest(session.id,[event],{...session.header,inheritedEventCount:session.inheritedEventCount});}catch(error){this.writeError=error instanceof Error?error:new Error(String(error));ctx.logger.warn('whale-trail: live ledger update failed; badge reads will report an error');}}) as (...args:never[])=>void);
  this.ready=(config.scanHistory?this.scan(ctx):Promise.resolve()).catch(error=>{this.writeError=error instanceof Error?error:new Error(String(error));ctx.logger.warn('whale-trail: history initialization failed');});
  ctx.effect(()=>async()=>{this.stopped=true;try{await this.ready;}finally{this.engine.close();}},'whale-trail: ledger lifetime');
 }
 private async scan(ctx:HostContext):Promise<void>{const result=await scanHistory(ctx.sessionPersistence,(id,events,meta)=>this.engine.ingest(id,events,meta),()=>this.stopped);this.historyErrors=result.failures;}
 private async snapshot(){if(this.writeError)throw this.writeError;const view=this.engine.view();if(this.historyErrors)view.warnings.push('history');const art:Record<string,string>={};for(const b of [...view.earned,...view.unearned]){
  if(b.asset==='hidden-placeholder.svg')continue;let image=this.art.get(b.id);if(!image){const bytes=readFileSync(new URL('../assets/web/'+b.id+'.webp',import.meta.url));image='data:image/webp;base64,'+bytes.toString('base64');this.art.set(b.id,image);}art[b.id]=image;
 }return {...view,art,preferences:this.engine.preferences()};}
 /** Read/export/merge commands only; badge progress has no manual mutation endpoint. */
 @Remote
 async request(request:Request):Promise<unknown>{await this.ready;if(this.stopped)throw new Error('whale-trail: disposed');const r=requestSchema.parse(request);switch(r.type){case 'snapshot':return {type:'view',data:await this.snapshot()};case 'preferences':{this.engine.setPreferences(r.preferences);return {type:'view',data:await this.snapshot()};}case 'backup':return {type:'backup',text:this.engine.export()};case 'inspect':return {type:'preview',preview:this.engine.inspect(r.text)};case 'restore':{
  this.engine.inspect(r.text);const folder=join(dirname(this.engine.file),'backups');mkdirSync(folder,{recursive:true,mode:0o700});const file=join(folder,'before-merge-'+Date.now()+'-'+randomUUID()+'.dshbadge');writeFileSync(file+'.tmp',this.engine.export(),{mode:0o600,flag:'wx'});renameSync(file+'.tmp',file);this.engine.import(r.text);return {type:'view',data:await this.snapshot()};
 }}}
}
/** Standard external plugin entry; all registrations belong to its Cordis fiber. */
export function apply(ctx:Context,config:Config):void{new WhaleTrail(ctx as HostContext,config);}
