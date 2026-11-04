export type GameState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type JudgmentGrade = 'PERFECT' | 'GOOD' | 'MISS' | null;

export type ShiftMode = 'day' | 'night';

export type GimmickType =
  | 'normal'
  | 'fake_lag'
  | 'popup_hell'
  | 'chaos'
  | 'polyrhythm'
  | 'blackout_burst';

/**
 * Rhythm Doctor & Server Room Emergency Repair beat patterns within a 7-pulse bar:
 * - 'on_beat': Classic 1, 2, 3, 4, 5, 6, [7 HIT] on whole beats (0, 1, 2, 3, 4, 5, 6)
 * - 'off_beat': Syncopated half-beat offset on the "&" of each beat (0.5, 1.5, 2.5, 3.5, 4.5, 5.5, [6.5 HIT])
 * - 'double_time': 2x fast overclocked pulses (0, 0.5, 1.0, 1.5, 2.0, 2.5, [3.0 HIT])
 * - 'skip_beat': Dropped / silent beats 4-6 where player must count silently in their head (0, 1, 2, _, _, _, [6.0 HIT])
 * - 'two_beat_svt': Two-beat SVT burst — rapid 7-pulse cycle finishing on Beat 2.0
 * - 'swing_beat': Uneven swing groove where off-pulses are dragged (feel the groove)
 * - 'irregular_7_8': 7/8 irregular meter where the 7th beat is half a beat short (lands at 5.5)
 */
export type BeatPatternType =
  | 'on_beat'
  | 'off_beat'
  | 'double_time'
  | 'skip_beat'
  | 'two_beat_svt'
  | 'swing_beat'
  | 'irregular_7_8';

export type ChapterId =
  | 'prologue'
  | 'chapter1'
  | 'chapter2'
  | 'chapter3'
  | 'chapter4'
  | 'finale';

export type MusicTrackId =
  | 'track_operating_theatre'
  | 'track_midnight_pager'
  | 'track_kernel_overdrive'
  | 'track_mutex_ghost'
  | 'track_ddos_megalovania'
  | 'track_one_shift_more';

export type SongSectionType =
  | 'intro'
  | 'verse'
  | 'cutscene'
  | 'blackout'
  | 'chorus'
  | 'climax';

/**
 * 4 Data Center / Computing Stage Backdrops inside Chaosheng Data Center (Linhai City):
 * - 'er_ward': Basement Cold-Aisle 42U Server Room Hall (Rows A–E)
 * - 'sunlit_conservatory': Linhai City Window & Cross-City Fiber Vault (Rows F–K & Dawn Window)
 * - 'sakura_pagoda': High-Heat Cooling & Relay Bastion (Rows D, M & Cooling Rack)
 * - 'cosmic_meteor': Core Rack & Lingering Process Quarantine Chamber (Row L & Core Rack)
 */
export type StageBackdropId =
  | 'er_ward'
  | 'sakura_pagoda'
  | 'sunlit_conservatory'
  | 'cosmic_meteor';

export type StageSpectacleEffect =
  | 'none'
  | 'notification_cascade'
  | 'spotlight_countdown'
  | 'window_split'
  | 'vhs_climax';

export interface StageSpectacleState {
  effect: StageSpectacleEffect;
  spotlightActive: boolean;
  giantCountdownNumber: number | null;
  cascadeBannerCount: number;
  windowSplitActive: boolean;
  vhsWaveAmplitudePx: number;
  crtStaticBurstAlpha: number;
  verticalTrackShiftPx: number;
}

export interface CustomLevelParams {
  title: string;
  patientName: string;
  bpm: number;
  totalBars: number;
  musicTrackId: MusicTrackId;
  stageBackdrop: StageBackdropId;
  pattern: BeatPatternType;
  panelCount: 1 | 2 | 3;
  reversedRow: boolean;
  enableBlackout: boolean;
  enablePopups: boolean;
}

export interface MusicTrackMeta {
  id: MusicTrackId;
  title: string;
  genre: string;
  keySignature: string;
  defaultBpm: number;
  description: string;
  accentColor: string;
}

export interface StoryCutsceneEvent {
  startBar: number;
  endBar: number;
  speaker: string;
  role: string;
  avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai';
  text: string;
  mood: 'calm' | 'urgent' | 'panic' | 'triumph';
}

export interface BlackoutWindow {
  startBar: number;
  endBar: number;
  reason: string;
  keepBeat1Lit?: boolean;
}

export interface AmbientThemeState {
  themeName: string;
  bgPrimary: string;
  bgSecondary: string;
  scanlineColor: string;
  ambientOverlayHue: string;
  gridColor: string;
  vignetteColor: string;
  phaseAccent: string;
}

export interface LowHealthGlitchState {
  isGlitching: boolean;
  intensity: number; // 0.0 when health >= 20 and cpuLoad < 90, scaling up to 1.0
  offsetX: number;
  offsetY: number;
  rgbSplitPx: number;
  sliceCount: number;
  statusLabel: string;
}

export interface CpuLoadState {
  loadPercent: number; // 0 to 100 real-time rhythmic complexity load
  complexityLabel: string;
  tier: 'nominal' | 'elevated' | 'high' | 'overload';
  glitchAmplifier: number; // 0.0 below 75% load, scaling up to 1.0 at 100% load
}

export interface TerminalCutsceneChoice {
  label: string;
  command: string;
  responseLine: string;
}

export interface TerminalCutsceneBreak {
  id: string;
  triggerBar: number;
  title: string;
  terminalPrompt: string;
  speaker: string;
  role: string;
  avatarType: 'paige_sre' | 'ian_intern' | 'vp_suit' | 'kernel_ai';
  mood: 'calm' | 'urgent' | 'panic' | 'triumph';
  lines: string[];
  choices?: TerminalCutsceneChoice[];
}

export interface PanelSlotConfig {
  panelId: number; // 0, 1, or 2
  nodeName: string;
  bossType: 'heap_leak' | 'deadlock_ghost' | 'ddos_flood';
  color: string;
  pattern: BeatPatternType;
  active: boolean;
  /** Reverses the horizontal ECG direction */
  reversed?: boolean;
}

export interface BarPhaseConfig {
  startBar: number;
  endBar: number;
  panelCount: 1 | 2 | 3;
  phaseTitle: string;
  nurseCallout?: string;
  /** Triggers an interactive terminal cutscene during the song break at startBar */
  cutscene?: boolean;
  stageBackdrop?: StageBackdropId;
  stageEffect?: StageSpectacleEffect;
  panels: PanelSlotConfig[];
}

export interface LevelConfig {
  id: string;
  wardNumber: string; // e.g. 'P-1', '1-1', ..., 'F-3'
  chapterId?: ChapterId;
  chapterTitle?: string;
  rackRow?: string; // e.g. 'Row A', 'Row B', 'Rows F & G'
  serviceUser?: string; // The person/service behind the machine
  onSuccessMessage?: string; // Duty log or user gratitude message on recovery
  epilogueMessages?: Array<{ sender: string; text: string }>; // For F-3 Daybreak ending
  subtitle?: string;
  name: string;
  serverType: string;
  bpm: number;
  totalBars: number;
  gimmicks: GimmickType[];
  patientName: string;
  patientDescription: string;
  accentColor: string;
  songTitle: string;
  songKey: 'c_minor' | 'a_minor' | 'd_minor' | 'f_sharp_minor';
  musicTrackId: MusicTrackId;
  stageBackdrop?: StageBackdropId;
  isChapterCampaign?: boolean;
  /** Enables interactive text-based terminal cutscenes during song breaks */
  cutscene?: boolean;
  /** Optional real pre-rendered pure-music audio track URL (e.g. MP3) */
  externalAudioUrl?: string;
  /** Optional external beatmap JSON URL */
  beatmapUrl?: string;
  /** Optional chord progression display for beatmap levels (e.g. 'Am - F - C - G') */
  beatmapChords?: string;
  /** Optional exact duration in seconds from beatmap metadata */
  durationSec?: number;
  /** Optional musical structure sections mapped to 7-beat game bars */
  beatmapStructure?: Array<{
    section: string;
    bars: string;
    startBar: number;
    endBar: number;
    label: string;
  }>;
  /** Optional explicit 7th-beat hit timestamps from beatmap JSON */
  beatmapHits?: Array<{
    beat_index: number;
    time_sec: number;
  }>;
  phases: BarPhaseConfig[];
  cutscenes?: StoryCutsceneEvent[];
  terminalCutsceneBreaks?: TerminalCutsceneBreak[];
  blackoutWindows?: BlackoutWindow[];
}

export interface RunStats {
  score: number;
  maxCombo: number;
  currentCombo: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  earlyCount: number;
  lateCount: number;
  blindHitCount: number;
  totalNotes: number;
  health: number; // 0 to 100
  elapsedSeconds: number;
  averageDeltaMs: number;
  recentDeltas: number[];
  rank: 'S+' | 'S' | 'A' | 'B' | 'C' | 'F';
}

export interface LevelRecord {
  highScore: number;
  bestRank: 'S+' | 'S' | 'A' | 'B' | 'C' | 'F';
  bestAccuracy: number;
  maxCombo: number;
  cleared: boolean;
}

export interface WardProgress {
  records: Record<string, LevelRecord>; // keyed by `${levelId}:${shiftMode}`
  audioOffsetMs: number; // -50ms to +50ms calibration
}

export interface PopupAlert {
  id: number;
  title: string;
  message: string;
  x: number; // percentage 10-70
  y: number; // percentage 15-65
  width: number;
  type: 'error' | 'warning' | 'critical';
  /** Which ECG beat track row (0, 1, or 2) this popup physically obstructs */
  targetPanelId: number;
  /** Beat slot range (1..7) covered by this popup on the ECG track (e.g. slots 4..7) */
  startSlot: number;
  endSlot: number;
  /** Bar index when this popup was spawned */
  spawnBar: number;
}
