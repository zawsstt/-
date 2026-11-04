/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  JudgmentGrade,
  RunStats,
  LevelConfig,
  PopupAlert,
  PanelSlotConfig,
  ShiftMode,
  WardProgress,
  MusicTrackId,
  TerminalCutsceneBreak,
} from './game/types';
import { LEVELS } from './game/levels';
import {
  calculateJudgment,
  applyJudgmentToStats,
  evaluateStageProgress,
  getSongPulseTime,
  shouldPlaySyntheticPulseOverlay,
  getDialogueUnlockProgress,
  getActivePhaseForBar,
  isPulseAudible,
  getEffectiveBpm,
  getSongSectionForBar,
  getBlackoutState,
  getAmbientThemeState,
  getTerminalCutsceneForBar,
  calculateCpuLoadState,
  loadWardProgress,
  saveWardRecord,
  saveAudioOffset,
} from './game/rules';
import {
  Locale,
  getInitialLocale,
  saveLocalePreference,
  getLocalizedChapterMeta,
  getLocalizedLevelInfo,
  getLevelOpeningDialogue,
  UI_TEXT,
} from './game/i18n';
import { soundEngine } from './game/sound';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { PauseModal, VictoryModal, GameOverModal } from './components/Modals';

export type StageFlowPhase = 'opening_dialogue' | 'pre_song_tutorial' | 'main_song';

const INITIAL_STATS: RunStats = {
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

const SAMPLE_POPUPS: Array<{ title: string; message: string }> = [
  {
    title: 'Error: OutOfMemoryError',
    message: 'GC overhead limit exceeded: Java heap space.',
  },
  {
    title: '502 Bad Gateway Alert',
    message: 'Upstream gateway server failed to respond in 3000ms.',
  },
  {
    title: 'PagerDuty: CRITICAL P0',
    message: 'CEO woken up by on-call alert. High latency detected!',
  },
  {
    title: 'Kernel Panic',
    message: 'CPU 3 stuck for 23s: [softlockup_detector].',
  },
  {
    title: 'SYN Flood Warning',
    message: 'SYN packet backlog full. Dropping incoming connections.',
  },
];

const WARMUP_REQUIRED_HITS = 2;
const FORCED_DIALOGUE_LOCK_MS = 650;

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());
  const [gameState, setGameState] = useState<GameState>('title');
  const [stagePhase, setStagePhase] = useState<StageFlowPhase>('main_song');
  const [openingLineIndex, setOpeningLineIndex] = useState<number>(0);
  const [lineElapsedMs, setLineElapsedMs] = useState<number>(0);
  const [warmupHits, setWarmupHits] = useState<number>(0);

  const [selectedLevel, setSelectedLevel] = useState<LevelConfig>(LEVELS[0]);
  const [shiftMode, setShiftMode] = useState<ShiftMode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shift') === 'night' ? 'night' : 'day';
  });
  const [twoPlayerMode, setTwoPlayerMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('coop') === '1';
  });
  const [selectedTrackId, setSelectedTrackId] = useState<MusicTrackId | null>(null);
  const [wardProgress, setWardProgress] = useState<WardProgress>(() => loadWardProgress());
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [currentBar, setCurrentBar] = useState<number>(0);
  const [beatProgress, setBeatProgress] = useState<number>(0);
  const [countInLabel, setCountInLabel] = useState<string>('');
  const [panelBarJudgments, setPanelBarJudgments] = useState<Record<string, JudgmentGrade>>({});
  const [health, setHealth] = useState<number>(100);
  const [stats, setStats] = useState<RunStats>(INITIAL_STATS);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dischargeActive, setDischargeActive] = useState<boolean>(false);
  const [dischargedPanelId, setDischargedPanelId] = useState<number | null>(null);
  const [lastJudgment, setLastJudgment] = useState<{
    grade: JudgmentGrade;
    deltaMs: number;
    panelId?: number;
    blindBonus?: boolean;
  } | null>(null);
  const [fakeLagActive, setFakeLagActive] = useState<boolean>(false);
  const [forceBlackout, setForceBlackout] = useState<boolean>(false);
  const [forceCutscene, setForceCutscene] = useState<boolean>(false);
  const [forceHighCpuLoad, setForceHighCpuLoad] = useState<boolean>(false);
  const [activeTerminalCutscene, setActiveTerminalCutscene] =
    useState<TerminalCutsceneBreak | null>(null);
  const [terminalLineIndex, setTerminalLineIndex] = useState<number>(0);
  const [selectedTerminalChoice, setSelectedTerminalChoice] = useState<number | null>(
    null
  );
  const [popups, setPopups] = useState<PopupAlert[]>([]);

  // Refs for hardware-clock audio scheduler and game loop
  const localeRef = useRef<Locale>(locale);
  const levelRef = useRef<LevelConfig>(selectedLevel);
  const shiftModeRef = useRef<ShiftMode>(shiftMode);
  const twoPlayerModeRef = useRef<boolean>(twoPlayerMode);
  const selectedTrackIdRef = useRef<MusicTrackId | null>(selectedTrackId);
  const wardProgressRef = useRef<WardProgress>(wardProgress);
  const popupsRef = useRef<PopupAlert[]>(popups);
  const statsRef = useRef<RunStats>(INITIAL_STATS);
  const gameStateRef = useRef<GameState>('title');
  const stagePhaseRef = useRef<StageFlowPhase>('main_song');
  const openingLineIndexRef = useRef<number>(0);
  const lineStartPerfRef = useRef<number>(0);
  const warmupHitsRef = useRef<number>(0);

  const levelStartTimeRef = useRef<number>(0);
  const pauseAudioTimeRef = useRef<number | null>(null);
  const cutscenePauseAudioTimeRef = useRef<number | null>(null);
  const activeTerminalCutsceneRef = useRef<TerminalCutsceneBreak | null>(null);
  const terminalLineIndexRef = useRef<number>(0);
  const triggeredTerminalBreaksRef = useRef<Record<string, boolean>>({});
  const beatProgressRef = useRef<number>(0);
  const countInLabelRef = useRef<string>('');
  const forceBlackoutRef = useRef<boolean>(false);
  const lastProcessedBeatRef = useRef<{ bar: number; beat: number }>({ bar: -1, beat: -1 });
  const scheduledSubstepsRef = useRef<Record<string, boolean>>({});
  const firedPanelPulsesRef = useRef<Record<string, boolean>>({});
  const beat7ProcessedRef = useRef<Record<string, boolean>>({});
  const dischargeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  const handleToggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next: Locale = prev === 'zh' ? 'en' : 'zh';
      saveLocalePreference(next);
      localeRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    levelRef.current = selectedLevel;
    if (selectedLevel.externalAudioUrl) {
      soundEngine.preloadExternalAudio(selectedLevel.externalAudioUrl);
    }
  }, [selectedLevel]);

  useEffect(() => {
    LEVELS.forEach((lvl) => {
      if (lvl.externalAudioUrl) {
        soundEngine.preloadExternalAudio(lvl.externalAudioUrl);
      }
    });
  }, []);

  useEffect(() => {
    shiftModeRef.current = shiftMode;
  }, [shiftMode]);

  useEffect(() => {
    twoPlayerModeRef.current = twoPlayerMode;
  }, [twoPlayerMode]);

  useEffect(() => {
    selectedTrackIdRef.current = selectedTrackId;
  }, [selectedTrackId]);

  useEffect(() => {
    wardProgressRef.current = wardProgress;
  }, [wardProgress]);

  useEffect(() => {
    popupsRef.current = popups;
  }, [popups]);

  useEffect(() => {
    gameStateRef.current = gameState;
    const bodyState = gameState === 'victory' ? 'gameover' : gameState;
    document.body.dataset.state = bodyState;
    if (gameState !== 'playing') {
      soundEngine.stopExternalTrack();
    }
  }, [gameState]);

  useEffect(() => {
    stagePhaseRef.current = stagePhase;
    document.body.dataset.stagePhase = stagePhase;
  }, [stagePhase]);

  // Typewriter & forced-viewing timer during `opening_dialogue`
  useEffect(() => {
    if (gameState !== 'playing' || stagePhase !== 'opening_dialogue') {
      return;
    }
    const interval = window.setInterval(() => {
      const elapsed = Math.max(0, performance.now() - lineStartPerfRef.current);
      setLineElapsedMs(elapsed);
    }, 35);
    return () => clearInterval(interval);
  }, [gameState, stagePhase, openingLineIndex]);

  // Synchronize the sound engine's low-frequency white noise server cooling generator with real-time CPU Load
  useEffect(() => {
    const cpuLoad = calculateCpuLoadState(
      selectedLevel,
      shiftMode,
      currentBar,
      currentBeat,
      popups.length,
      forceHighCpuLoad
    );
    soundEngine.setCoolingFanLoad(
      cpuLoad.loadPercent,
      gameState === 'playing' && stagePhase === 'main_song' && !activeTerminalCutscene
    );
  }, [
    selectedLevel,
    shiftMode,
    currentBar,
    currentBeat,
    popups.length,
    forceHighCpuLoad,
    gameState,
    stagePhase,
    activeTerminalCutscene,
    isMuted,
  ]);

  const handleAdjustAudioOffset = useCallback((deltaMs: number) => {
    setWardProgress((prev) => {
      const next = saveAudioOffset(prev.audioOffsetMs + deltaMs);
      wardProgressRef.current = next;
      return next;
    });
  }, []);

  /**
   * Transitions from the Pre-Stage Story / Pre-Song Warmup into the Main Song (`main_song`).
   * Starts the song immediately (`now + 0.12s`) without any disconnected 4-beat oscillator delay,
   * locking Beat 7 directly to the song's real musical phrasing (`beatmapHits`).
   */
  const launchMainSong = useCallback((levelToPlay: LevelConfig = levelRef.current) => {
    soundEngine.ensureRunning();
    soundEngine.stopExternalTrack();

    const params = new URLSearchParams(window.location.search);
    const healthParam = params.get('health');
    const isGlitchParam = params.get('glitch') === '1';
    const startingHealth =
      healthParam !== null && !Number.isNaN(Number(healthParam))
        ? Math.max(1, Math.min(100, Number(healthParam)))
        : isGlitchParam
        ? 8
        : 100;

    const initial = { ...INITIAL_STATS, health: startingHealth, recentDeltas: [] };
    setStats(initial);
    statsRef.current = initial;
    setHealth(startingHealth);
    setCurrentBar(0);
    setCurrentBeat(1);
    setBeatProgress(0);
    beatProgressRef.current = 0;
    setCountInLabel('');
    countInLabelRef.current = '';
    setPanelBarJudgments({});
    setLastJudgment(null);
    setDischargedPanelId(null);

    lastProcessedBeatRef.current = { bar: -1, beat: -1 };
    scheduledSubstepsRef.current = {};
    firedPanelPulsesRef.current = {};
    beat7ProcessedRef.current = {};

    const now = soundEngine.getAudioTime();
    const effectiveBpm = getEffectiveBpm(levelToPlay.bpm, shiftModeRef.current);
    levelStartTimeRef.current = now + 0.12;

    stagePhaseRef.current = 'main_song';
    setStagePhase('main_song');

    if (levelToPlay.externalAudioUrl && !activeTerminalCutsceneRef.current) {
      const playbackRate = effectiveBpm / Math.max(1, levelToPlay.bpm);
      soundEngine.startExternalTrack(
        levelToPlay.externalAudioUrl,
        levelStartTimeRef.current,
        playbackRate
      );
    }
  }, []);

  /**
   * Enters the Interactive Pre-Song Tutorial Warmup (`pre_song_tutorial`) where the player
   * lands 2 practice 7th-beat hits at the level's BPM/mechanic before the main song begins.
   */
  const startPreSongTutorial = useCallback((levelToPlay: LevelConfig = levelRef.current) => {
    soundEngine.ensureRunning();
    soundEngine.stopExternalTrack();
    soundEngine.playTerminalBlip(true);

    setCurrentBar(0);
    setCurrentBeat(1);
    setBeatProgress(0);
    beatProgressRef.current = 0;
    setPanelBarJudgments({});
    setLastJudgment(null);
    lastProcessedBeatRef.current = { bar: -1, beat: -1 };
    firedPanelPulsesRef.current = {};
    beat7ProcessedRef.current = {};
    warmupHitsRef.current = 0;
    setWarmupHits(0);

    levelStartTimeRef.current = soundEngine.getAudioTime() + 0.08;
    stagePhaseRef.current = 'pre_song_tutorial';
    setStagePhase('pre_song_tutorial');
  }, []);

  /**
   * Advances the Pre-Stage Story / Chapter Opening Cutscene (`opening_dialogue`),
   * enforcing a mandatory 650ms reading lock per line so players don't accidentally skip story.
   */
  const handleAdvanceOpeningDialogue = useCallback(
    (forceUnlock: boolean = false) => {
      if (stagePhaseRef.current !== 'opening_dialogue') return;
      const lines = getLevelOpeningDialogue(levelRef.current, localeRef.current);
      const currentIdx = openingLineIndexRef.current;
      const currentLine = lines[currentIdx];
      if (!currentLine) {
        startPreSongTutorial(levelRef.current);
        return;
      }

      const elapsed = Math.max(0, performance.now() - lineStartPerfRef.current);
      const unlock = getDialogueUnlockProgress(
        elapsed,
        currentLine.text,
        FORCED_DIALOGUE_LOCK_MS
      );
      if (!forceUnlock && !unlock.isUnlocked) {
        return;
      }

      if (currentIdx < lines.length - 1) {
        soundEngine.playTerminalBlip(false);
        const nextIdx = currentIdx + 1;
        openingLineIndexRef.current = nextIdx;
        lineStartPerfRef.current = performance.now();
        setOpeningLineIndex(nextIdx);
        setLineElapsedMs(0);
      } else {
        startPreSongTutorial(levelRef.current);
      }
    },
    [startPreSongTutorial]
  );

  const startGame = useCallback(
    (levelToPlay: LevelConfig = selectedLevel) => {
      soundEngine.ensureRunning();
      soundEngine.stopExternalTrack();
      setSelectedLevel(levelToPlay);
      levelRef.current = levelToPlay;

      const params = new URLSearchParams(window.location.search);
      const healthParam = params.get('health');
      const isGlitchParam = params.get('glitch') === '1';
      const startingHealth =
        healthParam !== null && !Number.isNaN(Number(healthParam))
          ? Math.max(1, Math.min(100, Number(healthParam)))
          : isGlitchParam
          ? 8
          : 100;

      const initial = { ...INITIAL_STATS, health: startingHealth, recentDeltas: [] };
      setStats(initial);
      statsRef.current = initial;
      setIsNewRecord(false);
      setHealth(startingHealth);
      setCurrentBar(0);
      setCurrentBeat(1);
      setBeatProgress(0);
      beatProgressRef.current = 0;
      setCountInLabel('');
      countInLabelRef.current = '';
      setPanelBarJudgments({});
      setLastJudgment(null);
      setDischargedPanelId(null);

      const isBlackoutParam = params.get('blackout') === '1';
      const isCutsceneParam = params.get('cutscene') === '1';
      const isPopupParam = params.get('popup') === '1';
      const isCpuLoadParam =
        params.get('cpuload') === '1' || params.get('cpuload') === 'high';
      setForceBlackout(isBlackoutParam);
      forceBlackoutRef.current = isBlackoutParam;
      setForceCutscene(isCutsceneParam);
      setForceHighCpuLoad(isCpuLoadParam);

      if (isPopupParam) {
        const initialPopup: PopupAlert = {
          id: 1,
          title: '502 Bad Gateway Alert',
          message: 'Upstream gateway failed to respond in 3000ms.',
          x: 50,
          y: 72,
          width: 320,
          type: 'error',
          targetPanelId: 0,
          startSlot: 4,
          endSlot: 7,
          spawnBar: 0,
        };
        setPopups([initialPopup]);
        popupsRef.current = [initialPopup];
      } else {
        setPopups([]);
        popupsRef.current = [];
      }

      setFakeLagActive(false);

      lastProcessedBeatRef.current = { bar: -1, beat: -1 };
      scheduledSubstepsRef.current = {};
      firedPanelPulsesRef.current = {};
      beat7ProcessedRef.current = {};
      triggeredTerminalBreaksRef.current = {};
      pauseAudioTimeRef.current = null;

      const now = soundEngine.getAudioTime();
      const isDirectMainSong =
        (params.get('autostart') === '1' ||
          isCutsceneParam ||
          isPopupParam ||
          isBlackoutParam) &&
        params.get('story') !== '1';

      if (isCutsceneParam) {
        const forcedBreak = getTerminalCutsceneForBar(levelToPlay, 0, true);
        if (forcedBreak) {
          triggeredTerminalBreaksRef.current[forcedBreak.id] = true;
          cutscenePauseAudioTimeRef.current = now;
          activeTerminalCutsceneRef.current = forcedBreak;
          terminalLineIndexRef.current = 0;
          setActiveTerminalCutscene(forcedBreak);
          setTerminalLineIndex(0);
          setSelectedTerminalChoice(null);
        }
      } else {
        cutscenePauseAudioTimeRef.current = null;
        activeTerminalCutsceneRef.current = null;
        setActiveTerminalCutscene(null);
      }

      if (isDirectMainSong) {
        stagePhaseRef.current = 'main_song';
        setStagePhase('main_song');
        levelStartTimeRef.current = now + 0.12;
        if (levelToPlay.externalAudioUrl && !isCutsceneParam) {
          const effectiveBpm = getEffectiveBpm(levelToPlay.bpm, shiftModeRef.current);
          const playbackRate = effectiveBpm / Math.max(1, levelToPlay.bpm);
          soundEngine.startExternalTrack(
            levelToPlay.externalAudioUrl,
            levelStartTimeRef.current,
            playbackRate
          );
        }
      } else {
        // Normal stage entry: begin with Chapter Opening & Level Pre-Stage Story Cutscene (`opening_dialogue`)
        stagePhaseRef.current = 'opening_dialogue';
        setStagePhase('opening_dialogue');
        openingLineIndexRef.current = 0;
        lineStartPerfRef.current = performance.now();
        setOpeningLineIndex(0);
        setLineElapsedMs(0);
        warmupHitsRef.current = 0;
        setWarmupHits(0);
        levelStartTimeRef.current = now + 0.12;
      }

      setGameState('playing');
    },
    [selectedLevel]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shift') === 'night') {
      setShiftMode('night');
      shiftModeRef.current = 'night';
    }
    const rawLevel = params.get('level');
    let targetLvl = LEVELS[0];
    if (rawLevel !== null) {
      const byCode = LEVELS.find(
        (l) =>
          l.id.toLowerCase() === rawLevel.toLowerCase() ||
          l.wardNumber.toLowerCase() === rawLevel.toLowerCase()
      );
      if (byCode) {
        targetLvl = byCode;
      } else {
        const idx = Number(rawLevel);
        if (!Number.isNaN(idx) && LEVELS[idx]) {
          targetLvl = LEVELS[idx];
        }
      }
      setSelectedLevel(targetLvl);
      levelRef.current = targetLvl;
    }
    if (params.get('victory') === '1') {
      setGameState('victory');
      return;
    }
    if (params.get('autostart') === '1' || params.get('story') === '1') {
      startGame(targetLvl);
    }
  }, []);

  const pauseGame = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      pauseAudioTimeRef.current = soundEngine.getAudioTime();
      soundEngine.stopExternalTrack();
      setGameState('paused');
    }
  }, []);

  const resumeGame = useCallback(() => {
    if (gameStateRef.current === 'paused') {
      soundEngine.ensureRunning();
      if (pauseAudioTimeRef.current !== null) {
        const pausedDuration = soundEngine.getAudioTime() - pauseAudioTimeRef.current;
        levelStartTimeRef.current += pausedDuration;
        pauseAudioTimeRef.current = null;
      }
      const lvl = levelRef.current;
      if (
        lvl.externalAudioUrl &&
        stagePhaseRef.current === 'main_song' &&
        !activeTerminalCutsceneRef.current
      ) {
        const effectiveBpm = getEffectiveBpm(lvl.bpm, shiftModeRef.current);
        const playbackRate = effectiveBpm / Math.max(1, lvl.bpm);
        soundEngine.startExternalTrack(
          lvl.externalAudioUrl,
          levelStartTimeRef.current,
          playbackRate
        );
      }
      setGameState('playing');
    }
  }, []);

  const toggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const dismissPopup = useCallback((id: number) => {
    setPopups((prev) => {
      const next = prev.filter((p) => p.id !== id);
      popupsRef.current = next;
      return next;
    });
  }, []);

  const openTerminalCutsceneBreak = useCallback((cutsceneBreak: TerminalCutsceneBreak) => {
    soundEngine.ensureRunning();
    soundEngine.stopExternalTrack();
    soundEngine.playTerminalBlip(false);
    if (cutscenePauseAudioTimeRef.current === null) {
      cutscenePauseAudioTimeRef.current = soundEngine.getAudioTime();
    }
    activeTerminalCutsceneRef.current = cutsceneBreak;
    terminalLineIndexRef.current = 0;
    setActiveTerminalCutscene(cutsceneBreak);
    setTerminalLineIndex(0);
    setSelectedTerminalChoice(null);
  }, []);

  const closeTerminalCutsceneBreak = useCallback(() => {
    soundEngine.ensureRunning();
    soundEngine.playTerminalBlip(true);
    if (cutscenePauseAudioTimeRef.current !== null) {
      const pausedDuration =
        soundEngine.getAudioTime() - cutscenePauseAudioTimeRef.current;
      levelStartTimeRef.current += pausedDuration;
      cutscenePauseAudioTimeRef.current = null;
    }
    activeTerminalCutsceneRef.current = null;
    terminalLineIndexRef.current = 0;
    setActiveTerminalCutscene(null);
    setTerminalLineIndex(0);
    setSelectedTerminalChoice(null);
    const lvl = levelRef.current;
    if (
      lvl.externalAudioUrl &&
      gameStateRef.current === 'playing' &&
      stagePhaseRef.current === 'main_song'
    ) {
      const effectiveBpm = getEffectiveBpm(lvl.bpm, shiftModeRef.current);
      const playbackRate = effectiveBpm / Math.max(1, lvl.bpm);
      soundEngine.startExternalTrack(
        lvl.externalAudioUrl,
        levelStartTimeRef.current,
        playbackRate
      );
    }
  }, []);

  const handleAdvanceTerminalCutscene = useCallback(() => {
    const active = activeTerminalCutsceneRef.current;
    if (!active) return;
    if (terminalLineIndexRef.current < active.lines.length - 1) {
      soundEngine.playTerminalBlip(false);
      const nextIdx = terminalLineIndexRef.current + 1;
      terminalLineIndexRef.current = nextIdx;
      setTerminalLineIndex(nextIdx);
    } else {
      closeTerminalCutsceneBreak();
    }
  }, [closeTerminalCutsceneBreak]);

  const handleSelectTerminalChoice = useCallback((choiceIndex: number) => {
    soundEngine.ensureRunning();
    soundEngine.playTerminalBlip(true);
    setSelectedTerminalChoice(choiceIndex);
  }, []);

  const handleOpenManualTerminalCutscene = useCallback(() => {
    if (gameStateRef.current !== 'playing' || activeTerminalCutsceneRef.current) return;
    const lvl = levelRef.current;
    const targetBreak =
      getTerminalCutsceneForBar(lvl, lastProcessedBeatRef.current.bar, true) ||
      lvl.terminalCutsceneBreaks?.[0];
    if (targetBreak) {
      openTerminalCutsceneBreak(targetBreak);
    }
  }, [openTerminalCutsceneBreak]);

  /**
   * Action trigger when player presses Space (P1) or J/Enter (P2 in Co-Op) or clicks on stage.
   */
  const triggerDefibrillate = useCallback(
    (playerSlot?: 1 | 2) => {
      soundEngine.ensureRunning();
      if (gameStateRef.current !== 'playing') {
        if (gameStateRef.current === 'title' || gameStateRef.current === 'gameover') {
          startGame();
        }
        return;
      }

      // If in Pre-Stage Story Cutscene (`opening_dialogue`), Space/Click advances the dialogue once unlocked
      if (stagePhaseRef.current === 'opening_dialogue') {
        handleAdvanceOpeningDialogue(false);
        return;
      }

      const rawAudioTime = soundEngine.getAudioTime();
      const startTime = levelStartTimeRef.current;
      if (rawAudioTime < startTime - 0.18) {
        return;
      }

      const offsetSec = (wardProgressRef.current.audioOffsetMs || 0) / 1000;
      const audioTime = rawAudioTime - offsetSec;

      const lvl = levelRef.current;
      const mode = shiftModeRef.current;
      const bpm = getEffectiveBpm(lvl.bpm, mode);
      const secondsPerBeat = 60 / bpm;

      const timeSinceStart = audioTime - startTime;
      const totalBeatsSinceStart = timeSinceStart / secondsPerBeat;
      const approxBar = Math.floor(totalBeatsSinceStart / 7);

      // During Pre-Song Interactive Tutorial Warmup (`pre_song_tutorial`), evaluate continuous warmup bars
      if (stagePhaseRef.current === 'pre_song_tutorial') {
        const warmupPattern = lvl.phases[0]?.panels[0]?.pattern || 'straight';
        const candidateWarmupBars = [approxBar - 1, approxBar, approxBar + 1].filter(
          (b) => b >= 0
        );
        let bestWBar = -1;
        let minWDelta = Infinity;
        for (const b of candidateWarmupBars) {
          const key = `warmup:${b}`;
          if (beat7ProcessedRef.current[key]) continue;
          const targetTime =
            startTime +
            b * 7 * secondsPerBeat +
            (warmupPattern === 'two_beat_svt' ? 1 * secondsPerBeat : 6 * secondsPerBeat);
          const deltaSec = audioTime - targetTime;
          if (Math.abs(deltaSec) < Math.abs(minWDelta)) {
            minWDelta = deltaSec;
            bestWBar = b;
          }
        }

        if (bestWBar !== -1 && Math.abs(minWDelta) <= 0.19) {
          const key = `warmup:${bestWBar}`;
          beat7ProcessedRef.current[key] = true;
          const deltaMs = minWDelta * 1000;
          const judgment = calculateJudgment(deltaMs, mode);
          const isHit = judgment.grade === 'PERFECT' || judgment.grade === 'GOOD';

          setDischargeActive(true);
          setDischargedPanelId(0);
          if (dischargeTimerRef.current) clearTimeout(dischargeTimerRef.current);
          dischargeTimerRef.current = window.setTimeout(() => {
            setDischargeActive(false);
            setDischargedPanelId(null);
          }, 170);

          setLastJudgment({
            grade: judgment.grade,
            deltaMs,
            panelId: 0,
          });

          if (isHit) {
            soundEngine.playDefibrillatorShock();
            soundEngine.playJudgmentFeedback(judgment.grade);
            const nextHits = warmupHitsRef.current + 1;
            warmupHitsRef.current = nextHits;
            setWarmupHits(nextHits);
            if (nextHits >= WARMUP_REQUIRED_HITS) {
              window.setTimeout(() => {
                if (
                  gameStateRef.current === 'playing' &&
                  stagePhaseRef.current === 'pre_song_tutorial'
                ) {
                  launchMainSong(levelRef.current);
                }
              }, 320);
            }
          } else {
            soundEngine.playJudgmentFeedback('MISS');
          }
        }
        return;
      }

      // Main Song (`main_song`): Search candidate bars and active panels for the closest unprocessed 7th-pulse target
      const candidateBars = [approxBar - 1, approxBar, approxBar + 1].filter(
        (b) => b >= 0 && b < lvl.totalBars
      );

      let bestBar = -1;
      let bestPanel: PanelSlotConfig | null = null;
      let minDelta = Infinity;

      for (const b of candidateBars) {
        const phase = getActivePhaseForBar(lvl, b);
        const isCoopMultiTrack = twoPlayerModeRef.current && phase.panelCount >= 2;
        for (const panel of phase.panels) {
          if (!panel.active) continue;
          if (isCoopMultiTrack && playerSlot === 1 && panel.panelId !== 0) continue;
          if (isCoopMultiTrack && playerSlot === 2 && panel.panelId === 0) continue;
          const key = `${b}:${panel.panelId}`;
          if (beat7ProcessedRef.current[key]) continue;

          const targetTime = getSongPulseTime(
            lvl,
            startTime,
            bpm,
            b,
            7,
            panel.pattern
          );
          const deltaSec = audioTime - targetTime;
          if (Math.abs(deltaSec) < Math.abs(minDelta)) {
            minDelta = deltaSec;
            bestBar = b;
            bestPanel = panel;
          }
        }
      }

      if (bestBar !== -1 && bestPanel && Math.abs(minDelta) <= 0.175) {
        const key = `${bestBar}:${bestPanel.panelId}`;
        beat7ProcessedRef.current[key] = true;
        const deltaMs = minDelta * 1000;
        const judgment = calculateJudgment(deltaMs, mode);
        const isHit = judgment.grade === 'PERFECT' || judgment.grade === 'GOOD';

        setPanelBarJudgments((prev) => ({ ...prev, [key]: judgment.grade }));

        const obstructingPopup = popupsRef.current.find(
          (p) => p.targetPanelId === bestPanel!.panelId
        );
        const blackoutForBar = getBlackoutState(
          lvl,
          bestBar,
          5.5,
          forceBlackoutRef.current
        );
        const isBlindHit = isHit && (Boolean(obstructingPopup) || blackoutForBar.isBlackout);

        if (isHit) {
          soundEngine.playDefibrillatorShock();
          soundEngine.playJudgmentFeedback(judgment.grade);
          if (obstructingPopup) {
            dismissPopup(obstructingPopup.id);
          }
        } else {
          soundEngine.playJudgmentFeedback('MISS');
        }

        setDischargeActive(true);
        setDischargedPanelId(bestPanel.panelId);
        if (dischargeTimerRef.current) clearTimeout(dischargeTimerRef.current);
        dischargeTimerRef.current = window.setTimeout(() => {
          setDischargeActive(false);
          setDischargedPanelId(null);
        }, 170);

        const nextStats = applyJudgmentToStats(
          statsRef.current,
          judgment.grade,
          deltaMs,
          isBlindHit
        );
        statsRef.current = nextStats;
        setStats(nextStats);
        setHealth(nextStats.health);
        setLastJudgment({
          grade: judgment.grade,
          deltaMs,
          panelId: bestPanel.panelId,
          blindBonus: isBlindHit,
        });

        const progress = evaluateStageProgress(bestBar, lvl.totalBars, nextStats.health);
        if (progress === 'defeat') {
          setTimeout(() => setGameState('gameover'), 400);
        }
      } else {
        soundEngine.playJudgmentFeedback('MISS');
        setLastJudgment({ grade: 'MISS', deltaMs: 250, panelId: 0 });
        const nextStats = applyJudgmentToStats(statsRef.current, 'MISS', 250, false);
        statsRef.current = nextStats;
        setStats(nextStats);
        setHealth(nextStats.health);

        if (nextStats.health <= 0) {
          setTimeout(() => setGameState('gameover'), 400);
        }
      }
    },
    [startGame, dismissPopup, handleAdvanceOpeningDialogue, launchMainSong]
  );

  // Main Sample-Accurate Lookahead Music Sequencer & Multi-Panel Rhythm Loop
  useEffect(() => {
    let animId: number;
    const LOOKAHEAD_SEC = 0.11;

    const tick = () => {
      if (gameStateRef.current === 'playing') {
        if (
          activeTerminalCutsceneRef.current ||
          stagePhaseRef.current === 'opening_dialogue'
        ) {
          animId = requestAnimationFrame(tick);
          return;
        }

        const audioTime = soundEngine.getAudioTime();
        const lvl = levelRef.current;
        const mode = shiftModeRef.current;
        const activeTrackId = selectedTrackIdRef.current || lvl.musicTrackId || lvl.songKey;
        const bpm = getEffectiveBpm(lvl.bpm, mode);
        const secondsPerBeat = 60 / bpm;
        const halfBeatSec = secondsPerBeat * 0.5;
        const startTime = levelStartTimeRef.current;

        // Pre-Song Interactive Tutorial Warmup (`pre_song_tutorial`) loop
        if (stagePhaseRef.current === 'pre_song_tutorial') {
          if (audioTime + LOOKAHEAD_SEC >= startTime) {
            const lookaheadElapsed = Math.max(0, audioTime + LOOKAHEAD_SEC - startTime);
            const maxWarmupBar = Math.floor(lookaheadElapsed / secondsPerBeat / 7);
            const minWarmupBar = Math.max(
              0,
              Math.floor(Math.max(0, audioTime - startTime) / secondsPerBeat / 7)
            );
            const warmupPattern = lvl.phases[0]?.panels[0]?.pattern || 'straight';

            for (let wb = minWarmupBar; wb <= maxWarmupBar; wb++) {
              for (let pNum = 1; pNum <= 6; pNum++) {
                const pKey = `warmup:${wb}:${pNum}`;
                if (!firedPanelPulsesRef.current[pKey]) {
                  const pTime =
                    startTime + wb * 7 * secondsPerBeat + (pNum - 1) * secondsPerBeat;
                  if (
                    pTime <= audioTime + LOOKAHEAD_SEC &&
                    pTime >= audioTime - 0.08 &&
                    shouldPlaySyntheticPulseOverlay(Boolean(lvl.externalAudioUrl), true)
                  ) {
                    firedPanelPulsesRef.current[pKey] = true;
                    if (isPulseAudible(warmupPattern, pNum)) {
                      soundEngine.playWarmupMetronomePulse(pNum, pTime);
                    }
                  }
                }
              }
            }
          }

          if (audioTime >= startTime) {
            const elapsed = audioTime - startTime;
            const totalBeatsFloat = elapsed / secondsPerBeat;
            const beatInBarFloat = totalBeatsFloat % 7;
            const beatInBar = Math.floor(beatInBarFloat) + 1;
            beatProgressRef.current = beatInBarFloat % 1;

            const last = lastProcessedBeatRef.current;
            if (last.beat !== beatInBar) {
              lastProcessedBeatRef.current = { bar: 0, beat: beatInBar };
              setCurrentBar(0);
              setCurrentBeat(beatInBar);
            }
          }

          animId = requestAnimationFrame(tick);
          return;
        }

        // Main Song (`main_song`): True Web Audio Lookahead Scheduler for Music
        if (audioTime + LOOKAHEAD_SEC >= startTime) {
          const lookaheadElapsed = Math.max(0, audioTime + LOOKAHEAD_SEC - startTime);
          const maxBarToSchedule = Math.min(
            lvl.totalBars - 1,
            Math.floor(lookaheadElapsed / secondsPerBeat / 7)
          );
          const minBarToSchedule = Math.max(
            0,
            Math.floor(Math.max(0, audioTime - startTime) / secondsPerBeat / 7)
          );

          for (let b = minBarToSchedule; b <= maxBarToSchedule; b++) {
            const phase = getActivePhaseForBar(lvl, b);
            const section = getSongSectionForBar(
              b,
              lvl.totalBars,
              lvl.cutscenes,
              lvl.blackoutWindows
            );
            const barStartSec = startTime + b * 7 * secondsPerBeat;
            const useExternalPureMusic = Boolean(
              lvl.externalAudioUrl && soundEngine.hasLoadedExternalAudio(lvl.externalAudioUrl)
            );

            // Schedule 14 eighth-note musical substeps for bar b when using built-in procedural OST
            // (Beat 6 harmonic turnaround is woven into the song arrangement itself; NO extra playPanelPulseCue!)
            if (!useExternalPureMusic) {
              for (let s = 0; s < 14; s++) {
                const subKey = `${b}:${s}`;
                if (!scheduledSubstepsRef.current[subKey]) {
                  const subTime = barStartSec + s * halfBeatSec;
                  if (subTime <= audioTime + LOOKAHEAD_SEC && subTime >= audioTime - 0.08) {
                    scheduledSubstepsRef.current[subKey] = true;
                    if (s === 0) {
                      soundEngine.playBarChordPad(
                        activeTrackId,
                        b,
                        secondsPerBeat * 7,
                        subTime,
                        section
                      );
                    }
                    soundEngine.playMusicSubstep(
                      activeTrackId,
                      b,
                      s,
                      halfBeatSec,
                      phase.panelCount,
                      subTime,
                      section
                    );
                  }
                }
              }
            }
          }
        }

        // 2. Visual Progress & Discrete Beat Updates in Main Song (audioTime >= startTime)
        if (audioTime >= startTime) {
          const elapsed = audioTime - startTime;
          const totalBeatsFloat = elapsed / secondsPerBeat;
          const currentBarIndex = Math.floor(totalBeatsFloat / 7);
          const beatInBarFloat = totalBeatsFloat % 7;
          const beatInBar = Math.floor(beatInBarFloat) + 1;
          const subProgress = beatInBarFloat % 1;

          beatProgressRef.current = subProgress;

          const activePhase = getActivePhaseForBar(lvl, currentBarIndex);

          const last = lastProcessedBeatRef.current;
          if (last.bar !== currentBarIndex || last.beat !== beatInBar) {
            lastProcessedBeatRef.current = { bar: currentBarIndex, beat: beatInBar };
            setCurrentBar(currentBarIndex);
            setCurrentBeat(beatInBar);

            if (currentBarIndex < lvl.totalBars) {
              // Auto-expire popups after 2 bars if not cleared
              if (beatInBar === 1 && popupsRef.current.length > 0) {
                setPopups((prev) => {
                  const kept = prev.filter((p) => currentBarIndex - p.spawnBar < 2);
                  popupsRef.current = kept;
                  return kept;
                });
              }

              if (lvl.gimmicks.includes('fake_lag')) {
                if (
                  currentBarIndex >= 3 &&
                  currentBarIndex % 3 === 0 &&
                  beatInBar >= 3 &&
                  beatInBar <= 5
                ) {
                  setFakeLagActive(true);
                } else {
                  setFakeLagActive(false);
                }
              }

              const inBlackoutBar = (lvl.blackoutWindows || []).some(
                (w) => currentBarIndex >= w.startBar && currentBarIndex <= w.endBar
              );
              const isPopupLevel = lvl.gimmicks.includes('popup_hell');
              const shouldSpawnPopup =
                !inBlackoutBar &&
                beatInBar === 2 &&
                currentBarIndex >= 1 &&
                ((isPopupLevel && currentBarIndex % 2 === 1) ||
                  (mode === 'night' && currentBarIndex % 2 === 0) ||
                  (!isPopupLevel && currentBarIndex >= 2 && currentBarIndex % 3 === 2));

              if (shouldSpawnPopup) {
                soundEngine.playGlitchNoise();
                const sample =
                  SAMPLE_POPUPS[(currentBarIndex + activePhase.panelCount) % SAMPLE_POPUPS.length];
                const targetPanel =
                  activePhase.panels[currentBarIndex % activePhase.panels.length] ||
                  activePhase.panels[0];

                const newPopup: PopupAlert = {
                  id: Date.now() + Math.random(),
                  title: sample.title,
                  message: sample.message,
                  x: 50,
                  y: 72,
                  width: 300,
                  type: 'error',
                  targetPanelId: targetPanel.panelId,
                  startSlot: 4,
                  endSlot: 7,
                  spawnBar: currentBarIndex,
                };
                setPopups((prev) => {
                  const filtered = prev.filter(
                    (p) => p.targetPanelId !== targetPanel.panelId
                  );
                  const next = [...filtered.slice(-2), newPopup];
                  popupsRef.current = next;
                  return next;
                });
              }
            }

            if (currentBarIndex >= lvl.totalBars) {
              const progress = evaluateStageProgress(
                currentBarIndex,
                lvl.totalBars,
                statsRef.current.health
              );
              if (progress === 'victory') {
                const saved = saveWardRecord(lvl.id, mode, statsRef.current);
                setWardProgress(saved.progress);
                wardProgressRef.current = saved.progress;
                setIsNewRecord(saved.isNewRecord);
                setGameState('victory');
              }
            }
          }

          // Check for Missed 7th-Pulse Targets across Active Panels (current and previous bar)
          const barsToCheck = [currentBarIndex - 1, currentBarIndex].filter(
            (b) => b >= 0 && b < lvl.totalBars
          );
          for (const b of barsToCheck) {
            const phaseForBar = getActivePhaseForBar(lvl, b);
            for (const panel of phaseForBar.panels) {
              if (!panel.active) continue;
              const key = `${b}:${panel.panelId}`;
              if (!beat7ProcessedRef.current[key]) {
                const targetTime = getSongPulseTime(
                  lvl,
                  startTime,
                  bpm,
                  b,
                  7,
                  panel.pattern
                );
                if (audioTime > targetTime + 0.13) {
                  beat7ProcessedRef.current[key] = true;
                  setPanelBarJudgments((prev) => ({ ...prev, [key]: 'MISS' }));
                  soundEngine.playJudgmentFeedback('MISS');
                  setLastJudgment({
                    grade: 'MISS',
                    deltaMs: 200,
                    panelId: panel.panelId,
                  });

                  const nextStats = applyJudgmentToStats(
                    statsRef.current,
                    'MISS',
                    200,
                    false
                  );
                  statsRef.current = nextStats;
                  setStats(nextStats);
                  setHealth(nextStats.health);

                  const progress = evaluateStageProgress(
                    currentBarIndex,
                    lvl.totalBars,
                    nextStats.health
                  );
                  if (progress === 'defeat') {
                    setGameState('gameover');
                  }
                }
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Interactive Terminal Cutscene keyboard controls during song breaks
      if (activeTerminalCutsceneRef.current) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleAdvanceTerminalCutscene();
          return;
        }
        if (e.code === 'KeyS' || e.code === 'Escape') {
          e.preventDefault();
          closeTerminalCutsceneBreak();
          return;
        }
        if (e.code === 'Digit1' || e.code === 'Numpad1') {
          e.preventDefault();
          handleSelectTerminalChoice(0);
          return;
        }
        if (e.code === 'Digit2' || e.code === 'Numpad2') {
          e.preventDefault();
          handleSelectTerminalChoice(1);
          return;
        }
        return;
      }

      // Pre-Stage Story Cutscene (`opening_dialogue`) keyboard controls
      if (
        gameStateRef.current === 'playing' &&
        stagePhaseRef.current === 'opening_dialogue'
      ) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleAdvanceOpeningDialogue(false);
          return;
        }
        if (e.code === 'KeyS') {
          e.preventDefault();
          startPreSongTutorial(levelRef.current);
          return;
        }
        if (e.code === 'Escape') {
          e.preventDefault();
          launchMainSong(levelRef.current);
          return;
        }
        return;
      }

      // Pre-Song Interactive Tutorial Warmup (`pre_song_tutorial`) shortcut to skip warmup
      if (
        gameStateRef.current === 'playing' &&
        stagePhaseRef.current === 'pre_song_tutorial' &&
        e.code === 'KeyS'
      ) {
        e.preventDefault();
        launchMainSong(levelRef.current);
        return;
      }

      if (gameStateRef.current === 'title') {
        if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
          e.preventDefault();
          const idx = LEVELS.findIndex((l) => l.id === levelRef.current.id);
          const next = LEVELS[(idx + 1) % LEVELS.length];
          setSelectedLevel(next);
          return;
        }
        if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
          e.preventDefault();
          const idx = LEVELS.findIndex((l) => l.id === levelRef.current.id);
          const prev = LEVELS[(idx - 1 + LEVELS.length) % LEVELS.length];
          setSelectedLevel(prev);
          return;
        }
        if (
          e.code === 'Digit1' ||
          e.code === 'Digit2' ||
          e.code === 'Digit3' ||
          e.code === 'Digit4' ||
          e.code === 'Digit5'
        ) {
          e.preventDefault();
          const num = parseInt(e.code.replace('Digit', ''), 10) - 1;
          if (LEVELS[num]) {
            setSelectedLevel(LEVELS[num]);
          }
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        triggerDefibrillate(1);
      } else if (e.code === 'KeyJ') {
        e.preventDefault();
        triggerDefibrillate(2);
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          triggerDefibrillate(2);
        } else if (gameStateRef.current === 'title' || gameStateRef.current === 'gameover') {
          startGame();
        } else if (gameStateRef.current === 'victory') {
          handleNextLevel();
        }
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        handleOpenManualTerminalCutscene();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          pauseGame();
        } else if (gameStateRef.current === 'paused') {
          resumeGame();
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        startGame();
      }
    };

    const handleWindowBlur = () => {
      setDischargeActive(false);
      setDischargedPanelId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [
    triggerDefibrillate,
    startGame,
    pauseGame,
    resumeGame,
    toggleMute,
    handleAdvanceTerminalCutscene,
    closeTerminalCutsceneBreak,
    handleSelectTerminalChoice,
    handleOpenManualTerminalCutscene,
    handleAdvanceOpeningDialogue,
    startPreSongTutorial,
    launchMainSong,
  ]);

  const handleNextLevel = () => {
    const currentIndex = LEVELS.findIndex((l) => l.id === selectedLevel.id);
    const nextIndex = (currentIndex + 1) % LEVELS.length;
    startGame(LEVELS[nextIndex]);
  };

  const ambientTheme = getAmbientThemeState(
    selectedLevel,
    shiftMode,
    currentBar,
    health,
    forceBlackout
  );

  const ui = UI_TEXT[locale];
  const chapterMeta = getLocalizedChapterMeta(
    selectedLevel.chapterId || 'prologue',
    locale
  );
  const levelInfo = getLocalizedLevelInfo(selectedLevel, locale);
  const openingLines = getLevelOpeningDialogue(selectedLevel, locale);
  const currentOpeningLine =
    openingLines[Math.min(openingLineIndex, Math.max(0, openingLines.length - 1))];
  const dialogueUnlock = currentOpeningLine
    ? getDialogueUnlockProgress(
        lineElapsedMs,
        currentOpeningLine.text,
        FORCED_DIALOGUE_LOCK_MS
      )
    : { visibleText: '', isUnlocked: true, progress: 1 };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#050811] select-none"
      data-theme={ambientTheme.themeName}
      data-locale={locale}
    >
      <GameCanvas
        level={selectedLevel}
        shiftMode={shiftMode}
        currentBeat={currentBeat}
        currentBar={currentBar}
        beatProgress={beatProgress}
        beatProgressRef={beatProgressRef}
        countInLabel={countInLabel}
        panelBarJudgments={panelBarJudgments}
        health={health}
        combo={stats.currentCombo}
        dischargeActive={dischargeActive}
        dischargedPanelId={dischargedPanelId}
        lastJudgment={lastJudgment}
        fakeLagActive={fakeLagActive}
        forceBlackout={forceBlackout}
        forceCutscene={forceCutscene}
        forceHighCpuLoad={forceHighCpuLoad}
        activeTerminalCutscene={activeTerminalCutscene}
        terminalLineIndex={terminalLineIndex}
        selectedTerminalChoice={selectedTerminalChoice}
        onAdvanceTerminalCutscene={handleAdvanceTerminalCutscene}
        onSelectTerminalChoice={handleSelectTerminalChoice}
        onSkipTerminalCutscene={closeTerminalCutsceneBreak}
        popups={popups}
        onDismissPopup={dismissPopup}
        onCanvasClick={() => triggerDefibrillate()}
        isTitleScreen={gameState === 'title'}
        twoPlayerMode={twoPlayerMode}
        locale={locale}
      />

      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          level={selectedLevel}
          shiftMode={shiftMode}
          health={health}
          score={stats.score}
          combo={stats.currentCombo}
          maxCombo={stats.maxCombo}
          currentBeat={currentBeat}
          currentBar={currentBar}
          totalBars={selectedLevel.totalBars}
          recentDeltas={stats.recentDeltas}
          isMuted={isMuted}
          popups={popups}
          forceHighCpuLoad={forceHighCpuLoad}
          twoPlayerMode={twoPlayerMode}
          locale={locale}
          onToggleLocale={handleToggleLocale}
          onToggleMute={toggleMute}
          onPause={pauseGame}
          onRestart={() => startGame()}
          onDismissPopup={dismissPopup}
          onDefibrillate={() => triggerDefibrillate()}
          onOpenTerminalCutscene={handleOpenManualTerminalCutscene}
        />
      )}

      {/* Stage Phase 1: Chapter Opening Cutscene & Forced-Viewing Pre-Stage Dialogue (`opening_dialogue`) */}
      {gameState === 'playing' &&
        stagePhase === 'opening_dialogue' &&
        currentOpeningLine && (
          <div
            data-testid="stage-opening-dialogue"
            className="fixed inset-0 z-40 flex flex-col justify-between bg-slate-950/70 backdrop-blur-[2px] p-4 sm:p-6 pointer-events-auto"
          >
            {/* Top Chapter Narrative Card */}
            <div className="max-w-3xl w-full mx-auto bg-slate-950/95 border-2 border-cyan-500/70 p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.85)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-300 font-pixel text-[8px]">
                    {chapterMeta.code} // {chapterMeta.title}
                  </span>
                  <span className="font-pixel text-[9px] text-amber-300">
                    {selectedLevel.wardNumber} · {levelInfo.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="skip-to-warmup-btn"
                    onClick={() => startPreSongTutorial(selectedLevel)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-cyan-500/60 text-cyan-300 font-pixel text-[7px] cursor-pointer"
                  >
                    {locale === 'zh'
                      ? '跳过剧情 → 节拍预热 [S]'
                      : 'SKIP STORY → WARMUP [S]'}
                  </button>
                  <button
                    type="button"
                    data-testid="skip-to-main-song-btn"
                    onClick={() => launchMainSong(selectedLevel)}
                    className="px-2.5 py-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-pixel text-[7px] cursor-pointer"
                  >
                    {locale === 'zh'
                      ? '直接进入正曲 [ESC]'
                      : 'DIRECT TO SONG [ESC]'}
                  </button>
                </div>
              </div>
              <div className="text-[11px] font-bold text-cyan-200 mb-1">
                {chapterMeta.openingTitle}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {chapterMeta.openingBody}
              </p>
            </div>

            {/* Bottom Rhythm Doctor Style Forced-Viewing Dialogue Window */}
            <div className="max-w-3xl w-full mx-auto bg-[#07132c]/95 border-4 border-sky-400 shadow-[0_12px_40px_rgba(0,0,0,0.95)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 font-pixel text-[9px] border-2 bg-slate-950"
                    style={{
                      borderColor: currentOpeningLine.accentColor,
                      color: currentOpeningLine.accentColor,
                    }}
                  >
                    {currentOpeningLine.speaker}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    [{currentOpeningLine.role}]
                  </span>
                </div>
                <span className="font-pixel text-[8px] text-sky-300">
                  {locale === 'zh' ? '剧情强制审阅' : 'STORY BRIEFING'}{' '}
                  {openingLineIndex + 1} / {openingLines.length}
                </span>
              </div>

              <div
                data-testid="opening-dialogue-text"
                className="min-h-[56px] text-sm sm:text-base font-medium text-white leading-relaxed tracking-wide py-1"
              >
                {dialogueUnlock.visibleText}
              </div>

              {/* Forced-Viewing Progress Bar & Continue Button */}
              <div className="mt-3 pt-2.5 border-t border-sky-900/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
                  <div className="w-32 h-2 bg-slate-900 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        dialogueUnlock.isUnlocked ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.round(dialogueUnlock.progress * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="font-pixel text-[7px] text-slate-300">
                    {dialogueUnlock.isUnlocked
                      ? locale === 'zh'
                        ? '已读完 · 可按 SPACE 继续'
                        : 'READY · PRESS SPACE TO CONTINUE'
                      : ui.forcedDialogueWait}
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="advance-opening-dialogue"
                  disabled={!dialogueUnlock.isUnlocked}
                  onClick={() => handleAdvanceOpeningDialogue(false)}
                  className={`px-4 py-2 font-pixel text-[9px] border-2 transition-all ${
                    dialogueUnlock.isUnlocked
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-white cursor-pointer shadow-[0_3px_0_#020617]'
                      : 'bg-slate-900 text-slate-500 border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {openingLineIndex < openingLines.length - 1
                    ? ui.forcedDialogueReady
                    : locale === 'zh'
                    ? '[SPACE / 点击] 进入节拍预热 ▸'
                    : '[SPACE / CLICK] START WARMUP ▸'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Stage Phase 2: Pre-Song Interactive Tutorial Warmup (`pre_song_tutorial`) */}
      {gameState === 'playing' && stagePhase === 'pre_song_tutorial' && (
        <div
          data-testid="pre-song-tutorial-banner"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[94%] bg-slate-950/92 border-2 border-emerald-400 p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.9)] pointer-events-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-400 text-emerald-300 font-pixel text-[8px]">
                {ui.warmupTitle}
              </span>
              <span className="font-pixel text-[9px] text-amber-300">
                {selectedLevel.wardNumber} · {levelInfo.mechanicBadge}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                data-testid="warmup-hit-counter"
                className="px-2 py-0.5 bg-slate-900 border border-cyan-400 text-cyan-300 font-pixel text-[8px]"
              >
                {ui.warmupProgress}: {warmupHits} / {WARMUP_REQUIRED_HITS}
              </span>
              <button
                type="button"
                data-testid="skip-warmup-btn"
                onClick={() => launchMainSong(selectedLevel)}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-pixel text-[7px] border border-white cursor-pointer"
              >
                {ui.skipWarmup}
              </button>
            </div>
          </div>

          <p className="text-xs text-emerald-200 font-semibold mb-1">
            {levelInfo.tutorialGoal}
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {levelInfo.tutorialTip}
          </p>
        </div>
      )}

      {gameState === 'title' && (
        <TitleScreen
          selectedLevel={selectedLevel}
          shiftMode={shiftMode}
          selectedTrackId={selectedTrackId}
          wardProgress={wardProgress}
          twoPlayerMode={twoPlayerMode}
          locale={locale}
          onToggleLocale={handleToggleLocale}
          onToggleTwoPlayerMode={() => setTwoPlayerMode((prev) => !prev)}
          onSelectLevel={setSelectedLevel}
          onSelectShiftMode={setShiftMode}
          onSelectTrackId={setSelectedTrackId}
          onAdjustAudioOffset={handleAdjustAudioOffset}
          onStartGame={(customLvl) => startGame(customLvl || selectedLevel)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}

      {gameState === 'paused' && (
        <PauseModal
          score={stats.score}
          combo={stats.currentCombo}
          audioOffsetMs={wardProgress.audioOffsetMs}
          locale={locale}
          onAdjustAudioOffset={handleAdjustAudioOffset}
          onResume={resumeGame}
          onRestart={() => startGame()}
          onQuitToTitle={() => setGameState('title')}
        />
      )}

      {gameState === 'victory' && (
        <VictoryModal
          level={selectedLevel}
          shiftMode={shiftMode}
          stats={stats}
          isNewRecord={isNewRecord}
          locale={locale}
          onNextLevel={handleNextLevel}
          onRetry={() => startGame()}
          onQuitToTitle={() => setGameState('title')}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverModal
          level={selectedLevel}
          stats={stats}
          locale={locale}
          onRetry={() => startGame()}
          onQuitToTitle={() => setGameState('title')}
        />
      )}
    </div>
  );
}
