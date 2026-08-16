#!/bin/bash
# 大圣喵桌宠 · 安装并启动（macOS / Linux）
# 人类：在终端运行 ./install.sh，或拖进终端
# AI Agent：直接执行 ./install.sh 即可（前提是本机已装 Node.js）
set -e

cd "$(dirname "$0")"

# 检查 Node.js 是否安装
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未检测到 Node.js，请先安装："
  echo "   macOS:   brew install node"
  echo "   其他:    https://nodejs.org"
  exit 1
fi

echo "📦 正在安装依赖（electron，首次约几十 MB）..."
npm install

echo "🐱 启动大圣喵..."
npm start
