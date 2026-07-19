// Unit tests for the built-in C++ mini-interpreter.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Cpp = require('../js/interp/cpp.js');

let pass = 0, fail = 0;
function t(name, src, expected, opts) {
  const r = Cpp.run(src, opts || {});
  const got = r.error ? `ERROR ${r.error.type}: ${r.error.message}` : r.stdout;
  if (got === expected) { pass++; }
  else {
    fail++;
    console.log(`FAIL: ${name}\n--- source ---\n${src}\n--- expected ---\n${JSON.stringify(expected)}\n--- got ---\n${JSON.stringify(got)}\n`);
  }
}
function terr(name, src, errType, opts) {
  const r = Cpp.run(src, opts || {});
  if (r.error && r.error.type === errType) { pass++; }
  else {
    fail++;
    console.log(`FAIL: ${name} (expected ${errType}, got ${r.error ? r.error.type + ': ' + r.error.message : JSON.stringify(r.stdout)})\n`);
  }
}
const M = (body) => `#include <iostream>\nusing namespace std;\nint main() {\n${body}\nreturn 0;\n}`;

// --- basics ---
t('hello', M(`cout << "Hello, World!" << endl;`), 'Hello, World!\n');
t('cout chain', M(`cout << 1 << " " << 2.5 << " " << 'A' << endl;`), '1 2.5 A\n');
t('newline escape', M(`cout << "a\\nb";`), 'a\nb');
t('arith', M(`cout << 2 + 3 * 4 << endl;`), '14\n');
t('int division truncates', M(`cout << 7 / 2 << endl;`), '3\n');
t('int division negative truncates toward zero', M(`cout << -7 / 2 << endl;`), '-3\n');
t('mod sign follows dividend', M(`cout << -7 % 3 << endl;`), '-1\n');
t('double division', M(`cout << 7.0 / 2 << endl;`), '3.5\n');
t('double fmt 6 sig', M(`cout << 1.0 / 3 << endl;`), '0.333333\n');
t('double whole prints bare', M(`cout << 4.0 / 2 << endl;`), '2\n');
t('double big exp', M(`cout << 1000000.5 << endl;`), '1e+06\n');
t('bool prints as int', M(`cout << true << " " << false << endl;`), '1 0\n');
t('bool expr prints as int', M(`cout << (3 > 2) << endl;`), '1\n');

// --- variables, types, conversions ---
t('vars', M(`int x = 10;\nint y = x * 2;\ncout << y << endl;`), '20\n');
t('multi decl', M(`int a = 1, b = 2;\ncout << a + b << endl;`), '3\n');
t('double to int truncation', M(`int x = 3.9;\ncout << x << endl;`), '3\n');
t('char arithmetic', M(`char c = 'a';\ncout << c << " " << c + 1 << endl;`), 'a 98\n');
t('char assign from int', M(`char c = 'a' + 1;\ncout << c << endl;`), 'b\n');
t('cast int', M(`double d = 9.7;\ncout << (int)d << endl;`), '9\n');
t('cast double', M(`int a = 7, b = 2;\ncout << (double)a / b << endl;`), '3.5\n');
t('const ok', M(`const int N = 5;\ncout << N << endl;`), '5\n');
t('long long', M(`long long big = 100000;\ncout << big * big << endl;`), '10000000000\n');

// --- strings ---
t('string concat', M(`string a = "code";\nstring b = a + "grad";\ncout << b << endl;`), 'codegrad\n');
t('string length', M(`string s = "neon";\ncout << s.length() << " " << s.size() << endl;`), '4 4\n');
t('string index', M(`string s = "neon";\ncout << s[0] << s[3] << endl;`), 'nn\n');
t('string substr', M(`string s = "codegrad";\ncout << s.substr(0, 4) << " " << s.substr(4) << endl;`), 'code grad\n');
t('string compare', M(`string a = "abc";\ncout << (a == "abc") << (a < "abd") << endl;`), '11\n');
t('string += char via +', M(`string s = "hi";\ns = s + '!';\ncout << s << endl;`), 'hi!\n');
t('string index assign', M(`string s = "cat";\ns[0] = 'b';\ncout << s << endl;`), 'bat\n');
t('to_string stoi', M(`cout << to_string(42) + "!" << endl;\ncout << stoi("123") + 1 << endl;`), '42!\n124\n');
t('string compound +=', M(`string s = "a";\ns += "bc";\ncout << s << endl;`), 'abc\n');

// --- control flow ---
t('if else', M(`int x = 7;\nif (x > 10) cout << "big";\nelse if (x > 5) cout << "mid";\nelse cout << "small";\ncout << endl;`), 'mid\n');
t('while', M(`int i = 0;\nwhile (i < 3) {\ncout << i << endl;\ni++;\n}`), '0\n1\n2\n');
t('for', M(`for (int i = 0; i < 3; i++) cout << i << " ";\ncout << endl;`), '0 1 2 \n');
t('for countdown', M(`for (int i = 3; i >= 1; i--) cout << i;\ncout << endl;`), '321\n');
t('break continue', M(`for (int i = 1; i <= 10; i++) {\nif (i % 2 == 0) continue;\nif (i > 5) break;\ncout << i << " ";\n}`), '1 3 5 ');
t('do while', M(`int i = 5;\ndo {\ncout << i;\ni++;\n} while (i < 3);`), '5');
t('nested for', M(`for (int i = 1; i <= 2; i++)\nfor (int j = 1; j <= 2; j++)\ncout << i << j << " ";`), '11 12 21 22 ');
t('ternary', M(`int x = 5;\ncout << (x > 3 ? "big" : "small") << endl;`), 'big\n');
t('logic shortcircuit', M(`int x = 0;\nif (x != 0 && 10 / x > 1) cout << "bad";\nelse cout << "safe";`), 'safe');
t('pre vs post increment', M(`int i = 5;\ncout << i++ << " " << i << endl;\nint j = 5;\ncout << ++j << " " << j << endl;`), '5 6\n6 6\n');

// --- functions ---
t('function', `#include <iostream>\nusing namespace std;\nint add(int a, int b) {\nreturn a + b;\n}\nint main() {\ncout << add(2, 3) << endl;\nreturn 0;\n}`, '5\n');
t('void function', `#include <iostream>\nusing namespace std;\nvoid greet(string name) {\ncout << "Yo, " << name << "!" << endl;\n}\nint main() {\ngreet("V");\nreturn 0;\n}`, 'Yo, V!\n');
t('recursion fact', `#include <iostream>\nusing namespace std;\nlong long fact(int n) {\nif (n <= 1) return 1;\nreturn n * fact(n - 1);\n}\nint main() {\ncout << fact(10) << endl;\nreturn 0;\n}`, '3628800\n');
t('recursion fib', `#include <iostream>\nusing namespace std;\nint fib(int n) {\nif (n < 2) return n;\nreturn fib(n-1) + fib(n-2);\n}\nint main() {\ncout << fib(10) << endl;\nreturn 0;\n}`, '55\n');
t('reference param', `#include <iostream>\nusing namespace std;\nvoid bump(int &x) {\nx = x + 1;\n}\nint main() {\nint a = 5;\nbump(a);\ncout << a << endl;\nreturn 0;\n}`, '6\n');
t('value param copies', `#include <iostream>\nusing namespace std;\nvoid tryBump(int x) {\nx = 100;\n}\nint main() {\nint a = 5;\ntryBump(a);\ncout << a << endl;\nreturn 0;\n}`, '5\n');
t('swap builtin', M(`int a = 1, b = 2;\nswap(a, b);\ncout << a << " " << b << endl;`), '2 1\n');
t('function defined after main call site', `#include <iostream>\nusing namespace std;\nint twice(int n);\nint main() {\ncout << twice(21) << endl;\nreturn 0;\n}\nint twice(int n) {\nreturn n * 2;\n}`, '42\n');

// --- arrays & vectors ---
t('array', M(`int a[3] = {10, 20, 30};\ncout << a[0] + a[2] << endl;`), '40\n');
t('array loop', M(`int a[] = {1, 2, 3, 4};\nint sum = 0;\nfor (int i = 0; i < 4; i++) sum += a[i];\ncout << sum << endl;`), '10\n');
t('array default zero', M(`int a[3];\ncout << a[0] + a[1] + a[2] << endl;`), '0\n');
t('vector', M(`vector<int> v;\nv.push_back(7);\nv.push_back(9);\ncout << v.size() << " " << v[0] << " " << v.back() << endl;`), '2 7 9\n');
t('vector brace init', M(`vector<int> v = {3, 1, 4};\nint s = 0;\nfor (int i = 0; i < (int)v.size(); i++) s += v[i];\ncout << s << endl;`), '8\n');
t('vector ctor fill', M(`vector<int> v(3, 5);\ncout << v[0] + v[1] + v[2] << endl;`), '15\n');
t('vector of string', M(`vector<string> names = {"Ada", "Linus"};\ncout << names[1] << endl;`), 'Linus\n');

// --- cin ---
t('cin int', M(`int n;\ncin >> n;\ncout << n * 2 << endl;`), '24\n', { stdin: '12' });
t('cin chain', M(`int a, b;\ncin >> a >> b;\ncout << a + b << endl;`), '30\n', { stdin: '10 20' });
t('cin string token', M(`string name;\ncin >> name;\ncout << "Hi " << name << endl;`), 'Hi Sam\n', { stdin: 'Sam Scaread' });
t('getline', M(`string line;\ngetline(cin, line);\ncout << "[" << line << "]" << endl;`), '[hello world]\n', { stdin: 'hello world' });
t('cin then getline consumes newline', M(`int n;\ncin >> n;\nstring rest;\ngetline(cin, rest);\ncout << n << "|" << rest << endl;`), '5|abc def\n', { stdin: '5\nabc def' });
t('cin double', M(`double d;\ncin >> d;\ncout << d * 2 << endl;`), '5\n', { stdin: '2.5' });

// --- math builtins ---
t('sqrt pow', M(`cout << sqrt(16.0) << " " << pow(2, 10) << endl;`), '4 1024\n');
t('abs max min', M(`cout << abs(-5) << " " << max(3, 7) << " " << min(3, 7) << endl;`), '5 7 3\n');

// --- errors ---
terr('undeclared variable', M(`cout << ghost << endl;`), 'CompileError');
terr('no main', `#include <iostream>\nint add(int a, int b) { return a + b; }`, 'LinkError');
terr('missing semicolon', M(`int x = 1\ncout << x;`), 'CompileError');
terr('int div by zero', M(`int x = 0;\ncout << 5 / x;`), 'RuntimeError');
terr('array out of bounds segfault', M(`int a[3] = {1,2,3};\ncout << a[5];`), 'RuntimeError');
terr('infinite loop guard', M(`while (true) { int x = 1; }`), 'RuntimeError');
terr('infinite recursion', `#include <iostream>\nusing namespace std;\nint f(int n) { return f(n); }\nint main() { cout << f(1); return 0; }`, 'RuntimeError');
terr('string plus int', M(`string s = "age: ";\ncout << s + 5;`), 'CompileError');
terr('printf hint', M(`printf("hi");`), 'CompileError');
terr('redeclaration', M(`int x = 1;\nint x = 2;`), 'CompileError');

// --- comments / preprocessor ---
t('comments', M(`// line comment\nint x = 1; /* block\ncomment */ cout << x;`), '1');
t('multiple includes', `#include <iostream>\n#include <string>\n#include <vector>\n#include <cmath>\nusing namespace std;\nint main() { cout << "ok"; return 0; }`, 'ok');

console.log(`\nC++ interpreter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
