/* ============================================================
 * 侠盗猎码 Grand Theft Code — 内置 C++ 迷你解释器
 * Pure-JS tree-walking interpreter for a teaching subset of C++.
 * Faithful semantics where it matters for learning:
 *   - int division truncates toward zero, % keeps dividend sign
 *   - bool prints as 1/0, double prints %g-style (6 sig digits)
 *   - char arithmetic promotes to int; references (&) share storage
 * Works in browser (window.GTCCpp) and Node (module.exports).
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- Errors ---------------- */
  function CppError(kind, msg, line) { this.cppError = true; this.kind = kind; this.msg = msg; this.line = line || null; }
  function cerr(kind, msg, line) { return new CppError(kind, msg, line); }

  /* ---------------- Lexer ---------------- */
  var KEYWORDS = ['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'string',
    'if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue',
    'true', 'false', 'using', 'namespace', 'std', 'const', 'vector',
    'auto', 'switch', 'case', 'default', 'struct', 'class', 'new', 'delete', 'unsigned', 'signed'];

  var OPS = ['<<=', '>>=', '<<', '>>', '++', '--', '==', '!=', '<=', '>=', '&&', '||',
    '+=', '-=', '*=', '/=', '%=', '::', '->', '(', ')', '[', ']', '{', '}',
    ';', ',', '.', '?', ':', '=', '<', '>', '+', '-', '*', '/', '%', '!', '&', '|', '^', '~'];

  function tokenize(src) {
    var tokens = [];
    var i = 0, line = 1;
    var n = src.length;
    while (i < n) {
      var c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      // preprocessor: skip whole line
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      // comments
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= n) throw cerr('error', 'unterminated /* comment', line);
        i += 2; continue;
      }
      // string literal
      if (c === '"') {
        var j = i + 1, buf = '';
        while (j < n && src[j] !== '"') {
          if (src[j] === '\n') throw cerr('error', 'missing terminating " character', line);
          if (src[j] === '\\') {
            var e = src[j + 1];
            if (e === 'n') buf += '\n';
            else if (e === 't') buf += '\t';
            else if (e === '\\') buf += '\\';
            else if (e === '"') buf += '"';
            else if (e === "'") buf += "'";
            else if (e === '0') buf += '\0';
            else buf += '\\' + e;
            j += 2;
          } else { buf += src[j]; j++; }
        }
        if (j >= n) throw cerr('error', 'missing terminating " character', line);
        tokens.push({ t: 'STRING', v: buf, line: line });
        i = j + 1; continue;
      }
      // char literal
      if (c === "'") {
        var k = i + 1, ch;
        if (src[k] === '\\') {
          var e2 = src[k + 1];
          if (e2 === 'n') ch = 10; else if (e2 === 't') ch = 9;
          else if (e2 === '\\') ch = 92; else if (e2 === "'") ch = 39;
          else if (e2 === '"') ch = 34; else if (e2 === '0') ch = 0;
          else throw cerr('error', "unknown escape sequence '\\" + e2 + "'", line);
          k += 2;
        } else {
          ch = src.charCodeAt(k); k++;
        }
        if (src[k] !== "'") throw cerr('error', 'missing terminating \' character', line);
        tokens.push({ t: 'CHAR', v: ch, line: line });
        i = k + 1; continue;
      }
      // numbers
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        var m = /^(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?[fFlLuU]*/.exec(src.slice(i));
        var txt = m[0];
        var numPart = txt.replace(/[fFlLuU]+$/, '');
        var isFloat = numPart.indexOf('.') >= 0 || /[eE]/.test(numPart) || /[fF]/.test(txt);
        tokens.push({ t: 'NUMBER', v: parseFloat(numPart), float: isFloat, line: line });
        i += txt.length; continue;
      }
      // identifiers / keywords
      if (/[A-Za-z_]/.test(c)) {
        var m2 = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
        var w = m2[0];
        if (KEYWORDS.indexOf(w) >= 0) tokens.push({ t: w, line: line });
        else tokens.push({ t: 'NAME', v: w, line: line });
        i += w.length; continue;
      }
      // operators
      var matched = null;
      for (var oi = 0; oi < OPS.length; oi++) {
        if (src.startsWith(OPS[oi], i)) { matched = OPS[oi]; break; }
      }
      if (matched) { tokens.push({ t: 'OP', v: matched, line: line }); i += matched.length; continue; }
      throw cerr('error', "stray '" + c + "' in program", line);
    }
    tokens.push({ t: 'EOF', line: line });
    return tokens;
  }

  /* ---------------- Parser ---------------- */
  var TYPE_TOKENS = ['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'string', 'vector'];

  function Parser(tokens) { this.toks = tokens; this.pos = 0; }
  Parser.prototype = {
    peek: function (k) { return this.toks[this.pos + (k || 0)]; },
    next: function () { return this.toks[this.pos++]; },
    at: function (t, v) { var tk = this.peek(); return tk.t === t && (v === undefined || tk.v === v); },
    atOp: function (v) { return this.at('OP', v); },
    eat: function (t, v) { if (this.at(t, v)) return this.next(); return null; },
    expect: function (t, v, what) {
      var tk = this.eat(t, v);
      if (!tk) {
        var got = this.peek();
        throw cerr('error', "expected " + (what || ("'" + (v || t) + "'")) + " before '" + (got.v !== undefined ? got.v : got.t) + "'", got.line);
      }
      return tk;
    },
    atType: function () {
      var tk = this.peek();
      if (tk.t === 'const') return TYPE_TOKENS.indexOf(this.peek(1).t) >= 0;
      if (tk.t === 'unsigned' || tk.t === 'signed') return true;
      return TYPE_TOKENS.indexOf(tk.t) >= 0;
    },
    parseType: function () {
      this.eat('const');
      this.eat('unsigned'); this.eat('signed');
      var tk = this.peek();
      if (tk.t === 'vector') {
        this.next();
        this.expect('OP', '<');
        var inner = this.parseType();
        // handle '>>' closing of nested templates by splitting
        if (this.atOp('>>')) { this.toks[this.pos] = { t: 'OP', v: '>', line: this.peek().line }; }
        this.expect('OP', '>');
        return { base: 'vector', elem: inner };
      }
      if (TYPE_TOKENS.indexOf(tk.t) < 0) {
        throw cerr('error', "unknown type name '" + (tk.v || tk.t) + "'", tk.line);
      }
      this.next();
      var base = tk.t;
      if (base === 'long') { this.eat('long'); this.eat('int'); base = 'int'; }
      if (base === 'float') base = 'double';
      this.eat('const');
      return { base: base };
    },
    parseProgram: function () {
      var funcs = {}, globals = [];
      while (!this.at('EOF')) {
        // using namespace std;
        if (this.at('using')) {
          this.next(); this.expect('namespace'); this.expect('std'); this.expect('OP', ';');
          continue;
        }
        if (this.at('struct') || this.at('class')) {
          throw cerr('error', 'struct/class is not supported in this teaching subset (yet!)', this.peek().line);
        }
        if (!this.atType()) {
          var tk = this.peek();
          throw cerr('error', "expected a declaration before '" + (tk.v || tk.t) + "'", tk.line);
        }
        var startLine = this.peek().line;
        var type = this.parseType();
        var name = this.expect('NAME', undefined, 'identifier').v;
        if (this.atOp('(')) {
          // function definition
          this.next();
          var params = [];
          while (!this.atOp(')')) {
            var ptype = this.parseType();
            var ref = !!this.eat('OP', '&');
            var pname = this.expect('NAME', undefined, 'parameter name').v;
            params.push({ type: ptype, name: pname, ref: ref });
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')');
          if (this.eat('OP', ';')) { // forward declaration — ignore
            continue;
          }
          var body = this.parseBlock();
          if (funcs[name]) throw cerr('error', "redefinition of '" + name + "'", startLine);
          funcs[name] = { name: name, ret: type, params: params, body: body, line: startLine };
        } else {
          // global variable declaration(s)
          var decl = this.parseDeclRest(type, name, startLine);
          globals.push(decl);
        }
      }
      return { funcs: funcs, globals: globals };
    },
    parseBlock: function () {
      var tk = this.expect('OP', '{');
      var stmts = [];
      while (!this.atOp('}')) {
        if (this.at('EOF')) throw cerr('error', "expected '}' at end of input", this.peek().line);
        stmts.push(this.parseStmt());
      }
      this.expect('OP', '}');
      return { k: 'Block', body: stmts, line: tk.line };
    },
    parseDeclRest: function (type, firstName, line) {
      // after "type name", parse declarators: [N] | = init  (, name ...)* ;
      var items = [];
      var name = firstName;
      for (;;) {
        var item = { name: name, type: type, init: null, arraySize: null, arrayInit: null };
        if (this.eat('OP', '[')) {
          if (!this.atOp(']')) item.arraySize = this.parseExpr();
          this.expect('OP', ']');
          if (this.eat('OP', '=')) {
            this.expect('OP', '{');
            var inits = [];
            while (!this.atOp('}')) {
              inits.push(this.parseAssignExpr());
              if (!this.eat('OP', ',')) break;
            }
            this.expect('OP', '}');
            item.arrayInit = inits;
          }
        } else if (this.eat('OP', '=')) {
          if (this.atOp('{')) {
            this.next();
            var vinits = [];
            while (!this.atOp('}')) {
              vinits.push(this.parseAssignExpr());
              if (!this.eat('OP', ',')) break;
            }
            this.expect('OP', '}');
            item.arrayInit = vinits; // brace init (vector / array-less)
          } else {
            item.init = this.parseAssignExpr();
          }
        } else if (this.atOp('(')) {
          // constructor-style:  vector<int> v(5);  string s(3, 'x');
          this.next();
          var cargs = [];
          while (!this.atOp(')')) {
            cargs.push(this.parseAssignExpr());
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')');
          item.ctorArgs = cargs;
        }
        items.push(item);
        if (!this.eat('OP', ',')) break;
        name = this.expect('NAME', undefined, 'identifier').v;
      }
      this.expect('OP', ';');
      return { k: 'Decl', items: items, line: line };
    },
    parseStmt: function () {
      var tk = this.peek();
      if (this.atOp('{')) return this.parseBlock();
      if (this.atType()) {
        var line = tk.line;
        var type = this.parseType();
        var name = this.expect('NAME', undefined, 'identifier').v;
        return this.parseDeclRest(type, name, line);
      }
      if (tk.t === 'if') {
        this.next();
        this.expect('OP', '(');
        var test = this.parseExpr();
        this.expect('OP', ')');
        var cons = this.parseStmt();
        var alt = null;
        if (this.eat('else')) alt = this.parseStmt();
        return { k: 'If', test: test, cons: cons, alt: alt, line: tk.line };
      }
      if (tk.t === 'while') {
        this.next();
        this.expect('OP', '(');
        var wt = this.parseExpr();
        this.expect('OP', ')');
        var wb = this.parseStmt();
        return { k: 'While', test: wt, body: wb, line: tk.line };
      }
      if (tk.t === 'do') {
        this.next();
        var db = this.parseStmt();
        this.expect('while');
        this.expect('OP', '(');
        var dt = this.parseExpr();
        this.expect('OP', ')');
        this.expect('OP', ';');
        return { k: 'DoWhile', test: dt, body: db, line: tk.line };
      }
      if (tk.t === 'for') {
        this.next();
        this.expect('OP', '(');
        var init = null;
        if (!this.atOp(';')) {
          if (this.atType()) {
            var fl = this.peek().line;
            var ftype = this.parseType();
            var fname = this.expect('NAME', undefined, 'identifier').v;
            init = this.parseDeclRestNoSemi(ftype, fname, fl);
            this.expect('OP', ';');
          } else {
            init = { k: 'ExprStmt', expr: this.parseExpr(), line: tk.line };
            this.expect('OP', ';');
          }
        } else this.next();
        var cond = null;
        if (!this.atOp(';')) cond = this.parseExpr();
        this.expect('OP', ';');
        var post = null;
        if (!this.atOp(')')) post = this.parseExpr();
        this.expect('OP', ')');
        var fb = this.parseStmt();
        return { k: 'For', init: init, cond: cond, post: post, body: fb, line: tk.line };
      }
      if (tk.t === 'return') {
        this.next();
        var rv = null;
        if (!this.atOp(';')) rv = this.parseExpr();
        this.expect('OP', ';');
        return { k: 'Return', value: rv, line: tk.line };
      }
      if (tk.t === 'break') { this.next(); this.expect('OP', ';'); return { k: 'Break', line: tk.line }; }
      if (tk.t === 'continue') { this.next(); this.expect('OP', ';'); return { k: 'Continue', line: tk.line }; }
      if (tk.t === 'switch') throw cerr('error', 'switch is not supported in this teaching subset — use if/else', tk.line);
      if (this.atOp(';')) { this.next(); return { k: 'Empty', line: tk.line }; }
      var expr = this.parseExpr();
      this.expect('OP', ';', "';'");
      return { k: 'ExprStmt', expr: expr, line: tk.line };
    },
    parseDeclRestNoSemi: function (type, firstName, line) {
      // like parseDeclRest but caller consumes the ';' (for-loop init)
      var items = [];
      var name = firstName;
      for (;;) {
        var item = { name: name, type: type, init: null, arraySize: null, arrayInit: null };
        if (this.eat('OP', '=')) item.init = this.parseAssignExpr();
        items.push(item);
        if (!this.eat('OP', ',')) break;
        name = this.expect('NAME', undefined, 'identifier').v;
      }
      return { k: 'Decl', items: items, line: line };
    },
    /* expressions — C++ precedence */
    parseExpr: function () {
      var e = this.parseAssignExpr();
      while (this.eat('OP', ',')) e = { k: 'Comma', left: e, right: this.parseAssignExpr(), line: e.line };
      return e;
    },
    parseAssignExpr: function () {
      var left = this.parseTernary();
      if (this.at('OP') && ['=', '+=', '-=', '*=', '/=', '%='].indexOf(this.peek().v) >= 0) {
        var op = this.next();
        var right = this.parseAssignExpr();
        return { k: 'Assign', op: op.v, target: left, value: right, line: op.line };
      }
      return left;
    },
    parseTernary: function () {
      var c = this.parseLogicOr();
      if (this.eat('OP', '?')) {
        var a = this.parseAssignExpr();
        this.expect('OP', ':');
        var b = this.parseAssignExpr();
        return { k: 'Ternary', test: c, cons: a, alt: b, line: c.line };
      }
      return c;
    },
    parseLogicOr: function () {
      var l = this.parseLogicAnd();
      while (this.atOp('||')) { var tk = this.next(); l = { k: 'Logic', op: '||', left: l, right: this.parseLogicAnd(), line: tk.line }; }
      return l;
    },
    parseLogicAnd: function () {
      var l = this.parseEquality();
      while (this.atOp('&&')) { var tk = this.next(); l = { k: 'Logic', op: '&&', left: l, right: this.parseEquality(), line: tk.line }; }
      return l;
    },
    parseEquality: function () {
      var l = this.parseRelational();
      while (this.atOp('==') || this.atOp('!=')) {
        var tk = this.next();
        l = { k: 'Bin', op: tk.v, left: l, right: this.parseRelational(), line: tk.line };
      }
      return l;
    },
    parseRelational: function () {
      var l = this.parseShift();
      while (this.atOp('<') || this.atOp('>') || this.atOp('<=') || this.atOp('>=')) {
        var tk = this.next();
        l = { k: 'Bin', op: tk.v, left: l, right: this.parseShift(), line: tk.line };
      }
      return l;
    },
    parseShift: function () {
      var l = this.parseAdditive();
      while (this.atOp('<<') || this.atOp('>>')) {
        var tk = this.next();
        l = { k: 'Shift', op: tk.v, left: l, right: this.parseAdditive(), line: tk.line };
      }
      return l;
    },
    parseAdditive: function () {
      var l = this.parseMultiplicative();
      while (this.atOp('+') || this.atOp('-')) {
        var tk = this.next();
        l = { k: 'Bin', op: tk.v, left: l, right: this.parseMultiplicative(), line: tk.line };
      }
      return l;
    },
    parseMultiplicative: function () {
      var l = this.parseUnary();
      while (this.atOp('*') || this.atOp('/') || this.atOp('%')) {
        var tk = this.next();
        l = { k: 'Bin', op: tk.v, left: l, right: this.parseUnary(), line: tk.line };
      }
      return l;
    },
    parseUnary: function () {
      var tk = this.peek();
      if (this.atOp('!')) { this.next(); return { k: 'Unary', op: '!', operand: this.parseUnary(), line: tk.line }; }
      if (this.atOp('-')) { this.next(); return { k: 'Unary', op: '-', operand: this.parseUnary(), line: tk.line }; }
      if (this.atOp('+')) { this.next(); return this.parseUnary(); }
      if (this.atOp('++') || this.atOp('--')) {
        this.next();
        return { k: 'PreIncDec', op: tk.v, target: this.parseUnary(), line: tk.line };
      }
      // C-style cast: (int)expr  (double)expr  (char)expr
      if (this.atOp('(') && TYPE_TOKENS.indexOf(this.peek(1).t) >= 0 && this.peek(2) && this.peek(2).t === 'OP' && this.peek(2).v === ')') {
        this.next();
        var ct = this.parseType();
        this.expect('OP', ')');
        return { k: 'Cast', type: ct, operand: this.parseUnary(), line: tk.line };
      }
      return this.parsePostfix();
    },
    parsePostfix: function () {
      var e = this.parsePrimary();
      for (;;) {
        if (this.atOp('(')) {
          var tk = this.next();
          var args = [];
          while (!this.atOp(')')) {
            args.push(this.parseAssignExpr());
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')');
          e = { k: 'Call', func: e, args: args, line: tk.line };
        } else if (this.atOp('[')) {
          var tk2 = this.next();
          var idx = this.parseExpr();
          this.expect('OP', ']');
          e = { k: 'Index', obj: e, index: idx, line: tk2.line };
        } else if (this.atOp('.')) {
          var tk3 = this.next();
          var mname = this.expect('NAME', undefined, 'member name').v;
          e = { k: 'Member', obj: e, name: mname, line: tk3.line };
        } else if (this.atOp('++') || this.atOp('--')) {
          var tk4 = this.next();
          e = { k: 'PostIncDec', op: tk4.v, target: e, line: tk4.line };
        } else break;
      }
      return e;
    },
    parsePrimary: function () {
      var tk = this.peek();
      if (tk.t === 'NUMBER') { this.next(); return { k: 'Num', v: tk.v, float: tk.float, line: tk.line }; }
      if (tk.t === 'STRING') { this.next(); return { k: 'Str', v: tk.v, line: tk.line }; }
      if (tk.t === 'CHAR') { this.next(); return { k: 'Char', v: tk.v, line: tk.line }; }
      if (tk.t === 'true') { this.next(); return { k: 'Bool', v: true, line: tk.line }; }
      if (tk.t === 'false') { this.next(); return { k: 'Bool', v: false, line: tk.line }; }
      if (tk.t === 'NAME') { this.next(); return { k: 'Name', id: tk.v, line: tk.line }; }
      if (tk.t === 'std') { // std::xxx
        this.next(); this.expect('OP', '::');
        var nm = this.expect('NAME', undefined, 'name after std::').v;
        return { k: 'Name', id: nm, line: tk.line };
      }
      if (this.atOp('(')) {
        this.next();
        var e = this.parseExpr();
        this.expect('OP', ')');
        return e;
      }
      throw cerr('error', "expected expression before '" + (tk.v !== undefined ? tk.v : tk.t) + "'", tk.line);
    }
  };

  /* ---------------- Runtime values ----------------
   * value := {t:'int'|'double'|'bool'|'char'|'string'|'void', v: ...}
   *        | {t:'array', elem, items:[...raw values...]}
   *        | {t:'vector', elem, items:[...]}
   *        | {t:'cout'} | {t:'cin'} | {t:'endl'}
   */
  function V(t, v) { return { t: t, v: v }; }
  var VOID = { t: 'void', v: undefined };

  function defaultValue(type) {
    if (type.base === 'vector') return { t: 'vector', elem: type.elem, items: [] };
    switch (type.base) {
      case 'int': return V('int', 0);
      case 'double': return V('double', 0);
      case 'bool': return V('bool', false);
      case 'char': return V('char', 0);
      case 'string': return V('string', '');
      default: return VOID;
    }
  }

  function convert(val, base, line) {
    // convert runtime value to declared base type
    if (base === 'vector') return val;
    switch (base) {
      case 'int':
        if (val.t === 'int') return val;
        if (val.t === 'double') return V('int', Math.trunc(val.v));
        if (val.t === 'bool') return V('int', val.v ? 1 : 0);
        if (val.t === 'char') return V('int', val.v);
        break;
      case 'double':
        if (val.t === 'double') return val;
        if (val.t === 'int' || val.t === 'char') return V('double', val.v);
        if (val.t === 'bool') return V('double', val.v ? 1 : 0);
        break;
      case 'bool':
        if (val.t === 'bool') return val;
        if (val.t === 'int' || val.t === 'double' || val.t === 'char') return V('bool', val.v !== 0);
        break;
      case 'char':
        if (val.t === 'char') return val;
        if (val.t === 'int') return V('char', val.v & 255);
        if (val.t === 'string' && val.v.length === 1) return V('char', val.v.charCodeAt(0));
        break;
      case 'string':
        if (val.t === 'string') return val;
        if (val.t === 'char') return V('string', String.fromCharCode(val.v));
        break;
    }
    throw cerr('error', "cannot convert '" + val.t + "' to '" + base + "'", line);
  }

  function numOf(val, line) {
    if (val.t === 'int' || val.t === 'double' || val.t === 'char') return val.v;
    if (val.t === 'bool') return val.v ? 1 : 0;
    throw cerr('error', "expected a numeric value, got '" + val.t + "'", line);
  }
  function isNumT(val) { return val.t === 'int' || val.t === 'double' || val.t === 'char' || val.t === 'bool'; }
  function truthyV(val, line) {
    if (val.t === 'bool') return val.v;
    if (val.t === 'int' || val.t === 'double' || val.t === 'char') return val.v !== 0;
    throw cerr('error', "value of type '" + val.t + "' is not usable as a condition", line);
  }

  function fmtDouble(v) {
    if (v === 0) return '0';
    if (!isFinite(v)) return (v > 0 ? 'inf' : (v < 0 ? '-inf' : 'nan'));
    var exp = Math.floor(Math.log10(Math.abs(v)));
    if (exp < -5 || exp >= 6) {
      var s = v.toExponential(5);
      var parts = s.split('e');
      var mant = parts[0].replace(/\.?0+$/, '');
      var ei = parseInt(parts[1], 10);
      var es = (ei < 0 ? '-' : '+') + String(Math.abs(ei)).padStart(2, '0');
      return mant + 'e' + es;
    }
    var s2 = v.toPrecision(6);
    if (s2.indexOf('.') >= 0) s2 = s2.replace(/0+$/, '').replace(/\.$/, '');
    return s2;
  }

  function displayValue(val, line) {
    switch (val.t) {
      case 'int': return String(val.v);
      case 'double': return fmtDouble(val.v);
      case 'bool': return val.v ? '1' : '0';
      case 'char': return String.fromCharCode(val.v);
      case 'string': return val.v;
      case 'endl': return '\n';
    }
    throw cerr('error', "cannot print a value of type '" + val.t + "' with <<", line);
  }

  /* ---------------- Interpreter ---------------- */
  function Interp(opts) {
    opts = opts || {};
    this.stdout = [];
    this.inputBuf = (opts.stdin == null) ? '' :
      (Array.isArray(opts.stdin) ? opts.stdin.join('\n') : String(opts.stdin));
    this.inputPos = 0;
    this.maxSteps = opts.maxSteps || 2000000;
    this.steps = 0;
    this.funcs = {};
    this.globalScope = new Map();
  }

  function BreakSig() {} function ContinueSig() {}
  function ReturnSig(v) { this.v = v; }

  Interp.prototype.tick = function (line) {
    if (++this.steps > this.maxSteps) {
      throw cerr('runtime', 'your program ran too long — probably an infinite loop', line);
    }
  };
  Interp.prototype.write = function (s) {
    this.stdout.push(s);
    if (this.stdout.length > 60000) throw cerr('runtime', 'too much output (infinite printing loop?)');
  };

  Interp.prototype.readToken = function (line) {
    var b = this.inputBuf;
    while (this.inputPos < b.length && /\s/.test(b[this.inputPos])) this.inputPos++;
    if (this.inputPos >= b.length) throw cerr('runtime', 'cin: no more input available (the mission feeds input via test data)', line);
    var start = this.inputPos;
    while (this.inputPos < b.length && !/\s/.test(b[this.inputPos])) this.inputPos++;
    return b.slice(start, this.inputPos);
  };
  Interp.prototype.readLine = function () {
    var b = this.inputBuf;
    if (this.inputPos >= b.length) return '';
    var nl = b.indexOf('\n', this.inputPos);
    var s;
    if (nl < 0) { s = b.slice(this.inputPos); this.inputPos = b.length; }
    else { s = b.slice(this.inputPos, nl); this.inputPos = nl + 1; }
    return s;
  };

  Interp.prototype.run = function (src) {
    var toks = tokenize(src);
    var prog = new Parser(toks).parseProgram();
    this.funcs = prog.funcs;
    var genv = { vars: this.globalScope, parent: null };
    for (var gi = 0; gi < prog.globals.length; gi++) this.execStmt(prog.globals[gi], genv);
    if (!this.funcs.main) {
      throw cerr('link', "undefined reference to 'main' — every C++ program needs an int main() { }");
    }
    try {
      this.callFunction(this.funcs.main, [], null);
    } catch (e) {
      if (e instanceof ReturnSig) return;
      throw e;
    }
  };

  Interp.prototype.callFunction = function (fn, argNodes, callerEnv, line) {
    var scope = { vars: new Map(), parent: { vars: this.globalScope, parent: null } };
    if (argNodes.length !== fn.params.length) {
      throw cerr('error', "function '" + fn.name + "' expects " + fn.params.length + ' argument(s), got ' + argNodes.length, line);
    }
    for (var i = 0; i < fn.params.length; i++) {
      var p = fn.params[i];
      if (p.ref) {
        var lv = this.evalLValue(argNodes[i], callerEnv);
        if (!lv.box) throw cerr('error', 'cannot bind a reference parameter to this expression — pass a variable', line);
        scope.vars.set(p.name, lv.box);
      } else {
        var raw = this.evalExpr(argNodes[i], callerEnv);
        var conv;
        if (p.type.base === 'vector') {
          if (raw.t !== 'vector' && raw.t !== 'array') throw cerr('error', "expected a vector argument for '" + p.name + "'", line);
          conv = { t: 'vector', elem: p.type.elem, items: raw.items.slice() }; // pass by value = copy
        } else {
          conv = convert(raw, p.type.base, line);
        }
        scope.vars.set(p.name, { val: conv });
      }
    }
    try {
      this.execStmt(fn.body, scope);
    } catch (e) {
      if (e instanceof ReturnSig) {
        if (fn.ret.base === 'void') return VOID;
        if (fn.ret.base === 'vector') return e.v;
        return convert(e.v === undefined || e.v === null ? defaultValue(fn.ret) : e.v, fn.ret.base, fn.line);
      }
      if (e instanceof RangeError) throw cerr('runtime', 'stack overflow — infinite recursion? (check your base case!)', fn.line);
      throw e;
    }
    if (fn.ret.base === 'void' || fn.name === 'main') return VOID;
    throw cerr('runtime', "function '" + fn.name + "' reached the end without a return statement", fn.line);
  };

  Interp.prototype.execStmt = function (s, env) {
    this.tick(s.line);
    switch (s.k) {
      case 'Block': {
        var inner = { vars: new Map(), parent: env };
        for (var i = 0; i < s.body.length; i++) this.execStmt(s.body[i], inner);
        return;
      }
      case 'Decl': {
        for (var d = 0; d < s.items.length; d++) {
          var item = s.items[d];
          if (env.vars.has(item.name)) throw cerr('error', "redeclaration of '" + item.name + "'", s.line);
          var val;
          if (item.arraySize !== null || (item.arrayInit && item.type.base !== 'vector')) {
            // C array
            var size = item.arraySize !== null ? numOf(this.evalExpr(item.arraySize, env), s.line) : item.arrayInit.length;
            if (size < 0 || size > 1000000) throw cerr('runtime', 'array size out of range', s.line);
            var items = new Array(size);
            for (var ai = 0; ai < size; ai++) {
              if (item.arrayInit && ai < item.arrayInit.length) {
                items[ai] = convert(this.evalExpr(item.arrayInit[ai], env), item.type.base, s.line);
              } else {
                items[ai] = defaultValue(item.type);
              }
            }
            val = { t: 'array', elem: item.type.base, items: items };
          } else if (item.type.base === 'vector') {
            var vec = { t: 'vector', elem: item.type.elem, items: [] };
            if (item.arrayInit) {
              for (var vi = 0; vi < item.arrayInit.length; vi++) {
                vec.items.push(convert(this.evalExpr(item.arrayInit[vi], env), item.type.elem.base, s.line));
              }
            } else if (item.ctorArgs && item.ctorArgs.length) {
              var cnt = numOf(this.evalExpr(item.ctorArgs[0], env), s.line);
              if (cnt < 0 || cnt > 1000000) throw cerr('runtime', 'vector size out of range', s.line);
              var fill = item.ctorArgs.length > 1 ? this.evalExpr(item.ctorArgs[1], env) : defaultValue(item.type.elem);
              for (var ci = 0; ci < cnt; ci++) vec.items.push(convert(fill, item.type.elem.base, s.line));
            } else if (item.init) {
              var src = this.evalExpr(item.init, env);
              if (src.t !== 'vector' && src.t !== 'array') throw cerr('error', 'cannot initialize vector from this value', s.line);
              vec.items = src.items.slice();
            }
            val = vec;
          } else {
            if (item.init) {
              val = convert(this.evalExpr(item.init, env), item.type.base, s.line);
            } else if (item.ctorArgs) {
              if (item.type.base === 'string' && item.ctorArgs.length === 2) {
                var rc = numOf(this.evalExpr(item.ctorArgs[0], env), s.line);
                var rch = convert(this.evalExpr(item.ctorArgs[1], env), 'char', s.line);
                val = V('string', String.fromCharCode(rch.v).repeat(Math.max(0, rc)));
              } else if (item.ctorArgs.length === 1) {
                val = convert(this.evalExpr(item.ctorArgs[0], env), item.type.base, s.line);
              } else {
                val = defaultValue(item.type);
              }
            } else {
              val = defaultValue(item.type);
            }
          }
          env.vars.set(item.name, { val: val });
        }
        return;
      }
      case 'ExprStmt': this.evalExpr(s.expr, env); return;
      case 'If':
        if (truthyV(this.evalExpr(s.test, env), s.line)) this.execStmt(s.cons, env);
        else if (s.alt) this.execStmt(s.alt, env);
        return;
      case 'While': {
        while (truthyV(this.evalExpr(s.test, env), s.line)) {
          this.tick(s.line);
          try { this.execStmt(s.body, env); }
          catch (e) { if (e instanceof BreakSig) break; if (e instanceof ContinueSig) continue; throw e; }
        }
        return;
      }
      case 'DoWhile': {
        do {
          this.tick(s.line);
          try { this.execStmt(s.body, env); }
          catch (e) { if (e instanceof BreakSig) break; if (e instanceof ContinueSig) continue; throw e; }
        } while (truthyV(this.evalExpr(s.test, env), s.line));
        return;
      }
      case 'For': {
        var fenv = { vars: new Map(), parent: env };
        if (s.init) this.execStmt(s.init, fenv);
        for (;;) {
          this.tick(s.line);
          if (s.cond && !truthyV(this.evalExpr(s.cond, fenv), s.line)) break;
          try { this.execStmt(s.body, fenv); }
          catch (e) {
            if (e instanceof BreakSig) break;
            if (!(e instanceof ContinueSig)) throw e;
          }
          if (s.post) this.evalExpr(s.post, fenv);
        }
        return;
      }
      case 'Return': {
        var rv = s.value ? this.evalExpr(s.value, env) : undefined;
        throw new ReturnSig(rv);
      }
      case 'Break': throw new BreakSig();
      case 'Continue': throw new ContinueSig();
      case 'Empty': return;
    }
    throw cerr('runtime', 'unknown statement', s.line);
  };

  Interp.prototype.lookupBox = function (env, name, line) {
    var e = env;
    while (e) {
      if (e.vars.has(name)) return e.vars.get(name);
      e = e.parent;
    }
    throw cerr('error', "'" + name + "' was not declared in this scope", line);
  };

  Interp.prototype.evalLValue = function (e, env) {
    if (e.k === 'Name') {
      var box = this.lookupBox(env, e.id, e.line);
      return {
        box: box,
        get: function () { return box.val; },
        set: function (v) { box.val = v; }
      };
    }
    if (e.k === 'Index') {
      var cont = this.evalExpr(e.obj, env);
      var idx = numOf(this.evalExpr(e.index, env), e.line);
      var self = this;
      if (cont.t === 'array' || cont.t === 'vector') {
        if (!Number.isInteger(idx) || idx < 0 || idx >= cont.items.length) {
          throw cerr('runtime', 'Segmentation fault (core dumped) — index ' + idx + ' is out of bounds [0, ' + (cont.items.length - 1) + ']', e.line);
        }
        var base = (cont.t === 'array') ? cont.elem : cont.elem.base;
        return {
          box: { get val() { return cont.items[idx]; }, set val(v) { cont.items[idx] = v; } },
          get: function () { return cont.items[idx]; },
          set: function (v) { cont.items[idx] = convert(v, base, e.line); }
        };
      }
      if (cont.t === 'string') {
        // need the underlying box to mutate the string
        var slv = this.evalLValue(e.obj, env);
        if (idx < 0 || idx >= cont.v.length) {
          throw cerr('runtime', 'Segmentation fault (core dumped) — string index ' + idx + ' out of bounds', e.line);
        }
        return {
          box: null,
          get: function () { return V('char', slv.get().v.charCodeAt(idx)); },
          set: function (v) {
            var ch = convert(v, 'char', e.line);
            var sv = slv.get().v;
            slv.set(V('string', sv.slice(0, idx) + String.fromCharCode(ch.v) + sv.slice(idx + 1)));
          }
        };
      }
      throw cerr('error', "cannot index a value of type '" + cont.t + "'", e.line);
    }
    // not an lvalue — evaluate as rvalue
    var v = this.evalExpr(e, env);
    return { box: null, get: function () { return v; }, set: function () { throw cerr('error', 'lvalue required as left operand of assignment', e.line); } };
  };

  Interp.prototype.evalExpr = function (e, env) {
    this.tick(e.line);
    switch (e.k) {
      case 'Num': return e.float ? V('double', e.v) : V('int', e.v);
      case 'Str': return V('string', e.v);
      case 'Char': return V('char', e.v);
      case 'Bool': return V('bool', e.v);
      case 'Name': {
        if (e.id === 'cout') return { t: 'cout' };
        if (e.id === 'cin') return { t: 'cin' };
        if (e.id === 'endl') return { t: 'endl' };
        var box = null;
        var env2 = env;
        while (env2) { if (env2.vars.has(e.id)) { box = env2.vars.get(e.id); break; } env2 = env2.parent; }
        if (box) return box.val;
        if (this.funcs[e.id]) return { t: 'func', fn: this.funcs[e.id] };
        if (BUILTINS.indexOf(e.id) >= 0) return { t: 'builtin', name: e.id };
        throw cerr('error', "'" + e.id + "' was not declared in this scope", e.line);
      }
      case 'Comma': { this.evalExpr(e.left, env); return this.evalExpr(e.right, env); }
      case 'Assign': {
        var lv = this.evalLValue(e.target, env);
        var cur = null;
        var rhs = this.evalExpr(e.value, env);
        if (e.op === '=') {
          var curVal = lv.get();
          var nv = this.coerceAssign(curVal, rhs, e.line);
          lv.set(nv);
          return nv;
        }
        cur = lv.get();
        var binop = e.op.slice(0, 1);
        var result = this.binNumeric(binop, cur, rhs, e.line, true);
        var conv = this.coerceAssign(cur, result, e.line);
        lv.set(conv);
        return conv;
      }
      case 'Ternary': return truthyV(this.evalExpr(e.test, env), e.line) ? this.evalExpr(e.cons, env) : this.evalExpr(e.alt, env);
      case 'Logic': {
        var l = truthyV(this.evalExpr(e.left, env), e.line);
        if (e.op === '&&') return V('bool', l && truthyV(this.evalExpr(e.right, env), e.line));
        return V('bool', l || truthyV(this.evalExpr(e.right, env), e.line));
      }
      case 'Bin': return this.binNumeric(e.op, this.evalExpr(e.left, env), this.evalExpr(e.right, env), e.line, false);
      case 'Shift': {
        var left = this.evalExpr(e.left, env);
        if (left.t === 'cout') {
          var out = this.evalExpr(e.right, env);
          this.write(displayValue(out, e.line));
          return left;
        }
        if (left.t === 'cin') {
          if (e.op !== '>>') throw cerr('error', "use 'cin >> variable' to read input", e.line);
          var lvi = this.evalLValue(e.right, env);
          var target = lvi.get();
          this.readInto(lvi, target, e.line);
          return left;
        }
        // integer bit shifts
        var a = numOf(left, e.line), b = numOf(this.evalExpr(e.right, env), e.line);
        return V('int', e.op === '<<' ? (a << b) : (a >> b));
      }
      case 'Unary': {
        var o = this.evalExpr(e.operand, env);
        if (e.op === '!') return V('bool', !truthyV(o, e.line));
        if (e.op === '-') {
          if (o.t === 'double') return V('double', -o.v);
          return V('int', -numOf(o, e.line));
        }
        break;
      }
      case 'PreIncDec': {
        var plv = this.evalLValue(e.target, env);
        var pv = plv.get();
        var delta = e.op === '++' ? 1 : -1;
        var nv2 = (pv.t === 'double') ? V('double', pv.v + delta) :
          (pv.t === 'char') ? V('char', pv.v + delta) : V('int', numOf(pv, e.line) + delta);
        plv.set(nv2);
        return nv2;
      }
      case 'PostIncDec': {
        var qlv = this.evalLValue(e.target, env);
        var qv = qlv.get();
        var d2 = e.op === '++' ? 1 : -1;
        var nv3 = (qv.t === 'double') ? V('double', qv.v + d2) :
          (qv.t === 'char') ? V('char', qv.v + d2) : V('int', numOf(qv, e.line) + d2);
        qlv.set(nv3);
        return qv;
      }
      case 'Cast': {
        var cv = this.evalExpr(e.operand, env);
        return convert(cv, e.type.base, e.line);
      }
      case 'Index': {
        var lvx = this.evalLValue(e, env);
        return lvx.get();
      }
      case 'Member': {
        // value-returning members handled in Call; bare member access is an error
        throw cerr('error', "expected '(' after member '" + e.name + "'", e.line);
      }
      case 'Call': return this.evalCall(e, env);
    }
    throw cerr('runtime', 'cannot evaluate expression', e.line);
  };

  Interp.prototype.coerceAssign = function (curVal, rhs, line) {
    if (curVal.t === 'vector') {
      if (rhs.t !== 'vector' && rhs.t !== 'array') throw cerr('error', 'cannot assign this value to a vector', line);
      return { t: 'vector', elem: curVal.elem, items: rhs.items.slice() };
    }
    if (curVal.t === 'array') throw cerr('error', 'arrays cannot be assigned as a whole — copy element by element', line);
    if (curVal.t === 'string') {
      if (rhs.t === 'string') return rhs;
      if (rhs.t === 'char') return V('string', String.fromCharCode(rhs.v));
      throw cerr('error', "cannot assign '" + rhs.t + "' to a string", line);
    }
    return convert(rhs, curVal.t, line);
  };

  Interp.prototype.binNumeric = function (op, a, b, line, isCompound) {
    // string ops
    if (a.t === 'string' || b.t === 'string') {
      if (op === '+') {
        var as = (a.t === 'string') ? a.v : (a.t === 'char' ? String.fromCharCode(a.v) : null);
        var bs = (b.t === 'string') ? b.v : (b.t === 'char' ? String.fromCharCode(b.v) : null);
        if (as === null || bs === null) {
          throw cerr('error', "cannot add '" + (as === null ? a.t : b.t) + "' to a string — use to_string(...) for numbers", line);
        }
        if (as.length + bs.length > 1000000) throw cerr('runtime', 'string too long', line);
        return V('string', as + bs);
      }
      if (['==', '!=', '<', '>', '<=', '>='].indexOf(op) >= 0 && a.t === 'string' && b.t === 'string') {
        var c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
        return V('bool', op === '==' ? c === 0 : op === '!=' ? c !== 0 : op === '<' ? c < 0 : op === '>' ? c > 0 : op === '<=' ? c <= 0 : c >= 0);
      }
      throw cerr('error', "invalid operands of types '" + a.t + "' and '" + b.t + "' to operator " + op, line);
    }
    var x = numOf(a, line), y = numOf(b, line);
    var dbl = (a.t === 'double' || b.t === 'double');
    switch (op) {
      case '+': return dbl ? V('double', x + y) : V('int', x + y);
      case '-': return dbl ? V('double', x - y) : V('int', x - y);
      case '*': return dbl ? V('double', x * y) : V('int', x * y);
      case '/':
        if (!dbl) {
          if (y === 0) throw cerr('runtime', 'Floating point exception (core dumped) — integer division by zero', line);
          return V('int', Math.trunc(x / y));
        }
        return V('double', x / y); // double/0 -> inf, like real C++
      case '%':
        if (dbl) throw cerr('error', "invalid operands of type 'double' to operator % — use fmod, or stick to ints", line);
        if (y === 0) throw cerr('runtime', 'Floating point exception (core dumped) — modulo by zero', line);
        return V('int', x % y); // JS % matches C++ truncation semantics
      case '==': return V('bool', x === y);
      case '!=': return V('bool', x !== y);
      case '<': return V('bool', x < y);
      case '>': return V('bool', x > y);
      case '<=': return V('bool', x <= y);
      case '>=': return V('bool', x >= y);
    }
    throw cerr('error', 'unsupported operator ' + op, line);
  };

  Interp.prototype.readInto = function (lv, target, line) {
    if (target.t === 'int') {
      var tok = this.readToken(line);
      var iv = parseInt(tok, 10);
      if (isNaN(iv)) throw cerr('runtime', "cin: could not read an int from input '" + tok + "'", line);
      lv.set(V('int', iv));
    } else if (target.t === 'double') {
      var tok2 = this.readToken(line);
      var dv = parseFloat(tok2);
      if (isNaN(dv)) throw cerr('runtime', "cin: could not read a double from input '" + tok2 + "'", line);
      lv.set(V('double', dv));
    } else if (target.t === 'string') {
      lv.set(V('string', this.readToken(line)));
    } else if (target.t === 'char') {
      var b = this.inputBuf;
      while (this.inputPos < b.length && /\s/.test(b[this.inputPos])) this.inputPos++;
      if (this.inputPos >= b.length) throw cerr('runtime', 'cin: no more input available', line);
      lv.set(V('char', b.charCodeAt(this.inputPos)));
      this.inputPos++;
    } else if (target.t === 'bool') {
      var tok3 = this.readToken(line);
      lv.set(V('bool', tok3 !== '0'));
    } else {
      throw cerr('error', "cin cannot read into a value of type '" + target.t + "'", line);
    }
  };

  var BUILTINS = ['to_string', 'stoi', 'stod', 'abs', 'max', 'min', 'swap', 'sqrt', 'pow',
    'floor', 'ceil', 'round', 'getline', 'fmod', 'tolower', 'toupper', 'isdigit', 'isalpha',
    'sort', 'reverse'];

  Interp.prototype.evalCall = function (e, env) {
    var fexpr = e.func;
    // member calls: obj.method(args)
    if (fexpr.k === 'Member') {
      return this.evalMemberCall(fexpr, e.args, env, e.line);
    }
    if (fexpr.k === 'Name') {
      var name = fexpr.id;
      if (this.funcs[name]) return this.callFunction(this.funcs[name], e.args, env, e.line);
      if (BUILTINS.indexOf(name) >= 0) return this.callBuiltin(name, e, env);
      throw cerr('error', "'" + name + "' was not declared in this scope" +
        (name === 'printf' || name === 'scanf' ? " — this game speaks C++ streams: use cout << / cin >>" : ''), e.line);
    }
    throw cerr('error', 'called object is not a function', e.line);
  };

  Interp.prototype.evalMemberCall = function (fexpr, argNodes, env, line) {
    var obj = this.evalExpr(fexpr.obj, env);
    var name = fexpr.name;
    var args = [];
    for (var i = 0; i < argNodes.length; i++) args.push(this.evalExpr(argNodes[i], env));
    if (obj.t === 'string') {
      switch (name) {
        case 'length': case 'size': return V('int', obj.v.length);
        case 'empty': return V('bool', obj.v.length === 0);
        case 'substr': {
          var pos = args.length > 0 ? numOf(args[0], line) : 0;
          if (pos < 0 || pos > obj.v.length) throw cerr('runtime', 'substr: position out of range', line);
          var len = args.length > 1 ? numOf(args[1], line) : obj.v.length - pos;
          return V('string', obj.v.substr(pos, len));
        }
        case 'at': {
          var ai = numOf(args[0], line);
          if (ai < 0 || ai >= obj.v.length) throw cerr('runtime', 'string::at: index out of range', line);
          return V('char', obj.v.charCodeAt(ai));
        }
        case 'find': {
          var needle = args[0].t === 'char' ? String.fromCharCode(args[0].v) : args[0].v;
          var fi = obj.v.indexOf(needle, args.length > 1 ? numOf(args[1], line) : 0);
          return V('int', fi); // simplification: -1 instead of string::npos
        }
        case 'push_back': {
          var slv2 = this.evalLValue(fexpr.obj, env);
          var chv = convert(args[0], 'char', line);
          slv2.set(V('string', slv2.get().v + String.fromCharCode(chv.v)));
          return VOID;
        }
      }
      throw cerr('error', "'string' has no member named '" + name + "' (in this teaching subset)", line);
    }
    if (obj.t === 'vector') {
      switch (name) {
        case 'push_back': obj.items.push(convert(args[0], obj.elem.base, line)); return VOID;
        case 'pop_back':
          if (!obj.items.length) throw cerr('runtime', 'pop_back on empty vector', line);
          obj.items.pop(); return VOID;
        case 'size': return V('int', obj.items.length);
        case 'empty': return V('bool', obj.items.length === 0);
        case 'clear': obj.items.length = 0; return VOID;
        case 'front':
          if (!obj.items.length) throw cerr('runtime', 'front() on empty vector', line);
          return obj.items[0];
        case 'back':
          if (!obj.items.length) throw cerr('runtime', 'back() on empty vector', line);
          return obj.items[obj.items.length - 1];
        case 'at': {
          var vi = numOf(args[0], line);
          if (vi < 0 || vi >= obj.items.length) throw cerr('runtime', 'vector::at: index ' + vi + ' out of range', line);
          return obj.items[vi];
        }
        case 'begin': case 'end': return { t: 'iter', vec: obj, kind: name };
      }
      throw cerr('error', "'vector' has no member named '" + name + "' (in this teaching subset)", line);
    }
    if (obj.t === 'array' && (name === 'size' || name === 'length')) {
      return V('int', obj.items.length);
    }
    throw cerr('error', "request for member '" + name + "' in something not a class type", line);
  };

  Interp.prototype.callBuiltin = function (name, e, env) {
    var line = e.line;
    var self = this;
    function arg(i) { return self.evalExpr(e.args[i], env); }
    switch (name) {
      case 'getline': {
        // getline(cin, s)
        if (e.args.length !== 2) throw cerr('error', 'getline expects (cin, string_variable)', line);
        var first = this.evalExpr(e.args[0], env);
        if (first.t !== 'cin') throw cerr('error', 'getline expects cin as its first argument', line);
        var lv = this.evalLValue(e.args[1], env);
        // consume leading newline left by cin >> (real C++ behaviour)
        if (this.inputBuf[this.inputPos] === '\n') this.inputPos++;
        lv.set(V('string', this.readLine()));
        return first;
      }
      case 'to_string': {
        var tv = arg(0);
        if (tv.t === 'double') return V('string', String(tv.v)); // close enough for teaching (real C++ pads zeros)
        return V('string', String(numOf(tv, line)));
      }
      case 'stoi': {
        var sv = arg(0);
        if (sv.t !== 'string') throw cerr('error', 'stoi expects a string', line);
        var m = /^\s*[+-]?\d+/.exec(sv.v);
        if (!m) throw cerr('runtime', 'stoi: invalid argument', line);
        return V('int', parseInt(m[0], 10));
      }
      case 'stod': {
        var sv2 = arg(0);
        if (sv2.t !== 'string') throw cerr('error', 'stod expects a string', line);
        var d = parseFloat(sv2.v);
        if (isNaN(d)) throw cerr('runtime', 'stod: invalid argument', line);
        return V('double', d);
      }
      case 'abs': {
        var av = arg(0);
        if (av.t === 'double') return V('double', Math.abs(av.v));
        return V('int', Math.abs(numOf(av, line)));
      }
      case 'max': case 'min': {
        var a1 = arg(0), a2 = arg(1);
        if (a1.t === 'string' && a2.t === 'string') {
          var pick = (name === 'max') === (a1.v > a2.v) ? a1 : a2;
          return pick;
        }
        var x = numOf(a1, line), y = numOf(a2, line);
        var dbl = a1.t === 'double' || a2.t === 'double';
        var r = name === 'max' ? Math.max(x, y) : Math.min(x, y);
        return dbl ? V('double', r) : V('int', r);
      }
      case 'swap': {
        var l1 = this.evalLValue(e.args[0], env);
        var l2 = this.evalLValue(e.args[1], env);
        var t1 = l1.get(), t2 = l2.get();
        l1.set(t2); l2.set(t1);
        return VOID;
      }
      case 'sort': case 'reverse': {
        var it1 = arg(0), it2 = arg(1);
        if (it1.t !== 'iter' || it2.t !== 'iter' || it1.vec !== it2.vec || it1.kind !== 'begin' || it2.kind !== 'end') {
          throw cerr('error', name + ' expects (v.begin(), v.end()) on the same vector', line);
        }
        if (name === 'sort') {
          it1.vec.items.sort(function (a, b) {
            if (a.t === 'string') return a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
            return a.v - b.v;
          });
        } else {
          it1.vec.items.reverse();
        }
        return VOID;
      }
      case 'sqrt': return V('double', Math.sqrt(numOf(arg(0), line)));
      case 'pow': return V('double', Math.pow(numOf(arg(0), line), numOf(arg(1), line)));
      case 'floor': return V('double', Math.floor(numOf(arg(0), line)));
      case 'ceil': return V('double', Math.ceil(numOf(arg(0), line)));
      case 'round': return V('double', Math.round(numOf(arg(0), line)));
      case 'fmod': {
        var fa = numOf(arg(0), line), fb = numOf(arg(1), line);
        return V('double', fa % fb);
      }
      case 'tolower': {
        var c1 = convert(arg(0), 'char', line);
        return V('char', String.fromCharCode(c1.v).toLowerCase().charCodeAt(0));
      }
      case 'toupper': {
        var c2 = convert(arg(0), 'char', line);
        return V('char', String.fromCharCode(c2.v).toUpperCase().charCodeAt(0));
      }
      case 'isdigit': {
        var c3 = convert(arg(0), 'char', line);
        return V('bool', c3.v >= 48 && c3.v <= 57);
      }
      case 'isalpha': {
        var c4 = convert(arg(0), 'char', line);
        var ch = String.fromCharCode(c4.v);
        return V('bool', /[A-Za-z]/.test(ch));
      }
    }
    throw cerr('error', "builtin '" + name + "' missing", line);
  };

  /* ---------------- Public API ---------------- */
  function run(source, opts) {
    opts = opts || {};
    var interp = new Interp(opts);
    var result = { stdout: '', error: null };
    try {
      interp.run(source);
    } catch (e) {
      if (e && e.cppError) {
        result.error = { type: e.kind === 'error' ? 'CompileError' : (e.kind === 'link' ? 'LinkError' : 'RuntimeError'), message: e.msg, line: e.line };
      } else if (e instanceof RangeError) {
        result.error = { type: 'RuntimeError', message: 'stack overflow — infinite recursion? (check your base case!)', line: null };
      } else {
        result.error = { type: 'InternalError', message: String(e && e.message || e), line: null };
      }
    }
    result.stdout = interp.stdout.join('');
    return result;
  }

  var api = { run: run, version: 'GTC-C++ 1.0 (teaching subset of C++17)' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GTCCpp = api;
})(typeof window !== 'undefined' ? window : globalThis);
