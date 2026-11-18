# 大圣喵 · 桌面桌宠（大圣喵 Desktop Pet）

一只会浮在你桌面任意位置的透明悬浮猫（齐天大圣·喵版）。Mac 和 Windows 安装包自带运行环境，也支持从源码运行。

> 它不是 WorkBuddy 专属功能 —— 只是一个普通的 Electron 小程序，跟聊天工具无关。

## 3D 桌面版

单击挥手，双击切换开怀表情。右键打开「做个动作」，可以挥手、耍金箍棒、金箍棒变大、耍棍花、转圈、打盹、开怀大笑、变红发怒或驾筋斗云。「形象」可以切回经典原画。拖动可移动桌宠，右键「尺寸」可放大。

头盔、护耳、羽冠、胸甲、虎皮裙、靴子和手掌按原版 PNG 的同一坐标系建模，常态金箍棒长约为角色总高的 65%。棒变大时长度达到常态的 2.236 倍，粗细达到 2.47 倍。左手待机时自然垂在虎皮裙旁，手掌外缘带弧度，指节微屈。打盹也用这只放松的小手，打招呼时抬手挥掌。后脑壳、背甲与披风具有独立深度。正交镜头和人物比例固定，棒端与棍风特效可以伸进桌宠周围的透明区域。

右键「轮播速度」可选快（18 秒）、中（30 秒，默认）或慢（60 秒），重启记住选择。自动轮播按右键菜单顺序轮换九个动作，各自同步显示短台词；同一动作再次出现时轮换说法。耍棍花时显示「看俺老孙耍个棍花！」并播放棍风特效。筋斗云动作会脚踏金色卷云翻一个筋斗，云尾朝右，大圣向左上方渐小飞远，气泡显示「俺老孙一个筋斗，十万八千里！」。右键「筋斗云样式」可点播并保存「翻筋斗飞远」或「接云滑行」。后者会在翻身时从脚下接住大圣，滑行时右侧云尾向后舒展，大圣会招呼「好云儿，接俺一程！」。手动互动、经典原画和需要关注的 Codex 状态会让自动动作暂缓。右键「自动轮换动作和话术」可关闭或恢复，设置会保存。

默认勾选「跟随 Codex 状态」。在支持的 macOS 和 Windows 本机 Codex 记录格式下，每约 5 秒只读查询本机任务的状态、时间与活动种类，在气泡上方显示简短状态。工作时会点头，完成时笑着挥手，失败时发红。其他对话仍工作时也会显示刚完成任务的提示。右键「管理 Codex 确认提醒…」可登记或移除本地通知钩子。在 Codex 设置 → Hooks 中审阅并信任后，支持的本机权限请求和任务结束事件会触发约 20 秒的桌宠气泡。确认操作在 Codex 内完成。最近完成或中断的反馈保留约 20 秒，再回到待机。关闭跟随后停止查询。Codex 本地记录格式因版本而异，无法读取时显示「未连接」。

3D 引擎、模型、贴图与原版素材一并保存在本地。发布用桌宠内含原版常态和笑脸素材。WebGL 无法启动时自动使用经典原画。

## Mac 一键安装

从 [GitHub Release](https://github.com/alankongx/desktop-pet/releases/tag/dasheng-v2.2.5) 下载 DashengPet-2.2.5-macOS-Universal.pkg，双击安装，再到「应用程序」打开「大圣喵」。同一个安装包支持 macOS 13 或以上的 Apple 芯片和 Intel Mac，内含运行环境。首次安装可能出现开发者验证提示，此版本未作 Apple 公证。

## Windows 一键安装

Windows 10/11 x64 用户从 [GitHub Release](https://github.com/alankongx/desktop-pet/releases/tag/dasheng-v2.2.5) 下载 DashengPet-2.2.5-Windows-x64-Setup.exe，双击安装后自动启动。安装包内含运行环境，无需 Node.js、管理员权限或 Codex。再次启动可用桌面或开始菜单快捷方式，卸载可用系统的应用列表。

## 重新构建安装包

- Mac 上先运行 `npm ci --prefix macos`，再运行 `node macos/build.mjs --output ./DashengPet-macOS.pkg`。构建需要 Node.js 22.12 或以上和 Xcode 命令行工具。
- Windows 安装包使用 Python 3 和 NSIS 3 构建，命令为 `python3 windows/build.py --output ./DashengPet-Setup.exe`。
- 两个构建都使用 `packaging-files.json` 选取程序、模型与贴图，并校验 Electron 下载文件的 SHA-256。

## 特性
- 真·系统级悬浮窗（透明、无边框、置顶、跨屏可见）
- 可拖到桌面任意位置（带视觉反馈）
- 表情切换：默认 / 开怀（双击换脸）/ 思考 / 生气 / 睡觉
- 悟空话术气泡（单击随机、双击开怀切换、三击隐身）
- 三档尺寸切换：小 / 中 / 大（右键菜单，中档 = 默认大小）
- 浮动待机（40~80s 随机动作）
- 右键菜单：尺寸切换 + 退出

## 从源码运行的环境要求
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
| 单击 | 挥手打招呼，有待处理的 Codex 提醒时重显提醒 |
| 双击 | 咧嘴大笑，再双击可收起笑脸 |
| 三击 | 说句隐身话，5 秒后现身打招呼 |
| 拖拽 | 整个窗口拖到屏幕任意位置 |
| 右键 | 尺寸切换（小/中/大）+ 退出 |
| 待机 | 3D 默认每 30 秒轮换动作和台词；经典形象或关闭轮换时偶尔做一个小动作 |

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
