import { BeatPatternType, MusicTrackId, SongSectionType } from './types';
import { calculateCoolingFanAudioParams, CoolingFanAudioParams } from './rules';

/**
 * Full 6-Track Procedural Music Reserve & Multi-Section Narrative Sequencer.
 * Zero external audio files — synthesizes 6 distinct multi-bar musical tracks with
 * dynamic section arrangements ('intro' | 'verse' | 'cutscene' | 'blackout' | 'chorus' | 'climax')
 * + distinct per-panel Rhythm Doctor telegraph cues locked to hardware AudioContext.currentTime.
 */

interface ChordStep {
  bassRoot: number;
  bassFifth: number;
  padNotes: [number, number, number];
  arpNotes: number[];
  counterNotes: number[];
}

interface TrackComposition {
  leadWaveform: OscillatorType;
  bassWaveform: OscillatorType;
  padWaveform: OscillatorType;
  swingFeel: number;
  chords: ChordStep[];
}

const TRACK_COMPOSITIONS: Record<MusicTrackId, TrackComposition> = {
  // Track 01: Act I Continuous Chapter Story Suite (8-Bar Narrative Progression: F#m -> D -> Bm -> C#7 -> D -> E -> F#m -> C#7)
  track_one_shift_more: {
    leadWaveform: 'square',
    bassWaveform: 'sawtooth',
    padWaveform: 'sawtooth',
    swingFeel: 0,
    chords: [
      {
        bassRoot: 46.25, // F#1
        bassFifth: 69.3, // C#2
        padNotes: [185.0, 220.0, 277.18],
        arpNotes: [369.99, 440.0, 554.37, 739.99, 659.25, 554.37, 493.88],
        counterNotes: [739.99, 880.0, 1108.73, 987.77, 880.0, 739.99, 659.25],
      },
      {
        bassRoot: 73.42, // D2
        bassFifth: 110.0, // A2
        padNotes: [293.66, 369.99, 440.0],
        arpNotes: [587.33, 739.99, 880.0, 1174.66, 987.77, 880.0, 739.99],
        counterNotes: [880.0, 1174.66, 1108.73, 880.0, 739.99, 659.25, 587.33],
      },
      {
        bassRoot: 61.74, // B1
        bassFifth: 92.5, // F#2
        padNotes: [246.94, 293.66, 369.99],
        arpNotes: [493.88, 587.33, 739.99, 987.77, 880.0, 739.99, 659.25],
        counterNotes: [739.99, 987.77, 880.0, 739.99, 659.25, 587.33, 493.88],
      },
      {
        bassRoot: 69.3, // C#2
        bassFifth: 103.83, // G#2
        padNotes: [277.18, 349.23, 415.3],
        arpNotes: [554.37, 698.46, 830.61, 1108.73, 830.61, 698.46, 739.99],
        counterNotes: [830.61, 1108.73, 1396.91, 1108.73, 830.61, 698.46, 739.99],
      },
      {
        bassRoot: 73.42, // D2 (Hopeful Chorus Lift)
        bassFifth: 110.0,
        padNotes: [293.66, 369.99, 493.88],
        arpNotes: [587.33, 739.99, 987.77, 1174.66, 987.77, 880.0, 739.99],
        counterNotes: [1174.66, 1108.73, 987.77, 880.0, 739.99, 880.0, 987.77],
      },
      {
        bassRoot: 82.41, // E2
        bassFifth: 123.47, // B2
        padNotes: [329.63, 415.3, 493.88],
        arpNotes: [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61, 739.99],
        counterNotes: [987.77, 1318.51, 1108.73, 987.77, 830.61, 739.99, 659.25],
      },
      {
        bassRoot: 92.5, // F#2
        bassFifth: 138.59, // C#3
        padNotes: [369.99, 440.0, 554.37],
        arpNotes: [739.99, 880.0, 1108.73, 1479.98, 1108.73, 880.0, 739.99],
        counterNotes: [1108.73, 1479.98, 1318.51, 1108.73, 987.77, 880.0, 739.99],
      },
      {
        bassRoot: 69.3, // C#2 Turnaround
        bassFifth: 103.83,
        padNotes: [277.18, 349.23, 493.88],
        arpNotes: [554.37, 698.46, 830.61, 987.77, 1108.73, 1396.91, 1479.98],
        counterNotes: [830.61, 987.77, 1108.73, 1396.91, 1108.73, 987.77, 1479.98],
      },
    ],
  },

  // Track 02: Operating Theatre 200 OK (Hospital Jazz-Funk in C Dorian / C Minor)
  track_operating_theatre: {
    leadWaveform: 'triangle',
    bassWaveform: 'triangle',
    padWaveform: 'sine',
    swingFeel: 0.02,
    chords: [
      {
        bassRoot: 65.41, // C2
        bassFifth: 98.0, // G2
        padNotes: [261.63, 311.13, 392.0],
        arpNotes: [523.25, 622.25, 783.99, 932.33, 783.99, 622.25, 587.33],
        counterNotes: [783.99, 932.33, 1046.5, 932.33, 783.99, 698.46, 622.25],
      },
      {
        bassRoot: 87.31, // F2 Dorian IV7
        bassFifth: 130.81, // C3
        padNotes: [261.63, 349.23, 440.0], // F4, A4, C5
        arpNotes: [523.25, 698.46, 880.0, 1046.5, 880.0, 698.46, 622.25],
        counterNotes: [880.0, 1046.5, 1174.66, 1046.5, 880.0, 783.99, 698.46],
      },
      {
        bassRoot: 77.78, // Eb2
        bassFifth: 116.54, // Bb2
        padNotes: [311.13, 392.0, 466.16],
        arpNotes: [622.25, 783.99, 932.33, 1174.66, 932.33, 783.99, 698.46],
        counterNotes: [932.33, 1174.66, 1046.5, 932.33, 783.99, 698.46, 622.25],
      },
      {
        bassRoot: 58.27, // Bb1
        bassFifth: 87.31, // F2
        padNotes: [233.08, 293.66, 349.23],
        arpNotes: [466.16, 587.33, 698.46, 932.33, 783.99, 698.46, 1046.5],
        counterNotes: [698.46, 932.33, 1046.5, 1174.66, 932.33, 783.99, 1046.5],
      },
      {
        bassRoot: 51.91, // Ab1
        bassFifth: 77.78, // Eb2
        padNotes: [207.65, 261.63, 311.13],
        arpNotes: [415.3, 523.25, 622.25, 830.61, 783.99, 622.25, 523.25],
        counterNotes: [830.61, 783.99, 622.25, 523.25, 622.25, 783.99, 830.61],
      },
      {
        bassRoot: 49.0, // G1 alt
        bassFifth: 73.42, // D2
        padNotes: [196.0, 246.94, 311.13],
        arpNotes: [392.0, 493.88, 587.33, 783.99, 622.25, 493.88, 783.99],
        counterNotes: [783.99, 987.77, 1174.66, 987.77, 783.99, 622.25, 1046.5],
      },
    ],
  },

  // Track 03: 03:00 AM PagerDuty Lullaby (Lo-Fi Cyberpunk Chillstep in G Minor 9)
  track_midnight_pager: {
    leadWaveform: 'sine',
    bassWaveform: 'triangle',
    padWaveform: 'triangle',
    swingFeel: 0.015,
    chords: [
      {
        bassRoot: 49.0, // G1
        bassFifth: 73.42, // D2
        padNotes: [196.0, 233.08, 293.66], // G3, Bb3, D4
        arpNotes: [587.33, 698.46, 880.0, 783.99, 698.46, 587.33, 466.16],
        counterNotes: [880.0, 783.99, 698.46, 587.33, 698.46, 783.99, 932.33],
      },
      {
        bassRoot: 77.78, // Eb2
        bassFifth: 116.54, // Bb2
        padNotes: [233.08, 293.66, 392.0], // EbMaj9
        arpNotes: [622.25, 783.99, 932.33, 880.0, 783.99, 622.25, 587.33],
        counterNotes: [932.33, 880.0, 783.99, 698.46, 622.25, 783.99, 932.33],
      },
      {
        bassRoot: 65.41, // C2
        bassFifth: 98.0, // G2
        padNotes: [261.63, 311.13, 392.0],
        arpNotes: [523.25, 622.25, 783.99, 932.33, 783.99, 622.25, 587.33],
        counterNotes: [783.99, 932.33, 1046.5, 783.99, 698.46, 622.25, 587.33],
      },
      {
        bassRoot: 73.42, // D2
        bassFifth: 110.0, // A2
        padNotes: [220.0, 293.66, 369.99], // D7
        arpNotes: [587.33, 739.99, 880.0, 1174.66, 880.0, 739.99, 783.99],
        counterNotes: [739.99, 880.0, 1046.5, 1174.66, 1046.5, 880.0, 783.99],
      },
    ],
  },

  // Track 04: Kernel Overdrive (Cybernetic Darksynth in A Harmonic Minor)
  track_kernel_overdrive: {
    leadWaveform: 'sawtooth',
    bassWaveform: 'sawtooth',
    padWaveform: 'sawtooth',
    swingFeel: 0,
    chords: [
      {
        bassRoot: 55.0, // A1
        bassFifth: 82.41, // E2
        padNotes: [220.0, 261.63, 329.63],
        arpNotes: [440.0, 523.25, 659.25, 880.0, 783.99, 659.25, 587.33],
        counterNotes: [880.0, 1046.5, 987.77, 880.0, 783.99, 659.25, 587.33],
      },
      {
        bassRoot: 43.65, // F1
        bassFifth: 65.41, // C2
        padNotes: [174.61, 220.0, 261.63],
        arpNotes: [349.23, 440.0, 523.25, 698.46, 659.25, 523.25, 440.0],
        counterNotes: [698.46, 880.0, 783.99, 698.46, 659.25, 523.25, 659.25],
      },
      {
        bassRoot: 73.42, // D2
        bassFifth: 110.0, // A2
        padNotes: [220.0, 293.66, 349.23],
        arpNotes: [587.33, 698.46, 880.0, 1174.66, 880.0, 698.46, 659.25],
        counterNotes: [880.0, 1174.66, 1046.5, 880.0, 783.99, 698.46, 659.25],
      },
      {
        bassRoot: 82.41, // E2
        bassFifth: 123.47, // B2
        padNotes: [246.94, 329.63, 415.3],
        arpNotes: [493.88, 659.25, 830.61, 987.77, 830.61, 659.25, 880.0],
        counterNotes: [830.61, 987.77, 1174.66, 987.77, 830.61, 783.99, 880.0],
      },
    ],
  },

  // Track 05: Phantom of the Mutex Ring (Spectral Glitch-Hop in E Phrygian Dominant)
  track_mutex_ghost: {
    leadWaveform: 'square',
    bassWaveform: 'triangle',
    padWaveform: 'sawtooth',
    swingFeel: 0.01,
    chords: [
      {
        bassRoot: 82.41, // E2
        bassFifth: 123.47, // B2
        padNotes: [246.94, 329.63, 392.0], // Em
        arpNotes: [659.25, 698.46, 830.61, 987.77, 830.61, 698.46, 659.25],
        counterNotes: [987.77, 1046.5, 987.77, 830.61, 698.46, 659.25, 587.33],
      },
      {
        bassRoot: 87.31, // F2 (Phrygian bII)
        bassFifth: 130.81, // C3
        padNotes: [261.63, 349.23, 440.0], // Fmaj7
        arpNotes: [698.46, 880.0, 1046.5, 987.77, 880.0, 698.46, 659.25],
        counterNotes: [1046.5, 987.77, 880.0, 783.99, 698.46, 659.25, 698.46],
      },
      {
        bassRoot: 73.42, // D2
        bassFifth: 110.0, // A2
        padNotes: [220.0, 293.66, 349.23], // Dm
        arpNotes: [587.33, 698.46, 880.0, 987.77, 880.0, 698.46, 587.33],
        counterNotes: [880.0, 987.77, 880.0, 698.46, 587.33, 523.25, 493.88],
      },
      {
        bassRoot: 61.74, // B17
        bassFifth: 92.5, // F#2
        padNotes: [246.94, 293.66, 369.99],
        arpNotes: [493.88, 622.25, 739.99, 987.77, 739.99, 622.25, 659.25],
        counterNotes: [739.99, 987.77, 1174.66, 987.77, 739.99, 659.25, 987.77],
      },
    ],
  },

  // Track 06: SYN-ACK Megalovania (High-Octane 16-Bit Boss Chiptune in D Minor)
  track_ddos_megalovania: {
    leadWaveform: 'square',
    bassWaveform: 'sawtooth',
    padWaveform: 'sawtooth',
    swingFeel: 0,
    chords: [
      {
        bassRoot: 73.42, // D2
        bassFifth: 110.0, // A2
        padNotes: [293.66, 349.23, 440.0],
        arpNotes: [587.33, 587.33, 1174.66, 880.0, 830.61, 783.99, 698.46],
        counterNotes: [1174.66, 1174.66, 1396.91, 1174.66, 1046.5, 880.0, 1174.66],
      },
      {
        bassRoot: 58.27, // Bb1
        bassFifth: 87.31, // F2
        padNotes: [233.08, 293.66, 349.23],
        arpNotes: [466.16, 466.16, 1174.66, 880.0, 830.61, 783.99, 698.46],
        counterNotes: [932.33, 932.33, 1174.66, 1046.5, 880.0, 783.99, 932.33],
      },
      {
        bassRoot: 49.0, // G1
        bassFifth: 73.42, // D2
        padNotes: [196.0, 233.08, 293.66],
        arpNotes: [392.0, 392.0, 1174.66, 880.0, 830.61, 783.99, 698.46],
        counterNotes: [783.99, 880.0, 932.33, 1046.5, 880.0, 783.99, 698.46],
      },
      {
        bassRoot: 55.0, // A1
        bassFifth: 82.41, // E2
        padNotes: [220.0, 277.18, 329.63],
        arpNotes: [440.0, 554.37, 659.25, 880.0, 830.61, 880.0, 1174.66],
        counterNotes: [880.0, 1108.73, 1318.51, 1108.73, 880.0, 1108.73, 1174.66],
      },
    ],
  },
};

const LEGACY_KEY_TO_TRACK: Record<
  'c_minor' | 'a_minor' | 'd_minor' | 'f_sharp_minor',
  MusicTrackId
> = {
  c_minor: 'track_operating_theatre',
  a_minor: 'track_mutex_ghost',
  d_minor: 'track_ddos_megalovania',
  f_sharp_minor: 'track_one_shift_more',
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private noiseBuffer: AudioBuffer | null = null;
  private coolingNoiseSource: AudioBufferSourceNode | null = null;
  private coolingFilter: BiquadFilterNode | null = null;
  private coolingGain: GainNode | null = null;
  private currentCoolingLoadPercent: number = 18;
  private isCoolingActive: boolean = false;
  private externalAudioBuffers: Map<string, AudioBuffer> = new Map();
  private externalLoadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private activeExternalSource: AudioBufferSourceNode | null = null;
  private activeExternalGain: GainNode | null = null;
  private activeExternalUrl: string | null = null;

  public init() {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Pre-create 1-second white noise buffer for snares, hats, and electric arcs
    const bufferSize = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Initialize continuous low-frequency white noise server cooling generator
    const coolingBufferSize = this.ctx.sampleRate * 2;
    const coolingBuffer = this.ctx.createBuffer(1, coolingBufferSize, this.ctx.sampleRate);
    const coolingData = coolingBuffer.getChannelData(0);
    let lastSample = 0;
    for (let i = 0; i < coolingBufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Gently pre-warm white noise so loop seam is zero-click and rich in low-end server airflow
      lastSample = (lastSample + 0.35 * white) / 1.35;
      coolingData[i] = lastSample * 1.4;
    }

    this.coolingNoiseSource = this.ctx.createBufferSource();
    this.coolingNoiseSource.buffer = coolingBuffer;
    this.coolingNoiseSource.loop = true;

    this.coolingFilter = this.ctx.createBiquadFilter();
    this.coolingFilter.type = 'lowpass';
    this.coolingFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.coolingFilter.Q.setValueAtTime(0.9, this.ctx.currentTime);

    this.coolingGain = this.ctx.createGain();
    this.coolingGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.coolingNoiseSource.connect(this.coolingFilter);
    this.coolingFilter.connect(this.coolingGain);
    this.coolingGain.connect(this.masterGain);
    this.coolingNoiseSource.start(0);
  }

  public ensureRunning(): Promise<void> {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  public getAudioTime(): number {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000;
  }

  /**
   * Preloads and decodes an external pure-music MP3 track into a Web Audio AudioBuffer
   * so it can be scheduled sample-accurately on the hardware audio clock.
   */
  public preloadExternalAudio(url: string): Promise<AudioBuffer | null> {
    if (!url || typeof window === 'undefined' || typeof fetch === 'undefined') {
      return Promise.resolve(null);
    }
    this.init();
    const cached = this.externalAudioBuffers.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }
    const inflight = this.externalLoadingPromises.get(url);
    if (inflight) {
      return inflight;
    }

    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuffer) => {
        this.init();
        if (!this.ctx) return null;
        return this.ctx.decodeAudioData(arrayBuffer);
      })
      .then((audioBuffer) => {
        if (audioBuffer) {
          this.externalAudioBuffers.set(url, audioBuffer);
        }
        this.externalLoadingPromises.delete(url);
        return audioBuffer;
      })
      .catch(() => {
        this.externalLoadingPromises.delete(url);
        return null;
      });

    this.externalLoadingPromises.set(url, promise);
    return promise;
  }

  public hasLoadedExternalAudio(url?: string): boolean {
    if (!url) return false;
    return this.externalAudioBuffers.has(url);
  }

  public isExternalTrackPlaying(): boolean {
    return this.activeExternalSource !== null;
  }

  /**
   * Starts (or resumes) a preloaded pure-music MP3 track synchronized to `startAudioTime`
   * on the Web Audio hardware clock. If the buffer is still decoding, it automatically
   * joins in sync as soon as decoding completes.
   */
  public startExternalTrack(
    url: string,
    startAudioTime: number,
    playbackRate: number = 1.0
  ): void {
    this.stopExternalTrack();
    this.init();
    if (!this.ctx || !this.masterGain) return;

    this.activeExternalUrl = url;
    const buffer = this.externalAudioBuffers.get(url);

    const scheduleBuffer = (buf: AudioBuffer) => {
      if (!this.ctx || !this.masterGain || this.activeExternalUrl !== url) return;
      this.stopExternalTrack(false);

      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      source.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);

      const trackGain = this.ctx.createGain();
      trackGain.gain.setValueAtTime(0.88, this.ctx.currentTime);

      source.connect(trackGain);
      trackGain.connect(this.masterGain);

      const now = this.ctx.currentTime;
      if (now < startAudioTime) {
        // Schedule to start at exact Bar 0 Beat 1 after the 4-beat count-in
        source.start(startAudioTime, 0);
      } else {
        // Already past Bar 0 Beat 1 (e.g. after resume or async decode): start immediately at exact song offset
        const offsetSec = (now - startAudioTime) * playbackRate;
        if (offsetSec < buf.duration) {
          source.start(now, Math.max(0, offsetSec));
        }
      }

      source.onended = () => {
        if (this.activeExternalSource === source) {
          this.activeExternalSource = null;
          this.activeExternalGain = null;
        }
      };

      this.activeExternalSource = source;
      this.activeExternalGain = trackGain;
    };

    if (buffer) {
      scheduleBuffer(buffer);
    } else {
      this.preloadExternalAudio(url).then((decoded) => {
        if (decoded && this.activeExternalUrl === url) {
          scheduleBuffer(decoded);
        }
      });
    }
  }

  public stopExternalTrack(clearUrl: boolean = true): void {
    if (clearUrl) {
      this.activeExternalUrl = null;
    }
    if (this.activeExternalSource) {
      try {
        this.activeExternalSource.onended = null;
        this.activeExternalSource.stop();
        this.activeExternalSource.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.activeExternalSource = null;
    }
    if (this.activeExternalGain) {
      try {
        this.activeExternalGain.disconnect();
      } catch {
        // Ignore
      }
      this.activeExternalGain = null;
    }
  }

  /**
   * Maps the current 'CPU Load' bar value (0..100%) to the low-frequency white noise
   * server cooling generator's volume intensity and low-pass airflow filter.
   */
  public setCoolingFanLoad(cpuLoadPercent: number, isPlaying: boolean = true): CoolingFanAudioParams {
    this.currentCoolingLoadPercent = Math.max(0, Math.min(100, cpuLoadPercent));
    this.isCoolingActive = isPlaying;
    const params = calculateCoolingFanAudioParams(
      this.currentCoolingLoadPercent,
      this.isCoolingActive,
      this.isMuted
    );

    if (this.ctx && this.coolingGain && this.coolingFilter) {
      const t = this.ctx.currentTime;
      this.coolingGain.gain.setTargetAtTime(params.gain, t, 0.12);
      this.coolingFilter.frequency.setTargetAtTime(params.cutoffHz, t, 0.12);
      this.coolingFilter.Q.setTargetAtTime(params.resonanceQ, t, 0.12);
    }

    return params;
  }

  public getCoolingFanTelemetry(): CoolingFanAudioParams & { cpuLoadPercent: number; isPlaying: boolean } {
    const params = calculateCoolingFanAudioParams(
      this.currentCoolingLoadPercent,
      this.isCoolingActive,
      this.isMuted
    );
    return {
      cpuLoadPercent: this.currentCoolingLoadPercent,
      isPlaying: this.isCoolingActive,
      ...params,
    };
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : 0.65,
        this.ctx.currentTime
      );
    }
    this.setCoolingFanLoad(this.currentCoolingLoadPercent, this.isCoolingActive);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private resolveTrackComposition(
    trackOrKey: MusicTrackId | 'c_minor' | 'a_minor' | 'd_minor' | 'f_sharp_minor'
  ): TrackComposition {
    if (trackOrKey in TRACK_COMPOSITIONS) {
      return TRACK_COMPOSITIONS[trackOrKey as MusicTrackId];
    }
    const mapped = LEGACY_KEY_TO_TRACK[trackOrKey as 'c_minor'] || 'track_operating_theatre';
    return TRACK_COMPOSITIONS[mapped];
  }

  /**
   * Plays a lush polyphonic synthwave/Rhodes chord pad at the start of a bar.
   * Adapts filter cutoff and swell envelope to the current SongSectionType.
   */
  public playBarChordPad(
    trackOrKey: MusicTrackId | 'c_minor' | 'a_minor' | 'd_minor' | 'f_sharp_minor',
    barIndex: number,
    barDurationSec: number,
    time?: number,
    section: SongSectionType = 'verse'
  ) {
    if (!this.ctx || !this.masterGain) return;
    const t = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);
    const comp = this.resolveTrackComposition(trackOrKey);
    const chord = comp.chords[barIndex % comp.chords.length];

    if (section === 'blackout') {
      // Dramatic power-down pitch drop on blackout bar entry!
      this.playPowerDownDrop(t);
      return;
    }

    const peakFilter =
      section === 'climax'
        ? 2600
        : section === 'chorus'
        ? 2100
        : section === 'cutscene'
        ? 1100
        : 1650;
    const padGain =
      section === 'climax'
        ? 0.08
        : section === 'chorus'
        ? 0.07
        : section === 'cutscene'
        ? 0.045
        : 0.06;

    chord.padNotes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? comp.padWaveform : 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + (idx - 1) * 0.003), t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, t);
      filter.frequency.exponentialRampToValueAtTime(peakFilter, t + barDurationSec * 0.45);
      filter.frequency.exponentialRampToValueAtTime(650, t + barDurationSec);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(padGain, t + 0.14);
      gain.gain.setValueAtTime(padGain * 0.85, t + barDurationSec * 0.75);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + barDurationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + barDurationSec + 0.05);
    });
  }

  /**
   * Plays a dramatic power-grid turbine spin-down when a Blackout bar begins.
   */
  public playPowerDownDrop(time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.48);

    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.55);
  }

  /**
   * Plays a crisp woodblock/metronome count-in tick (steps 1, 2, 3) and a bright
   * "GO!" octave chime on step 4 before Bar 0 begins.
   */
  public playCountInTick(step: number, time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const isGo = step === 4;

    osc.type = isGo ? 'triangle' : 'sine';
    const baseFreq = isGo ? 1046.5 : step === 3 ? 783.99 : 659.25;
    osc.frequency.setValueAtTime(baseFreq, t);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.09);
    }

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(isGo ? 0.34 : 0.24, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (isGo ? 0.14 : 0.075));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (isGo ? 0.15 : 0.085));
  }

  /**
   * Plays a full musical half-beat substep (14 eighth-note steps per 7-beat bar: subStep 0..13).
   * Dynamically adapts instrumentation based on SongSectionType ('intro' | 'verse' | 'cutscene' | 'blackout' | 'chorus' | 'climax').
   */
  public playMusicSubstep(
    trackOrKey: MusicTrackId | 'c_minor' | 'a_minor' | 'd_minor' | 'f_sharp_minor',
    barIndex: number,
    subStep: number, // 0..13 (each is 0.5 beats)
    subStepDurationSec: number,
    panelCount: number = 1,
    time?: number,
    section: SongSectionType = 'verse'
  ) {
    if (!this.ctx || !this.masterGain) return;
    const rawT = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);
    const comp = this.resolveTrackComposition(trackOrKey);
    const swingOffset = subStep % 2 === 1 ? comp.swingFeel : 0;
    const t = rawT + swingOffset;

    const chord = comp.chords[barIndex % comp.chords.length];
    const isDownBeat = subStep % 2 === 0;
    const beatNum = Math.floor(subStep / 2) + 1; // 1..7

    // SECTION A: BLACKOUT MODE (Stripped-down sub-bass heartbeat + tense rimshot click)
    if (section === 'blackout') {
      if (isDownBeat) {
        this.playKickDrum(t, 0.46);
      } else if (subStep === 11) {
        // Subtle tension snare before Beat 7 in the dark
        this.playChiptuneHiHat(true, t);
      } else {
        this.playChiptuneHiHat(false, t);
      }
      if (isDownBeat) {
        this.playChiptuneBass(chord.bassRoot * 0.5, subStepDurationSec * 0.9, 'sine', t);
      }
      return;
    }

    // 1. 7/4 DRUM KIT GROOVE (adapts to section intensity)
    if (section === 'intro') {
      if (subStep === 0 || subStep === 8 || subStep === 12) {
        this.playKickDrum(t, 0.28);
      }
      if (isDownBeat || subStep === 11) {
        this.playChiptuneHiHat(subStep === 4 || subStep === 10, t);
      }
    } else {
      // Full kick pattern
      if (
        subStep === 0 ||
        subStep === 4 ||
        subStep === 8 ||
        subStep === 12 ||
        (section === 'climax' && subStep === 6)
      ) {
        this.playKickDrum(t, section === 'climax' ? 0.42 : 0.36);
      }
      // Snare on beats 2, 4, and Beat-6 turnaround roll
      const isSnareHit =
        subStep === 2 ||
        subStep === 6 ||
        subStep === 10 ||
        subStep === 11 ||
        ((section === 'chorus' || section === 'climax' || panelCount >= 2) && subStep === 13);
      this.playChiptuneHiHat(isSnareHit, t);
    }

    // 2. DRIVING SYNTH BASSLINE
    const bassFreq = isDownBeat
      ? chord.bassRoot
      : subStep % 4 === 3
      ? chord.bassFifth * 2
      : chord.bassRoot * 2;
    if (section !== 'intro' || isDownBeat) {
      this.playChiptuneBass(
        bassFreq,
        subStepDurationSec * 0.85,
        comp.bassWaveform,
        t
      );
    }

    // 3. PRIMARY MELODIC LEAD & CUTSCENE VOICE TEXTURE
    const arpIdx = isDownBeat
      ? (beatNum - 1) % chord.arpNotes.length
      : (beatNum + 2) % chord.arpNotes.length;
    const baseMelodyFreq = chord.arpNotes[arpIdx];

    if (section === 'cutscene') {
      // Gentle low-passed melody + Rhythm Doctor dialogue voice blip on odd substeps
      if (isDownBeat) {
        this.playLeadArpNote(
          baseMelodyFreq,
          subStepDurationSec * 0.75,
          false,
          'triangle',
          t
        );
      } else if (subStep <= 9) {
        this.playDialogueVoiceBlip(baseMelodyFreq * 1.25, t);
      }
      return;
    }

    const melodyFreq =
      (section === 'climax' || panelCount >= 3) && subStep % 2 === 1
        ? baseMelodyFreq * 1.5
        : baseMelodyFreq;

    this.playLeadArpNote(
      melodyFreq,
      subStepDurationSec * 0.78,
      isDownBeat,
      comp.leadWaveform,
      t
    );

    // 4. CHORUS / CLIMAX COUNTER-MELODY HARMONY & ORGANIC IN-SONG BEAT-6 TURNAROUND
    if (chord.counterNotes.length > 0) {
      const counterFreq = chord.counterNotes[(beatNum - 1) % chord.counterNotes.length];
      if (
        subStep === 10 ||
        subStep === 11 ||
        ((section === 'chorus' || section === 'climax') && (!isDownBeat || section === 'climax'))
      ) {
        // Organic in-key musical lift on Beat 6 (subSteps 10 & 11) inside the song arrangement itself
        this.playHarmonyCounterLead(
          subStep === 11 ? counterFreq * 1.25 : counterFreq,
          subStepDurationSec * 0.68,
          t
        );
      }
    }
  }

  /**
   * Gentle woodblock/calibration pulse used ONLY during the Pre-Song Interactive Tutorial
   * warmup (`pre_song_tutorial`) before the main song starts.
   */
  public playWarmupMetronomePulse(pulseNum: number, time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const isSixth = pulseNum === 6;
    const isFirst = pulseNum === 1;

    osc.type = isSixth ? 'triangle' : 'sine';
    const freq = isSixth ? 880.0 : isFirst ? 659.25 : 523.25;
    osc.frequency.setValueAtTime(freq, t);
    if (isSixth) {
      osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.065);
    }

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(isSixth ? 0.18 : 0.11, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (isSixth ? 0.095 : 0.055));

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (isSixth ? 0.105 : 0.065));
  }

  private playDialogueVoiceBlip(freq: number, t: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.035);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.065, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playHarmonyCounterLead(freq: number, duration: number, t: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.065, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.015);
  }

  private playKickDrum(t: number, peakGain: number = 0.38) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.12);

    gain.gain.setValueAtTime(peakGain, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playLeadArpNote(
    freq: number,
    duration: number,
    isAccent: boolean,
    waveform: OscillatorType,
    t: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = isAccent ? waveform : 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isAccent ? 2500 : 1850, t);

    const peakGain = isAccent ? 0.11 : 0.078;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(peakGain, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /**
   * Plays a panel-specific Rhythm Doctor telegraph cue for pulses 1..6.
   * Each pattern ('on_beat', 'off_beat', 'double_time', 'skip_beat') has a distinct timbre & pitch contour.
   * Pulse 6 features a distinct two-tone "Nurse Ready!" harmonic lift so players can hit Beat 7 blind by ear.
   */
  public playPanelPulseCue(
    pulseNum: number, // 1..6
    pattern: BeatPatternType,
    panelId: number = 0,
    audible: boolean = true,
    time?: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    const t = Math.max(this.ctx.currentTime, time ?? this.ctx.currentTime);

    if (!audible) {
      // Cloaked beat ('skip_beat' pulses 4..6): subtle muffled vinyl tick only
      this.playChiptuneHiHat(false, t);
      return;
    }

    // Distinct musical pitches per pattern so multi-panel polyrhythms are crystal clear by ear
    const onBeatPitches = [523.25, 587.33, 622.25, 698.46, 783.99, 932.33]; // C5..Bb5
    const offBeatPitches = [698.46, 783.99, 880.0, 932.33, 1046.5, 1174.66]; // F5..D6 syncopated pluck
    const doubleTimePitches = [1046.5, 1046.5, 1174.66, 1244.5, 1396.9, 1567.98]; // High SVT Nurse beeps

    const pitchTable =
      pattern === 'double_time'
        ? doubleTimePitches
        : pattern === 'off_beat'
        ? offBeatPitches
        : onBeatPitches;

    const baseFreq = pitchTable[(pulseNum - 1) % pitchTable.length] || 600;
    // Slight harmonic transposition if panelId === 2 so 3 panels stay distinct
    const freq = panelId === 2 ? baseFreq * 1.122 : baseFreq;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (pattern === 'off_beat') {
      // Funky syncopated FM/triangle pluck for off-beats
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 1.2, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    } else if (pattern === 'double_time') {
      // Crisp staccato nurse beep for 2x SVT
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
    } else {
      // Classic ECG bell sine/triangle
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // Beat 6 "Ready!" pitch lift
      if (pulseNum === 6) {
        osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.08);
      }
    }

    const dur = pattern === 'double_time' ? 0.075 : 0.12;
    const peak = pulseNum === 6 ? 0.36 : 0.26;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + dur + 0.01);

    // Rhythm Doctor "Get Set!" Two-Tone Harmonic Chime on Pulse 6
    if (pulseNum === 6) {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const chimeStart = t + (pattern === 'double_time' ? 0.035 : 0.055);
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(freq * 1.5, chimeStart);
      chimeGain.gain.setValueAtTime(0.001, chimeStart);
      chimeGain.gain.exponentialRampToValueAtTime(0.24, chimeStart + 0.008);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeStart + 0.09);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chimeOsc.start(chimeStart);
      chimeOsc.stop(chimeStart + 0.1);
    }
  }

  /**
   * Backward-compatible helper for standard ECG beep.
   */
  public playECGBeep(beatNum: number, time?: number) {
    this.playPanelPulseCue(beatNum, 'on_beat', 0, true, time);
  }

  /**
   * Defibrillator high-voltage discharge on beat 7 (Garbage Collection).
   */
  public playDefibrillatorShock(time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = time ?? this.ctx.currentTime;

    // 1. Heavy 808 sub-bass drop (260Hz -> 32Hz)
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(260, t);
    kick.frequency.exponentialRampToValueAtTime(32, t + 0.28);

    kickGain.gain.setValueAtTime(0.65, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    kick.connect(kickGain);
    kickGain.connect(this.masterGain);
    kick.start(t);
    kick.stop(t + 0.36);

    // 2. High voltage electric zap noise
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.18);
      filter.Q.value = 4.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(t);
      noise.stop(t + 0.21);
    }

    // 3. Resonant electric chord stab
    const saw = this.ctx.createOscillator();
    const sawGain = this.ctx.createGain();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(523.25, t);
    saw.frequency.exponentialRampToValueAtTime(1046.5, t + 0.08);

    sawGain.gain.setValueAtTime(0.22, t);
    sawGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    saw.connect(sawGain);
    sawGain.connect(this.masterGain);
    saw.start(t);
    saw.stop(t + 0.17);
  }

  /**
   * Sound effect for player hit feedback.
   */
  public playJudgmentFeedback(grade: 'PERFECT' | 'GOOD' | 'MISS', time?: number) {
    if (!this.ctx || !this.masterGain) return;
    const t = time ?? this.ctx.currentTime;

    if (grade === 'PERFECT') {
      [1046.5, 1318.5, 1567.98].forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        noteOsc.type = 'triangle';
        noteOsc.frequency.setValueAtTime(freq, t + idx * 0.022);

        noteGain.gain.setValueAtTime(0.001, t + idx * 0.022);
        noteGain.gain.exponentialRampToValueAtTime(0.25, t + idx * 0.022 + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.022 + 0.18);

        noteOsc.connect(noteGain);
        noteGain.connect(this.masterGain);

        noteOsc.start(t + idx * 0.022);
        noteOsc.stop(t + idx * 0.022 + 0.2);
      });
    } else if (grade === 'GOOD') {
      const noteOsc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(783.99, t);

      noteGain.gain.setValueAtTime(0.24, t);
      noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noteOsc.connect(noteGain);
      noteGain.connect(this.masterGain);

      noteOsc.start(t);
      noteOsc.stop(t + 0.2);
    } else {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(140, t);
      osc2.frequency.setValueAtTime(147, t);

      gain.gain.setValueAtTime(0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    }
  }

  public playChiptuneBass(
    noteFreq: number,
    duration: number,
    waveform: OscillatorType = 'sawtooth',
    time?: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    const t = time ?? this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(noteFreq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(540, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + duration);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  public playChiptuneHiHat(isSnare: boolean, time?: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = time ?? this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isSnare ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(isSnare ? 1400 : 7500, t);

    const gain = this.ctx.createGain();
    const dur = isSnare ? 0.095 : 0.032;
    gain.gain.setValueAtTime(isSnare ? 0.22 : 0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + dur + 0.01);
  }

  public playGlitchNoise() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2500, t);
    filter.Q.value = 5.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.13);
  }

  public playTerminalBlip(isConfirm: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isConfirm ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(isConfirm ? 523.25 : 740, t);
    if (isConfirm) {
      osc.frequency.setValueAtTime(783.99, t + 0.045);
    }

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isConfirm ? 0.11 : 0.045));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isConfirm ? 0.12 : 0.05));
  }
}

export const soundEngine = new SoundEngine();
