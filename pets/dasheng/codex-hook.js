'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const codexHome=()=>process.env.CODEX_HOME || path.join(os.homedir(),'.codex');
function recentNotice(now=Date.now()){
  for(const state of ['input','done']){
    try{
      const ts=fs.statSync(path.join(codexHome(),'dasheng-pet',state+'.notice')).mtimeMs;
      if(ts<=now && now-ts<20000)return {state,ts};
    }catch{/* No event of this type yet. */}
  }
  return null;
}
module.exports={codexHome,recentNotice};
