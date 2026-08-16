// 牛来桌宠 - 系统级悬浮窗主进程（与大圣派特同架构）
const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// macOS GPU 沙箱绕过
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

let win = null;

// ============ 三档尺寸表 ============
// 牛来 7 态图均为近正方形（宽高比 0.94~1.15），按高度缩放
// winW 取最宽图（kaibai 1.15）× petH + 余量，确保不裁切
const SIZE_PRESETS = {
  small:  { winW: 120, petH: 96,  bubbleH: 56,  bubbleFont: 10, padX: 7,  padY: 2 },
  medium: { winW: 160, petH: 128, bubbleH: 86,  bubbleFont: 14, padX: 9,  padY: 3 },
  large:  { winW: 235, petH: 192, bubbleH: 130, bubbleFont: 21, padX: 13, padY: 5 },
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
let PET_H = PET.petH;
let BUBBLE_H = PET.bubbleH;
let WIN_W = PET.winW;
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

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver');

  if (process.platform === 'darwin') {
    app.dock && app.dock.hide();
    win.setWindowButtonVisibility(false);
  }

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.webContents.once('dom-ready', () => {
    win.webContents.send('init-size', currentSizeName);
  });

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
      { label: '永远退出牛来', click: () => app.quit() },
    ]);
    menu.popup(win);
  });

  if (process.platform === 'darwin') {
    win.on('ready-to-show', () => {
      win.setMenuBarVisibility(false);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('drag-move', (e, { dx, dy }) => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition();
    const wa = screen.getPrimaryDisplay().workArea;
    const nx = Math.max(wa.x, Math.min(x + dx, wa.x + wa.width - WIN_W));
    const ny = Math.max(wa.y, Math.min(y + dy, wa.y + wa.height - WIN_H));
    win.setPosition(nx, ny);
  });

  ipcMain.on('set-size', (e, { name, winW, winH }) => {
    if (!win || win.isDestroyed()) return;
    if (name && SIZE_PRESETS[name]) {
      currentSizeName = name;
      PET = SIZE_PRESETS[name];
      PET_H = PET.petH;
      BUBBLE_H = PET.bubbleH;
    }
    if (winW && winH) {
      const [x, y] = win.getPosition();
      const [w, h] = win.getSize();
      const nx = x + w - winW;
      const ny = y + h - winH;
      win.setBounds({ x: nx, y: ny, width: winW, height: winH });
      WIN_W = winW;
      WIN_H = winH;
    }
  });

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
