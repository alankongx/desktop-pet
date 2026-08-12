#!/usr/bin/env node
/**
 * 大圣喵桌宠 · 健壮启动器
 *
 * 为什么需要它而不是直接 `electron .`：
 *   某些环境（部分 AI Agent 沙箱、CI）会预设环境变量 ELECTRON_RUN_AS_NODE=1，
 *   这会让 electron 以 Node 模式运行（不启动 GUI），导致 ipcMain 未定义而崩溃。
 *   这里在 spawn 之前显式删除该变量，保证任何机器上都能正常弹窗。
 *
 * 跨平台：macOS / Windows / Linux 通用。
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

// 关键：清除可能破坏 electron GUI 启动的环境变量
delete process.env.ELECTRON_RUN_AS_NODE;

// 解析 electron 可执行文件（require('electron') 在普通 Node 下返回其二进制路径）
let electronPath;
try {
  electronPath = require('electron');
} catch (e) {
  console.error('❌ 找不到 electron。请先运行：npm install');
  console.error('   （需要本机已安装 Node.js，版本 ≥ 18）');
  process.exit(1);
}

const appDir = path.join(__dirname, '.');

const child = spawn(electronPath, [appDir], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  console.error('❌ 启动失败：', err.message);
  console.error('   请确认已执行 `npm install`，且系统已安装 Node.js。');
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code === null ? 0 : code);
});
