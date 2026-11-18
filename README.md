# 桌宠合集 · Desktop Pet Collection

一组系统级透明悬浮桌宠，基于 Electron 无边框透明窗口。**独立于任何客户端软件**，只要电脑装了 Node.js，任何人都能装、任何 AI Agent 都能帮装。

> 不是 WorkBuddy 专属功能——只是普通的 Electron 小程序，跟聊天工具无关。

## 可用宠物

| 宠物 | 目录 | 简介 |
| --- | --- | --- |
| 🐱 大圣喵 3D | `pets/dasheng/` | 齐天大圣·喵版，悟空话术气泡，双击换脸开怀 |
| ✨ 极光萌可 | `pets/auroraping/` | 《奇妙萌可》传奇萌可，代表元素「承诺」，金色弓箭，4 态切换 |
| 🐂 牛来 | `pets/niulai/` | 盼牛市吉祥物，7 态表情包（暗中/上头/摆烂/无语/开摆/发疯/你说的） |

更多宠物持续添加中——每个宠物就是一个 `pets/<name>/` 目录，放进来自动出现在安装器列表里。

## 快速安装

Windows 10/11 x64 可直接下载 [大圣喵 3D 一键安装包](https://github.com/alankongx/desktop-pet/releases/download/dasheng-v2.2.3/DashengPet-2.2.3-Windows-x64-Setup.exe)，双击后安装并启动。

从源码安装可用以下命令。



```bash
git clone git@github.com:alankongx/desktop-pet.git
cd desktop-pet
./install.sh
```

安装器会：
1. 列出所有可用宠物，你选要装哪些（多选）
2. 自动 `npm install` 依赖
3. 可选配置开机自启（macOS LaunchAgent / Linux .desktop）
4. 可选安装后立即启动

### 环境要求

- **Node.js ≥ 18**（含 npm）。没有就先装：`brew install node`（macOS）或 https://nodejs.org

## 单独启动某个宠物

```bash
cd pets/dasheng      # 或 pets/auroraping
./launch.sh          # 或 npm start
```

退出：**右键 → 永远退出**，或终端 `pkill -f start.js`

## 交互方式（所有宠物通用）

| 操作 | 效果 |
| --- | --- |
| 拖拽 | 移动到屏幕任意位置 |
| 单击 | 随机发言 |
| 双击 | 切换特殊状态（大圣=开怀 / 极光=绽放 / 牛来=循环 7 态） |
| 三击 | 隐身 5 秒后回归 |
| 右键 | 尺寸切换（小/中/大）+ 退出 |
| 待机 | 每 40~80s 随机情绪小剧场 |

## 开机自启

安装器会自动询问是否配置。如果跳过了，手动配置：

**macOS**：
```bash
# 创建 LaunchAgent
cat > ~/Library/LaunchAgents/com.alankongx.auroraping-pet.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.alankongx.auroraping-pet</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>/完整路径/pets/auroraping/launch.sh</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
EOF
launchctl load ~/Library/LaunchAgents/com.alankongx.auroraping-pet.plist
```

**Linux**：
```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/auroraping-pet.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=auroraping-pet
Exec=/bin/bash /完整路径/pets/auroraping/launch.sh
Terminal=false
EOF
```

## 卸载

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/com.alankongx.<pet>-pet.plist
rm ~/Library/LaunchAgents/com.alankongx.<pet>-pet.plist
pkill -f pets/<pet>/start.js

# Linux
rm ~/.config/autostart/<pet>-pet.desktop
pkill -f pets/<pet>/start.js
```

## 添加新宠物

1. 在 `pets/` 下新建目录
2. 参考现有宠物结构放 `main.js` / `preload.js` / `start.js` / `launch.sh` / `package.json` / `renderer/` / `assets/`
3. `package.json` 的 `description` 字段会自动显示在安装器列表里
4. 运行 `./install.sh` 即可看到新宠物出现在选择列表

## 仓库结构

```
desktop-pet/
├── install.sh              # 合集安装器（自选宠物 + 依赖 + 开机自启）
├── README.md               # 本文件
├── pets/
│   ├── dasheng/            # 大圣派特
│   │   ├── main.js
│   │   ├── preload.js
│   │   ├── start.js
│   │   ├── launch.sh
│   │   ├── package.json
│   │   ├── config.json
│   │   ├── renderer/
│   │   └── assets/
│   └── auroraping/         # 极光萌可
│       ├── main.js
│       ├── preload.js
│       ├── start.js
│       ├── launch.sh
│       ├── package.json
│       ├── config.json
│       ├── renderer/
│       └── assets/
│   └── niulai/              # 牛来
│       ├── main.js
│       ├── preload.js
│       ├── start.js
│       ├── launch.sh
│       ├── package.json
│       ├── config.json
│       ├── renderer/
│       └── assets/
└── .gitignore
```

## 跨平台说明

- **macOS**：开箱即用。交通灯按钮已隐藏。
- **Windows**：透明悬浮窗原生支持。首次运行若被 Defender 拦截，点"仍要运行"。
- **Linux**：需要桌面合成器。若透明失效，确认用的是 Wayland/KDE/GNOME 而非纯 X。

## License

MIT
