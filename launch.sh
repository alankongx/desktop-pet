#!/bin/bash
# 大圣喵桌宠 · 一键启动（macOS 双击 / 终端 / LaunchAgent 自启均可）
# 自动处理可能污染 electron GUI 的环境变量，无需手动 unset
# 保证在最小化环境（如 LaunchAgent）也能找到 node
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
cd "$(dirname "$0")"
node start.js
