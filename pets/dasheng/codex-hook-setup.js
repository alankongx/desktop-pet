'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {codexHome}=require('./codex-hook');
const events={PermissionRequest:'input',Stop:'done'};
const windows=process.platform==='win32';
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
const sh='#!/bin/sh\ncase "$1" in input|done) /usr/bin/touch "$(/usr/bin/dirname "$0")/$1.notice" ;; esac\nexit 0\n';
const ps="[CmdletBinding()] param([ValidateSet('input','done')][string]$State)\n[IO.File]::WriteAllText((Join-Path $PSScriptRoot ($State+'.notice')), '')\nexit 0\n";
function paths(){
  const dir=path.join(codexHome(),'dasheng-pet');
  return {dir,file:path.join(codexHome(),'hooks.json'),script:path.join(dir,windows?'notify.ps1':'notify.sh')};
}
function command(state){
  const {script}=paths();
  return windows ? 'powershell.exe -NoProfile -NonInteractive -File "'+script+'" '+state : '/bin/sh '+quote(script)+' '+state;
}
function read(){
  const {file}=paths();
  const raw=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
  const config=raw===null?{}:JSON.parse(raw);
  if(!config||typeof config!=='object'||Array.isArray(config))throw Error('hooks.json 格式错误');
  config.hooks??={};
  if(typeof config.hooks!=='object'||Array.isArray(config.hooks))throw Error('hooks 配置格式错误');
  return {config,raw,file};
}
function registered(){
  const {config}=read();
  return Object.entries(events).every(([event,state])=>(config.hooks[event]||[]).some(g=>g.hooks?.some(h=>h.command===command(state))));
}
function configure(enable){
  const {dir,script}=paths();
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const {config,raw,file}=read();
  for(const [event,state] of Object.entries(events)){
    const cmd=command(state),groups=config.hooks[event]||[];
    if(!Array.isArray(groups))throw Error('已有钩子配置格式错误');
    const updated=[];
    for(const group of groups){
      if(!Array.isArray(group.hooks)||!group.hooks.some(h=>h.command===cmd)){updated.push(group);continue;}
      const rest=group.hooks.filter(h=>h.command!==cmd);
      if(rest.length)updated.push({...group,hooks:rest});
    }
    if(enable)updated.push({hooks:[{type:'command',command:cmd,timeout:3,statusMessage:state==='input'?'大圣喵 · 请求确认':'大圣喵 · 任务结束'}]});
    if(updated.length)config.hooks[event]=updated;else delete config.hooks[event];
  }
  if(enable)fs.writeFileSync(script,windows?ps:sh,{mode:0o700});
  const tmp=file+'.dasheng-'+process.pid+'.tmp';
  fs.writeFileSync(tmp,JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
  try{
    const current=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
    if(current!==raw)throw Error('Codex 配置刚刚发生变更，请重试。');
    fs.renameSync(tmp,file);
  }finally{fs.rmSync(tmp,{force:true});}
  if(!enable)for(const f of [script,path.join(dir,'input.notice'),path.join(dir,'done.notice')])fs.rmSync(f,{force:true});
}
module.exports={configure,registered};
