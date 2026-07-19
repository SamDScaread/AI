/* ============================================================
 * 侠盗猎码 Grand Theft Code — 游戏主逻辑
 * screens: splash → map → district → mission (+ sandbox, modals)
 * ============================================================ */
(function () {
  'use strict';

  var I = window.GTCI18n;
  var LV = window.GTCLevels;
  var Py = window.GTCPython;
  var Cpp = window.GTCCpp;

  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================= State ================= */
  var SAVE_KEY = 'gtc-save-v1';
  var state = null;

  function freshState() {
    return {
      started: false, cash: 0, respect: 0, wanted: 0,
      theme: 'neon-noir', ownedThemes: ['neon-noir'],
      title: 't0', ownedTitles: ['t0'],
      muted: false,
      missions: {}, achievements: [], code: {}, sandbox: { py: '', cpp: '' },
      lastMission: null
    };
  }
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) { state = JSON.parse(raw); return; }
    } catch (e) {}
    state = freshState();
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function mstate(id) {
    if (!state.missions[id]) state.missions[id] = { stars: 0, hintsUsed: 0, done: {}, bribed: false };
    return state.missions[id];
  }

  /* ================= Audio ================= */
  var actx = null;
  function beep(freq, dur, type, when, vol) {
    if (state.muted) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (when || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SFX = {
    click: function () { beep(880, 0.05); },
    coin: function () { beep(988, 0.07, 'sine'); beep(1319, 0.18, 'sine', 0.07); },
    success: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, 0.12, 'triangle', i * 0.09); }); },
    fail: function () { beep(220, 0.15, 'sawtooth'); beep(110, 0.3, 'sawtooth', 0.12); },
    siren: function () { for (var i = 0; i < 4; i++) { beep(700, 0.12, 'square', i * 0.24, 0.03); beep(500, 0.12, 'square', i * 0.24 + 0.12, 0.03); } },
    type: function () { beep(1200 + Math.random() * 400, 0.012, 'square', 0, 0.008); }
  };

  /* ================= Judge ================= */
  function normalize(s) {
    return String(s).replace(/\r\n/g, '\n')
      .split('\n').map(function (l) { return l.replace(/[ \t]+$/, ''); }).join('\n')
      .replace(/\n+$/, '');
  }
  function runCode(lang, code, stdin) {
    var engine = lang === 'py' ? Py : Cpp;
    return engine.run(code, { stdin: stdin });
  }

  /* ================= Toasts & achievements ================= */
  function toast(html, cls) {
    var box = $('#toasts');
    var el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = html;
    box.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 20);
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 4200);
  }
  function unlockAchv(id) {
    if (state.achievements.indexOf(id) >= 0) return;
    var a = null;
    for (var i = 0; i < LV.achievements.length; i++) if (LV.achievements[i].id === id) a = LV.achievements[i];
    if (!a) return;
    state.achievements.push(id);
    save();
    SFX.coin();
    toast('🏆 <b>' + esc(I.t('achv.unlocked')) + '</b><br>' + esc(I.L(a.name)) + ' — ' + esc(I.L(a.desc)), 'toast-achv');
  }

  /* ================= Wanted level ================= */
  function bumpWanted() {
    if (state.wanted < 5) state.wanted++;
    save();
    renderHUD();
    if (state.wanted >= 5) {
      unlockAchv('most-wanted');
      toast('🚨 ' + esc(I.t('wanted.max')), 'toast-wanted');
    } else {
      toast('🚨 ' + esc(I.t('wanted.up')) + ' ' + starBar(state.wanted, 5), 'toast-wanted');
    }
    SFX.siren();
    var fl = $('#wanted-flash');
    fl.classList.add('on');
    setTimeout(function () { fl.classList.remove('on'); }, 900);
  }
  function clearWanted() {
    if (state.wanted > 0) {
      state.wanted = 0;
      save();
      renderHUD();
      toast('🕊️ ' + esc(I.t('wanted.clear')));
    }
  }
  function starBar(n, total) {
    var s = '';
    for (var i = 0; i < total; i++) s += i < n ? '★' : '☆';
    return s;
  }

  /* ================= HUD ================= */
  function titleName() {
    for (var i = 0; i < LV.shop.titles.length; i++) {
      if (LV.shop.titles[i].id === state.title) return I.L(LV.shop.titles[i].name);
    }
    return '';
  }
  function renderHUD() {
    $('#hud-cash').innerHTML = '💵 <b>$' + state.cash + '</b>';
    $('#hud-respect').innerHTML = '🔥 <b>' + state.respect + '</b> <span class="hud-label">' + esc(I.t('hud.respect')) + '</span>';
    $('#hud-wanted').innerHTML = '<span class="hud-label">' + esc(I.t('hud.wanted')) + '</span> <span class="wanted-stars">' + starBar(state.wanted, 5) + '</span>';
    $('#hud-title').textContent = titleName();
    $('#btn-hud-mute').textContent = state.muted ? '🔇' : '🔊';
    $('#btn-hud-lang').textContent = I.lang === 'zh' ? 'EN' : '中文';
  }

  /* ================= Screens ================= */
  var current = { screen: 'splash', district: null, mission: null, lang: 'py' };
  function show(screen) {
    ['splash', 'map', 'district', 'mission', 'sandbox'].forEach(function (s) {
      $('#screen-' + s).classList.toggle('active', s === screen);
    });
    $('#hud').style.display = screen === 'splash' ? 'none' : 'flex';
    current.screen = screen;
  }

  /* ---------- splash ---------- */
  function renderSplash() {
    var zh = I.lang === 'zh';
    $('#splash-title-main').textContent = zh ? '侠盗猎码' : 'GRAND THEFT CODE';
    $('#splash-title-sub').textContent = zh ? 'GRAND THEFT CODE' : '侠盗猎码';
    $('#splash-subtitle').textContent = I.t('game.subtitle');
    $('#btn-start').textContent = state.started ? I.t('splash.continue') : I.t('splash.start');
    $('#btn-splash-sandbox').textContent = '🔧 ' + I.t('splash.sandbox');
    $('#btn-splash-lang').textContent = '🌐 ' + I.t('splash.langBtn');
    $('#splash-tip').textContent = I.t('splash.tip');
  }

  /* ---------- map ---------- */
  function missionsOf(d) {
    return LV.missions.filter(function (m) { return m.district === d; });
  }
  function doneCount(d) {
    var ms = missionsOf(d), c = 0;
    ms.forEach(function (m) {
      var st = state.missions[m.id];
      if (st && (st.done.py || st.done.cpp)) c++;
    });
    return c;
  }
  function totalDone() {
    var c = 0;
    LV.missions.forEach(function (m) {
      var st = state.missions[m.id];
      if (st && (st.done.py || st.done.cpp)) c++;
    });
    return c;
  }
  function renderMap() {
    $('#map-title').textContent = I.t('map.title');
    var total = LV.missions.length, done = totalDone();
    $('#map-progress').innerHTML = esc(I.t('map.progress')) + ': <b>' + done + ' / ' + total + '</b>' +
      '<div class="bar"><div class="bar-fill" style="width:' + (done / total * 100) + '%"></div></div>';
    var grid = $('#map-grid');
    grid.innerHTML = '';
    LV.districts.forEach(function (d) {
      var locked = state.respect < d.unlockRespect;
      var ms = missionsOf(d.id);
      var dc = doneCount(d.id);
      var card = document.createElement('div');
      card.className = 'district-card' + (locked ? ' locked' : '');
      card.style.setProperty('--dc', d.color);
      card.innerHTML =
        '<div class="dc-emoji">' + d.emoji + '</div>' +
        '<div class="dc-name">' + esc(I.L(d.name)) + '</div>' +
        '<div class="dc-concept">' + esc(I.L(d.concept)) + '</div>' +
        '<div class="dc-tagline">“' + esc(I.L(d.tagline)) + '”</div>' +
        (locked
          ? '<div class="dc-lock">🔒 ' + esc(I.t('map.locked')) + ' ' + d.unlockRespect + '</div>'
          : '<div class="dc-progress">' + esc(I.t('map.missions')) + ' ' + dc + '/' + ms.length +
            '<div class="bar"><div class="bar-fill" style="width:' + (ms.length ? dc / ms.length * 100 : 0) + '%"></div></div></div>');
      if (!locked) {
        card.addEventListener('click', function () { SFX.click(); openDistrict(d.id); });
      }
      grid.appendChild(card);
    });
  }

  /* ---------- district ---------- */
  function openDistrict(id) {
    current.district = id;
    var d = LV.districts.filter(function (x) { return x.id === id; })[0];
    $('#district-name').innerHTML = d.emoji + ' ' + esc(I.L(d.name)) +
      ' <span class="d-concept">' + esc(I.L(d.concept)) + '</span>';
    $('#btn-district-back').textContent = I.t('district.back');
    var list = $('#district-missions');
    list.innerHTML = '';
    missionsOf(id).forEach(function (m, idx) {
      var st = state.missions[m.id];
      var stars = st ? st.stars : 0;
      var isDone = st && (st.done.py || st.done.cpp);
      var card = document.createElement('div');
      card.className = 'mission-card' + (isDone ? ' done' : '');
      card.style.setProperty('--dc', d.color);
      card.innerHTML =
        '<div class="mc-num">' + (idx + 1) + '</div>' +
        '<div class="mc-main">' +
        '  <div class="mc-title">' + esc(I.L(m.title)) + (isDone ? ' <span class="mc-done">✔ ' + esc(I.t('district.done')) + '</span>' : '') + '</div>' +
        '  <div class="mc-concept">' + m.npc.emoji + ' ' + esc(I.L(m.npc.name)) + ' · ' + esc(I.L(m.concept)) + '</div>' +
        '</div>' +
        '<div class="mc-side"><div class="mc-stars">' + starBar(stars, 3) + '</div>' +
        '<div class="mc-reward">💵 $' + m.reward.cash + ' · 🔥 ' + m.reward.respect + '</div></div>';
      card.addEventListener('click', function () { SFX.click(); openMission(m.id); });
      list.appendChild(card);
    });
    show('district');
  }

  /* ---------- mission ---------- */
  var editor = null;
  var typeTimer = null;

  function getMission(id) {
    return LV.missions.filter(function (m) { return m.id === id; })[0];
  }
  function codeFor(m, lang) {
    var saved = state.code[m.id];
    if (saved && typeof saved[lang] === 'string' && saved[lang].length) return saved[lang];
    return m.starter[lang];
  }

  function openMission(id) {
    var m = getMission(id);
    if (!m) return;
    current.mission = id;
    state.lastMission = id;
    state.started = true;
    save();
    var d = LV.districts.filter(function (x) { return x.id === m.district; })[0];
    document.documentElement.style.setProperty('--accent', d.color);

    $('#btn-mission-back').textContent = I.t('district.back');
    $('#mission-title').textContent = I.L(m.title);
    $('#mission-concept').textContent = I.L(m.concept);
    $('#npc-emoji').textContent = m.npc.emoji;
    $('#npc-name').textContent = I.L(m.npc.name);

    $('#h-briefing').textContent = '📻 ' + I.t('mission.briefing');
    $('#h-objective').textContent = '🎯 ' + I.t('mission.objective');
    $('#h-knowledge').textContent = '📚 ' + I.t('mission.knowledge');
    $('#h-examples').textContent = '🧪 ' + I.t('mission.examples');

    $('#mission-objective').innerHTML = I.L(m.task);
    $('#mission-knowledge').innerHTML = I.L(m.knowledge);

    // sample tests table
    var ex = '';
    m.tests.slice(0, 2).forEach(function (tc, i) {
      var out = typeof tc.out === 'string' ? tc.out : tc.out[current.lang];
      ex += '<div class="sample">' +
        '<div class="sample-col"><div class="sample-h">' + esc(I.t('mission.stdin')) + ' #' + (i + 1) + '</div><pre>' +
        (tc.stdin === '' ? '<span class="dim">' + esc(I.t('mission.noInput')) + '</span>' : esc(tc.stdin)) + '</pre></div>' +
        '<div class="sample-col"><div class="sample-h">' + esc(I.t('mission.stdout')) + '</div><pre>' + esc(out) + '</pre></div>' +
        '</div>';
    });
    $('#mission-examples').innerHTML = ex;

    // hints
    renderHints(m);
    $('#btn-bribe').textContent = I.t('mission.bribe');

    // editor + tabs
    $('#tab-py').textContent = I.t('misc.langPy');
    $('#tab-cpp').textContent = I.t('misc.langCpp');
    setMissionLang(current.lang || 'py', true);

    // buttons
    $('#btn-run').textContent = I.t('mission.run');
    $('#btn-submit').textContent = I.t('mission.submit');
    $('#btn-reset').textContent = I.t('mission.reset');
    $('#h-console').textContent = '🖥️ ' + I.t('mission.console');
    $('#h-custom-input').textContent = '⌨️ ' + I.t('mission.customInput');
    $('#custom-stdin').value = m.tests[0].stdin || '';
    $('#console-out').innerHTML = '<span class="dim">' + esc(I.t('mission.empty')) + '</span>';
    $('#test-results').innerHTML = '';

    // briefing typewriter
    typewrite($('#mission-brief'), I.L(m.brief));

    show('mission');
  }

  function setMissionLang(lang, forceReload) {
    var m = getMission(current.mission);
    if (!m) return;
    if (editor && !forceReload && current.lang === lang) return;
    // persist current editor text before switching
    if (editor && current.lang !== lang) saveEditorCode(m);
    current.lang = lang;
    $('#tab-py').classList.toggle('active', lang === 'py');
    $('#tab-cpp').classList.toggle('active', lang === 'cpp');
    if (!editor) {
      editor = new GTCEditor.Editor($('#editor-host'), {
        lang: lang, value: codeFor(m, lang),
        onChange: debounce(function () { saveEditorCode(getMission(current.mission)); }, 800)
      });
    } else {
      editor.setLang(lang);
      editor.setValue(codeFor(m, lang));
    }
  }
  function saveEditorCode(m) {
    if (!m || !editor) return;
    if (!state.code[m.id]) state.code[m.id] = {};
    state.code[m.id][current.lang] = editor.getValue();
    save();
  }
  function debounce(fn, ms) {
    var t = null;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function typewrite(el, html) {
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    var i = 0, shown = '';
    el.innerHTML = '';
    el.classList.add('typing');
    function finish() {
      clearInterval(typeTimer); typeTimer = null;
      el.innerHTML = html;
      el.classList.remove('typing');
      el.removeEventListener('click', finish);
    }
    el.addEventListener('click', finish);
    typeTimer = setInterval(function () {
      if (i >= html.length) { finish(); return; }
      var c = html[i];
      if (c === '<') { // append whole tag instantly
        var close = html.indexOf('>', i);
        if (close < 0) close = html.length - 1;
        shown += html.slice(i, close + 1);
        i = close + 1;
      } else {
        shown += c;
        i++;
        if (i % 3 === 0) SFX.type();
      }
      el.innerHTML = shown + '<span class="caret">▌</span>';
    }, 14);
  }

  function renderHints(m) {
    var st = mstate(m.id);
    var box = $('#hints-box');
    var html = '';
    for (var i = 0; i < st.hintsUsed && i < m.hints.length; i++) {
      html += '<div class="hint-item">💡 ' + esc(I.L(m.hints[i])) + '</div>';
    }
    box.innerHTML = html;
    var left = m.hints.length - st.hintsUsed;
    $('#btn-hint').textContent = I.t('mission.hint') + ' (' + left + ' ' + I.t('mission.hintLeft') + ')';
    $('#btn-hint').disabled = left <= 0;
  }

  function useHint() {
    var m = getMission(current.mission);
    var st = mstate(m.id);
    if (st.hintsUsed >= m.hints.length) { toast(esc(I.t('mission.noHints'))); return; }
    st.hintsUsed++;
    save();
    SFX.click();
    renderHints(m);
  }

  function bribe() {
    var m = getMission(current.mission);
    var st = mstate(m.id);
    if (state.cash < 300) { toast('💸 ' + esc(I.t('mission.bribeNoCash'))); SFX.fail(); return; }
    state.cash -= 300;
    st.bribed = true;
    save();
    renderHUD();
    SFX.coin();
    toast('🤝 ' + esc(I.t('mission.bribeDone')));
    $('#solution-title').textContent = I.t('mission.solutionTitle');
    $('#solution-code').textContent = m.solution[current.lang];
    $('#solution-code').innerHTML = GTCEditor.highlight(m.solution[current.lang], current.lang);
    openModal('modal-solution');
  }

  /* ---------- running & judging ---------- */
  function fmtError(err) {
    var loc = err.line ? ('line ' + err.line + ': ') : '';
    var tip = I.errTip(err.type);
    return '<div class="err-main">💥 ' + esc(loc + err.type + ': ' + err.message) + '</div>' +
      (tip ? '<div class="err-tip">🧭 ' + esc(tip) + '</div>' : '');
  }
  function checkSegfaultAchv(err) {
    if (!err) return;
    var msg = (err.message || '') + '';
    if (msg.indexOf('Segmentation fault') >= 0 || msg.indexOf('stack overflow') >= 0 ||
        msg.indexOf('core dumped') >= 0 || err.type === 'RecursionError') {
      unlockAchv('segfault');
    }
  }

  function doRun() {
    var m = getMission(current.mission);
    saveEditorCode(m);
    SFX.click();
    var stdin = $('#custom-stdin').value;
    var r = runCode(current.lang, editor.getValue(), stdin);
    var out = $('#console-out');
    var html = '';
    if (r.stdout) html += '<pre class="stdout">' + esc(r.stdout) + '</pre>';
    if (r.error) {
      html += fmtError(r.error);
      checkSegfaultAchv(r.error);
      SFX.fail();
    } else if (!r.stdout) {
      html += '<span class="dim">(no output / 无输出)</span>';
    }
    out.innerHTML = html;
    $('#test-results').innerHTML = '';
  }

  function doSubmit() {
    var m = getMission(current.mission);
    saveEditorCode(m);
    var code = editor.getValue();
    var results = [];
    var allPass = true;
    var firstError = null;
    for (var i = 0; i < m.tests.length; i++) {
      var tc = m.tests[i];
      var expected = typeof tc.out === 'string' ? tc.out : tc.out[current.lang];
      var r = runCode(current.lang, code, tc.stdin);
      var ok = !r.error && normalize(r.stdout) === normalize(expected);
      if (!ok) allPass = false;
      if (r.error && !firstError) firstError = r.error;
      results.push({ tc: tc, expected: expected, r: r, ok: ok });
    }
    renderResults(results, firstError);
    if (allPass) {
      missionPassed(m);
    } else {
      SFX.fail();
      bumpWanted();
    }
  }

  function renderResults(results, firstError) {
    var box = $('#test-results');
    var html = '';
    var passCount = 0;
    results.forEach(function (res, i) {
      if (res.ok) passCount++;
      html += '<div class="tr-row ' + (res.ok ? 'ok' : 'bad') + '">' +
        '<div class="tr-head">#' + (i + 1) + ' ' + (res.ok ? I.t('mission.testPass') : I.t('mission.testFail')) + '</div>';
      if (!res.ok && !res.r.error) {
        html += '<div class="tr-diff"><div><span class="tr-label">' + esc(I.t('mission.expected')) + '</span><pre>' + esc(res.expected) + '</pre></div>' +
          '<div><span class="tr-label">' + esc(I.t('mission.got')) + '</span><pre>' + esc(res.r.stdout || '∅') + '</pre></div></div>';
      }
      html += '</div>';
    });
    var summary;
    if (passCount === results.length) {
      summary = '<div class="tr-summary all-ok">🎉 ' + esc(I.t('mission.allPass')) + '</div>';
    } else {
      summary = '<div class="tr-summary some-bad">🚓 ' + (results.length - passCount) + ' ' + esc(I.t('mission.someFail')) + '</div>';
    }
    box.innerHTML = summary + html;
    var out = $('#console-out');
    if (firstError) {
      out.innerHTML = fmtError(firstError);
      checkSegfaultAchv(firstError);
    }
  }

  function missionPassed(m) {
    var st = mstate(m.id);
    var firstTime = !st.done.py && !st.done.cpp;
    var firstThisLang = !st.done[current.lang];
    st.done[current.lang] = true;

    var stars = st.bribed ? 1 : (st.hintsUsed === 0 ? 3 : (st.hintsUsed === 1 ? 2 : 1));
    if (stars > st.stars) st.stars = stars;

    var cashGain = 0, respGain = 0;
    if (firstTime) {
      cashGain = m.reward.cash; respGain = m.reward.respect;
    } else if (firstThisLang) {
      cashGain = Math.floor(m.reward.cash / 2);
    }
    state.cash += cashGain;
    state.respect += respGain;
    save();
    clearWanted();
    renderHUD();
    SFX.success();
    if (cashGain) setTimeout(SFX.coin, 500);

    unlockAchv('first-blood');
    if (st.done.py && st.done.cpp) unlockAchv('bilingual');
    if (stars === 3 && !st.bribed) unlockAchv('no-hints');
    if (totalDone() === LV.missions.length) unlockAchv('city-legend');

    // win modal
    $('#win-title').textContent = I.t('win.title');
    $('#win-mission-name').textContent = I.L(m.title);
    $('#win-stars').textContent = starBar(st.stars, 3);
    $('#win-reward').innerHTML = (cashGain || respGain)
      ? esc(I.t('win.reward')) + ': <b>$' + cashGain + '</b> · 🔥 <b>+' + respGain + '</b>'
      : '';
    $('#win-quip').textContent = I.quip();
    var next = nextMission(m);
    $('#btn-win-next').style.display = next ? '' : 'none';
    $('#btn-win-next').textContent = I.t('win.next');
    $('#btn-win-map').textContent = I.t('win.backMap');
    $('#btn-win-replay').textContent = I.t('win.replay');
    $('#btn-win-replay').style.display = (st.done.py && st.done.cpp) ? 'none' : '';
    openModal('modal-win');
  }

  function nextMission(m) {
    var idx = LV.missions.indexOf(m);
    for (var i = idx + 1; i < LV.missions.length; i++) {
      var cand = LV.missions[i];
      var d = LV.districts.filter(function (x) { return x.id === cand.district; })[0];
      if (state.respect >= d.unlockRespect) return cand;
    }
    return null;
  }

  /* ---------- modals ---------- */
  function openModal(id) {
    $('#' + id).classList.add('open');
    $('#modal-backdrop').classList.add('open');
  }
  function closeModals() {
    document.querySelectorAll('.modal.open').forEach(function (m) { m.classList.remove('open'); });
    $('#modal-backdrop').classList.remove('open');
  }

  /* ---------- black market ---------- */
  function renderMarket() {
    $('#market-title').textContent = '🌑 ' + I.t('market.title');
    var html = '<div class="market-section"><h3>🎨 ' + esc(I.t('market.themes')) + '</h3>';
    LV.shop.themes.forEach(function (th) {
      var owned = state.ownedThemes.indexOf(th.id) >= 0;
      var using = state.theme === th.id;
      html += '<div class="market-item theme-chip-' + th.id + '">' +
        '<span class="mi-name">' + esc(I.L(th.name)) + '</span>' +
        '<span class="mi-price">' + (th.price ? '$' + th.price : 'FREE') + '</span>' +
        (using ? '<button class="mi-btn using" disabled>' + esc(I.t('market.using')) + '</button>'
          : owned ? '<button class="mi-btn" data-equip-theme="' + th.id + '">' + esc(I.t('market.use')) + '</button>'
            : '<button class="mi-btn buy" data-buy-theme="' + th.id + '">' + esc(I.t('market.buy')) + '</button>') +
        '</div>';
    });
    html += '</div><div class="market-section"><h3>👑 ' + esc(I.t('market.titles')) + '</h3>';
    LV.shop.titles.forEach(function (tt) {
      var owned = state.ownedTitles.indexOf(tt.id) >= 0;
      var using = state.title === tt.id;
      html += '<div class="market-item">' +
        '<span class="mi-name">' + esc(I.L(tt.name)) + '</span>' +
        '<span class="mi-price">' + (tt.price ? '$' + tt.price : 'FREE') + '</span>' +
        (using ? '<button class="mi-btn using" disabled>' + esc(I.t('market.using')) + '</button>'
          : owned ? '<button class="mi-btn" data-equip-title="' + tt.id + '">' + esc(I.t('market.use')) + '</button>'
            : '<button class="mi-btn buy" data-buy-title="' + tt.id + '">' + esc(I.t('market.buy')) + '</button>') +
        '</div>';
    });
    html += '</div>';
    $('#market-body').innerHTML = html;
    // wire buttons
    document.querySelectorAll('[data-buy-theme]').forEach(function (b) {
      b.addEventListener('click', function () { buyTheme(b.getAttribute('data-buy-theme')); });
    });
    document.querySelectorAll('[data-equip-theme]').forEach(function (b) {
      b.addEventListener('click', function () { state.theme = b.getAttribute('data-equip-theme'); applyTheme(); save(); renderMarket(); SFX.click(); });
    });
    document.querySelectorAll('[data-buy-title]').forEach(function (b) {
      b.addEventListener('click', function () { buyTitle(b.getAttribute('data-buy-title')); });
    });
    document.querySelectorAll('[data-equip-title]').forEach(function (b) {
      b.addEventListener('click', function () { state.title = b.getAttribute('data-equip-title'); save(); renderHUD(); renderMarket(); SFX.click(); });
    });
  }
  function buyTheme(id) {
    var th = LV.shop.themes.filter(function (x) { return x.id === id; })[0];
    if (state.cash < th.price) { toast('💸 ' + esc(I.t('market.poor'))); SFX.fail(); return; }
    state.cash -= th.price;
    state.ownedThemes.push(id);
    state.theme = id;
    save(); applyTheme(); renderHUD(); renderMarket();
    SFX.coin();
    unlockAchv('shopper');
  }
  function buyTitle(id) {
    var tt = LV.shop.titles.filter(function (x) { return x.id === id; })[0];
    if (state.cash < tt.price) { toast('💸 ' + esc(I.t('market.poor'))); SFX.fail(); return; }
    state.cash -= tt.price;
    state.ownedTitles.push(id);
    state.title = id;
    save(); renderHUD(); renderMarket();
    SFX.coin();
    unlockAchv('shopper');
  }
  function applyTheme() {
    document.body.className = 'theme-' + state.theme;
  }

  /* ---------- achievements ---------- */
  function renderAchv() {
    $('#achv-title').textContent = '🏆 ' + I.t('achv.title');
    var html = '';
    LV.achievements.forEach(function (a) {
      var got = state.achievements.indexOf(a.id) >= 0;
      html += '<div class="achv-item ' + (got ? 'got' : 'missing') + '">' +
        '<span class="achv-icon">' + (got ? '🏆' : '🔒') + '</span>' +
        '<div><div class="achv-name">' + (got ? esc(I.L(a.name)) : esc(I.t('achv.locked'))) + '</div>' +
        '<div class="achv-desc">' + esc(I.L(a.desc)) + '</div></div></div>';
    });
    $('#achv-body').innerHTML = html;
  }

  /* ---------- sandbox ---------- */
  var sandboxEditor = null;
  var sandboxLang = 'py';
  var SANDBOX_DEFAULT = {
    py: '# 自由练码场 / Free Code Garage\n# 想试什么就写什么 / try anything\n\nfor i in range(3):\n    print("yo", i)\n',
    cpp: '#include <iostream>\nusing namespace std;\n\n// 自由练码场 / Free Code Garage\nint main() {\n    for (int i = 0; i < 3; i++) {\n        cout << "yo " << i << endl;\n    }\n    return 0;\n}\n'
  };
  function openSandbox() {
    $('#sandbox-title').textContent = '🔧 ' + I.t('sandbox.title');
    $('#sandbox-desc').textContent = I.t('sandbox.desc');
    $('#sb-tab-py').textContent = 'Python';
    $('#sb-tab-cpp').textContent = 'C++';
    $('#btn-sb-run').textContent = I.t('mission.run');
    $('#h-sb-input').textContent = '⌨️ ' + I.t('mission.customInput');
    if (!sandboxEditor) {
      sandboxEditor = new GTCEditor.Editor($('#sandbox-editor-host'), {
        lang: sandboxLang,
        value: state.sandbox[sandboxLang] || SANDBOX_DEFAULT[sandboxLang],
        onChange: debounce(function () {
          state.sandbox[sandboxLang] = sandboxEditor.getValue();
          save();
        }, 800)
      });
    }
    setSandboxLang(sandboxLang, true);
    $('#sandbox-out').innerHTML = '<span class="dim">' + esc(I.t('mission.empty')) + '</span>';
    show('sandbox');
  }
  function setSandboxLang(lang, force) {
    if (sandboxEditor && !force && sandboxLang === lang) return;
    if (sandboxEditor && sandboxLang !== lang) {
      state.sandbox[sandboxLang] = sandboxEditor.getValue();
      save();
    }
    sandboxLang = lang;
    $('#sb-tab-py').classList.toggle('active', lang === 'py');
    $('#sb-tab-cpp').classList.toggle('active', lang === 'cpp');
    sandboxEditor.setLang(lang);
    sandboxEditor.setValue(state.sandbox[lang] || SANDBOX_DEFAULT[lang]);
  }
  function sandboxRun() {
    SFX.click();
    state.sandbox[sandboxLang] = sandboxEditor.getValue();
    save();
    var r = runCode(sandboxLang, sandboxEditor.getValue(), $('#sb-stdin').value);
    var html = '';
    if (r.stdout) html += '<pre class="stdout">' + esc(r.stdout) + '</pre>';
    if (r.error) { html += fmtError(r.error); checkSegfaultAchv(r.error); SFX.fail(); }
    else if (!r.stdout) html += '<span class="dim">(no output / 无输出)</span>';
    $('#sandbox-out').innerHTML = html;
  }

  /* ---------- language refresh ---------- */
  function refreshScreen() {
    renderHUD();
    renderSplash();
    if (current.screen === 'map') renderMap();
    if (current.screen === 'district' && current.district) openDistrict(current.district);
    if (current.screen === 'mission' && current.mission) openMission(current.mission);
    if (current.screen === 'sandbox') openSandbox();
  }

  /* ================= Wire up ================= */
  function init() {
    load();
    applyTheme();
    renderHUD();
    renderSplash();

    $('#btn-start').addEventListener('click', function () {
      SFX.click();
      state.started = true; save();
      renderMap(); show('map');
    });
    $('#btn-splash-sandbox').addEventListener('click', function () { SFX.click(); openSandbox(); });
    $('#btn-splash-lang').addEventListener('click', function () { I.toggle(); refreshScreen(); });

    $('#btn-hud-lang').addEventListener('click', function () { I.toggle(); refreshScreen(); });
    $('#btn-hud-mute').addEventListener('click', function () {
      state.muted = !state.muted; save(); renderHUD();
    });
    $('#btn-hud-map').addEventListener('click', function () { SFX.click(); renderMap(); show('map'); });
    $('#btn-hud-market').addEventListener('click', function () { SFX.click(); renderMarket(); openModal('modal-market'); });
    $('#btn-hud-achv').addEventListener('click', function () { SFX.click(); renderAchv(); openModal('modal-achv'); });
    $('#btn-hud-sandbox').addEventListener('click', function () { SFX.click(); openSandbox(); });
    $('#btn-hud-home').addEventListener('click', function () { SFX.click(); renderSplash(); show('splash'); });

    $('#btn-district-back').addEventListener('click', function () { SFX.click(); renderMap(); show('map'); });
    $('#btn-mission-back').addEventListener('click', function () {
      SFX.click();
      if (current.district) openDistrict(current.district);
      else { renderMap(); show('map'); }
    });

    $('#tab-py').addEventListener('click', function () { SFX.click(); setMissionLang('py'); });
    $('#tab-cpp').addEventListener('click', function () { SFX.click(); setMissionLang('cpp'); });
    $('#btn-run').addEventListener('click', doRun);
    $('#btn-submit').addEventListener('click', doSubmit);
    $('#btn-hint').addEventListener('click', useHint);
    $('#btn-bribe').addEventListener('click', bribe);
    $('#btn-reset').addEventListener('click', function () {
      if (!confirm(I.t('misc.confirmReset'))) return;
      var m = getMission(current.mission);
      editor.setValue(m.starter[current.lang]);
      saveEditorCode(m);
    });

    $('#sb-tab-py').addEventListener('click', function () { SFX.click(); setSandboxLang('py'); });
    $('#sb-tab-cpp').addEventListener('click', function () { SFX.click(); setSandboxLang('cpp'); });
    $('#btn-sb-run').addEventListener('click', sandboxRun);

    $('#modal-backdrop').addEventListener('click', closeModals);
    document.querySelectorAll('.modal-close').forEach(function (b) {
      b.addEventListener('click', closeModals);
    });

    $('#btn-win-next').addEventListener('click', function () {
      closeModals();
      var m = getMission(current.mission);
      var next = nextMission(m);
      if (next) { current.district = next.district; openMission(next.id); }
    });
    $('#btn-win-map').addEventListener('click', function () { closeModals(); renderMap(); show('map'); });
    $('#btn-win-replay').addEventListener('click', function () {
      closeModals();
      setMissionLang(current.lang === 'py' ? 'cpp' : 'py');
    });

    // Ctrl/Cmd+Enter to run
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (current.screen === 'mission') { e.preventDefault(); if (e.shiftKey) doSubmit(); else doRun(); }
        if (current.screen === 'sandbox') { e.preventDefault(); sandboxRun(); }
      }
      if (e.key === 'Escape') closeModals();
    });

    show('splash');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
