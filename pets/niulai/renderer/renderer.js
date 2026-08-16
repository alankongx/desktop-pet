// 牛来 - 渲染逻辑：7 态图片切换 + 情绪滤镜驱动
// 人设：Q版金牛宝宝，金棕色圆胖身体，小金角，红围巾（中国股市红涨），
//       代表"希望牛市早点来"，乐观积极、打气加油、盼涨盼红
// 原则：台词永不出现"亏/赔/完/割肉"等晦气词，即便摆烂无语也用幽默乐观表达
(function() {
  const root = document.getElementById('pet-root');
  const bubble = document.getElementById('speech-bubble');
  const speechText = document.getElementById('speech-text');
  const petImg = document.getElementById('niulai');

  // ========== 7 态图像 ==========
  // anzhong  暗中观察（默认）  shangtou  上头了    bailan  摆烂
  // wuyu     无语              kaibai    开摆      fafeng  发疯
  // nishuode 你说的
  const IMGS = {
    anzhong:  '../assets/anzhong.png',
    shangtou: '../assets/shangtou.png',
    bailan:   '../assets/bailan.png',
    wuyu:     '../assets/wuyu.png',
    kaibai:   '../assets/kaibai.png',
    fafeng:   '../assets/fafeng.png',
    nishuode: '../assets/nishuode.png',
  };
  Object.values(IMGS).forEach((src) => { const i = new Image(); i.src = src; });

  let currentImgKey = 'anzhong';
  function setImg(key) {
    if (key === currentImgKey) return;
    currentImgKey = key;
    petImg.src = IMGS[key];
  }

  // ========== 三档尺寸切换 ==========
  const SIZE_PRESETS = {
    small:  { winW: 120, winH: 152,  petH: 96,  bubbleFont: 10, padX: 7,  padY: 2 },
    medium: { winW: 160, winH: 214,  petH: 128, bubbleFont: 14, padX: 9,  padY: 3 },
    large:  { winW: 235, winH: 322,  petH: 192, bubbleFont: 21, padX: 13, padY: 5 },
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

  // ========== 情绪 → (CSS class, 图像) ==========
  // 每个状态对应自己的图和滤镜
  const moods = {
    anzhong:  { cls: 'mood-anzhong',  img: 'anzhong'  },
    shangtou: { cls: 'mood-shangtou', img: 'shangtou' },
    bailan:   { cls: 'mood-bailan',   img: 'bailan'   },
    wuyu:     { cls: 'mood-wuyu',     img: 'wuyu'     },
    kaibai:   { cls: 'mood-kaibai',   img: 'kaibai'   },
    fafeng:   { cls: 'mood-fafeng',   img: 'fafeng'   },
    nishuode: { cls: 'mood-nishuode', img: 'nishuode' },
  };
  const ALL_STATES = ['anzhong', 'shangtou', 'bailan', 'wuyu', 'kaibai', 'fafeng', 'nishuode'];

  let currentMood = 'anzhong';
  let moodTimer = null;

  function setMood(name, durationMs) {
    durationMs = durationMs || 0;
    ALL_STATES.forEach(function(k) { root.classList.remove(moods[k].cls); });
    var m = moods[name] || moods.anzhong;
    root.classList.add(m.cls);
    currentMood = name;
    setImg(m.img);
    clearTimeout(moodTimer);
    if (durationMs > 0) {
      moodTimer = setTimeout(function() {
        ALL_STATES.forEach(function(k) { root.classList.remove(moods[k].cls); });
        root.classList.add(moods.anzhong.cls);
        currentMood = 'anzhong';
        setImg('anzhong');
      }, durationMs);
    }
  }

  // ========== 话术气泡：常驻显示，仅切换文字 ==========
  let bubbleHideTimer = null;
  function setSpeech(text, autoHideMs) {
    speechText.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(bubbleHideTimer);
    if (autoHideMs && autoHideMs > 0) {
      bubbleHideTimer = setTimeout(function() { bubble.classList.add('hidden'); }, autoHideMs);
    }
  }

  // ========== 台词：牛来主题（盼牛市、红涨、打气加油）
  // 原则：绝不出现 亏/赔/完/割肉/爆仓/跌 等晦气词
  // 即便摆烂无语也是幽默乐观，牛永远在路上 ==========
  var phrases = {
    anzhong: [
      '暗中观察…主力在吸筹',
      '别急，等右侧信号',
      '这量能配合…有戏',
      '暗中盯盘，大资金在干活',
      '我在观察，牛快来了',
    ],
    shangtou: [
      '上头了上头了！满仓干！',
      '冲冲冲！今天必涨停！',
      '涨停板排队去了！',
      '脑子一热，又加仓了',
      '上头！不管了，全仓！',
    ],
    bailan: [
      '摆烂了…今天先不看盘',
      '躺平了…让牛自己来',
      '不看了不看了，越看越急',
      '摆烂中…牛来了叫我',
      '先歇会，牛在路上呢',
    ],
    wuyu: [
      '无语…说好的牛呢',
      '这行情…我竟无言以对',
      '……先信着牛吧',
      '无语，主力又在洗盘',
      '我能说什么呢，等牛来呗',
    ],
    kaibai: [
      '开摆开摆！今天我是股神！',
      '红红火火！收盘去消费！',
      '满仓红！开摆！',
      '今天必须请客！',
      '牛来了牛来了！开摆！',
    ],
    fafeng: [
      '涨了涨了涨了！！！',
      '疯了疯了！连续涨停！',
      '啊啊啊啊啊！牛市真来了！',
      '满屏红！我要疯了！',
      '牛市已到！疯了疯了！',
    ],
    nishuode: [
      '你说的都对，但我还是要满仓',
      '你说的…那我补仓咯？',
      '你说的对，牛迟早会来',
      '你说的…我听着呢',
      '你说的都对，所以我信牛',
    ],
    // 通用问候
    greeting: [
      '牛来！牛市快来了！',
      '红红红，涨涨涨！',
      '牛市在路上，稳住！',
      '牛气冲天，老板好！',
      '耐心等牛来，总会来的',
    ],
    // 待机碎碎念（随机混搭）
    idle: [
      '老板，今天大盘红了吗？',
      '别看了，越看越急',
      '定投不要停，牛会来的',
      '牛市迟早来，稳住能赢',
      '红围巾戴上，牛气就来了',
      'A股脊梁挺起来！',
      '牛来牛来牛来牛来！',
      '信牛哥，得永生',
      '耐心是牛市最好的朋友',
      '牛在路上，快到了',
    ],
  };
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickState() { return ALL_STATES[Math.floor(Math.random() * ALL_STATES.length)]; }

  // ========== 单击 / 双击 / 三击 ==========
  var clickCount = 0;
  var clickTimer = null;
  var lastClickTime = 0;
  var didDrag = false;

  document.body.addEventListener('click', function() {
    if (didDrag) return;
    var now = Date.now();
    if (clickCount >= 2 && now - lastClickTime < 600) {
      clickCount = 0;
      clearTimeout(clickTimer);
      doHideAndReturn();
      return;
    }
    clickCount++;
    lastClickTime = now;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function() {
      if (clickCount === 1) {
        // 单击：随机切一个状态 + 对应台词
        var state = pickState();
        setMood(state, 3500);
        setSpeech(pick(phrases[state] || phrases.idle));
      } else if (clickCount === 2) {
        // 双击：循环切换到下一个状态
        var idx = ALL_STATES.indexOf(currentMood);
        var next = ALL_STATES[(idx + 1) % ALL_STATES.length];
        setMood(next, 0);
        setSpeech(pick(phrases[next] || phrases.idle));
      }
      clickCount = 0;
    }, 300);
  });

  // 三击：先摆烂歇会儿，5 秒后发疯回归
  function doHideAndReturn() {
    setMood('bailan');
    setSpeech('先摆烂一会…牛来了叫我');
    root.classList.add('hidden-pet');
    setTimeout(function() {
      root.classList.remove('hidden-pet');
      setMood('fafeng', 2500);
      setSpeech('牛来了牛来了！！冲冲冲！');
    }, 5000);
  }

  // ========== 手动拖窗口 ==========
  var dragStartX = 0, dragStartY = 0;
  var isDragging = false;

  function onDragMove(e) {
    if (!isDragging) return;
    var dx = e.screenX - dragStartX;
    var dy = e.screenY - dragStartY;
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
    setTimeout(function() { didDrag = false; }, 100);
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
    var next = 40000 + Math.random() * 40000;
    setTimeout(function() {
      var r = Math.random();
      if (r < 0.45) {
        // 45%：随机切一个表情态 + 对应台词
        var state = pickState();
        setMood(state, 3500);
        setSpeech(pick(phrases[state] || phrases.idle));
      } else if (r < 0.70) {
        // 25%：保持暗中观察 + 碎碎念
        setMood('anzhong', 0);
        setSpeech(pick(phrases.idle));
      } else if (r < 0.85) {
        // 15%：突然上头
        setMood('shangtou', 3000);
        setSpeech(pick(phrases.shangtou));
      } else {
        // 15%：直接开摆
        setMood('kaibai', 3000);
        setSpeech(pick(phrases.kaibai));
      }
      scheduleIdle();
    }, next);
  }
  setTimeout(scheduleIdle, 30000);

  // ========== 初始欢迎 ==========
  setTimeout(function() {
    root.classList.add('attention');
    setTimeout(function() { root.classList.remove('attention'); }, 1000);
  }, 800);
})();
