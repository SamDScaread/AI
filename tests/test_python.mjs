// Unit tests for the built-in Python mini-interpreter.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Py = require('../js/interp/python.js');

let pass = 0, fail = 0;
function t(name, src, expected, opts) {
  const r = Py.run(src, opts || {});
  const got = r.error ? `ERROR ${r.error.type}: ${r.error.message}` : r.stdout;
  if (got === expected) { pass++; }
  else {
    fail++;
    console.log(`FAIL: ${name}\n--- source ---\n${src}\n--- expected ---\n${JSON.stringify(expected)}\n--- got ---\n${JSON.stringify(got)}\n`);
  }
}
function terr(name, src, errType, opts) {
  const r = Py.run(src, opts || {});
  if (r.error && r.error.type === errType) { pass++; }
  else {
    fail++;
    console.log(`FAIL: ${name} (expected error ${errType}, got ${r.error ? r.error.type + ': ' + r.error.message : JSON.stringify(r.stdout)})\n`);
  }
}

// --- basics ---
t('hello', `print("Hello, World!")`, 'Hello, World!\n');
t('print multi', `print(1, 2, 3)`, '1 2 3\n');
t('print sep/end', `print(1, 2, sep='-', end='!')\nprint()`, '1-2!\n');
t('arith int', `print(2 + 3 * 4)`, '14\n');
t('division float', `print(7 / 2)`, '3.5\n');
t('division float whole', `print(4 / 2)`, '2.0\n');
t('floor div', `print(7 // 2)`, '3\n');
t('floor div neg', `print(-7 // 2)`, '-4\n');
t('mod', `print(7 % 3)`, '1\n');
t('mod neg python', `print(-7 % 3)`, '2\n');
t('power', `print(2 ** 10)`, '1024\n');
t('float fmt', `print(0.1 + 0.2)`, '0.30000000000000004\n');
t('float 2.0', `x = 2.0\nprint(x)`, '2.0\n');
t('unary', `print(-5 + +3)`, '-2\n');
t('paren', `print((2 + 3) * 4)`, '20\n');

// --- variables & strings ---
t('vars', `x = 10\ny = x * 2\nprint(y)`, '20\n');
t('str concat', `a = "code"\nprint(a + "grad")`, 'codegrad\n');
t('str repeat', `print("ab" * 3)`, 'ababab\n');
t('fstring', `name = "Neo"\nprint(f"Hello, {name}! You are {2+3} years in.")`, 'Hello, Neo! You are 5 years in.\n');
t('fstring spec', `pi = 3.14159\nprint(f"{pi:.2f}")`, '3.14\n');
t('fstring nested quotes', `d = "cash"\nprint(f"You got {d}{{}}")`, 'You got cash{}\n');
t('str index', `s = "neon"\nprint(s[0], s[-1])`, 'n n\n');
t('str slice', `s = "codegrad"\nprint(s[0:4])\nprint(s[4:])\nprint(s[::-1])`, 'code\ngrad\ndargedoc\n');
t('str methods', `s = " Hey "\nprint(s.strip().upper())\nprint("a,b,c".split(","))\nprint("-".join(["x","y"]))`, 'HEY\n[\'a\', \'b\', \'c\']\nx-y\n');
t('str methods2', `print("hello".replace("l","L"))\nprint("banana".count("an"))\nprint("abc".find("c"))\nprint("42".isdigit())`, 'heLLo\n2\n2\nTrue\n');
t('multi string concat implicit', `print("a" "b")`, 'ab\n');

// --- bool & comparison ---
t('bool print', `print(True, False, None)`, 'True False None\n');
t('compare', `print(3 > 2, 2 == 2.0, "a" < "b")`, 'True True True\n');
t('chained compare', `x = 5\nprint(1 <= x <= 10)\nprint(1 <= x <= 4)`, 'True\nFalse\n');
t('and or not', `print(True and False, True or False, not True)`, 'False True False\n');
t('in str', `print("an" in "banana", "z" in "banana")`, 'True False\n');
t('in list', `print(2 in [1,2,3], 9 not in [1,2,3])`, 'True True\n');
t('short circuit', `def boom():\n    print("BOOM")\n    return True\nx = False and boom()\nprint(x)`, 'False\n');

// --- if / while / for ---
t('if elif else', `x = 7\nif x > 10:\n    print("big")\nelif x > 5:\n    print("mid")\nelse:\n    print("small")`, 'mid\n');
t('one-line if', `x = 3\nif x == 3: print("three")`, 'three\n');
t('while', `i = 0\nwhile i < 3:\n    print(i)\n    i += 1`, '0\n1\n2\n');
t('while break continue', `i = 0\nwhile True:\n    i += 1\n    if i % 2 == 0:\n        continue\n    if i > 5:\n        break\n    print(i)`, '1\n3\n5\n');
t('for range', `for i in range(3):\n    print(i)`, '0\n1\n2\n');
t('for range 2 args', `for i in range(2, 5):\n    print(i)`, '2\n3\n4\n');
t('for range step', `for i in range(10, 0, -3):\n    print(i)`, '10\n7\n4\n1\n');
t('for str', `for c in "abc":\n    print(c)`, 'a\nb\nc\n');
t('for list', `for x in [10, 20]:\n    print(x)`, '10\n20\n');
t('nested loops', `for i in range(1, 3):\n    for j in range(1, 3):\n        print(i, j)`, '1 1\n1 2\n2 1\n2 2\n');

// --- functions ---
t('def basic', `def add(a, b):\n    return a + b\nprint(add(2, 3))`, '5\n');
t('def no return', `def f():\n    pass\nprint(f())`, 'None\n');
t('recursion fact', `def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\nprint(fact(10))`, '3628800\n');
t('recursion fib', `def fib(n):\n    if n < 2:\n        return n\n    return fib(n-1) + fib(n-2)\nprint(fib(10))`, '55\n');
t('scope local', `x = 1\ndef f():\n    x = 2\n    return x\nprint(f(), x)`, '2 1\n');
t('global stmt', `count = 0\ndef bump():\n    global count\n    count += 1\nbump()\nbump()\nprint(count)`, '2\n');
t('func reads global', `g = 100\ndef f():\n    return g + 1\nprint(f())`, '101\n');

// --- lists / tuples / dicts ---
t('list ops', `xs = [3, 1, 2]\nxs.append(9)\nxs.sort()\nprint(xs)\nprint(len(xs), xs[0], xs[-1])`, '[1, 2, 3, 9]\n4 1 9\n');
t('list slice', `xs = [0,1,2,3,4]\nprint(xs[1:3])\nprint(xs[::2])`, '[1, 2]\n[0, 2, 4]\n');
t('list assign index', `xs = [1,2,3]\nxs[1] = 99\nprint(xs)`, '[1, 99, 3]\n');
t('list pop/insert/remove', `xs = [1,2,3]\nxs.insert(0, 0)\nxs.remove(2)\nprint(xs.pop(), xs)`, '3 [0, 1]\n');
t('tuple unpack', `a, b = 1, 2\na, b = b, a\nprint(a, b)`, '2 1\n');
t('tuple print', `t = (1, "a")\nprint(t)`, "(1, 'a')\n");
t('dict basic', `d = {"hp": 100, "name": "V"}\nd["hp"] -= 30\nprint(d["hp"], d.get("mp", 0))\nprint("name" in d)`, '70 0\nTrue\n');
t('dict items loop', `d = {"a": 1, "b": 2}\nfor k in d:\n    print(k, d[k])`, 'a 1\nb 2\n');
t('builtin agg', `xs = [4, 7, 1]\nprint(sum(xs), max(xs), min(xs), sorted(xs))`, '12 7 1 [1, 4, 7]\n');
t('sorted reverse', `print(sorted([2,3,1], reverse=True))`, '[3, 2, 1]\n');
t('list eq', `print([1,2] == [1,2], [1,2] < [1,3])`, 'True True\n');

// --- input / conversions ---
t('input', `name = input()\nprint("Hi " + name)`, 'Hi Sam\n', { stdin: ['Sam'] });
t('input prompt to stdout', `x = input("Name: ")\nprint(x)`, 'Name: Neo\n', { stdin: ['Neo'] });
t('input int', `n = int(input())\nprint(n * 2)`, '24\n', { stdin: ['12'] });
t('conversions', `print(int("42") + 1, float("2.5"), str(99) + "!", int(3.9), int(-3.9))`, '43 2.5 99! 3 -3\n');
t('ord chr', `print(ord("A"), chr(98))`, '65 b\n');
t('round', `print(round(3.7), round(2.5), round(3.14159, 2))`, '4 2 3.14\n');

// --- ternary, aug ops ---
t('ternary', `x = 5\nprint("big" if x > 3 else "small")`, 'big\n');
t('augops', `x = 10\nx += 5\nx -= 3\nx *= 2\nx //= 4\nprint(x)`, '6\n');

// --- errors ---
terr('NameError', `print(undefined_var)`, 'NameError');
terr('ZeroDivision', `print(1 / 0)`, 'ZeroDivisionError');
terr('TypeError concat', `print("age: " + 5)`, 'TypeError');
terr('IndexError', `xs = [1]\nprint(xs[5])`, 'IndexError');
terr('ValueError int', `int("abc")`, 'ValueError');
terr('SyntaxError', `if True\n    print(1)`, 'SyntaxError');
terr('IndentationError', `def f():\nprint(1)`, 'SyntaxError');
terr('infinite loop guard', `while True:\n    pass`, 'TimeoutError');
terr('import blocked', `import os`, 'SyntaxError');
terr('KeyError', `d = {}\nprint(d["x"])`, 'KeyError');
terr('recursion limit', `def f():\n    return f()\nf()`, 'RecursionError');

// --- comments / blank lines / weird spacing ---
t('comments', `# top comment\nx = 1  # side\n\nprint(x)  # done`, '1\n');
t('line continuation', `x = 1 + \\\n2\nprint(x)`, '3\n');
t('brackets span lines', `xs = [1,\n      2,\n      3]\nprint(sum(xs))`, '6\n');

console.log(`\nPython interpreter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
