#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# 桌宠合集 · 一键安装器（macOS / Linux）
#   git clone 后运行 ./install.sh，自选安装哪些宠物
#   - 自动 npm install 依赖
#   - 自动配置开机自启（macOS LaunchAgent / Linux .desktop）
#   - 安装完立即启动
# ═══════════════════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")"
PETS_DIR="$(pwd)/pets"
INSTALL_DIR="$(pwd)"

# ─── 颜色 ───
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║     🐱✨ 桌宠合集 · Desktop Pet Collection    ║"
echo "║     自选你的桌面伙伴，装好即用               ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 检查 Node.js ───
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ 未检测到 Node.js，请先安装：${NC}"
  echo "   macOS:   brew install node"
  echo "   其他:    https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ─── 扫描可用宠物 ───
PET_NAMES=()
PET_LABELS=()
i=0
for pet_dir in "$PETS_DIR"/*/; do
  [ -d "$pet_dir" ] || continue
  pet_name=$(basename "$pet_dir")
  # 从 package.json 读描述
  desc=""
  if [ -f "$pet_dir/package.json" ]; then
    desc=$(node -e "try{console.log(require('$pet_dir/package.json').description||'')}catch(e){}" 2>/dev/null)
  fi
  PET_NAMES+=("$pet_name")
  PET_LABELS+=("$desc")
  i=$((i+1))
done

if [ ${#PET_NAMES[@]} -eq 0 ]; then
  echo -e "${RED}❌ pets/ 目录下没有找到任何宠物${NC}"
  exit 1
fi

# ─── 列出宠物，让用户选 ───
echo ""
echo -e "${BOLD}可用宠物：${NC}"
echo "  0) 全部安装"
for j in "${!PET_NAMES[@]}"; do
  idx=$((j+1))
  echo "  $idx) ${PET_NAMES[$j]}  —  ${PET_LABELS[$j]}"
done
echo ""
echo -e "输入编号（多选用空格分隔，如 1 2），直接回车 = 全部安装："
read -r selections

# 默认全部
if [ -z "$selections" ]; then
  selections="0"
fi

# 解析选择
SELECTED=()
for s in $selections; do
  if [ "$s" = "0" ]; then
    SELECTED=("${PET_NAMES[@]}")
    break
  fi
  if [[ "$s" =~ ^[0-9]+$ ]] && [ "$s" -ge 1 ] && [ "$s" -le "${#PET_NAMES[@]}" ]; then
    SELECTED+=("${PET_NAMES[$((s-1))]}")
  fi
done

if [ ${#SELECTED[@]} -eq 0 ]; then
  echo -e "${RED}没有选择任何宠物，退出。${NC}"
  exit 0
fi

echo ""
echo -e "${CYAN}将安装以下宠物：${NC}"
for pet in "${SELECTED[@]}"; do
  echo "  • $pet"
done
echo ""
echo -e "${YELLOW}是否配置开机自启？[Y/n]${NC}"
read -r do_autostart
DO_AUTOSTART=true
if [[ "$do_autostart" =~ ^[Nn] ]]; then
  DO_AUTOSTART=false
fi

echo ""
echo -e "${YELLOW}是否安装后立即启动？[Y/n]${NC}"
read -r do_launch
DO_LAUNCH=true
if [[ "$do_launch" =~ ^[Nn] ]]; then
  DO_LAUNCH=false
fi

# ═══════════════════════════════════════════════════
# 安装函数
# ═══════════════════════════════════════════════════
install_pet() {
  local pet="$1"
  local pet_path="$PETS_DIR/$pet"
  echo ""
  echo -e "${CYAN}${BOLD}━━━ 安装 $pet ━━━${NC}"

  # npm install
  if [ ! -d "$pet_path/node_modules" ] || [ ! -f "$pet_path/node_modules/.package-lock.json" ]; then
    echo -e "${YELLOW}  📦 安装依赖（electron，首次约 80MB）...${NC}"
    cd "$pet_path" && npm install --no-audit --no-fund 2>&1 | tail -3
    echo -e "${GREEN}  ✓ 依赖安装完成${NC}"
  else
    echo -e "${GREEN}  ✓ 依赖已存在，跳过${NC}"
  fi

  # 开机自启
  if [ "$DO_AUTOSTART" = true ]; then
    setup_autostart "$pet" "$pet_path"
  fi

  # 立即启动
  if [ "$DO_LAUNCH" = true ]; then
    echo -e "${YELLOW}  🚀 启动 $pet...${NC}"
    cd "$pet_path" && nohup ./launch.sh >/dev/null 2>&1 &
    echo -e "${GREEN}  ✓ $pet 已在后台运行${NC}"
  fi
}

# ═══════════════════════════════════════════════════
# 开机自启配置
# ═══════════════════════════════════════════════════
setup_autostart() {
  local pet="$1"
  local pet_path="$2"
  local launch_sh="$pet_path/launch.sh"
  local label="com.alankongx.${pet}-pet"

  case "$(uname -s)" in
    Darwin)
      local plist_dir="$HOME/Library/LaunchAgents"
      local plist_file="$plist_dir/$label.plist"
      mkdir -p "$plist_dir"

      # 先卸载旧的
      launchctl unload "$plist_file" 2>/dev/null || true

      cat > "$plist_file" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${launch_sh}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>/tmp/${pet}-pet.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/${pet}-pet.log</string>
</dict>
</plist>
PLIST
      launchctl load "$plist_file" 2>/dev/null || true
      echo -e "${GREEN}  ✓ 开机自启已配置（macOS LaunchAgent）${NC}"
      ;;
    Linux)
      local autostart_dir="$HOME/.config/autostart"
      mkdir -p "$autostart_dir"
      cat > "$autostart_dir/${pet}-pet.desktop" << DESKTOP
[Desktop Entry]
Type=Application
Name=${pet}-pet
Exec=/bin/bash ${launch_sh}
Terminal=false
DESKTOP
      echo -e "${GREEN}  ✓ 开机自启已配置（Linux .desktop）${NC}"
      ;;
    *)
      echo -e "${YELLOW}  ⚠ 当前系统暂不支持自动配置开机自启，请手动添加${NC}"
      ;;
  esac
}

# ═══════════════════════════════════════════════════
# 执行安装
# ═══════════════════════════════════════════════════
for pet in "${SELECTED[@]}"; do
  install_pet "$pet"
done

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║          ✅ 安装完成！                        ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "已安装的宠物："
for pet in "${SELECTED[@]}"; do
  echo "  • $pet — 启动: cd pets/$pet && ./launch.sh"
  echo "    退出: 右键 → 永远退出 / pkill -f pets/$pet/start.js"
done
echo ""
echo "重新安装/卸载："
echo "  卸载某个宠物: 删除 ~/Library/LaunchAgents/com.alankongx.<name>-pet.plist 并 launchctl unload"
echo "  重新运行安装器: ./install.sh"
