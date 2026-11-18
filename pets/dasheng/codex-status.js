'use strict';
const fs = require('node:fs');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const {recentNotice}=require('./codex-hook');

// Only project status, timings and item kind. No prompts, messages or command output.
const query = `
WITH candidates AS (
 SELECT t.thread_id,t.turn_id,t.status,t.started_at,t.completed_at
 FROM thread_turns t JOIN catalog.threads c ON c.id=t.thread_id
 WHERE c.archived=0 AND c.source='vscode'
 AND (c.thread_source IS NULL OR c.thread_source='user')
 AND (t.status IN ('inProgress','waitingForInput','waitingForApproval')
      OR t.completed_at >= unixepoch()-20)
 AND NOT EXISTS (
   SELECT 1 FROM thread_turns later WHERE later.thread_id=t.thread_id
   AND later.rollout_ordinal>t.rollout_ordinal)
)
SELECT status,started_at,completed_at,
 (SELECT max(i.created_at_ms,coalesce(i.completed_at_ms,0)) FROM thread_items i
  WHERE i.thread_id=c.thread_id AND i.turn_id=c.turn_id ORDER BY i.rollout_ordinal DESC LIMIT 1) AS seen,
 (SELECT i.item_type FROM thread_items i WHERE i.thread_id=c.thread_id AND i.turn_id=c.turn_id
  AND i.completed_at_ms IS NULL ORDER BY i.rollout_ordinal DESC LIMIT 1) AS open_kind
FROM candidates c`;

function classify(rows, now=Date.now()){
  const active=rows.filter(r=>['inProgress','waitingForInput','waitingForApproval'].includes(r.status)
    && now-Math.max(r.started_at*1000,r.seen||0)<30*60*1000);
  if(active.some(r=>r.status==='waitingForApproval'||r.status==='waitingForInput'))return 'input';
  const latest=rows.filter(r=>r.completed_at && now-r.completed_at*1000<20000).sort((a,b)=>b.completed_at-a.completed_at)[0];
  if(!latest){
    if(active.some(r=>r.open_kind!=='sleep'))return 'working';
    return active.length?'waiting':'idle';
  }
  return ({completed:'done',interrupted:'interrupted',failed:'failed'})[latest.status]||'idle';
}
async function readState(){
  const dir=process.env.CODEX_HOME || path.join(os.homedir(),'.codex');
  const history=path.join(dir,'thread_history_1.sqlite'),catalog=path.join(dir,'state_5.sqlite');
  if(!fs.existsSync(history)||!fs.existsSync(catalog))return 'offline';
  const uri=pathToFileURL(catalog).href.replaceAll("'","%27")+'?mode=ro';
  if(process.platform==='win32'){
    const {DatabaseSync}=require('node:sqlite');
    const db=new DatabaseSync(history,{readOnly:true});
    try {
      db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=300;');
      db.prepare('ATTACH DATABASE ? AS catalog').run(uri);
      return classify(db.prepare(query).all());
    } finally {db.close();}
  }
  if(process.platform!=='darwin')return 'offline';
  const {stdout}=await exec('/usr/bin/sqlite3',['-batch','-readonly','-json','-cmd','.timeout 1000',history,
    "ATTACH DATABASE '"+uri+"' AS catalog; PRAGMA query_only=ON; "+query],{timeout:3500,maxBuffer:131072});
  return classify(JSON.parse(stdout.trim()||'[]'));
}
function monitor(send){
  let stopped=false,timer,last,lastNotice;
  async function tick(){
    let state;try{state=await readState();}catch{state='offline';}
    if(stopped)return;
    const notice=recentNotice();
    state=notice?.state||state;
    if(last!==state || (notice && notice.ts!==lastNotice)){last=state;send(state);}
    lastNotice=notice?.ts;
    timer=setTimeout(tick,5000);
  }
  tick();return ()=>{stopped=true;clearTimeout(timer);};
}
module.exports={monitor,readState,classify};
