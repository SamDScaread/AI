// 极简零依赖测试工具 / tiny test helper
let passed = 0, failed = 0;
const failures = [];

export function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

export async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
export function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'eq'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
export function approx(a, b, eps = 1e-6, msg) {
  if (Math.abs(a - b) > eps) throw new Error(`${msg || 'approx'}: expected ~${b}, got ${a}`);
}
export function near(a, b, eps, msg) { return approx(a, b, eps, msg); }

export function summary(label) {
  console.log(`\n${label}: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
