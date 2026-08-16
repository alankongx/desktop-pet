#!/bin/bash
# 牛来桌宠 · 一键启动（macOS 双击 / 终端 / LaunchAgent 自启均可）
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")"
node start.js
