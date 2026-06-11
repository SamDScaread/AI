/* ============================================================
 * 侠盗猎码 Grand Theft Code — 轻量代码编辑器
 * textarea + highlighted overlay, line numbers, smart indent.
 * Zero dependencies.
 * ============================================================ */
(function (global) {
  'use strict';

  var PY_KW = ['False', 'None', 'True', 'and', 'or', 'not', 'if', 'elif', 'else', 'while',
    'for', 'in', 'def', 'return', 'break', 'continue', 'pass', 'global', 'import', 'from',
    'class', 'lambda', 'try', 'except', 'is', 'with', 'as'];
  var PY_BUILTIN = ['print', 'input', 'len', 'range', 'int', 'float', 'str', 'bool', 'abs',
    'max', 'min', 'sum', 'sorted', 'round', 'list', 'ord', 'chr', 'type', 'reversed'];
  var CPP_KW = ['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'string', 'if',
    'else', 'while', 'for', 'do', 'return', 'break', 'continue', 'true', 'false', 'using',
    'namespace', 'std', 'const', 'vector', 'auto', 'struct', 'class', 'include', 'unsigned'];
  var CPP_BUILTIN = ['cout', 'cin', 'endl', 'to_string', 'stoi', 'abs', 'max', 'min', 'swap',
    'sqrt', 'pow', 'getline', 'sort', 'reverse', 'push_back', 'pop_back', 'size', 'length',
    'substr', 'main', 'tolower', 'toupper'];

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(code, lang) {
    // tokenize crudely: strings, comments, numbers, words
    var out = '';
    var i = 0, n = code.length;
    var kw = lang === 'py' ? PY_KW : CPP_KW;
    var bi = lang === 'py' ? PY_BUILTIN : CPP_BUILTIN;
    while (i < n) {
      var c = code[i];
      // comments
      if (lang === 'py' && c === '#') {
        var e1 = code.indexOf('\n', i); if (e1 < 0) e1 = n;
        out += '<span class="tok-com">' + esc(code.slice(i, e1)) + '</span>'; i = e1; continue;
      }
      if (lang === 'cpp' && c === '/' && code[i + 1] === '/') {
        var e2 = code.indexOf('\n', i); if (e2 < 0) e2 = n;
        out += '<span class="tok-com">' + esc(code.slice(i, e2)) + '</span>'; i = e2; continue;
      }
      if (lang === 'cpp' && c === '/' && code[i + 1] === '*') {
        var e3 = code.indexOf('*/', i + 2); e3 = e3 < 0 ? n : e3 + 2;
        out += '<span class="tok-com">' + esc(code.slice(i, e3)) + '</span>'; i = e3; continue;
      }
      if (lang === 'cpp' && c === '#') {
        var e4 = code.indexOf('\n', i); if (e4 < 0) e4 = n;
        out += '<span class="tok-pre">' + esc(code.slice(i, e4)) + '</span>'; i = e4; continue;
      }
      // strings
      if (c === '"' || c === "'") {
        var q = c, j = i + 1;
        while (j < n && code[j] !== q && code[j] !== '\n') {
          if (code[j] === '\\') j++;
          j++;
        }
        j = Math.min(n, j + 1);
        // f-string prefix
        var pre = '';
        if (lang === 'py' && i > 0 && /[fF]/.test(code[i - 1])) { /* prefix already emitted as word */ }
        out += '<span class="tok-str">' + pre + esc(code.slice(i, j)) + '</span>'; i = j; continue;
      }
      // numbers
      if (/[0-9]/.test(c)) {
        var m = /^\d+(\.\d+)?([eE][+-]?\d+)?[fFlLuU]*/.exec(code.slice(i));
        out += '<span class="tok-num">' + esc(m[0]) + '</span>'; i += m[0].length; continue;
      }
      // words
      if (/[A-Za-z_]/.test(c)) {
        var m2 = /^[A-Za-z_][A-Za-z0-9_]*/.exec(code.slice(i));
        var w = m2[0];
        var cls = kw.indexOf(w) >= 0 ? 'tok-kw' : (bi.indexOf(w) >= 0 ? 'tok-fn' : null);
        out += cls ? '<span class="' + cls + '">' + esc(w) + '</span>' : esc(w);
        i += w.length; continue;
      }
      out += esc(c); i++;
    }
    return out;
  }

  function Editor(container, opts) {
    opts = opts || {};
    this.lang = opts.lang || 'py';
    this.onChange = opts.onChange || null;

    container.classList.add('gtc-editor');
    container.innerHTML =
      '<div class="ed-gutter"></div>' +
      '<div class="ed-body">' +
      '  <pre class="ed-highlight" aria-hidden="true"><code></code></pre>' +
      '  <textarea class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>' +
      '</div>';
    this.gutter = container.querySelector('.ed-gutter');
    this.hl = container.querySelector('.ed-highlight code');
    this.hlPre = container.querySelector('.ed-highlight');
    this.ta = container.querySelector('.ed-input');

    var self = this;
    this.ta.addEventListener('input', function () { self.refresh(); if (self.onChange) self.onChange(); });
    this.ta.addEventListener('scroll', function () {
      self.hlPre.scrollTop = self.ta.scrollTop;
      self.hlPre.scrollLeft = self.ta.scrollLeft;
      self.gutter.scrollTop = self.ta.scrollTop;
    });
    this.ta.addEventListener('keydown', function (e) { self.onKey(e); });
    this.setValue(opts.value || '');
  }

  Editor.prototype.onKey = function (e) {
    var ta = this.ta;
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = ta.selectionStart, t = ta.selectionEnd, v = ta.value;
      if (e.shiftKey) {
        // unindent current line
        var ls = v.lastIndexOf('\n', s - 1) + 1;
        var removed = 0;
        while (removed < 4 && v[ls] === ' ') { v = v.slice(0, ls) + v.slice(ls + 1); removed++; }
        ta.value = v;
        ta.selectionStart = ta.selectionEnd = Math.max(ls, s - removed);
      } else {
        ta.value = v.slice(0, s) + '    ' + v.slice(t);
        ta.selectionStart = ta.selectionEnd = s + 4;
      }
      this.refresh();
      if (this.onChange) this.onChange();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      var s2 = ta.selectionStart, v2 = ta.value;
      var ls2 = v2.lastIndexOf('\n', s2 - 1) + 1;
      var line = v2.slice(ls2, s2);
      var indent = (/^[ ]*/.exec(line))[0];
      var extra = '';
      var trimmed = line.replace(/\s+$/, '');
      if (this.lang === 'py' && /:$/.test(trimmed)) extra = '    ';
      if (this.lang === 'cpp' && /\{$/.test(trimmed)) extra = '    ';
      var ins = '\n' + indent + extra;
      ta.value = v2.slice(0, s2) + ins + v2.slice(ta.selectionEnd);
      ta.selectionStart = ta.selectionEnd = s2 + ins.length;
      this.refresh();
      if (this.onChange) this.onChange();
      return;
    }
    // auto-close brackets
    var pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key] && ta.selectionStart === ta.selectionEnd) {
      var s3 = ta.selectionStart, v3 = ta.value;
      var nextCh = v3[s3] || '';
      // don't double-close quotes when next char is the same quote
      if ((e.key === '"' || e.key === "'") && nextCh === e.key) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = s3 + 1;
        return;
      }
      if (nextCh === '' || /[\s)\]},;:]/.test(nextCh)) {
        e.preventDefault();
        ta.value = v3.slice(0, s3) + e.key + pairs[e.key] + v3.slice(s3);
        ta.selectionStart = ta.selectionEnd = s3 + 1;
        this.refresh();
        if (this.onChange) this.onChange();
        return;
      }
    }
    // skip over an existing closing bracket
    if ([')', ']', '}'].indexOf(e.key) >= 0 && ta.selectionStart === ta.selectionEnd) {
      if (ta.value[ta.selectionStart] === e.key) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1;
        return;
      }
    }
  };

  Editor.prototype.refresh = function () {
    var code = this.ta.value;
    this.hl.innerHTML = highlight(code, this.lang) + '\n';
    var lines = code.split('\n').length;
    var g = '';
    for (var i = 1; i <= lines; i++) g += i + '\n';
    this.gutter.textContent = g;
  };

  Editor.prototype.setValue = function (v) { this.ta.value = v; this.refresh(); };
  Editor.prototype.getValue = function () { return this.ta.value; };
  Editor.prototype.setLang = function (l) { this.lang = l; this.refresh(); };
  Editor.prototype.focus = function () { this.ta.focus(); };

  var api = { Editor: Editor, highlight: highlight };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.GTCEditor = api;
})(typeof window !== 'undefined' ? window : globalThis);
