/* ============================================================
 * 侠盗猎码 Grand Theft Code — 中英双语系统 / i18n
 * ============================================================ */
(function (global) {
  'use strict';

  var STRINGS = {
    /* splash */
    'game.title.zh': '侠盗猎码', 'game.title.en': 'GRAND THEFT CODE',
    'game.subtitle.zh': '码德城欢迎你 —— 在这里，代码就是火力',
    'game.subtitle.en': 'Welcome to Codegrad City — where code is firepower',
    'splash.start.zh': '开始闯荡', 'splash.start.en': 'START THE HUSTLE',
    'splash.continue.zh': '继续上次的活儿', 'splash.continue.en': 'CONTINUE THE JOB',
    'splash.sandbox.zh': '自由练码场', 'splash.sandbox.en': 'FREE CODE GARAGE',
    'splash.langBtn.zh': 'EN', 'splash.langBtn.en': '中文',
    'splash.tip.zh': '一款教你真·Python 和真·C++ 的闯关游戏 · 无需安装 · 离线可玩',
    'splash.tip.en': 'A mission-based game that teaches real Python & real C++ · no install · works offline',

    /* HUD */
    'hud.cash.zh': '现金', 'hud.cash.en': 'CASH',
    'hud.respect.zh': '声望', 'hud.respect.en': 'REP',
    'hud.wanted.zh': 'BUG通缉', 'hud.wanted.en': 'BUG WANTED',
    'hud.map.zh': '城市地图', 'hud.map.en': 'CITY MAP',
    'hud.market.zh': '黑市', 'hud.market.en': 'BLACK MARKET',
    'hud.achv.zh': '成就', 'hud.achv.en': 'BADGES',
    'hud.sandbox.zh': '练码场', 'hud.sandbox.en': 'GARAGE',
    'hud.mute.zh': '音效', 'hud.mute.en': 'SFX',

    /* map */
    'map.title.zh': '码德城 · 选择街区', 'map.title.en': 'CODEGRAD CITY · PICK A DISTRICT',
    'map.locked.zh': '需要声望', 'map.locked.en': 'NEEDS REP',
    'map.missions.zh': '任务', 'map.missions.en': 'MISSIONS',
    'map.enter.zh': '进入街区', 'map.enter.en': 'ENTER',
    'map.progress.zh': '城市进度', 'map.progress.en': 'CITY PROGRESS',

    /* district */
    'district.back.zh': '← 返回地图', 'district.back.en': '← BACK TO MAP',
    'district.done.zh': '已完成', 'district.done.en': 'DONE',

    /* mission */
    'mission.briefing.zh': '任务简报', 'mission.briefing.en': 'BRIEFING',
    'mission.objective.zh': '任务目标', 'mission.objective.en': 'OBJECTIVE',
    'mission.knowledge.zh': '上课时间', 'mission.knowledge.en': 'STREET SCHOOL',
    'mission.examples.zh': '测试样例', 'mission.examples.en': 'TEST DATA',
    'mission.stdin.zh': '输入', 'mission.stdin.en': 'INPUT',
    'mission.stdout.zh': '期望输出', 'mission.stdout.en': 'EXPECTED OUTPUT',
    'mission.noInput.zh': '（本任务无输入）', 'mission.noInput.en': '(no input for this mission)',
    'mission.run.zh': '▶ 试运行', 'mission.run.en': '▶ TEST DRIVE',
    'mission.submit.zh': '⚡ 交活儿', 'mission.submit.en': '⚡ DELIVER THE JOB',
    'mission.hint.zh': '💡 求提示', 'mission.hint.en': '💡 NEED A TIP',
    'mission.bribe.zh': '💰 贿赂老司机看答案 ($300)', 'mission.bribe.en': '💰 BRIBE A VETERAN ($300)',
    'mission.console.zh': '终端输出', 'mission.console.en': 'TERMINAL',
    'mission.customInput.zh': '自定义输入（试运行用）', 'mission.customInput.en': 'CUSTOM INPUT (for test drives)',
    'mission.reset.zh': '↺ 重置代码', 'mission.reset.en': '↺ RESET CODE',
    'mission.running.zh': '运行中…', 'mission.running.en': 'running…',
    'mission.empty.zh': '终端安静得可疑。点「试运行」让它出点声。', 'mission.empty.en': 'The terminal is suspiciously quiet. Hit TEST DRIVE to wake it.',
    'mission.testPass.zh': '✔ 通过', 'mission.testPass.en': '✔ PASS',
    'mission.testFail.zh': '✘ 翻车', 'mission.testFail.en': '✘ CRASHED',
    'mission.expected.zh': '期望', 'mission.expected.en': 'expected',
    'mission.got.zh': '实际', 'mission.got.en': 'got',
    'mission.allPass.zh': '所有测试通过！这活儿干得漂亮。', 'mission.allPass.en': 'All tests passed. Clean job.',
    'mission.someFail.zh': '个测试翻车了。警笛声越来越近……', 'mission.someFail.en': 'test(s) failed. The sirens are getting closer…',
    'mission.hintLeft.zh': '剩余提示', 'mission.hintLeft.en': 'tips left',
    'mission.noHints.zh': '提示用完了。老司机们也只能帮你到这了。', 'mission.noHints.en': 'Out of tips. The veterans have done what they can.',
    'mission.bribeNoCash.zh': '现金不够。老司机摆摆手：「先去赚点钱再谈。」', 'mission.bribeNoCash.en': 'Not enough cash. The veteran waves you off: "Come back with money."',
    'mission.bribeDone.zh': '老司机收下钱，把答案塞给你（本关最多 1 星）',
    'mission.bribeDone.en': 'The veteran pockets the cash and slips you the answer (1 star max this mission)',
    'mission.solutionTitle.zh': '老司机的答案（仅供参考，抄完记得看懂）', 'mission.solutionTitle.en': "Veteran's answer (copy it, then UNDERSTAND it)",

    /* success modal */
    'win.title.zh': '任务完成', 'win.title.en': 'MISSION PASSED',
    'win.reward.zh': '报酬', 'win.reward.en': 'REWARD',
    'win.next.zh': '下一票 →', 'win.next.en': 'NEXT JOB →',
    'win.backMap.zh': '回地图', 'win.backMap.en': 'CITY MAP',
    'win.replay.zh': '换种语言再来一遍', 'win.replay.en': 'REDO IN THE OTHER LANGUAGE',

    /* market */
    'market.title.zh': '黑市 · 只收现金，概不退换', 'market.title.en': 'BLACK MARKET · CASH ONLY, NO REFUNDS',
    'market.themes.zh': '编辑器涂装', 'market.themes.en': 'EDITOR PAINT JOBS',
    'market.titles.zh': '街头头衔', 'market.titles.en': 'STREET TITLES',
    'market.owned.zh': '已入手', 'market.owned.en': 'OWNED',
    'market.use.zh': '装备', 'market.use.en': 'EQUIP',
    'market.using.zh': '使用中', 'market.using.en': 'EQUIPPED',
    'market.buy.zh': '入手', 'market.buy.en': 'BUY',
    'market.poor.zh': '现金不够。黑市不赊账 —— 这是规矩。', 'market.poor.en': 'Not enough cash. The Market does not do credit. House rules.',

    /* achievements */
    'achv.title.zh': '成就墙', 'achv.title.en': 'WALL OF FAME',
    'achv.locked.zh': '？？？', 'achv.locked.en': '???',
    'achv.unlocked.zh': '成就解锁', 'achv.unlocked.en': 'BADGE EARNED',

    /* sandbox */
    'sandbox.title.zh': '自由练码场 · 想写啥写啥', 'sandbox.title.en': 'FREE CODE GARAGE · ANYTHING GOES',
    'sandbox.desc.zh': '没有任务，没有测试，没有警察。两种语言随便造。',
    'sandbox.desc.en': 'No missions. No tests. No cops. Both languages, full throttle.',

    /* wanted */
    'wanted.up.zh': 'BUG通缉等级上升！', 'wanted.up.en': 'BUG WANTED LEVEL UP!',
    'wanted.max.zh': '五星通缉！警车在楼下绕圈 —— 还好他们没有抓 BUG 的搜查令。',
    'wanted.max.en': 'Five stars! Squad cars are circling the block — luckily there is no warrant for bugs.',
    'wanted.clear.zh': '风头过了，通缉解除。', 'wanted.clear.en': 'The heat died down. Wanted level cleared.',

    /* errors friendly tips */
    'err.NameError.zh': '用了一个不存在的名字。变量要先赋值再使用 —— 先交朋友，再借钱。',
    'err.NameError.en': 'You used a name that does not exist. Assign a variable before using it — make friends before borrowing money.',
    'err.SyntaxError.zh': '语法不对，解释器看不懂这句黑话。检查冒号、引号、括号是否成对。',
    'err.SyntaxError.en': 'Bad syntax — the interpreter does not speak this dialect. Check colons, quotes and matching brackets.',
    'err.IndentationError.zh': '缩进乱了。Python 用缩进划地盘，同一层代码必须对齐。',
    'err.IndentationError.en': 'Indentation is off. Python marks turf by indent — same-level code must align.',
    'err.TypeError.zh': '类型不匹配。数字和字符串不能直接相加 —— 先用 str() 或 int() 统一阵营。',
    'err.TypeError.en': 'Type mismatch. Numbers and strings cannot mix directly — unify them with str() or int() first.',
    'err.IndexError.zh': '下标越界了。列表只有 N 个元素时，合法下标是 0 到 N-1。',
    'err.IndexError.en': 'Index out of range. A list of N items accepts indexes 0 through N-1.',
    'err.ZeroDivisionError.zh': '除以零。数学老师和解释器在这件事上立场一致。',
    'err.ZeroDivisionError.en': 'Division by zero. Your math teacher and the interpreter agree on this one.',
    'err.ValueError.zh': '值不对。比如试图把 "abc" 转成数字 —— 它真的不是数字。',
    'err.ValueError.en': 'Bad value. Like converting "abc" to a number — it is, in fact, not a number.',
    'err.TimeoutError.zh': '程序跑了太久 —— 八成是死循环。检查循环条件能不能变成 False。',
    'err.TimeoutError.en': 'Ran too long — probably an infinite loop. Can your loop condition ever become False?',
    'err.RecursionError.zh': '递归没刹住车。检查：出口条件写了吗？每次调用参数变小了吗？',
    'err.RecursionError.en': 'Runaway recursion. Check: did you write a base case? Does the argument shrink every call?',
    'err.EOFError.zh': '想读输入但没有了。检查是不是 input() 调用次数比测试数据行数多。',
    'err.EOFError.en': 'Tried to read input that is not there. Are you calling input() more times than the test provides lines?',
    'err.KeyError.zh': '字典里没有这个键。先用 in 检查，或用 .get() 拿默认值。',
    'err.KeyError.en': 'Key not in the dict. Check with in first, or use .get() for a default.',
    'err.CompileError.zh': '编译失败。C++ 是严格的老派教官：分号、类型、大括号一个都不能少。',
    'err.CompileError.en': 'Compilation failed. C++ is a strict drill sergeant: semicolons, types and braces are all mandatory.',
    'err.LinkError.zh': '链接失败 —— 程序缺少 int main()。每个 C++ 程序都要有 main 当大门。',
    'err.LinkError.en': 'Link failed — no int main(). Every C++ program needs a main as its front door.',
    'err.RuntimeError.zh': '运行时崩溃。看看上面的提示：越界？除零？还是递归失控？',
    'err.RuntimeError.en': 'Runtime crash. Read the message above: out of bounds? divide by zero? runaway recursion?',
    'err.MemoryError.zh': '内存炸了 —— 造的数据太大。检查循环或乘法的规模。',
    'err.MemoryError.en': 'Memory blew up — data too large. Check the scale of your loops or multiplications.',
    'err.InternalError.zh': '解释器自己栽了个跟头（这锅是游戏的）。试试简化代码绕过去。',
    'err.InternalError.en': 'The interpreter itself tripped (this one is on the game). Try simplifying the code.',
    'err.AttributeError.zh': '这个对象没有这个方法。检查拼写，或者它根本不是你以为的类型。',
    'err.AttributeError.en': 'That object has no such method. Check the spelling — or it is not the type you think it is.',

    /* misc */
    'misc.stars.zh': '星级', 'misc.stars.en': 'STARS',
    'misc.langPy.zh': 'Python', 'misc.langPy.en': 'Python',
    'misc.langCpp.zh': 'C++', 'misc.langCpp.en': 'C++',
    'misc.confirmReset.zh': '把代码重置回初始状态？你写的会丢失。', 'misc.confirmReset.en': 'Reset code to the starter? Your edits will be lost.',
    'misc.newGameOver.zh': '检测到旧存档将被覆盖，确定重新开始？', 'misc.newGameOver.en': 'This will overwrite your existing save. Start over?'
  };

  /* success quips, randomly chosen */
  var QUIPS = {
    zh: [
      '老K点点头：「不错，没把楼炸了。」',
      '霓虹妹挑了挑眉：「行啊，比上一个新人强多了 —— 他还在医院。」',
      '循环哥按了一声喇叭表示敬意。HONK。',
      '西装姐在小本本上写了什么。希望是好话。',
      '收赃佬老黑咧嘴一笑，金牙闪了一下。',
      '远处警笛响了一声，又安静了。今晚平安。',
      '你感觉自己离「赛博传奇」又近了一步。也可能是错觉。',
      '编译器今天没有骂你。这是它表达爱的方式。'
    ],
    en: [
      'Old K nods: "Decent. The building is still standing."',
      'Neon raises an eyebrow: "Better than the last rookie. He\'s still hospitalized."',
      'Loopy honks once, respectfully. HONK.',
      'Ms. Lambda writes something in her little notebook. Hopefully something nice.',
      'Fence grins. A gold tooth glints.',
      'A siren wails once in the distance, then goes quiet. Peaceful night.',
      'You feel one step closer to Cyber Legend. Could be an illusion.',
      'The compiler did not insult you today. That is how it shows love.'
    ]
  };

  var lang = 'zh';
  try {
    var saved = global.localStorage && localStorage.getItem('gtc-lang');
    if (saved === 'en' || saved === 'zh') lang = saved;
  } catch (e) { /* no storage */ }

  var api = {
    get lang() { return lang; },
    setLang: function (l) {
      lang = l;
      try { localStorage.setItem('gtc-lang', l); } catch (e) {}
    },
    toggle: function () { api.setLang(lang === 'zh' ? 'en' : 'zh'); return lang; },
    t: function (key) {
      var v = STRINGS[key + '.' + lang];
      if (v !== undefined) return v;
      return STRINGS[key + '.zh'] || key;
    },
    /* pick localized field from a {zh, en} object */
    L: function (obj) {
      if (obj == null) return '';
      if (typeof obj === 'string') return obj;
      return obj[lang] !== undefined ? obj[lang] : obj.zh;
    },
    quip: function () {
      var list = QUIPS[lang];
      return list[Math.floor(Math.random() * list.length)];
    },
    errTip: function (type) {
      var v = STRINGS['err.' + type + '.' + lang];
      return v || '';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GTCI18n = api;
})(typeof window !== 'undefined' ? window : globalThis);
