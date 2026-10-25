import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { findSecrets } from "../core/secrets.js";
import { readConfig, withHomeLock, writePrivate, type AssistantConfig } from "./home.js";
import { readCollection, updateCollection } from "./store.js";
import { TaskSchema, type Task } from "./tasks.js";
import { getAppModeState, setAppMode } from "./appMode.js";
import { localDateKey } from "./time.js";

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
const ModeSchema = z.object({mode:z.enum(["normal","examenes","vacaciones"]),updatedAt:z.string().datetime(),until:z.string().datetime().optional(),reason:z.string().max(300).optional()});
const FieldsSchema = TaskSchema.omit({id:true,source:true});
const RemoteSchema = z.object({id:z.string().min(1).max(200),version:z.number().int().nonnegative(),deleted:z.boolean(),task:FieldsSchema});
type Remote = z.infer<typeof RemoteSchema>;
const EntrySchema = z.object({localId:TaskSchema.shape.id,remoteId:z.string().min(1).max(200),version:z.number().int().nonnegative().nullable(),snapshot:TaskSchema.nullable(),deleted:z.boolean().default(false)});
const StateSchema = z.object({origin:z.string(),accountId:z.string().min(1).max(200).optional(),device:z.string().uuid(),cursor:z.number().nonnegative().default(0),date:z.string().default(""),entries:z.array(EntrySchema).max(10000).default([]),mode:ModeSchema.optional(),modeConflict:z.object({local:ModeSchema,remote:ModeSchema}).optional()});
type State = z.infer<typeof StateSchema>;
export type RecordatoriosEntry = z.infer<typeof EntrySchema>;
const TokenSchema = z.string().min(1).max(16000).regex(/^[^\s\x00-\x1f\x7f]+$/);
const AuthSchema = z.object({url:z.string(),token:TokenSchema,accountId:z.string().min(1).max(200).optional()}).strict();
const statePath=(home:string)=>path.join(home,"recordatorios-sync.json");
const authPath=(home:string)=>path.join(home,"recordatorios-auth.json");
export const SyncConflictSchema=z.object({id:z.string().min(1).max(260),task:TaskSchema,reason:z.string().min(1).max(500)}).strict();
const originOf=(config:RecordatoriosConfig)=>new URL(config.url).origin;
function readPrivateJson(file:string,maxBytes:number):unknown|undefined {
  let stat:fs.Stats;
  try { stat=fs.lstatSync(file); } catch(error) { if((error as NodeJS.ErrnoException).code==="ENOENT")return undefined;throw error; }
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>maxBytes)throw new Error("Recordatorios private state is unsafe or oversized");
  const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));
  try {
    const actual=fs.fstatSync(fd);
    if(!actual.isFile()||actual.size>maxBytes||actual.ino!==stat.ino||actual.dev!==stat.dev)throw new Error("Recordatorios private state changed while opening");
    const bytes=Buffer.alloc(Math.min(actual.size+1,maxBytes+1));let size=0;
    while(size<bytes.length){const read=fs.readSync(fd,bytes,size,bytes.length-size,null);if(!read)break;size+=read;}
    if(size>maxBytes||fs.fstatSync(fd).size>maxBytes)throw new Error("Recordatorios private state exceeds its size limit");
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(0,size)));
  } finally {fs.closeSync(fd);}
}
function readAuth(home:string){const raw=readPrivateJson(authPath(home),32*1024);return raw===undefined?undefined:AuthSchema.parse(raw);}
function loadState(home:string, config:RecordatoriosConfig):State {
  const raw=readPrivateJson(statePath(home),16*1024*1024);
  if(raw===undefined)return StateSchema.parse({origin:originOf(config),device:crypto.randomUUID()});
  const state=StateSchema.parse(raw);
  if(state.origin!==originOf(config))throw new Error("Recordatorios origin changed; use a separate personal home to avoid mixing accounts");
  return state;
}
function saveState(home:string,state:State){writePrivate(statePath(home),JSON.stringify(StateSchema.parse(state)));}
export function assertRecordatoriosAccount(home:string,config:RecordatoriosConfig,accountId:string):void {
  const parsed=RecordatoriosConfigSchema.parse(config);z.string().min(1).max(200).parse(accountId);
  const state=loadState(home,parsed);const auth=readAuth(home);
  if((state.accountId&&state.accountId!==accountId)||(auth?.url===originOf(parsed)&&auth.accountId&&auth.accountId!==accountId))throw new Error("Recordatorios account changed; refusing to mix personal data");
}
export function recordatoriosStatus(home:string,config?:RecordatoriosConfig){
  const cfg=config??readConfig(home).recordatorios;
  if(!cfg)return{configured:false,connected:false,pending:0,conflicts:0};
  const parsed=RecordatoriosConfigSchema.parse(cfg);const state=loadState(home,parsed);const auth=readAuth(home);
  const tasks=readCollection(home,"tasks",TaskSchema);
  const pending=tasks.items.filter(task=>{const entry=state.entries.find(item=>item.localId===task.id);return !entry||(!entry.deleted&&Object.keys(patchOf(task,entry.snapshot)).length>0);}).length+state.entries.filter(entry=>entry.version!==null&&!entry.deleted&&!tasks.items.some(task=>task.id===entry.localId)).length;
  const conflicts=readCollection(home,"sync-conflicts",SyncConflictSchema).items.length+(state.modeConflict?1:0);
  return{configured:true,connected:Boolean(auth?.url===originOf(parsed)||process.env[parsed.tokenEnv]),origin:state.origin,accountId:state.accountId,pending,conflicts};
}
export function disconnectRecordatoriosAuthorization(home:string):void {
  withHomeLock(home,()=>{try{fs.unlinkSync(authPath(home));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}});
}
export class RecordatoriosHttpError extends Error {
  constructor(public status:number){super(status===401?"Recordatorios: vuelve a conectar tu cuenta.":`Recordatorios: HTTP ${status}.`);}
}
export interface RecordatoriosOptions {fetcher?:typeof fetch;env?:NodeJS.ProcessEnv;signal?:AbortSignal;now?:Date;timezone?:string}
export async function recordatoriosRequest(home:string,config:RecordatoriosConfig,pathname:string,body?:unknown,options:RecordatoriosOptions={}):Promise<Record<string,unknown>>{
  const parsed=RecordatoriosConfigSchema.parse(config);
  loadState(home,parsed);
  const saved=readAuth(home);
  if(saved&&saved.url!==originOf(parsed))throw new Error("Recordatorios authorization belongs to another origin");
  const rawToken=(options.env??process.env)[parsed.tokenEnv]??(saved?.url===originOf(parsed)?saved.token:undefined);
  const token=rawToken?TokenSchema.parse(rawToken):undefined;
  if(!token)throw new Error("Conecta Recordatorios desde los ajustes privados de HELEN.");
  const url=new URL(pathname,`${originOf(parsed)}/`);
  if(url.origin!==originOf(parsed))throw new Error("Invalid Recordatorios endpoint");
  const requestSignal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
  const response=await(options.fetcher??fetch)(url,{method:body===undefined?"GET":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:"error",signal:requestSignal});
  if(!response.ok){await response.body?.cancel();throw new RecordatoriosHttpError(response.status);}
  const reader=response.body?.getReader();
  if(!reader)throw new Error("Recordatorios returned an empty response");
  const cancel=()=>{void reader.cancel().catch(()=>undefined);};requestSignal.addEventListener("abort",cancel,{once:true});
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){requestSignal.throwIfAborted();const next=await reader.read();requestSignal.throwIfAborted();if(next.done)break;size+=next.value.byteLength;if(size>4*1024*1024)throw new Error("Recordatorios response exceeds 4 MiB");chunks.push(next.value);}}
  finally{requestSignal.removeEventListener("abort",cancel);await reader.cancel().catch(()=>undefined);reader.releaseLock();}
  const result=z.record(z.string(),z.unknown()).parse(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(chunks))));
  if(typeof result.accountId==="string")assertRecordatoriosAccount(home,parsed,result.accountId);
  const refreshed=response.headers.get("X-Refreshed-Token");
  if(refreshed&&saved&&typeof result.accountId==="string"&&saved.accountId===result.accountId&&saved.url===originOf(parsed)&&!(options.env??process.env)[parsed.tokenEnv]&&TokenSchema.safeParse(refreshed).success)withHomeLock(home,()=>{
    const current=readAuth(home);
    if(current?.url===saved.url&&current.token===saved.token&&current.accountId===saved.accountId)writePrivate(authPath(home),JSON.stringify({...current,token:refreshed}));
  });
  return result;
}
const fields=["text","list","status","priority","due"] as const;
const modeFields=(mode:z.infer<typeof ModeSchema>)=>ModeSchema.parse(mode);
function conflict(home:string,remoteId:string,task:Task,reason:string){
  const id=`${remoteId}:${crypto.createHash("sha256").update(JSON.stringify({task,reason})).digest("hex").slice(0,16)}`;
  updateCollection(home,"sync-conflicts",SyncConflictSchema,items=>{if(!items.some(item=>item.id===id))items.push({id,task:structuredClone(task),reason});});
}
const JournalSchema=z.object({version:z.literal(1),previousTasks:z.array(TaskSchema).max(10000),nextTasks:z.array(TaskSchema).max(10000),state:StateSchema});
const journalPath=(home:string)=>path.join(home,"recordatorios-apply.json");
function recoverApply(home:string,config:RecordatoriosConfig):void{
  const raw=readPrivateJson(journalPath(home),32*1024*1024);if(raw===undefined)return;
  const journal=JournalSchema.parse(raw);
  if(journal.state.origin!==originOf(config))throw new Error("Recordatorios recovery origin does not match");
  if(journal.state.accountId)assertRecordatoriosAccount(home,config,journal.state.accountId);
  const loaded=readCollection(home,"tasks",TaskSchema);if(loaded.invalid.length)throw new Error("Repair invalid tasks before recovering synchronization");
  const tasks=loaded.items;
  const ids=new Set([...journal.previousTasks,...journal.nextTasks].map(task=>task.id));
  for(const id of ids){
    const before=journal.previousTasks.find(task=>task.id===id);const after=journal.nextTasks.find(task=>task.id===id);const index=tasks.findIndex(task=>task.id===id);const current=tasks[index];
    if(JSON.stringify(before)===JSON.stringify(after)||JSON.stringify(current)===JSON.stringify(after))continue;
    if(JSON.stringify(current)!==JSON.stringify(before)){
      if(current)conflict(home,id,current,"Local task changed during interrupted synchronization recovery");
      if(after)conflict(home,id,after,"Remote task retained during interrupted synchronization recovery");
      continue;
    }
    if(index>=0){if(after)tasks[index]=after;else tasks.splice(index,1);}else if(after)tasks.push(after);
  }
  updateCollection(home,"tasks",TaskSchema,items=>items.splice(0,items.length,...tasks));saveState(home,journal.state);fs.unlinkSync(journalPath(home));
}
function commitTasks(home:string,state:State,previousTasks:Task[],nextTasks:Task[]):void{
  if(JSON.stringify(previousTasks)===JSON.stringify(nextTasks)){saveState(home,state);return;}
  writePrivate(journalPath(home),JSON.stringify(JournalSchema.parse({version:1,previousTasks,nextTasks,state})));
  updateCollection(home,"tasks",TaskSchema,items=>items.splice(0,items.length,...nextTasks));saveState(home,state);fs.unlinkSync(journalPath(home));
}
function patchOf(task:Task,baseline:Task|null):Record<string,unknown>{
  return Object.fromEntries(fields.filter(key=>!baseline||task[key]!==baseline[key]).map(key=>[key,task[key]??null]));
}
function localId(state:State,remoteId:string,tasks:Task[]):string{
  const mapped=state.entries.find(item=>item.remoteId===remoteId);if(mapped)return mapped.localId;
  for(let n=0;n<100;n++){const id=`t${crypto.createHash("sha256").update(`${remoteId}:${n}`).digest("hex").slice(0,6)}`;if(!tasks.some(task=>task.id===id)&&!state.entries.some(item=>item.localId===id))return id;}
  throw new Error("Could not allocate a local task identifier");
}
function applyRemote(home:string,state:State,rows:Remote[],sent?:Map<string,Task|undefined>,rejected=false):void{
  const loaded=readCollection(home,"tasks",TaskSchema);
  if(loaded.invalid.length)throw new Error("Repair invalid tasks before synchronizing Recordatorios");
  const before=structuredClone(loaded.items);const tasks=loaded.items;
  for(const row of rows){
    if(findSecrets(row.task.text).length)throw new Error("Recordatorios contains credentials; remove them before synchronizing");
    const id=localId(state,row.id,tasks);
    let entry=state.entries.find(item=>item.remoteId===row.id);
    if(entry?.version!==null&&entry?.version!==undefined&&row.version<entry.version)continue;
    const index=tasks.findIndex(task=>task.id===id);const current=tasks[index];
    const baseline=!rejected&&sent?.has(row.id)?sent.get(row.id):entry?.snapshot;
    const remote=TaskSchema.parse({...row.task,id,source:"recordatorios"});
    if(row.deleted){
      if(current&&(!baseline||Object.keys(patchOf(current,baseline)).length)){
        conflict(home,row.id,current,"Remote deletion conflicted with local edits");
      }
      if(index>=0)tasks.splice(index,1);
    }else if(!current&&entry?.snapshot&&!(rejected&&sent?.has(row.id)&&sent.get(row.id)===undefined)){
      // A local deletion is still pending; do not resurrect it during a remote edit.
    }else{
      const changes=current?patchOf(current,baseline??null):{};
      if(rejected&&sent?.has(row.id)){
        const attempted=sent.get(row.id);
        if(!current&&!attempted)conflict(home,row.id,remote,"Local deletion conflicted with remote edits");
        if(current&&attempted&&entry?.snapshot){
          const localPatch=patchOf(attempted,entry.snapshot);const remotePatch=patchOf(remote,entry.snapshot);
          const overlap=fields.filter(key=>key in localPatch&&key in remotePatch&&localPatch[key]!==remotePatch[key]);
          if(overlap.length){conflict(home,row.id,current,"Concurrent edits changed the same task fields");for(const key of overlap)if(current[key]===attempted[key])delete changes[key];}
        }
      }
      const status=changes.status??remote.status;
      const merged=TaskSchema.parse({...remote,...changes,due:changes.due===null?undefined:(changes.due??remote.due),done:status==="open"?undefined:(current?.status==="done"?current.done:remote.done),created:current?.created??remote.created,id,source:current?.source??remote.source,updated:Object.keys(changes).length?current?.updated??remote.updated:remote.updated});
      if(index>=0)tasks[index]=merged;else tasks.push(merged);
    }
    if(!entry){entry={localId:id,remoteId:row.id,version:row.version,snapshot:remote,deleted:row.deleted};state.entries.push(entry);}
    else Object.assign(entry,{version:row.version,snapshot:remote,deleted:row.deleted});
  }
  commitTasks(home,state,before,tasks);
}
const inflight=new Map<string,{origin:string;promise:Promise<{uploaded:number;downloaded:number}>}>();
export function syncRecordatorios(home:string,config:RecordatoriosConfig,options:RecordatoriosOptions={}):Promise<{uploaded:number;downloaded:number}>{
  const parsed=RecordatoriosConfigSchema.parse(config);
  const physical=fs.existsSync(home)?fs.realpathSync.native(home):path.resolve(home);const key=process.platform==="win32"?physical.toLowerCase():physical;
  const existing=inflight.get(key);if(existing){if(existing.origin!==originOf(parsed))return Promise.reject(new Error("Recordatorios synchronization is already using another origin"));return existing.promise;}
  const run=performSync(home,parsed,options).finally(()=>{if(inflight.get(key)?.promise===run)inflight.delete(key);});inflight.set(key,{origin:originOf(parsed),promise:run});return run;
}
async function performSync(home:string,config:RecordatoriosConfig,options:RecordatoriosOptions){
  options.signal?.throwIfAborted();
  let state=withHomeLock(home,()=>{recoverApply(home,config);const loaded=loadState(home,config);saveState(home,loaded);return loaded;});
  const now=options.now??new Date();const date=localDateKey(now,options.timezone??readConfig(home).timezone);
  const query=new URL("/api/helen/sync",config.url);query.searchParams.set("since",String(state.date===date?state.cursor:0));
  const pull=z.object({accountId:z.string().min(1).max(200),serverTime:z.number().nonnegative(),tasks:z.array(RemoteSchema).max(5000),activeIds:z.array(z.string().min(1).max(200)).max(5000),mode:ModeSchema}).parse(await recordatoriosRequest(home,config,query.pathname+query.search,undefined,options));
  if(new Set(pull.tasks.map(row=>row.id)).size!==pull.tasks.length||new Set(pull.activeIds).size!==pull.activeIds.length||pull.tasks.some(row=>row.deleted===pull.activeIds.includes(row.id)))throw new Error("Recordatorios returned inconsistent task identities");
  options.signal?.throwIfAborted();
  const sent=new Map<string,Task|undefined>();
  const mutations:Record<string,unknown>[]=[];let modeInput:Record<string,unknown>|undefined;
  withHomeLock(home,()=>{
    state=loadState(home,config);
    assertRecordatoriosAccount(home,config,pull.accountId);
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
    const localMode=modeFields(local);
    const localChanged=JSON.stringify(localMode)!==JSON.stringify(state.mode??{mode:"normal",updatedAt:new Date(0).toISOString()});
    if(state.modeConflict&&JSON.stringify(localMode)!==JSON.stringify(state.modeConflict.local))delete state.modeConflict;
    if(localChanged&&!state.modeConflict)modeInput={...localMode,expectedUpdatedAt:state.mode?.updatedAt??pull.mode.updatedAt};
    else if(!localChanged&&JSON.stringify(localMode)!==JSON.stringify(pull.mode))setAppMode(home,pull.mode.mode,new Date(pull.mode.updatedAt),{until:pull.mode.until,reason:pull.mode.reason});
    state.mode=pull.mode;state.cursor=Math.min(pull.serverTime,now.getTime());state.date=date;saveState(home,state);
  });
  let uploaded=0;
  for(let start=0;start<mutations.length||modeInput;start+=100){
    options.signal?.throwIfAborted();
    const batch=mutations.slice(start,start+100);const currentMode=modeInput;modeInput=undefined;
    const beforeMode=modeFields(getAppModeState(home));
    const reply=z.object({accountId:z.string(),applied:z.array(RemoteSchema).max(100),conflicts:z.array(RemoteSchema).max(100),mode:ModeSchema.optional(),modeConflict:z.boolean().optional()}).parse(await recordatoriosRequest(home,config,"/api/helen/sync",{mutations:batch,...(currentMode?{mode:currentMode}:{})},options));
    if(reply.accountId!==state.accountId)throw new Error("Recordatorios account changed during synchronization");
    if([...reply.applied,...reply.conflicts].some(row=>!batch.some(item=>item.id===row.id))||new Set([...reply.applied,...reply.conflicts].map(row=>row.id)).size!==reply.applied.length+reply.conflicts.length)throw new Error("Recordatorios returned unexpected mutation identities");
    options.signal?.throwIfAborted();
    withHomeLock(home,()=>{
      state=loadState(home,config);assertRecordatoriosAccount(home,config,reply.accountId);applyRemote(home,state,reply.applied,sent);applyRemote(home,state,reply.conflicts,sent,true);
      if(reply.mode){const local=modeFields(getAppModeState(home));if(reply.modeConflict&&currentMode)state.modeConflict={local:modeFields(currentMode as z.infer<typeof ModeSchema>),remote:reply.mode};else if(JSON.stringify(local)===JSON.stringify(beforeMode)&&JSON.stringify(local)!==JSON.stringify(reply.mode))setAppMode(home,reply.mode.mode,new Date(reply.mode.updatedAt),{until:reply.mode.until,reason:reply.mode.reason});state.mode=reply.mode;}
      saveState(home,state);
    });uploaded+=reply.applied.length;
    if(start+100>=mutations.length)break;
  }
  return{uploaded,downloaded:pull.tasks.length};
}
export async function runRecordatoriosSync(options:{home:string;config:AssistantConfig;signal:AbortSignal;log?:(message:string)=>void;fetcher?:typeof fetch}):Promise<void>{
  let wake:(()=>void)|undefined;let dirty=false;
  const watcher=fs.watch(options.home,(_event,file)=>{if(file&&["tasks.json","app-mode.json"].includes(String(file))){dirty=true;wake?.();}});
  watcher.on("error",()=>options.log?.("Recordatorios: el observador local no está disponible; continúa la comprobación periódica."));
  try{while(!options.signal.aborted){
    dirty=false;
    if(options.config.recordatorios)try{await syncRecordatorios(options.home,options.config.recordatorios,{...options,timezone:options.config.timezone});}catch{if(!options.signal.aborted)options.log?.("Recordatorios: sincronización pendiente; revisa la conexión. Tus cambios locales se conservan.");}
    if(dirty)continue;
    const controller=new AbortController();const abort=()=>controller.abort();wake=abort;options.signal.addEventListener("abort",abort,{once:true});
    try{if(!options.signal.aborted)await delay(options.config.recordatorios?.pollMs??5000,undefined,{signal:controller.signal});}catch{/* A local write wakes the next pass. */}finally{options.signal.removeEventListener("abort",abort);wake=undefined;}
  }}finally{watcher.close();}
}
export function saveRecordatoriosAuthorization(home:string,config:RecordatoriosConfig,token:string,accountId?:string):void{
  const cfg=RecordatoriosConfigSchema.parse(config);
  if(!accountId)throw new Error("Verify the Recordatorios account before connecting");
  const auth=AuthSchema.parse({url:originOf(cfg),token,accountId});
  withHomeLock(home,()=>{assertRecordatoriosAccount(home,cfg,accountId);const state=loadState(home,cfg);state.accountId=accountId;saveState(home,state);writePrivate(authPath(home),JSON.stringify(auth));});
}
