import type {InputEvent} from './engine.ts';
export interface HistoryHeader {id:string;origin?:string;parentSession?:string;createdAt?:number;}
export interface HistoryHandle {header:HistoryHeader;inheritedEventCount:number;read(offset?:number):Promise<{events:readonly InputEvent[]}>;close():Promise<void>;}
export interface Persistence {list():Promise<readonly {header:HistoryHeader;formatStatus?:string}[]>;open(id:string,access:'read'):Promise<HistoryHandle>;}
/** Contain backend read/close failures without an unhandled startup rejection. */
export async function scanHistory(persistence:Persistence,ingest:(id:string,events:readonly InputEvent[],meta:HistoryHeader&{inheritedEventCount:number})=>void,stopped:()=>boolean):Promise<{failures:number}>{
 let failures=0;let rows:Awaited<ReturnType<Persistence['list']>>;
 try{rows=await persistence.list();}catch{return {failures:1};}
 for(const row of rows){if(stopped())break;if(row.formatStatus==='migration-required'){failures++;continue;}let handle:HistoryHandle|undefined;
  try{handle=await persistence.open(row.header.id,'read');const {events}=await handle.read();if(!stopped())ingest(row.header.id,events,{...handle.header,inheritedEventCount:handle.inheritedEventCount});}catch{failures++;}
  finally{if(handle)try{await handle.close();}catch{failures++;}}
 }return {failures};
}
