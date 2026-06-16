export type SoundEffectType = 'mechanical' | 'retro' | 'ping' | 'wood' | 'pop';

export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static sfxVolume: number = 0.5;
  private static bgmVolume: number = 0.3;
  private static isMuted: boolean = false;
  
  private static bgmAudioElement: HTMLAudioElement | null = null;
  private static bgmGain: GainNode | null = null;
  private static bgmSourceNode: MediaElementAudioSourceNode | null = null;
  private static bgmIsPlaying: boolean = false;

  private static getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.updateMasterVolume();
    }
    return this.ctx;
  }

  static setMuted(muted: boolean) {
    this.isMuted = muted;
    this.updateMasterVolume();
    if (this.bgmAudioElement && !this.bgmSourceNode) {
        this.bgmAudioElement.volume = this.isMuted ? 0 : this.bgmVolume;
    }
  }

  static setVolume(volume: number) {
    this.sfxVolume = volume;
  }

  private static updateMasterVolume() {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx!.currentTime, 0.05);
  }

  private static bgmOnEndedCallback: (() => void) | null = null;
  static setBgmEndedCallback(callback: () => void) {
    this.bgmOnEndedCallback = callback;
    if (this.bgmAudioElement) {
      this.bgmAudioElement.onended = this.bgmOnEndedCallback;
    }
  }

  static async loadBGM(file: File | Blob): Promise<string> {
    try {
      if (!this.bgmAudioElement) {
        this.bgmAudioElement = new Audio();
        // this.bgmAudioElement.loop = true; // DO NOT SET LOOP TO TRUE
        if (this.bgmOnEndedCallback) {
          this.bgmAudioElement.onended = this.bgmOnEndedCallback;
        }
        try {
            const ctx = this.getCtx();
            this.bgmGain = ctx.createGain();
            this.bgmGain.connect(this.masterGain!);
            this.bgmGain.gain.value = this.bgmVolume;
            // Note: iOS Safari sometimes fails strictly here. Fallback below.
            this.bgmSourceNode = ctx.createMediaElementSource(this.bgmAudioElement);
            this.bgmSourceNode.connect(this.bgmGain);
        } catch (err) {
            console.warn("bypassing WebAudio for BGM", err);
            this.bgmSourceNode = null;
            this.bgmAudioElement.volume = this.isMuted ? 0 : this.bgmVolume;
        }
      } else {
          this.bgmAudioElement.pause();
          if (this.bgmAudioElement.src && this.bgmAudioElement.src.startsWith('blob:')) {
              URL.revokeObjectURL(this.bgmAudioElement.src);
          }
      }

      this.bgmAudioElement.src = URL.createObjectURL(file);
      this.bgmAudioElement.load();

      return (file as File).name || 'stored-track';
    } catch (e) {
      console.error('Failed to prepare audio stream:', e);
      throw e;
    }
  }

  static stopBGM() {
    if (this.bgmAudioElement) {
      this.bgmAudioElement.pause();
      this.bgmAudioElement.currentTime = 0;
    }
    this.bgmIsPlaying = false;
  }

  static pauseBGM() {
    if (this.bgmAudioElement && this.bgmIsPlaying) {
      this.bgmAudioElement.pause();
      this.bgmIsPlaying = false;
    }
  }

  static playBGM() {
    if (!this.bgmAudioElement) return;
    
    if (this.bgmIsPlaying) return;

    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
    }

    this.bgmAudioElement.play().catch(console.error);
    this.bgmIsPlaying = true;
  }

  static setBgmVolume(volume: number) {
    this.bgmVolume = volume;
    if (this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume, this.getCtx().currentTime, 0.1);
    }
    if (this.bgmAudioElement && !this.bgmSourceNode) {
        this.bgmAudioElement.volume = this.isMuted ? 0 : this.bgmVolume;
    }
  }

  static getBgmTime(): number {
    return this.bgmAudioElement ? this.bgmAudioElement.currentTime : 0;
  }

  static getBgmDuration(): number {
    return this.bgmAudioElement ? this.bgmAudioElement.duration || 0 : 0;
  }

  static seekBgm(time: number) {
    if (this.bgmAudioElement) {
      this.bgmAudioElement.currentTime = time;
    }
  }

  static playPoseChange(type: SoundEffectType = 'mechanical') {
    if (this.isMuted) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(this.masterGain!);
    
    // SFX volume relative to master
    const vol = this.sfxVolume * 0.5;

    switch (type) {
      case 'mechanical':
        this.playMechanical(ctx, gain, now, vol);
        break;
      case 'retro':
        this.playRetro(ctx, gain, now, vol);
        break;
      case 'ping':
        this.playPing(ctx, gain, now, vol);
        break;
      case 'wood':
        this.playWood(ctx, gain, now, vol);
        break;
      case 'pop':
        this.playPop(ctx, gain, now, vol);
        break;
    }
  }

  private static playMechanical(ctx: AudioContext, gain: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.15);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(1200, now);
    clickGain.gain.setValueAtTime(vol * 0.5, now);
    clickGain.gain.linearRampToValueAtTime(0, now + 0.02);
    click.connect(clickGain);
    clickGain.connect(gain);
    click.start();
    click.stop(now + 0.02);
  }

  private static playRetro(ctx: AudioContext, gain: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.1);
  }

  private static playPing(ctx: AudioContext, gain: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.3);
  }

  private static playWood(ctx: AudioContext, gain: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.05);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.08);
  }

  private static playPop(ctx: AudioContext, gain: GainNode, now: number, vol: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.02);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.connect(gain);
    osc.start();
    osc.stop(now + 0.05);
  }
}
