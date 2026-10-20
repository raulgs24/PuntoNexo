// Sonido procedimental con WebAudio: lluvia, zumbido, campanilla, teléfono, pasos, radio de jazz...
// No hace falta ningún fichero de audio.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ringTimer = null;
    this.musicTimer = null;
    this.heart = { level: 0, next: 0 };
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);

    // Reverberación corta para el vestíbulo
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.35;
    this.reverb.connect(this.reverbGain).connect(this.master);

    this.noiseBuf = this.makeNoise(3);
    this.startAmbience();
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  makeNoise(seconds) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965545;
      b2 = 0.57 * b2 + white * 1.0526913;
      d[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
    }
    return buf;
  }

  impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = rate * seconds;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  out(node, wet = 0.3) {
    node.connect(this.master);
    if (wet > 0) {
      const g = this.ctx.createGain();
      g.gain.value = wet;
      node.connect(g).connect(this.reverb);
    }
  }

  noiseSource(loop = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = loop;
    return src;
  }

  env(gainNode, t0, attack, peak, decay) {
    gainNode.gain.setValueAtTime(0.0001, t0);
    gainNode.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  tone(freq, { type = 'sine', t0 = this.t, attack = 0.005, peak = 0.2, decay = 0.5, wet = 0.3, detune = 0 } = {}) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = this.ctx.createGain();
    this.env(g, t0, attack, peak, decay);
    o.connect(g);
    this.out(g, wet);
    o.start(t0);
    o.stop(t0 + attack + decay + 0.05);
  }

  noiseBurst({ t0 = this.t, freq = 1000, q = 1, type = 'bandpass', attack = 0.005, peak = 0.3, decay = 0.2, wet = 0.2 } = {}) {
    if (!this.ctx) return;
    const src = this.noiseSource();
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t0, attack, peak, decay);
    src.connect(f).connect(g);
    this.out(g, wet);
    src.start(t0, Math.random() * 2);
    src.stop(t0 + attack + decay + 0.05);
  }

  // ---------- Ambiente ----------
  startAmbience() {
    const c = this.ctx;
    // Lluvia
    const rain = this.noiseSource(true);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5000;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0.22;
    rain.connect(hp).connect(lp).connect(this.rainGain);
    this.out(this.rainGain, 0.1);
    rain.start();

    // Zumbido grave del edificio
    this.droneGain = c.createGain();
    this.droneGain.gain.value = 0.05;
    const droneFilter = c.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    for (const f of [55, 55.4, 82.5]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(droneFilter);
      o.start();
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start();
    droneFilter.connect(this.droneGain);
    this.out(this.droneGain, 0.2);

    this.startMusic();
  }

  setRain(on) {
    if (!this.ctx) return;
    this.rainGain.gain.setTargetAtTime(on ? 0.22 : 0.0001, this.t, 1.5);
  }

  setTension(level) {
    if (!this.ctx) return;
    this.droneGain.gain.setTargetAtTime(0.05 + level * 0.12, this.t, 0.8);
  }

  // Radio del vestíbulo: acordes de jazz menor muy suaves.
  startMusic() {
    const chords = [
      [57, 60, 64, 67, 71],
      [50, 57, 60, 65, 69],
      [53, 57, 60, 64, 67],
      [52, 56, 59, 62, 65],
    ];
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    this.musicGain.connect(lp);
    this.out(lp, 0.5);
    let i = 0;
    const play = () => {
      if (!this.ctx) return;
      const t0 = this.t + 0.05;
      const chord = chords[i % chords.length];
      chord.forEach((n, k) => {
        const o = this.ctx.createOscillator();
        o.type = k === 0 ? 'triangle' : 'sine';
        o.frequency.value = midi(k === 0 ? n - 12 : n);
        const g = this.ctx.createGain();
        const start = t0 + k * 0.06;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(k === 0 ? 0.05 : 0.018, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 3.6);
        o.connect(g).connect(this.musicGain);
        o.start(start);
        o.stop(start + 3.8);
      });
      i++;
      this.musicTimer = setTimeout(play, 3600);
    };
    play();
  }

  setMusic(on) {
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0.0001, this.t, 1.0);
  }

  // ---------- Efectos ----------
  bell() {
    const t0 = this.t;
    for (const [f, p] of [
      [2093, 0.18],
      [2637, 0.08],
      [4186, 0.05],
      [5274, 0.03],
    ]) {
      this.tone(f, { t0, peak: p, decay: 1.6, wet: 0.5 });
    }
  }

  buzzer() {
    const t0 = this.t;
    this.tone(110, { type: 'square', t0, attack: 0.01, peak: 0.12, decay: 0.6, wet: 0.2 });
    this.tone(116, { type: 'square', t0, attack: 0.01, peak: 0.1, decay: 0.6, wet: 0.2 });
  }

  click() {
    this.noiseBurst({ freq: 3000, q: 2, peak: 0.25, decay: 0.04, wet: 0.05 });
  }

  type() {
    this.noiseBurst({ freq: 2500 + Math.random() * 1500, q: 3, peak: 0.05, decay: 0.03, wet: 0 });
  }

  paper() {
    this.noiseBurst({ freq: 4000, q: 0.6, type: 'highpass', attack: 0.02, peak: 0.12, decay: 0.25, wet: 0.05 });
  }

  footstep(volume = 1) {
    this.noiseBurst({ freq: 180 + Math.random() * 60, q: 1.2, type: 'lowpass', peak: 0.35 * volume, decay: 0.09, wet: 0.45 });
    this.noiseBurst({ freq: 2200, q: 4, peak: 0.05 * volume, decay: 0.03, wet: 0.3 });
  }

  door() {
    const t0 = this.t;
    this.noiseBurst({ t0, freq: 120, type: 'lowpass', peak: 0.4, decay: 0.4, wet: 0.5 });
    this.tone(70, { t0, type: 'sine', peak: 0.2, decay: 0.3 });
    // Ráfaga de lluvia al abrir
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(0.5, t0, 0.2);
      this.rainGain.gain.setTargetAtTime(0.22, t0 + 1.8, 0.8);
    }
  }

  elevatorDing() {
    const t0 = this.t;
    this.tone(1318, { t0, peak: 0.15, decay: 1.2, wet: 0.5 });
    this.tone(1046, { t0: t0 + 0.35, peak: 0.15, decay: 1.4, wet: 0.5 });
  }

  elevatorMotor(seconds = 2.5) {
    if (!this.ctx) return;
    const t0 = this.t;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 48;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 160;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    o.connect(f).connect(g);
    this.out(g, 0.3);
    o.start(t0);
    o.stop(t0 + seconds + 0.1);
  }

  phoneRing(on) {
    if (!this.ctx) return;
    clearInterval(this.ringTimer);
    this.ringTimer = null;
    if (!on) return;
    const ring = () => {
      const t0 = this.t;
      for (let k = 0; k < 2; k++) {
        const start = t0 + k * 0.45;
        const o = this.ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = 900;
        const am = this.ctx.createOscillator();
        am.frequency.value = 22;
        const amGain = this.ctx.createGain();
        amGain.gain.value = 0.5;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
        g.gain.setValueAtTime(0.05, start + 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800;
        am.connect(amGain).connect(g.gain);
        o.connect(bp).connect(g);
        this.out(g, 0.4);
        o.start(start);
        am.start(start);
        o.stop(start + 0.45);
        am.stop(start + 0.45);
      }
    };
    ring();
    this.ringTimer = setInterval(ring, 2600);
  }

  // Voz por teléfono: ruido filtrado y estática.
  phoneStatic(seconds = 0.6) {
    this.noiseBurst({ freq: 1500, q: 0.8, peak: 0.08, attack: 0.05, decay: seconds, wet: 0 });
  }

  voiceBlip(pitch = 1, eerie = false) {
    if (!this.ctx) return;
    const f = (eerie ? 90 : 150) * pitch * (0.9 + Math.random() * 0.25);
    this.tone(f, { type: 'triangle', peak: 0.025, attack: 0.01, decay: 0.07, wet: 0.2 });
    if (eerie) this.tone(f * 1.06, { type: 'sawtooth', peak: 0.012, attack: 0.01, decay: 0.09, wet: 0.4 });
  }

  thunder(delay = 0.6) {
    if (!this.ctx) return;
    const t0 = this.t + delay;
    const src = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(800, t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + 3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.5);
    src.connect(lp).connect(g);
    this.out(g, 0.5);
    src.start(t0);
    src.stop(t0 + 3.6);
  }

  flickerBuzz() {
    const t0 = this.t;
    this.tone(120, { type: 'sawtooth', t0, attack: 0.01, peak: 0.05, decay: 0.5, wet: 0.1 });
    this.tone(240, { type: 'square', t0, attack: 0.01, peak: 0.02, decay: 0.4, wet: 0.1 });
  }

  whisper() {
    if (!this.ctx) return;
    const t0 = this.t;
    for (let i = 0; i < 6; i++) {
      this.noiseBurst({
        t0: t0 + i * 0.18 + Math.random() * 0.1,
        freq: 2500 + Math.random() * 3000,
        q: 6,
        attack: 0.04,
        peak: 0.05,
        decay: 0.15,
        wet: 0.8,
      });
    }
  }

  stinger() {
    if (!this.ctx) return;
    const t0 = this.t;
    for (const f of [311, 330, 349, 466]) this.tone(f, { type: 'sawtooth', t0, attack: 0.02, peak: 0.04, decay: 2.2, wet: 0.7 });
    this.tone(55, { type: 'sine', t0, attack: 0.01, peak: 0.3, decay: 1.5, wet: 0.3 });
  }

  jumpscare() {
    if (!this.ctx) return;
    const t0 = this.t;
    this.noiseBurst({ t0, freq: 900, q: 0.4, attack: 0.005, peak: 0.9, decay: 1.4, wet: 0.4 });
    for (const f of [180, 191, 277, 415, 622]) this.tone(f, { type: 'sawtooth', t0, attack: 0.005, peak: 0.12, decay: 1.6, wet: 0.5 });
  }

  glitch() {
    for (let i = 0; i < 5; i++) {
      this.noiseBurst({ t0: this.t + i * 0.05, freq: 500 + Math.random() * 4000, q: 8, peak: 0.12, decay: 0.03, wet: 0.1 });
    }
  }

  knock() {
    const t0 = this.t;
    for (let i = 0; i < 3; i++) this.noiseBurst({ t0: t0 + i * 0.28, freq: 160, q: 2, type: 'lowpass', peak: 0.5, decay: 0.12, wet: 0.6 });
  }

  // Latido que crece cuando algo se acerca.
  updateHeart(level, dt) {
    if (!this.ctx) return;
    this.heart.level = level;
    this.heart.next -= dt;
    if (level > 0.05 && this.heart.next <= 0) {
      const t0 = this.t;
      const peak = 0.15 + level * 0.5;
      this.tone(52, { t0, peak, attack: 0.01, decay: 0.18, wet: 0.05 });
      this.tone(48, { t0: t0 + 0.22, peak: peak * 0.7, attack: 0.01, decay: 0.2, wet: 0.05 });
      this.heart.next = 1.3 - level * 0.75;
    }
  }
}
