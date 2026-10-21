/** Minimal declarations for the pinned desktop distribution, which omits SDK .d.ts files.
 * Runtime compatibility is additionally tested against the installed Host and browser.
 */
declare module '@deepseek-ai/cordis' {
 export interface Context {
  effect<T>(fn:()=>T,label?:string):T;
  on(event:string,listener:(...args:never[])=>void):()=>void;
  plugin(plugin:{name:string;inject:string[];apply(ctx:Context):void}):unknown;
  logger:{warn(message:string,...args:unknown[]):void;info(message:string,...args:unknown[]):void};
 }
 export class Service {readonly ctx:Context;readonly name:string;constructor(ctx:Context,name:string);}
}
declare module '@deepseek-ai/dsh-typert-protocol' {
 import type {Context,Service} from '@deepseek-ai/cordis';
 export class TypertRemoteService extends Service {constructor(ctx:Context,name:string,options?:{namespace:string});}
 export function Remote(method:Function,context:ClassMethodDecoratorContext):void;
}
declare module '@deepseek-ai/dsh-typert-protocol/remote-info' {
 import type {ZodType} from 'zod';
 export interface Codec {mode:'strict';typeSymbol:string;create:()=>ZodType;jsonSchema?:Record<string,unknown>;}
 export interface Spec {package:string;methods:Record<string,{service:string;invocation:{kind:'direct'};parameters:{name:string;source:'json';codec:Codec;strictCodec:Codec}[];result:Codec}>;}
 export interface RemoteInfo {package:string;descriptors:readonly unknown[];methods:Record<string,unknown>;}
 export function createTypertRemoteInfo(spec:Spec,zod:unknown):RemoteInfo;
}
declare module '@deepseek-ai/schemastery' {
 interface Schema {default(value:unknown):Schema;min(n:number):Schema;max(n:number):Schema;}
 const z:{object(fields:Record<string,Schema>):Schema;string():Schema;number():Schema;boolean():Schema};export default z;
}
declare module '@deepseek-ai/dsh-client-ui-primitives' {
 import type {RefObject} from 'react';
 export function useModalLayer(ref:RefObject<HTMLElement>,open:boolean,onClose:()=>void):void;
}
