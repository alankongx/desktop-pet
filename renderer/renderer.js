// 大圣喵 - 渲染逻辑：用 CSS 滤镜驱动情绪反馈（不再叠 SVG 表情，避免与原图自带的 LED 表情重叠）
(function() {
  const root = document.getElementById('pet-root');
  const bubble = document.getElementById('speech-bubble');
  const speechText = document.getElementById('speech-text');
  const petImg = document.getElementById('dasheng');

  // ========== 表情图像：双击/开怀时切换真·换脸 ==========
  // 原图 = 沉静 LED 表情；开怀版 = img2img 生成的咧嘴大笑版
  const BASE_IMG  = '../assets/dasheng.png';
  const HAPPY_IMG = '../assets/dasheng-happy.png';
  let usingHappy = false;
  // 预加载开怀版，避免切换瞬间闪白
  const happyPreload = new Image();
  happyPreload.src = HAPPY_IMG;
  function setFace(happy) {
    if (happy === usingHappy) return;
    usingHappy = happy;
    petImg.src = happy ? HAPPY_IMG : BASE_IMG;
  }

  // ========== 三档尺寸切换（小 / 中 / 大）============
  // 中档 = 此前默认大小（112×128 桌宠）。切换时：
  //  - 改 body class 触发 CSS 变量缩放（宠物图 / 气泡 / 窗口一起变）
  //  - 发 IPC 让主进程 setBounds 改窗口尺寸（保右下角不动）
  //  - 保存选择到 config.json（重启保持）
  const SIZE_PRESETS = {
    small:  { winW: 84,  winH: 110, petW: 84,  petH: 96,  bubbleFont: 10, padX: 7,  padY: 2 },
    medium: { winW: 112, winH: 146, petW: 112, petH: 128, bubbleFont: 14, padX: 9,  padY: 3 },
    large:  { winW: 168, winH: 220, petW: 168, petH: 192, bubbleFont: 21, padX: 13, padY: 5 },
  };

  function applySize(name, opts) {
    opts = opts || {};
    const p = SIZE_PRESETS[name];
    if (!p) return;
    // 1) 切换 CSS class（缩放宠物图 + 气泡 + 窗口）
    document.body.className = 'size-' + name;
    // 2) 通知主进程改窗口尺寸（保右下角）
    if (opts.resize !== false && window.petAPI) {
      window.petAPI.setSize(name, p.winW, p.winH);
    }
    // 3) 持久化
    if (opts.save !== false && window.petAPI) {
      window.petAPI.saveSize(name);
    }
  }

  // 接收主进程指令（启动时套用已保存尺寸 / 右键菜单选尺寸）
  if (window.petAPI) {
    window.petAPI.onInitSize((name) => applySize(name, { resize: false, save: false }));
    window.petAPI.onApplySize((name) => applySize(name, { resize: true, save: true }));
  } else {
    // 浏览器预览等无 petAPI 环境：默认中档
    document.body.classList.add('size-medium');
  }

  // 情绪映射：mood-xxx class 触发 CSS 滤镜
  const moods = {
    default:  null,
    happy:    'mood-happy',
    thinking: 'mood-thinking',
    angry:    'mood-angry',
    sleeping: 'mood-sleeping',
  };

  let currentMood = null;
  let moodTimer = null;

  function setMood(name, durationMs = 0) {
    Object.values(moods).forEach(cls => { if (cls) root.classList.remove(cls); });
    const cls = moods[name];
    if (cls) {
      root.classList.add(cls);
      currentMood = name;
    } else {
      currentMood = 'default';
    }
    setFace(name === 'happy');   // 开怀换脸，其余表情用原图 + CSS 滤镜
    clearTimeout(moodTimer);
    if (durationMs > 0) {
      moodTimer = setTimeout(() => {
        Object.values(moods).forEach(c => { if (c) root.classList.remove(c); });
        currentMood = 'default';
        setFace(false);   // 恢复沉静表情
      }, durationMs);
    }
  }

  // ========== 话术气泡：默认常驻显示，不再自动隐藏 ==========
  // 改前：showSpeech 会 3 秒后自动 add('hidden')，老板容易错过
  // 改后：气泡默认可见，仅切换文字；不再自动隐藏
  let bubbleHideTimer = null;
  function setSpeech(text, autoHideMs = 0) {
    speechText.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(bubbleHideTimer);
    if (autoHideMs > 0) {
      bubbleHideTimer = setTimeout(() => {
        bubble.classList.add('hidden');
      }, autoHideMs);
    }
  }

  const phrases = {
    greeting: ['俺老孙来也！','老板，俺想你了~','今天也来助阵！','七十二变随叫随到','俺老孙护你周全'],
    happy:    ['嘿嘿嘿！舒坦！','打完怪了，给我肉！','筋斗云已待命','老板最棒！','一个筋斗十万八千里~'],
    thinking: ['佛祖让俺想想…','容俺掐指一算…','嗯？此中有蹊跷','待俺回忆九九八十一难…','妖怪何在！'],
    angry:    ['呔！休得放肆！','尔等何方妖孽','俺老孙可不是好惹的','吃俺一棒！','老板被欺负了？'],
    sleeping: ['俺老孙困了…','Zzz…别吵…','梦中取经中…','等我打个盹儿'],
    work:     ['干活儿干活儿~','任务多？俺老孙单挑！','今天也要双休哦','搬砖顺利！'],
    idle:     ['盯着你不许偷懒！','老板来杯咖啡？','俺的紧箍咒是不是紧了','嘿，吃俺一棒！','耳朵好听声音~','老板今天很帅！'],
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ========== 单击 / 双击 / 三击 ==========
  let clickCount = 0;
  let clickTimer = null;
  let lastClickTime = 0;

  document.body.addEventListener('click', () => {
    // v10：拖拽中触发的 click 不算（避免拖完误触发言）
    if (didDrag) return;
    const now = Date.now();
    if (clickCount >= 2 && now - lastClickTime < 600) {
      clickCount = 0;
      clearTimeout(clickTimer);
      doHideAndReturn();
      return;
    }
    clickCount++;
    lastClickTime = now;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
      if (clickCount === 1) {
        const grp = ['greeting', 'happy', 'thinking', 'work'][Math.floor(Math.random() * 4)];
        setSpeech(pick(phrases[grp]));  // 常驻，不自动隐藏
        if (grp === 'happy') setMood('happy', 2800);
        else if (grp === 'thinking') setMood('thinking', 2800);
      } else if (clickCount === 2) {
        if (currentMood === 'happy') {
          setMood('default');
          setSpeech('正襟危坐！');
        } else {
          setMood('happy', 3500);
          setSpeech('好嗨哟！');
        }
      }
      clickCount = 0;
    }, 300);
  });

  // 三击：藏身 + 5秒回归
  function doHideAndReturn() {
    setSpeech('俺老孙去也！');
    root.classList.add('hidden-pet');
    setMood('sleeping');
    setTimeout(() => {
      root.classList.remove('hidden-pet');
      setMood('happy', 2500);
      setSpeech('俺老孙又回来了！');
    }, 5000);
  }

  // ========== 手动拖窗口（替代 CSS -webkit-app-region: drag）
  // v10：之前用 CSS drag region 被 OS 吞掉 click，现在手动移动窗口
  // 仅在 Electron 环境（window.petAPI 存在）启用
  let dragStartX = 0, dragStartY = 0;
  let isDragging = false;
  let didDrag = false;  // 标记本次按下是否实际拖动过，决定 click 是否触发

  function onDragMove(e) {
    if (!isDragging) return;
    const dx = e.screenX - dragStartX;
    const dy = e.screenY - dragStartY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      didDrag = true;
      if (window.petAPI) window.petAPI.moveBy(dx, dy);
      dragStartX = e.screenX;
      dragStartY = e.screenY;
    }
  }
  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    root.classList.remove('dragging');
    // 100ms 后清除 didDrag，确保 click 事件已经处理完
    setTimeout(() => { didDrag = false; }, 100);
  }
  function onDragStart(e) {
    // 仅响应主键（左键）
    if (e.button !== 0) return;
    isDragging = true;
    didDrag = false;
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    root.classList.add('dragging');
  }

  document.body.addEventListener('mousedown', onDragStart);
  document.body.addEventListener('mousemove', onDragMove);
  document.body.addEventListener('mouseup', onDragEnd);

  // ========== 待机动作：40~80秒随机一次 ==========
  function scheduleIdle() {
    const next = 40000 + Math.random() * 40000;
    setTimeout(() => {
      const actions = [
        () => { setMood('thinking', 3500); setSpeech(pick(phrases.thinking)); },
        () => { setMood('happy', 3500);    setSpeech(pick(phrases.happy)); },
        () => {                              setSpeech(pick(phrases.idle)); },
        () => { setMood('angry', 1500);   setSpeech(pick(phrases.angry)); },
        () => { setMood('sleeping', 3000); setSpeech(pick(phrases.sleeping)); },
      ];
      actions[Math.floor(Math.random() * actions.length)]();
      scheduleIdle();
    }, next);
  }
  setTimeout(scheduleIdle, 30000);

  // ========== 初始欢迎 ==========
  // 气泡已默认显示"俺老孙在此！"，无需额外 trigger
  // 仅做一次 bounce 吸引注意
  setTimeout(() => {
    root.classList.add('attention');
    setTimeout(() => root.classList.remove('attention'), 1000);
  }, 800);
})();