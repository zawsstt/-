import {
  JudgmentGrade,
  RunStats,
  BeatPatternType,
  LevelConfig,
  BarPhaseConfig,
  ShiftMode,
  WardProgress,
  LevelRecord,
  MusicTrackId,
  MusicTrackMeta,
  SongSectionType,
  StoryCutsceneEvent,
  TerminalCutsceneBreak,
  BlackoutWindow,
  AmbientThemeState,
  LowHealthGlitchState,
  CpuLoadState,
  StageBackdropId,
  StageSpectacleEffect,
  StageSpectacleState,
  CustomLevelParams,
  PanelSlotConfig,
} from './types';

export const JUDGMENT_WINDOWS = {
  PERFECT_MS: 45,
  GOOD_MS: 95,
};

export const SCORES = {
  PERFECT: 300,
  GOOD: 100,
  MISS: 0,
  BLIND_HIT_BONUS: 150,
};

export const HEALTH_CHANGES = {
  PERFECT: 6,
  GOOD: 2,
  MISS: -14,
};

/**
 * Full 6-Track Reserve of Multi-Section Procedural Chiptune / Synthwave Songs.
 */
export const MUSIC_TRACK_RESERVE: MusicTrackMeta[] = [
  {
    id: 'track_one_shift_more',
    title: '01. One Shift More (Act I Story Suite)',
    genre: 'Narrative Progressive Synth-Opera',
    keySignature: 'F# Minor -> D Maj -> F#m',
    defaultBpm: 112,
    description:
      'Continuous multi-movement chapter anthem with cutscene breakdowns, power-outage bass drops, and a 3-panel grand finale.',
    accentColor: '#fde047',
  },
  {
    id: 'track_operating_theatre',
    title: '02. Operating Theatre 200 OK',
    genre: 'Hospital Jazz-Funk Synthwave',
    keySignature: 'C Dorian / C Minor',
    defaultBpm: 105,
    description:
      'Warm Rhodes electric piano chords, walking 7/4 bassline, and crisp bell counter-melodies inspired by Rhythm Doctor Act 1.',
    accentColor: '#22c55e',
  },
  {
    id: 'track_midnight_pager',
    title: '03. 03:00 AM PagerDuty Lullaby',
    genre: 'Lo-Fi Cyberpunk Chillstep',
    keySignature: 'G Minor 9th',
    defaultBpm: 108,
    description:
      'Dreamy detuned bell arpeggios, deep sub-bass swells, and crisp rimshot grooves for late-night on-call triage.',
    accentColor: '#38bdf8',
  },
  {
    id: 'track_kernel_overdrive',
    title: '04. Kernel Overdrive (GC Sweep)',
    genre: 'Cybernetic Darksynth',
    keySignature: 'A Harmonic Minor',
    defaultBpm: 116,
    description:
      'Driving sawtooth bass octaves, neo-baroque synth leads, and syncopated snare turnarounds.',
    accentColor: '#a855f7',
  },
  {
    id: 'track_mutex_ghost',
    title: '05. Phantom of the Mutex Ring',
    genre: 'Spectral Glitch-Hop Polyrhythm',
    keySignature: 'E Phrygian Dominant',
    defaultBpm: 118,
    description:
      'Haunting theremin-style square leads, off-beat FM plucks, and ghostly filter sweeps built for syncopated wards.',
    accentColor: '#f59e0b',
  },
  {
    id: 'track_ddos_megalovania',
    title: '06. SYN-ACK Megalovania (P0 Boss)',
    genre: 'High-Octane 16-Bit Boss Chiptune',
    keySignature: 'D Minor Overdrive',
    defaultBpm: 126,
    description:
      'Relentless double-time arpeggio Shredder, heavy 808 kick salvos, and stadium-sized chiptune brass stabs.',
    accentColor: '#ef4444',
  },
];

export function getMusicTrackMeta(trackId?: MusicTrackId): MusicTrackMeta {
  return (
    MUSIC_TRACK_RESERVE.find((t) => t.id === trackId) || MUSIC_TRACK_RESERVE[0]
  );
}

/**
 * Returns effective BPM for Day Shift vs Night Shift (Hardcore 1.15x speed).
 */
export function getEffectiveBpm(baseBpm: number, shiftMode: ShiftMode = 'day'): number {
  return shiftMode === 'night' ? Math.round(baseBpm * 1.15) : baseBpm;
}

/**
 * Calculates rhythm judgment grade given hit delta in milliseconds.
 */
export function calculateJudgment(
  deltaMs: number,
  shiftMode: ShiftMode = 'day'
): {
  grade: JudgmentGrade;
  score: number;
  healthChange: number;
} {
  const absDelta = Math.abs(deltaMs);
  const perfectWindow =
    shiftMode === 'night' ? 35 : JUDGMENT_WINDOWS.PERFECT_MS;
  const goodWindow = shiftMode === 'night' ? 78 : JUDGMENT_WINDOWS.GOOD_MS;

  if (absDelta <= perfectWindow) {
    return {
      grade: 'PERFECT',
      score: SCORES.PERFECT,
      healthChange: HEALTH_CHANGES.PERFECT,
    };
  }

  if (absDelta <= goodWindow) {
    return {
      grade: 'GOOD',
      score: SCORES.GOOD,
      healthChange: HEALTH_CHANGES.GOOD,
    };
  }

  return {
    grade: 'MISS',
    score: SCORES.MISS,
    healthChange:
      shiftMode === 'night' ? HEALTH_CHANGES.MISS - 4 : HEALTH_CHANGES.MISS,
  };
}

/**
 * Calculates the score multiplier for a given combo count.
 * Every 5 combo increases multiplier by +0.2x up to 2.0x.
 */
export function getComboMultiplier(combo: number): number {
  if (combo <= 0) return 1.0;
  return Math.round((1 + Math.min(Math.floor(combo / 5) * 0.2, 1.0)) * 10) / 10;
}

export interface ComboVisualConfig {
  multiplier: number;
  fontSize: number;
  scale: number;
  color: string;
  glowColor: string;
  tierLabel: string;
}

/**
 * Returns visual styling (font size, scale, color, and tier label) that grows
 * and shifts color as the combo and combo multiplier increase.
 */
export function getComboVisualConfig(combo: number): ComboVisualConfig {
  const multiplier = getComboMultiplier(combo);

  if (combo <= 0) {
    return {
      multiplier: 1.0,
      fontSize: 12,
      scale: 1.0,
      color: '#64748b',
      glowColor: 'transparent',
      tierLabel: 'IDLE',
    };
  }
  if (combo < 5) {
    return {
      multiplier,
      fontSize: 14 + combo,
      scale: Number((1.0 + combo * 0.03).toFixed(2)),
      color: '#22c55e', // Emerald Green (1.0x)
      glowColor: '#22c55e',
      tierLabel: 'STABLE',
    };
  }
  if (combo < 10) {
    return {
      multiplier,
      fontSize: 19 + (combo - 5),
      scale: Number((1.18 + (combo - 5) * 0.03).toFixed(2)),
      color: '#38bdf8', // Electric Cyan (1.2x)
      glowColor: '#38bdf8',
      tierLabel: 'OVERCLOCK',
    };
  }
  if (combo < 15) {
    return {
      multiplier,
      fontSize: 24 + (combo - 10),
      scale: Number((1.35 + (combo - 10) * 0.03).toFixed(2)),
      color: '#f59e0b', // Amber Surge (1.4x)
      glowColor: '#f59e0b',
      tierLabel: 'TURBO GC',
    };
  }
  if (combo < 20) {
    return {
      multiplier,
      fontSize: 28 + Math.min(combo - 15, 4),
      scale: Number((1.52 + (combo - 15) * 0.03).toFixed(2)),
      color: '#a855f7', // Hyper Violet (1.6x)
      glowColor: '#a855f7',
      tierLabel: 'HYPERTHREAD',
    };
  }
  if (combo < 25) {
    return {
      multiplier,
      fontSize: 32 + Math.min(combo - 20, 4),
      scale: Number((1.68 + (combo - 20) * 0.03).toFixed(2)),
      color: '#ec4899', // Neon Magenta (1.8x)
      glowColor: '#ec4899',
      tierLabel: 'ZERO-LATENCY',
    };
  }
  return {
    multiplier,
    fontSize: 36,
    scale: 1.85,
    color: '#fde047', // Supercritical Gold (2.0x MAX)
    glowColor: '#ef4444',
    tierLabel: 'GOD-TIER SRE',
  };
}

/**
 * Computes next run statistics after a judgment.
 */
export function applyJudgmentToStats(
  prevStats: RunStats,
  grade: JudgmentGrade,
  deltaMs: number,
  isBlindHit: boolean = false
): RunStats {
  const isHit = grade === 'PERFECT' || grade === 'GOOD';
  const newCombo = isHit ? prevStats.currentCombo + 1 : 0;
  const newMaxCombo = Math.max(prevStats.maxCombo, newCombo);

  const comboMultiplier = getComboMultiplier(newCombo);
  const baseScore = grade === 'PERFECT' ? SCORES.PERFECT : grade === 'GOOD' ? SCORES.GOOD : 0;
  const blindBonus = isHit && isBlindHit ? SCORES.BLIND_HIT_BONUS : 0;
  const scoreGained = Math.round(baseScore * comboMultiplier) + blindBonus;

  const healthDelta =
    grade === 'PERFECT'
      ? HEALTH_CHANGES.PERFECT
      : grade === 'GOOD'
      ? HEALTH_CHANGES.GOOD
      : HEALTH_CHANGES.MISS;

  const newHealth = Math.min(100, Math.max(0, prevStats.health + healthDelta));
  const newTotal = prevStats.totalNotes + 1;
  const newPerfect = prevStats.perfectCount + (grade === 'PERFECT' ? 1 : 0);
  const newGood = prevStats.goodCount + (grade === 'GOOD' ? 1 : 0);
  const newMiss = prevStats.missCount + (grade === 'MISS' ? 1 : 0);
  const newEarly = (prevStats.earlyCount || 0) + (isHit && deltaMs < -12 ? 1 : 0);
  const newLate = (prevStats.lateCount || 0) + (isHit && deltaMs > 12 ? 1 : 0);
  const newBlindHits = (prevStats.blindHitCount || 0) + (isHit && isBlindHit ? 1 : 0);

  // Running average delta (for hits only)
  let newAvgDelta = prevStats.averageDeltaMs;
  if (isHit) {
    const totalHits = newPerfect + newGood;
    newAvgDelta = (prevStats.averageDeltaMs * (totalHits - 1) + deltaMs) / totalHits;
  }

  const prevRecent = prevStats.recentDeltas || [];
  const nextRecent = isHit
    ? [...prevRecent.slice(-11), Math.round(deltaMs)]
    : prevRecent;

  const rank = calculateRank(newPerfect, newGood, newTotal, newHealth);

  return {
    ...prevStats,
    score: prevStats.score + scoreGained,
    currentCombo: newCombo,
    maxCombo: newMaxCombo,
    perfectCount: newPerfect,
    goodCount: newGood,
    missCount: newMiss,
    earlyCount: newEarly,
    lateCount: newLate,
    blindHitCount: newBlindHits,
    totalNotes: newTotal,
    health: newHealth,
    averageDeltaMs: Math.round(newAvgDelta * 10) / 10,
    recentDeltas: nextRecent,
    rank,
  };
}

/**
 * Calculates grade rank (S+, S, A, B, C, F) based on accuracy and server stability.
 */
export function calculateRank(
  perfects: number,
  goods: number,
  total: number,
  finalHealth: number
): 'S+' | 'S' | 'A' | 'B' | 'C' | 'F' {
  if (total === 0) return 'S';
  if (finalHealth <= 0) return 'F';

  const accuracy = (perfects * 1.0 + goods * 0.5) / total;
  if (perfects === total && finalHealth >= 95 && total >= 6) return 'S+';
  if (accuracy >= 0.95 && finalHealth >= 80) return 'S';
  if (accuracy >= 0.82) return 'A';
  if (accuracy >= 0.65) return 'B';
  if (accuracy >= 0.45) return 'C';
  return 'F';
}

/**
 * Returns the 7 beat offsets (in beats relative to bar start) for a given Rhythm Doctor pattern.
 * Index 0..5 are the 6 telegraph pulses; Index 6 is the 7th-pulse Defibrillation target.
 */
export function getPatternBeatOffsets(pattern: BeatPatternType): number[] {
  switch (pattern) {
    case 'off_beat':
      // Syncopated off-beat ("&" of each beat)
      return [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
    case 'double_time':
      // 2x Fast pattern (half-beat intervals, hitting on beat 3.0)
      return [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
    case 'two_beat_svt':
      // Two-beat SVT burst: rapid 7-step cycle finishing on Beat 2.0
      return [0, 1 / 3, 2 / 3, 1.0, 4 / 3, 5 / 3, 2.0];
    case 'swing_beat':
      // Swing beat: uneven groove where alternating pulses are dragged, hitting on Beat 6.0
      return [0, 1.25, 2.0, 3.25, 4.0, 5.25, 6.0];
    case 'irregular_7_8':
      // 7/8 irregular meter: 7th beat is half a beat short, hitting at 5.5
      return [0, 1, 2, 3, 4, 5, 5.5];
    case 'skip_beat':
    case 'on_beat':
    default:
      return [0, 1, 2, 3, 4, 5, 6];
  }
}

/**
 * Returns whether a telegraph pulse (1..6) is audible or cloaked/silent.
 * In 'skip_beat' mode, pulses 4, 5, 6 are silent so the player must rely on the music!
 */
export function isPulseAudible(pattern: BeatPatternType, pulseNumber: number): boolean {
  if (pattern === 'skip_beat' && pulseNumber >= 4 && pulseNumber <= 6) {
    return false;
  }
  return true;
}

/**
 * Human-readable badge label for a rhythm pattern.
 */
export function getPatternLabel(pattern: BeatPatternType): string {
  switch (pattern) {
    case 'on_beat':
      return '1X ON-BEAT';
    case 'off_beat':
      return 'SYNC OFF-BEAT (&)';
    case 'double_time':
      return '2X OVERCLOCK';
    case 'skip_beat':
      return 'CLOAKED PULSE (???)';
    case 'two_beat_svt':
      return '2-BEAT SVT';
    case 'swing_beat':
      return 'SWING GROOVE';
    case 'irregular_7_8':
      return '7/8 IRREGULAR';
  }
}

/**
 * Calculates exact timing for beat N (1..7) in a 7-beat bar cycle for a specific pattern.
 */
export function getPatternPulseTime(
  startTime: number,
  bpm: number,
  barIndex: number,
  pulseNumber: number,
  pattern: BeatPatternType = 'on_beat'
): number {
  const secondsPerBeat = 60 / bpm;
  const barStartBeats = barIndex * 7;
  const offsets = getPatternBeatOffsets(pattern);
  const clampedIdx = Math.max(0, Math.min(6, pulseNumber - 1));
  return startTime + (barStartBeats + offsets[clampedIdx]) * secondsPerBeat;
}

/**
 * Calculates exact song-locked timing for pulse N (1..7) in a bar.
 * When `level.beatmapHits[barIndex]` is present, anchors the 7th beat directly to the
 * song's beatmap timestamp (scaled by any Day/Night shift BPM ratio) so the beat design
 * is 100% locked to the song itself.
 */
export function getSongPulseTime(
  level: LevelConfig,
  startTime: number,
  bpm: number,
  barIndex: number,
  pulseNumber: number,
  pattern: BeatPatternType = 'on_beat'
): number {
  const hit = level.beatmapHits?.[barIndex];
  if (hit && typeof hit.time_sec === 'number') {
    const secondsPerBeat = 60 / bpm;
    const rateScale = level.bpm > 0 ? level.bpm / bpm : 1;
    const anchoredBeat7Sec = startTime + hit.time_sec * rateScale;
    const offsets = getPatternBeatOffsets(pattern);
    const clampedIdx = Math.max(0, Math.min(6, pulseNumber - 1));
    // Anchor pulse 7 (offsets[6]) directly to the beatmap's hit timestamp
    const beatDeltaFromHit = offsets[clampedIdx] - offsets[6];
    return anchoredBeat7Sec + beatDeltaFromHit * secondsPerBeat;
  }
  return getPatternPulseTime(startTime, bpm, barIndex, pulseNumber, pattern);
}

/**
 * Returns whether synthetic oscillator telegraph beeps should play on Beats 1..6.
 * During the main song (`isTutorialWarmup === false`), returns FALSE so the song itself
 * carries the rhythm without a disconnected synthetic oscillator layer.
 * During the Pre-Song Interactive Tutorial Warmup (`isTutorialWarmup === true`), returns TRUE.
 */
export function shouldPlaySyntheticPulseOverlay(
  _hasExternalAudio: boolean,
  isTutorialWarmup: boolean
): boolean {
  return Boolean(isTutorialWarmup);
}

/**
 * Computes Forced Dialogue Viewing unlock state and typewriter character reveal progress
 * so players read each story beat intentionally before advancing.
 */
export function getDialogueUnlockProgress(
  elapsedMs: number,
  text: string,
  minLockMs: number = 650
): {
  isUnlocked: boolean;
  progress: number;
  visibleText: string;
} {
  const safeLock = Math.max(200, minLockMs);
  const clampedElapsed = Math.max(0, elapsedMs);
  const progress = Number(Math.min(1, clampedElapsed / safeLock).toFixed(3));
  const isUnlocked = clampedElapsed >= safeLock;
  const totalChars = text.length;
  // Reveal full text by 85% of the lock window so the player can read the complete sentence
  const revealRatio = Math.min(1, clampedElapsed / (safeLock * 0.85));
  const charCount = isUnlocked
    ? totalChars
    : Math.max(1, Math.ceil(totalChars * revealRatio));
  return {
    isUnlocked,
    progress,
    visibleText: text.slice(0, charCount),
  };
}

/**
 * Calculates exact timing for beat N in a standard on-beat 7-beat bar cycle.
 * Beat numbers are 1-indexed (1, 2, 3, 4, 5, 6, 7).
 */
export function getBeatTime(
  startTime: number,
  bpm: number,
  barIndex: number,
  beatInBar: number
): number {
  return getPatternPulseTime(startTime, bpm, barIndex, beatInBar, 'on_beat');
}

export const TARGET_CROSSHAIR_PROGRESS = 6.5 / 7;

/**
 * Computes the 4-beat pre-song Count-In state when audioTime < levelStartTime.
 */
export function getCountInState(
  audioTime: number,
  levelStartTime: number,
  bpm: number
): {
  isCountIn: boolean;
  countInBeat: number; // 1, 2, 3, 4 (where 4 is "GO!")
  label: string;
} {
  if (audioTime >= levelStartTime) {
    return { isCountIn: false, countInBeat: 0, label: '' };
  }
  const secondsPerBeat = 60 / bpm;
  const beatsRemaining = (levelStartTime - audioTime) / secondsPerBeat;
  // 4-beat count-in window: beatsRemaining from 4.0 down to 0.0
  const step = Math.min(4, Math.max(1, 5 - Math.ceil(beatsRemaining)));
  const labels: Record<number, string> = {
    1: 'COUNT-IN: 1...',
    2: 'COUNT-IN: 2...',
    3: 'READY...',
    4: '>> GO! [1-2-3-4-5-6-HIT!]',
  };
  return {
    isCountIn: true,
    countInBeat: step,
    label: labels[step] || 'READY...',
  };
}

/**
 * Computes the visual needle progress (0..1) and current pulse index (1..7)
 * for a panel given the current float beat inside the bar (0..7).
 *
 * Invariant: For EVERY pattern, at the exact moment of Pulse k (k = 1..7),
 * the needle sits at the center of Slot k: (k - 0.5) / 7.
 * Specifically, at Pulse 7 (deltaMs === 0ms), cycleProgress === 6.5 / 7,
 * aligning 100% with the center Target Crosshair of Slot 7!
 */
export function getPanelTrackProgress(
  beatInBarFloat: number,
  pattern: BeatPatternType
): {
  currentStep: number; // 1 to 7
  stepProgress: number; // 0.0 to 1.0
  cycleProgress: number; // 0.0 to 1.0 across the 7-slot track
  isFinishedInBar: boolean;
} {
  if (pattern === 'double_time') {
    // 7 pulses occur at beats 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0 (scaled = 0..6)
    const scaled = beatInBarFloat * 2; // 0..14
    if (scaled >= 6.5) {
      return {
        currentStep: 7,
        stepProgress: 1.0,
        cycleProgress: Math.min(1.0, (scaled + 0.5) / 7),
        isFinishedInBar: scaled >= 7.0,
      };
    }
    const step = Math.floor(scaled) + 1;
    const sub = scaled % 1;
    return {
      currentStep: Math.min(7, Math.max(1, step)),
      stepProgress: sub,
      cycleProgress: Math.min(1.0, Math.max(0, (scaled + 0.5) / 7)),
      isFinishedInBar: false,
    };
  }

  if (pattern === 'off_beat') {
    // Pulses occur at 0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5 (shifted = beatInBarFloat - 0.5)
    // Since needle position is (shifted + 0.5) / 7 = beatInBarFloat / 7, at beat 6.5 it is at 6.5 / 7!
    const shifted = beatInBarFloat - 0.5;
    const clampedShifted = Math.max(0, shifted);
    const step = Math.min(7, Math.floor(clampedShifted) + 1);
    const sub = clampedShifted % 1;
    return {
      currentStep: step,
      stepProgress: sub,
      cycleProgress: Math.min(1.0, Math.max(0, (shifted + 0.5) / 7)),
      isFinishedInBar: false,
    };
  }

  if (pattern === 'two_beat_svt') {
    // 7 pulses occur across 2.0 beats (scaled = beatInBarFloat * 3 -> 0..6 at beat 2.0)
    const scaled = beatInBarFloat * 3;
    if (scaled >= 6.5) {
      return {
        currentStep: 7,
        stepProgress: 1.0,
        cycleProgress: Math.min(1.0, (scaled + 0.5) / 7),
        isFinishedInBar: scaled >= 7.0,
      };
    }
    const step = Math.floor(scaled) + 1;
    const sub = scaled % 1;
    return {
      currentStep: Math.min(7, Math.max(1, step)),
      stepProgress: sub,
      cycleProgress: Math.min(1.0, Math.max(0, (scaled + 0.5) / 7)),
      isFinishedInBar: false,
    };
  }

  if (pattern === 'irregular_7_8') {
    // Pulses 1..6 at 0..5, Pulse 7 at 5.5 (half a beat early!)
    const mapped =
      beatInBarFloat <= 5
        ? beatInBarFloat
        : 5 + (beatInBarFloat - 5) * 2;
    const clamped = Math.max(0, Math.min(6.5, mapped));
    const step = Math.min(7, Math.floor(clamped) + 1);
    const sub = clamped % 1;
    return {
      currentStep: step,
      stepProgress: sub,
      cycleProgress: Math.min(1.0, Math.max(0, (clamped + 0.5) / 7)),
      isFinishedInBar: beatInBarFloat >= 6.0,
    };
  }

  if (pattern === 'swing_beat') {
    // Dragged even pulses (0, 1.25, 2.0, 3.25, 4.0, 5.25, 6.0) -> hits exact 6.5/7 at beat 6.0!
    const pairIdx = Math.floor(beatInBarFloat / 2);
    const inPair = beatInBarFloat - pairIdx * 2; // 0..2
    const mappedInPair =
      inPair <= 1.25
        ? inPair / 1.25
        : 1 + (inPair - 1.25) / 0.75;
    const mapped =
      beatInBarFloat >= 6
        ? beatInBarFloat
        : pairIdx * 2 + mappedInPair;
    const step = Math.min(7, Math.floor(mapped) + 1);
    const sub = mapped % 1;
    return {
      currentStep: step,
      stepProgress: sub,
      cycleProgress: Math.min(1.0, Math.max(0, (mapped + 0.5) / 7)),
      isFinishedInBar: false,
    };
  }

  // 'on_beat' or 'skip_beat': Pulses occur at 0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0
  // Needle position is (beatInBarFloat + 0.5) / 7 -> at beat 6.0 it is at 6.5 / 7!
  const step = Math.min(7, Math.floor(beatInBarFloat) + 1);
  const sub = beatInBarFloat % 1;
  return {
    currentStep: step,
    stepProgress: sub,
    cycleProgress: Math.min(1.0, Math.max(0, (beatInBarFloat + 0.5) / 7)),
    isFinishedInBar: false,
  };
}

/**
 * Returns the active BarPhaseConfig for a given level and barIndex.
 */
export function getActivePhaseForBar(level: LevelConfig, barIndex: number): BarPhaseConfig {
  if (level.phases && level.phases.length > 0) {
    const found = level.phases.find(
      (p) => barIndex >= p.startBar && barIndex <= p.endBar
    );
    if (found) return found;
    return level.phases[level.phases.length - 1];
  }
  return {
    startBar: 0,
    endBar: level.totalBars - 1,
    panelCount: 1,
    phaseTitle: 'PHASE 1: SINGLE NODE — ON-BEAT',
    panels: [
      {
        panelId: 0,
        nodeName: level.serverType.split(' ')[0] || 'NODE-01',
        bossType: 'heap_leak',
        color: level.accentColor,
        pattern: 'on_beat',
        active: true,
      },
    ],
  };
}

/**
 * Determines the musical & narrative SongSectionType for a given bar so the music
 * engine and visuals evolve dynamically instead of looping a static 4-bar chord cycle.
 */
export function getSongSectionForBar(
  barIndex: number,
  totalBars: number,
  cutscenes?: StoryCutsceneEvent[],
  blackoutWindows?: BlackoutWindow[]
): SongSectionType {
  if (
    blackoutWindows &&
    blackoutWindows.some((bw) => barIndex >= bw.startBar && barIndex <= bw.endBar)
  ) {
    return 'blackout';
  }
  if (
    cutscenes &&
    cutscenes.some((cs) => barIndex >= cs.startBar && barIndex <= cs.endBar)
  ) {
    return 'cutscene';
  }
  const safeTotal = Math.max(1, totalBars);
  const progress = barIndex / safeTotal;
  if (barIndex === 0 || progress < 0.16) return 'intro';
  if (progress >= 0.78) return 'climax';
  if (progress >= 0.5) return 'chorus';
  return 'verse';
}

/**
 * Returns the active nested in-song StoryCutsceneEvent for a bar (or first cutscene if forced).
 */
export function getActiveCutsceneForBar(
  level: LevelConfig,
  barIndex: number,
  forceCutscene: boolean = false
): StoryCutsceneEvent | null {
  const list = level.cutscenes || [];
  if (list.length === 0) return null;
  const active = list.find((c) => barIndex >= c.startBar && barIndex <= c.endBar);
  if (active) return active;
  if (forceCutscene) return list[0];
  return null;
}

/**
 * Returns the interactive text-based TerminalCutsceneBreak for a song break bar
 * when the level's or phase's `cutscene` flag is enabled (or when forced via ?cutscene=1).
 */
export function getTerminalCutsceneForBar(
  level: LevelConfig,
  barIndex: number,
  forceCutscene: boolean = false
): TerminalCutsceneBreak | null {
  const breaks = level.terminalCutsceneBreaks || [];
  if (breaks.length === 0) return null;

  const phase = getActivePhaseForBar(level, barIndex);
  const isCutsceneEnabled = Boolean(level.cutscene || phase.cutscene || forceCutscene);
  if (!isCutsceneEnabled) return null;

  const match = breaks.find((b) => b.triggerBar === barIndex);
  if (match) return match;
  if (forceCutscene) return breaks[0];
  return null;
}

/**
 * Computes the real-time 'CPU Load' state (0%..100%) based on the current song's
 * rhythmic complexity (effective BPM, active parallel server bays, syncopated/overclocked/cloaked
 * beat patterns, reversed rows, song section, active in-track popups, and 7th-beat GC surge).
 * Also returns a `glitchAmplifier` (0.0..1.0) that increases glitch intensity as CPU Load approaches 100%.
 */
export function calculateCpuLoadState(
  level: LevelConfig,
  shiftMode: ShiftMode,
  barIndex: number,
  beatInBar: number = 1,
  activePopupCount: number = 0,
  forceHighCpuLoad: boolean = false
): CpuLoadState {
  const effectiveBpm = getEffectiveBpm(level.bpm, shiftMode);
  const phase = getActivePhaseForBar(level, barIndex);
  const section = getSongSectionForBar(
    barIndex,
    level.totalBars,
    level.cutscenes,
    level.blackoutWindows
  );

  // 1. Base Clock Frequency Load (8% .. 26%)
  const bpmLoad = Math.round(
    Math.max(8, Math.min(26, ((effectiveBpm - 75) / 95) * 26))
  );

  // 2. Parallel Server Bay Multi-Threading Load
  const activePanels = phase.panels.filter((p) => p.active);
  const panelCount = Math.max(1, activePanels.length);
  const multiBayLoad = panelCount === 1 ? 8 : panelCount === 2 ? 22 : 36;

  // 3. Per-Bay Rhythmic Pattern & Reversed Bus Complexity
  let patternLoad = 0;
  for (const panel of activePanels) {
    if (panel.pattern === 'two_beat_svt' || panel.pattern === 'irregular_7_8') {
      patternLoad += 18;
    } else if (panel.pattern === 'double_time') {
      patternLoad += 16;
    } else if (panel.pattern === 'skip_beat') {
      patternLoad += 14;
    } else if (panel.pattern === 'off_beat' || panel.pattern === 'swing_beat') {
      patternLoad += 12;
    } else {
      patternLoad += 4;
    }
    if (panel.reversed) {
      patternLoad += 10;
    }
  }

  // 4. Song Section, Shift Mode, In-Track Popups & 7th-Beat GC Spike
  const sectionLoad =
    section === 'climax'
      ? 12
      : section === 'blackout'
      ? 10
      : section === 'chorus'
      ? 6
      : 0;
  const shiftLoad = shiftMode === 'night' ? 8 : 0;
  const popupLoad = Math.min(18, Math.max(0, activePopupCount) * 7);
  const beatSurge = beatInBar === 7 ? 7 : beatInBar === 6 ? 3 : 0;

  let rawLoad =
    bpmLoad +
    multiBayLoad +
    patternLoad +
    sectionLoad +
    shiftLoad +
    popupLoad +
    beatSurge;

  if (forceHighCpuLoad) {
    rawLoad = Math.max(96, rawLoad);
  }

  const loadPercent = Math.max(8, Math.min(100, Math.round(rawLoad)));

  // Glitch Amplifier ramps from 0.0 at 75% CPU Load up to 1.0 at 100% CPU Load
  const glitchAmplifier =
    loadPercent < 75
      ? 0
      : Number(Math.min(1, (loadPercent - 75) / 25).toFixed(3));

  if (loadPercent >= 85) {
    return {
      loadPercent,
      complexityLabel: 'CRITICAL OVERLOAD',
      tier: 'overload',
      glitchAmplifier,
    };
  }
  if (loadPercent >= 65) {
    return {
      loadPercent,
      complexityLabel: 'POLY-THREAD PEAK',
      tier: 'high',
      glitchAmplifier,
    };
  }
  if (loadPercent >= 40) {
    return {
      loadPercent,
      complexityLabel: 'SYNCOPATED BUS',
      tier: 'elevated',
      glitchAmplifier,
    };
  }
  return {
    loadPercent,
    complexityLabel: 'NOMINAL 1X CLOCK',
    tier: 'nominal',
    glitchAmplifier,
  };
}

export interface CoolingFanAudioParams {
  gain: number;
  cutoffHz: number;
  resonanceQ: number;
  fanRpm: number;
}

/**
 * Maps the real-time 'CPU Load' bar value (0..100%) to the sound engine's
 * low-frequency white noise server cooling generator parameters.
 */
export function calculateCoolingFanAudioParams(
  cpuLoadPercent: number,
  isPlaying: boolean = true,
  isMuted: boolean = false
): CoolingFanAudioParams {
  const clamped = Math.max(0, Math.min(100, cpuLoadPercent));
  const normalized = clamped / 100;
  const fanRpm = Math.round(1800 + normalized * 5400);
  const cutoffHz = Math.round(140 + normalized * 300);
  const resonanceQ = Number((0.8 + normalized * 0.65).toFixed(2));

  if (!isPlaying || isMuted) {
    return {
      gain: 0,
      cutoffHz,
      resonanceQ,
      fanRpm,
    };
  }

  // Subtle low-frequency white-noise gain scaling smoothly from 0.008 (idle rack airflow)
  // to 0.068 (100% CPU Load high-velocity server cooling blower)
  const rawGain = 0.008 + Math.pow(normalized, 1.3) * 0.06;
  const gain = Number(Math.min(0.075, Math.max(0.005, rawGain)).toFixed(4));

  return {
    gain,
    cutoffHz,
    resonanceQ,
    fanRpm,
  };
}

export interface AsciiDataPacketItem {
  id: number;
  label: string;
  x: number;
  y: number;
  alpha: number;
  isBeatHighlighted: boolean;
}

const ASCII_PACKET_TEMPLATES = [
  '[SYN:0x7F]',
  '<ACK:200>',
  '{GC:BEAT7}',
  '[PKT:0x4A]',
  '>>ETH0:OK',
  '[DMA:SYNC]',
  '<TLS:1.3>',
  '[IRQ:0x07]',
] as const;

/**
 * Computes deterministic positions and beat-pulsing alpha values for subtle
 * animated ASCII-style data packets scrolling across the screen at the rhythm of the current BPM.
 */
export function getAsciiDataPackets(
  timeMs: number,
  effectiveBpm: number,
  beatProgress: number,
  width: number,
  laneYOffsets: number[] = [78, 106]
): AsciiDataPacketItem[] {
  const safeWidth = Math.max(240, width);
  const bpmHz = Math.max(0.5, effectiveBpm / 60);
  const clampedBeatProg = Math.max(0, Math.min(1, beatProgress));
  const bpmPulse = Math.pow(1 - clampedBeatProg, 2);
  // Rhythmic step-scroll: continuous BPM velocity + beat-locked surge impulse
  const beatStepAdvance = (1 - bpmPulse) * 18;
  const basePixelsPerSec = 58 * bpmHz;

  const packets: AsciiDataPacketItem[] = [];
  const packetsPerLane = 4;
  const spacing = safeWidth / packetsPerLane;

  for (let laneIdx = 0; laneIdx < laneYOffsets.length; laneIdx++) {
    const y = laneYOffsets[laneIdx];
    const dir = laneIdx % 2 === 0 ? 1 : -1;
    const laneSpeed = basePixelsPerSec * (laneIdx % 2 === 0 ? 1 : 0.86);

    for (let i = 0; i < packetsPerLane; i++) {
      const id = laneIdx * packetsPerLane + i;
      const label = ASCII_PACKET_TEMPLATES[id % ASCII_PACKET_TEMPLATES.length];
      const rawTravel = (timeMs / 1000) * laneSpeed + beatStepAdvance + i * spacing;
      const wrappedX =
        dir === 1
          ? ((rawTravel % safeWidth) + safeWidth) % safeWidth
          : ((safeWidth - (rawTravel % safeWidth)) + safeWidth) % safeWidth;

      const isBeatHighlighted = (i + laneIdx) % 2 === 0 && bpmPulse > 0.35;
      const alpha = Number(
        (0.22 + bpmPulse * (isBeatHighlighted ? 0.38 : 0.22)).toFixed(2)
      );

      packets.push({
        id,
        label,
        x: Math.round(wrappedX),
        y,
        alpha,
        isBeatHighlighted,
      });
    }
  }

  return packets;
}

export interface SideToCenterDataStreamSegment {
  id: number;
  side: 'left' | 'right';
  startX: number;
  endX: number;
  y: number;
  length: number;
  glowAlpha: number;
  coreAlpha: number;
  speedMultiplier: number;
  colorRgb: string;
}

/**
 * Computes deterministic 'data-stream' line segments that flow inward from both sides
 * of the screen (x = 0 and x = width) toward the horizontal center (x = width / 2)
 * at the rhythm of the current BPM, using a low-opacity CRT-glow style and varying
 * in speed based on the current beat/combo multiplier.
 */
export function getSideToCenterDataStreams(
  timeMs: number,
  effectiveBpm: number,
  beatProgress: number,
  beatMultiplier: number = 1,
  width: number = 960,
  height: number = 540
): SideToCenterDataStreamSegment[] {
  const safeWidth = Math.max(320, width);
  const safeHeight = Math.max(240, height);
  const halfW = safeWidth / 2;
  const bpmHz = Math.max(0.5, effectiveBpm / 60);
  const clampedBeatProg = Math.max(0, Math.min(1, beatProgress));
  const bpmPulse = Math.pow(1 - clampedBeatProg, 2);

  const clampedMult = Math.max(1, Math.min(4, beatMultiplier));
  const speedMultiplier = Number((1 + (clampedMult - 1) * 0.45).toFixed(2));
  const basePixelsPerSec = 105 * bpmHz * speedMultiplier;
  // Beat-synchronized inward surge impulse
  const beatImpulsePx = (1 - bpmPulse) * 24 * speedMultiplier;

  const laneRatios = [0.14, 0.27, 0.41, 0.54, 0.69, 0.84];
  const segmentsPerSideLane = 2;
  const laneSpacing = halfW / segmentsPerSideLane;
  const streams: SideToCenterDataStreamSegment[] = [];

  let idCounter = 0;
  for (let lIdx = 0; lIdx < laneRatios.length; lIdx++) {
    const y = Math.round(safeHeight * laneRatios[lIdx]);
    const laneSpeed = basePixelsPerSec * (lIdx % 2 === 0 ? 1.0 : 0.88);
    const colorRgb =
      clampedMult >= 4
        ? lIdx % 2 === 0
          ? '56, 189, 248'
          : '250, 204, 21'
        : clampedMult >= 2
        ? lIdx % 2 === 0
          ? '56, 189, 248'
          : '74, 222, 128'
        : lIdx % 2 === 0
        ? '34, 197, 94'
        : '56, 189, 248';

    for (let s = 0; s < segmentsPerSideLane; s++) {
      const phaseOffset = s * laneSpacing + lIdx * 47;
      const distFromEdge =
        (((timeMs / 1000) * laneSpeed + beatImpulsePx + phaseOffset) % halfW +
          halfW) %
        halfW;
      const convergenceProgress = distFromEdge / halfW; // 0 at outer edge -> 1 at center (halfW)
      // Fade in from edge and fade out smoothly as streams converge at the center
      const edgeEnvelope = Math.sin(convergenceProgress * Math.PI);
      const length = Math.round(
        (24 + bpmPulse * 18 + (clampedMult - 1) * 6) *
          (0.65 + 0.35 * edgeEnvelope)
      );

      // Low-opacity CRT-glow style (strictly subtle: glowAlpha 0.05..0.24, coreAlpha 0.12..0.42)
      const glowAlpha = Number(
        Math.min(
          0.24,
          Math.max(0.05, (0.07 + bpmPulse * 0.11) * (0.45 + 0.55 * edgeEnvelope))
        ).toFixed(3)
      );
      const coreAlpha = Number(
        Math.min(
          0.42,
          Math.max(0.12, (0.16 + bpmPulse * 0.2) * (0.45 + 0.55 * edgeEnvelope))
        ).toFixed(3)
      );

      // Left-to-Center stream (flows right from 0 toward halfW)
      const leftHeadX = Math.min(halfW - 4, Math.round(distFromEdge));
      const leftTailX = Math.max(0, leftHeadX - length);
      streams.push({
        id: idCounter++,
        side: 'left',
        startX: leftTailX,
        endX: leftHeadX,
        y,
        length: Math.max(6, leftHeadX - leftTailX),
        glowAlpha,
        coreAlpha,
        speedMultiplier,
        colorRgb,
      });

      // Right-to-Center stream (flows left from safeWidth toward halfW)
      const rightHeadX = Math.max(
        halfW + 4,
        Math.round(safeWidth - distFromEdge)
      );
      const rightTailX = Math.min(safeWidth, rightHeadX + length);
      streams.push({
        id: idCounter++,
        side: 'right',
        startX: rightTailX,
        endX: rightHeadX,
        y,
        length: Math.max(6, rightTailX - rightHeadX),
        glowAlpha,
        coreAlpha,
        speedMultiplier,
        colorRgb,
      });
    }
  }

  return streams;
}

export interface ServerRackLedBlinkState {
  isOn: boolean;
  color: string;
  rgb: string;
  alpha: number;
  blinkHz: number;
}

/**
 * Procedurally generates subtle, randomized 'blinking' patterns on background server rack
 * status LEDs, where the blink rate (`blinkHz`) and color oscillate based on the current
 * CPU Load value (`cpuLoadPercent`), making the server room feel alive and responsive to game intensity.
 */
export function getServerRackLedBlinkState(
  rackIndex: number,
  slotIndex: number,
  timeMs: number,
  cpuLoadPercent: number,
  bpmPulse: number = 0
): ServerRackLedBlinkState {
  const clampedLoad = Math.max(0, Math.min(100, cpuLoadPercent));
  const loadNorm = clampedLoad / 100;

  // Deterministic pseudo-random seed per (rackIndex, slotIndex)
  const seedHash =
    ((rackIndex * 73856093) ^ (slotIndex * 19349663) ^ 0x5f3759df) >>> 0;
  const seedNorm = (seedHash % 1000) / 1000; // 0.000 .. 0.999
  const dutyCycle = 0.38 + (seedHash % 37) * 0.01 + loadNorm * 0.18;

  // Blink frequency oscillates with CPU Load: ~1.4 Hz at low load up to ~9.6 Hz near 100% load
  const blinkHz = Number(
    (1.35 + loadNorm * 7.2 + seedNorm * (0.65 + loadNorm * 1.1)).toFixed(2)
  );
  const phase = (timeMs / 1000) * blinkHz + seedNorm * 6.28318;
  const wave = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 + Math.cos(phase * 1.7));
  const isOn = wave >= 1 - Math.min(0.88, dutyCycle);

  // Color oscillation across CPU Load tiers
  const colorOsc = 0.5 + 0.5 * Math.sin((timeMs / 1000) * (1.2 + loadNorm * 5.5) + seedNorm * 10);
  let color = '#22c55e';
  let rgb = '34, 197, 94';

  if (clampedLoad >= 85) {
    // Critical Overload: rapid oscillation between crimson alert, amber thermal, and voltage yellow
    if (colorOsc > 0.62) {
      color = '#f43f5e';
      rgb = '244, 63, 94';
    } else if (colorOsc > 0.28) {
      color = '#fbbf24';
      rgb = '251, 191, 36';
    } else {
      color = '#fde047';
      rgb = '253, 224, 71';
    }
  } else if (clampedLoad >= 65) {
    // High Load: oscillation between amber, cyan, and magenta-rose
    if (colorOsc > 0.55) {
      color = '#f59e0b';
      rgb = '245, 158, 11';
    } else if (colorOsc > 0.2) {
      color = '#38bdf8';
      rgb = '56, 189, 248';
    } else {
      color = '#f43f5e';
      rgb = '244, 63, 94';
    }
  } else if (clampedLoad >= 40) {
    // Elevated Syncopated Bus: oscillation between cyan, emerald, and warm amber
    if (colorOsc > 0.52) {
      color = '#38bdf8';
      rgb = '56, 189, 248';
    } else if (colorOsc > 0.22) {
      color = '#22c55e';
      rgb = '34, 197, 94';
    } else {
      color = '#f59e0b';
      rgb = '245, 158, 11';
    }
  } else {
    // Nominal Load: calm oscillation between emerald green and telemetry cyan
    if (colorOsc > 0.48) {
      color = '#22c55e';
      rgb = '34, 197, 94';
    } else {
      color = '#38bdf8';
      rgb = '56, 189, 248';
    }
  }

  const clampedBpmPulse = Math.max(0, Math.min(1, bpmPulse));
  const alpha = isOn
    ? Number(
        Math.min(0.95, 0.38 + loadNorm * 0.28 + clampedBpmPulse * 0.26).toFixed(2)
      )
    : Number((0.1 + loadNorm * 0.06).toFixed(2));

  return {
    isOn,
    color,
    rgb,
    alpha,
    blinkHz,
  };
}



/**
 * Computes the viewport glitch state when health drops below 20% OR when real-time
 * CPU Load approaches 100% (>= 90%), and increases the intensity of existing glitch
 * effects whenever CPU Load approaches 100% (>= 75%).
 */
export function getLowHealthGlitchState(
  health: number,
  randX: number = Math.random(),
  randY: number = Math.random(),
  cpuLoadPercent: number = 0
): LowHealthGlitchState {
  const clampedCpu = Math.max(0, Math.min(100, cpuLoadPercent));
  const cpuGlitchAmplifier =
    clampedCpu < 75 ? 0 : (clampedCpu - 75) / 25; // 0.0 at 75% -> 1.0 at 100%
  const isCpuOverloadTrigger = clampedCpu >= 90;

  if (health >= 20 && !isCpuOverloadTrigger) {
    return {
      isGlitching: false,
      intensity: 0,
      offsetX: 0,
      offsetY: 0,
      rgbSplitPx: 0,
      sliceCount: 0,
      statusLabel: 'STABLE',
    };
  }

  const clampedHealth = Math.max(0, health);
  const baseHealthIntensity = health < 20 ? (20 - clampedHealth) / 20 : 0;
  // When CPU Load approaches 100%, it boosts existing low-health glitch intensity or drives thermal overload glitch
  const cpuOverloadIntensity = isCpuOverloadTrigger
    ? ((clampedCpu - 90) / 10) * 0.55
    : 0;
  const boostedIntensity =
    health < 20
      ? baseHealthIntensity + cpuGlitchAmplifier * 0.45
      : cpuOverloadIntensity;

  const intensity = Number(
    Math.min(1, Math.max(0.08, boostedIntensity)).toFixed(3)
  );
  const maxOffset = 2 + intensity * 14 + cpuGlitchAmplifier * 4;
  const offsetX = Number(((randX * 2 - 1) * maxOffset).toFixed(2));
  const offsetY = Number(((randY * 2 - 1) * (maxOffset * 0.75)).toFixed(2));
  const rgbSplitPx = Math.round(1 + intensity * 6 + cpuGlitchAmplifier * 2);
  const sliceCount = Math.ceil(1 + intensity * 5 + cpuGlitchAmplifier * 3);

  let statusLabel = 'LOW UPTIME GLITCH (<20%)';
  if (health < 20 && clampedCpu >= 85) {
    statusLabel = `CRITICAL KERNEL + CPU OVERLOAD (${clampedCpu}%)`;
  } else if (health >= 20 && isCpuOverloadTrigger) {
    statusLabel = `CPU LOAD ${clampedCpu}% THERMAL GLITCH`;
  } else if (clampedHealth <= 5) {
    statusLabel = 'CRITICAL KERNEL MELTDOWN (<5%)';
  } else if (clampedHealth <= 12) {
    statusLabel = 'SEVERE SYNC CORRUPTION (<12%)';
  }

  return {
    isGlitching: true,
    intensity,
    offsetX,
    offsetY,
    rgbSplitPx,
    sliceCount,
    statusLabel,
  };
}

/**
 * Computes sudden server-room power blackout / blind-beat state for the current bar & beat.
 */
export function getBlackoutState(
  level: LevelConfig,
  barIndex: number,
  beatInBarFloat: number,
  forceBlackout: boolean = false
): {
  isBlackout: boolean;
  darknessAlpha: number;
  reason: string;
  isLightsBackFlash: boolean;
} {
  const windows = level.blackoutWindows || [];
  const activeWindow = windows.find(
    (w) => barIndex >= w.startBar && barIndex <= w.endBar
  );

  if (!activeWindow && !forceBlackout) {
    return {
      isBlackout: false,
      darknessAlpha: 0,
      reason: '',
      isLightsBackFlash: false,
    };
  }

  const reason =
    activeWindow?.reason || 'UPS POWER FAILURE - HIT BEAT 7 BY EAR IN THE DARK!';
  const keepBeat1Lit = activeWindow ? activeWindow.keepBeat1Lit !== false : false;

  if (forceBlackout) {
    return {
      isBlackout: true,
      darknessAlpha: 0.94,
      reason,
      isLightsBackFlash: false,
    };
  }

  // On Beat 1 (0.0 .. 0.85), flicker warning before power cuts completely
  if (keepBeat1Lit && beatInBarFloat < 0.85) {
    const flicker = beatInBarFloat > 0.45 ? 0.55 : 0.2;
    return {
      isBlackout: true,
      darknessAlpha: flicker,
      reason: `[!] ${reason}`,
      isLightsBackFlash: false,
    };
  }

  // On Beat 7 (6.0 .. 7.0), GC execution slams emergency backup floodlights back on
  if (beatInBarFloat >= 6.05) {
    const fadeOut = Math.max(0, 0.94 - (beatInBarFloat - 6.05) * 1.4);
    return {
      isBlackout: fadeOut > 0.05,
      darknessAlpha: Number(fadeOut.toFixed(2)),
      reason,
      isLightsBackFlash: true,
    };
  }

  // Beats 2..6: Deep blind-beat darkness (94% opacity mask)
  return {
    isBlackout: true,
    darknessAlpha: 0.94,
    reason,
    isLightsBackFlash: false,
  };
}

/**
 * Computes dynamic CRT scanline color and ambient overlay hue based on current level,
 * shiftMode ('day' vs 'night'), song section ('blackout', 'cutscene', 'chorus', 'climax'),
 * and server health.
 */
export function getAmbientThemeState(
  level: LevelConfig,
  shiftMode: ShiftMode,
  barIndex: number,
  health: number,
  forceBlackout: boolean = false
): AmbientThemeState {
  const section = getSongSectionForBar(
    barIndex,
    level.totalBars,
    level.cutscenes,
    level.blackoutWindows
  );

  if (forceBlackout || section === 'blackout') {
    return {
      themeName: 'BLACKOUT_VOID',
      bgPrimary: '#010309',
      bgSecondary: '#070414',
      scanlineColor: 'rgba(168, 85, 247, 0.34)',
      ambientOverlayHue: 'rgba(88, 28, 135, 0.24)',
      gridColor: 'rgba(168, 85, 247, 0.14)',
      vignetteColor: 'rgba(2, 0, 12, 0.94)',
      phaseAccent: '#c084fc',
    };
  }

  if (health < 35) {
    return {
      themeName: 'CRITICAL_RED_ALERT',
      bgPrimary: '#130408',
      bgSecondary: '#1f070e',
      scanlineColor: 'rgba(239, 68, 68, 0.36)',
      ambientOverlayHue: 'rgba(185, 28, 28, 0.24)',
      gridColor: 'rgba(239, 68, 68, 0.18)',
      vignetteColor: 'rgba(69, 10, 10, 0.88)',
      phaseAccent: '#ef4444',
    };
  }

  if (shiftMode === 'night') {
    return {
      themeName: 'NIGHT_SHIFT_OVERCLOCK',
      bgPrimary: '#090414',
      bgSecondary: '#160726',
      scanlineColor: 'rgba(244, 63, 94, 0.28)',
      ambientOverlayHue: 'rgba(190, 24, 93, 0.18)',
      gridColor: 'rgba(244, 63, 94, 0.15)',
      vignetteColor: 'rgba(24, 4, 36, 0.86)',
      phaseAccent: '#f43f5e',
    };
  }

  if (level.isChapterCampaign) {
    if (section === 'climax') {
      return {
        themeName: 'CHAPTER_CLIMAX_GOLD',
        bgPrimary: '#120b04',
        bgSecondary: '#1f1206',
        scanlineColor: 'rgba(250, 204, 21, 0.28)',
        ambientOverlayHue: 'rgba(234, 179, 8, 0.16)',
        gridColor: 'rgba(250, 204, 21, 0.16)',
        vignetteColor: 'rgba(30, 15, 4, 0.84)',
        phaseAccent: '#fde047',
      };
    }
    if (section === 'chorus') {
      return {
        themeName: 'CHAPTER_CHORUS_CYAN',
        bgPrimary: '#040d1a',
        bgSecondary: '#081b33',
        scanlineColor: 'rgba(56, 189, 248, 0.27)',
        ambientOverlayHue: 'rgba(14, 165, 233, 0.16)',
        gridColor: 'rgba(56, 189, 248, 0.15)',
        vignetteColor: 'rgba(4, 12, 28, 0.84)',
        phaseAccent: '#38bdf8',
      };
    }
  }

  switch (level.id) {
    case 'deadlock_ghost':
      return {
        themeName: 'WARD_AMBER_MUTEX',
        bgPrimary: '#0c0804',
        bgSecondary: '#171006',
        scanlineColor: 'rgba(245, 158, 11, 0.26)',
        ambientOverlayHue: 'rgba(217, 119, 6, 0.15)',
        gridColor: 'rgba(245, 158, 11, 0.14)',
        vignetteColor: 'rgba(20, 12, 4, 0.84)',
        phaseAccent: '#f59e0b',
      };
    case 'ddos_flood':
      return {
        themeName: 'WARD_CYAN_FLOOD',
        bgPrimary: '#040b16',
        bgSecondary: '#08172b',
        scanlineColor: 'rgba(56, 189, 248, 0.27)',
        ambientOverlayHue: 'rgba(6, 182, 212, 0.16)',
        gridColor: 'rgba(56, 189, 248, 0.15)',
        vignetteColor: 'rgba(4, 12, 26, 0.85)',
        phaseAccent: '#38bdf8',
      };
    case 'chaos_shift':
      return {
        themeName: 'WARD_VIOLET_CHAOS',
        bgPrimary: '#0b0414',
        bgSecondary: '#160929',
        scanlineColor: 'rgba(192, 132, 252, 0.28)',
        ambientOverlayHue: 'rgba(147, 51, 234, 0.17)',
        gridColor: 'rgba(192, 132, 252, 0.15)',
        vignetteColor: 'rgba(16, 4, 28, 0.86)',
        phaseAccent: '#c084fc',
      };
    case 'heap_leak':
    default:
      return {
        themeName: 'WARD_EMERALD_TRIAGE',
        bgPrimary: '#040d0a',
        bgSecondary: '#071914',
        scanlineColor: 'rgba(34, 197, 94, 0.25)',
        ambientOverlayHue: 'rgba(16, 185, 129, 0.14)',
        gridColor: 'rgba(34, 197, 94, 0.14)',
        vignetteColor: 'rgba(2, 14, 10, 0.84)',
        phaseAccent: '#22c55e',
      };
  }
}

/**
 * Evaluates whether current bar and health meet stage completion criteria.
 */
export function evaluateStageProgress(
  currentBar: number,
  totalBars: number,
  health: number
): 'in_progress' | 'victory' | 'defeat' {
  if (health <= 0) {
    return 'defeat';
  }
  if (currentBar >= totalBars) {
    return 'victory';
  }
  return 'in_progress';
}

export interface TrackPopupBox {
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  xPercent: number;
  yPercent: number;
}

/**
 * Computes the exact pixel and percentage bounding box for an error popup
 * so that it directly obstructs beat slots [startSlot..endSlot] (e.g., slots 4..7,
 * covering the approach and the [7] GC HIT zone) inside a specific beat track row.
 */
export function computeTrackPopupBox(
  trackStartX: number,
  beatWidth: number,
  trackTop: number,
  trackHeight: number,
  startSlot: number = 4,
  endSlot: number = 7,
  canvasWidth: number = 960,
  canvasHeight: number = 540
): TrackPopupBox {
  const clampedStart = Math.max(1, Math.min(7, startSlot));
  const clampedEnd = Math.max(clampedStart, Math.min(7, endSlot));

  const boxX = Math.floor(trackStartX + (clampedStart - 1) * beatWidth - 4);
  const boxWidth = Math.floor((clampedEnd - clampedStart + 1) * beatWidth + 8);
  const boxY = Math.floor(trackTop - 6);
  const boxHeight = Math.floor(trackHeight + 12);

  return {
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    xPercent: Math.round((boxX / canvasWidth) * 1000) / 10,
    yPercent: Math.round((boxY / canvasHeight) * 1000) / 10,
  };
}

/**
 * Generates live NOC / Principal SRE coaching and incident callouts
 * based on the current phase, beat, and active obstructions.
 * Uses pure ASCII characters so "Press Start 2P" pixel typography renders cleanly.
 */
export function getBarCallout(
  level: LevelConfig,
  barIndex: number,
  beatInBar: number,
  hasActivePopup: boolean = false,
  isBlackout: boolean = false
): { speaker: string; text: string; color: string } {
  const phase = getActivePhaseForBar(level, barIndex);

  if (isBlackout) {
    return {
      speaker: 'BLACKOUT',
      text:
        beatInBar >= 6
          ? '[!] BLIND BEAT 7 IN THE DARK - HIT SPACEBAR NOW!'
          : '[!] POWER OUTAGE! LISTEN TO THE AUDIO PULSE [1-2-3-4-5-6-HIT]',
      color: '#c084fc',
    };
  }

  const cutscene = getActiveCutsceneForBar(level, barIndex);
  if (cutscene && beatInBar <= 5) {
    return {
      speaker: cutscene.speaker,
      text: cutscene.text,
      color:
        cutscene.mood === 'panic'
          ? '#ef4444'
          : cutscene.mood === 'urgent'
          ? '#fde047'
          : cutscene.mood === 'triumph'
          ? '#22c55e'
          : '#38bdf8',
    };
  }

  if (hasActivePopup) {
    return {
      speaker: 'ALERT P0',
      text:
        beatInBar >= 6
          ? '>> BLIND BEAT 7 NOW! HIT SPACEBAR BY EAR!'
          : '[!] BUS TRACK OBSTRUCTED! COUNT THE RHYTHM OR CLICK [X]!',
      color: '#fde047',
    };
  }

  // On the first bar of a phase (beats 1..4), show the NOC Dispatch briefing callout
  if (barIndex === phase.startBar && beatInBar <= 4 && phase.nurseCallout) {
    return {
      speaker: 'DISPATCH',
      text: phase.nurseCallout,
      color: '#38bdf8',
    };
  }

  // Dynamic beat-by-beat SRE countdown coaching
  const hasDoubleTime = phase.panels.some((p) => p.active && p.pattern === 'double_time');
  const hasOffBeat = phase.panels.some((p) => p.active && p.pattern === 'off_beat');
  const hasSkipBeat = phase.panels.some((p) => p.active && p.pattern === 'skip_beat');

  if (hasDoubleTime && beatInBar === 3) {
    return {
      speaker: '2X FAST',
      text: '>> [2X OVERCLOCK] FLUSH FAST RACK NOW (BEAT 3.0)!',
      color: '#38bdf8',
    };
  }

  if (beatInBar === 6) {
    return {
      speaker: 'READY',
      text: hasOffBeat
        ? 'GET SET... HIT ON 7 - AND SYNCOPATED (&7)!'
        : 'GET SET... READY FOR GARBAGE COLLECTION ON 7!',
      color: '#f59e0b',
    };
  }

  if (beatInBar === 7) {
    return {
      speaker: 'ACTION',
      text: '>> EXECUTE GC NOW! [SPACEBAR]',
      color: '#ef4444',
    };
  }

  if (hasSkipBeat && beatInBar >= 4 && beatInBar <= 5) {
    return {
      speaker: 'CLOAKED',
      text: '[?] PULSE CLOAKED - KEEP COUNTING THE BEAT IN YOUR HEAD!',
      color: '#a855f7',
    };
  }

  return {
    speaker: 'TELEMETRY',
    text: phase.nurseCallout || `${phase.phaseTitle} - FORWARDING PACKETS [${beatInBar}/7]`,
    color: '#22c55e',
  };
}

const STORAGE_KEY = '502_bad_gateway_ward_progress_v1';

const RANK_ORDER: Record<LevelRecord['bestRank'], number> = {
  'S+': 6,
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  F: 1,
};

export function loadWardProgress(): WardProgress {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { records: {}, audioOffsetMs: 0 };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: {}, audioOffsetMs: 0 };
    const parsed = JSON.parse(raw) as WardProgress;
    return {
      records: parsed.records || {},
      audioOffsetMs: typeof parsed.audioOffsetMs === 'number' ? parsed.audioOffsetMs : 0,
    };
  } catch {
    return { records: {}, audioOffsetMs: 0 };
  }
}

export function saveWardRecord(
  levelId: string,
  shiftMode: ShiftMode,
  stats: RunStats
): { progress: WardProgress; isNewRecord: boolean } {
  const current = loadWardProgress();
  const key = `${levelId}:${shiftMode}`;
  const prev = current.records[key];

  const accuracy =
    stats.totalNotes > 0
      ? Math.round(((stats.perfectCount * 1.0 + stats.goodCount * 0.5) / stats.totalNotes) * 100)
      : 100;

  const isNewRecord = !prev || stats.score > prev.highScore;
  const bestRank =
    !prev || RANK_ORDER[stats.rank] > RANK_ORDER[prev.bestRank]
      ? stats.rank
      : prev.bestRank;

  const nextRecord: LevelRecord = {
    highScore: prev ? Math.max(prev.highScore, stats.score) : stats.score,
    bestRank,
    bestAccuracy: prev ? Math.max(prev.bestAccuracy, accuracy) : accuracy,
    maxCombo: prev ? Math.max(prev.maxCombo, stats.maxCombo) : stats.maxCombo,
    cleared: true,
  };

  const nextProgress: WardProgress = {
    ...current,
    records: {
      ...current.records,
      [key]: nextRecord,
    },
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
    }
  } catch {
    // Ignore storage quota errors
  }

  return { progress: nextProgress, isNewRecord };
}

export function saveAudioOffset(offsetMs: number): WardProgress {
  const current = loadWardProgress();
  const clamped = Math.max(-60, Math.min(60, Math.round(offsetMs)));
  const nextProgress: WardProgress = {
    ...current,
    audioOffsetMs: clamped,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
    }
  } catch {
    // Ignore storage errors
  }
  return nextProgress;
}

/**
 * Evaluates the Rhythm Doctor / Server Room Emergency Repair progression gate:
 * Level 0 (P-1) is always unlocked; subsequent levels require at least Rank 'B'
 * ('S+', 'S', 'A', or 'B') on the preceding level, unless freePlayUnlocked is enabled.
 */
export function isLevelUnlocked(
  levelIndex: number,
  levels: LevelConfig[],
  wardProgress: WardProgress,
  shiftMode: ShiftMode = 'day',
  freePlayUnlocked: boolean = false
): boolean {
  if (levelIndex <= 0 || freePlayUnlocked) return true;
  const prevLevel = levels[levelIndex - 1];
  if (!prevLevel) return true;
  const recDay = wardProgress.records[`${prevLevel.id}:day`];
  const recShift = wardProgress.records[`${prevLevel.id}:${shiftMode}`];
  const bestRankOrder = Math.max(
    recDay ? RANK_ORDER[recDay.bestRank] : 0,
    recShift ? RANK_ORDER[recShift.bestRank] : 0
  );
  return bestRankOrder >= RANK_ORDER.B;
}

/**
 * Determines which of the 4 Data Center / Computing stage backdrops is active
 * for the given level and bar index:
 * - 'er_ward': Cold-Aisle 42U Server Room Bay
 * - 'sunlit_conservatory': NOC Command Center & Fiber Conduit Vault
 * - 'sakura_pagoda': DMZ Firewall & Packet Scrubbing Bastion
 * - 'cosmic_meteor': Ring-0 Liquid-Cooled Mainframe Core
 */
export function getStageBackdropForBar(
  level: LevelConfig,
  barIndex: number
): StageBackdropId {
  if (level.isChapterCampaign) {
    if (barIndex < 4) return 'er_ward';
    if (barIndex < 8) return 'sunlit_conservatory';
    if (barIndex < 12) return 'sakura_pagoda';
    return 'cosmic_meteor';
  }

  switch (level.id) {
    case 'deadlock_ghost':
      return barIndex >= 4 ? 'sakura_pagoda' : 'sunlit_conservatory';
    case 'ddos_flood':
      return barIndex >= 5 ? 'cosmic_meteor' : 'sakura_pagoda';
    case 'chaos_shift':
      return barIndex >= 4 ? 'cosmic_meteor' : 'sunlit_conservatory';
    case 'heap_leak':
      return barIndex >= 4 ? 'sunlit_conservatory' : 'er_ward';
    default: {
      const phase = getActivePhaseForBar(level, barIndex);
      if (phase.stageBackdrop) return phase.stageBackdrop;
      if (level.stageBackdrop) return level.stageBackdrop;
      return barIndex >= 4 ? 'sunlit_conservatory' : 'er_ward';
    }
  }
}

/**
 * Returns the 1-indexed beat slots (1..6) that render a bold pink/magenta 'X'
 * clock-mask marker on the beat slot.
 */
export function getMutedBeatsForPanel(
  pattern: BeatPatternType,
  barIndex: number = 0
): number[] {
  if (pattern === 'skip_beat') {
    return [4, 5, 6];
  }
  if (pattern === 'off_beat') {
    return barIndex % 2 === 1 ? [2, 4, 6] : [4];
  }
  return [];
}

/**
 * Returns the live Server Bus telemetry chant and the beat countdown number ('3', '2', '1')
 * for a given panel and beat.
 */
export function getRowLyricChant(
  level: LevelConfig,
  panel: PanelSlotConfig,
  barIndex: number,
  beatInBar: number
): { text: string; countdownNum: number | null; color: string } {
  const countdownNum =
    beatInBar === 4
      ? 3
      : beatInBar === 5
      ? 2
      : beatInBar === 6
      ? 1
      : null;

  if (panel.reversed) {
    return {
      text:
        beatInBar >= 7
          ? '>> REVERSE BUS FLUSH! [GC HIT!]'
          : 'P0 BACKLOG OVERFLOW! (REVERSE BUS)',
      countdownNum,
      color: '#fde047',
    };
  }

  if (panel.pattern === 'two_beat_svt') {
    return {
      text:
        beatInBar === 2
          ? '>> 2-BEAT SVT BURST! [HIT ON 2!]'
          : '1-AND-2 [TWO-BEAT SVT]',
      countdownNum: beatInBar === 1 ? 1 : null,
      color: '#ef4444',
    };
  }

  if (panel.pattern === 'irregular_7_8') {
    return {
      text:
        beatInBar >= 6
          ? '>> 7/8 SHORT BEAT! [HIT 5.5!]'
          : '1-2-3-4-5-6 [7/8 METER]',
      countdownNum,
      color: '#c084fc',
    };
  }

  if (panel.pattern === 'swing_beat') {
    return {
      text:
        beatInBar >= 7
          ? '>> SWING GROOVE LOCK! [HIT 7!]'
          : 'PING.. PING, (SWING GROOVE)',
      countdownNum,
      color: '#38bdf8',
    };
  }

  if (panel.pattern === 'double_time') {
    return {
      text:
        beatInBar === 3
          ? '>> 2X OVERCLOCK FLUSH! [HIT NOW!]'
          : '1-2-3-4-5-6 [2X FAST CLOCK]',
      countdownNum: beatInBar === 2 ? 1 : null,
      color: '#38bdf8',
    };
  }

  if (panel.pattern === 'off_beat') {
    return {
      text:
        beatInBar >= 7
          ? '>> SYNCOPATED ACK! [&7 HIT!]'
          : 'PING, (OFFSET) PING, PING,',
      countdownNum,
      color: '#f59e0b',
    };
  }

  if (panel.pattern === 'skip_beat') {
    return {
      text:
        beatInBar >= 4 && beatInBar <= 6
          ? 'CLOCK MASKED... [X] [X] [X]'
          : 'PING, PING, PING,',
      countdownNum,
      color: '#ec4899',
    };
  }

  if (level.isChapterCampaign && barIndex >= 12) {
    return {
      text:
        beatInBar >= 7
          ? 'ONE SHIFT MORE! [200 OK!]'
          : 'PING, PING, PING, (ALL RACKS)',
      countdownNum,
      color: '#fde047',
    };
  }

  return {
    text: beatInBar >= 7 ? '>> 7TH BEAT GC FLUSH! [HIT!]' : 'PING, PING, PING,',
    countdownNum,
    color: '#e2e8f0',
  };
}

/**
 * Builds a complete, playable LevelConfig from the built-in Stage Builder parameters.
 */
export function createCustomLevelConfig(params: CustomLevelParams): LevelConfig {
  const safeBars = Math.max(4, Math.min(24, Math.round(params.totalBars || 8)));
  const safeBpm = Math.max(70, Math.min(180, Math.round(params.bpm || 110)));
  const midBar = Math.floor(safeBars / 2);

  const panels: PanelSlotConfig[] = [
    {
      panelId: 0,
      nodeName: 'CUSTOM-RACK-01',
      bossType: 'heap_leak',
      color: '#22c55e',
      pattern: params.pattern,
      active: true,
      reversed: params.reversedRow && params.panelCount === 1,
    },
  ];

  if (params.panelCount >= 2) {
    panels.push({
      panelId: 1,
      nodeName: 'CUSTOM-RACK-02',
      bossType: 'deadlock_ghost',
      color: '#f59e0b',
      pattern: params.pattern === 'on_beat' ? 'off_beat' : 'on_beat',
      active: true,
      reversed: params.reversedRow,
    });
  }

  if (params.panelCount === 3) {
    panels.push({
      panelId: 2,
      nodeName: 'CUSTOM-RACK-03',
      bossType: 'ddos_flood',
      color: '#38bdf8',
      pattern: 'double_time',
      active: true,
      reversed: false,
    });
  }

  return {
    id: 'custom_editor_ward',
    wardNumber: 'CUSTOM',
    name: params.title.trim() || 'Custom Server Bay',
    serverType: 'Custom Cluster Rack',
    bpm: safeBpm,
    totalBars: safeBars,
    gimmicks: [
      'normal',
      ...(params.enablePopups ? (['popup_hell'] as const) : []),
      ...(params.enableBlackout ? (['blackout_burst'] as const) : []),
    ],
    patientName: params.patientName.trim() || 'Custom Fault Daemon',
    patientDescription:
      'Custom Stage Builder incident with configurable BPM, data center environment, rhythm pattern, and kernel panic obstructions.',
    accentColor: '#38bdf8',
    songTitle: `Custom Chart (${safeBpm} BPM)`,
    songKey: 'c_minor',
    musicTrackId: params.musicTrackId,
    stageBackdrop: params.stageBackdrop,
    cutscene: true,
    phases: [
      {
        startBar: 0,
        endBar: safeBars - 1,
        panelCount: params.panelCount,
        phaseTitle: `CUSTOM BAY — ${getPatternLabel(params.pattern)}`,
        nurseCallout: 'CUSTOM STAGE BUILDER: HIT SPACEBAR ON THE 7TH BEAT!',
        stageBackdrop: params.stageBackdrop,
        panels,
      },
    ],
    blackoutWindows: params.enableBlackout
      ? [
          {
            startBar: midBar,
            endBar: Math.min(safeBars - 1, midBar + 1),
            reason: 'CUSTOM UPS BLACKOUT WINDOW - HIT BEAT 7 BY EAR!',
            keepBeat1Lit: true,
          },
        ]
      : [],
    terminalCutsceneBreaks: [
      {
        id: 'custom_break_1',
        triggerBar: Math.max(1, midBar - 1),
        title: 'TTY // CUSTOM SERVER BAY DIAGNOSTIC',
        terminalPrompt: 'sre@stage-builder:~$',
        speaker: 'PAIGE (PRINCIPAL SRE)',
        role: 'STAGE ARCHITECT',
        avatarType: 'paige_sre',
        mood: 'calm',
        lines: [
          `Custom Bay "${params.title || 'Custom Server Bay'}" running at ${safeBpm} BPM.`,
          'Press SPACE on the 7th beat when the bus needle locks onto [7] GC HIT!',
        ],
      },
    ],
  };
}

/**
 * Computes the choreographed stage spectacle / visual interference state for a given
 * level, barIndex, beatInBar (1..7), and beatProgress (0..1), translating the
 * audiovisual staging of Rhythm Doctor (e.g. Battleworn Insomniac / Samurai Techno)
 * into our Chaosheng Data Center server room world:
 * - 'notification_cascade': Diagonal server alert cards cascading across the stage on snare beats
 * - 'spotlight_countdown': Stage dims to a stark spotlight on the right-hand Core Node while giant 7..1 numerals flash center-screen
 * - 'window_split': Picture-in-Picture secondary monitor window framing the parallel rack bus
 * - 'vhs_climax': Horizontal sine-wave distortion, brief CRT snow static bursts on bar transitions, and vertical track elevation jumps
 */
export function getStageSpectacleState(
  level: LevelConfig,
  barIndex: number,
  beatInBar: number,
  beatProgress: number = 0
): StageSpectacleState {
  const phase = getActivePhaseForBar(level, barIndex);
  let effect: StageSpectacleEffect = phase.stageEffect || 'none';

  // Automatic fallback choreography for Boss / Advanced levels when phase.stageEffect isn't explicitly set
  if (effect === 'none' && (level.isChapterCampaign || level.gimmicks.includes('chaos'))) {
    const progress = barIndex / Math.max(1, level.totalBars);
    if (progress >= 0.75) {
      effect = 'vhs_climax';
    } else if (progress >= 0.55) {
      effect = 'window_split';
    } else if (progress >= 0.35) {
      effect = 'spotlight_countdown';
    }
  }

  const clampedBeat = Math.max(1, Math.min(7, beatInBar));
  const clampedProg = Math.max(0, Math.min(1, beatProgress));

  if (effect === 'spotlight_countdown') {
    // Giant countdown 7, 6, 5, 4, 3, 2, 1 flashing in the center of the stage
    const giantCountdownNumber = Math.max(1, 8 - clampedBeat);
    return {
      effect,
      spotlightActive: true,
      giantCountdownNumber,
      cascadeBannerCount: 0,
      windowSplitActive: false,
      vhsWaveAmplitudePx: 0,
      crtStaticBurstAlpha: 0,
      verticalTrackShiftPx: 0,
    };
  }

  if (effect === 'notification_cascade') {
    const cascadeBannerCount = Math.min(6, clampedBeat);
    return {
      effect,
      spotlightActive: false,
      giantCountdownNumber: null,
      cascadeBannerCount,
      windowSplitActive: false,
      vhsWaveAmplitudePx: 0,
      crtStaticBurstAlpha: 0,
      verticalTrackShiftPx: 0,
    };
  }

  if (effect === 'window_split') {
    return {
      effect,
      spotlightActive: false,
      giantCountdownNumber: clampedBeat >= 5 ? 8 - clampedBeat : null,
      cascadeBannerCount: 0,
      windowSplitActive: true,
      vhsWaveAmplitudePx: 2.5,
      crtStaticBurstAlpha: 0,
      verticalTrackShiftPx: barIndex % 2 === 0 ? -14 : 14,
    };
  }

  if (effect === 'vhs_climax') {
    // Brief CRT snow static burst during the first 22% of Beat 1 on each bar transition
    const crtStaticBurstAlpha =
      clampedBeat === 1 && clampedProg < 0.25
        ? Number(((0.25 - clampedProg) * 1.4).toFixed(2))
        : 0;
    const verticalTrackShiftPx =
      barIndex % 3 === 0 ? -22 : barIndex % 3 === 1 ? 18 : 0;
    return {
      effect,
      spotlightActive: false,
      giantCountdownNumber: clampedBeat >= 4 ? 8 - clampedBeat : null,
      cascadeBannerCount: clampedBeat >= 5 ? 3 : 0,
      windowSplitActive: true,
      vhsWaveAmplitudePx: 6,
      crtStaticBurstAlpha,
      verticalTrackShiftPx,
    };
  }

  return {
    effect: 'none',
    spotlightActive: false,
    giantCountdownNumber: null,
    cascadeBannerCount: 0,
    windowSplitActive: false,
    vhsWaveAmplitudePx: 0,
    crtStaticBurstAlpha: 0,
    verticalTrackShiftPx: 0,
  };
}


