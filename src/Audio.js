class RushAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engine = null;
    this.engineGain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.18;
    this.master.connect(this.ctx.destination);
    this.engine = this.ctx.createOscillator();
    this.engine.type = "sawtooth";
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.03;
    this.engine.connect(this.engineGain).connect(this.master);
    this.engine.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.18, this.ctx.currentTime, 0.04);
  }

  update(speed, boosting) {
    this.ensure();
    if (!this.ctx || !this.engine) return;
    const f = 55 + Math.min(230, speed * 4.2) + (boosting ? 70 : 0);
    this.engine.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(boosting ? 0.075 : 0.035, this.ctx.currentTime, 0.05);
  }

  blip(kind = "boost") {
    this.ensure();
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = kind === "crush" ? "square" : "triangle";
    osc.frequency.value = kind === "crush" ? 90 : 520;
    gain.gain.value = kind === "crush" ? 0.18 : 0.1;
    osc.connect(gain).connect(this.master);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (kind === "crush" ? 0.28 : 0.16));
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const audio = new RushAudio();
