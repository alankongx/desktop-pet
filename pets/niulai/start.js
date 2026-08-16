#!/usr/bin/env node
/**
 * 牛来桌宠 · 健壮启动器（与大圣派特同架构）
 *
 * 某些环境会预设环境变量 ELECTRON_RUN_AS_NODE=1，
 * 会让 electron 以 Node 模式运行（不启动 GUI）。
 * 这里在 spawn 之前显式删除该变量，保证任何机器上都能正常弹窗。
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');

delete process.env.ELECTRON_RUN_AS_NODE;

let electronPath;
try {
  electronPath = require('electron');
} catch (e) {
  console.error('找不到 electron。请先运行：npm install');
  process.exit(1);
}

const appDir = path.join(__dirname, '.');

const child = spawn(electronPath, [appDir], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  console.error('启动失败：', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code === null ? 0 : code);
});
