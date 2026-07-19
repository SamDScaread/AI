// Validates every mission: reference solutions must pass all tests in BOTH languages.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Py = require('../js/interp/python.js');
const Cpp = require('../js/interp/cpp.js');
const Levels = require('../js/levels.js');

function normalize(s) {
  return s.replace(/\r\n/g, '\n')
    .split('\n').map(line => line.replace(/[ \t]+$/, '')).join('\n')
    .replace(/\n+$/, '');
}

let pass = 0, fail = 0;
for (const m of Levels.missions) {
  for (const lang of ['py', 'cpp']) {
    const engine = lang === 'py' ? Py : Cpp;
    const code = m.solution[lang];
    if (!code) { fail++; console.log(`FAIL ${m.id}/${lang}: missing solution`); continue; }
    for (let ti = 0; ti < m.tests.length; ti++) {
      const tc = m.tests[ti];
      const expected = typeof tc.out === 'string' ? tc.out : tc.out[lang];
      const r = engine.run(code, { stdin: tc.stdin });
      if (r.error) {
        fail++;
        console.log(`FAIL ${m.id}/${lang} test#${ti}: ${r.error.type}: ${r.error.message} (line ${r.error.line})`);
        continue;
      }
      if (normalize(r.stdout) === normalize(expected)) pass++;
      else {
        fail++;
        console.log(`FAIL ${m.id}/${lang} test#${ti}\n  stdin:    ${JSON.stringify(tc.stdin)}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(r.stdout)}`);
      }
    }
  }
  // sanity: bilingual fields present
  for (const field of ['title', 'brief', 'task', 'knowledge', 'concept']) {
    if (!m[field] || !m[field].zh || !m[field].en) {
      fail++; console.log(`FAIL ${m.id}: missing bilingual field '${field}'`);
    }
  }
  if (!m.hints || m.hints.length !== 3) { fail++; console.log(`FAIL ${m.id}: needs exactly 3 hints`); }
  if (!m.starter || !m.starter.py || !m.starter.cpp) { fail++; console.log(`FAIL ${m.id}: missing starter code`); }
}

const districtIds = new Set(Levels.districts.map(d => d.id));
for (const m of Levels.missions) {
  if (!districtIds.has(m.district)) { fail++; console.log(`FAIL ${m.id}: unknown district ${m.district}`); }
}

console.log(`\nLevels: ${pass} checks passed, ${fail} failed  (${Levels.missions.length} missions)`);
process.exit(fail ? 1 : 0);
