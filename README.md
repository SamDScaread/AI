# 侠盗猎码 · Grand Theft Code

> 一款用**真·Python** 和**真·C++** 闯关学编程的赛博朋克网页游戏。
> 完全的新手小白能跟着剧情从“Hello World”一路打到递归塔；资深玩家也能在双语言、双解法之间找到乐子。
>
> A cyberpunk browser game that teaches **real Python** and **real C++** through story-driven missions — from absolute beginner to recursion boss fights.

在《侠盗猎码》里，你是初到**码德城（Codegrad City）**的菜鸟。在这座城市，枪没用，**代码才是火力**。你要替形形色色的 NPC 干活——给酒吧当门卫、帮出租车队写计圈器、潜入数据黑市——每一票“活儿”都是一道真实的编程题。代码跑过测试就拿赏金、攒声望、解锁新街区；写出 BUG 就会拉高你的「**BUG 通缉等级**」，警笛响起。

---

## ✨ 特色 / Highlights

- **两套从零自研的解释器**，纯 JavaScript，浏览器里直接安全运行玩家代码，零后端、零网络请求：
  - `js/interp/python.js` — Python 3 教学子集（变量、循环、函数、递归、列表/字典/字符串、f-string、80+ 内置/方法）
  - `js/interp/cpp.js` — C++17 教学子集（`cout`/`cin`、`vector`/`string`、引用参数、递归、`sort`，并**忠实还原** int 截断除法、`%` 符号、`double` 的 `%g` 输出、数组越界“Segmentation fault”等真实语义）
- **6 大街区 · 26 个任务**，从输出/变量一路递进到递归与汉诺塔，最后是 Boss 战「空指针先生」。每个任务都有 NPC 剧情简报、街头课堂讲解、3 级提示、参考答案。
- **中英双语**，一键切换（界面 + 全部剧情文案）。
- **诙谐的犯罪自由世界包装**：分赃计算器、洗钱汇率、后门暗号、回文车牌、FizzBuzz 改成「鸣笛守则」……梗密度拉满。
- **精美赛博霓虹界面**：故障字效、扫描线、霓虹辉光、打字机对白、音效（Web Audio 合成，无音频文件）。
- **游戏化系统**：现金、声望、星级评定、7 个成就、黑市皮肤/头衔商店、BUG 通缉等级、贿赂看答案。
- **自带语法高亮代码编辑器**（行号、智能缩进、括号自动补全），外加无任务限制的「自由练码场」。
- **完全离线可玩、纯静态**，可直接部署到 GitHub Pages。

## 🎮 怎么玩 / Run it

直接用浏览器打开 `index.html` 即可（纯静态，无需构建）。或启动自带的零依赖小服务器：

```bash
npm start          # → http://localhost:8080
# 或 / or
node serve.mjs
```

存档自动保存在浏览器 `localStorage`，随时续上。

## 🗺️ 街区地图 / Districts

| # | 街区 District | 知识点 Concept |
|---|---|---|
| 1 | ⚓ 老码头 The Docks | 输出 · 变量 · 输入 · 运算 |
| 2 | 🌃 霓虹大道 Neon Avenue | 条件判断 · 逻辑运算 |
| 3 | 🛣️ 循环环路 The Loop | 循环 · break/continue · 嵌套 |
| 4 | 🏦 函数金融区 Function District | 函数 · 参数 · 返回值 |
| 5 | 🌑 数据黑市 Data Black Market | 列表/数组 · 排序 · 字符串 |
| 6 | 🗼 递归塔 Recursion Tower | 递归 · 汉诺塔 · 最终 Boss |

## 🧪 测试 / Tests

核心解释器与关卡校验**零依赖**，随时可跑：

```bash
npm test           # Python(83) + C++(76) + 关卡校验(164)
```

关卡校验会把**每个任务的参考答案在两种语言下分别跑过全部测试样例**，确保 26 个任务全部可解、双语一致。

端到端集成测试用 jsdom 驱动真实 DOM（需先 `npm install`）：

```bash
npm run test:integration   # 37 项：导航 → 提交判定 → 经济/星级/成就 → 沙盒/商店/编辑器
```

## 📁 结构 / Structure

```
index.html              入口页面
css/style.css           样式（赛博霓虹 + 4 套可购买皮肤）
js/
  i18n.js               中英双语字符串与本地化
  levels.js             6 街区 / 26 任务 / 商店 / 成就 数据
  editor.js             轻量语法高亮编辑器
  game.js               主游戏逻辑（界面、判题、经济、存档）
  interp/python.js      Python 迷你解释器
  interp/cpp.js         C++ 迷你解释器
tests/                  Python / C++ / 关卡 / 集成 测试
serve.mjs               零依赖静态服务器
```

## 🛠️ 扩展 / Extending

加一个新任务：在 `js/levels.js` 的 `missions` 数组里加一个对象，提供双语 `title/brief/task/knowledge/concept`、`starter`、`solution`、`tests`、3 条 `hints` 和奖励，然后 `npm test` 会自动校验你的参考答案能通过自己的测试。

> 解释器是**教学子集**，刻意不支持类、模块导入、异常处理等高级特性，以保持新手友好和实现可控。错误信息经过精心设计，配合中英双语的“街头课堂”提示帮玩家从崩溃中学习。
