// preload.js - 大圣喵桌宠的渲染进程 ↔ 主进程桥
// v10：手动拖窗口（替代 CSS -webkit-app-region: drag，避免吞掉 click 事件）
// v12：尺寸切换（set-size / save-size）+ 接收主进程的尺寸指令（init-size / apply-size）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  onRotationInterval: cb => ipcRenderer.on('rotation-interval', (_,ms) => cb(ms)),
  onAutoActions: cb => ipcRenderer.on('auto-actions', (_,enabled) => cb(enabled)),
  onCloudStyle: cb => ipcRenderer.on('cloud-style', (_,style) => cb(style)),
  onAction: cb => ipcRenderer.on('pet-action', (_,id) => cb(id)),
  onMode: cb => ipcRenderer.on('pet-mode', (_,mode) => cb(mode)),
  onCodex: cb => ipcRenderer.on('codex-status', (_,state) => cb(state)),
  // 拖窗口：调用主进程按 (dx, dy) 移动窗口
  moveBy: (dx, dy) => ipcRenderer.send('drag-move', { dx, dy }),

  // 尺寸切换：把目标窗口尺寸发给主进程，让其 setBounds
  setSize: (name, winW, winH) => ipcRenderer.send('set-size', { name, winW, winH }),

  // 保存当前尺寸选择到 config.json
  saveSize: (name) => ipcRenderer.send('save-size', name),

  // 主进程 → 渲染：启动时套用已保存尺寸（不 resize、不重复保存）
  onInitSize: (cb) => ipcRenderer.on('init-size', (e, name) => cb(name)),

  // 主进程 → 渲染：右键菜单选了尺寸（resize + 保存）
  onApplySize: (cb) => ipcRenderer.on('apply-size', (e, name) => cb(name)),
});
