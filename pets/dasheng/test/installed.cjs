// Runs against an installed copy with a disposable Codex fixture and user profile.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const { _electron }=require('playwright-core');
const mac=process.platform==='darwin';
const exe=process.env.DASHENG_EXECUTABLE || (mac ? '/Applications/大圣喵.app/Contents/MacOS/DashengPet' : path.join(process.env.LOCALAPPDATA,'Programs','DashengPet','DashengPet.exe'));
const installed=mac ? path.resolve(path.dirname(exe),'../Resources/app') : path.join(path.dirname(exe),'resources','app');
const defs=require(path.join(installed,'actions.js'));
const dir=process.env.CODEX_HOME;
async function waitForText(page,selector,value){
  await page.waitForFunction(([q,text])=>document.querySelector(q)?.textContent.includes(text),[selector,value],{timeout:22000});
}
async function selectMenu(app, group, label){
  return app.evaluate(({BrowserWindow,Menu}, [group,label])=>{
    const win=BrowserWindow.getAllWindows()[0], original=Menu.prototype.popup;
    let result;
    Menu.prototype.popup=function(){
      const item=this.items.find(i=>i.label===group);
      const choices=item.submenu?.items;
      if(label) choices.find(i=>i.label===label).click();
      result=choices ? choices.map(i=>({label:i.label,checked:i.checked})) : item.checked;
    };
    try {win.webContents.emit('context-menu',{preventDefault(){}});} finally {Menu.prototype.popup=original;}
    return result;
  },[group,label]);
}
async function checkRotation(app,page){
  // Pause only renderer time. Main-process menu IPC and the installed preferences file stay real.
  const start=new Date();
  await page.clock.install({time:start});
  await page.clock.pauseAt(new Date(+start+1000));
  await page.evaluate(()=>{
    window.rotationLog=[];
    const play=window.dasheng3d.play.bind(window.dasheng3d);
    window.dasheng3d.play=id=>{window.rotationLog.push(id);play(id);};
  });
  const send=async (key,val)=>app.evaluate(async({BrowserWindow},[key,val])=>{
    const wc=BrowserWindow.getAllWindows()[0].webContents;
    wc.send(key,val);await wc.executeJavaScript('true');
  },[key,val]);
  const choices=await selectMenu(app,'轮播速度');
  assert.equal(choices.find(i=>i.checked).label,'中 · 30 秒');
  await send('codex-status','working');
  await send('auto-actions',true);
  let count=0;
  for(const [label,ms] of [['快 · 18 秒',18000],['中 · 30 秒',30000],['慢 · 60 秒',60000]]){
    await selectMenu(app,'轮播速度',label);
    await page.evaluate(()=>true);
    await page.clock.fastForward(ms-1);
    assert.equal(await page.evaluate(()=>window.rotationLog.length),count);
    await page.clock.fastForward(1);
    assert.equal(await page.evaluate(()=>window.rotationLog.at(-1)),defs[count].id);
    assert(defs[count].speech.includes(await page.locator('#speech-text').textContent()));
    count++;
  }
  await send('auto-actions',false);
  await page.clock.fastForward(61000);
  assert.equal(await page.evaluate(()=>window.rotationLog.length),count);
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
  const profile=path.join(dir,'pet-profile');
  const launch=()=>_electron.launch({executablePath:exe,args:['--user-data-dir='+profile,...(mac ? [] : ['--use-angle=swiftshader','--enable-unsafe-swiftshader'])],timeout:60000});
  const app=await launch();
  try{
    const page=await app.firstWindow();await page.waitForSelector('#pet-root.three-ready',{timeout:45000});
    await waitForText(page,'#codex-state','工作中');
    await page.evaluate(()=>{
      const update=THREE.Scene.prototype.updateMatrixWorld;
      THREE.Scene.prototype.updateMatrixWorld=function(...args){
        if(!window.handMeshes) {
          const meshes=[];
          this.traverse(node=>{if(node.geometry?.attributes.handUv) meshes.push(node);});
          if(meshes.length) window.handMeshes=meshes;
        }
        return update.apply(this,args);
      };
    });
    const handPose=rest=>page.waitForFunction(rest=>window.handMeshes?.length===10 &&
      window.handMeshes.every(mesh=>rest ? mesh.morphTargetInfluences[0]>.98 : mesh.morphTargetInfluences[0]<.05),
      rest,{timeout:4000});
    await handPose(true);
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
      await waitForText(page,'#speech-text',action.speech[0]);
      if(action.id==='wave' || action.id==='nap') await handPose(action.id==='nap');
      console.log('menu/renderer',action.label,action.speech[0]);
    }
    const wave=defs.find(a=>a.id==='wave'), cloud=defs.find(a=>a.id==='cloud');
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.send('pet-action','wave'));
    await waitForText(page,'#speech-text',wave.speech[1]);
    await app.evaluate(({BrowserWindow})=>{
      const wc=BrowserWindow.getAllWindows()[0].webContents;
      wc.send('cloud-style','glide');wc.send('pet-action','cloud');
    });
    await waitForText(page,'#speech-text',cloud.glideSpeech[0]);
    const hooks=require(path.join(installed,'codex-hook-setup.js'));
    hooks.configure(true);assert(hooks.registered());
    const script=path.join(dir,'dasheng-pet',mac?'notify.sh':'notify.ps1');
    for(const [id,label] of [['input','等你确认'],['done','已完成']]){
      const r=spawnSync(mac?'/bin/sh':'powershell.exe',mac?[script,id]:['-NoProfile','-NonInteractive','-File',script,id],{encoding:'utf8'});
      assert.equal(r.status,0,r.stderr);await waitForText(page,'#codex-state',label);
      await waitForText(page,'#speech-text',id==='input'?'确认':'这一轮');
      fs.rmSync(path.join(dir,'dasheng-pet',id+'.notice'));
    }
    hooks.configure(false);assert(!hooks.registered());
    await checkRotation(app,page);
    console.log('3D, nine actions, both Codex notifications and all three rotation intervals passed');
   }finally{await app.close();}
  const reopened=await launch();
  try{
    await reopened.firstWindow();
    const choices=await selectMenu(reopened,'轮播速度');
    assert.equal(choices.find(i=>i.checked).label,'慢 · 60 秒');
    console.log('Saved rotation speed survived restart');
  }finally{await reopened.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
