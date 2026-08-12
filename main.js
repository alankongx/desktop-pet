// 大圣喵 - 系统级悬浮窗主进程
const { app, BrowserWindow, screen, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// macOS GPU 沙箱绕过（公司 Mac 经常踩这个坑）
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

let win = null;

// ============ 三档尺寸表 ============
// 中档 = 此前默认（112×128 桌宠），现为基准
// 小档 = 0.75×，大档 = 1.5×
// bubbleH = 头顶气泡占位；winH = petH + bubbleH
const SIZE_PRESETS = {
  small:  { petW: 84,  petH: 96,  bubbleH: 14, bubbleFont: 10, padX: 7,  padY: 2 },
  medium: { petW: 112, petH: 128, bubbleH: 18, bubbleFont: 14, padX: 9,  padY: 3 },
  large:  { petW: 168, petH: 192, bubbleH: 28, bubbleFont: 21, padX: 13, padY: 5 },
};
const WIN_PAD_RIGHT = 40;
const WIN_PAD_BOTTOM = 40;

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfigSize() {
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    if (SIZE_PRESETS[c.size]) return c.size;
  } catch (e) { /* 配置文件缺失或损坏，回退 medium */ }
  return 'medium';
}
function saveConfigSize(size) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ size }, null, 2));
  } catch (e) { /* 写失败不打断运行 */ }
}

// 当前尺寸状态（运行时可变）
let currentSizeName = loadConfigSize();
let PET = SIZE_PRESETS[currentSizeName];
let PET_W = PET.petW;
let PET_H = PET.petH;
let BUBBLE_H = PET.bubbleH;
let WIN_W = PET_W;
let WIN_H = PET_H + BUBBLE_H;

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: width - WIN_W - WIN_PAD_RIGHT,
    y: height - WIN_H - WIN_PAD_BOTTOM,
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
      { label: '尺寸', submenu: sizeItems },
      { type: 'separator' },
      { label: '永远退出大圣喵', click: () => app.quit() },
    ]);
    menu.popup(win);
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
    const [x, y] = win.getPosition();
    const wa = screen.getPrimaryDisplay().workArea;
    const nx = Math.max(wa.x, Math.min(x + dx, wa.x + wa.width - WIN_W));
    const ny = Math.max(wa.y, Math.min(y + dy, wa.y + wa.height - WIN_H));
    win.setPosition(nx, ny);
  });

  // ========== 尺寸切换 IPC ==========
  // 渲染进程算好目标窗口尺寸后发来，主进程改窗口大小（保右下角不动）
  ipcMain.on('set-size', (e, { name, winW, winH }) => {
    if (!win || win.isDestroyed()) return;
    if (name && SIZE_PRESETS[name]) {
      currentSizeName = name;
      PET = SIZE_PRESETS[name];
      PET_W = PET.petW;
      PET_H = PET.petH;
      BUBBLE_H = PET.bubbleH;
    }
    if (winW && winH) {
      const [x, y] = win.getPosition();
      const [w, h] = win.getSize();
      // 保持窗口右下角位置不变，避免切换时宠物乱跳
      const nx = x + w - winW;
      const ny = y + h - winH;
      win.setBounds({ x: nx, y: ny, width: winW, height: winH });
      WIN_W = winW;
      WIN_H = winH;
    }
  });

  // 持久化尺寸选择
  ipcMain.on('save-size', (e, name) => {
    if (SIZE_PRESETS[name]) saveConfigSize(name);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
