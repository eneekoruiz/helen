import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { withHomeLock, writePrivate, type AssistantConfig } from "./home.js";
import { readCollection, updateCollection } from "./store.js";
import { TaskSchema, type Task } from "./tasks.js";
import { getAppModeState, setAppMode } from "./appMode.js";

export const RecordatoriosConfigSchema = z.object({
  url: z.string().url().refine(value => {
    const u = new URL(value);
    return !u.username && !u.password && !u.search && !u.hash && u.pathname === "/" &&
      (u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)));
  }, "Use an HTTPS origin or a local test server"),
  tokenEnv: z.string().regex(/^[A-Z_][A-Z0-9_]*$/).default("HELEN_RECORDATORIOS_TOKEN"),
  pollMs: z.number().int().min(2000).max(60000).default(5000),
});
export type RecordatoriosConfig = z.infer<typeof RecordatoriosConfigSchema>;
const ModeSchema = z.object({mode:z.enum(["normal","examenes","vacaciones"]),updatedAt:z.string().datetime(),until:z.string().optional(),reason:z.string().optional()});
const FieldsSchema = TaskSchema.omit({id:true,source:true});
const RemoteSchema = z.object({id:z.string().min(1).max(200),version:z.number().int().nonnegative(),deleted:z.boolean(),task:FieldsSchema});
type Remote = z.infer<typeof RemoteSchema>;
const EntrySchema = z.object({localId:TaskSchema.shape.id,remoteId:z.string().min(1).max(200),version:z.number().int().nonnegative().nullable(),snapshot:TaskSchema.nullable(),deleted:z.boolean().default(false)});
const StateSchema = z.object({origin:z.string(),accountId:z.string().optional(),device:z.string().uuid(),cursor:z.number().nonnegative().default(0),date:z.string().default(""),entries:z.array(EntrySchema).max(10000).default([]),mode:ModeSchema.optional()});
type State = z.infer<typeof StateSchema>;
export type RecordatoriosEntry = z.infer<typeof EntrySchema>;
const AuthSchema = z.object({url:z.string(),token:z.string().min(1).max(16000)});
const statePath=(home:string)=>path.join(home,"recordatorios-sync.json");
const authPath=(home:string)=>path.join(home,"recordatorios-auth.json");
const originOf=(config:RecordatoriosConfig)=>new URL(config.url).origin;
function loadState(home:string, config:RecordatoriosConfig):State {
  if(!fs.existsSync(statePath(home)))return StateSchema.parse({origin:originOf(config),device:crypto.randomUUID()});
  const state=StateSchema.parse(JSON.parse(fs.readFileSync(statePath(home),"utf8")));
  if(state.origin!==originOf(config))throw new Error("Recordatorios origin changed; use a separate personal home to avoid mixing accounts");
  return state;
}
function saveState(home:string,state:State){writePrivate(statePath(home),JSON.stringify(state));}
export class RecordatoriosHttpError extends Error {
  constructor(public status:number){super(status===401?"Recordatorios: vuelve a conectar tu cuenta.":`Recordatorios: HTTP ${status}.`);}
}
export interface RecordatoriosOptions {fetcher?:typeof fetch;env?:NodeJS.ProcessEnv;signal?:AbortSignal;now?:Date}
export async function recordatoriosRequest(home:string,config:RecordatoriosConfig,pathname:string,body?:unknown,options:RecordatoriosOptions={}):Promise<Record<string,unknown>>{
  const parsed=RecordatoriosConfigSchema.parse(config);
  const saved=fs.existsSync(authPath(home))?AuthSchema.parse(JSON.parse(fs.readFileSync(authPath(home),"utf8"))):undefined;
  const token=(options.env??process.env)[parsed.tokenEnv]??(saved?.url===originOf(parsed)?saved.token:undefined);
  if(!token)throw new Error("Conecta Recordatorios desde los ajustes privados de HELEN.");
  const url=new URL(pathname,`${originOf(parsed)}/`);
  if(url.origin!==originOf(parsed))throw new Error("Invalid Recordatorios endpoint");
  const response=await(options.fetcher??fetch)(url,{method:body===undefined?"GET":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:"error",signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok){await response.body?.cancel();throw new RecordatoriosHttpError(response.status);}
  const refreshed=response.headers.get("X-Refreshed-Token");
  if(refreshed&&saved&&saved.url===originOf(parsed)&&!(options.env??process.env)[parsed.tokenEnv])withHomeLock(home,()=>{
    const current=AuthSchema.parse(JSON.parse(fs.readFileSync(authPath(home),"utf8")));
    if(current.token===saved.token)writePrivate(authPath(home),JSON.stringify({...current,token:refreshed}));
  });
  const reader=response.body?.getReader();
  if(!reader)throw new Error("Recordatorios returned an empty response");
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){options.signal?.throwIfAborted();const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>4*1024*1024)throw new Error("Recordatorios response exceeds 4 MiB");chunks.push(next.value);}}
  finally{await reader.cancel().catch(()=>undefined);reader.releaseLock();}
  return z.record(z.string(),z.unknown()).parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}
const fields=["text","list","status","priority","due"] as const;
function patchOf(task:Task,baseline:Task|null):Record<string,unknown>{
  return Object.fromEntries(fields.filter(key=>!baseline||task[key]!==baseline[key]).map(key=>[key,task[key]??null]));
}
function localId(state:State,remoteId:string,tasks:Task[]):string{
  const mapped=state.entries.find(item=>item.remoteId===remoteId);if(mapped)return mapped.localId;
  for(let n=0;n<100;n++){const id=`t${crypto.createHash("sha256").update(`${remoteId}:${n}`).digest("hex").slice(0,6)}`;if(!tasks.some(task=>task.id===id)&&!state.entries.some(item=>item.localId===id))return id;}
  throw new Error("Could not allocate a local task identifier");
}
function applyRemote(home:string,state:State,rows:Remote[],sent?:Map<string,Task|undefined>):void{
  const loaded=readCollection(home,"tasks",TaskSchema);
  if(loaded.invalid.length)throw new Error("Repair invalid tasks before synchronizing Recordatorios");
  const before=JSON.stringify(loaded.items);const tasks=loaded.items;
  for(const row of rows){
    if(findSecrets(row.task.text).length)throw new Error("Recordatorios contains credentials; remove them before synchronizing");
    const id=localId(state,row.id,tasks);
    let entry=state.entries.find(item=>item.remoteId===row.id);
    const index=tasks.findIndex(task=>task.id===id);const current=tasks[index];
    const baseline=sent?.has(row.id)?sent.get(row.id):entry?.snapshot;
    const remote=TaskSchema.parse({...row.task,id,source:"recordatorios"});
    if(row.deleted){
      if(current&&baseline&&Object.keys(patchOf(current,baseline)).length){
        updateCollection(home,"sync-conflicts",z.object({id:z.string(),task:TaskSchema,reason:z.string()}),items=>{if(!items.some(item=>item.id===row.id))items.push({id:row.id,task:current,reason:"Remote deletion conflicted with local edits"});});
      }
      if(index>=0)tasks.splice(index,1);
    }else if(!current&&entry?.snapshot){
      // A local deletion is still pending; do not resurrect it during a remote edit.
    }else{
      const changes=current?patchOf(current,baseline??null):{};
      const merged=TaskSchema.parse({...remote,...changes,due:changes.due===null?undefined:(changes.due??remote.due),...(changes.status==="open"?{done:undefined}:changes.status==="done"?{done:current?.done??remote.done}:{}),id,source:current?.source??remote.source,updated:Object.keys(changes).length?current?.updated??remote.updated:remote.updated});
      if(index>=0)tasks[index]=merged;else tasks.push(merged);
    }
    if(!entry){entry={localId:id,remoteId:row.id,version:row.version,snapshot:remote,deleted:row.deleted};state.entries.push(entry);}
    else Object.assign(entry,{version:row.version,snapshot:remote,deleted:row.deleted});
  }
  if(before!==JSON.stringify(tasks))updateCollection(home,"tasks",TaskSchema,items=>{items.splice(0,items.length,...tasks);});
}
const inflight=new Map<string,Promise<{uploaded:number;downloaded:number}>>();
export function syncRecordatorios(home:string,config:RecordatoriosConfig,options:RecordatoriosOptions={}):Promise<{uploaded:number;downloaded:number}>{
  const key=path.resolve(home);const existing=inflight.get(key);if(existing)return existing;
  const run=performSync(home,RecordatoriosConfigSchema.parse(config),options).finally(()=>{if(inflight.get(key)===run)inflight.delete(key);});inflight.set(key,run);return run;
}
async function performSync(home:string,config:RecordatoriosConfig,options:RecordatoriosOptions){
  let state=withHomeLock(home,()=>{const loaded=loadState(home,config);saveState(home,loaded);return loaded;});
  const now=options.now??new Date();const date=now.toISOString().slice(0,10);
  const query=new URL("/api/helen/sync",config.url);query.searchParams.set("since",String(state.date===date?state.cursor:0));
  const pull=z.object({accountId:z.string().min(1),serverTime:z.number().nonnegative(),tasks:z.array(RemoteSchema).max(5000),activeIds:z.array(z.string()).max(10000),mode:ModeSchema}).parse(await recordatoriosRequest(home,config,query.pathname+query.search,undefined,options));
  const sent=new Map<string,Task|undefined>();
  const mutations:Record<string,unknown>[]=[];let modeInput:Record<string,unknown>|undefined;
  withHomeLock(home,()=>{
    state=loadState(home,config);
    if(state.accountId&&state.accountId!==pull.accountId)throw new Error("Recordatorios account changed; refusing to mix personal data");
    state.accountId=pull.accountId;
    applyRemote(home,state,pull.tasks);
    const missing=state.entries.filter(entry=>entry.version!==null&&!entry.deleted&&!pull.activeIds.includes(entry.remoteId)&&!pull.tasks.some(row=>row.id===entry.remoteId));
    applyRemote(home,state,missing.map(entry=>({id:entry.remoteId,version:entry.version!,deleted:true,task:entry.snapshot!})));
    const tasks=readCollection(home,"tasks",TaskSchema);if(tasks.invalid.length)throw new Error("Repair invalid tasks before synchronizing");
    for(const task of tasks.items){
      let entry=state.entries.find(item=>item.localId===task.id);
      if(!entry){entry={localId:task.id,remoteId:`helen-${state.device}-${task.id}`,version:null,snapshot:null,deleted:false};state.entries.push(entry);}
      const patch=patchOf(task,entry.snapshot);
      if(Object.keys(patch).length&&!entry.deleted){mutations.push({id:entry.remoteId,expectedVersion:entry.version,patch});sent.set(entry.remoteId,structuredClone(task));}
    }
    for(const entry of state.entries)if(entry.version!==null&&!entry.deleted&&!tasks.items.some(task=>task.id===entry.localId)){mutations.push({id:entry.remoteId,expectedVersion:entry.version,deleted:true});sent.set(entry.remoteId,undefined);}
    const local=getAppModeState(home);
    const localChanged=local.updatedAt!==(state.mode?.updatedAt??new Date(0).toISOString());
    if(localChanged)modeInput={...local,expectedUpdatedAt:pull.mode.updatedAt};
    else if(local.mode!==pull.mode.mode||local.updatedAt!==pull.mode.updatedAt)setAppMode(home,pull.mode.mode,new Date(pull.mode.updatedAt),{until:pull.mode.until,reason:pull.mode.reason});
    state.mode=pull.mode;state.cursor=Math.min(pull.serverTime,now.getTime());state.date=date;saveState(home,state);
  });
  let uploaded=0;
  for(let start=0;start<mutations.length||modeInput;start+=100){
    const batch=mutations.slice(start,start+100);const currentMode=modeInput;modeInput=undefined;
    const reply=z.object({accountId:z.string(),applied:z.array(RemoteSchema).max(100),conflicts:z.array(RemoteSchema).max(100),mode:ModeSchema.optional(),modeConflict:z.boolean().optional()}).parse(await recordatoriosRequest(home,config,"/api/helen/sync",{mutations:batch,...(currentMode?{mode:currentMode}:{})},options));
    if(reply.accountId!==state.accountId)throw new Error("Recordatorios account changed during synchronization");
    withHomeLock(home,()=>{
      state=loadState(home,config);applyRemote(home,state,[...reply.applied,...reply.conflicts],sent);
      if(reply.mode){const local=getAppModeState(home);if(!currentMode||local.updatedAt===currentMode.updatedAt)setAppMode(home,reply.mode.mode,new Date(reply.mode.updatedAt),{until:reply.mode.until,reason:reply.mode.reason});state.mode=reply.mode;}
      saveState(home,state);
    });uploaded+=reply.applied.length;
    if(start+100>=mutations.length)break;
  }
  return{uploaded,downloaded:pull.tasks.length};
}
export async function runRecordatoriosSync(options:{home:string;config:AssistantConfig;signal:AbortSignal;log?:(message:string)=>void;fetcher?:typeof fetch}):Promise<void>{
  let wake:(()=>void)|undefined;
  const watcher=fs.watch(options.home,(_event,file)=>{if(file&&["tasks.json","app-mode.json"].includes(String(file)))wake?.();});
  try{while(!options.signal.aborted){
    if(options.config.recordatorios)try{await syncRecordatorios(options.home,options.config.recordatorios,options);}catch{if(!options.signal.aborted)options.log?.("Recordatorios: sincronización pendiente; revisa la conexión. Tus cambios locales se conservan.");}
    const controller=new AbortController();const abort=()=>controller.abort();wake=abort;options.signal.addEventListener("abort",abort,{once:true});
    try{if(!options.signal.aborted)await delay(options.config.recordatorios?.pollMs??5000,undefined,{signal:controller.signal});}catch{/* A local write wakes the next pass. */}finally{options.signal.removeEventListener("abort",abort);wake=undefined;}
  }}finally{watcher.close();}
}
export function saveRecordatoriosAuthorization(home:string,config:RecordatoriosConfig,token:string):void{
  withHomeLock(home,()=>writePrivate(authPath(home),JSON.stringify(AuthSchema.parse({url:originOf(config),token}))));
}
