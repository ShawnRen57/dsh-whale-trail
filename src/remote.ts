/** Explicit, strict Typert wire schemas for this external plugin. No private transport. */
import {z} from 'zod';
import {createTypertRemoteInfo} from '@deepseek-ai/dsh-typert-protocol/remote-info';
export const requestSchema=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('snapshot')}),
 z.strictObject({type:z.literal('backup')}),
 z.strictObject({type:z.literal('inspect'),text:z.string().max(50*1024*1024)}),
 z.strictObject({type:z.literal('restore'),text:z.string().max(50*1024*1024)}),
]);
export type Request=z.infer<typeof requestSchema>;
const input={mode:'strict' as const,typeSymbol:'dsh-whale-trail#Request',create:()=>requestSchema,jsonSchema:z.toJSONSchema(requestSchema)};
export const TYPERT_REMOTE=createTypertRemoteInfo({package:'dsh-whale-trail',methods:{'whaleTrail/request':{service:'whaleTrail',invocation:{kind:'direct'},parameters:[{name:'request',source:'json',codec:input,strictCodec:input}],result:{mode:'strict',typeSymbol:'dsh-whale-trail#Response',create:()=>z.json()}}}},z);
export default TYPERT_REMOTE;
