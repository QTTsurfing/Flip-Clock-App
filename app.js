'use strict';

/* ============ 纯逻辑（浏览器与 Node 测试共用） ============ */

// 返回显示序列，如 23:05 -> [2,3,':',0,5]；带秒时 -> [2,3,':',0,5,':',4,2]
function formatTime(date, opts) {
  opts = opts || {};
  var h = date.getHours();
  var m = date.getMinutes();
  var s = date.getSeconds();
  if (opts.hour12) h = h % 12 || 12; // 23点->11，0点->12
  var out = [Math.floor(h / 10), h % 10, ':', Math.floor(m / 10), m % 10];
  if (opts.showSeconds) out.push(':', Math.floor(s / 10), s % 10);
  return out;
}

// 返回需要翻页的数字位下标（冒号位不翻）
function shouldFlip(prev, next) {
  var out = [];
  var n = Math.max(prev.length, next.length);
  for (var i = 0; i < n; i++) {
    var a = prev[i];
    var b = next[i];
    if (a === b) continue;
    if (typeof a === 'number' || typeof b === 'number') out.push(i);
  }
  return out;
}

var SETTING_DEFAULTS = { hour12: true, showSeconds: false, dim: 1, flaps: true, scale: 1 };

// 从 storage（如 localStorage）读取设置；缺失项用默认值
function loadSettings(storage) {
  var s = {};
  Object.keys(SETTING_DEFAULTS).forEach(function (k) {
    var raw = null;
    try { raw = storage.getItem('flipclock.' + k); } catch (e) { /* 忽略 */ }
    s[k] = raw === null ? SETTING_DEFAULTS[k] : JSON.parse(raw);
  });
  return s;
}

// 把设置写入 storage
function saveSettings(storage, settings) {
  Object.keys(settings).forEach(function (k) {
    try { storage.setItem('flipclock.' + k, JSON.stringify(settings[k])); } catch (e) { /* 忽略 */ }
  });
}

/* ============ 浏览器部分 ============ */

if (typeof document !== 'undefined') {
  init();
}

function init() {
  var clockEl = document.getElementById('clock');
  var settings = loadSettings(localStorage);
  var cards = {};
  var wakeTimer = null;
  var firstRender = true;

  var q = new URLSearchParams(location.search);
  var tParam = q.get('t');          // 验收用：?t=HH:MM[:SS] 从指定时间开始正常走时
  var demo = q.get('demo') === '1'; // 验收用：?demo=1 演示一次翻页（12:01 -> 12:02）
  var fakeDate = null;
  if (tParam) {
    var parts = tParam.split(':').map(Number);
    fakeDate = new Date();
    fakeDate.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
  }

  function currentTime() {
    return fakeDate ? new Date(fakeDate.getTime()) : new Date();
  }

  function nowDate() {
    var d = currentTime();
    if (fakeDate) fakeDate.setSeconds(fakeDate.getSeconds() + 1);
    return d;
  }

  buildClock();
  applySettings();

  if (demo) {
    document.body.classList.add('slow');
    var d0 = new Date(); d0.setHours(12, 1, 0, 0);
    var d1 = new Date(); d1.setHours(12, 2, 0, 0);
    render(d0);
    setTimeout(function () { render(d1); }, 300);
    return; // 演示模式不走常规走时
  }

  function buildClock() {
    clockEl.innerHTML = '';
    cards = {};
    var groups = [
      { type: 'unit', pos: ['h0', 'h1'], cls: '' },
      { type: 'colon', pos: 'c1', cls: '' },
      { type: 'unit', pos: ['m0', 'm1'], cls: '' },
      { type: 'colon', pos: 'c2', cls: 'sec-colon' },
      { type: 'unit', pos: ['s0', 's1'], cls: 'sec-unit' }
    ];
    groups.forEach(function (g) {
      if (g.type === 'colon') {
        var c = document.createElement('div');
        c.className = 'colon ' + g.cls;
        c.textContent = ':';
        clockEl.appendChild(c);
        return;
      }
      var u = document.createElement('div');
      u.className = 'unit ' + g.cls;
      g.pos.forEach(function (p) {
        var d = document.createElement('div');
        d.className = 'digit';
        d.innerHTML = '<div class="card">' +
          '<div class="top"><span class="num"></span></div>' +
          '<div class="bottom"><span class="num"></span></div>' +
          '<div class="fold-top"><span class="num"></span></div>' +
          '<div class="fold-bottom"><span class="num"></span></div>' +
          '</div>';
        u.appendChild(d);
        cards[p] = {
          card: d.querySelector('.card'),
          top: d.querySelector('.top .num'),
          bottom: d.querySelector('.bottom .num'),
          foldTop: d.querySelector('.fold-top .num'),
          foldBottom: d.querySelector('.fold-bottom .num'),
          last: null
        };
      });
      clockEl.appendChild(u);
    });
  }

  function render(now) {
    var seq = formatTime(now, { hour12: settings.hour12, showSeconds: settings.showSeconds });
    // 无障碍：让屏幕阅读器能读到当前时间
    var label = '' + seq[0] + seq[1] + ':' + seq[3] + seq[4];
    if (settings.showSeconds) label += ':' + seq[6] + seq[7];
    clockEl.setAttribute('aria-label', '当前时间 ' + label);
    var map = { h0: 0, h1: 1, m0: 3, m1: 4, s0: 6, s1: 7 };
    Object.keys(map).forEach(function (pos) {
      var card = cards[pos];
      if (!card) return;
      var v = seq[map[pos]] == null ? '' : String(seq[map[pos]]);
      if (settings.flaps && !firstRender) {
        updateCard(card, v);
      } else {
        // 首次渲染直接铺数字（不翻页），隐藏挡板时也直接铺
        card.top.textContent = v;
        card.bottom.textContent = v;
        card.last = v;
        card.card.classList.remove('flipping');
      }
    });
    firstRender = false;
  }

  function updateCard(card, newDigit) {
    if (card.last === newDigit) return;
    card.last = newDigit;
    // 系统开启「减弱动态效果」：两半直接换字，不播动画
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      card.top.textContent = newDigit;
      card.bottom.textContent = newDigit;
      card.card.classList.remove('flipping');
      return;
    }
    // 静态半片直接切到新值；旧值由旋转层（上挡板）带下去，
    // 挡板翻落的同时，新值上半自然露出，不再有"旧数字滞留"的延迟感
    var oldDigit = card.top.textContent;
    card.top.textContent = newDigit;
    card.bottom.textContent = newDigit;
    card.foldTop.textContent = oldDigit;             // 旧值
    card.foldBottom.textContent = newDigit;          // 新值
    card.card.classList.remove('flipping');
    void card.card.offsetWidth;          // 重启动画
    card.card.classList.add('flipping');
    clearTimeout(card.timer);
    // 演示慢速模式（body.slow）时动画总长约 3.1s；正常模式约 0.5s
    var flipMs = document.body.classList.contains('slow') ? 3200 : 540;
    card.timer = setTimeout(function () {
      card.card.classList.remove('flipping');
    }, flipMs);
  }

  var tickTimer = null;

  function tick() {
    render(nowDate());
    scheduleNext();
  }

  // 对齐真实边界：秒显时每秒翻、否则每分翻；在边界后约 15ms 触发，
  // 避免轮询导致的"翻页比真实时间晚"的延迟感
  function scheduleNext() {
    clearTimeout(tickTimer);
    var now = currentTime();
    var interval = settings.showSeconds ? 1000 : 60000;
    var delay = interval - now.getMilliseconds() + 15;
    if (delay < 5) delay = 5;
    tickTimer = setTimeout(tick, delay);
  }

  function start() {
    render(nowDate());
    scheduleNext();
  }

  /* ---------- 设置 ---------- */

  function applySettings() {
    document.body.classList.toggle('show-seconds', !!settings.showSeconds);
    document.body.classList.toggle('no-flaps', !settings.flaps);
    document.getElementById('dimOverlay').style.opacity = String(1 - settings.dim);
    document.documentElement.style.setProperty('--scale', settings.scale);

    var hour12Btn = document.getElementById('hour12Btn');
    var secBtn = document.getElementById('secBtn');
    var flapsBtn = document.getElementById('flapsBtn');
    hour12Btn.textContent = settings.hour12 ? '开' : '关';
    hour12Btn.classList.toggle('on', !!settings.hour12);
    hour12Btn.setAttribute('aria-pressed', settings.hour12 ? 'true' : 'false');
    secBtn.textContent = settings.showSeconds ? '开' : '关';
    secBtn.classList.toggle('on', !!settings.showSeconds);
    secBtn.setAttribute('aria-pressed', settings.showSeconds ? 'true' : 'false');
    flapsBtn.textContent = settings.flaps ? '开' : '关';
    flapsBtn.classList.toggle('on', !!settings.flaps);
    flapsBtn.setAttribute('aria-pressed', settings.flaps ? 'true' : 'false');
    document.getElementById('dimRange').value = Math.round(settings.dim * 100);
    document.getElementById('dimVal').textContent = Math.round(settings.dim * 100) + '%';
    document.getElementById('scaleRange').value = Math.round(settings.scale * 100);
    document.getElementById('scaleVal').textContent = Math.round(settings.scale * 100) + '%';
  }

  function set(key, value) {
    settings[key] = value;
    saveSettings(localStorage, settings);
    applySettings();
    render(nowDate());
    scheduleNext(); // 设置变化后重新对齐翻页边界（如切换秒显）
  }

  var panel = document.getElementById('settingsPanel');
  document.getElementById('gearBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
  });
  document.getElementById('closeSettings').addEventListener('click', function () {
    panel.hidden = true;
  });
  document.getElementById('hour12Btn').addEventListener('click', function () {
    set('hour12', !settings.hour12);
  });
  document.getElementById('secBtn').addEventListener('click', function () {
    set('showSeconds', !settings.showSeconds);
  });
  document.getElementById('flapsBtn').addEventListener('click', function () {
    set('flaps', !settings.flaps);
  });
  document.getElementById('dimRange').addEventListener('input', function (e) {
    set('dim', Number(e.target.value) / 100);
  });
  document.getElementById('scaleRange').addEventListener('input', function (e) {
    set('scale', Number(e.target.value) / 100);
  });

  // 点屏幕（非设置区、非齿轮）切换秒显
  document.addEventListener('click', function (e) {
    if (e.target.closest('.settings') || e.target.closest('.gear')) return;
    // 面板开着时，点面板外空白处先关闭面板（不切换秒显）
    if (!panel.hidden) {
      panel.hidden = true;
      return;
    }
    set('showSeconds', !settings.showSeconds);
  });

  /* ---------- 防息屏（Wake Lock） ---------- */

  function showHint(msg) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(function () { toast.hidden = true; }, 8000);
  }

  function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      showHint('此设备不支持网页防息屏，请在系统设置把「自动锁定」设为「永不」');
      return;
    }
    navigator.wakeLock.request('screen').then(function (wl) {
      wl.addEventListener('release', function () {});
    }).catch(function () {
      showHint('防息屏失败：请在 设置→显示与亮度→自动锁定 选择「永不」');
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') requestWakeLock();
  });

  /* ---------- 启动 ---------- */

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  requestWakeLock();
  start();
}

/* ============ Node 导出（供 test.js 引用） ============ */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatTime: formatTime,
    shouldFlip: shouldFlip,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    SETTING_DEFAULTS: SETTING_DEFAULTS
  };
}
