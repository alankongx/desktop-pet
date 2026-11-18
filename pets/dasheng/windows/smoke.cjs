// Runs on a disposable Windows runner against the installed copy.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const { _electron }=require('playwright-core');
const exe=path.join(process.env.LOCALAPPDATA,'Programs','DashengPet','DashengPet.exe');
const installed=path.join(path.dirname(exe),'resources','app');
const defs=require(path.join(installed,'actions.js'));
const dir=process.env.CODEX_HOME;
async function waitForText(page,selector,value){
  await page.waitForFunction(([q,text])=>document.querySelector(q)?.textContent.includes(text),[selector,value],{timeout:22000});
}
async function run(){
  fs.mkdirSync(dir,{recursive:true});
  const {DatabaseSync}=require('node:sqlite');
  const history=new DatabaseSync(path.join(dir,'thread_history_1.sqlite'));
  history.exec(`CREATE TABLE thread_turns(thread_id,turn_id,status,started_at,completed_at,rollout_ordinal);
    CREATE TABLE thread_items(thread_id,turn_id,created_at_ms,completed_at_ms,rollout_ordinal,item_type);
    INSERT INTO thread_turns VALUES('test','1','inProgress',unixepoch(),null,1);`);history.close();
  const catalog=new DatabaseSync(path.join(dir,'state_5.sqlite'));
  catalog.exec("CREATE TABLE threads(id,archived,source,thread_source);INSERT INTO threads VALUES('test',0,'vscode','user');");catalog.close();
  const app=await _electron.launch({executablePath:exe,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout:60000});
  try{
    const page=await app.firstWindow();await page.waitForSelector('#pet-root.three-ready',{timeout:45000});
    await waitForText(page,'#codex-state','工作中');
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.send('auto-actions',false));
    for(const action of defs){
      const labels=await app.evaluate(({Menu,BrowserWindow},label)=>{
        const w=BrowserWindow.getAllWindows()[0],popup=Menu.prototype.popup;
        let items;
        Menu.prototype.popup=function(){
          items=this.items.find(i=>i.label==='做个动作').submenu.items;
          items.find(i=>i.label===label).click();
        };
        try {w.webContents.emit('context-menu',{preventDefault(){}});} finally{Menu.prototype.popup=popup;}
        return items.map(i=>i.label);
      },action.label);
      assert.deepEqual(labels,defs.map(item=>item.label));
      await waitForText(page,'#speech-text',action.speech);
      console.log('menu/renderer',action.label,action.speech);
    }
    const hooks=require(path.join(installed,'codex-hook-setup.js'));
    hooks.configure(true);assert(hooks.registered());
    const script=path.join(dir,'dasheng-pet','notify.ps1');
    for(const [id,label] of [['input','等你确认'],['done','已完成']]){
      const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',script,id],{encoding:'utf8'});
      assert.equal(r.status,0,r.stderr);await waitForText(page,'#codex-state',label);
      fs.rmSync(path.join(dir,'dasheng-pet',id+'.notice'));
    }
    hooks.configure(false);assert(!hooks.registered());
    console.log('Windows install: 3D, nine actions and two Codex notification fixtures passed');
  }finally{await app.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
