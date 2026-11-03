(() => {
  'use strict';

  const COUNT = 4;
  const STORAGE_KEY = 'stopwatch4.v1';
  const WAKE_KEY = 'stopwatch4.wake';

  const blank = (i) => ({
    name: '碼表 ' + (i + 1),
    running: false,
    startedAt: 0,   // 開始計時的時間點（Date.now）
    base: 0,        // 暫停前已累積的毫秒數
    laps: []        // 每次分圈當下的累計毫秒數
  });

  /* ---------- 狀態存取（關閉頁面後仍會保留） ---------- */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.watches) && raw.watches.length === COUNT) {
        return raw.watches.map((w, i) => Object.assign(blank(i), w, {
          laps: Array.isArray(w.laps) ? w.laps : []
        }));
      }
    } catch (e) { /* 忽略 */ }
    return Array.from({ length: COUNT }, (_, i) => blank(i));
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ watches: state })); } catch (e) { /* 忽略 */ }
  }

  let state = load();

  const elapsed = (w, now = Date.now()) =>
    Math.max(0, w.running ? w.base + (now - w.startedAt) : w.base);

  /* ---------- 時間格式 ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function fmt(ms) {
    ms = Math.max(0, Math.floor(ms));
    const cs = Math.floor(ms / 10) % 100;
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000);
    return (h > 0 ? h + ':' + pad(m) : pad(m)) + ':' + pad(s) + '.' + pad(cs);
  }

  /* ---------- 建立畫面 ---------- */
  const grid = document.getElementById('grid');
  const cards = [];

  state.forEach((w, i) => {
    const el = document.createElement('section');
    el.className = 'card';
    el.dataset.i = i;
    el.innerHTML =
      '<div class="card-head">' +
        '<input class="name" maxlength="20" aria-label="碼表名稱">' +
        '<span class="badge">待機</span>' +
      '</div>' +
      '<div class="time">00:00.00</div>' +
      '<div class="split">本圈 00:00.00</div>' +
      '<div class="btns">' +
        '<button type="button" class="btn-main" data-act="toggle">開始</button>' +
        '<button type="button" data-act="lap">分圈</button>' +
        '<button type="button" data-act="reset">重設</button>' +
      '</div>' +
      '<ol class="laps"></ol>';
    grid.appendChild(el);

    const q = (s) => el.querySelector(s);
    const c = {
      el,
      name: q('.name'),
      badge: q('.badge'),
      time: q('.time'),
      split: q('.split'),
      main: q('.btn-main'),
      lap: q('[data-act="lap"]'),
      reset: q('[data-act="reset"]'),
      laps: q('.laps'),
      lastText: ''
    };
    c.name.value = w.name;
    cards.push(c);
  });

  /* ---------- 繪製 ---------- */
  function renderLaps(i) {
    const w = state[i];
    const list = cards[i].laps;
    list.textContent = '';

    if (w.laps.length === 0) {
      const li = document.createElement('li');
      li.className = 'laps-empty';
      li.style.display = 'block';
      li.textContent = '尚無分圈紀錄';
      list.appendChild(li);
      return;
    }

    const lapTimes = w.laps.map((t, k) => t - (k > 0 ? w.laps[k - 1] : 0));
    let best = -1, worst = -1;
    if (lapTimes.length >= 3) {
      best = lapTimes.indexOf(Math.min(...lapTimes));
      worst = lapTimes.indexOf(Math.max(...lapTimes));
    }

    // 最新的一圈放最上面
    for (let k = w.laps.length - 1; k >= 0; k--) {
      const li = document.createElement('li');
      if (k === best) li.className = 'best';
      else if (k === worst) li.className = 'worst';

      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = '#' + (k + 1);

      const t = document.createElement('span');
      t.className = 'lap-t';
      t.textContent = fmt(lapTimes[k]);

      const tot = document.createElement('span');
      tot.className = 'total';
      tot.textContent = fmt(w.laps[k]);

      li.append(n, t, tot);
      list.appendChild(li);
    }
  }

  function renderControls(i) {
    const w = state[i];
    const c = cards[i];
    const has = w.running || w.base > 0 || w.laps.length > 0;
    c.el.classList.toggle('running', w.running);
    c.badge.textContent = w.running ? '計時中' : (has ? '已暫停' : '待機');
    c.main.textContent = w.running ? '暫停' : (w.base > 0 ? '繼續' : '開始');
    c.lap.disabled = !w.running;
    c.reset.disabled = !has;
  }

  function renderTimes() {
    const now = Date.now();
    state.forEach((w, i) => {
      const c = cards[i];
      const e = elapsed(w, now);
      const lastLap = w.laps.length ? w.laps[w.laps.length - 1] : 0;
      const t = fmt(e);
      if (t !== c.lastText) { c.time.textContent = t; c.lastText = t; }
      c.split.textContent = '本圈 ' + fmt(e - lastLap);
    });
  }

  function renderAll() {
    state.forEach((_, i) => { renderControls(i); renderLaps(i); });
    renderTimes();
  }

  /* ---------- 動畫迴圈：只有在計時中才會跑 ---------- */
  let raf = 0;
  function tick() {
    renderTimes();
    raf = state.some((w) => w.running) ? requestAnimationFrame(tick) : 0;
  }
  function ensureLoop() { if (!raf) raf = requestAnimationFrame(tick); }

  /* ---------- 操作 ---------- */
  function start(i) {
    const w = state[i];
    if (w.running) return;
    w.running = true;
    w.startedAt = Date.now();
  }
  function pause(i) {
    const w = state[i];
    if (!w.running) return;
    w.base = elapsed(w);
    w.running = false;
    w.startedAt = 0;
  }
  function lap(i) {
    const w = state[i];
    if (!w.running) return;
    const e = elapsed(w);
    const last = w.laps.length ? w.laps[w.laps.length - 1] : 0;
    if (e <= last) return;
    w.laps.push(e);
  }
  function reset(i) {
    const w = state[i];
    w.running = false;
    w.startedAt = 0;
    w.base = 0;
    w.laps = [];
  }
  const hasData = (w) => w.running || w.base > 0 || w.laps.length > 0;

  function commit() {
    save();
    renderAll();
    ensureLoop();
    updateWake();
  }

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    const i = Number(btn.closest('.card').dataset.i);
    const act = btn.dataset.act;

    if (act === 'toggle') { state[i].running ? pause(i) : start(i); }
    else if (act === 'lap') { lap(i); }
    else if (act === 'reset') {
      if (!hasData(state[i])) return;
      if (!confirm('確定要重設「' + state[i].name + '」？時間與分圈紀錄會清除。')) return;
      reset(i);
    }
    commit();
  });

  grid.addEventListener('input', (ev) => {
    if (!ev.target.classList.contains('name')) return;
    const i = Number(ev.target.closest('.card').dataset.i);
    state[i].name = ev.target.value;
    save();
  });
  grid.addEventListener('change', (ev) => {
    if (!ev.target.classList.contains('name')) return;
    const i = Number(ev.target.closest('.card').dataset.i);
    if (!ev.target.value.trim()) {
      state[i].name = blank(i).name;
      ev.target.value = state[i].name;
      save();
    }
  });

  document.getElementById('allStart').addEventListener('click', () => {
    state.forEach((_, i) => start(i));
    commit();
  });
  document.getElementById('allPause').addEventListener('click', () => {
    state.forEach((_, i) => pause(i));
    commit();
  });
  document.getElementById('allReset').addEventListener('click', () => {
    if (!state.some(hasData)) return;
    if (!confirm('確定要重設全部四組碼表？所有時間與分圈紀錄會清除。')) return;
    state.forEach((_, i) => reset(i));
    commit();
  });

  /* ---------- 螢幕保持亮起（有支援的瀏覽器才會顯示） ---------- */
  const wakeLabel = document.getElementById('wakeLabel');
  const wakeToggle = document.getElementById('wakeToggle');
  let wakeLock = null;

  async function requestWake() {
    try {
      if (!('wakeLock' in navigator) || wakeLock) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }
  async function releaseWake() {
    try { if (wakeLock) await wakeLock.release(); } catch (e) { /* 忽略 */ }
    wakeLock = null;
  }
  function updateWake() {
    if (wakeToggle.checked && state.some((w) => w.running)) requestWake();
    else releaseWake();
  }

  if ('wakeLock' in navigator) {
    wakeLabel.hidden = false;
    try { wakeToggle.checked = localStorage.getItem(WAKE_KEY) === '1'; } catch (e) { /* 忽略 */ }
    wakeToggle.addEventListener('change', () => {
      try { localStorage.setItem(WAKE_KEY, wakeToggle.checked ? '1' : '0'); } catch (e) { /* 忽略 */ }
      updateWake();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      renderTimes();
      ensureLoop();
      updateWake();
    }
  });

  /* ---------- 安裝提示 ---------- */
  const installBtn = document.getElementById('installBtn');
  const iosTip = document.getElementById('iosTip');
  let deferredPrompt = null;

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* 忽略 */ }
    deferredPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; iosTip.hidden = true; });
  if (isIOS && !isStandalone) iosTip.hidden = false;

  /* ---------- Service Worker（離線使用） ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* 本機 file:// 開啟時會失敗，屬正常 */ });
    });
  }

  /* ---------- 啟動 ---------- */
  renderAll();
  ensureLoop();
  updateWake();
})();
