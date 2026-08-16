# 大圣喵 · 桌面桌宠（大圣喵 Desktop Pet）

一只会浮在你桌面任意位置的透明悬浮猫（齐天大圣·喵版）。**完全独立于任何客户端软件**，只要电脑装了 Node.js，任何人都能装、任何 AI Agent 都能帮装。

> 它不是 WorkBuddy 专属功能 —— 只是一个普通的 Electron 小程序，跟聊天工具无关。

## 特性
- 真·系统级悬浮窗（透明、无边框、置顶、跨屏可见）
- 可拖到桌面任意位置（带视觉反馈）
- 表情切换：默认 / 开怀（双击换脸）/ 思考 / 生气 / 睡觉
- 悟空话术气泡（单击随机、双击开怀切换、三击隐身）
- 三档尺寸切换：小 / 中 / 大（右键菜单，中档 = 默认大小）
- 浮动待机（40~80s 随机动作）
- 右键菜单：尺寸切换 + 退出

## 环境要求（唯一硬依赖）
- **Node.js ≥ 18**（含 npm）。没有就先装：https://nodejs.org （或 `brew install node`）

> 不需要任何客户端、不需要账号、不需要联网（图标与表情图都打在你本地）。

---

## 一、人类怎么装

> 分发方式：**只发 zip 包即可**（无需 GitHub / 无需账号 / 无需联网）。

1. 收到 `dasheng-pet.zip`，解压：
   ```bash
   unzip dasheng-pet.zip
   cd dasheng-pet
   ```
2. 安装并启动（二选一）：
   - **最省事**：直接双击 `install.sh`（macOS / Linux），或在文件夹里打开终端运行 `./install.sh`
   - **手动**：`npm install && npm start`

首次 `npm install` 会下载 electron（约几十 MB，稍慢），之后秒启。
启动后大圣喵浮在屏幕右下角，拖到任意位置即可。关闭用**右键 → 退出**，或终端 `Ctrl+C`。

> 有 Git 仓库的话 `git clone` 也行，但 zip 已经足够，不必为此建仓库。

---

## 二、让「你的 AI Agent」帮你装（给 Agent 的指令）

把这段直接发给你的 Agent（WorkBuddy / OpenClaw / 任意能跑命令的 AI 助手）。
**zip 场景**——Agent 不需要访问任何仓库，只要拿到 zip 文件即可：

```
帮我安装「大圣喵桌面桌宠」：
1. 如果本机没有 Node.js，先安装（macOS: brew install node；其他: 见 nodejs.org）
2. 解压我发给你的 dasheng-pet.zip，进入目录后执行：npm install && npm start
   （或者运行里面的 ./install.sh）
3. 启动后告诉我大圣喵是否浮现在屏幕上
```

如果你把 zip **上传到了某个可下载的链接**（网盘 / 对象存储 / 任意 http 地址），指令还能更省——让 Agent 自己下载：
```
帮我安装「大圣喵桌面桌宠」：
1. 用 curl 下载 https://你的链接/dasheng-pet.zip 到当前目录
2. unzip dasheng-pet.zip && cd dasheng-pet
3. npm install && npm start
4. 告诉我是否启动成功
```

Agent 跑的就是上面同样的命令——它不需要知道任何桌面宠物内部细节，只要会执行 shell 就行。

> 💡 想让 Agent 顺手帮你设成「开机自启」？在指令里加一句「装好后把它加入登录项」即可
> （macOS 用 `osascript` 把 launch.sh 加到 Login Items；Windows 放启动文件夹）。

---

## 三、互动说明
| 操作 | 效果 |
|------|------|
| 单击 | 随机悟空话术 + 对应表情 |
| 双击 | 开怀↔正襟危坐切换（开怀时真·换脸：咧嘴大笑版） |
| 三击 | "俺老孙去也！" → 隐身 5 秒回归 |
| 拖拽 | 整个窗口拖到屏幕任意位置 |
| 右键 | 尺寸切换（小/中/大）+ 退出 |
| 待机 | 每 40~80s 随机做一次动作 |

## 四、跨平台说明
- **macOS**：开箱即用。`win.setWindowButtonVisibility(false)` 已隐藏红黄绿交通灯，避免挡气泡。
- **Windows**：透明悬浮窗原生支持。首次运行若被 Defender 拦截，点"仍要运行"。
- **Linux**：需要桌面合成器（一般桌面环境都有）。若透明失效，确认用的是 Wayland/KDE/GNOME 而非纯 X。

## 五、文件结构
```
dasheng-pet/
├── main.js          # Electron 主进程：创建透明悬浮窗
├── preload.js       # 预加载脚本（暴露 petAPI 给渲染进程）
├── start.js         # 健壮启动器（剥离 ELECTRON_RUN_AS_NODE，跨平台）
├── install.sh       # 一键安装并启动（人类双击 / Agent 执行均可）
├── launch.sh        # macOS 一键启动
├── package.json     # 项目配置
├── config.json      # 当前尺寸选择（小/中/大）
├── renderer/
│   ├── index.html   # 桌宠页面
│   ├── style.css    # 浮动 / 气泡 / 表情滤镜样式
│   └── renderer.js  # 表情切换 / 话术 / 拖拽 / 待机逻辑
└── assets/
    ├── dasheng.png       # 大圣喵主图（白底已去除）
    └── dasheng-happy.png # 开怀版（双击换脸用，img2img 生成）
```

## 六、常见问题
**Q：启动后是黑色方块 / 窗口空白？**
A：删掉 node_modules 重装：`rm -rf node_modules && npm install && npm start`。

**Q：提示 `command not found: npm`？**
A：没装 Node.js，先装（见上方环境要求）。

**Q：为什么不用 WorkBuddy 自带宠物？**
A：WorkBuddy 自带宠物只在客户端内显示；这个桌宠是系统级悬浮窗，任何电脑、任何软件旁边都能浮着。

## 七、想发给别人（分发）
- **只发 zip 包即可**（本说明默认方式）：把整个文件夹（**不含 node_modules**）打包成 zip 发过去，对方 `./install.sh` 或 `npm install && npm start`。
- 想让对方 Agent 自动下载：把 zip 传到任意可访问的 http 链接，让 Agent 用 `curl` 拉取后安装（见第二节）。
- 省去安装（对方零 Node）：用 `electron-builder` 打成 `.dmg` / `.exe` 安装包，需要自行配置签名。
