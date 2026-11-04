import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJudgment,
  applyJudgmentToStats,
  calculateRank,
  getBeatTime,
  evaluateStageProgress,
  getComboMultiplier,
  getComboVisualConfig,
  getPatternBeatOffsets,
  isPulseAudible,
  getPatternPulseTime,
  getPanelTrackProgress,
  getActivePhaseForBar,
  computeTrackPopupBox,
  getEffectiveBpm,
  getBarCallout,
  getCountInState,
  getSongSectionForBar,
  getActiveCutsceneForBar,
  getTerminalCutsceneForBar,
  getBlackoutState,
  getAmbientThemeState,
  getLowHealthGlitchState,
  calculateCpuLoadState,
  calculateCoolingFanAudioParams,
  getAsciiDataPackets,
  getSideToCenterDataStreams,
  getServerRackLedBlinkState,
  getStageBackdropForBar,
  getMutedBeatsForPanel,
  getRowLyricChant,
  createCustomLevelConfig,
  isLevelUnlocked,
  getStageSpectacleState,
  getSongPulseTime,
  shouldPlaySyntheticPulseOverlay,
  getDialogueUnlockProgress,
  MUSIC_TRACK_RESERVE,
  TARGET_CROSSHAIR_PROGRESS,
  JUDGMENT_WINDOWS,
} from './rules';
import {
  getLocalizedChapterMeta,
  getLocalizedLevelInfo,
  getLevelOpeningDialogue,
  getLocalizedMidSongCutscene,
  UI_TEXT,
} from './i18n';
import { RunStats, WardProgress } from './types';
import { LEVELS, CHAPTER_GROUPS } from './levels';

const initialStats: RunStats = {
  score: 0,
  maxCombo: 0,
  currentCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  earlyCount: 0,
  lateCount: 0,
  blindHitCount: 0,
  totalNotes: 0,
  health: 100,
  elapsedSeconds: 0,
  averageDeltaMs: 0,
  recentDeltas: [],
  rank: 'S',
};

test('calculateJudgment: classifies hit windows correctly', () => {
  // Perfect window: within ±45ms
  assert.equal(calculateJudgment(0).grade, 'PERFECT');
  assert.equal(calculateJudgment(25).grade, 'PERFECT');
  assert.equal(calculateJudgment(-39).grade, 'PERFECT');
  assert.equal(calculateJudgment(JUDGMENT_WINDOWS.PERFECT_MS).grade, 'PERFECT');

  // Good window: between 46ms and 95ms
  assert.equal(calculateJudgment(55).grade, 'GOOD');
  assert.equal(calculateJudgment(-75).grade, 'GOOD');
  assert.equal(calculateJudgment(JUDGMENT_WINDOWS.GOOD_MS).grade, 'GOOD');

  // Miss window: > 95ms
  assert.equal(calculateJudgment(105).grade, 'MISS');
  assert.equal(calculateJudgment(-120).grade, 'MISS');
  assert.equal(calculateJudgment(300).grade, 'MISS');
});

test('applyJudgmentToStats: increments combo, score, and blind-hit bonus on hits', () => {
  let stats = { ...initialStats };
  stats = applyJudgmentToStats(stats, 'PERFECT', 10);
  assert.equal(stats.score, 300);
  assert.equal(stats.currentCombo, 1);
  assert.equal(stats.perfectCount, 1);
  assert.equal(stats.health, 100); // capped at 100

  // 4 more perfects to reach combo 5 and trigger multiplier
  for (let i = 0; i < 4; i++) {
    stats = applyJudgmentToStats(stats, 'PERFECT', 5);
  }
  assert.equal(stats.currentCombo, 5);
  // Hits 1-4: 300 each (1200). Hit 5: 1.2x (360). Hit 6: 1.2x (360). Total: 1920
  stats = applyJudgmentToStats(stats, 'PERFECT', 0);
  assert.equal(stats.currentCombo, 6);
  assert.equal(stats.score, 300 * 4 + 360 * 2);

  // Blind Hit on an obstructed track grants +150 bonus and increments blindHitCount
  stats = applyJudgmentToStats(stats, 'PERFECT', -20, true);
  assert.equal(stats.blindHitCount, 1);
  assert.equal(stats.earlyCount, 1);
  assert.equal(stats.score, 300 * 4 + 360 * 3 + 150);
});

test('applyJudgmentToStats: resets combo and penalizes health on miss', () => {
  let stats = { ...initialStats, currentCombo: 10, maxCombo: 10 };
  stats = applyJudgmentToStats(stats, 'MISS', 150);
  assert.equal(stats.currentCombo, 0);
  assert.equal(stats.maxCombo, 10);
  assert.equal(stats.health, 86); // 100 - 14
  assert.equal(stats.missCount, 1);
});

test('calculateRank: calculates S+, S, A, C, F ranks accurately', () => {
  // 10 perfects, health 100 -> S+
  assert.equal(calculateRank(10, 0, 10, 100), 'S+');
  // 9 perfects, 1 good, health 90 -> S
  assert.equal(calculateRank(9, 1, 10, 90), 'S');
  // 8 perfects, 2 goods, health 70 -> A
  assert.equal(calculateRank(8, 2, 10, 70), 'A');
  // 5 perfects, 5 misses, health 30 -> C
  assert.equal(calculateRank(5, 0, 10, 30), 'C');
  // Dead server -> F
  assert.equal(calculateRank(10, 0, 10, 0), 'F');
});

test('getBeatTime: calculates correct timestamp for 7-beat rhythm', () => {
  const bpm = 120; // 0.5s per beat
  const startTime = 10.0;

  // Bar 0, Beat 1
  assert.equal(getBeatTime(startTime, bpm, 0, 1), 10.0);
  // Bar 0, Beat 7 (defibrillator hit)
  assert.equal(getBeatTime(startTime, bpm, 0, 7), 13.0);
  // Bar 1, Beat 1
  assert.equal(getBeatTime(startTime, bpm, 1, 1), 13.5);
  // Bar 1, Beat 7
  assert.equal(getBeatTime(startTime, bpm, 1, 7), 16.5);
});

test('evaluateStageProgress: detects defeat and victory states', () => {
  assert.equal(evaluateStageProgress(2, 8, 100), 'in_progress');
  assert.equal(evaluateStageProgress(4, 8, 0), 'defeat');
  assert.equal(evaluateStageProgress(8, 8, 50), 'victory');
});

test('getComboVisualConfig: grows font size/scale and changes color across multiplier tiers', () => {
  const tier0 = getComboVisualConfig(0);
  const tier1 = getComboVisualConfig(2); // 1.0x
  const tier2 = getComboVisualConfig(6); // 1.2x
  const tier3 = getComboVisualConfig(12); // 1.4x
  const tier4 = getComboVisualConfig(16); // 1.6x
  const tier5 = getComboVisualConfig(22); // 1.8x
  const tier6 = getComboVisualConfig(28); // 2.0x

  assert.equal(getComboMultiplier(2), 1.0);
  assert.equal(getComboMultiplier(6), 1.2);
  assert.equal(getComboMultiplier(12), 1.4);
  assert.equal(getComboMultiplier(28), 2.0);

  // Font size and scale monotonically grow as combo increases
  assert.ok(tier1.fontSize > tier0.fontSize);
  assert.ok(tier2.fontSize > tier1.fontSize);
  assert.ok(tier3.fontSize > tier2.fontSize);
  assert.ok(tier4.fontSize > tier3.fontSize);
  assert.ok(tier5.fontSize > tier4.fontSize);
  assert.ok(tier6.fontSize > tier5.fontSize);

  assert.ok(tier6.scale > tier1.scale);

  // Colors change across multiplier tiers
  assert.notEqual(tier1.color, tier2.color);
  assert.notEqual(tier2.color, tier3.color);
  assert.notEqual(tier3.color, tier4.color);
  assert.notEqual(tier4.color, tier5.color);
  assert.notEqual(tier5.color, tier6.color);
});

test('Rhythm Doctor patterns & multi-panel split phases align needle at Slot 7 center on Pulse 7', () => {
  const bpm = 120; // 0.5s per beat
  const startTime = 0;

  // On-beat hit on pulse 7 is at beat 6.0 -> 3.0s
  assert.equal(getPatternPulseTime(startTime, bpm, 0, 7, 'on_beat'), 3.0);
  // Off-beat hit on pulse 7 is at beat 6.5 -> 3.25s
  assert.equal(getPatternPulseTime(startTime, bpm, 0, 7, 'off_beat'), 3.25);
  // Double-time SVT hit on pulse 7 is at beat 3.0 -> 1.5s
  assert.equal(getPatternPulseTime(startTime, bpm, 0, 7, 'double_time'), 1.5);

  // Skip-beat cloaks pulses 4, 5, 6
  assert.equal(isPulseAudible('skip_beat', 3), true);
  assert.equal(isPulseAudible('skip_beat', 4), false);
  assert.equal(isPulseAudible('skip_beat', 6), false);
  assert.equal(isPulseAudible('on_beat', 5), true);

  // CRITICAL PRODUCER CHECK: Visual needle position at exact Pulse 7 (deltaMs === 0)
  // MUST equal TARGET_CROSSHAIR_PROGRESS (6.5 / 7, center of Slot 7) for EVERY pattern
  assert.ok(Math.abs(getPanelTrackProgress(6.0, 'on_beat').cycleProgress - TARGET_CROSSHAIR_PROGRESS) < 1e-6);
  assert.ok(Math.abs(getPanelTrackProgress(6.5, 'off_beat').cycleProgress - TARGET_CROSSHAIR_PROGRESS) < 1e-6);
  assert.ok(Math.abs(getPanelTrackProgress(3.0, 'double_time').cycleProgress - TARGET_CROSSHAIR_PROGRESS) < 1e-6);
  assert.ok(Math.abs(getPanelTrackProgress(6.0, 'skip_beat').cycleProgress - TARGET_CROSSHAIR_PROGRESS) < 1e-6);

  // Double-time needle finishes its cycle shortly after beat 3.25
  const dtProg = getPanelTrackProgress(3.5, 'double_time');
  assert.equal(dtProg.cycleProgress, 1.0);
  assert.equal(dtProg.isFinishedInBar, true);

  // Continuous Chapter Campaign level escalates from 1 panel -> 2 panels -> Blackout -> 3 panels
  const chapterLvl = LEVELS.find((l) => l.isChapterCampaign)!;
  assert.ok(chapterLvl);
  assert.equal(getActivePhaseForBar(chapterLvl, 0).panelCount, 1);
  assert.equal(getActivePhaseForBar(chapterLvl, 5).panelCount, 2);
  assert.equal(getActivePhaseForBar(chapterLvl, 13).panelCount, 3);
  assert.equal(getPatternBeatOffsets('off_beat').length, 7);
});

test('computeTrackPopupBox, getBarCallout & getCountInState verify track obstruction and 4-beat count-in', () => {
  const trackStartX = 188;
  const trackWidth = 960 - 188 - 40; // 732
  const beatWidth = trackWidth / 7;
  const trackTop = 310;
  const trackHeight = 84;

  const box = computeTrackPopupBox(trackStartX, trackWidth / 7, trackTop, trackHeight, 4, 7, 960, 540);
  assert.ok(box.boxX > trackStartX + beatWidth * 2.5);
  assert.ok(box.boxX + box.boxWidth >= trackStartX + trackWidth);
  assert.ok(box.boxY >= trackTop - 8);
  assert.ok(box.yPercent > 50);

  // Night shift scales BPM by 1.15x
  assert.equal(getEffectiveBpm(100, 'day'), 100);
  assert.equal(getEffectiveBpm(100, 'night'), 115);

  // Callout reacts to active popup obstruction
  const popupCallout = getBarCallout(LEVELS[0], 2, 6, true, false);
  assert.equal(popupCallout.speaker, 'ALERT P0');
  assert.ok(popupCallout.text.includes('BLIND BEAT 7'));

  // Count-in state returns steps 1..4 before levelStartTime
  const c1 = getCountInState(8.1, 10.0, 120);
  assert.equal(c1.isCountIn, true);
  assert.equal(c1.countInBeat, 1);

  const c4 = getCountInState(9.7, 10.0, 120);
  assert.equal(c4.isCountIn, true);
  assert.equal(c4.countInBeat, 4);

  const cDone = getCountInState(10.0, 10.0, 120);
  assert.equal(cDone.isCountIn, false);
});

test('6-Track Music Reserve, Story Cutscenes, Blackout Windows, and Dynamic CRT Ambient Transitions', () => {
  // 1. Verify 6 distinct tracks in reserve
  assert.equal(MUSIC_TRACK_RESERVE.length, 6);
  const uniqueIds = new Set(MUSIC_TRACK_RESERVE.map((t) => t.id));
  assert.equal(uniqueIds.size, 6);

  // 2. Verify F-2 Continuous Boss Campaign (`act1_chapter_song`) cutscenes & blackout windows
  const chapterLvl = LEVELS.find((l) => l.id === 'act1_chapter_song')!;
  assert.ok(chapterLvl);
  assert.equal(chapterLvl.totalBars, 16);

  // Bar 0 has Dispatcher A-Kui opening cutscene
  const cs0 = getActiveCutsceneForBar(chapterLvl, 0);
  assert.ok(cs0);
  assert.ok(cs0.speaker.includes('A-KUI'));

  // Bar 7 is inside the Chapter Blackout Window
  const section7 = getSongSectionForBar(
    7,
    chapterLvl.totalBars,
    chapterLvl.cutscenes,
    chapterLvl.blackoutWindows
  );
  assert.equal(section7, 'blackout');

  // Blackout state is warning flicker on Beat 1 (0.3) and full 0.94 darkness on Beat 3 (2.5), then flashes on Beat 7 (6.2)
  const boBeat1 = getBlackoutState(chapterLvl, 7, 0.3);
  const boBeat3 = getBlackoutState(chapterLvl, 7, 2.5);
  const boBeat7 = getBlackoutState(chapterLvl, 7, 6.2);
  assert.equal(boBeat1.isBlackout, true);
  assert.ok(boBeat3.darknessAlpha > boBeat1.darknessAlpha);
  assert.equal(boBeat3.darknessAlpha, 0.94);
  assert.equal(boBeat7.isLightsBackFlash, true);

  // 3. Verify Dynamic Ambient & CRT Scanline Transition System changes scanlineColor & ambientOverlayHue
  const deadlockLvl = LEVELS.find((l) => l.id === 'deadlock_ghost')!;
  const themeWard1Day = getAmbientThemeState(LEVELS[0], 'day', 0, 100);
  const themeWard2Day = getAmbientThemeState(deadlockLvl, 'day', 0, 100);
  const themeNightShift = getAmbientThemeState(LEVELS[0], 'night', 0, 100);
  const themeCriticalHealth = getAmbientThemeState(LEVELS[0], 'day', 0, 20);
  const themeBlackout = getAmbientThemeState(chapterLvl, 'day', 7, 100);

  assert.notEqual(themeWard1Day.scanlineColor, themeWard2Day.scanlineColor);
  assert.notEqual(themeWard1Day.scanlineColor, themeNightShift.scanlineColor);
  assert.notEqual(themeWard1Day.scanlineColor, themeCriticalHealth.scanlineColor);
  assert.equal(themeBlackout.themeName, 'BLACKOUT_VOID');
});

test('getLowHealthGlitchState: triggers below 20% health and intensifies as health reaches 0', () => {
  // Health >= 20% has no glitch state
  const healthy = getLowHealthGlitchState(100, 0.9, 0.9);
  const boundary20 = getLowHealthGlitchState(20, 0.9, 0.9);
  assert.equal(healthy.isGlitching, false);
  assert.equal(healthy.offsetX, 0);
  assert.equal(healthy.offsetY, 0);
  assert.equal(boundary20.isGlitching, false);
  assert.equal(boundary20.intensity, 0);

  // Just below 20% (18% health) activates mild glitch
  const mildGlitch = getLowHealthGlitchState(18, 1.0, 1.0);
  assert.equal(mildGlitch.isGlitching, true);
  assert.ok(mildGlitch.intensity > 0);
  assert.ok(mildGlitch.offsetX > 0);

  // Lower health (8% and 0%) intensifies glitch offset, RGB split, and slice count
  const severeGlitch = getLowHealthGlitchState(8, 1.0, 1.0);
  const zeroHealthGlitch = getLowHealthGlitchState(0, 1.0, 1.0);

  assert.ok(severeGlitch.intensity > mildGlitch.intensity);
  assert.ok(zeroHealthGlitch.intensity > severeGlitch.intensity);
  assert.equal(zeroHealthGlitch.intensity, 1);
  assert.ok(Math.abs(zeroHealthGlitch.offsetX) > Math.abs(severeGlitch.offsetX));
  assert.ok(Math.abs(severeGlitch.offsetX) > Math.abs(mildGlitch.offsetX));
  assert.ok(zeroHealthGlitch.sliceCount >= severeGlitch.sliceCount);
});

test('getTerminalCutsceneForBar: triggers interactive terminal cutscenes on song breaks when cutscene flag is set', () => {
  // All levels have cutscene: true and interactive terminalCutsceneBreaks configured
  for (const lvl of LEVELS) {
    assert.equal(lvl.cutscene, true);
    assert.ok(lvl.terminalCutsceneBreaks && lvl.terminalCutsceneBreaks.length > 0);
  }

  // Ward 1 triggers interactive terminal break at Bar 3 (Phase 2 song break)
  const ward1 = LEVELS[0];
  const breakBar3 = getTerminalCutsceneForBar(ward1, 3, false);
  assert.ok(breakBar3);
  assert.equal(breakBar3.triggerBar, 3);
  assert.ok(breakBar3.lines.length >= 2);
  assert.ok(breakBar3.choices && breakBar3.choices.length >= 2);

  // Non-break bar returns null unless forced
  assert.equal(getTerminalCutsceneForBar(ward1, 1, false), null);
  assert.ok(getTerminalCutsceneForBar(ward1, 1, true));

  // If cutscene flag is false on both level and phase, returns null
  const disabledLvl = {
    ...ward1,
    cutscene: false,
    phases: ward1.phases.map((p) => ({ ...p, cutscene: false })),
  };
  assert.equal(getTerminalCutsceneForBar(disabledLvl, 3, false), null);
});

test('Data Center Stage Backdrops, Pink X Muted Beats, Bus Telemetry Chants, and Stage Builder', () => {
  const chapterLvl = LEVELS.find((l) => l.id === 'act1_chapter_song')!;
  // Chapter campaign progresses across all 4 pixel-art Data Center backdrops
  assert.equal(getStageBackdropForBar(chapterLvl, 1), 'er_ward');
  assert.equal(getStageBackdropForBar(chapterLvl, 5), 'sunlit_conservatory');
  assert.equal(getStageBackdropForBar(chapterLvl, 9), 'sakura_pagoda');
  assert.equal(getStageBackdropForBar(chapterLvl, 14), 'cosmic_meteor');

  // Pink X muted beats on skip_beat and off_beat patterns
  assert.deepEqual(getMutedBeatsForPanel('skip_beat', 0), [4, 5, 6]);
  assert.deepEqual(getMutedBeatsForPanel('off_beat', 1), [2, 4, 6]);
  assert.deepEqual(getMutedBeatsForPanel('on_beat', 0), []);

  // Row telemetry chant & 3-2-1 countdown numbers
  const normalPanel = chapterLvl.phases[0].panels[0];
  const chantBeat4 = getRowLyricChant(chapterLvl, normalPanel, 0, 4);
  const chantBeat6 = getRowLyricChant(chapterLvl, normalPanel, 0, 6);
  assert.equal(chantBeat4.countdownNum, 3);
  assert.equal(chantBeat6.countdownNum, 1);
  assert.ok(chantBeat4.text.includes('PING'));

  // Reversed row chant ("P0 BACKLOG OVERFLOW!")
  const reversedPanel = { ...normalPanel, reversed: true };
  const revChant = getRowLyricChant(chapterLvl, reversedPanel, 12, 2);
  assert.ok(revChant.text.includes('P0 BACKLOG OVERFLOW'));

  // Built-in Stage Builder creates a valid playable LevelConfig
  const customLvl = createCustomLevelConfig({
    title: 'DMZ Firewall Bastion',
    patientName: 'SYN Flood Daemon',
    bpm: 132,
    totalBars: 10,
    musicTrackId: 'track_ddos_megalovania',
    stageBackdrop: 'sakura_pagoda',
    pattern: 'off_beat',
    panelCount: 2,
    reversedRow: true,
    enableBlackout: true,
    enablePopups: true,
  });
  assert.equal(customLvl.id, 'custom_editor_ward');
  assert.equal(customLvl.bpm, 132);
  assert.equal(customLvl.totalBars, 10);
  assert.equal(getStageBackdropForBar(customLvl, 0), 'sakura_pagoda');
  assert.equal(customLvl.phases[0].panelCount, 2);
  assert.equal(customLvl.phases[0].panels[1].reversed, true);
  assert.ok(customLvl.blackoutWindows && customLvl.blackoutWindows.length === 1);
});

test('calculateCpuLoadState: scales with rhythmic complexity and intensifies glitch near 100% load', () => {
  // Single-bay on-beat intro has nominal CPU load (< 40%)
  const bay1Intro = calculateCpuLoadState(LEVELS[0], 'day', 0, 1, 0, false);
  assert.equal(bay1Intro.tier, 'nominal');
  assert.ok(bay1Intro.loadPercent >= 8 && bay1Intro.loadPercent < 40);
  assert.equal(bay1Intro.glitchAmplifier, 0);

  // Syncopated 2-bay phase has higher CPU load than 1-bay intro
  const bay1Sync = calculateCpuLoadState(LEVELS[0], 'day', 6, 7, 1, false);
  assert.ok(bay1Sync.loadPercent > bay1Intro.loadPercent);

  // 3-Bay poly-rhythm climax in Night Shift with popups reaches overload (>= 85%)
  const chaosShiftLvl = LEVELS.find((l) => l.id === 'chaos_shift')!;
  const bay4Overload = calculateCpuLoadState(chaosShiftLvl, 'night', 9, 7, 2, false);
  assert.equal(bay4Overload.tier, 'overload');
  assert.ok(bay4Overload.loadPercent >= 85);
  assert.ok(bay4Overload.glitchAmplifier > 0);

  // Low-health glitch intensity increases when CPU Load approaches 100%
  const lowHealthNormalCpu = getLowHealthGlitchState(15, 1.0, 1.0, 30);
  const lowHealthPeakCpu = getLowHealthGlitchState(15, 1.0, 1.0, 98);
  assert.ok(lowHealthPeakCpu.intensity > lowHealthNormalCpu.intensity);
  assert.ok(Math.abs(lowHealthPeakCpu.offsetX) > Math.abs(lowHealthNormalCpu.offsetX));
  assert.ok(lowHealthPeakCpu.sliceCount > lowHealthNormalCpu.sliceCount);

  // Extreme CPU Load (>= 90%) triggers thermal overload glitch even when health >= 20%
  const healthyButOverloaded = getLowHealthGlitchState(100, 1.0, 1.0, 98);
  assert.equal(healthyButOverloaded.isGlitching, true);
  assert.ok(healthyButOverloaded.intensity > 0);
  assert.ok(healthyButOverloaded.statusLabel.includes('CPU LOAD'));
});

test('calculateCoolingFanAudioParams & getAsciiDataPackets: maps CPU Load to cooling noise and scrolls ASCII packets at BPM rhythm', () => {
  // Low CPU load has subtle white noise gain, low cutoffHz, and idle RPM
  const idleFan = calculateCoolingFanAudioParams(15, true, false);
  const highFan = calculateCoolingFanAudioParams(95, true, false);
  assert.ok(idleFan.gain > 0 && idleFan.gain < 0.02);
  assert.ok(highFan.gain > idleFan.gain && highFan.gain <= 0.075);
  assert.ok(highFan.cutoffHz > idleFan.cutoffHz);
  assert.ok(highFan.fanRpm > idleFan.fanRpm);

  // Muted or paused state drops white noise gain to 0
  const mutedFan = calculateCoolingFanAudioParams(95, true, true);
  const pausedFan = calculateCoolingFanAudioParams(95, false, false);
  assert.equal(mutedFan.gain, 0);
  assert.equal(pausedFan.gain, 0);

  // ASCII data packets scroll faster at higher BPM and pulse brighter on the beat
  const packetsOnBeat = getAsciiDataPackets(1000, 120, 0.0, 960, [78, 104]);
  const packetsMidBeat = getAsciiDataPackets(1000, 120, 0.85, 960, [78, 104]);
  const packetsLater = getAsciiDataPackets(1500, 120, 0.0, 960, [78, 104]);

  assert.equal(packetsOnBeat.length, 8);
  assert.ok(packetsOnBeat[0].label.length > 0);
  assert.ok(packetsOnBeat[0].alpha > packetsMidBeat[0].alpha);
  assert.notEqual(packetsOnBeat[0].x, packetsLater[0].x);
});

test('getSideToCenterDataStreams & getServerRackLedBlinkState: flows inward at BPM rhythm with beat multiplier speed and oscillates LED blink rate/color by CPU Load', () => {
  const streams1x = getSideToCenterDataStreams(500, 120, 0.0, 1, 960, 540);
  const streams4x = getSideToCenterDataStreams(500, 120, 0.0, 4, 960, 540);

  // Renders balanced left-to-center and right-to-center stream segments across horizontal lanes
  assert.equal(streams1x.length, 24);
  const leftSegs = streams1x.filter((s) => s.side === 'left');
  const rightSegs = streams1x.filter((s) => s.side === 'right');
  assert.equal(leftSegs.length, 12);
  assert.equal(rightSegs.length, 12);

  // Left segments stay within [0, 480) and right segments stay within (480, 960]
  for (const l of leftSegs) {
    assert.ok(l.startX >= 0 && l.endX <= 480);
    assert.ok(l.endX >= l.startX);
    assert.ok(l.glowAlpha >= 0.05 && l.glowAlpha <= 0.24);
    assert.ok(l.coreAlpha >= 0.12 && l.coreAlpha <= 0.42);
  }
  for (const r of rightSegs) {
    assert.ok(r.endX >= 480 && r.startX <= 960);
    assert.ok(r.startX >= r.endX);
  }

  // Higher beat/combo multiplier increases stream speedMultiplier and shifts position
  assert.ok(streams4x[0].speedMultiplier > streams1x[0].speedMultiplier);
  assert.notEqual(streams4x[0].endX, streams1x[0].endX);

  // Server rack status LED blink rate (blinkHz) increases and color shifts with CPU Load
  const lowLoadLed = getServerRackLedBlinkState(2, 3, 400, 18, 0.5);
  const midLoadLed = getServerRackLedBlinkState(2, 3, 400, 55, 0.5);
  const overloadLed = getServerRackLedBlinkState(2, 3, 400, 96, 0.5);

  assert.ok(midLoadLed.blinkHz > lowLoadLed.blinkHz);
  assert.ok(overloadLed.blinkHz > midLoadLed.blinkHz);
  assert.ok(['#22c55e', '#38bdf8'].includes(lowLoadLed.color));
  assert.ok(['#f43f5e', '#fbbf24', '#fde047'].includes(overloadLed.color));
});

test('Story Script v2 (Engineer Edition): 20 levels across 6 chapters, new beat patterns (two_beat_svt, swing_beat, irregular_7_8), and Rank B progression gate', () => {
  // 1. Verify 20 levels across 6 chapters (Prologue through Finale)
  assert.equal(CHAPTER_GROUPS.length, 6);
  assert.equal(LEVELS.length, 20);
  assert.equal(LEVELS[0].wardNumber, 'P-1');
  assert.equal(LEVELS[19].wardNumber, 'F-3');

  for (const lvl of LEVELS) {
    assert.ok(lvl.serviceUser && lvl.serviceUser.length > 0);
    assert.ok(lvl.onSuccessMessage && lvl.onSuccessMessage.length > 0);
    assert.ok(lvl.rackRow && lvl.rackRow.length > 0);
  }

  // F-3 Daybreak has the 4 epilogue gratitude messages from Linhai City
  assert.ok(LEVELS[19].epilogueMessages);
  assert.equal(LEVELS[19].epilogueMessages?.length, 4);

  // 2. Verify new beat patterns (two_beat_svt, swing_beat, irregular_7_8) align at TARGET_CROSSHAIR_PROGRESS on Pulse 7
  const svtHitBeat = getPatternBeatOffsets('two_beat_svt')[6];
  const swingHitBeat = getPatternBeatOffsets('swing_beat')[6];
  const irregularHitBeat = getPatternBeatOffsets('irregular_7_8')[6];

  assert.ok(
    Math.abs(
      getPanelTrackProgress(svtHitBeat, 'two_beat_svt').cycleProgress -
        TARGET_CROSSHAIR_PROGRESS
    ) < 1e-6
  );
  assert.ok(
    Math.abs(
      getPanelTrackProgress(swingHitBeat, 'swing_beat').cycleProgress -
        TARGET_CROSSHAIR_PROGRESS
    ) < 1e-6
  );
  assert.ok(
    Math.abs(
      getPanelTrackProgress(irregularHitBeat, 'irregular_7_8').cycleProgress -
        TARGET_CROSSHAIR_PROGRESS
    ) < 1e-6
  );

  // 3. Verify Rank B progression gate (`isLevelUnlocked`)
  const emptyProgress: WardProgress = { records: {}, audioOffsetMs: 0 };
  assert.equal(isLevelUnlocked(0, LEVELS, emptyProgress, 'day', false), true);
  assert.equal(isLevelUnlocked(1, LEVELS, emptyProgress, 'day', false), false);
  assert.equal(isLevelUnlocked(1, LEVELS, emptyProgress, 'day', true), true);

  const rankCProgress: WardProgress = {
    audioOffsetMs: 0,
    records: {
      [`${LEVELS[0].id}:day`]: {
        bestScore: 500,
        bestRank: 'C',
        bestCombo: 2,
        bestAccuracy: 50,
        clears: 1,
      },
    },
  };
  assert.equal(isLevelUnlocked(1, LEVELS, rankCProgress, 'day', false), false);

  const rankBProgress: WardProgress = {
    audioOffsetMs: 0,
    records: {
      [`${LEVELS[0].id}:day`]: {
        highScore: 1500,
        bestRank: 'B',
        maxCombo: 5,
        bestAccuracy: 75,
        cleared: true,
      },
    },
  };
  assert.equal(isLevelUnlocked(1, LEVELS, rankBProgress, 'day', false), true);
});

test('Level 1-2 (Peak-Hour Delivery Orders / 高峰期的外卖单) aligns 1:1 with the 36-hit 112 BPM Beatmap JSON and 137.14s MP3 structure', () => {
  const lvl12 = LEVELS.find((l) => l.id === 'c1_2_delivery_orders')!;
  assert.ok(lvl12);
  assert.equal(lvl12.wardNumber, '1-2');
  assert.equal(lvl12.bpm, 112);
  assert.equal(lvl12.totalBars, 36);
  assert.equal(lvl12.durationSec, 137.14);
  assert.equal(lvl12.externalAudioUrl, '/assets/aistudio/____________36d26ee9.mp3');
  assert.equal(lvl12.beatmapUrl, '/assets/aistudio/beatmap_pure_music_01-2_a7f56ee6.json');
  assert.equal(lvl12.beatmapChords, 'Am - F - C - G');

  // Verify all 6 musical sections cover Bars 0..35 contiguously
  assert.ok(lvl12.beatmapStructure);
  assert.equal(lvl12.beatmapStructure?.length, 6);
  assert.equal(lvl12.beatmapStructure?.[0].startBar, 0);
  assert.equal(lvl12.beatmapStructure?.[5].endBar, 35);

  // Verify all 36 beatmap hits match our engine's getPatternPulseTime(0, 112, bar, 7, panel0.pattern) within < 1ms
  assert.ok(lvl12.beatmapHits);
  assert.equal(lvl12.beatmapHits?.length, 36);

  for (let b = 0; b < 36; b++) {
    const hit = lvl12.beatmapHits![b];
    assert.equal(hit.beat_index, b * 7 + 6);

    const phase = getActivePhaseForBar(lvl12, b);
    const primaryPanel = phase.panels[0];
    assert.ok(primaryPanel.active);

    const engineHitSec = getPatternPulseTime(0, 112, b, 7, primaryPanel.pattern);
    assert.ok(
      Math.abs(engineHitSec - hit.time_sec) < 0.001,
      `Bar ${b} engineHitSec (${engineHitSec}) should match beatmap time_sec (${hit.time_sec})`
    );
  }

  // Verify Bridge (Bars 20..24, 75.0s..93.75s) uses skip_beat to match the MP3 drum-drop breakdown
  const bridgePhase = getActivePhaseForBar(lvl12, 20);
  assert.equal(bridgePhase.panels[0].pattern, 'skip_beat');
  assert.equal(isPulseAudible('skip_beat', 4), false);
  assert.equal(isPulseAudible('skip_beat', 5), false);
  assert.equal(isPulseAudible('skip_beat', 6), false);

  // Verify Chorus I (Bars 11..19) and Chorus II (Bars 25..33) stay on a clean single-track song-driven beatmap (panelCount === 1)
  const chorus1Phase = getActivePhaseForBar(lvl12, 11);
  assert.equal(chorus1Phase.panelCount, 1);
  assert.equal(chorus1Phase.panels[0].pattern, 'on_beat');

  const chorus2Phase = getActivePhaseForBar(lvl12, 25);
  assert.equal(chorus2Phase.panelCount, 1);
  assert.equal(chorus2Phase.panels[0].pattern, 'on_beat');
});

test('Real OST Stages (1-1 Samurai Techno, 1-3 Battleworn Insomniac, F-2 Finale) & getStageSpectacleState choreography', () => {
  // 1. Level 1-1: The Message Written & Deleted (Samurai Techno OST, 130 BPM, 16 bars, 75.8s)
  const lvl11 = LEVELS.find((l) => l.id === 'c1_1_hesitating_message')!;
  assert.ok(lvl11);
  assert.equal(lvl11.wardNumber, '1-1');
  assert.equal(lvl11.bpm, 130);
  assert.equal(lvl11.totalBars, 16);
  assert.equal(
    lvl11.externalAudioUrl,
    '/assets/aistudio/Rhythm_Doctor_OST_-_Level_1-1_Samurai_Techno_________-___1-1_____________63100da1.mp3'
  );
  assert.equal(lvl11.beatmapStructure?.length, 4);

  // Verify Spotlight Countdown on Drum Fill Riser (Bar 5, Beat 5 -> giantCountdownNumber = 3)
  const spec11Riser = getStageSpectacleState(lvl11, 5, 5, 0.2);
  assert.equal(spec11Riser.effect, 'spotlight_countdown');
  assert.equal(spec11Riser.spotlightActive, true);
  assert.equal(spec11Riser.giantCountdownNumber, 3);

  // Verify Window Split on Overdrive Arpeggio Finale (Bar 13)
  const spec11Drop = getStageSpectacleState(lvl11, 13, 2, 0.3);
  assert.equal(spec11Drop.effect, 'window_split');
  assert.equal(spec11Drop.windowSplitActive, true);

  // 2. Level 1-3: Sleepless Night Radio & Old Fan (Battleworn Insomniac OST, 100 BPM, 26 bars, 160.8s)
  const lvl13 = LEVELS.find((l) => l.id === 'c1_3_wobbly_fan')!;
  assert.ok(lvl13);
  assert.equal(lvl13.wardNumber, '1-3');
  assert.equal(lvl13.bpm, 100);
  assert.equal(lvl13.totalBars, 26);
  assert.equal(
    lvl13.externalAudioUrl,
    '/assets/aistudio/Rhythm_Doctor_OST_-_Level_1-3_Battleworn_Insomniac_________-___1-3_____________347d8a37.mp3'
  );
  assert.equal(lvl13.beatmapStructure?.length, 5);

  // Verify Act III (Bars 9..12) Spotlight 2-Beat SVT Breakdown
  const phase13Svt = getActivePhaseForBar(lvl13, 10);
  assert.equal(phase13Svt.panels[0].pattern, 'two_beat_svt');
  const spec13Svt = getStageSpectacleState(lvl13, 10, 7, 0.1);
  assert.equal(spec13Svt.effect, 'spotlight_countdown');
  assert.equal(spec13Svt.giantCountdownNumber, 1);

  // Verify Act V Climax (Bars 21..25) has VHS wave and CRT static burst on bar start
  const spec13Climax = getStageSpectacleState(lvl13, 22, 1, 0.1);
  assert.equal(spec13Climax.effect, 'vhs_climax');
  assert.ok(spec13Climax.vhsWaveAmplitudePx > 0);
  assert.ok(spec13Climax.crtStaticBurstAlpha > 0);

  // 3. Level 1-2 Chorus I (Bars 11..19) Notification Cascade
  const lvl12 = LEVELS.find((l) => l.id === 'c1_2_delivery_orders')!;
  const spec12Cascade = getStageSpectacleState(lvl12, 12, 4, 0.2);
  assert.equal(spec12Cascade.effect, 'notification_cascade');
  assert.equal(spec12Cascade.cascadeBannerCount, 4);
});

test('Song-driven beat timing (getSongPulseTime, shouldPlaySyntheticPulseOverlay), Forced Dialogue Viewing (getDialogueUnlockProgress), and Bilingual i18n (zh/en)', () => {
  const lvl12 = LEVELS.find((l) => l.id === 'c1_2_delivery_orders')!;
  const lvl13 = LEVELS.find((l) => l.id === 'c1_3_wobbly_fan')!;

  // 1. getSongPulseTime locks Beat 7 directly to beatmapHits[b].time_sec
  const startTime = 10.0;
  for (let b = 0; b < 36; b++) {
    const expectedHitSec = startTime + lvl12.beatmapHits![b].time_sec;
    const actualHitSec = getSongPulseTime(lvl12, startTime, 112, b, 7, 'straight');
    assert.ok(Math.abs(actualHitSec - expectedHitSec) < 0.0001);
  }

  // And for 1-3 Act III SVT (Bar 10), getSongPulseTime locks Beat 7 to beatmapHits[10].time_sec
  const hit13Bar10 = getSongPulseTime(lvl13, 0, 100, 10, 7, 'two_beat_svt');
  assert.ok(Math.abs(hit13Bar10 - lvl13.beatmapHits![10].time_sec) < 0.0001);

  // 2. shouldPlaySyntheticPulseOverlay disables extra synthetic pulse oscillator SFX during main songs
  assert.equal(shouldPlaySyntheticPulseOverlay(true, false), false);
  assert.equal(shouldPlaySyntheticPulseOverlay(false, false), false);
  assert.equal(shouldPlaySyntheticPulseOverlay(true, true), true);

  // 3. getDialogueUnlockProgress enforces mandatory reading lock and typewriter reveal
  const sampleText = '欢迎来到临海市“潮声数据中心”地下一层机房。';
  const early = getDialogueUnlockProgress(200, sampleText, 650);
  assert.equal(early.isUnlocked, false);
  assert.ok(early.visibleText.length > 0 && early.visibleText.length < sampleText.length);

  const unlocked = getDialogueUnlockProgress(700, sampleText, 650);
  assert.equal(unlocked.isUnlocked, true);
  assert.equal(unlocked.visibleText, sampleText);
  assert.equal(unlocked.progress, 1);

  // 4. Bilingual i18n (Chinese zh and English en) for Chapters, Levels, Pre-Stage Cutscenes, and Mid-Song Cutscenes
  const chapZh = getLocalizedChapterMeta('prologue', 'zh');
  const chapEn = getLocalizedChapterMeta('prologue', 'en');
  assert.ok(chapZh.title.includes('序章'));
  assert.ok(chapEn.title.includes('Prologue'));

  const info12Zh = getLocalizedLevelInfo(lvl12, 'zh');
  const info12En = getLocalizedLevelInfo(lvl12, 'en');
  assert.ok(info12Zh.name.includes('高峰期的外卖单'));
  assert.ok(info12En.name.includes('Peak-Hour Delivery Orders'));

  const dialogueZh = getLevelOpeningDialogue(lvl12, 'zh');
  const dialogueEn = getLevelOpeningDialogue(lvl12, 'en');
  assert.ok(dialogueZh.length >= 2);
  assert.ok(dialogueEn.length >= 2);
  assert.ok(dialogueZh[0].speaker.includes('阿葵'));
  assert.ok(dialogueEn[0].speaker.toUpperCase().includes('A-KUI'));

  const midCutZh = getLocalizedMidSongCutscene(lvl12, 11, 'zh', false);
  const midCutEn = getLocalizedMidSongCutscene(lvl12, 11, 'en', false);
  assert.ok(midCutZh);
  assert.ok(midCutEn);
  assert.notEqual(midCutZh?.text, midCutEn?.text);

  assert.equal(UI_TEXT.zh.langToggleLabel, '语言: 中文 / EN');
  assert.equal(UI_TEXT.en.langToggleLabel, 'LANG: EN / 中文');
});

