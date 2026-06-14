/* ============================================================
 * 侠盗猎码 Grand Theft Code — 内置 Python 迷你解释器
 * Pure-JS tree-walking interpreter for a teaching subset of Python 3.
 * Works in browser (window.GTCPython) and Node (module.exports).
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- Values ---------------- */
  // int  -> JS number (integral)
  // float-> PyFloat wrapper
  // str  -> JS string
  // bool -> JS boolean
  // None -> null
  // list -> PyList, tuple -> PyTuple, dict -> PyDict, range -> PyRange
  function PyFloat(v) { this.v = v; }
  function PyList(items) { this.items = items; }
  function PyTuple(items) { this.items = items; }
  function PyDict() { this.map = new Map(); } // key: canonical key string -> [key, value]
  function PyRange(start, stop, step) { this.start = start; this.stop = stop; this.step = step; }
  PyRange.prototype.length = function () {
    var n = (this.step > 0) ? Math.ceil((this.stop - this.start) / this.step)
                            : Math.ceil((this.start - this.stop) / -this.step);
    return Math.max(0, n);
  };
  PyRange.prototype.get = function (i) { return this.start + i * this.step; };
  function PyFunction(name, params, body, line) {
    this.name = name; this.params = params; this.body = body; this.line = line;
  }

  function dictKey(k) {
    if (typeof k === 'number') return 'n:' + k;
    if (k instanceof PyFloat) return 'n:' + k.v;
    if (typeof k === 'string') return 's:' + k;
    if (typeof k === 'boolean') return 'n:' + (k ? 1 : 0);
    if (k === null) return 'none';
    if (k instanceof PyTuple) return 't:' + k.items.map(dictKey).join(',');
    throw err('TypeError', "unhashable type: '" + typeName(k) + "'");
  }

  function typeName(v) {
    if (typeof v === 'number') return 'int';
    if (v instanceof PyFloat) return 'float';
    if (typeof v === 'string') return 'str';
    if (typeof v === 'boolean') return 'bool';
    if (v === null) return 'NoneType';
    if (v instanceof PyList) return 'list';
    if (v instanceof PyTuple) return 'tuple';
    if (v instanceof PyDict) return 'dict';
    if (v instanceof PyRange) return 'range';
    if (v instanceof PyFunction) return 'function';
    if (typeof v === 'function') return 'builtin_function_or_method';
    return 'object';
  }

  /* ---------------- Errors ---------------- */
  function PyError(type, msg, line) {
    this.pyError = true; this.type = type; this.msg = msg; this.line = line || null;
  }
  function err(type, msg, line) { return new PyError(type, msg, line); }

  /* ---------------- Lexer ---------------- */
  var KEYWORDS = ['False', 'None', 'True', 'and', 'or', 'not', 'if', 'elif', 'else',
    'while', 'for', 'in', 'def', 'return', 'break', 'continue', 'pass', 'global',
    'import', 'from', 'class', 'lambda', 'try', 'except', 'with', 'del', 'is'];

  var OPS = ['**=', '//=', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
    '**', '//', '->', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';',
    '=', '<', '>', '+', '-', '*', '/', '%'];

  function tokenize(src) {
    var tokens = [];
    var lines = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    var indentStack = [0];
    var bracketDepth = 0;
    var li = 0;

    while (li < lines.length) {
      var raw = lines[li];
      var lineNo = li + 1;
      li++;

      var i = 0;
      if (bracketDepth === 0) {
        // measure indentation
        var indent = 0;
        while (i < raw.length && (raw[i] === ' ' || raw[i] === '\t')) {
          indent += (raw[i] === '\t') ? 4 : 1;
          i++;
        }
        // blank or comment-only line: skip entirely
        var rest = raw.slice(i);
        if (rest === '' || rest[0] === '#') continue;
        if (indent > indentStack[indentStack.length - 1]) {
          indentStack.push(indent);
          tokens.push({ t: 'INDENT', line: lineNo });
        } else {
          while (indent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            tokens.push({ t: 'DEDENT', line: lineNo });
          }
          if (indent !== indentStack[indentStack.length - 1]) {
            throw err('IndentationError', 'unindent does not match any outer indentation level', lineNo);
          }
        }
      }

      // tokenize the rest of the line
      var produced = false;
      while (i < raw.length) {
        var c = raw[i];
        if (c === ' ' || c === '\t') { i++; continue; }
        if (c === '#') { i = raw.length; break; }
        if (c === '\\' && i === raw.length - 1) { // line continuation
          i++;
          if (li < lines.length) { raw += lines[li]; li++; }
          continue;
        }
        // strings (with optional f prefix)
        var fpref = false, spos = i;
        if ((c === 'f' || c === 'F') && (raw[i + 1] === '"' || raw[i + 1] === "'")) { fpref = true; i++; c = raw[i]; }
        if (c === '"' || c === "'") {
          var quote = c, j = i + 1, buf = '';
          // triple-quoted not supported (keep teaching subset simple)
          while (j < raw.length && raw[j] !== quote) {
            if (raw[j] === '\\') {
              var esc = raw[j + 1];
              if (esc === 'n') buf += '\n';
              else if (esc === 't') buf += '\t';
              else if (esc === '\\') buf += '\\';
              else if (esc === "'") buf += "'";
              else if (esc === '"') buf += '"';
              else buf += '\\' + esc;
              j += 2;
            } else { buf += raw[j]; j++; }
          }
          if (j >= raw.length) throw err('SyntaxError', 'unterminated string literal', lineNo);
          tokens.push({ t: fpref ? 'FSTRING' : 'STRING', v: buf, line: lineNo });
          i = j + 1; produced = true; continue;
        }
        if (fpref) { i = spos; c = raw[i]; } // lone 'f' identifier
        // numbers
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(raw[i + 1] || ''))) {
          var m = /^(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?/.exec(raw.slice(i));
          var txt = m[0];
          var isFloat = txt.indexOf('.') >= 0 || /[eE]/.test(txt);
          tokens.push({ t: 'NUMBER', v: parseFloat(txt), float: isFloat, line: lineNo });
          i += txt.length; produced = true; continue;
        }
        // identifiers / keywords
        if (/[A-Za-z_一-鿿]/.test(c)) {
          var m2 = /^[A-Za-z_一-鿿][A-Za-z0-9_一-鿿]*/.exec(raw.slice(i));
          var w = m2[0];
          if (KEYWORDS.indexOf(w) >= 0) tokens.push({ t: w, line: lineNo });
          else tokens.push({ t: 'NAME', v: w, line: lineNo });
          i += w.length; produced = true; continue;
        }
        // operators
        var matched = null;
        for (var oi = 0; oi < OPS.length; oi++) {
          if (raw.startsWith(OPS[oi], i)) { matched = OPS[oi]; break; }
        }
        if (matched) {
          if ('([{'.indexOf(matched) >= 0) bracketDepth++;
          if (')]}'.indexOf(matched) >= 0) bracketDepth = Math.max(0, bracketDepth - 1);
          tokens.push({ t: 'OP', v: matched, line: lineNo });
          i += matched.length; produced = true; continue;
        }
        throw err('SyntaxError', "invalid character '" + c + "'", lineNo);
      }
      if (produced && bracketDepth === 0) tokens.push({ t: 'NEWLINE', line: lineNo });
    }
    while (indentStack.length > 1) { indentStack.pop(); tokens.push({ t: 'DEDENT', line: lines.length }); }
    tokens.push({ t: 'EOF', line: lines.length });
    return tokens;
  }

  /* ---------------- Parser ---------------- */
  function Parser(tokens) { this.toks = tokens; this.pos = 0; }
  Parser.prototype = {
    peek: function (k) { return this.toks[this.pos + (k || 0)]; },
    next: function () { return this.toks[this.pos++]; },
    at: function (t, v) {
      var tk = this.peek();
      return tk.t === t && (v === undefined || tk.v === v);
    },
    eat: function (t, v) { if (this.at(t, v)) return this.next(); return null; },
    expect: function (t, v, what) {
      var tk = this.eat(t, v);
      if (!tk) {
        var got = this.peek();
        throw err('SyntaxError', 'expected ' + (what || v || t) + " but got '" + (got.v || got.t) + "'", got.line);
      }
      return tk;
    },
    parseModule: function () {
      var body = [];
      while (!this.at('EOF')) {
        if (this.eat('NEWLINE')) continue;
        body.push(this.parseStmt());
      }
      return { k: 'Module', body: body };
    },
    parseBlock: function () {
      this.expect('OP', ':');
      if (this.eat('NEWLINE')) {
        this.expect('INDENT', undefined, 'an indented block');
        var body = [];
        while (!this.at('DEDENT') && !this.at('EOF')) {
          if (this.eat('NEWLINE')) continue;
          body.push(this.parseStmt());
        }
        this.eat('DEDENT');
        return body;
      }
      // single-line block:  if x: do_it()
      var s = this.parseSimpleStmt();
      this.eat('NEWLINE');
      return [s];
    },
    parseStmt: function () {
      var tk = this.peek();
      switch (tk.t) {
        case 'if': return this.parseIf();
        case 'while': return this.parseWhile();
        case 'for': return this.parseFor();
        case 'def': return this.parseDef();
        case 'import': case 'from':
          throw err('SyntaxError', 'import is not supported in this game (no modules needed!)', tk.line);
        case 'class':
          throw err('SyntaxError', 'class is not supported in this teaching subset', tk.line);
        case 'try': case 'with': case 'lambda':
          throw err('SyntaxError', "'" + tk.t + "' is not supported in this teaching subset", tk.line);
        default: {
          var s = this.parseSimpleStmt();
          if (!this.at('EOF')) this.expect('NEWLINE', undefined, 'end of line');
          return s;
        }
      }
    },
    parseIf: function () {
      var tk = this.expect('if');
      var test = this.parseExpr();
      var body = this.parseBlock();
      var orelse = [];
      if (this.at('elif')) {
        orelse = [this.parseElif()];
      } else if (this.eat('else')) {
        orelse = this.parseBlock();
      }
      return { k: 'If', test: test, body: body, orelse: orelse, line: tk.line };
    },
    parseElif: function () {
      var tk = this.expect('elif');
      var test = this.parseExpr();
      var body = this.parseBlock();
      var orelse = [];
      if (this.at('elif')) orelse = [this.parseElif()];
      else if (this.eat('else')) orelse = this.parseBlock();
      return { k: 'If', test: test, body: body, orelse: orelse, line: tk.line };
    },
    parseWhile: function () {
      var tk = this.expect('while');
      var test = this.parseExpr();
      var body = this.parseBlock();
      return { k: 'While', test: test, body: body, line: tk.line };
    },
    parseFor: function () {
      var tk = this.expect('for');
      var target = this.parseTargetList();
      this.expect('in');
      var iter = this.parseExprList();
      var body = this.parseBlock();
      return { k: 'For', target: target, iter: iter, body: body, line: tk.line };
    },
    parseDef: function () {
      var tk = this.expect('def');
      var name = this.expect('NAME').v;
      this.expect('OP', '(');
      var params = [];
      while (!this.at('OP', ')')) {
        params.push(this.expect('NAME').v);
        if (!this.eat('OP', ',')) break;
      }
      this.expect('OP', ')');
      var body = this.parseBlock();
      return { k: 'Def', name: name, params: params, body: body, line: tk.line };
    },
    parseTargetList: function () {
      var first = this.parseTargetAtom();
      if (this.at('OP', ',')) {
        var items = [first];
        while (this.eat('OP', ',')) {
          if (this.at('in') || this.at('OP', '=')) break;
          items.push(this.parseTargetAtom());
        }
        return { k: 'TupleTarget', items: items };
      }
      return first;
    },
    parseTargetAtom: function () {
      var tk = this.peek();
      if (tk.t === 'NAME') {
        // could be name, or subscripted target  a[i]
        var e = this.parsePostfix(this.parseAtom());
        return e;
      }
      if (this.eat('OP', '(')) {
        var t = this.parseTargetList();
        this.expect('OP', ')');
        return t;
      }
      throw err('SyntaxError', 'invalid assignment target', tk.line);
    },
    parseSimpleStmt: function () {
      var tk = this.peek();
      if (tk.t === 'return') {
        this.next();
        var v = null;
        if (!this.at('NEWLINE') && !this.at('EOF')) v = this.parseExprList();
        return { k: 'Return', value: v, line: tk.line };
      }
      if (tk.t === 'break') { this.next(); return { k: 'Break', line: tk.line }; }
      if (tk.t === 'continue') { this.next(); return { k: 'Continue', line: tk.line }; }
      if (tk.t === 'pass') { this.next(); return { k: 'Pass', line: tk.line }; }
      if (tk.t === 'global') {
        this.next();
        var names = [this.expect('NAME').v];
        while (this.eat('OP', ',')) names.push(this.expect('NAME').v);
        return { k: 'Global', names: names, line: tk.line };
      }
      // expression / assignment
      var expr = this.parseExprList();
      if (this.at('OP') && ['=', '+=', '-=', '*=', '/=', '//=', '%=', '**='].indexOf(this.peek().v) >= 0) {
        var op = this.next().v;
        var targets = [expr];
        var value = this.parseExprList();
        if (op === '=') {
          // chained assignment a = b = 1
          while (this.at('OP', '=')) { this.next(); targets.push(value); value = this.parseExprList(); }
          for (var ti = 0; ti < targets.length; ti++) this.checkTarget(targets[ti]);
          return { k: 'Assign', targets: targets, value: value, line: tk.line };
        }
        this.checkTarget(expr, true);
        return { k: 'AugAssign', target: expr, op: op.slice(0, -1), value: value, line: tk.line };
      }
      return { k: 'ExprStmt', value: expr, line: tk.line };
    },
    checkTarget: function (e, noTuple) {
      if (e.k === 'Name' || e.k === 'Index') return;
      if (!noTuple && (e.k === 'Tuple' || e.k === 'TupleTarget')) {
        for (var i = 0; i < e.items.length; i++) this.checkTarget(e.items[i]);
        return;
      }
      throw err('SyntaxError', 'cannot assign to this expression', e.line);
    },
    // expr_list: expr (, expr)*  -> Tuple if multiple
    parseExprList: function () {
      var first = this.parseExpr();
      if (this.at('OP', ',')) {
        var items = [first];
        while (this.eat('OP', ',')) {
          if (this.at('NEWLINE') || this.at('EOF') || this.at('OP', '=') || this.at('OP', ')')) break;
          items.push(this.parseExpr());
        }
        return { k: 'Tuple', items: items, line: first.line };
      }
      return first;
    },
    parseExpr: function () { return this.parseTernary(); },
    parseTernary: function () {
      var body = this.parseOr();
      if (this.at('if')) {
        this.next();
        var test = this.parseOr();
        this.expect('else');
        var orelse = this.parseExpr();
        return { k: 'IfExp', test: test, body: body, orelse: orelse, line: body.line };
      }
      return body;
    },
    parseOr: function () {
      var l = this.parseAnd();
      while (this.at('or')) { var tk = this.next(); l = { k: 'BoolOp', op: 'or', left: l, right: this.parseAnd(), line: tk.line }; }
      return l;
    },
    parseAnd: function () {
      var l = this.parseNot();
      while (this.at('and')) { var tk = this.next(); l = { k: 'BoolOp', op: 'and', left: l, right: this.parseNot(), line: tk.line }; }
      return l;
    },
    parseNot: function () {
      if (this.at('not')) { var tk = this.next(); return { k: 'UnaryOp', op: 'not', operand: this.parseNot(), line: tk.line }; }
      return this.parseComparison();
    },
    parseComparison: function () {
      var left = this.parseAddSub();
      var ops = [], comparators = [];
      for (;;) {
        var op = null;
        if (this.at('OP') && ['==', '!=', '<', '>', '<=', '>='].indexOf(this.peek().v) >= 0) op = this.next().v;
        else if (this.at('in')) { this.next(); op = 'in'; }
        else if (this.at('not') && this.peek(1) && this.peek(1).t === 'in') { this.next(); this.next(); op = 'not in'; }
        else if (this.at('is')) { this.next(); if (this.eat('not')) op = 'is not'; else op = 'is'; }
        else break;
        ops.push(op);
        comparators.push(this.parseAddSub());
      }
      if (!ops.length) return left;
      return { k: 'Compare', left: left, ops: ops, comparators: comparators, line: left.line };
    },
    parseAddSub: function () {
      var l = this.parseMulDiv();
      while (this.at('OP', '+') || this.at('OP', '-')) {
        var tk = this.next();
        l = { k: 'BinOp', op: tk.v, left: l, right: this.parseMulDiv(), line: tk.line };
      }
      return l;
    },
    parseMulDiv: function () {
      var l = this.parseUnary();
      while (this.at('OP') && ['*', '/', '//', '%'].indexOf(this.peek().v) >= 0) {
        var tk = this.next();
        l = { k: 'BinOp', op: tk.v, left: l, right: this.parseUnary(), line: tk.line };
      }
      return l;
    },
    parseUnary: function () {
      if (this.at('OP', '-') || this.at('OP', '+')) {
        var tk = this.next();
        return { k: 'UnaryOp', op: tk.v, operand: this.parseUnary(), line: tk.line };
      }
      return this.parsePower();
    },
    parsePower: function () {
      var base = this.parsePostfix(this.parseAtom());
      if (this.at('OP', '**')) {
        var tk = this.next();
        return { k: 'BinOp', op: '**', left: base, right: this.parseUnary(), line: tk.line };
      }
      return base;
    },
    parsePostfix: function (e) {
      for (;;) {
        if (this.at('OP', '(')) {
          var tk = this.next();
          var args = [], kwargs = [];
          while (!this.at('OP', ')')) {
            if (this.at('NAME') && this.peek(1) && this.peek(1).t === 'OP' && this.peek(1).v === '=') {
              var kn = this.next().v; this.next();
              kwargs.push({ name: kn, value: this.parseExpr() });
            } else {
              args.push(this.parseExpr());
            }
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')');
          e = { k: 'Call', func: e, args: args, kwargs: kwargs, line: tk.line };
        } else if (this.at('OP', '[')) {
          var tk2 = this.next();
          // slice or index
          var lo = null, hi = null, step = null, isSlice = false;
          if (!this.at('OP', ':')) lo = this.parseExpr();
          if (this.eat('OP', ':')) {
            isSlice = true;
            if (!this.at('OP', ':') && !this.at('OP', ']')) hi = this.parseExpr();
            if (this.eat('OP', ':')) {
              if (!this.at('OP', ']')) step = this.parseExpr();
            }
          }
          this.expect('OP', ']');
          if (isSlice) e = { k: 'Slice', obj: e, lo: lo, hi: hi, step: step, line: tk2.line };
          else e = { k: 'Index', obj: e, index: lo, line: tk2.line };
        } else if (this.at('OP', '.')) {
          var tk3 = this.next();
          var attr = this.expect('NAME').v;
          e = { k: 'Attr', obj: e, attr: attr, line: tk3.line };
        } else break;
      }
      return e;
    },
    parseAtom: function () {
      var tk = this.peek();
      if (tk.t === 'NUMBER') { this.next(); return { k: 'Num', v: tk.v, float: tk.float, line: tk.line }; }
      if (tk.t === 'STRING') {
        this.next();
        var s = tk.v;
        while (this.at('STRING')) { s += this.next().v; } // implicit concat
        return { k: 'Str', v: s, line: tk.line };
      }
      if (tk.t === 'FSTRING') { this.next(); return { k: 'FStr', raw: tk.v, line: tk.line }; }
      if (tk.t === 'NAME') { this.next(); return { k: 'Name', id: tk.v, line: tk.line }; }
      if (tk.t === 'True') { this.next(); return { k: 'Const', v: true, line: tk.line }; }
      if (tk.t === 'False') { this.next(); return { k: 'Const', v: false, line: tk.line }; }
      if (tk.t === 'None') { this.next(); return { k: 'Const', v: null, line: tk.line }; }
      if (tk.t === 'OP' && tk.v === '(') {
        this.next();
        if (this.eat('OP', ')')) return { k: 'Tuple', items: [], line: tk.line };
        var e = this.parseExpr();
        if (this.at('OP', ',')) {
          var items = [e];
          while (this.eat('OP', ',')) {
            if (this.at('OP', ')')) break;
            items.push(this.parseExpr());
          }
          this.expect('OP', ')');
          return { k: 'Tuple', items: items, line: tk.line };
        }
        this.expect('OP', ')');
        return e;
      }
      if (tk.t === 'OP' && tk.v === '[') {
        this.next();
        var items2 = [];
        while (!this.at('OP', ']')) {
          items2.push(this.parseExpr());
          if (!this.eat('OP', ',')) break;
        }
        this.expect('OP', ']');
        return { k: 'List', items: items2, line: tk.line };
      }
      if (tk.t === 'OP' && tk.v === '{') {
        this.next();
        var pairs = [];
        while (!this.at('OP', '}')) {
          var key = this.parseExpr();
          this.expect('OP', ':');
          var val = this.parseExpr();
          pairs.push([key, val]);
          if (!this.eat('OP', ',')) break;
        }
        this.expect('OP', '}');
        return { k: 'Dict', pairs: pairs, line: tk.line };
      }
      throw err('SyntaxError', "unexpected '" + (tk.v || tk.t) + "'", tk.line);
    }
  };

  /* ---------------- f-string parsing ---------------- */
  function parseFString(raw, line) {
    // returns array of parts: {lit: '...'} or {expr: AST, spec: '.2f'|null}
    var parts = [], i = 0, buf = '';
    while (i < raw.length) {
      var c = raw[i];
      if (c === '{' && raw[i + 1] === '{') { buf += '{'; i += 2; continue; }
      if (c === '}' && raw[i + 1] === '}') { buf += '}'; i += 2; continue; }
      if (c === '{') {
        if (buf) { parts.push({ lit: buf }); buf = ''; }
        var depth = 1, j = i + 1, inner = '';
        while (j < raw.length && depth > 0) {
          if (raw[j] === '{') depth++;
          else if (raw[j] === '}') { depth--; if (depth === 0) break; }
          inner += raw[j]; j++;
        }
        if (depth !== 0) throw err('SyntaxError', "f-string: expecting '}'", line);
        var spec = null;
        var ci = findSpecColon(inner);
        if (ci >= 0) { spec = inner.slice(ci + 1); inner = inner.slice(0, ci); }
        var toks = tokenize(inner);
        var p = new Parser(toks);
        var ast = p.parseExpr();
        parts.push({ expr: ast, spec: spec });
        i = j + 1; continue;
      }
      buf += c; i++;
    }
    if (buf) parts.push({ lit: buf });
    return parts;
  }
  function findSpecColon(s) {
    var depth = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if ('([{'.indexOf(c) >= 0) depth++;
      else if (')]}'.indexOf(c) >= 0) depth--;
      else if (c === ':' && depth === 0) return i;
    }
    return -1;
  }

  /* ---------------- Evaluator ---------------- */
  function BreakSig() {} function ContinueSig() {}
  function ReturnSig(v) { this.v = v; }

  function Interp(opts) {
    opts = opts || {};
    this.stdout = [];
    this.stdinLines = (opts.stdin == null) ? [] :
      (Array.isArray(opts.stdin) ? opts.stdin.slice() : String(opts.stdin).split('\n'));
    this.maxSteps = opts.maxSteps || 2000000;
    this.steps = 0;
    this.globals = new Map();
  }

  Interp.prototype.write = function (s) {
    this.stdout.push(s);
    if (this.stdout.length > 60000) throw err('RuntimeError', 'too much output (are you printing in an infinite loop?)');
  };

  Interp.prototype.tick = function (line) {
    if (++this.steps > this.maxSteps) {
      throw err('TimeoutError', 'your program ran too long — probably an infinite loop', line);
    }
  };

  Interp.prototype.run = function (src) {
    var toks = tokenize(src);
    var ast = new Parser(toks).parseModule();
    var env = { vars: this.globals, parent: null, globalDecl: null };
    this.execBlock(ast.body, env);
  };

  Interp.prototype.execBlock = function (stmts, env) {
    for (var i = 0; i < stmts.length; i++) this.execStmt(stmts[i], env);
  };

  Interp.prototype.execStmt = function (s, env) {
    this.tick(s.line);
    switch (s.k) {
      case 'ExprStmt': this.evalExpr(s.value, env); return;
      case 'Assign': {
        var v = this.evalExpr(s.value, env);
        for (var i = 0; i < s.targets.length; i++) this.assignTo(s.targets[i], v, env);
        return;
      }
      case 'AugAssign': {
        var cur = this.evalExpr(s.target, env);
        var rhs = this.evalExpr(s.value, env);
        var nv = this.binOp(s.op, cur, rhs, s.line);
        this.assignTo(s.target, nv, env);
        return;
      }
      case 'If': {
        if (truthy(this.evalExpr(s.test, env))) this.execBlock(s.body, env);
        else this.execBlock(s.orelse, env);
        return;
      }
      case 'While': {
        while (truthy(this.evalExpr(s.test, env))) {
          this.tick(s.line);
          try { this.execBlock(s.body, env); }
          catch (e) {
            if (e instanceof BreakSig) break;
            if (e instanceof ContinueSig) continue;
            throw e;
          }
        }
        return;
      }
      case 'For': {
        var seq = this.evalExpr(s.iter, env);
        var items = this.iterate(seq, s.line);
        for (var ii = 0; ii < items.length; ii++) {
          this.tick(s.line);
          this.assignTo(s.target, items[ii], env);
          try { this.execBlock(s.body, env); }
          catch (e) {
            if (e instanceof BreakSig) break;
            if (e instanceof ContinueSig) continue;
            throw e;
          }
        }
        return;
      }
      case 'Def': {
        var fn = new PyFunction(s.name, s.params, s.body, s.line);
        this.setVar(env, s.name, fn);
        return;
      }
      case 'Return': {
        var rv = s.value ? this.evalExpr(s.value, env) : null;
        throw new ReturnSig(rv);
      }
      case 'Break': throw new BreakSig();
      case 'Continue': throw new ContinueSig();
      case 'Pass': return;
      case 'Global': {
        if (!env.parent) return; // at module level, no-op
        env.globalDecl = env.globalDecl || new Set();
        for (var gi = 0; gi < s.names.length; gi++) env.globalDecl.add(s.names[gi]);
        return;
      }
      default: throw err('RuntimeError', 'unknown statement ' + s.k, s.line);
    }
  };

  Interp.prototype.iterate = function (seq, line) {
    if (seq instanceof PyRange) {
      var n = seq.length();
      if (n > 5000000) throw err('MemoryError', 'range too large for this game', line);
      var out = new Array(n);
      for (var i = 0; i < n; i++) out[i] = seq.get(i);
      return out;
    }
    if (seq instanceof PyList || seq instanceof PyTuple) return seq.items.slice();
    if (typeof seq === 'string') return seq.split('');
    if (seq instanceof PyDict) return Array.from(seq.map.values()).map(function (kv) { return kv[0]; });
    throw err('TypeError', "'" + typeName(seq) + "' object is not iterable", line);
  };

  Interp.prototype.assignTo = function (target, value, env) {
    if (target.k === 'Name') { this.setVar(env, target.id, value); return; }
    if (target.k === 'Index') {
      var obj = this.evalExpr(target.obj, env);
      var idx = this.evalExpr(target.index, env);
      if (obj instanceof PyList) {
        var i = this.normIndex(idx, obj.items.length, target.line, true);
        obj.items[i] = value; return;
      }
      if (obj instanceof PyDict) {
        obj.map.set(dictKey(idx), [idx, value]); return;
      }
      if (typeof obj === 'string') throw err('TypeError', "'str' object does not support item assignment", target.line);
      throw err('TypeError', "'" + typeName(obj) + "' object does not support item assignment", target.line);
    }
    if (target.k === 'Tuple' || target.k === 'TupleTarget') {
      var items;
      if (value instanceof PyList || value instanceof PyTuple) items = value.items;
      else if (typeof value === 'string') items = value.split('');
      else throw err('TypeError', 'cannot unpack non-iterable ' + typeName(value) + ' object', target.line);
      if (items.length !== target.items.length) {
        throw err('ValueError', 'expected ' + target.items.length + ' values to unpack, got ' + items.length, target.line);
      }
      for (var t = 0; t < target.items.length; t++) this.assignTo(target.items[t], items[t], env);
      return;
    }
    throw err('SyntaxError', 'cannot assign to this expression', target.line);
  };

  Interp.prototype.setVar = function (env, name, value) {
    if (env.parent && env.globalDecl && env.globalDecl.has(name)) {
      this.globals.set(name, value);
    } else {
      env.vars.set(name, value);
    }
  };

  Interp.prototype.lookup = function (env, name, line) {
    var e = env;
    if (e.parent && e.globalDecl && e.globalDecl.has(name)) {
      if (this.globals.has(name)) return this.globals.get(name);
      throw err('NameError', "name '" + name + "' is not defined", line);
    }
    while (e) {
      if (e.vars.has(name)) return e.vars.get(name);
      e = e.parent;
    }
    if (BUILTIN_NAMES.indexOf(name) >= 0) return { builtin: name };
    throw err('NameError', "name '" + name + "' is not defined", line);
  };

  Interp.prototype.normIndex = function (idx, len, line, forAssign) {
    if (typeof idx === 'boolean') idx = idx ? 1 : 0;
    if (typeof idx !== 'number' || !Number.isInteger(idx)) {
      throw err('TypeError', 'indices must be integers', line);
    }
    var i = idx < 0 ? idx + len : idx;
    if (i < 0 || i >= len) {
      throw err('IndexError', (forAssign ? 'list assignment ' : '') + 'index out of range', line);
    }
    return i;
  };

  Interp.prototype.evalExpr = function (e, env) {
    this.tick(e.line);
    switch (e.k) {
      case 'Num': return e.float ? new PyFloat(e.v) : e.v;
      case 'Str': return e.v;
      case 'Const': return e.v;
      case 'Name': return this.lookup(env, e.id, e.line);
      case 'List': {
        var items = [];
        for (var i = 0; i < e.items.length; i++) items.push(this.evalExpr(e.items[i], env));
        return new PyList(items);
      }
      case 'Tuple': {
        var ti = [];
        for (var t = 0; t < e.items.length; t++) ti.push(this.evalExpr(e.items[t], env));
        return new PyTuple(ti);
      }
      case 'Dict': {
        var d = new PyDict();
        for (var p = 0; p < e.pairs.length; p++) {
          var k = this.evalExpr(e.pairs[p][0], env);
          var v = this.evalExpr(e.pairs[p][1], env);
          d.map.set(dictKey(k), [k, v]);
        }
        return d;
      }
      case 'FStr': {
        var parts = parseFString(e.raw, e.line);
        var out = '';
        for (var fp = 0; fp < parts.length; fp++) {
          var part = parts[fp];
          if (part.lit !== undefined) out += part.lit;
          else {
            var val = this.evalExpr(part.expr, env);
            out += formatValue(val, part.spec, e.line);
          }
        }
        return out;
      }
      case 'BoolOp': {
        var l = this.evalExpr(e.left, env);
        if (e.op === 'and') return truthy(l) ? this.evalExpr(e.right, env) : l;
        return truthy(l) ? l : this.evalExpr(e.right, env);
      }
      case 'UnaryOp': {
        var o = this.evalExpr(e.operand, env);
        if (e.op === 'not') return !truthy(o);
        if (e.op === '-') {
          if (typeof o === 'number') return -o;
          if (o instanceof PyFloat) return new PyFloat(-o.v);
          if (typeof o === 'boolean') return o ? -1 : 0;
          throw err('TypeError', "bad operand type for unary -: '" + typeName(o) + "'", e.line);
        }
        if (e.op === '+') {
          if (typeof o === 'number' || o instanceof PyFloat) return o;
          throw err('TypeError', "bad operand type for unary +: '" + typeName(o) + "'", e.line);
        }
        break;
      }
      case 'BinOp': return this.binOp(e.op, this.evalExpr(e.left, env), this.evalExpr(e.right, env), e.line);
      case 'Compare': {
        var left = this.evalExpr(e.left, env);
        for (var c = 0; c < e.ops.length; c++) {
          var right = this.evalExpr(e.comparators[c], env);
          if (!this.compare(e.ops[c], left, right, e.line)) return false;
          left = right;
        }
        return true;
      }
      case 'IfExp': return truthy(this.evalExpr(e.test, env)) ? this.evalExpr(e.body, env) : this.evalExpr(e.orelse, env);
      case 'Call': return this.evalCall(e, env);
      case 'Index': {
        var obj = this.evalExpr(e.obj, env);
        var idx = this.evalExpr(e.index, env);
        if (obj instanceof PyList || obj instanceof PyTuple) {
          return obj.items[this.normIndex(idx, obj.items.length, e.line)];
        }
        if (typeof obj === 'string') {
          return obj[this.normIndex(idx, obj.length, e.line)];
        }
        if (obj instanceof PyRange) {
          return obj.get(this.normIndex(idx, obj.length(), e.line));
        }
        if (obj instanceof PyDict) {
          var kk = dictKey(idx);
          if (!obj.map.has(kk)) throw err('KeyError', pyRepr(idx), e.line);
          return obj.map.get(kk)[1];
        }
        throw err('TypeError', "'" + typeName(obj) + "' object is not subscriptable", e.line);
      }
      case 'Slice': {
        var sobj = this.evalExpr(e.obj, env);
        var lo = e.lo ? this.evalExpr(e.lo, env) : null;
        var hi = e.hi ? this.evalExpr(e.hi, env) : null;
        var st = e.step ? this.evalExpr(e.step, env) : null;
        return this.doSlice(sobj, lo, hi, st, e.line);
      }
      case 'Attr': {
        var aobj = this.evalExpr(e.obj, env);
        return { boundMethod: true, obj: aobj, name: e.attr, line: e.line };
      }
    }
    throw err('RuntimeError', 'cannot evaluate expression', e.line);
  };

  Interp.prototype.doSlice = function (obj, lo, hi, step, line) {
    var isStr = typeof obj === 'string';
    var isList = obj instanceof PyList;
    var isTuple = obj instanceof PyTuple;
    if (!isStr && !isList && !isTuple) {
      throw err('TypeError', "'" + typeName(obj) + "' object is not sliceable", line);
    }
    var arr = isStr ? obj.split('') : obj.items;
    var n = arr.length;
    var stp = (step === null) ? 1 : asInt(step, line);
    if (stp === 0) throw err('ValueError', 'slice step cannot be zero', line);
    function clamp(v, lo2, hi2) { return Math.max(lo2, Math.min(hi2, v)); }
    var start, stop;
    if (stp > 0) {
      start = (lo === null) ? 0 : (asInt(lo, line) < 0 ? clamp(asInt(lo, line) + n, 0, n) : clamp(asInt(lo, line), 0, n));
      stop = (hi === null) ? n : (asInt(hi, line) < 0 ? clamp(asInt(hi, line) + n, 0, n) : clamp(asInt(hi, line), 0, n));
    } else {
      start = (lo === null) ? n - 1 : (asInt(lo, line) < 0 ? clamp(asInt(lo, line) + n, -1, n - 1) : clamp(asInt(lo, line), -1, n - 1));
      stop = (hi === null) ? -1 : (asInt(hi, line) < 0 ? clamp(asInt(hi, line) + n, -1, n - 1) : clamp(asInt(hi, line), -1, n - 1));
    }
    var out = [];
    if (stp > 0) for (var i = start; i < stop; i += stp) out.push(arr[i]);
    else for (var j = start; j > stop; j += stp) out.push(arr[j]);
    if (isStr) return out.join('');
    if (isTuple) return new PyTuple(out);
    return new PyList(out);
  };

  function asInt(v, line) {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') return v;
    throw err('TypeError', 'expected an integer', line);
  }

  function numVal(v) {
    if (typeof v === 'number') return v;
    if (v instanceof PyFloat) return v.v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return null;
  }
  function isNum(v) { return typeof v === 'number' || v instanceof PyFloat || typeof v === 'boolean'; }
  function isFloatV(v) { return v instanceof PyFloat; }

  Interp.prototype.binOp = function (op, a, b, line) {
    // numeric
    if (isNum(a) && isNum(b)) {
      var x = numVal(a), y = numVal(b);
      var fl = isFloatV(a) || isFloatV(b);
      switch (op) {
        case '+': return fl ? new PyFloat(x + y) : x + y;
        case '-': return fl ? new PyFloat(x - y) : x - y;
        case '*': return fl ? new PyFloat(x * y) : x * y;
        case '/':
          if (y === 0) throw err('ZeroDivisionError', 'division by zero', line);
          return new PyFloat(x / y);
        case '//':
          if (y === 0) throw err('ZeroDivisionError', 'integer division or modulo by zero', line);
          var fd = Math.floor(x / y);
          return fl ? new PyFloat(fd) : fd;
        case '%':
          if (y === 0) throw err('ZeroDivisionError', 'integer division or modulo by zero', line);
          var md = ((x % y) + y) % y;
          return fl ? new PyFloat(md) : md;
        case '**':
          var pw = Math.pow(x, y);
          return (fl || y < 0) ? new PyFloat(pw) : pw;
      }
    }
    // string ops
    if (typeof a === 'string' && typeof b === 'string' && op === '+') return a + b;
    if (op === '*') {
      if (typeof a === 'string' && typeof b === 'number') return repeatStr(a, b, line);
      if (typeof b === 'string' && typeof a === 'number') return repeatStr(b, a, line);
      if (a instanceof PyList && typeof b === 'number') return new PyList(repeatArr(a.items, b, line));
      if (b instanceof PyList && typeof a === 'number') return new PyList(repeatArr(b.items, a, line));
    }
    if (a instanceof PyList && b instanceof PyList && op === '+') return new PyList(a.items.concat(b.items));
    if (a instanceof PyTuple && b instanceof PyTuple && op === '+') return new PyTuple(a.items.concat(b.items));
    if (op === '+' && ((typeof a === 'string') !== (typeof b === 'string'))) {
      if (typeof a === 'string') {
        throw err('TypeError', 'can only concatenate str (not "' + typeName(b) + '") to str — try str(...) ', line);
      }
      throw err('TypeError', "unsupported operand type(s) for +: '" + typeName(a) + "' and '" + typeName(b) + "'", line);
    }
    throw err('TypeError', "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'", line);
  };

  function repeatStr(s, n, line) {
    if (n <= 0) return '';
    if (s.length * n > 1000000) throw err('MemoryError', 'string too long', line);
    return s.repeat(n);
  }
  function repeatArr(arr, n, line) {
    if (n <= 0) return [];
    if (arr.length * n > 1000000) throw err('MemoryError', 'list too long', line);
    var out = [];
    for (var i = 0; i < n; i++) out = out.concat(arr);
    return out;
  }

  Interp.prototype.compare = function (op, a, b, line) {
    if (op === 'in' || op === 'not in') {
      var found = this.contains(b, a, line);
      return op === 'in' ? found : !found;
    }
    if (op === 'is') return a === b || (a === null && b === null);
    if (op === 'is not') return !(a === b || (a === null && b === null));
    var c = this.cmpVal(a, b, op, line);
    switch (op) {
      case '==': return c === 0;
      case '!=': return c !== 0;
      case '<': return c < 0;
      case '>': return c > 0;
      case '<=': return c <= 0;
      case '>=': return c >= 0;
    }
  };

  Interp.prototype.cmpVal = function (a, b, op, line) {
    if (isNum(a) && isNum(b)) {
      var x = numVal(a), y = numVal(b);
      return x < y ? -1 : x > y ? 1 : 0;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if ((a instanceof PyList && b instanceof PyList) || (a instanceof PyTuple && b instanceof PyTuple)) {
      var n = Math.min(a.items.length, b.items.length);
      for (var i = 0; i < n; i++) {
        var c = this.cmpVal(a.items[i], b.items[i], op, line);
        if (c !== 0) return c;
      }
      return a.items.length - b.items.length;
    }
    // mixed types: only == / != allowed
    if (op === '==' || op === '!=') {
      if (a === null || b === null) return (a === b) ? 0 : 1;
      return 1; // different types -> not equal
    }
    throw err('TypeError', "'" + op + "' not supported between instances of '" + typeName(a) + "' and '" + typeName(b) + "'", line);
  };

  Interp.prototype.contains = function (container, item, line) {
    if (typeof container === 'string') {
      if (typeof item !== 'string') throw err('TypeError', "'in <string>' requires string as left operand", line);
      return container.indexOf(item) >= 0;
    }
    if (container instanceof PyList || container instanceof PyTuple) {
      for (var i = 0; i < container.items.length; i++) {
        if (this.cmpVal(container.items[i], item, '==', line) === 0) return true;
      }
      return false;
    }
    if (container instanceof PyDict) return container.map.has(dictKey(item));
    if (container instanceof PyRange) {
      var n = container.length();
      if (!isNum(item)) return false;
      var v = numVal(item);
      if (container.step > 0) return v >= container.start && v < container.stop && (v - container.start) % container.step === 0;
      return v <= container.start && v > container.stop && (container.start - v) % -container.step === 0;
    }
    throw err('TypeError', "argument of type '" + typeName(container) + "' is not iterable", line);
  };

  /* ---------------- Calls: builtins, methods, user functions -------- */
  var BUILTIN_NAMES = ['print', 'input', 'len', 'range', 'int', 'float', 'str', 'bool',
    'abs', 'max', 'min', 'sum', 'sorted', 'round', 'list', 'ord', 'chr', 'type', 'reversed'];

  Interp.prototype.evalCall = function (e, env) {
    var fnExpr = e.func;
    // bound method?
    if (fnExpr.k === 'Attr') {
      var obj = this.evalExpr(fnExpr.obj, env);
      var args = this.evalArgs(e.args, env);
      return this.callMethod(obj, fnExpr.attr, args, e.line);
    }
    var fn = this.evalExpr(fnExpr, env);
    var argv = this.evalArgs(e.args, env);
    var kwargs = {};
    for (var ki = 0; ki < e.kwargs.length; ki++) {
      kwargs[e.kwargs[ki].name] = this.evalExpr(e.kwargs[ki].value, env);
    }
    if (fn && fn.builtin) return this.callBuiltin(fn.builtin, argv, kwargs, e.line);
    if (fn instanceof PyFunction) {
      if (argv.length !== fn.params.length) {
        throw err('TypeError', fn.name + '() takes ' + fn.params.length + ' arguments but ' + argv.length + ' were given', e.line);
      }
      var local = { vars: new Map(), parent: { vars: this.globals, parent: null }, globalDecl: null };
      for (var p = 0; p < fn.params.length; p++) local.vars.set(fn.params[p], argv[p]);
      try {
        this.execBlock(fn.body, local);
      } catch (ex) {
        if (ex instanceof ReturnSig) return ex.v;
        throw ex;
      }
      return null;
    }
    throw err('TypeError', "'" + typeName(fn) + "' object is not callable", e.line);
  };

  Interp.prototype.evalArgs = function (args, env) {
    var out = [];
    for (var i = 0; i < args.length; i++) out.push(this.evalExpr(args[i], env));
    return out;
  };

  Interp.prototype.callBuiltin = function (name, args, kwargs, line) {
    var self = this;
    switch (name) {
      case 'print': {
        var sep = (kwargs.sep !== undefined) ? kwargs.sep : ' ';
        var end = (kwargs.end !== undefined) ? kwargs.end : '\n';
        if (sep !== null && typeof sep !== 'string') throw err('TypeError', 'sep must be a string', line);
        if (end !== null && typeof end !== 'string') throw err('TypeError', 'end must be a string', line);
        this.write(args.map(pyStr).join(sep === null ? ' ' : sep) + (end === null ? '\n' : end));
        return null;
      }
      case 'input': {
        if (args.length > 0) this.write(pyStr(args[0]));
        if (!this.stdinLines.length) {
          throw err('EOFError', 'no more input available (this mission gives ' + 'input via the test data)', line);
        }
        return this.stdinLines.shift();
      }
      case 'len': {
        var v = args[0];
        if (typeof v === 'string') return v.length;
        if (v instanceof PyList || v instanceof PyTuple) return v.items.length;
        if (v instanceof PyDict) return v.map.size;
        if (v instanceof PyRange) return v.length();
        throw err('TypeError', "object of type '" + typeName(v) + "' has no len()", line);
      }
      case 'range': {
        var a = args.map(function (x) {
          var n = numVal(x);
          if (n === null || !Number.isInteger(n)) throw err('TypeError', "'" + typeName(x) + "' object cannot be interpreted as an integer", line);
          return n;
        });
        if (a.length === 1) return new PyRange(0, a[0], 1);
        if (a.length === 2) return new PyRange(a[0], a[1], 1);
        if (a.length === 3) {
          if (a[2] === 0) throw err('ValueError', 'range() arg 3 must not be zero', line);
          return new PyRange(a[0], a[1], a[2]);
        }
        throw err('TypeError', 'range expected 1 to 3 arguments', line);
      }
      case 'int': {
        if (!args.length) return 0;
        var iv = args[0];
        if (typeof iv === 'number') return iv;
        if (iv instanceof PyFloat) return Math.trunc(iv.v);
        if (typeof iv === 'boolean') return iv ? 1 : 0;
        if (typeof iv === 'string') {
          var t = iv.trim();
          if (!/^[+-]?\d+$/.test(t)) throw err('ValueError', "invalid literal for int() with base 10: " + pyRepr(iv), line);
          return parseInt(t, 10);
        }
        throw err('TypeError', "int() argument must be a string or a number, not '" + typeName(iv) + "'", line);
      }
      case 'float': {
        if (!args.length) return new PyFloat(0);
        var fv = args[0];
        if (typeof fv === 'number') return new PyFloat(fv);
        if (fv instanceof PyFloat) return fv;
        if (typeof fv === 'boolean') return new PyFloat(fv ? 1 : 0);
        if (typeof fv === 'string') {
          var ft = fv.trim();
          if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(ft)) {
            throw err('ValueError', 'could not convert string to float: ' + pyRepr(fv), line);
          }
          return new PyFloat(parseFloat(ft));
        }
        throw err('TypeError', "float() argument must be a string or a number", line);
      }
      case 'str': return args.length ? pyStr(args[0]) : '';
      case 'bool': return args.length ? truthy(args[0]) : false;
      case 'abs': {
        var av = numVal(args[0]);
        if (av === null) throw err('TypeError', "bad operand type for abs(): '" + typeName(args[0]) + "'", line);
        return (args[0] instanceof PyFloat) ? new PyFloat(Math.abs(av)) : Math.abs(av);
      }
      case 'round': {
        var rv = numVal(args[0]);
        if (rv === null) throw err('TypeError', 'round() argument must be a number', line);
        if (args.length >= 2) {
          var nd = numVal(args[1]);
          var rr = Number(rv.toFixed(nd));
          return new PyFloat(rr);
        }
        var r0 = Math.round(rv);
        // Python rounds .5 to even
        if (Math.abs(rv % 1) === 0.5) r0 = 2 * Math.round(rv / 2);
        return r0;
      }
      case 'max': case 'min': {
        var vals = args;
        if (args.length === 1) vals = this.iterate(args[0], line);
        if (!vals.length) throw err('ValueError', name + '() arg is an empty sequence', line);
        var best = vals[0];
        for (var bi = 1; bi < vals.length; bi++) {
          var c = this.cmpVal(vals[bi], best, '<', line);
          if ((name === 'max' && c > 0) || (name === 'min' && c < 0)) best = vals[bi];
        }
        return best;
      }
      case 'sum': {
        var items = this.iterate(args[0], line);
        var acc = args.length > 1 ? args[1] : 0;
        for (var si = 0; si < items.length; si++) acc = this.binOp('+', acc, items[si], line);
        return acc;
      }
      case 'sorted': {
        var arr = this.iterate(args[0], line).slice();
        var rev = kwargs.reverse !== undefined ? truthy(kwargs.reverse) : false;
        var interp = this;
        arr.sort(function (x, y) { return interp.cmpVal(x, y, '<', line); });
        if (rev) arr.reverse();
        return new PyList(arr);
      }
      case 'reversed': {
        var ra = this.iterate(args[0], line).slice().reverse();
        return new PyList(ra);
      }
      case 'list': {
        if (!args.length) return new PyList([]);
        return new PyList(this.iterate(args[0], line));
      }
      case 'ord': {
        if (typeof args[0] !== 'string' || args[0].length !== 1) {
          throw err('TypeError', 'ord() expected a character', line);
        }
        return args[0].charCodeAt(0);
      }
      case 'chr': {
        var cn = numVal(args[0]);
        if (cn === null) throw err('TypeError', 'an integer is required', line);
        return String.fromCharCode(cn);
      }
      case 'type': return "<class '" + typeName(args[0]) + "'>";
    }
    throw err('NameError', "builtin '" + name + "' missing", line);
  };

  Interp.prototype.callMethod = function (obj, name, args, line) {
    var self = this;
    if (typeof obj === 'string') {
      switch (name) {
        case 'upper': return obj.toUpperCase();
        case 'lower': return obj.toLowerCase();
        case 'strip': return args.length ? stripChars(obj, args[0], 3) : obj.trim();
        case 'lstrip': return args.length ? stripChars(obj, args[0], 1) : obj.replace(/^\s+/, '');
        case 'rstrip': return args.length ? stripChars(obj, args[0], 2) : obj.replace(/\s+$/, '');
        case 'split': {
          if (!args.length || args[0] === null) {
            var parts = obj.trim().split(/\s+/);
            return new PyList(parts[0] === '' ? [] : parts);
          }
          return new PyList(obj.split(args[0]));
        }
        case 'join': {
          var items = this.iterate(args[0], line);
          for (var ji = 0; ji < items.length; ji++) {
            if (typeof items[ji] !== 'string') {
              throw err('TypeError', 'sequence item ' + ji + ': expected str instance, ' + typeName(items[ji]) + ' found', line);
            }
          }
          return items.join(obj);
        }
        case 'replace': return obj.split(args[0]).join(args[1]);
        case 'find': return obj.indexOf(args[0]);
        case 'index': {
          var fi = obj.indexOf(args[0]);
          if (fi < 0) throw err('ValueError', 'substring not found', line);
          return fi;
        }
        case 'count': {
          if (args[0] === '') return obj.length + 1;
          return obj.split(args[0]).length - 1;
        }
        case 'startswith': return obj.startsWith(args[0]);
        case 'endswith': return obj.endsWith(args[0]);
        case 'isdigit': return obj.length > 0 && /^[0-9]+$/.test(obj);
        case 'isalpha': return obj.length > 0 && /^[A-Za-z一-鿿]+$/.test(obj);
        case 'isupper': return /[A-Z]/.test(obj) && obj === obj.toUpperCase();
        case 'islower': return /[a-z]/.test(obj) && obj === obj.toLowerCase();
        case 'title': return obj.replace(/\b\w/g, function (m) { return m.toUpperCase(); });
        case 'capitalize': return obj.length ? obj[0].toUpperCase() + obj.slice(1).toLowerCase() : obj;
        case 'zfill': {
          var w = numVal(args[0]);
          var sgn = '', body = obj;
          if (body[0] === '+' || body[0] === '-') { sgn = body[0]; body = body.slice(1); }
          while ((sgn + body).length < w) body = '0' + body;
          return sgn + body;
        }
      }
      throw err('AttributeError', "'str' object has no attribute '" + name + "'", line);
    }
    if (obj instanceof PyList) {
      switch (name) {
        case 'append': obj.items.push(args[0]); return null;
        case 'pop': {
          if (!obj.items.length) throw err('IndexError', 'pop from empty list', line);
          if (args.length) {
            var pi = this.normIndex(args[0], obj.items.length, line);
            return obj.items.splice(pi, 1)[0];
          }
          return obj.items.pop();
        }
        case 'insert': {
          var ii = numVal(args[0]);
          obj.items.splice(Math.max(0, Math.min(obj.items.length, ii < 0 ? ii + obj.items.length : ii)), 0, args[1]);
          return null;
        }
        case 'remove': {
          for (var ri = 0; ri < obj.items.length; ri++) {
            if (this.cmpVal(obj.items[ri], args[0], '==', line) === 0) { obj.items.splice(ri, 1); return null; }
          }
          throw err('ValueError', 'list.remove(x): x not in list', line);
        }
        case 'sort': {
          var interp2 = this;
          obj.items.sort(function (x, y) { return interp2.cmpVal(x, y, '<', line); });
          return null;
        }
        case 'reverse': obj.items.reverse(); return null;
        case 'index': {
          for (var xi = 0; xi < obj.items.length; xi++) {
            if (this.cmpVal(obj.items[xi], args[0], '==', line) === 0) return xi;
          }
          throw err('ValueError', pyRepr(args[0]) + ' is not in list', line);
        }
        case 'count': {
          var cc = 0;
          for (var cj = 0; cj < obj.items.length; cj++) {
            if (this.cmpVal(obj.items[cj], args[0], '==', line) === 0) cc++;
          }
          return cc;
        }
        case 'extend': {
          var ext = this.iterate(args[0], line);
          for (var ei = 0; ei < ext.length; ei++) obj.items.push(ext[ei]);
          return null;
        }
        case 'clear': obj.items.length = 0; return null;
        case 'copy': return new PyList(obj.items.slice());
      }
      throw err('AttributeError', "'list' object has no attribute '" + name + "'", line);
    }
    if (obj instanceof PyDict) {
      switch (name) {
        case 'get': {
          var gk = dictKey(args[0]);
          if (obj.map.has(gk)) return obj.map.get(gk)[1];
          return args.length > 1 ? args[1] : null;
        }
        case 'keys': return new PyList(Array.from(obj.map.values()).map(function (kv) { return kv[0]; }));
        case 'values': return new PyList(Array.from(obj.map.values()).map(function (kv) { return kv[1]; }));
        case 'items': return new PyList(Array.from(obj.map.values()).map(function (kv) { return new PyTuple([kv[0], kv[1]]); }));
        case 'pop': {
          var pk = dictKey(args[0]);
          if (obj.map.has(pk)) { var pv = obj.map.get(pk)[1]; obj.map.delete(pk); return pv; }
          if (args.length > 1) return args[1];
          throw err('KeyError', pyRepr(args[0]), line);
        }
      }
      throw err('AttributeError', "'dict' object has no attribute '" + name + "'", line);
    }
    throw err('AttributeError', "'" + typeName(obj) + "' object has no attribute '" + name + "'", line);
  };

  function stripChars(s, chars, mode) {
    var a = 0, b = s.length;
    if (mode & 1) while (a < b && chars.indexOf(s[a]) >= 0) a++;
    if (mode & 2) while (b > a && chars.indexOf(s[b - 1]) >= 0) b--;
    return s.slice(a, b);
  }

  /* ---------------- str / repr / truthiness ---------------- */
  function truthy(v) {
    if (v === null || v === false) return false;
    if (v === true) return true;
    if (typeof v === 'number') return v !== 0;
    if (v instanceof PyFloat) return v.v !== 0;
    if (typeof v === 'string') return v.length > 0;
    if (v instanceof PyList || v instanceof PyTuple) return v.items.length > 0;
    if (v instanceof PyDict) return v.map.size > 0;
    if (v instanceof PyRange) return v.length() > 0;
    return true;
  }

  function floatStr(x) {
    if (!isFinite(x)) return x > 0 ? 'inf' : (x < 0 ? '-inf' : 'nan');
    if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
    return String(x);
  }

  function pyStr(v) {
    if (v === null) return 'None';
    if (v === true) return 'True';
    if (v === false) return 'False';
    if (typeof v === 'number') return String(v);
    if (v instanceof PyFloat) return floatStr(v.v);
    if (typeof v === 'string') return v;
    if (v instanceof PyList) return '[' + v.items.map(pyRepr).join(', ') + ']';
    if (v instanceof PyTuple) {
      if (v.items.length === 1) return '(' + pyRepr(v.items[0]) + ',)';
      return '(' + v.items.map(pyRepr).join(', ') + ')';
    }
    if (v instanceof PyDict) {
      var ps = [];
      v.map.forEach(function (kv) { ps.push(pyRepr(kv[0]) + ': ' + pyRepr(kv[1])); });
      return '{' + ps.join(', ') + '}';
    }
    if (v instanceof PyRange) {
      return v.step === 1 ? 'range(' + v.start + ', ' + v.stop + ')'
        : 'range(' + v.start + ', ' + v.stop + ', ' + v.step + ')';
    }
    if (v instanceof PyFunction) return '<function ' + v.name + '>';
    if (v && v.builtin) return '<built-in function ' + v.builtin + '>';
    return String(v);
  }

  function pyRepr(v) {
    if (typeof v === 'string') {
      var q = v.indexOf("'") >= 0 && v.indexOf('"') < 0 ? '"' : "'";
      var esc = v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      if (q === "'") esc = esc.replace(/'/g, "\\'");
      return q + esc + q;
    }
    return pyStr(v);
  }

  function formatValue(v, spec, line) {
    if (!spec) return pyStr(v);
    var m = /^\.(\d+)f$/.exec(spec);
    if (m) {
      var n = numVal(v);
      if (n === null) throw err('ValueError', "Unknown format code 'f' for object of type '" + typeName(v) + "'", line);
      return n.toFixed(parseInt(m[1], 10));
    }
    var m2 = /^0?(\d+)d$/.exec(spec);
    if (m2) {
      var iv = numVal(v);
      var s = String(Math.trunc(Math.abs(iv)));
      var pad = spec[0] === '0' ? '0' : ' ';
      while (s.length < parseInt(m2[1], 10) - (iv < 0 ? 1 : 0)) s = pad + s;
      return (iv < 0 ? '-' : '') + s;
    }
    var m3 = /^[<>^](\d+)$/.exec(spec);
    if (m3) {
      var w = parseInt(m3[1], 10), str = pyStr(v);
      while (str.length < w) {
        if (spec[0] === '<') str = str + ' ';
        else if (spec[0] === '>') str = ' ' + str;
        else str = (str.length % 2 === 0) ? str + ' ' : ' ' + str;
      }
      return str;
    }
    throw err('ValueError', "unsupported format spec '" + spec + "' (this game supports .Nf, Nd, and <N/>N/^N)", line);
  }

  /* ---------------- Public API ---------------- */
  function run(source, opts) {
    opts = opts || {};
    var interp = new Interp(opts);
    var result = { stdout: '', error: null };
    try {
      interp.run(source);
    } catch (e) {
      if (e && e.pyError) {
        result.error = { type: e.type, message: e.msg, line: e.line };
      } else if (e instanceof RangeError) {
        result.error = { type: 'RecursionError', message: 'maximum recursion depth exceeded', line: null };
      } else {
        result.error = { type: 'InternalError', message: String(e && e.message || e), line: null };
      }
    }
    result.stdout = interp.stdout.join('');
    return result;
  }

  var api = { run: run, version: 'GTC-Py 1.0 (teaching subset of Python 3)' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GTCPython = api;
})(typeof window !== 'undefined' ? window : globalThis);
