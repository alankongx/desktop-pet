// preload.js - 牛来桌宠的渲染进程 ↔ 主进程桥（与大圣派特同架构）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  // 拖窗口：调用主进程按 (dx, dy) 移动窗口
  moveBy: (dx, dy) => ipcRenderer.send('drag-move', { dx, dy }),

  // 尺寸切换：把目标窗口尺寸发给主进程，让其 setBounds
  setSize: (name, winW, winH) => ipcRenderer.send('set-size', { name, winW, winH }),

  // 保存当前尺寸选择到 config.json
  saveSize: (name) => ipcRenderer.send('save-size', name),

  // 主进程 → 渲染：启动时套用已保存尺寸
  onInitSize: (cb) => ipcRenderer.on('init-size', (e, name) => cb(name)),

  // 主进程 → 渲染：右键菜单选了尺寸
  onApplySize: (cb) => ipcRenderer.on('apply-size', (e, name) => cb(name)),
});
