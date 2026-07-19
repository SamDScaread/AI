/* ============================================================
 * 侠盗猎码 Grand Theft Code — 关卡数据 / Mission Data
 * 6 districts, 26 missions, fully bilingual (zh/en).
 * Every mission ships: NPC brief, teaching notes, starter code,
 * reference solution (used by the test suite), tests, 3 hints.
 * ============================================================ */
(function (global) {
  'use strict';

  var districts = [
    {
      id: 1,
      name: { zh: '老码头', en: 'The Docks' },
      tagline: { zh: '所有传奇都从搬砖开始', en: 'Every legend starts by moving crates' },
      concept: { zh: '输出 · 变量 · 输入 · 运算', en: 'Output · Variables · Input · Math' },
      emoji: '⚓', color: '#00e5ff', unlockRespect: 0
    },
    {
      id: 2,
      name: { zh: '霓虹大道', en: 'Neon Avenue' },
      tagline: { zh: '在这条街上，每个 if 都性命攸关', en: 'On this street, every if is life or death' },
      concept: { zh: '条件判断 · 逻辑运算', en: 'Conditionals · Boolean logic' },
      emoji: '🌃', color: '#ff2d95', unlockRespect: 50
    },
    {
      id: 3,
      name: { zh: '循环环路', en: 'The Loop' },
      tagline: { zh: '出不去的环城高速，除非你会 break', en: 'The ring road you cannot leave — unless you break' },
      concept: { zh: '循环 · break / continue', en: 'Loops · break / continue' },
      emoji: '🛣️', color: '#ffb300', unlockRespect: 120
    },
    {
      id: 4,
      name: { zh: '函数金融区', en: 'Function District' },
      tagline: { zh: '把活儿外包出去，这才是大佬思维', en: 'Delegate the work. That is boss thinking.' },
      concept: { zh: '函数 · 参数 · 返回值', en: 'Functions · Parameters · Returns' },
      emoji: '🏦', color: '#7c4dff', unlockRespect: 220
    },
    {
      id: 5,
      name: { zh: '数据黑市', en: 'Data Black Market' },
      tagline: { zh: '万物皆可存，万物皆可卖', en: 'Everything can be stored. Everything can be sold.' },
      concept: { zh: '列表 / 数组 · 字符串', en: 'Lists / Arrays · Strings' },
      emoji: '🌑', color: '#00e676', unlockRespect: 340
    },
    {
      id: 6,
      name: { zh: '递归塔', en: 'Recursion Tower' },
      tagline: { zh: '要理解递归塔，你得先理解递归塔', en: 'To understand the Tower, first understand the Tower' },
      concept: { zh: '递归 · 终极挑战', en: 'Recursion · Final Boss' },
      emoji: '🗼', color: '#ff1744', unlockRespect: 480
    }
  ];

  /* ---- NPC cast ---- */
  var NPC = {
    oldK:   { name: { zh: '老K', en: 'Old K' }, emoji: '🧔🏿' },
    neon:   { name: { zh: '霓虹妹', en: 'Neon' }, emoji: '💜' },
    loopy:  { name: { zh: '循环哥', en: 'Loopy' }, emoji: '🚕' },
    lambda: { name: { zh: '西装姐', en: 'Ms. Lambda' }, emoji: '🕶️' },
    fence:  { name: { zh: '收赃佬·老黑', en: 'Fence' }, emoji: '🦝' },
    profV:  { name: { zh: 'V教授', en: 'Prof. V' }, emoji: '🥼' },
    boss:   { name: { zh: '空指针先生', en: 'Mr. Nullpointer' }, emoji: '🕳️' }
  };

  var missions = [

  /* ================== District 1: The Docks ================== */
  {
    id: 'd1m1', district: 1, npc: NPC.oldK,
    title: { zh: '新人报到', en: 'Fresh Off the Bus' },
    concept: { zh: 'print / cout 输出', en: 'print / cout output' },
    brief: {
      zh: '老K上下打量着你：「又来一个想在码德城混出名堂的？行。在这座城市，枪没用，代码才是硬通货。先证明你的机器能出声 —— 让它喊出咱们的接头暗号。一个字都不许错，错了警察那边的语法分析器可不讲情面。」',
      en: 'Old K looks you up and down. "Another kid trying to make it big in Codegrad City? Fine. Guns are useless here — code is the only currency. First, prove your machine can talk. Make it shout our passphrase. Get one character wrong and the police parser will NOT be merciful."'
    },
    task: {
      zh: '让程序输出一行（一字不差）：<code>HELLO, CODEGRAD CITY</code>',
      en: 'Make your program print exactly one line: <code>HELLO, CODEGRAD CITY</code>'
    },
    knowledge: {
      zh: '<b>输出 = 让程序开口说话。</b><br>Python 用 <code>print("内容")</code>；C++ 用 <code>cout << "内容" << endl;</code>（<code>endl</code> 是换行）。<br>引号里的内容叫<b>字符串</b>，程序会原样照搬 —— 它没有自由发挥的权利。',
      en: '<b>Output = making the program speak.</b><br>Python: <code>print("text")</code>. C++: <code>cout << "text" << endl;</code> (<code>endl</code> means newline).<br>Text in quotes is a <b>string</b> — the program repeats it verbatim. No improvising.'
    },
    starter: {
      py: '# 在下面输出接头暗号 / print the passphrase below\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // 在这里输出接头暗号 / print the passphrase here\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'print("HELLO, CODEGRAD CITY")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "HELLO, CODEGRAD CITY" << endl;\n    return 0;\n}\n'
    },
    tests: [ { stdin: '', out: 'HELLO, CODEGRAD CITY' } ],
    hints: [
      { zh: 'Python：print("...")；C++：cout << "..." << endl;', en: 'Python: print("...")  C++: cout << "..." << endl;' },
      { zh: '内容必须一字不差，注意逗号和空格，全部大写。', en: 'The text must match exactly — mind the comma, the space, ALL CAPS.' },
      { zh: '完整答案：print("HELLO, CODEGRAD CITY")', en: 'Full answer: print("HELLO, CODEGRAD CITY")' }
    ],
    reward: { cash: 100, respect: 10 }
  },

  {
    id: 'd1m2', district: 1, npc: NPC.oldK,
    title: { zh: '三箱"洗衣粉"', en: 'Three Crates of "Detergent"' },
    concept: { zh: '变量与算术', en: 'Variables & arithmetic' },
    brief: {
      zh: '「今晚到货三箱『洗衣粉』，分别值 1200、3400、560。」老K压低声音，「先算总价。然后咱俩五五分账 —— 别用计算器，用变量。在这行，心算会出人命，变量不会。」',
      en: '"Three crates of \'detergent\' landed tonight: worth 1200, 3400 and 560." Old K lowers his voice. "Compute the total. Then split it fifty-fifty between us. No calculators — use variables. In this business, mental math gets people hurt. Variables don\'t."'
    },
    task: {
      zh: '用三个变量存价格 1200、3400、560。第一行输出总和，第二行输出总和的一半（整数除法，向下取整）。',
      en: 'Store 1200, 3400, 560 in three variables. Line 1: print the total. Line 2: print half the total using integer division.'
    },
    knowledge: {
      zh: '<b>变量 = 带名字的储物柜。</b><br>Python：<code>a = 1200</code>；C++ 要先声明类型：<code>int a = 1200;</code><br><b>整数除法</b>：Python 用 <code>//</code>（<code>5160 // 2</code>）；C++ 两个 int 相除 <code>/</code> 本来就只留整数部分 —— 这是两门语言的第一个性格差异。',
      en: '<b>A variable is a labeled locker.</b><br>Python: <code>a = 1200</code>. C++ declares the type first: <code>int a = 1200;</code><br><b>Integer division</b>: Python uses <code>//</code> (<code>5160 // 2</code>); in C++, dividing two ints with <code>/</code> already drops the decimals — your first personality difference between the two languages.'
    },
    starter: {
      py: 'crate1 = 1200\ncrate2 = 3400\ncrate3 = 560\n# 输出总和，再输出一半 / print total, then half\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int crate1 = 1200;\n    int crate2 = 3400;\n    int crate3 = 560;\n    // 输出总和，再输出一半 / print total, then half\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'crate1 = 1200\ncrate2 = 3400\ncrate3 = 560\ntotal = crate1 + crate2 + crate3\nprint(total)\nprint(total // 2)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int crate1 = 1200, crate2 = 3400, crate3 = 560;\n    int total = crate1 + crate2 + crate3;\n    cout << total << endl;\n    cout << total / 2 << endl;\n    return 0;\n}\n'
    },
    tests: [ { stdin: '', out: '5160\n2580' } ],
    hints: [
      { zh: '先 total = crate1 + crate2 + crate3，再分两行输出。', en: 'First total = crate1 + crate2 + crate3, then print on two lines.' },
      { zh: 'Python 的一半用 total // 2（两个斜杠）；C++ 直接 total / 2。', en: 'Half in Python is total // 2 (two slashes); in C++ just total / 2.' },
      { zh: '输出应该是 5160 和 2580。', en: 'Expected output: 5160 then 2580.' }
    ],
    reward: { cash: 120, respect: 10 }
  },

  {
    id: 'd1m3', district: 1, npc: NPC.oldK,
    title: { zh: '对讲机', en: 'The Intercom' },
    concept: { zh: 'input / cin 输入', en: 'input / cin' },
    brief: {
      zh: '老K扔给你一台改装对讲机：「以后兄弟们报代号，你的程序得能接住，还得礼貌回应 —— 黑道也讲礼貌。注意：程序跑起来之前，你永远不知道对面报的是什么名字。这就是『输入』的意义。」',
      en: 'Old K tosses you a modded intercom. "Crew members will radio in their codenames. Your program has to catch the name and respond politely — even gangsters have manners. Note: you never know the name before the program runs. That is what input is for."'
    },
    task: {
      zh: '读入一个代号（一行字符串），输出 <code>WELCOME, 代号</code>。例如输入 SHADOW，输出 <code>WELCOME, SHADOW</code>。',
      en: 'Read a codename (one line) and print <code>WELCOME, name</code>. E.g. input SHADOW → output <code>WELCOME, SHADOW</code>.'
    },
    knowledge: {
      zh: '<b>输入 = 程序的耳朵。</b><br>Python：<code>name = input()</code> 读一行。C++：<code>string name; cin >> name;</code> 读一个词。<br>拼接：Python 可以 <code>"WELCOME, " + name</code> 或 f-string <code>f"WELCOME, {name}"</code>；C++ 直接连环输出 <code>cout << "WELCOME, " << name</code>。',
      en: '<b>Input = the program\'s ears.</b><br>Python: <code>name = input()</code> reads a line. C++: <code>string name; cin >> name;</code> reads one word.<br>Combining: Python can do <code>"WELCOME, " + name</code> or an f-string <code>f"WELCOME, {name}"</code>; C++ just chains <code>cout << "WELCOME, " << name</code>.'
    },
    starter: {
      py: '# 读入代号，输出 WELCOME, 代号\n# read the codename, print WELCOME, name\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    string name;\n    // 读入代号并输出欢迎语 / read the codename, print the welcome\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'name = input()\nprint("WELCOME, " + name)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    string name;\n    cin >> name;\n    cout << "WELCOME, " << name << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: 'SHADOW', out: 'WELCOME, SHADOW' },
      { stdin: 'GHOST', out: 'WELCOME, GHOST' },
      { stdin: 'NEO', out: 'WELCOME, NEO' }
    ],
    hints: [
      { zh: 'Python：name = input()；C++：cin >> name;', en: 'Python: name = input()   C++: cin >> name;' },
      { zh: '注意逗号后面有一个空格：WELCOME,␣', en: 'There is one space after the comma: WELCOME,␣' },
      { zh: 'print("WELCOME, " + name) 即可通过。', en: 'print("WELCOME, " + name) passes.' }
    ],
    reward: { cash: 130, respect: 12 }
  },

  {
    id: 'd1m4', district: 1, npc: NPC.oldK,
    title: { zh: '分赃计算器', en: 'The Split Calculator' },
    concept: { zh: '整除与取余', en: 'Integer division & modulo' },
    brief: {
      zh: '「上次分账，老七说他被坑了 3 块钱，掏出了扳手。」老K揉着太阳穴，「我需要一个永不出错的分账程序：钱数、人数进去，每人多少、剩多少出来。剩下的归我 —— 这叫管理费。」',
      en: '"Last split, Lucky Seven claimed we shorted him 3 bucks. He brought a wrench." Old K rubs his temples. "I need a split calculator that is never wrong: cash and crew size in, each share and the leftover out. The leftover goes to me. Management fee."'
    },
    task: {
      zh: '读入两行：钱数和人数（都是整数）。输出两行：<code>EACH: 每人份额</code> 和 <code>LEFT: 剩余</code>。份额向下取整，剩余用取余运算。',
      en: 'Read two lines: total cash and crew size (integers). Print two lines: <code>EACH: share</code> and <code>LEFT: remainder</code>. Share rounds down; remainder uses modulo.'
    },
    knowledge: {
      zh: '<b>整除和取余是一对搭档。</b><br><code>1000 // 3 = 333</code>（每人拿的），<code>1000 % 3 = 1</code>（分不动的）。<br>Python 读数字要转换：<code>n = int(input())</code> —— input() 给的是字符串，不转换就是"文本1000"，不能做数学。C++ 的 <code>cin >> n</code> 会自动按 int 类型读。',
      en: '<b>Integer division and modulo are partners.</b><br><code>1000 // 3 = 333</code> (each share), <code>1000 % 3 = 1</code> (the unsplittable bit).<br>Python must convert input: <code>n = int(input())</code> — input() hands you text, and "1000"-the-text can\'t do math. C++\'s <code>cin >> n</code> reads as int automatically.'
    },
    starter: {
      py: 'cash = int(input())\ncrew = int(input())\n# 输出 EACH: 和 LEFT: 两行 / print the EACH: and LEFT: lines\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int cash, crew;\n    cin >> cash >> crew;\n    // 输出 EACH: 和 LEFT: 两行 / print the EACH: and LEFT: lines\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'cash = int(input())\ncrew = int(input())\nprint("EACH:", cash // crew)\nprint("LEFT:", cash % crew)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int cash, crew;\n    cin >> cash >> crew;\n    cout << "EACH: " << cash / crew << endl;\n    cout << "LEFT: " << cash % crew << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '1000\n3', out: 'EACH: 333\nLEFT: 1' },
      { stdin: '5160\n4', out: 'EACH: 1290\nLEFT: 0' },
      { stdin: '7\n2', out: 'EACH: 3\nLEFT: 1' }
    ],
    hints: [
      { zh: '每人份额：cash // crew（Python）或 cash / crew（C++）。', en: 'Each share: cash // crew (Python) or cash / crew (C++).' },
      { zh: '剩余：cash % crew。% 念作"取余"，黑话叫"抹零"。', en: 'Leftover: cash % crew. % is called modulo — street name: "the skim".' },
      { zh: '注意输出格式：冒号后有一个空格。print("EACH:", x) 会自动加空格。', en: 'Format: one space after the colon. print("EACH:", x) adds the space automatically.' }
    ],
    reward: { cash: 150, respect: 14 }
  },

  {
    id: 'd1m5', district: 1, npc: NPC.oldK,
    title: { zh: '风险溢价', en: 'Hazard Pay' },
    concept: { zh: '小数 float / double', en: 'Floats / doubles' },
    brief: {
      zh: '「跨区运货，警察盯得紧，所以收『风险溢价』：原价乘 1.5 倍。」老K笑了笑，「客户嫌贵？嫌贵让他自己抱着箱子穿过霓虹大道试试。」',
      en: '"Cross-district delivery means cops on every corner, so we charge hazard pay: price times 1.5." Old K grins. "Client says it\'s pricey? Tell him to carry the crate across Neon Avenue himself."'
    },
    task: {
      zh: '读入一个整数原价（保证是奇数），输出乘以 1.5 之后的价格（会带 .5 的小数）。',
      en: 'Read an integer price (always odd) and print it multiplied by 1.5 (the result ends in .5).'
    },
    knowledge: {
      zh: '<b>小数登场。</b>Python 里带小数点的数叫 <code>float</code>；C++ 叫 <code>double</code>。<br>整数 × 1.5 会自动升级成小数：<code>101 * 1.5 = 151.5</code>。<br>彩蛋知识：计算机存小数有精度极限，<code>0.1 + 0.2</code> 在两门语言里都不是正好 0.3 —— 以后别用小数存钱，会计会哭。',
      en: '<b>Enter decimals.</b> Python calls them <code>float</code>; C++ calls them <code>double</code>.<br>int × 1.5 auto-upgrades to a decimal: <code>101 * 1.5 = 151.5</code>.<br>Fun fact: computers store decimals imprecisely — <code>0.1 + 0.2</code> is not exactly 0.3 in either language. Never store money as floats; accountants will cry.'
    },
    starter: {
      py: 'price = int(input())\n# 输出 1.5 倍的价格 / print the price times 1.5\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int price;\n    cin >> price;\n    // 输出 1.5 倍的价格 / print the price times 1.5\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'price = int(input())\nprint(price * 1.5)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int price;\n    cin >> price;\n    cout << price * 1.5 << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '101', out: '151.5' },
      { stdin: '33', out: '49.5' },
      { stdin: '999', out: '1498.5' }
    ],
    hints: [
      { zh: '直接 price * 1.5，乘法会自动得到小数结果。', en: 'Just price * 1.5 — multiplication auto-produces a decimal.' },
      { zh: '不要用整除 //，那会把 .5 抹掉，客户会很开心，老K会很不开心。', en: "Don't use integer division — it erases the .5. The client will be happy. Old K will not." },
      { zh: 'print(price * 1.5) 一行搞定。', en: 'print(price * 1.5) — one line.' }
    ],
    reward: { cash: 160, respect: 14 }
  },

  /* ================== District 2: Neon Avenue ================== */
  {
    id: 'd2m1', district: 2, npc: NPC.neon,
    title: { zh: '404酒吧门禁', en: 'Bouncer at Club 404' },
    concept: { zh: 'if / else', en: 'if / else' },
    brief: {
      zh: '霓虹妹靠在「404酒吧」门口（招牌写着：你要找的快乐不存在）：「上一个保镖被人灌醉了，放进来一车未成年。现在换你的程序当保镖 —— 程序不喝酒。21 岁是底线，差一天都不行。」',
      en: 'Neon leans on the door of Club 404 (sign reads: "the fun you are looking for does not exist"). "The last bouncer got drunk and let in a busload of minors. Your program is the new bouncer — programs don\'t drink. 21 is the line. Not a day less."'
    },
    task: {
      zh: '读入年龄（整数）。大于等于 21 输出 <code>COME IN</code>，否则输出 <code>GO HOME, KID</code>。',
      en: 'Read an age (integer). If it is 21 or more print <code>COME IN</code>, otherwise print <code>GO HOME, KID</code>.'
    },
    knowledge: {
      zh: '<b>if = 程序的岔路口。</b><br>Python：<pre>if age >= 21:\n    print("COME IN")\nelse:\n    print("GO HOME, KID")</pre>注意冒号和<b>缩进</b> —— 缩进就是 Python 的"地盘划分"，乱缩进等于踩别人地盘。<br>C++ 用大括号划地盘：<pre>if (age >= 21) {\n    cout << "COME IN" << endl;\n} else {\n    cout << "GO HOME, KID" << endl;\n}</pre>',
      en: '<b>if = a fork in the road.</b><br>Python:<pre>if age >= 21:\n    print("COME IN")\nelse:\n    print("GO HOME, KID")</pre>Mind the colon and the <b>indentation</b> — indentation marks Python\'s turf. Mess it up and you\'re trespassing.<br>C++ marks turf with braces:<pre>if (age >= 21) {\n    cout << "COME IN" << endl;\n} else {\n    cout << "GO HOME, KID" << endl;\n}</pre>'
    },
    starter: {
      py: 'age = int(input())\n# 21 岁是底线 / 21 is the line\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int age;\n    cin >> age;\n    // 21 岁是底线 / 21 is the line\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'age = int(input())\nif age >= 21:\n    print("COME IN")\nelse:\n    print("GO HOME, KID")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int age;\n    cin >> age;\n    if (age >= 21) {\n        cout << "COME IN" << endl;\n    } else {\n        cout << "GO HOME, KID" << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '25', out: 'COME IN' },
      { stdin: '21', out: 'COME IN' },
      { stdin: '20', out: 'GO HOME, KID' },
      { stdin: '3', out: 'GO HOME, KID' }
    ],
    hints: [
      { zh: '比较符号用 >=（大于等于）。21 岁整也要放行。', en: 'Use >= (greater or equal). Exactly 21 gets in too.' },
      { zh: 'Python 注意 if 行末的冒号和下一行的 4 格缩进。', en: "Python: don't forget the colon and the 4-space indent on the next line." },
      { zh: 'if age >= 21: → COME IN，else: → GO HOME, KID。', en: 'if age >= 21: → COME IN, else: → GO HOME, KID.' }
    ],
    reward: { cash: 180, respect: 16 }
  },

  {
    id: 'd2m2', district: 2, npc: NPC.neon,
    title: { zh: 'VIP分流', en: 'The VIP List' },
    concept: { zh: 'elif / else if 多分支', en: 'elif / else-if chains' },
    brief: {
      zh: '「光放人进来不够，还得分三六九等 —— 这很现实，但夜店就是现实。」霓虹妹弹了弹烟灰，「声望 90 以上进 VIP 包房，60 以上在大厅蹦，其他的……人行道也挺热闹的。」',
      en: '"Letting people in is not enough — you have to sort them into tiers. Harsh? Nightlife IS harsh." Neon flicks her cigarette. "Rep 90+ goes to the VIP room, 60+ dances on the main floor, everyone else… hey, the sidewalk has great acoustics."'
    },
    task: {
      zh: '读入声望值（整数）。≥90 输出 <code>VIP ROOM</code>；否则 ≥60 输出 <code>MAIN FLOOR</code>；否则输出 <code>SIDEWALK</code>。',
      en: 'Read a rep score (integer). ≥90 print <code>VIP ROOM</code>; else ≥60 print <code>MAIN FLOOR</code>; else print <code>SIDEWALK</code>.'
    },
    knowledge: {
      zh: '<b>多级分流用 elif（Python）/ else if（C++）。</b><br>条件从上往下检查，<b>命中一个就不再往下看</b> —— 所以要把最高门槛放最上面。先判 ≥60 再判 ≥90 的话，95 分的大佬会被分进大厅，然后他会掀桌。',
      en: '<b>Multi-way splits use elif (Python) / else if (C++).</b><br>Conditions are checked top-down and <b>the first match wins</b> — so put the highest bar first. Check ≥60 before ≥90 and a 95-rep boss lands on the main floor. He will flip tables.'
    },
    starter: {
      py: 'rep = int(input())\n# 三级分流 / three tiers\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int rep;\n    cin >> rep;\n    // 三级分流 / three tiers\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'rep = int(input())\nif rep >= 90:\n    print("VIP ROOM")\nelif rep >= 60:\n    print("MAIN FLOOR")\nelse:\n    print("SIDEWALK")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int rep;\n    cin >> rep;\n    if (rep >= 90) {\n        cout << "VIP ROOM" << endl;\n    } else if (rep >= 60) {\n        cout << "MAIN FLOOR" << endl;\n    } else {\n        cout << "SIDEWALK" << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '95', out: 'VIP ROOM' },
      { stdin: '90', out: 'VIP ROOM' },
      { stdin: '60', out: 'MAIN FLOOR' },
      { stdin: '59', out: 'SIDEWALK' },
      { stdin: '0', out: 'SIDEWALK' }
    ],
    hints: [
      { zh: '三个分支：if / elif / else（C++：if / else if / else）。', en: 'Three branches: if / elif / else (C++: if / else if / else).' },
      { zh: '先判 >= 90，再判 >= 60。顺序反了高分会被错分。', en: 'Check >= 90 first, then >= 60. Reversed order misroutes high scores.' },
      { zh: '90 和 60 整都按高档处理（用 >=）。', en: 'Exactly 90 and 60 belong to the higher tier (use >=).' }
    ],
    reward: { cash: 200, respect: 18 }
  },

  {
    id: 'd2m3', district: 2, npc: NPC.neon,
    title: { zh: '后门暗号', en: 'The Back Door' },
    concept: { zh: '字符串比较 · or', en: 'String equality · or' },
    brief: {
      zh: '「酒吧后门只认两个暗号：『swordfish』，还有上个月忘了注销的旧暗号『redfish』。」霓虹妹耸耸肩，「IT部门说下个版本修复。我们的IT部门就是你。」',
      en: '"The back door takes two passwords: \'swordfish\', plus last month\'s \'redfish\' that nobody deactivated." Neon shrugs. "IT said they\'d fix it in the next release. You ARE the IT department now."'
    },
    task: {
      zh: '读入一行暗号。等于 <code>swordfish</code> 或 <code>redfish</code> 输出 <code>ACCESS GRANTED</code>，否则输出 <code>ALARM TRIGGERED</code>。',
      en: 'Read a password. If it equals <code>swordfish</code> or <code>redfish</code> print <code>ACCESS GRANTED</code>, otherwise print <code>ALARM TRIGGERED</code>.'
    },
    knowledge: {
      zh: '<b>判断相等用 ==（两个等号！）。</b>一个 <code>=</code> 是赋值（把东西塞进柜子），两个 <code>==</code> 才是比较（看柜子里是不是这个东西）。新手把 == 写成 = 的概率约等于 100%。<br>多个条件任一成立：Python 用 <code>or</code>，C++ 用 <code>||</code>。',
      en: '<b>Equality is == (TWO equals signs!).</b> One <code>=</code> assigns (stuffs the locker); two <code>==</code> compares (checks the locker). The probability of a beginner typing = instead of == is roughly 100%.<br>Either-condition-passes: Python <code>or</code>, C++ <code>||</code>.'
    },
    starter: {
      py: 'pw = input()\n# swordfish 或 redfish 都放行 / either password works\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    string pw;\n    cin >> pw;\n    // swordfish 或 redfish 都放行 / either password works\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'pw = input()\nif pw == "swordfish" or pw == "redfish":\n    print("ACCESS GRANTED")\nelse:\n    print("ALARM TRIGGERED")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    string pw;\n    cin >> pw;\n    if (pw == "swordfish" || pw == "redfish") {\n        cout << "ACCESS GRANTED" << endl;\n    } else {\n        cout << "ALARM TRIGGERED" << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: 'swordfish', out: 'ACCESS GRANTED' },
      { stdin: 'redfish', out: 'ACCESS GRANTED' },
      { stdin: 'tunafish', out: 'ALARM TRIGGERED' },
      { stdin: 'SWORDFISH', out: 'ALARM TRIGGERED' }
    ],
    hints: [
      { zh: '比较字符串：pw == "swordfish"。注意是两个等号。', en: 'Compare strings: pw == "swordfish". TWO equals signs.' },
      { zh: '两个条件用 or（Python）/ ||（C++）连接。', en: 'Join the two checks with or (Python) / || (C++).' },
      { zh: '大写的 SWORDFISH 不算 —— 字符串比较区分大小写，门卫很较真。', en: 'SWORDFISH in caps fails — string comparison is case-sensitive. The door is pedantic.' }
    ],
    reward: { cash: 220, respect: 18 }
  },

  {
    id: 'd2m4', district: 2, npc: NPC.neon,
    title: { zh: '风声判定', en: 'Heat Check' },
    concept: { zh: 'and / or 组合逻辑', en: 'Combining and / or' },
    brief: {
      zh: '霓虹妹递来三张监控报表：「昨晚后巷有动静。规则很简单：动静超过 70 分贝，<b>并且</b>（有目击者<b>或者</b>有摄像头拍到），警察就会来敲门。帮我算算今晚要不要提前打烊。」',
      en: 'Neon slides over three surveillance reports. "Something went down in the back alley. The rule is simple: noise above 70 dB <b>AND</b> (a witness <b>OR</b> a camera caught it) means cops at the door. Tell me if we close early tonight."'
    },
    task: {
      zh: '读入三个整数（各一行）：噪音分贝、目击者数、摄像头数。若 噪音 > 70 且（目击者 > 0 或 摄像头 > 0），输出 <code>WANTED</code>，否则输出 <code>CLEAN</code>。',
      en: 'Read three integers (one per line): noise dB, witnesses, cameras. If noise > 70 AND (witnesses > 0 OR cameras > 0), print <code>WANTED</code>; else print <code>CLEAN</code>.'
    },
    knowledge: {
      zh: '<b>and 比 or 优先级高，但别赌 —— 加括号。</b><br><code>noise > 70 and (wit > 0 or cam > 0)</code> 和 <code>(noise > 70 and wit > 0) or cam > 0</code> 是两个完全不同的世界。括号免费，冤狱很贵。<br>C++ 写法：<code>&&</code> 是 and，<code>||</code> 是 or。',
      en: '<b>and binds tighter than or — but don\'t gamble: use parentheses.</b><br><code>noise > 70 and (wit > 0 or cam > 0)</code> and <code>(noise > 70 and wit > 0) or cam > 0</code> are two different universes. Parentheses are free. Wrongful convictions are not.<br>C++: <code>&&</code> is and, <code>||</code> is or.'
    },
    starter: {
      py: 'noise = int(input())\nwitnesses = int(input())\ncameras = int(input())\n# WANTED 还是 CLEAN？/ WANTED or CLEAN?\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int noise, witnesses, cameras;\n    cin >> noise >> witnesses >> cameras;\n    // WANTED 还是 CLEAN？/ WANTED or CLEAN?\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'noise = int(input())\nwitnesses = int(input())\ncameras = int(input())\nif noise > 70 and (witnesses > 0 or cameras > 0):\n    print("WANTED")\nelse:\n    print("CLEAN")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int noise, witnesses, cameras;\n    cin >> noise >> witnesses >> cameras;\n    if (noise > 70 && (witnesses > 0 || cameras > 0)) {\n        cout << "WANTED" << endl;\n    } else {\n        cout << "CLEAN" << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '85\n1\n0', out: 'WANTED' },
      { stdin: '85\n0\n2', out: 'WANTED' },
      { stdin: '85\n0\n0', out: 'CLEAN' },
      { stdin: '70\n5\n5', out: 'CLEAN' },
      { stdin: '71\n0\n1', out: 'WANTED' }
    ],
    hints: [
      { zh: '结构：A and (B or C)。括号必须有。', en: 'Shape: A and (B or C). The parentheses are mandatory.' },
      { zh: '噪音正好 70 不算超过（用 >，不是 >=）。', en: 'Exactly 70 dB is not "above" (use >, not >=).' },
      { zh: 'if noise > 70 and (witnesses > 0 or cameras > 0):', en: 'if noise > 70 and (witnesses > 0 or cameras > 0):' }
    ],
    reward: { cash: 240, respect: 20 }
  },

  /* ================== District 3: The Loop ================== */
  {
    id: 'd3m1', district: 3, npc: NPC.loopy,
    title: { zh: '计圈器', en: 'Lap Counter' },
    concept: { zh: 'for 循环', en: 'for loops' },
    brief: {
      zh: '循环哥的出租车永远在环城高速上：「兄弟，我在这条环路上开了八年，导航都认输了。帮我做个计圈器 —— 跑几圈就报几个数，一圈一行，从 1 开始。别问为什么不用手数，问就是方向盘脱不开手。」',
      en: 'Loopy\'s cab never leaves the ring road. "Brother, eight years on this loop. My GPS filed for retirement. Build me a lap counter — N laps, print each number on its own line, starting from 1. Why not count by hand? Hands are busy. Wheel."'
    },
    task: {
      zh: '读入整数 N，输出 1 到 N，每个数一行。',
      en: 'Read integer N. Print the numbers 1 through N, one per line.'
    },
    knowledge: {
      zh: '<b>循环 = 让程序替你重复。</b><br>Python：<code>for i in range(1, n + 1):</code> —— 注意 <code>range(1, n+1)</code> 含头不含尾，写 <code>range(1, n)</code> 会少最后一圈（出租车界的大忌）。<br>C++：<code>for (int i = 1; i <= n; i++)</code> —— 三段式：初始化；继续条件；每圈动作。',
      en: '<b>Loops = making the program repeat for you.</b><br>Python: <code>for i in range(1, n + 1):</code> — note <code>range</code> includes the start, excludes the end. <code>range(1, n)</code> misses the last lap (a cardinal sin in the cab business).<br>C++: <code>for (int i = 1; i <= n; i++)</code> — init; keep-going condition; per-lap action.'
    },
    starter: {
      py: 'n = int(input())\n# 报数 1..n，每行一个 / count 1..n, one per line\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // 报数 1..n，每行一个 / count 1..n, one per line\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nfor i in range(1, n + 1):\n    print(i)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 1; i <= n; i++) {\n        cout << i << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '3', out: '1\n2\n3' },
      { stdin: '1', out: '1' },
      { stdin: '7', out: '1\n2\n3\n4\n5\n6\n7' }
    ],
    hints: [
      { zh: 'Python: for i in range(1, n + 1)。注意 +1。', en: 'Python: for i in range(1, n + 1). Mind the +1.' },
      { zh: 'C++: for (int i = 1; i <= n; i++)。注意 <=。', en: 'C++: for (int i = 1; i <= n; i++). Mind the <=.' },
      { zh: '循环体内只需要一句 print(i) / cout << i << endl;', en: 'Loop body is just print(i) / cout << i << endl;' }
    ],
    reward: { cash: 260, respect: 20 }
  },

  {
    id: 'd3m2', district: 3, npc: NPC.loopy,
    title: { zh: '行动倒计时', en: 'The Heist Countdown' },
    concept: { zh: '倒序循环', en: 'Counting down' },
    brief: {
      zh: '「今晚有票大的，全队等我车上的倒计时发车。」循环哥神情严肃，「从 N 倒数到 1，然后喊 GO GO GO。上次我口算倒数，数到一半忘了数到哪了，整个车队在路口尬了四分钟。」',
      en: '"Big job tonight. The whole convoy launches on my countdown." Loopy is dead serious. "Count from N down to 1, then yell GO GO GO. Last time I counted in my head, lost track halfway, and the convoy idled at a green light for four minutes. Four."'
    },
    task: {
      zh: '读入 N，从 N 倒数到 1（每行一个），最后输出 <code>GO GO GO</code>。',
      en: 'Read N. Count down from N to 1 (one per line), then print <code>GO GO GO</code>.'
    },
    knowledge: {
      zh: '<b>倒着数也是循环。</b><br>Python：<code>range(n, 0, -1)</code> —— 第三个参数是步长，-1 表示每次减一。<br>C++：<code>for (int i = n; i >= 1; i--)</code> —— <code>i--</code> 就是 i 减 1。<br>循环结束后的代码不缩进（Python）/ 写在循环大括号外面（C++），它只执行一次。',
      en: '<b>Counting down is still a loop.</b><br>Python: <code>range(n, 0, -1)</code> — the third argument is the step; -1 means minus one each lap.<br>C++: <code>for (int i = n; i >= 1; i--)</code> — <code>i--</code> means decrease by 1.<br>Code after the loop (unindented in Python / outside the braces in C++) runs exactly once.'
    },
    starter: {
      py: 'n = int(input())\n# 倒数，然后 GO GO GO / count down, then GO GO GO\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // 倒数，然后 GO GO GO / count down, then GO GO GO\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nfor i in range(n, 0, -1):\n    print(i)\nprint("GO GO GO")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    for (int i = n; i >= 1; i--) {\n        cout << i << endl;\n    }\n    cout << "GO GO GO" << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '3', out: '3\n2\n1\nGO GO GO' },
      { stdin: '5', out: '5\n4\n3\n2\n1\nGO GO GO' },
      { stdin: '1', out: '1\nGO GO GO' }
    ],
    hints: [
      { zh: 'Python 倒序：range(n, 0, -1)。', en: 'Python descending: range(n, 0, -1).' },
      { zh: 'GO GO GO 要在循环外面输出，只输出一次。', en: 'Print GO GO GO outside the loop — exactly once.' },
      { zh: 'Python 里"循环外"= 不缩进。对齐到 for 的开头。', en: '"Outside the loop" in Python = unindented, aligned with the for.' }
    ],
    reward: { cash: 280, respect: 22 }
  },

  {
    id: 'd3m3', district: 3, npc: NPC.loopy,
    title: { zh: '过路费账本', en: 'The Toll Ledger' },
    concept: { zh: '累加器模式', en: 'The accumulator pattern' },
    brief: {
      zh: '「环路上每个路口都收过路费：1号口收 1 块，2号口收 2 块……N号口收 N 块。抢钱呢？对，就是抢钱。」循环哥叹气，「帮我算算跑一整圈要交多少。别用什么数学公式，我要看着它一块一块加 —— 心里才踏实。」',
      en: '"Every gate on the loop charges a toll: gate 1 charges 1, gate 2 charges 2… gate N charges N. Highway robbery? Literally, yes." Loopy sighs. "Total it up for a full lap. No fancy formulas — I want to watch it add up coin by coin. For my soul."'
    },
    task: {
      zh: '读入 N，用循环累加 1+2+...+N，输出总和。（N=100 时应得 5050 —— 高斯小朋友口算的那道题，我们用循环硬算。）',
      en: 'Read N and use a loop to accumulate 1+2+...+N. Print the total. (N=100 gives 5050 — the sum little Gauss did in his head. We brute-force it. Proudly.)'
    },
    knowledge: {
      zh: '<b>累加器模式 = 编程界的存钱罐。</b><br>1. 循环<b>前</b>准备空罐子：<code>total = 0</code><br>2. 循环<b>里</b>往里扔钱：<code>total += i</code>（等价于 <code>total = total + i</code>）<br>3. 循环<b>后</b>砸开看总数：<code>print(total)</code><br>这个三步套路以后会出现一万次，建议焊进肌肉记忆。',
      en: '<b>The accumulator pattern = programming\'s piggy bank.</b><br>1. <b>Before</b> the loop, prepare an empty jar: <code>total = 0</code><br>2. <b>Inside</b>, toss coins in: <code>total += i</code> (same as <code>total = total + i</code>)<br>3. <b>After</b>, crack it open: <code>print(total)</code><br>You will use this three-step move ten thousand more times. Weld it into muscle memory.'
    },
    starter: {
      py: 'n = int(input())\ntotal = 0\n# 循环累加 1..n / accumulate 1..n in a loop\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    int total = 0;\n    // 循环累加 1..n / accumulate 1..n in a loop\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    int total = 0;\n    for (int i = 1; i <= n; i++) {\n        total += i;\n    }\n    cout << total << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '100', out: '5050' },
      { stdin: '1', out: '1' },
      { stdin: '10', out: '55' }
    ],
    hints: [
      { zh: '循环前 total = 0，循环里 total += i。', en: 'total = 0 before the loop, total += i inside.' },
      { zh: 'print(total) 要放在循环外面，不然每圈都报一次账。', en: 'print(total) goes after the loop — or you announce the balance every lap.' },
      { zh: '检查：N=10 应输出 55。', en: 'Sanity check: N=10 should print 55.' }
    ],
    reward: { cash: 300, respect: 24 }
  },

  {
    id: 'd3m4', district: 3, npc: NPC.loopy,
    title: { zh: '鸣笛守则', en: 'The Honk Code' },
    concept: { zh: '循环 + 条件（FizzBuzz）', en: 'Loop + conditionals (FizzBuzz)' },
    brief: {
      zh: '「环路黑话：碰到 3 的倍数按一声喇叭 HONK，5 的倍数踩一脚急刹 SCREECH，又是 3 又是 5 的倍数就 HONKSCREECH —— 别问，问就是传统。」循环哥眨眨眼，「其他数字老实报数。这题面试官超爱考，顺便帮你练了。」',
      en: '"Ring road slang: multiples of 3 get a HONK, multiples of 5 get a SCREECH, multiples of both get HONKSCREECH. Don\'t ask. Tradition." Loopy winks. "Other numbers, just say the number. Interviewers LOVE this one, so consider it a freebie."'
    },
    task: {
      zh: '读入 N，对 1 到 N 的每个数：是 3 和 5 的公倍数输出 <code>HONKSCREECH</code>；只是 3 的倍数输出 <code>HONK</code>；只是 5 的倍数输出 <code>SCREECH</code>；否则输出数字本身。每个一行。',
      en: 'Read N. For each number 1..N: multiple of both 3 and 5 → <code>HONKSCREECH</code>; multiple of 3 → <code>HONK</code>; multiple of 5 → <code>SCREECH</code>; otherwise the number itself. One per line.'
    },
    knowledge: {
      zh: '<b>这就是大名鼎鼎的 FizzBuzz</b>（据传说刷掉过无数自称十年经验的大佬）。<br>关键陷阱：必须<b>先判断"既是3又是5"</b>。如果先判 3 的倍数，15 会在第一关就被拐走，永远到不了 HONKSCREECH。<br>判断倍数：<code>i % 3 == 0</code>（除以 3 余 0）。',
      en: '<b>This is the legendary FizzBuzz</b> (rumored to have eliminated countless "10 years of experience" candidates).<br>The trap: check <b>"both 3 and 5" FIRST</b>. Check 3 first and the number 15 gets kidnapped at the first branch, never reaching HONKSCREECH.<br>Multiple test: <code>i % 3 == 0</code> (remainder 0 when divided by 3).'
    },
    starter: {
      py: 'n = int(input())\nfor i in range(1, n + 1):\n    # 先判断 15 的倍数！/ check multiples of 15 first!\n    pass\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 1; i <= n; i++) {\n        // 先判断 15 的倍数！/ check multiples of 15 first!\n    }\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nfor i in range(1, n + 1):\n    if i % 3 == 0 and i % 5 == 0:\n        print("HONKSCREECH")\n    elif i % 3 == 0:\n        print("HONK")\n    elif i % 5 == 0:\n        print("SCREECH")\n    else:\n        print(i)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 1; i <= n; i++) {\n        if (i % 3 == 0 && i % 5 == 0) {\n            cout << "HONKSCREECH" << endl;\n        } else if (i % 3 == 0) {\n            cout << "HONK" << endl;\n        } else if (i % 5 == 0) {\n            cout << "SCREECH" << endl;\n        } else {\n            cout << i << endl;\n        }\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '15', out: '1\n2\nHONK\n4\nSCREECH\nHONK\n7\n8\nHONK\nSCREECH\n11\nHONK\n13\n14\nHONKSCREECH' },
      { stdin: '5', out: '1\n2\nHONK\n4\nSCREECH' },
      { stdin: '3', out: '1\n2\nHONK' }
    ],
    hints: [
      { zh: '四个分支：15 的倍数 → 3 的倍数 → 5 的倍数 → 其他。顺序不能换。', en: 'Four branches: multiple of 15 → of 3 → of 5 → else. Order is sacred.' },
      { zh: '"既是3又是5的倍数"可以写 i % 3 == 0 and i % 5 == 0，或者 i % 15 == 0。', en: '"Both 3 and 5" is i % 3 == 0 and i % 5 == 0, or simply i % 15 == 0.' },
      { zh: '测试 N=15 时最后一行必须是 HONKSCREECH，否则就是顺序错了。', en: 'With N=15 the last line must be HONKSCREECH; if not, your branch order is wrong.' }
    ],
    reward: { cash: 340, respect: 26 }
  },

  {
    id: 'd3m5', district: 3, npc: NPC.loopy,
    title: { zh: '车库矩阵', en: 'The Parking Matrix' },
    concept: { zh: '嵌套循环', en: 'Nested loops' },
    brief: {
      zh: '「帮车队画个 N×N 的车库平面图，一个星号代表一个车位。」循环哥递给你一支粉笔，「上次让老七画，他画了一个小时画出个五角星。艺术细胞这东西，咱们车队不需要。」',
      en: '"Draw the crew an N×N parking grid, one asterisk per spot." Loopy hands you a piece of chalk. "Last time Lucky Seven tried, he spent an hour and produced one (1) five-pointed star. Artistic talent is not what this crew needs."'
    },
    task: {
      zh: '读入 N，输出 N 行，每行 N 个星号 <code>*</code>（星号之间不留空格）。',
      en: 'Read N. Print N rows, each containing N asterisks <code>*</code> (no spaces between them).'
    },
    knowledge: {
      zh: '<b>嵌套循环 = 循环里再套循环。</b>外层管行，内层管列：外层每走一步，内层完整跑一遍。<br>C++ 经典写法是双层 for + 行末换行。<br>Python 偷懒神技：字符串乘法 <code>"*" * n</code> 直接生成一行 —— 两种都试试，体会一下"勤劳"和"机灵"的区别。',
      en: '<b>Nested loops = a loop inside a loop.</b> Outer handles rows, inner handles columns: each outer step runs the whole inner loop once.<br>C++ does the classic double-for plus a newline per row.<br>Python\'s lazy superpower: string multiplication <code>"*" * n</code> builds a whole row. Try both — feel the difference between "diligent" and "clever".'
    },
    starter: {
      py: 'n = int(input())\n# 输出 n 行，每行 n 个星号 / n rows of n asterisks\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    // 外层管行，内层管列 / outer = rows, inner = columns\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nfor i in range(n):\n    print("*" * n)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 0; i < n; i++) {\n        for (int j = 0; j < n; j++) {\n            cout << "*";\n        }\n        cout << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '3', out: '***\n***\n***' },
      { stdin: '1', out: '*' },
      { stdin: '5', out: '*****\n*****\n*****\n*****\n*****' }
    ],
    hints: [
      { zh: 'C++：内层循环输出 * 不换行，内层结束后再 cout << endl。', en: 'C++: inner loop prints * without newline; print endl after the inner loop ends.' },
      { zh: 'Python 可以直接 print("*" * n) 重复 n 行。', en: 'Python shortcut: print("*" * n), repeated n times.' },
      { zh: '星号之间没有空格，行末也没有多余空格。', en: 'No spaces between asterisks, no trailing spaces.' }
    ],
    reward: { cash: 360, respect: 28 }
  },

  /* ================== District 4: Function District ================== */
  {
    id: 'd4m1', district: 4, npc: NPC.lambda,
    title: { zh: '外包公司', en: 'The Subcontractor' },
    concept: { zh: '定义和调用函数', en: 'Defining & calling functions' },
    brief: {
      zh: '西装姐的办公室在金融区 42 层，名片上只有一个 λ 符号：「大人物从不亲自干活 —— 他们定义流程，然后调用。把『播报特工上岗』做成一个函数，我喊谁的名字，你就调用一次。优雅，永不加班。」',
      en: 'Ms. Lambda\'s office is on floor 42. Her business card holds a single λ. "Big players never do the work themselves — they define a procedure, then call it. Wrap \'announce agent on duty\' in a function. Each name I call, you invoke it once. Elegant. Zero overtime."'
    },
    task: {
      zh: '定义函数 <code>announce(name)</code>，输出 <code>AGENT name ON DUTY</code>。读入两行名字，对每个名字调用一次该函数。',
      en: 'Define a function <code>announce(name)</code> that prints <code>AGENT name ON DUTY</code>. Read two names and call the function for each.'
    },
    knowledge: {
      zh: '<b>函数 = 把一段活儿打包，起个名，随叫随到。</b><br>Python：<pre>def announce(name):\n    print("AGENT", name, "ON DUTY")</pre>C++（注意 void = 不返回东西，只干活）：<pre>void announce(string name) {\n    cout << "AGENT " << name << " ON DUTY" << endl;\n}</pre>定义只是"教会它"，<b>调用</b>（<code>announce("X")</code>）才是"让它干"。教完不调用，等于白教。',
      en: '<b>A function = a chunk of work, packaged and named, on call 24/7.</b><br>Python:<pre>def announce(name):\n    print("AGENT", name, "ON DUTY")</pre>C++ (void = returns nothing, just does the job):<pre>void announce(string name) {\n    cout << "AGENT " << name << " ON DUTY" << endl;\n}</pre>Defining only teaches it. <b>Calling</b> (<code>announce("X")</code>) makes it work. A skill never invoked is a skill wasted.'
    },
    starter: {
      py: '# 定义 announce(name) 函数 / define announce(name)\n\n\nname1 = input()\nname2 = input()\n# 分别调用 / call it for each\n',
      cpp: '#include <iostream>\nusing namespace std;\n\n// 在这里定义 announce 函数 / define announce here\n\n\nint main() {\n    string name1, name2;\n    cin >> name1 >> name2;\n    // 分别调用 / call it for each\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'def announce(name):\n    print("AGENT", name, "ON DUTY")\n\nname1 = input()\nname2 = input()\nannounce(name1)\nannounce(name2)\n',
      cpp: '#include <iostream>\nusing namespace std;\nvoid announce(string name) {\n    cout << "AGENT " << name << " ON DUTY" << endl;\n}\nint main() {\n    string name1, name2;\n    cin >> name1 >> name2;\n    announce(name1);\n    announce(name2);\n    return 0;\n}\n'
    },
    tests: [
      { stdin: 'FOX\nWOLF', out: 'AGENT FOX ON DUTY\nAGENT WOLF ON DUTY' },
      { stdin: 'ALPHA\nOMEGA', out: 'AGENT ALPHA ON DUTY\nAGENT OMEGA ON DUTY' }
    ],
    hints: [
      { zh: 'def announce(name): 定义在前，调用在后。', en: 'def announce(name): — define first, call after.' },
      { zh: '输出格式：AGENT␣名字␣ON DUTY，print 用逗号分隔会自动加空格。', en: 'Format: AGENT␣name␣ON DUTY. Comma-separated print adds the spaces.' },
      { zh: '别忘了调用两次：announce(name1) 和 announce(name2)。', en: "Don't forget both calls: announce(name1) and announce(name2)." }
    ],
    reward: { cash: 400, respect: 30 }
  },

  {
    id: 'd4m2', district: 4, npc: NPC.lambda,
    title: { zh: '清洗汇率', en: 'The Laundromat Rate' },
    concept: { zh: '返回值 return', en: 'Return values' },
    brief: {
      zh: '「金融区的『洗衣店』收 30% 手续费 —— 脏钱进去，干净钱出来，打七折。」西装姐推了推墨镜，「写个函数算净得。注意：是 return 算好的结果给我，不是 print 在屏幕上喊出来。低调，是这个行业的美德。」',
      en: '"The District\'s \'laundromat\' takes a 30% fee — dirty money in, clean money out at 70%." Ms. Lambda adjusts her shades. "Write a function that computes the clean amount. And RETURN the result to me — don\'t print-scream it inside the function. Discretion is a virtue in this trade."'
    },
    task: {
      zh: '定义函数 <code>launder(dirty)</code>，<b>返回</b> <code>dirty * 70 // 100</code>（整数运算）。读入三行金额，对每笔输出清洗后的金额（在函数外面 print）。',
      en: 'Define <code>launder(dirty)</code> that <b>returns</b> <code>dirty * 70 // 100</code> (integer math). Read three amounts; print the laundered value of each (print OUTSIDE the function).'
    },
    knowledge: {
      zh: '<b>print 是大喇叭，return 是保密交接。</b><br>print 只是把值显示给人看，函数本身两手空空；return 把值<b>递回给调用方</b>，调用方可以继续用它运算、存变量、再传给别的函数。<br><code>def f(x): return x * 2</code> 之后，<code>y = f(3)</code> 里的 y 就是 6。新手最经典的翻车：函数里 print 了却没 return，外面拿到一个 None，全场尴尬。',
      en: '<b>print is a megaphone; return is a discreet handoff.</b><br>print only shows a value to humans — the function hands back nothing. return <b>passes the value to the caller</b>, who can keep computing with it, store it, pass it on.<br>After <code>def f(x): return x * 2</code>, the y in <code>y = f(3)</code> is 6. Classic rookie crash: printing inside but forgetting to return — the caller receives None. Awkward silence.'
    },
    starter: {
      py: 'def launder(dirty):\n    # return 清洗后的金额 / return the clean amount\n    pass\n\nfor _ in range(3):\n    amount = int(input())\n    print(launder(amount))\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint launder(int dirty) {\n    // return 清洗后的金额 / return the clean amount\n}\n\nint main() {\n    for (int i = 0; i < 3; i++) {\n        int amount;\n        cin >> amount;\n        cout << launder(amount) << endl;\n    }\n    return 0;\n}\n'
    },
    solution: {
      py: 'def launder(dirty):\n    return dirty * 70 // 100\n\nfor _ in range(3):\n    amount = int(input())\n    print(launder(amount))\n',
      cpp: '#include <iostream>\nusing namespace std;\nint launder(int dirty) {\n    return dirty * 70 / 100;\n}\nint main() {\n    for (int i = 0; i < 3; i++) {\n        int amount;\n        cin >> amount;\n        cout << launder(amount) << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '1000\n500\n12345', out: '700\n350\n8641' },
      { stdin: '100\n1\n99999', out: '70\n0\n69999' }
    ],
    hints: [
      { zh: '函数体一行：return dirty * 70 // 100（C++ 用 /）。', en: 'One-line body: return dirty * 70 // 100 (C++ uses /).' },
      { zh: '先乘 70 再整除 100，顺序反了会精度损失：1 * 70 // 100 = 0 ✓，1 // 100 * 70 = 0 也对但 99 就错了。', en: 'Multiply by 70 BEFORE dividing by 100 — reversed order loses precision for values like 99.' },
      { zh: 'Python 的 pass 是占位符，写好 return 后删掉它。', en: 'The pass is a placeholder — replace it with your return.' }
    ],
    reward: { cash: 440, respect: 32 }
  },

  {
    id: 'd4m3', district: 4, npc: NPC.lambda,
    title: { zh: '三只保险柜', en: 'Three Safes' },
    concept: { zh: '函数组合与比较', en: 'Composing functions' },
    brief: {
      zh: '「线人说目标办公室有三只保险柜，但撤离窗口只够开一只。」西装姐在白板上写下三个数字又迅速擦掉，「写个函数，三个数进去，最大的出来。每次都选错的人，已经不在这个行业了。」',
      en: '"Our informant says the target office has three safes. The exit window is long enough to crack exactly one." Ms. Lambda writes three numbers on the whiteboard and immediately erases them. "Write a function: three numbers in, the biggest out. People who kept picking the wrong safe are no longer in this industry."'
    },
    task: {
      zh: '定义函数 <code>best_safe(a, b, c)</code>，返回三个数中最大的。读入三行整数，输出最大值。（练习用 if 比较实现，不要用内置 max —— 内置的当然能用，但今天是来健身的。）',
      en: 'Define <code>best_safe(a, b, c)</code> returning the largest of the three. Read three integers, print the result. (Practice with if-comparisons rather than the built-in max — yes it exists, but today we lift weights.)'
    },
    knowledge: {
      zh: '<b>找最大值的思路：先立个擂主，再逐个挑战。</b><pre>best = a\nif b > best: best = b\nif c > best: best = c\nreturn best</pre>这个"打擂台"套路对 3 个数、3000 个数都成立 —— 算法的可扩展性比小聪明值钱。',
      en: '<b>Finding a max: crown a champion, then run challengers past it.</b><pre>best = a\nif b > best: best = b\nif c > best: best = c\nreturn best</pre>This "king of the hill" routine works for 3 numbers or 3000 — scalable thinking beats one-off cleverness.'
    },
    starter: {
      py: 'def best_safe(a, b, c):\n    # 打擂台找最大 / king-of-the-hill max\n    pass\n\na = int(input())\nb = int(input())\nc = int(input())\nprint(best_safe(a, b, c))\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint best_safe(int a, int b, int c) {\n    // 打擂台找最大 / king-of-the-hill max\n}\n\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    cout << best_safe(a, b, c) << endl;\n    return 0;\n}\n'
    },
    solution: {
      py: 'def best_safe(a, b, c):\n    best = a\n    if b > best:\n        best = b\n    if c > best:\n        best = c\n    return best\n\na = int(input())\nb = int(input())\nc = int(input())\nprint(best_safe(a, b, c))\n',
      cpp: '#include <iostream>\nusing namespace std;\nint best_safe(int a, int b, int c) {\n    int best = a;\n    if (b > best) best = b;\n    if (c > best) best = c;\n    return best;\n}\nint main() {\n    int a, b, c;\n    cin >> a >> b >> c;\n    cout << best_safe(a, b, c) << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '3000\n9999\n42', out: '9999' },
      { stdin: '7\n7\n7', out: '7' },
      { stdin: '-5\n-2\n-9', out: '-2' }
    ],
    hints: [
      { zh: '先 best = a，然后用两个 if 分别挑战 b 和 c。', en: 'Start best = a, then two ifs let b and c challenge.' },
      { zh: '三个数相等时也要正确返回（任何一个都行）。', en: 'All-equal input must still work (returning any of them is fine).' },
      { zh: '负数也是数 —— 别假设最大值一定是正的。', en: 'Negatives are numbers too — never assume the max is positive.' }
    ],
    reward: { cash: 470, respect: 34 }
  },

  {
    id: 'd4m4', district: 4, npc: NPC.lambda,
    title: { zh: '内鬼探测器', en: 'The Mole Detector' },
    concept: { zh: '布尔返回值 + 循环复用', en: 'Bool returns + reuse in loops' },
    brief: {
      zh: '「行规：双数工号是自己人，单数工号是临时工 —— 出了事临时工顶包，传统艺能了。」西装姐递来一份名单，「写个函数判断工号是不是自己人，然后清点这批人里自己人的数量。」',
      en: '"House rule: even badge numbers are made members, odd ones are temps — and when things go south, the temps take the fall. Tradition." Ms. Lambda hands you a roster. "Write a function that checks a badge, then count how many on this list are made members."'
    },
    task: {
      zh: '定义函数 <code>is_member(badge)</code>，工号为偶数时返回 True/true。先读入 N，再读入 N 个工号，输出自己人（偶数工号）的数量。',
      en: 'Define <code>is_member(badge)</code> returning True/true when the badge is even. Read N, then N badges; print how many are members (even).'
    },
    knowledge: {
      zh: '<b>返回布尔值的函数是最好用的零件。</b><br><code>def is_member(b): return b % 2 == 0</code> —— 注意直接 return 比较表达式，不需要 <code>if x: return True else: return False</code> 这种绕路写法（写了会被同行笑）。<br>配合累加器：<code>if is_member(b): count += 1</code>。函数 + 循环 = 流水线。',
      en: '<b>Bool-returning functions are the handiest building blocks.</b><br><code>def is_member(b): return b % 2 == 0</code> — return the comparison directly; the scenic route <code>if x: return True else: return False</code> gets you laughed at in code review.<br>Pair with an accumulator: <code>if is_member(b): count += 1</code>. Functions + loops = assembly line.'
    },
    starter: {
      py: 'def is_member(badge):\n    # 偶数返回 True / return True for even\n    pass\n\nn = int(input())\ncount = 0\nfor _ in range(n):\n    badge = int(input())\n    # 用 is_member 清点 / count using is_member\nprint(count)\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nbool is_member(int badge) {\n    // 偶数返回 true / return true for even\n}\n\nint main() {\n    int n;\n    cin >> n;\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n        int badge;\n        cin >> badge;\n        // 用 is_member 清点 / count using is_member\n    }\n    cout << count << endl;\n    return 0;\n}\n'
    },
    solution: {
      py: 'def is_member(badge):\n    return badge % 2 == 0\n\nn = int(input())\ncount = 0\nfor _ in range(n):\n    badge = int(input())\n    if is_member(badge):\n        count += 1\nprint(count)\n',
      cpp: '#include <iostream>\nusing namespace std;\nbool is_member(int badge) {\n    return badge % 2 == 0;\n}\nint main() {\n    int n;\n    cin >> n;\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n        int badge;\n        cin >> badge;\n        if (is_member(badge)) {\n            count++;\n        }\n    }\n    cout << count << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '5\n2\n7\n44\n13\n100', out: '3' },
      { stdin: '3\n1\n3\n5', out: '0' },
      { stdin: '4\n2\n4\n6\n8', out: '4' }
    ],
    hints: [
      { zh: '偶数判断：badge % 2 == 0。', en: 'Even check: badge % 2 == 0.' },
      { zh: '函数里直接 return badge % 2 == 0，一行。', en: 'Just return badge % 2 == 0 — one line.' },
      { zh: '循环里 if is_member(badge): count += 1。', en: 'In the loop: if is_member(badge): count += 1.' }
    ],
    reward: { cash: 500, respect: 36 }
  },

  /* ================== District 5: Data Black Market ================== */
  {
    id: 'd5m1', district: 5, npc: NPC.fence,
    title: { zh: '赃物入库', en: 'Stash Intake' },
    concept: { zh: '列表 / vector 基础', en: 'List / vector basics' },
    brief: {
      zh: '收赃佬老黑的店招牌写着「正经二手电器」，牌子是歪的：「今晚到一批货。你登记入库：几件、总值多少、最贵的是哪件 —— 最贵的我留着自己……自己保管。规矩：货单先报数量，再一件件报价。」',
      en: 'Fence\'s shop sign says "Legitimate Second-hand Electronics." The sign hangs crooked. "Shipment tonight. You do intake: how many items, total value, and the priciest one — that one I keep for, uh, safekeeping. Protocol: the manifest gives the count first, then each price."'
    },
    task: {
      zh: '读入 N，再读入 N 个价格（每行一个），存进列表/vector。输出三行：<code>ITEMS: 数量</code>、<code>TOTAL: 总值</code>、<code>TOP: 最大值</code>。',
      en: 'Read N, then N prices (one per line) into a list/vector. Print three lines: <code>ITEMS: count</code>, <code>TOTAL: sum</code>, <code>TOP: max</code>.'
    },
    knowledge: {
      zh: '<b>列表（Python）/ vector（C++）= 能伸缩的仓库货架。</b><br>Python：<code>prices = []</code> 建空架，<code>prices.append(x)</code> 上货，<code>len/sum/max</code> 直接盘库。<br>C++：<code>vector&lt;int&gt; prices;</code> + <code>prices.push_back(x)</code>，盘库要自己循环（或用 <code>v.size()</code>）。<br>变量是单间储物柜，列表是整面柜墙 —— 从此你不用再为 100 件货起 100 个变量名。',
      en: '<b>A list (Python) / vector (C++) = stretchable warehouse shelving.</b><br>Python: <code>prices = []</code> builds the shelf, <code>prices.append(x)</code> stocks it, <code>len/sum/max</code> audit it instantly.<br>C++: <code>vector&lt;int&gt; prices;</code> + <code>prices.push_back(x)</code>; audits take a loop (plus <code>v.size()</code>).<br>A variable is one locker; a list is the whole wall — no more inventing 100 variable names for 100 items.'
    },
    starter: {
      py: 'n = int(input())\nprices = []\nfor _ in range(n):\n    prices.append(int(input()))\n# 输出 ITEMS: / TOTAL: / TOP: 三行\n# print the ITEMS: / TOTAL: / TOP: lines\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> prices;\n    for (int i = 0; i < n; i++) {\n        int p;\n        cin >> p;\n        prices.push_back(p);\n    }\n    // 输出 ITEMS: / TOTAL: / TOP: 三行\n    // print the ITEMS: / TOTAL: / TOP: lines\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nprices = []\nfor _ in range(n):\n    prices.append(int(input()))\nprint("ITEMS:", len(prices))\nprint("TOTAL:", sum(prices))\nprint("TOP:", max(prices))\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    vector<int> prices;\n    for (int i = 0; i < n; i++) {\n        int p;\n        cin >> p;\n        prices.push_back(p);\n    }\n    int total = 0, top = prices[0];\n    for (int i = 0; i < (int)prices.size(); i++) {\n        total += prices[i];\n        if (prices[i] > top) top = prices[i];\n    }\n    cout << "ITEMS: " << prices.size() << endl;\n    cout << "TOTAL: " << total << endl;\n    cout << "TOP: " << top << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '4\n300\n1200\n50\n800', out: 'ITEMS: 4\nTOTAL: 2350\nTOP: 1200' },
      { stdin: '1\n999', out: 'ITEMS: 1\nTOTAL: 999\nTOP: 999' },
      { stdin: '3\n5\n5\n5', out: 'ITEMS: 3\nTOTAL: 15\nTOP: 5' }
    ],
    hints: [
      { zh: 'Python 三连：len(prices)、sum(prices)、max(prices)。', en: 'Python trio: len(prices), sum(prices), max(prices).' },
      { zh: 'C++ 求和与最大值要循环：total += prices[i]，再打擂台。', en: 'C++ needs a loop: total += prices[i], plus king-of-the-hill for max.' },
      { zh: '冒号后有一个空格：ITEMS:␣4。', en: 'One space after each colon: ITEMS:␣4.' }
    ],
    reward: { cash: 550, respect: 38 }
  },

  {
    id: 'd5m2', district: 5, npc: NPC.fence,
    title: { zh: '黑市拍卖行', en: 'The Auction Sort' },
    concept: { zh: '排序', en: 'Sorting' },
    brief: {
      zh: '「拍卖行规矩：便宜的先上场暖气氛，压轴的留最后。」老黑掸了掸西装上并不存在的灰，「把这批货按价格从低到高排好。手排的话，排到天亮；让代码排，眨个眼的事 —— 这就是你们程序员说的『算法』吧？」',
      en: '"Auction house rules: cheap stuff warms up the crowd, the headliner closes the show." Fence brushes nonexistent dust off his jacket. "Sort tonight\'s lot by price, low to high. By hand it takes till sunrise; by code, one blink. That\'s what you coders call an \'algorithm\', eh?"'
    },
    task: {
      zh: '读入 N 和 N 个价格，从低到高排序后逐行输出。',
      en: 'Read N and N prices; sort ascending and print one per line.'
    },
    knowledge: {
      zh: '<b>排序是计算机科学的看家本领，但日常我们站在巨人肩膀上。</b><br>Python：<code>prices.sort()</code> 原地排好。<br>C++：<code>sort(prices.begin(), prices.end());</code>（需要 <code>#include &lt;algorithm&gt;</code>）。<br>巨人肩膀的另一边：手写排序（冒泡、快排）是经典内功，递归塔毕业后值得回来练。',
      en: '<b>Sorting is computer science\'s signature move — but daily life rides on giants\' shoulders.</b><br>Python: <code>prices.sort()</code> sorts in place.<br>C++: <code>sort(prices.begin(), prices.end());</code> (needs <code>#include &lt;algorithm&gt;</code>).<br>The other side of those shoulders: hand-rolling bubble/quick sort is classic kung fu — worth revisiting after you graduate Recursion Tower.'
    },
    starter: {
      py: 'n = int(input())\nprices = []\nfor _ in range(n):\n    prices.append(int(input()))\n# 排序后逐行输出 / sort, then print one per line\n',
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> prices;\n    for (int i = 0; i < n; i++) {\n        int p;\n        cin >> p;\n        prices.push_back(p);\n    }\n    // 排序后逐行输出 / sort, then print one per line\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nprices = []\nfor _ in range(n):\n    prices.append(int(input()))\nprices.sort()\nfor p in prices:\n    print(p)\n',
      cpp: '#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    vector<int> prices;\n    for (int i = 0; i < n; i++) {\n        int p;\n        cin >> p;\n        prices.push_back(p);\n    }\n    sort(prices.begin(), prices.end());\n    for (int i = 0; i < (int)prices.size(); i++) {\n        cout << prices[i] << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '5\n800\n150\n9999\n42\n800', out: '42\n150\n800\n800\n9999' },
      { stdin: '3\n3\n2\n1', out: '1\n2\n3' },
      { stdin: '1\n7', out: '7' }
    ],
    hints: [
      { zh: 'Python: prices.sort()；C++: sort(prices.begin(), prices.end())。', en: 'Python: prices.sort()   C++: sort(prices.begin(), prices.end()).' },
      { zh: '排序之后再循环输出，每行一个。', en: 'Sort first, then loop and print one per line.' },
      { zh: '相同价格的货可以相邻出现，这不是 bug，是同款。', en: 'Duplicate prices appearing next to each other is not a bug. Same model.' }
    ],
    reward: { cash: 580, respect: 40 }
  },

  {
    id: 'd5m3', district: 5, npc: NPC.fence,
    title: { zh: '街头情报', en: 'Word on the Street' },
    concept: { zh: '字符串处理', en: 'String processing' },
    brief: {
      zh: '「线人传话从来含含糊糊、嗓门还小。」老黑把一张皱巴巴的纸条拍在桌上，「你的任务：数清楚这句话几个词（确认暗语长度对不对），然后全部转成大写 —— 方便我贴在墙上看，年纪大了，眼神不好。」',
      en: '"Informants mumble. Always." Fence slaps a crumpled note on the counter. "Your job: count the words in this message (to verify the code-phrase length), then convert the whole thing to UPPERCASE — I pin these on the wall and my eyes are not what they were."'
    },
    task: {
      zh: '读入一行话（单词之间恰好一个空格）。第一行输出单词数，第二行输出全大写的原句。',
      en: 'Read one line (words separated by single spaces). Line 1: the word count. Line 2: the sentence in UPPERCASE.'
    },
    knowledge: {
      zh: '<b>字符串是字符的列表，自带十八般兵器。</b><br>Python：<code>s.split()</code> 按空白切成单词列表，<code>s.upper()</code> 全大写 —— 所以 <code>len(s.split())</code> 就是词数。<br>C++ 要亲力亲为：<code>getline(cin, s)</code> 读整行；数词 = 数空格 + 1；大写 = 逐字符 <code>toupper(s[i])</code>。<br>体会：Python 像点外卖，C++ 像自己下厨 —— 下厨的人最后都更懂吃。',
      en: '<b>A string is a list of characters with a full weapons rack.</b><br>Python: <code>s.split()</code> chops it into words, <code>s.upper()</code> capitalizes — so <code>len(s.split())</code> is the word count.<br>C++ cooks from scratch: <code>getline(cin, s)</code> reads the line; words = spaces + 1; uppercase = per-char <code>toupper(s[i])</code>.<br>Moral: Python orders takeout, C++ cooks at home — and home cooks end up understanding food.'
    },
    starter: {
      py: 'msg = input()\n# 第一行词数，第二行全大写 / word count, then UPPERCASE\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    string msg;\n    getline(cin, msg);\n    // 第一行词数，第二行全大写 / word count, then UPPERCASE\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'msg = input()\nprint(len(msg.split()))\nprint(msg.upper())\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    string msg;\n    getline(cin, msg);\n    int words = 1;\n    for (int i = 0; i < (int)msg.length(); i++) {\n        if (msg[i] == \' \') words++;\n    }\n    cout << words << endl;\n    for (int i = 0; i < (int)msg.length(); i++) {\n        cout << (char)toupper(msg[i]);\n    }\n    cout << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: 'the heat is on', out: '4\nTHE HEAT IS ON' },
      { stdin: 'lay low', out: '2\nLAY LOW' },
      { stdin: 'run', out: '1\nRUN' }
    ],
    hints: [
      { zh: 'Python：len(msg.split()) 和 msg.upper()。', en: 'Python: len(msg.split()) and msg.upper().' },
      { zh: 'C++ 数词：从 1 开始数，每遇到一个空格 +1。', en: 'C++ word count: start at 1, +1 per space found.' },
      { zh: 'C++ 大写：循环里 cout << (char)toupper(msg[i])，注意 (char) 转换。', en: 'C++ uppercase: cout << (char)toupper(msg[i]) — note the (char) cast.' }
    ],
    reward: { cash: 620, respect: 42 }
  },

  {
    id: 'd5m4', district: 5, npc: NPC.fence,
    title: { zh: '车牌回文局', en: 'The Palindrome Plates' },
    concept: { zh: '字符串反转与回文', en: 'Reversal & palindromes' },
    brief: {
      zh: '「城里最近流行『回文车牌』—— 正读反读一个样，玄学说法是警察的车牌识别会被绕晕。」老黑压低声音，「纯属迷信。但客户信，客户就肯加钱。帮我验一批车牌：先给我看倒过来念是什么，再告诉我是不是回文。」',
      en: '"Palindrome plates are the hot thing — read the same both ways. Street legend says they confuse police plate scanners." Fence lowers his voice. "Total superstition. But customers believe it, and believers pay extra. Verify these plates: show me the reversal, then the verdict."'
    },
    task: {
      zh: '读入一个车牌（一个单词）。第一行输出反转后的字符串；第二行：如果正反相同输出 <code>PALINDROME</code>，否则输出 <code>NOT PALINDROME</code>。',
      en: 'Read a plate (one word). Line 1: the reversed string. Line 2: <code>PALINDROME</code> if it reads the same both ways, else <code>NOT PALINDROME</code>.'
    },
    knowledge: {
      zh: '<b>反转字符串的两派功夫：</b><br>Python 切片绝技：<code>s[::-1]</code> —— 步长 -1 表示倒着走完全程，三个字符解决战斗。<br>C++ 老实人写法：从末尾往前循环拼一个新串：<code>for (int i = len-1; i >= 0; i--) rev = rev + s[i];</code><br>回文判定 = 反转后和原串比较是否相等。就这么朴素。',
      en: '<b>Two schools of string reversal:</b><br>Python\'s slicing trick: <code>s[::-1]</code> — step -1 walks the whole string backwards. Three characters, fight over.<br>C++\'s honest way: loop from the end, building a new string: <code>for (int i = len-1; i >= 0; i--) rev = rev + s[i];</code><br>Palindrome check = reverse it and compare with the original. That plain.'
    },
    starter: {
      py: 'plate = input()\n# 输出反转，再判断回文 / print reversal, then the verdict\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    string plate;\n    cin >> plate;\n    // 输出反转，再判断回文 / print reversal, then the verdict\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'plate = input()\nrev = plate[::-1]\nprint(rev)\nif rev == plate:\n    print("PALINDROME")\nelse:\n    print("NOT PALINDROME")\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    string plate;\n    cin >> plate;\n    string rev = "";\n    for (int i = (int)plate.length() - 1; i >= 0; i--) {\n        rev = rev + plate[i];\n    }\n    cout << rev << endl;\n    if (rev == plate) {\n        cout << "PALINDROME" << endl;\n    } else {\n        cout << "NOT PALINDROME" << endl;\n    }\n    return 0;\n}\n'
    },
    tests: [
      { stdin: 'RACECAR', out: 'RACECAR\nPALINDROME' },
      { stdin: 'GTC777', out: '777CTG\nNOT PALINDROME' },
      { stdin: 'ABBA', out: 'ABBA\nPALINDROME' },
      { stdin: 'X', out: 'X\nPALINDROME' }
    ],
    hints: [
      { zh: 'Python 反转：plate[::-1]。', en: 'Python reversal: plate[::-1].' },
      { zh: 'C++ 反转：倒序循环把每个字符接到新字符串后面。', en: 'C++ reversal: loop backwards appending each char to a new string.' },
      { zh: '单个字符（如 X）也是回文 —— 它自己跟自己当然一样。', en: 'A single character (like X) is a palindrome — it equals itself, obviously.' }
    ],
    reward: { cash: 650, respect: 44 }
  },

  /* ================== District 6: Recursion Tower ================== */
  {
    id: 'd6m1', district: 6, npc: NPC.profV,
    title: { zh: '镜厅', en: 'The Hall of Mirrors' },
    concept: { zh: '递归入门：阶乘', en: 'Recursion 101: factorial' },
    brief: {
      zh: 'V教授守在递归塔大门口，眼镜片反着光：「塔里每层楼都长得一模一样，唯一的区别是层数少一层。要算 N 层的『能量』，就得先知道 N-1 层的，而 N-1 层又要 N-2 层的……」他顿了顿，「放心，地下室有出口 —— 递归这玩意儿，<b>没有出口的才叫恐怖故事</b>。」',
      en: 'Prof. V waits at the Tower gate, glasses gleaming. "Every floor of this tower looks identical — except it has one fewer floor above it. To compute floor N\'s \'energy\' you need floor N-1\'s, which needs N-2\'s…" He pauses. "Relax. The basement has an exit. A recursion WITHOUT an exit — now that\'s a horror story."'
    },
    task: {
      zh: '用<b>递归函数</b>计算阶乘：<code>fact(n) = n × fact(n-1)</code>，<code>fact(1) = 1</code>。读入 n（1~15），输出 n 的阶乘。（C++ 注意用 long long，15! 很大。）',
      en: 'Compute the factorial with a <b>recursive function</b>: <code>fact(n) = n × fact(n-1)</code>, <code>fact(1) = 1</code>. Read n (1–15), print n!. (C++: use long long — 15! is huge.)'
    },
    knowledge: {
      zh: '<b>递归 = 函数调用自己。两条铁律：</b><br>1. <b>基线条件（出口）</b>：<code>if n <= 1: return 1</code> —— 必须先写！这是地下室出口。<br>2. <b>每次靠近出口一步</b>：<code>return n * fact(n - 1)</code> —— 参数必须变小。<br>没有出口或不靠近出口 = 无限递归 = 栈溢出 = 程序原地去世。本游戏会拦住你，现实中的服务器不会。',
      en: '<b>Recursion = a function calling itself. Two iron laws:</b><br>1. <b>Base case (the exit)</b>: <code>if n <= 1: return 1</code> — write it FIRST. It is the basement door.<br>2. <b>Every call steps toward the exit</b>: <code>return n * fact(n - 1)</code> — the argument must shrink.<br>No exit, or no progress toward it = infinite recursion = stack overflow = program dies on the spot. This game will catch you. Production servers will not.'
    },
    starter: {
      py: 'def fact(n):\n    # 1. 出口  2. n * fact(n-1)\n    pass\n\nn = int(input())\nprint(fact(n))\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nlong long fact(int n) {\n    // 1. 出口 / base case  2. n * fact(n-1)\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << fact(n) << endl;\n    return 0;\n}\n'
    },
    solution: {
      py: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nn = int(input())\nprint(fact(n))\n',
      cpp: '#include <iostream>\nusing namespace std;\nlong long fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}\nint main() {\n    int n;\n    cin >> n;\n    cout << fact(n) << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '5', out: '120' },
      { stdin: '1', out: '1' },
      { stdin: '10', out: '3628800' },
      { stdin: '15', out: '1307674368000' }
    ],
    hints: [
      { zh: '先写出口：if n <= 1: return 1。', en: 'Write the exit first: if n <= 1: return 1.' },
      { zh: '再写递归步：return n * fact(n - 1)。', en: 'Then the recursive step: return n * fact(n - 1).' },
      { zh: '如果栈溢出了，说明出口没写对 —— 检查是 return 1 而不是 print。', en: 'Stack overflow? Your exit is broken — make sure you RETURN 1, not print it.' }
    ],
    reward: { cash: 800, respect: 50 }
  },

  {
    id: 'd6m2', district: 6, npc: NPC.profV,
    title: { zh: '斐波那契保险库', en: 'The Fibonacci Vault' },
    concept: { zh: '双分支递归', en: 'Two-branch recursion' },
    brief: {
      zh: '「塔中层的保险库用斐波那契锁：每个密码等于前两个密码之和，1、1、2、3、5、8……」V教授敲了敲库门，「传说设计者是只兔子。给你层号 n，算出第 n 个密码。注意这次递归会<b>分裂成两路</b> —— 像谍战片里同时跟踪两个目标。」',
      en: '"The mid-tower vault uses a Fibonacci lock: each code is the sum of the previous two. 1, 1, 2, 3, 5, 8…" Prof. V knocks on the vault door. "Legend says a rabbit designed it. Given floor n, compute the n-th code. Careful: this recursion <b>splits into two branches</b> — like tailing two suspects at once."'
    },
    task: {
      zh: '递归实现 <code>fib(n)</code>：<code>fib(1)=1, fib(2)=1, fib(n)=fib(n-1)+fib(n-2)</code>。读入 n（1~25），输出 fib(n)。',
      en: 'Implement <code>fib(n)</code> recursively: <code>fib(1)=1, fib(2)=1, fib(n)=fib(n-1)+fib(n-2)</code>. Read n (1–25), print fib(n).'
    },
    knowledge: {
      zh: '<b>递归可以同时开好几路。</b><code>fib(n)</code> 派出两个分身：一个去查 <code>fib(n-1)</code>，一个去查 <code>fib(n-2)</code>，回来相加。<br>出口也可以有多个：n 是 1 或 2 都直接 return 1。<br>冷知识：这种写法 n=50 时要算几万亿次，宇宙咖啡都凉了 —— 解决办法叫"记忆化"和"动态规划"，那是塔顶之上的风景，今天先把双分支走稳。',
      en: '<b>Recursion can fork.</b> <code>fib(n)</code> dispatches two clones — one fetches <code>fib(n-1)</code>, the other <code>fib(n-2)</code> — then adds their reports.<br>Multiple exits are fine: both n=1 and n=2 return 1 directly.<br>Trivia: at n=50 this naive version does trillions of calls — the universe\'s coffee goes cold. The fixes are called "memoization" and "dynamic programming": views from above the rooftop. Today, just walk the two branches cleanly.'
    },
    starter: {
      py: 'def fib(n):\n    # 两个出口，两路递归 / two exits, two branches\n    pass\n\nn = int(input())\nprint(fib(n))\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nlong long fib(int n) {\n    // 两个出口，两路递归 / two exits, two branches\n}\n\nint main() {\n    int n;\n    cin >> n;\n    cout << fib(n) << endl;\n    return 0;\n}\n'
    },
    solution: {
      py: 'def fib(n):\n    if n <= 2:\n        return 1\n    return fib(n - 1) + fib(n - 2)\n\nn = int(input())\nprint(fib(n))\n',
      cpp: '#include <iostream>\nusing namespace std;\nlong long fib(int n) {\n    if (n <= 2) return 1;\n    return fib(n - 1) + fib(n - 2);\n}\nint main() {\n    int n;\n    cin >> n;\n    cout << fib(n) << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '1', out: '1' },
      { stdin: '2', out: '1' },
      { stdin: '10', out: '55' },
      { stdin: '20', out: '6765' },
      { stdin: '25', out: '75025' }
    ],
    hints: [
      { zh: '出口：if n <= 2: return 1。', en: 'Exit: if n <= 2: return 1.' },
      { zh: '递归步：return fib(n-1) + fib(n-2)。', en: 'Step: return fib(n-1) + fib(n-2).' },
      { zh: '检查：fib(10) = 55。如果得 89，你的出口多走了一层。', en: 'Check: fib(10) = 55. Got 89? Your exits are off by one floor.' }
    ],
    reward: { cash: 900, respect: 55 }
  },

  {
    id: 'd6m3', district: 6, npc: NPC.profV,
    title: { zh: '汉诺塔越狱', en: 'The Hanoi Breakout' },
    concept: { zh: '多步递归：汉诺塔', en: 'Multi-step recursion: Hanoi' },
    brief: {
      zh: '「塔顶关押着我们的人，看守系统是个汉诺塔锁：N 个盘子从柱 A 全挪到柱 C，每次一个，大盘永远不能压小盘。」V教授深吸一口气，「我年轻时解过 64 层的 —— 骗你的，64 层要五千八百亿年。今晚最多 8 层，动作快。」',
      en: '"Our guy is locked at the top. The warden system is a Tower-of-Hanoi lock: move N disks from peg A to peg C, one at a time, never a big disk on a small one." Prof. V inhales. "I solved a 64-disk one in my youth. Lie. 64 disks takes 580 billion years. Tonight it\'s 8 max. Move."'
    },
    task: {
      zh: '读入 N（1~8）。输出每一步移动，格式 <code>A -> C</code>（盘子从哪根柱到哪根柱），最后一行输出总步数。柱子名固定为 A、B、C，把 N 个盘子从 A 借助 B 移到 C。',
      en: 'Read N (1–8). Print every move as <code>A -> C</code> (from-peg to to-peg), then the total move count on the last line. Pegs are named A, B, C; move N disks from A to C via B.'
    },
    knowledge: {
      zh: '<b>汉诺塔的递归剧本（背下来，受用终身）：</b><br>要把 n 个盘子从 X 经 Y 搬到 Z：<br>1. 先把上面 n-1 个从 X 经 Z 搬到 Y（递归）<br>2. 把最大的那个从 X 直接搬到 Z（输出一步）<br>3. 再把 n-1 个从 Y 经 X 搬到 Z（递归）<br>出口：n=0 时什么都不用做。总步数 = 2ⁿ - 1，这就是"指数爆炸"摸得着的样子。',
      en: '<b>The Hanoi script (memorize it, it pays for life):</b><br>To move n disks from X to Z via Y:<br>1. Move the top n-1 from X to Y via Z (recurse)<br>2. Move the biggest disk X → Z (print one move)<br>3. Move the n-1 from Y to Z via X (recurse)<br>Exit: n=0 does nothing. Total = 2ⁿ - 1 moves — this is what "exponential blowup" feels like in your hands.'
    },
    starter: {
      py: 'moves = 0\n\ndef hanoi(n, src, via, dst):\n    global moves\n    # 出口 n == 0；三步剧本 / exit at n == 0; the 3-step script\n    pass\n\nn = int(input())\nhanoi(n, "A", "B", "C")\nprint(moves)\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint moves = 0;\n\nvoid hanoi(int n, string src, string via, string dst) {\n    // 出口 n == 0；三步剧本 / exit at n == 0; the 3-step script\n}\n\nint main() {\n    int n;\n    cin >> n;\n    hanoi(n, "A", "B", "C");\n    cout << moves << endl;\n    return 0;\n}\n'
    },
    solution: {
      py: 'moves = 0\n\ndef hanoi(n, src, via, dst):\n    global moves\n    if n == 0:\n        return\n    hanoi(n - 1, src, dst, via)\n    print(src + " -> " + dst)\n    moves += 1\n    hanoi(n - 1, via, src, dst)\n\nn = int(input())\nhanoi(n, "A", "B", "C")\nprint(moves)\n',
      cpp: '#include <iostream>\nusing namespace std;\nint moves = 0;\nvoid hanoi(int n, string src, string via, string dst) {\n    if (n == 0) return;\n    hanoi(n - 1, src, dst, via);\n    cout << src << " -> " << dst << endl;\n    moves++;\n    hanoi(n - 1, via, src, dst);\n}\nint main() {\n    int n;\n    cin >> n;\n    hanoi(n, "A", "B", "C");\n    cout << moves << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '1', out: 'A -> C\n1' },
      { stdin: '2', out: 'A -> B\nA -> C\nB -> C\n3' },
      { stdin: '3', out: 'A -> C\nA -> B\nC -> B\nA -> C\nB -> A\nB -> C\nA -> C\n7' }
    ],
    hints: [
      { zh: '三步剧本：hanoi(n-1, src, dst, via) → 输出 src -> dst → hanoi(n-1, via, src, dst)。', en: 'The script: hanoi(n-1, src, dst, via) → print src -> dst → hanoi(n-1, via, src, dst).' },
      { zh: '注意第 1 步和第 3 步里 via/dst 的位置互换了 —— 这正是精髓。', en: 'Note how via/dst swap between steps 1 and 3 — that swap IS the trick.' },
      { zh: '箭头格式是 "A -> C"，箭头两边各一个空格。N=2 应输出 3 步。', en: 'Arrow format is "A -> C" with single spaces. N=2 must yield 3 moves.' }
    ],
    reward: { cash: 1000, respect: 60 }
  },

  {
    id: 'd6m4', district: 6, npc: NPC.boss,
    title: { zh: '最终决战：空指针先生', en: 'Final Boss: Mr. Nullpointer' },
    concept: { zh: '综合运用全部技能', en: 'Everything you have learned' },
    brief: {
      zh: '塔顶。全城的霓虹灯同时熄灭。空指针先生从阴影里走出，他的脸是一段不断崩溃重启的代码：「又一个勇者？之前来的那些，现在都是我防火墙上的装饰品。」他抬手，空中浮现出他的核心数据，「破解我需要你在这座城里学到的<b>一切</b>：循环、判断、容器、还有胆量。来吧，菜鸟 —— 让我看看码德城教会了你什么。」',
      en: 'The rooftop. Every neon light in the city dies at once. Mr. Nullpointer steps out of the shadow, his face an endlessly crash-looping block of code. "Another hero? The previous ones are decorative items on my firewall now." He raises a hand; his core data materializes in the air. "Breaking me requires EVERYTHING this city taught you: loops, branches, containers — and nerve. Come, rookie. Show me what Codegrad City made of you."'
    },
    task: {
      zh: '空指针先生的核心数据：先读入 N，再读入 N 个整数（病毒碎片）。输出四部分：<br>1. <code>SHIELD: 最大值-最小值</code>（护盾值）<br>2. <code>HP: 所有偶数之和</code>（本体血量）<br>3. 倒计时 <code>3</code>、<code>2</code>、<code>1</code>（各一行）<br>4. 最后一行 <code>NULLPOINTER DEFEATED</code>',
      en: 'Mr. Nullpointer\'s core: read N, then N integers (virus shards). Print four parts:<br>1. <code>SHIELD: max-min</code> (his shield)<br>2. <code>HP: sum of the even shards</code> (his health)<br>3. A countdown <code>3</code>, <code>2</code>, <code>1</code> (one per line)<br>4. Final line: <code>NULLPOINTER DEFEATED</code>'
    },
    knowledge: {
      zh: '<b>没有新知识 —— 这就是重点。</b>真实编程从来不是"会不会某个语法"，而是把变量、循环、判断、容器这些积木<b>组合</b>成解法。<br>建议拆解：① 读入存列表 ② 打擂台求最大最小 ③ 累加器筛偶数 ④ 倒序循环 ⑤ 收尾输出。一步一验证，Boss 也只是五个小题拼起来的。',
      en: '<b>No new knowledge — that IS the point.</b> Real programming was never "do you know this syntax"; it is <b>composing</b> variables, loops, branches and containers into a solution.<br>Suggested decomposition: ① read into a list ② king-of-the-hill for max & min ③ accumulator over evens ④ countdown loop ⑤ closing line. Verify step by step — every boss is just five small quests in a trenchcoat.'
    },
    starter: {
      py: 'n = int(input())\nshards = []\nfor _ in range(n):\n    shards.append(int(input()))\n# ① SHIELD ② HP ③ 3 2 1 ④ NULLPOINTER DEFEATED\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    vector<int> shards;\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        shards.push_back(x);\n    }\n    // ① SHIELD ② HP ③ 3 2 1 ④ NULLPOINTER DEFEATED\n\n    return 0;\n}\n'
    },
    solution: {
      py: 'n = int(input())\nshards = []\nfor _ in range(n):\n    shards.append(int(input()))\nshield = max(shards) - min(shards)\nhp = 0\nfor s in shards:\n    if s % 2 == 0:\n        hp += s\nprint("SHIELD:", shield)\nprint("HP:", hp)\nfor i in range(3, 0, -1):\n    print(i)\nprint("NULLPOINTER DEFEATED")\n',
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    vector<int> shards;\n    for (int i = 0; i < n; i++) {\n        int x;\n        cin >> x;\n        shards.push_back(x);\n    }\n    int mx = shards[0], mn = shards[0];\n    int hp = 0;\n    for (int i = 0; i < (int)shards.size(); i++) {\n        if (shards[i] > mx) mx = shards[i];\n        if (shards[i] < mn) mn = shards[i];\n        if (shards[i] % 2 == 0) hp += shards[i];\n    }\n    cout << "SHIELD: " << mx - mn << endl;\n    cout << "HP: " << hp << endl;\n    for (int i = 3; i >= 1; i--) {\n        cout << i << endl;\n    }\n    cout << "NULLPOINTER DEFEATED" << endl;\n    return 0;\n}\n'
    },
    tests: [
      { stdin: '5\n10\n3\n8\n1\n6', out: 'SHIELD: 9\nHP: 24\n3\n2\n1\nNULLPOINTER DEFEATED' },
      { stdin: '3\n7\n7\n7', out: 'SHIELD: 0\nHP: 0\n3\n2\n1\nNULLPOINTER DEFEATED' },
      { stdin: '4\n2\n4\n6\n100', out: 'SHIELD: 98\nHP: 112\n3\n2\n1\nNULLPOINTER DEFEATED' }
    ],
    hints: [
      { zh: '拆成五小步做：SHIELD 用 max - min；HP 只加偶数（s % 2 == 0）。', en: 'Five small steps: SHIELD is max - min; HP sums only evens (s % 2 == 0).' },
      { zh: '全是奇数时 HP 是 0 —— 累加器初始值 0 自动搞定这种情况。', en: 'All-odd input gives HP 0 — your accumulator starting at 0 handles that for free.' },
      { zh: '倒计时是独立的小循环 range(3, 0, -1)，跟 N 无关。', en: 'The countdown is its own little loop range(3, 0, -1) — independent of N.' }
    ],
    reward: { cash: 2000, respect: 100 }
  }
  ];

  /* ---- Black Market shop ---- */
  var shop = {
    themes: [
      { id: 'neon-noir', price: 0, name: { zh: '霓虹黑夜（默认）', en: 'Neon Noir (default)' } },
      { id: 'matrix', price: 800, name: { zh: '黑客帝国绿', en: 'Matrix Green' } },
      { id: 'synthwave', price: 1500, name: { zh: '合成器日落', en: 'Synthwave Sunset' } },
      { id: 'paper', price: 2500, name: { zh: '老派纸质档案', en: 'Old-School Paper' } }
    ],
    titles: [
      { id: 't0', price: 0, name: { zh: '脚本小子', en: 'Script Kiddie' } },
      { id: 't1', price: 500, name: { zh: '街头码农', en: 'Code Mule' } },
      { id: 't2', price: 2000, name: { zh: '精英黑客', en: 'l33t H4x0r' } },
      { id: 't3', price: 5000, name: { zh: '赛博传奇', en: 'Cyber Legend' } }
    ]
  };

  /* ---- Achievements ---- */
  var achievements = [
    { id: 'first-blood', name: { zh: '你好，地下世界', en: 'Hello, Underworld' }, desc: { zh: '完成第一个任务', en: 'Complete your first mission' } },
    { id: 'segfault', name: { zh: '段错误艺术家', en: 'Segfault Artist' }, desc: { zh: '亲手触发一次程序崩溃', en: 'Crash a program with your own hands' } },
    { id: 'most-wanted', name: { zh: '全城通缉', en: 'Most Wanted' }, desc: { zh: 'BUG通缉等级达到 5 星', en: 'Reach a 5-star BUG wanted level' } },
    { id: 'bilingual', name: { zh: '双枪老太婆', en: 'Dual Wielder' }, desc: { zh: '用两种语言分别通关同一个任务', en: 'Beat the same mission in both languages' } },
    { id: 'no-hints', name: { zh: '无证驾驶', en: 'No GPS Needed' }, desc: { zh: '不用任何提示三星通关一个任务', en: 'Earn 3 stars on a mission without hints' } },
    { id: 'shopper', name: { zh: '剁手党', en: 'Big Spender' }, desc: { zh: '在黑市买点什么', en: 'Buy something at the Black Market' } },
    { id: 'city-legend', name: { zh: '城市传说', en: 'City Legend' }, desc: { zh: '通关全部任务', en: 'Complete every mission in the city' } }
  ];

  var api = { districts: districts, missions: missions, shop: shop, achievements: achievements };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GTCLevels = api;
})(typeof window !== 'undefined' ? window : globalThis);
