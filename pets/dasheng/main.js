// 大圣喵 - 系统级悬浮窗主进程
const { app, BrowserWindow, screen, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// macOS GPU 沙箱绕过（公司 Mac 经常踩这个坑）
if (process.platform === 'darwin' && !app.isPackaged) {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('no-sandbox');
}
if (process.platform === 'win32') {
  app.setAppUserModelId('DashengPet.Desktop');
}
if ((process.platform === 'win32' || app.isPackaged) && !app.requestSingleInstanceLock()) app.exit(0);

let win = null;

// ============ 三档尺寸表 ============
// 中档 = 此前默认（112×128 桌宠），现为基准
// 小档 = 0.75×，大档 = 1.5×
// bubbleH = 头顶气泡占位；winH = petH + bubbleH
const SIZE_PRESETS = {
  small:  { petW: 84,  petH: 96,  bubbleH: 60,  bubbleFont: 10, padX: 7,  padY: 2 },
  medium: { petW: 112, petH: 128, bubbleH: 90,  bubbleFont: 14, padX: 9,  padY: 3 },
  large:  { petW: 168, petH: 192, bubbleH: 140, bubbleFont: 21, padX: 13, padY: 5 },
};
const WIN_PAD_RIGHT = 40;
const WIN_PAD_BOTTOM = 40;

const CONFIG_PATH = path.join(process.platform === 'win32' || app.isPackaged ? app.getPath('userData') : __dirname, 'config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) || {}; }
  catch { return {}; }
}
const config = readConfig();
function saveSetting(key, value) {
  config[key] = value;
  try { fs.writeFileSync(CONFIG_PATH + '.tmp', JSON.stringify(config, null, 2)); fs.renameSync(CONFIG_PATH + '.tmp', CONFIG_PATH); }
  catch (err) { console.warn('桌宠设置保存失败', err.message); }
}
let stopMonitor;
let codexStatus = 'idle';
function startMonitor() {
  if (stopMonitor) stopMonitor();
  stopMonitor = null;
  if (config.codexSync === false) {
    codexStatus = 'off';
    win.webContents.send('codex-status', codexStatus);
    return;
  }
  stopMonitor = require('./codex-status').monitor(state => {
    codexStatus = state;
    if (win && !win.isDestroyed()) win.webContents.send('codex-status', state);
  });
}
const rotationSpeeds = [
  {id:'fast', label:'快 · 18 秒', ms:18000},
  {id:'medium', label:'中 · 30 秒', ms:30000},
  {id:'slow', label:'慢 · 60 秒', ms:60000},
];
let rotationSpeed = rotationSpeeds.find(item => item.id === config.rotationSpeed) || rotationSpeeds[1];
let currentSizeName = SIZE_PRESETS[config.size] ? config.size : 'medium';
function field(size=currentSizeName) {
  const p=SIZE_PRESETS[size],w=p.petW,h=p.petH+p.bubbleH,side=Math.ceil(w*.68);
  return {w,h,side,width:w+side*2,height:h+Math.ceil(w*.57)};
}
function createWindow() {
  const box=field();
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  let pos = {x:area.x+area.width-box.w-WIN_PAD_RIGHT, y:area.y+area.height-box.h-WIN_PAD_BOTTOM};
  if (config.position && Number.isInteger(config.position.x) && Number.isInteger(config.position.y)) {
    const saved = config.position;
    const bounds = screen.getDisplayNearestPoint(saved).workArea;
    pos = {x:Math.max(bounds.x,Math.min(saved.x,bounds.x+bounds.width-box.w)),
           y:Math.max(bounds.y,Math.min(saved.y,bounds.y+bounds.height-box.h))};
  }

  win = new BrowserWindow({
    width: box.width,
    height: box.height,
    x: pos.x-box.side, y: pos.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    }
  });

  let savePositionTimer;
  win.on('move', () => {
    clearTimeout(savePositionTimer);
    savePositionTimer=setTimeout(() => {
      if (win && !win.isDestroyed()) {
        const [x,y]=win.getPosition();saveSetting('position',{x:x+field().side,y});
      }
    },400);
  });
  let ignoring=false;
  const updateHitArea=()=>{
    if(!win || win.isDestroyed())return;
    const cursor=screen.getCursorScreenPoint(),bounds=win.getBounds(),b=field();
    const x=cursor.x-bounds.x,y=cursor.y-bounds.y;
    const pass=x<b.side||x>=b.side+b.w||y<0||y>=b.h;
    if(pass!==ignoring){ignoring=pass;win.setIgnoreMouseEvents(pass,{forward:true});}
  };
  const pointerTimer=setInterval(updateHitArea,90);
  updateHitArea();
  win.on('closed',()=>{clearTimeout(savePositionTimer);clearInterval(pointerTimer);});
  // 跨屏可见
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // 浮在最上面（screen-saver 层级，防止被其他 app 盖住）
  win.setAlwaysOnTop(true, 'screen-saver');

  // 不在 dock 显示
  if (process.platform === 'darwin') {
    app.dock && app.dock.hide();
    // v11：隐藏 macOS 红黄绿交通灯按钮，免得挡住头顶气泡文字
    // 关闭宠物改用右键菜单（已实现「永远退出大圣喵」）
    win.setWindowButtonVisibility(false);
  }

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // 启动后把当前尺寸名发给渲染进程，让它套上对应 CSS class
  win.webContents.once('dom-ready', () => {
    win.webContents.send('init-size', currentSizeName);
    win.webContents.send('pet-mode', config.mode || '3d');
    win.webContents.send('cloud-style',config.cloudStyle || 'depart');
    win.webContents.send('rotation-interval', rotationSpeed.ms);
    win.webContents.send('auto-actions', (config.autoActions ?? config.autoStaff) !== false);
    startMonitor();
  });

  // 右键菜单：尺寸切换 + 完全退出
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
    const sizeItems = ['small', 'medium', 'large'].map((s) => ({
      label: { small: '小', medium: '中', large: '大' }[s],
      type: 'radio',
      checked: currentSizeName === s,
      click: () => win.webContents.send('apply-size', s),
    }));
    const menu = Menu.buildFromTemplate([
      { label:'做个动作', submenu:require('./actions').map(({id,label})=>({
        label,click:()=>win.webContents.send('pet-action',id)
      })) },
      { label:'筋斗云样式', submenu:[['depart','翻筋斗飞远'],['glide','接云滑行']].map(([id,label])=>({
        label,type:'radio',checked:(config.cloudStyle || 'depart')===id,
        click:()=>{saveSetting('cloudStyle',id);win.webContents.send('cloud-style',id);win.webContents.send('pet-action','cloud');}
      })) },
      { label: '形象', submenu: [['3d','3D 大圣'],['classic','经典原画']].map(([id,label]) => ({
        label, type:'radio', checked:(config.mode || '3d') === id,
        click:() => {saveSetting('mode',id); win.webContents.send('pet-mode',id);}
      })) },
      { label:'自动轮换动作和话术', type:'checkbox', checked:(config.autoActions ?? config.autoStaff) !== false,
        click:item => {saveSetting('autoActions',item.checked); win.webContents.send('auto-actions',item.checked);} },
      { label:'轮播速度', submenu:rotationSpeeds.map(speed => ({
        label:speed.label, type:'radio', checked:rotationSpeed.id === speed.id,
        click:() => {
          rotationSpeed = speed;
          saveSetting('rotationSpeed', speed.id);
          win.webContents.send('rotation-interval', speed.ms);
        }
      })) },
      { label:'跟随 Codex 状态', type:'checkbox', checked:config.codexSync !== false,
        click:item => {saveSetting('codexSync',item.checked); startMonitor();} },
      { label:'管理 Codex 确认提醒…', click:async()=>{
        const hooks=require('./codex-hook-setup');
        try{
          const enabled=hooks.registered();
          const result=await dialog.showMessageBox(win,{message:enabled?'移除大圣喵的 Codex 提醒钩子？':'登记大圣喵的 Codex 提醒钩子？',
            detail:'在本机 Codex 用户配置中登记任务结束和权限请求。钩子只更新时间标记。登记后请在 Codex 设置 → Hooks 中审阅并信任。',
            buttons:[enabled?'移除':'登记','取消'],defaultId:1,cancelId:1});
          if(result.response===0)hooks.configure(!enabled);
        }catch(err){dialog.showErrorBox('Codex 提醒配置',err.message);}
      }},
      { label: '尺寸', submenu: sizeItems },
      { type: 'separator' },
      { label: '永远退出大圣喵', click: () => app.quit() },
    ]);
    menu.popup({window:win});
  });

  // 隐藏菜单条
  if (process.platform === 'darwin') {
    win.on('ready-to-show', () => {
      win.setMenuBarVisibility(false);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  // ========== 手动拖窗口 IPC ==========
  // CSS -webkit-app-region: drag 会吞掉 click 事件（老板单击/双击/三击全没反应）
  // 改用 IPC 手动移动窗口，click 留给 pet 自己的交互
  ipcMain.on('drag-move', (e, { dx, dy }) => {
    if (!win || win.isDestroyed()) return;
    const [x,y]=win.getPosition(),b=field();
    const wa=screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
    const nx=Math.max(wa.x,Math.min(x+b.side+dx,wa.x+wa.width-b.w));
    const ny=Math.max(wa.y,Math.min(y+dy,wa.y+wa.height-b.h));
    win.setPosition(nx-b.side,ny);
  });

  ipcMain.on('set-size',(e,{name})=>{
    if(!win || win.isDestroyed() || !SIZE_PRESETS[name])return;
    const old=field(),next=field(name),[x,y]=win.getPosition();currentSizeName=name;
    win.setBounds({x:x+old.side+old.w-next.w-next.side,y:y+old.h-next.h,
      width:next.width,height:next.height});
  });

  // 持久化尺寸选择
  ipcMain.on('save-size', (e, name) => {
    if (SIZE_PRESETS[name]) saveSetting('size',name);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => { if (stopMonitor) stopMonitor(); });

app.on('window-all-closed', () => {
  app.quit();
});
