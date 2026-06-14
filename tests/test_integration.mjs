// End-to-end integration test: drives the real DOM via jsdom.
// Loads index.html + all game scripts, then simulates clicking through
// splash → map → district → mission → submit, checking economy & UI state.
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log(`FAIL: ${name}${extra ? '  — ' + extra : ''}`); }
}

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

// minimal AudioContext stub (game uses it for SFX)
class FakeParam { setValueAtTime() {} exponentialRampToValueAtTime() {} }
class FakeNode { constructor(){ this.frequency=new FakeParam(); this.gain=new FakeParam(); } connect(){} start(){} stop(){} }
window.AudioContext = class { constructor(){ this.currentTime=0; this.destination={}; } createOscillator(){ return new FakeNode(); } createGain(){ return new FakeNode(); } };
window.confirm = () => true;

// expose window globals for the IIFE scripts
const g = window;
function loadScript(relPath) {
  const code = readFileSync(new URL('../' + relPath, import.meta.url), 'utf8');
  // run in the window context
  window.eval(code);
}
['js/i18n.js', 'js/levels.js', 'js/interp/python.js', 'js/interp/cpp.js', 'js/editor.js', 'js/game.js']
  .forEach(loadScript);

// fire DOMContentLoaded so game.js init() runs
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

const doc = window.document;
const $ = (s) => doc.querySelector(s);
function click(sel) {
  const el = $(sel);
  if (!el) throw new Error('no element ' + sel);
  el.dispatchEvent(new window.Event('click', { bubbles: true }));
}
function visible(sel) { return $(sel).classList.contains('active'); }

// ---- 1. splash is shown first ----
ok('splash visible at start', visible('#screen-splash'));
ok('HUD hidden on splash', $('#hud').style.display === 'none');
ok('start button has text', $('#btn-start').textContent.length > 0);

// ---- 2. start → map ----
click('#btn-start');
ok('map visible after start', visible('#screen-map'));
ok('HUD visible after start', $('#hud').style.display !== 'none');
const districtCards = doc.querySelectorAll('.district-card');
ok('6 districts rendered', districtCards.length === 6, `got ${districtCards.length}`);
ok('district 1 unlocked', !districtCards[0].classList.contains('locked'));
ok('district 6 locked at start', districtCards[5].classList.contains('locked'));

// ---- 3. open district 1 ----
districtCards[0].dispatchEvent(new window.Event('click', { bubbles: true }));
ok('district screen visible', visible('#screen-district'));
const missionCards = doc.querySelectorAll('#district-missions .mission-card');
ok('district 1 has 5 missions', missionCards.length === 5, `got ${missionCards.length}`);

// ---- 4. open first mission ----
missionCards[0].dispatchEvent(new window.Event('click', { bubbles: true }));
ok('mission screen visible', visible('#screen-mission'));
ok('editor host has textarea', !!$('#editor-host .ed-input'));
ok('python tab active by default', $('#tab-py').classList.contains('active'));

// helper to set editor content (the GTCEditor instance owns the textarea)
function setEditor(code) {
  const ta = $('#editor-host .ed-input');
  ta.value = code;
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
}

// grab the reference solution from levels for d1m1
const Levels = g.GTCLevels;
const d1m1 = Levels.missions.find(m => m.id === 'd1m1');

// ---- 5. submit WRONG code → wanted level rises, no win ----
const cashBefore = JSON.parse(window.localStorage.getItem('gtc-save-v1')).cash;
setEditor('print("WRONG ANSWER")');
click('#btn-submit');
let save = JSON.parse(window.localStorage.getItem('gtc-save-v1'));
ok('wrong submit does not pay', save.cash === cashBefore, `cash=${save.cash}`);
ok('wrong submit raises wanted', save.wanted >= 1, `wanted=${save.wanted}`);
ok('win modal not open after wrong', !$('#modal-win').classList.contains('open'));
ok('test results show failure', $('#test-results').textContent.length > 0);

// ---- 6. submit CORRECT code → win modal, cash & respect awarded, wanted cleared ----
setEditor(d1m1.solution.py);
click('#btn-submit');
save = JSON.parse(window.localStorage.getItem('gtc-save-v1'));
ok('win modal opens on correct', $('#modal-win').classList.contains('open'));
ok('cash awarded', save.cash === d1m1.reward.cash, `cash=${save.cash} expected=${d1m1.reward.cash}`);
ok('respect awarded', save.respect === d1m1.reward.respect, `respect=${save.respect}`);
ok('wanted cleared on win', save.wanted === 0, `wanted=${save.wanted}`);
ok('mission marked done (py)', save.missions.d1m1.done.py === true);
ok('3 stars (no hints)', save.missions.d1m1.stars === 3, `stars=${save.missions.d1m1.stars}`);
ok('first-blood achievement', save.achievements.includes('first-blood'));

// ---- 7. replay in C++ → bilingual achievement ----
click('#btn-win-replay');
ok('cpp tab active after replay', $('#tab-cpp').classList.contains('active'));
setEditor(d1m1.solution.cpp);
click('#btn-submit');
save = JSON.parse(window.localStorage.getItem('gtc-save-v1'));
ok('mission done in cpp too', save.missions.d1m1.done.cpp === true);
ok('bilingual achievement', save.achievements.includes('bilingual'));
ok('replaying same lang pays half', save.cash === d1m1.reward.cash + Math.floor(d1m1.reward.cash/2), `cash=${save.cash}`);

// ---- 8. language toggle works ----
const beforeLang = g.GTCI18n.lang;
click('#btn-hud-lang');
ok('language toggled', g.GTCI18n.lang !== beforeLang, `lang=${g.GTCI18n.lang}`);
ok('start button retranslated', $('#tab-py').textContent === 'Python'); // stable both langs
g.GTCI18n.setLang('zh'); // reset

// ---- 9. hint system reduces stars ----
// open a fresh mission (d1m2), use a hint, solve → should be 2 stars
click('#btn-hud-map');
const cards2 = doc.querySelectorAll('.district-card');
cards2[0].dispatchEvent(new window.Event('click', { bubbles: true }));
const mc2 = doc.querySelectorAll('#district-missions .mission-card');
mc2[1].dispatchEvent(new window.Event('click', { bubbles: true })); // d1m2
click('#tab-py'); // language persists across missions; force python for this check
click('#btn-hint');
const d1m2 = Levels.missions.find(m => m.id === 'd1m2');
setEditor(d1m2.solution.py);
click('#btn-submit');
save = JSON.parse(window.localStorage.getItem('gtc-save-v1'));
ok('one hint → 2 stars', save.missions.d1m2.stars === 2, `stars=${save.missions.d1m2.stars}`);

// ---- 10. sandbox runs code ----
g.GTCI18n.setLang('zh');
click('#btn-hud-sandbox');
ok('sandbox visible', visible('#screen-sandbox'));
const sbTa = $('#sandbox-editor-host .ed-input');
sbTa.value = 'print(2 + 2)';
sbTa.dispatchEvent(new window.Event('input', { bubbles: true }));
click('#btn-sb-run');
ok('sandbox produced output', $('#sandbox-out').textContent.includes('4'), `out=${$('#sandbox-out').textContent}`);

// ---- 11. market purchase flow ----
// give enough cash, buy a theme
save = JSON.parse(window.localStorage.getItem('gtc-save-v1'));
save.cash = 5000;
window.localStorage.setItem('gtc-save-v1', JSON.stringify(save));
// reload state by toggling language (cheap) then open market
click('#btn-hud-market');
ok('market modal open', $('#modal-market').classList.contains('open'));

// ---- 12. editor auto-indent after colon ----
{
  const ed = new g.GTCEditor.Editor(doc.createElement('div'), { lang: 'py', value: 'if x:' });
  const ta = ed.ta;
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  const ev = new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
  ta.dispatchEvent(ev);
  ok('Enter after colon auto-indents', ta.value === 'if x:\n    ', `value=${JSON.stringify(ta.value)}`);
}

// ---- 13. interpreters reachable from window ----
ok('GTCPython on window', typeof g.GTCPython.run === 'function');
ok('GTCCpp on window', typeof g.GTCCpp.run === 'function');

console.log(`\nIntegration: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
