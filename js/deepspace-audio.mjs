// 《深空轮盘》程序化恐怖音效引擎。全部用 Web Audio 实时合成，无任何外部音频文件。
// 被 2D 与 3D 两套前端共用。低频嗡鸣底噪 + 随紧张度加速的心跳 + 实弹炸响/警报、
// 空响、装填金属声、道具电子音、局末不和谐刺鸣。
export class AudioKit {
  constructor() { this.on = false; this.interval = 1100; this._hb = null; }
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this._noise = this._makeNoise();
    this.on = true;
    this._drone();
    this._heartbeat();
  }
  _makeNoise() {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _noiseSrc() { const s = this.ctx.createBufferSource(); s.buffer = this._noise; s.loop = true; return s; }
  // 压迫感底噪：两个失谐低频振荡 + 缓慢颤动 + 滤波风噪。
  _drone() {
    const t = this.ctx.currentTime;
    [55, 58.7].forEach((f) => {
      const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.value = 0.12;
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.07 + Math.random() * 0.05;
      const lg = this.ctx.createGain(); lg.gain.value = 0.06;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(this.master); o.start(t); lfo.start(t);
    });
    const n = this._noiseSrc();
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const ng = this.ctx.createGain(); ng.gain.value = 0.05;
    n.connect(lp).connect(ng).connect(this.master); n.start(t);
    this._droneFloor = ng;
  }
  setTension(level) {
    this.interval = 1150 - level * 720; // 越紧张心跳越快
    if (this._droneFloor) this._droneFloor.gain.value = 0.045 + level * 0.06;
  }
  _heartbeat() {
    clearTimeout(this._hb);
    const beat = () => {
      if (!this.on) return;
      this._thump(0.30); setTimeout(() => this._thump(0.2), 150);
      this._hb = setTimeout(beat, this.interval);
    };
    this._hb = setTimeout(beat, this.interval);
  }
  _thump(vol) {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(64, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.18);
  }
  // 实弹：低频炸响 + 噪声爆裂 + 两声刺耳警报。
  bang() {
    if (!this.on) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.36);
    const n = this.ctx.createBufferSource(); n.buffer = this._noise;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(lp).connect(ng).connect(this.master); n.start(t); n.stop(t + 0.2);
    [880, 660].forEach((f, i) => {
      const a = this.ctx.createOscillator(); a.type = 'square'; a.frequency.value = f;
      const ag = this.ctx.createGain(); ag.gain.value = 0;
      ag.gain.setValueAtTime(0, t + 0.05 + i * 0.13); ag.gain.linearRampToValueAtTime(0.06, t + 0.07 + i * 0.13);
      ag.gain.linearRampToValueAtTime(0, t + 0.16 + i * 0.13);
      a.connect(ag).connect(this.master); a.start(t); a.stop(t + 0.32);
    });
  }
  click() { // 空响：沉闷的一声扳机
    if (!this.on) return; const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource(); n.buffer = this._noise;
    const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(bp).connect(g).connect(this.master); n.start(t); n.stop(t + 0.07);
  }
  rack() { // 装填：两声金属机括
    if (!this.on) return;
    [0, 0.09].forEach((dt) => {
      const t = this.ctx.currentTime + dt;
      const n = this.ctx.createBufferSource(); n.buffer = this._noise;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 6;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(bp).connect(g).connect(this.master); n.start(t); n.stop(t + 0.06);
    });
  }
  beep() { // 道具：冷调电子音
    if (!this.on) return; const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 520;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.13);
  }
  sting(kind) { // 局末/结算的不和谐刺鸣
    if (!this.on) return; const t = this.ctx.currentTime;
    const set = kind === 'win' ? [330, 440] : kind === 'lose' ? [110, 116] : [196, 207]; // 胜/负/惊悚
    set.forEach((f) => {
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      o.connect(lp).connect(g).connect(this.master); o.start(t); o.stop(t + 1.5);
    });
  }
}
