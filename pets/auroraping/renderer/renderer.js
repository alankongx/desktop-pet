// 极光萌可 - 渲染逻辑：4 态图片切换 + 情绪滤镜驱动
// 人设：《奇妙萌可之闪耀流星》传奇萌可，代表元素「承诺」，法器金色弓箭，
//       掌控极光、镇压黑洞、守护宇宙星星村，与王子萌可一年一见终成眷属
(function() {
  const root = document.getElementById('pet-root');
  const bubble = document.getElementById('speech-bubble');
  const speechText = document.getElementById('speech-text');
  const petImg = document.getElementById('aurora');

  // ========== 4 态图像 ==========
  // calm = 沉静默认 / wave = 打招呼 / excited = 极光绽放 / fly = 展翅翱翔
  const IMGS = {
    calm:     '../assets/calm.png',
    wave:     '../assets/wave.png',
    excited:  '../assets/excited.png',
    fly:      '../assets/fly.png',
  };
  // 预加载全部状态图，避免切换闪白
  Object.values(IMGS).forEach((src) => { const i = new Image(); i.src = src; });

  let currentImgKey = 'calm';
  function setImg(key) {
    if (key === currentImgKey) return;
    currentImgKey = key;
    petImg.src = IMGS[key];
  }

  // ========== 三档尺寸切换（小 / 中 / 大）============
  // 按高度统一缩放：winW 取最宽的 fly 图（高宽比 1.44）+ 余量，
  // 保证带翅膀的状态不被压小、角色身高与站姿一致
  const SIZE_PRESETS = {
    small:  { winW: 148, winH: 156, petH: 96,  bubbleFont: 10, padX: 7,  padY: 2 },
    medium: { winW: 192, winH: 218, petH: 128, bubbleFont: 14, padX: 9,  padY: 3 },
    large:  { winW: 286, winH: 332, petH: 192, bubbleFont: 21, padX: 13, padY: 5 },
  };

  function applySize(name, opts) {
    opts = opts || {};
    const p = SIZE_PRESETS[name];
    if (!p) return;
    document.body.className = 'size-' + name;
    if (opts.resize !== false && window.petAPI) {
      window.petAPI.setSize(name, p.winW, p.winH);
    }
    if (opts.save !== false && window.petAPI) {
      window.petAPI.saveSize(name);
    }
  }

  if (window.petAPI) {
    window.petAPI.onInitSize((name) => applySize(name, { resize: false, save: false }));
    window.petAPI.onApplySize((name) => applySize(name, { resize: true, save: true }));
  } else {
    document.body.classList.add('size-medium');
  }

  // 情绪 → (CSS class, 图像)
  const moods = {
    default:  { cls: null,        img: 'calm'    },
    happy:    { cls: 'mood-happy',    img: 'excited' },
    fly:      { cls: 'mood-fly',      img: 'fly'     },
    thinking: { cls: 'mood-thinking', img: 'calm'    },
    angry:    { cls: 'mood-angry',    img: 'excited' },
    sleeping: { cls: 'mood-sleeping', img: 'calm'    },
  };

  let currentMood = 'default';
  let moodTimer = null;

  function setMood(name, durationMs = 0) {
    Object.entries(moods).forEach(([, v]) => { if (v.cls) root.classList.remove(v.cls); });
    const m = moods[name] || moods.default;
    if (m.cls) root.classList.add(m.cls);
    currentMood = name;
    setImg(m.img);
    clearTimeout(moodTimer);
    if (durationMs > 0) {
      moodTimer = setTimeout(() => {
        Object.entries(moods).forEach(([, v]) => { if (v.cls) root.classList.remove(v.cls); });
        currentMood = 'default';
        setImg('calm');
      }, durationMs);
    }
  }

  // ========== 话术气泡：常驻显示，仅切换文字 ==========
  let bubbleHideTimer = null;
  function setSpeech(text, autoHideMs = 0) {
    speechText.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(bubbleHideTimer);
    if (autoHideMs > 0) {
      bubbleHideTimer = setTimeout(() => bubble.classList.add('hidden'), autoHideMs);
    }
  }

  // ========== 台词：按极光萌可剧情与人设编写 ==========
  // 元素：承诺/约定 · 金色弓箭 · 极光 · 宇宙星星村 · 王子萌可 · 跨年庆典 · 黑洞
  const phrases = {
    greeting: ['极光萌可，前来赴约！','守护宇宙，也守护老板～','我们的约定，我一直记着','星星村今天也很和平哦','一年一见的约定，最珍贵了'],
    happy:    ['这就是极光的魔力～✨','信守约定的人最棒了！','星星都在为你闪烁！','约定达成，极光绽放！','今天的心情像极光一样亮！'],
    fly:      ['张开翅膀，翱翔宇宙～','极光之力，全速前进！','老板要一起飞吗？','去找那颗黄色星星坐坐吧','宇宙的风景，最好看了'],
    thinking: ['让极光之力算一算…','星星的轨迹藏着玄机…','嗯…黑洞不会再来了吧','答应过的事，一定算数…','王子现在在做什么呢…'],
    angry:    ['违背约定是不可以的！','极光也会生气的哦','哼，说话不算数的小气鬼！','再这样，我要拉弓了！'],
    sleeping: ['在星星的怀抱里…Zzz','守护宇宙…也好累呀…','梦里见到王子了…','极光…也要休息…'],
    work:     ['搬砖也要优雅地搬～','约定好的工作，我会完成','极光照亮老板的桌子✨','一起加油，不许偷懒！'],
    idle:     ['老板，抬头看看星星吧','极光出现时，愿望会实现哦','今天的宇宙很安静呢','跨年庆典…想再参加一次','老板也要信守约定哦','星星村有新来信吗？','黑洞要是敢来，就射它！'],
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ========== 单击 / 双击 / 三击 ==========
  let clickCount = 0;
  let clickTimer = null;
  let lastClickTime = 0;

  document.body.addEventListener('click', () => {
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
        const grp = ['greeting', 'happy', 'fly', 'work'][Math.floor(Math.random() * 4)];
        setSpeech(pick(phrases[grp]));
        if (grp === 'happy') setMood('happy', 2800);
        else if (grp === 'fly') setMood('fly', 2800);
      } else if (clickCount === 2) {
        if (currentMood === 'happy') {
          setMood('default');
          setSpeech('收起极光，恢复平静～');
        } else {
          setMood('happy', 3500);
          setSpeech('极光，绽放！');
        }
      }
      clickCount = 0;
    }, 300);
  });

  // 三击：回星星村 + 5 秒回归
  function doHideAndReturn() {
    setSpeech('我先回星星村一趟～');
    root.classList.add('hidden-pet');
    setMood('sleeping');
    setTimeout(() => {
      root.classList.remove('hidden-pet');
      setMood('fly', 2500);
      setSpeech('极光萌可回来了！');
    }, 5000);
  }

  // ========== 手动拖窗口（替代 CSS drag，不吞 click） ==========
  let dragStartX = 0, dragStartY = 0;
  let isDragging = false;
  let didDrag = false;

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
    setTimeout(() => { didDrag = false; }, 100);
  }
  function onDragStart(e) {
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

  // ========== 待机动作：40~80 秒随机一次 ==========
  function scheduleIdle() {
    const next = 40000 + Math.random() * 40000;
    setTimeout(() => {
      const actions = [
        () => { setMood('thinking', 3500); setSpeech(pick(phrases.thinking)); },
        () => { setMood('happy', 3500);    setSpeech(pick(phrases.happy)); },
        () => { setMood('fly', 3500);      setSpeech(pick(phrases.fly)); },
        () => {                            setSpeech(pick(phrases.idle)); },
        () => { setMood('angry', 1500);    setSpeech(pick(phrases.angry)); },
        () => { setMood('sleeping', 3000); setSpeech(pick(phrases.sleeping)); },
      ];
      actions[Math.floor(Math.random() * actions.length)]();
      scheduleIdle();
    }, next);
  }
  setTimeout(scheduleIdle, 30000);

  // ========== 初始欢迎：bounce 一次吸引注意 ==========
  setTimeout(() => {
    root.classList.add('attention');
    setTimeout(() => root.classList.remove('attention'), 1000);
  }, 800);
})();
