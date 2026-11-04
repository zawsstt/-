import React, { useEffect, useRef } from 'react';
import {
  SRE_IDLE_1,
  SRE_IDLE_2,
  SRE_DISCHARGE,
  SERVER_RACK,
  SLIME_1,
  SLIME_2,
  DEADLOCK_GHOST_1,
  DEADLOCK_GHOST_2,
  DDOS_BEAST_1,
  DDOS_BEAST_2,
  renderPixelMatrix,
  drawPixelLightning,
} from './sprites';
import {
  LevelConfig,
  JudgmentGrade,
  PanelSlotConfig,
  PopupAlert,
  ShiftMode,
  StoryCutsceneEvent,
  TerminalCutsceneBreak,
  LowHealthGlitchState,
  StageBackdropId,
  StageSpectacleState,
} from './types';
import {
  getComboMultiplier,
  getComboVisualConfig,
  getActivePhaseForBar,
  getPanelTrackProgress,
  getPatternLabel,
  computeTrackPopupBox,
  getBarCallout,
  getAmbientThemeState,
  getActiveCutsceneForBar,
  getBlackoutState,
  getLowHealthGlitchState,
  calculateCpuLoadState,
  getAsciiDataPackets,
  getSideToCenterDataStreams,
  getServerRackLedBlinkState,
  getEffectiveBpm,
  getStageBackdropForBar,
  getMutedBeatsForPanel,
  getRowLyricChant,
  getStageSpectacleState,
} from './rules';
import { Locale, getLocalizedMidSongCutscene } from './i18n';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  isSparkStreak?: boolean;
}

interface ImpactShockwave {
  x: number;
  y: number;
  color: string;
  secondaryColor: string;
  life: number;
  maxLife: number;
  isPerfect: boolean;
}

interface JudgmentFlash {
  text: string;
  subText?: string;
  color: string;
  glowColor?: string;
  fontSize?: number;
  x: number;
  y: number;
  life: number;
  maxLife?: number;
  isCombo?: boolean;
}

interface GameCanvasProps {
  level: LevelConfig;
  shiftMode?: ShiftMode;
  currentBeat: number; // 1 to 7
  currentBar: number;
  beatProgress: number; // 0.0 to 1.0 progress through current beat
  beatProgressRef?: React.MutableRefObject<number>;
  countInLabel?: string;
  panelBarJudgments?: Record<string, JudgmentGrade>;
  health: number;
  combo?: number;
  dischargeActive: boolean;
  dischargedPanelId?: number | null;
  lastJudgment: {
    grade: JudgmentGrade;
    deltaMs: number;
    panelId?: number;
    blindBonus?: boolean;
  } | null;
  fakeLagActive: boolean;
  forceBlackout?: boolean;
  forceCutscene?: boolean;
  forceHighCpuLoad?: boolean;
  activeTerminalCutscene?: TerminalCutsceneBreak | null;
  terminalLineIndex?: number;
  selectedTerminalChoice?: number | null;
  onAdvanceTerminalCutscene?: () => void;
  onSelectTerminalChoice?: (choiceIndex: number) => void;
  onSkipTerminalCutscene?: () => void;
  popups?: PopupAlert[];
  onDismissPopup?: (id: number) => void;
  onCanvasClick?: () => void;
  isTitleScreen?: boolean;
  twoPlayerMode?: boolean;
  locale?: Locale;
}

/**
 * Computes the exact canvas coordinates (crosshairX, trackY, slotsStartX, slotW, singleTrackH, trackTop)
 * of the Open-Stage Horizontal Lifeline and its Beat 7 Core Receptor (`TARGET_CROSSHAIR_PROGRESS = 6.5 / 7`)
 * for a given panel index.
 */
function getSlot7ImpactCoords(
  w: number,
  h: number,
  panelCount: number,
  panelIdx: number,
  reversed: boolean = false,
  verticalShiftPx: number = 0
): {
  crosshairX: number;
  trackY: number;
  slotsStartX: number;
  slotsTotalW: number;
  slotW: number;
  trackTop: number;
  singleTrackH: number;
} {
  const safeCount = Math.max(1, panelCount);
  const clampedIdx = Math.max(0, Math.min(safeCount - 1, panelIdx));

  const stageTop = 64;
  const stageBottom = h - 42;
  const totalStageH = stageBottom - stageTop;
  const singleTrackH = Math.floor(totalStageH / safeCount);
  const trackTop = stageTop + clampedIdx * singleTrackH;
  const rawTrackY =
    safeCount === 1
      ? Math.floor(stageTop + totalStageH * 0.64)
      : Math.floor(trackTop + singleTrackH * 0.62);
  const trackY = Math.max(
    stageTop + 44,
    Math.min(stageBottom - 32, rawTrackY + verticalShiftPx)
  );

  const slotsStartX = 168;
  const trackRight = w - 118;
  const slotsTotalW = trackRight - slotsStartX;
  const slotW = slotsTotalW / 7;

  const crosshairX = reversed
    ? Math.floor(slotsStartX + slotW * 0.5)
    : Math.floor(slotsStartX + 6 * slotW + slotW * 0.5);

  return {
    crosshairX,
    trackY,
    slotsStartX,
    slotsTotalW,
    slotW,
    trackTop,
    singleTrackH,
  };
}

/**
 * Draws a bold Pink/Magenta 'X' clock-mask marker on cloaked/skipped beat slots.
 */
function drawPinkMuteX(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number = 12
) {
  ctx.save();
  ctx.strokeStyle = '#500724';
  ctx.lineWidth = 6;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();

  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - size, cy - size);
  ctx.lineTo(cx + size, cy + size);
  ctx.moveTo(cx + size, cy - size);
  ctx.lineTo(cx - size, cy + size);
  ctx.stroke();
  ctx.restore();
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  shiftMode = 'day',
  currentBeat,
  currentBar,
  beatProgress,
  beatProgressRef,
  countInLabel = '',
  panelBarJudgments = {},
  health,
  combo = 0,
  dischargeActive,
  dischargedPanelId = null,
  lastJudgment,
  fakeLagActive,
  forceBlackout = false,
  forceCutscene = false,
  forceHighCpuLoad = false,
  activeTerminalCutscene = null,
  terminalLineIndex = 0,
  selectedTerminalChoice = null,
  onAdvanceTerminalCutscene,
  onSelectTerminalChoice,
  onSkipTerminalCutscene,
  popups = [],
  onDismissPopup,
  onCanvasClick,
  isTitleScreen = false,
  twoPlayerMode = false,
  locale = 'zh',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataStreamCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const popupHitBoxesRef = useRef<
    Array<{ id: number; x: number; y: number; w: number; h: number }>
  >([]);

  const stateRef = useRef({
    currentBeat,
    currentBar,
    beatProgress,
    beatProgressRef,
    countInLabel,
    panelBarJudgments,
    health,
    combo,
    dischargeActive,
    dischargedPanelId,
    lastJudgment,
    fakeLagActive,
    forceBlackout,
    forceCutscene,
    forceHighCpuLoad,
    activeTerminalCutscene,
    popups,
    level,
    shiftMode,
    isTitleScreen,
    twoPlayerMode,
    locale,
  });

  useEffect(() => {
    stateRef.current = {
      currentBeat,
      currentBar,
      beatProgress,
      beatProgressRef,
      countInLabel,
      panelBarJudgments,
      health,
      combo,
      dischargeActive,
      dischargedPanelId,
      lastJudgment,
      fakeLagActive,
      forceBlackout,
      forceCutscene,
      forceHighCpuLoad,
      activeTerminalCutscene,
      popups,
      level,
      shiftMode,
      isTitleScreen,
      twoPlayerMode,
      locale,
    };
  }, [
    currentBeat,
    currentBar,
    beatProgress,
    beatProgressRef,
    countInLabel,
    panelBarJudgments,
    health,
    combo,
    dischargeActive,
    dischargedPanelId,
    lastJudgment,
    fakeLagActive,
    forceBlackout,
    forceCutscene,
    forceHighCpuLoad,
    activeTerminalCutscene,
    popups,
    level,
    shiftMode,
    isTitleScreen,
    twoPlayerMode,
    locale,
  ]);

  // Fixed-capacity particle pool (320 particles for 7th-beat sparks & square pixel rings)
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: 320 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: '#4ade80',
      size: 5,
      life: 0,
      maxLife: 1,
      isSparkStreak: false,
    }))
  );

  const shockwavesRef = useRef<ImpactShockwave[]>([]);
  const judgmentPopupsRef = useRef<JudgmentFlash[]>([]);
  const shakeRef = useRef(0);
  const perfectShakeRef = useRef(0);
  const smokeTimerRef = useRef(0);
  const comboPunchRef = useRef(0);
  const prevComboRef = useRef(combo);

  const spawnParticleBurst = (
    x: number,
    y: number,
    count: number,
    colors: string[],
    speed: number,
    isSparkStreak: boolean = false
  ) => {
    const pool = particlesRef.current;
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle =
          (spawned / Math.max(1, count)) * Math.PI * 2 +
          (Math.random() - 0.5) * 0.22;
        const s = isSparkStreak
          ? (Math.random() * 0.5 + 0.65) * speed
          : (Math.random() * 0.35 + 0.8) * speed;
        p.vx = Math.cos(angle) * s;
        p.vy = Math.sin(angle) * s;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        p.size = isSparkStreak ? 4 : 5;
        p.maxLife = isSparkStreak
          ? Math.random() * 0.25 + 0.18
          : Math.random() * 0.45 + 0.35;
        p.life = p.maxLife;
        p.isSparkStreak = isSparkStreak;
        spawned++;
      }
    }
  };

  // Trigger 7th-Beat Impact Spark Bursts, Vertical Data-Bus Laser, Square Pixel Ring, and Floating Combo Text
  const prevJudgmentRef = useRef(lastJudgment);
  useEffect(() => {
    if (lastJudgment && lastJudgment !== prevJudgmentRef.current) {
      prevJudgmentRef.current = lastJudgment;

      const canvas = canvasRef.current;
      const w = canvas ? canvas.width : 960;
      const h = canvas ? canvas.height : 540;

      const phase = getActivePhaseForBar(level, currentBar);
      const panelCount = phase.panelCount;
      const panelIdx = lastJudgment.panelId ?? 0;
      const targetPanel = phase.panels[panelIdx] || phase.panels[0];
      const isReversed = Boolean(targetPanel?.reversed);

      const { crosshairX, trackY } = getSlot7ImpactCoords(
        w,
        h,
        panelCount,
        panelIdx,
        isReversed
      );

      const prevCombo = prevComboRef.current;
      prevComboRef.current = combo;

      if (lastJudgment.grade === 'PERFECT') {
        perfectShakeRef.current = 1.0;
        shakeRef.current = Math.min(shakeRef.current + 0.22, 0.8);

        // Expanding ring of discrete green/cyan pixel squares around the Slot 7 receptor
        spawnParticleBurst(
          crosshairX,
          trackY,
          40,
          ['#4ade80', '#22c55e', '#38bdf8', '#86efac'],
          4.8,
          false
        );

        // High-velocity directional spark streaks at impact point
        spawnParticleBurst(
          crosshairX,
          trackY,
          26,
          ['#ffffff', '#fde047', '#4ade80', '#38bdf8'],
          8.2,
          true
        );

        shockwavesRef.current.push({
          x: crosshairX,
          y: trackY,
          color: '#38bdf8',
          secondaryColor: '#4ade80',
          life: 0.4,
          maxLife: 0.4,
          isPerfect: true,
        });

        judgmentPopupsRef.current.push({
          text: `PERFECT! ${lastJudgment.deltaMs >= 0 ? '+' : ''}${lastJudgment.deltaMs.toFixed(0)}ms`,
          subText: lastJudgment.blindBonus ? '+150 BLIND OBSTRUCTION SHATTER!' : undefined,
          color: '#4ade80',
          fontSize: 12,
          x: crosshairX - (isReversed ? -60 : 60),
          y: trackY - 26,
          life: 0.95,
          maxLife: 0.95,
        });
      } else if (lastJudgment.grade === 'GOOD') {
        shakeRef.current = Math.min(shakeRef.current + 0.16, 0.7);
        spawnParticleBurst(
          crosshairX,
          trackY,
          28,
          ['#4ade80', '#fde047', '#f59e0b'],
          4.2,
          false
        );

        shockwavesRef.current.push({
          x: crosshairX,
          y: trackY,
          color: '#fde047',
          secondaryColor: '#4ade80',
          life: 0.3,
          maxLife: 0.3,
          isPerfect: false,
        });

        judgmentPopupsRef.current.push({
          text: `GOOD ${lastJudgment.deltaMs >= 0 ? '+' : ''}${lastJudgment.deltaMs.toFixed(0)}ms`,
          subText: lastJudgment.blindBonus ? '+150 BLIND OBSTRUCTION SHATTER!' : undefined,
          color: '#fde047',
          fontSize: 12,
          x: crosshairX - (isReversed ? -60 : 60),
          y: trackY - 26,
          life: 0.95,
          maxLife: 0.95,
        });
      } else {
        shakeRef.current = Math.min(shakeRef.current + 0.6, 1.0);
        spawnParticleBurst(
          crosshairX,
          trackY,
          24,
          ['#ef4444', '#b91c1c', '#f87171'],
          5.0,
          false
        );
        judgmentPopupsRef.current.push({
          text: '502 BAD GATEWAY [MISS]',
          color: '#ef4444',
          fontSize: 12,
          x: crosshairX - (isReversed ? -60 : 60),
          y: trackY - 26,
          life: 0.95,
          maxLife: 0.95,
        });

        if (prevCombo >= 2) {
          judgmentPopupsRef.current.push({
            text: `COMBO x${prevCombo} DROPPED!`,
            subText: 'MULTIPLIER RESET 1.0x',
            color: '#ef4444',
            glowColor: '#ef4444',
            fontSize: 14,
            x: w * 0.5,
            y: h * 0.24,
            life: 1.15,
            maxLife: 1.15,
            isCombo: true,
          });
        }
      }

      if ((lastJudgment.grade === 'PERFECT' || lastJudgment.grade === 'GOOD') && combo >= 1) {
        const comboVis = getComboVisualConfig(combo);
        comboPunchRef.current = 1.0;

        judgmentPopupsRef.current = judgmentPopupsRef.current.filter((p) => !p.isCombo);

        judgmentPopupsRef.current.push({
          text: `${combo}x COMBO!`,
          subText: `${comboVis.multiplier.toFixed(1)}x ${comboVis.tierLabel}`,
          color: comboVis.color,
          glowColor: comboVis.glowColor,
          fontSize: comboVis.fontSize,
          x: w * 0.5,
          y: h * 0.24,
          life: 1.2,
          maxLife: 1.2,
          isCombo: true,
        });
      }
    }
  }, [lastJudgment, combo, level, currentBar]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let lastTime = performance.now();
    let fakeLagCounter = 0;

    const render = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (stateRef.current.fakeLagActive) {
          fakeLagCounter += dt;
          if (fakeLagCounter % 0.35 < 0.12) {
            animId = requestAnimationFrame(render);
            return;
          }
        }

        drawScene(ctx, canvas, dt, time);
      }

      const streamCanvas = dataStreamCanvasRef.current;
      const streamCtx = streamCanvas?.getContext('2d');
      if (streamCanvas && streamCtx) {
        const beatProg = stateRef.current.beatProgressRef
          ? stateRef.current.beatProgressRef.current
          : stateRef.current.beatProgress;
        const effectiveBpm = getEffectiveBpm(
          stateRef.current.level.bpm,
          stateRef.current.shiftMode
        );
        const beatMult = getComboMultiplier(stateRef.current.combo);
        drawSideToCenterDataStreamLayer(
          streamCtx,
          streamCanvas.width,
          streamCanvas.height,
          time,
          effectiveBpm,
          beatProg,
          beatMult
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  /**
   * Dedicated CRT-glow 'data-stream' canvas layer renderer:
   * Draws low-opacity phosphor data-stream lines flowing inward from both left (x = 0)
   * and right (x = w) edges toward the horizontal center (x = w / 2) at the rhythm of the BPM,
   * varying in speed based on the current beat/combo multiplier.
   */
  const drawSideToCenterDataStreamLayer = (
    streamCtx: CanvasRenderingContext2D,
    w: number,
    h: number,
    timeMs: number,
    effectiveBpm: number,
    beatProg: number,
    beatMultiplier: number
  ) => {
    streamCtx.clearRect(0, 0, w, h);
    const streams = getSideToCenterDataStreams(
      timeMs,
      effectiveBpm,
      beatProg,
      beatMultiplier,
      w,
      h
    );

    streamCtx.save();
    for (let i = 0; i < streams.length; i++) {
      const seg = streams[i];
      const leftX = Math.min(seg.startX, seg.endX);
      const segW = Math.max(4, Math.abs(seg.endX - seg.startX));

      // Outer low-opacity CRT phosphor glow pass
      streamCtx.fillStyle = `rgba(${seg.colorRgb}, ${seg.glowAlpha})`;
      streamCtx.fillRect(leftX - 2, seg.y - 2, segW + 4, 5);

      // Crisp inner CRT scanline data-stream core
      streamCtx.fillStyle = `rgba(${seg.colorRgb}, ${seg.coreAlpha})`;
      streamCtx.fillRect(leftX, seg.y, segW, 1.5);

      // Leading inward-flowing packet head node
      const headX = seg.side === 'left' ? seg.endX - 3 : seg.endX;
      streamCtx.fillStyle = `rgba(226, 232, 240, ${Math.min(0.48, seg.coreAlpha + 0.08).toFixed(3)})`;
      streamCtx.fillRect(headX, seg.y - 0.5, 3, 2.5);
    }
    streamCtx.restore();
  };

  const drawScene = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    dt: number,
    timeMs: number
  ) => {
    const {
      currentBeat,
      currentBar,
      beatProgress: propBeatProgress,
      beatProgressRef: refBeatProgress,
      health,
      combo,
      dischargeActive,
      dischargedPanelId,
      level,
      shiftMode,
      forceBlackout,
      forceCutscene,
      forceHighCpuLoad: isForceCpuLoad,
      isTitleScreen,
    } = stateRef.current;
    const beatProgress = refBeatProgress ? refBeatProgress.current : propBeatProgress;
    const beatInBarFloat = Math.max(0, (currentBeat - 1) + beatProgress);

    const w = canvas.width;
    const h = canvas.height;

    getAmbientThemeState(level, shiftMode, currentBar, health, forceBlackout);
    const blackoutState = getBlackoutState(
      level,
      currentBar,
      beatInBarFloat,
      forceBlackout
    );
    const activeCutscene = getLocalizedMidSongCutscene(
      level,
      currentBar,
      stateRef.current.locale || 'zh',
      forceCutscene
    );
    const cpuLoadState = calculateCpuLoadState(
      level,
      shiftMode,
      currentBar,
      currentBeat,
      stateRef.current.popups?.length ?? 0,
      isForceCpuLoad
    );
    const glitchState = getLowHealthGlitchState(
      health,
      Math.random(),
      Math.random(),
      cpuLoadState.loadPercent
    );

    ctx.save();

    // Screen Shake & Low-Health (<20%) Glitch Offset
    let totalOffsetX = 0;
    let totalOffsetY = 0;
    if (shakeRef.current > 0.001) {
      const shakeAmt = Math.pow(shakeRef.current, 2) * 12;
      totalOffsetX += (Math.random() - 0.5) * shakeAmt;
      totalOffsetY += (Math.random() - 0.5) * shakeAmt;
      shakeRef.current = Math.max(0, shakeRef.current - dt * 2.4);
    }
    if (perfectShakeRef.current > 0.001) {
      const pAmt = perfectShakeRef.current * 5.0;
      totalOffsetX += Math.sin(timeMs * 0.14) * pAmt;
      totalOffsetY += Math.cos(timeMs * 0.19) * pAmt * 0.85;
      perfectShakeRef.current = Math.max(0, perfectShakeRef.current - dt * 7.5);
    }
    if (glitchState.isGlitching) {
      totalOffsetX += glitchState.offsetX;
      totalOffsetY += glitchState.offsetY;
    }
    if (totalOffsetX !== 0 || totalOffsetY !== 0) {
      ctx.translate(totalOffsetX, totalOffsetY);
    }

    const activePhase = getActivePhaseForBar(level, currentBar);
    const panels = activePhase.panels;
    const stageBackdrop: StageBackdropId = isTitleScreen
      ? level.stageBackdrop || 'er_ward'
      : getStageBackdropForBar(level, currentBar);
    const spectacleState = getStageSpectacleState(
      level,
      currentBar,
      currentBeat,
      beatProgress
    );

    if (!isTitleScreen && spectacleState.vhsWaveAmplitudePx > 0) {
      const waveShiftX = Math.round(
        Math.sin(timeMs * 0.011 + currentBar * 1.7) * spectacleState.vhsWaveAmplitudePx
      );
      ctx.translate(waveShiftX, 0);
    }

    // 1. Render Base Data Center / Server Room Backdrop
    drawServerRoomBackdrop(
      ctx,
      w,
      h,
      stageBackdrop,
      isTitleScreen,
      level,
      beatProgress,
      cpuLoadState.loadPercent,
      timeMs,
      dt
    );

    // 2. Active Gameplay: Render Full-Bleed Open-Stage Server Room + Horizontal Lifeline + Stage Spectacles
    if (!isTitleScreen) {
      drawServerRackBays(
        ctx,
        w,
        h,
        panels,
        stageBackdrop,
        beatInBarFloat,
        health,
        dischargeActive,
        dischargedPanelId,
        spectacleState,
        timeMs,
        dt
      );

      drawMultiPanelOscilloscopeTracks(
        ctx,
        w,
        h,
        level,
        panels,
        currentBar,
        currentBeat,
        beatInBarFloat,
        dischargeActive,
        dischargedPanelId,
        spectacleState,
        timeMs
      );

      if (!activeCutscene) {
        drawPhaseCalloutStrip(
          ctx,
          w,
          h,
          level,
          currentBar,
          currentBeat,
          (stateRef.current.popups?.length ?? 0) > 0,
          blackoutState.isBlackout
        );
      }

      drawStageSpectacleOverlay(
        ctx,
        w,
        h,
        level,
        spectacleState,
        currentBar,
        currentBeat,
        beatProgress,
        timeMs
      );
    }

    // 3. Render 7th-Beat Vertical Data-Bus Laser Beam & Expanding Square Pixel Rings
    const waves = shockwavesRef.current;
    for (let i = waves.length - 1; i >= 0; i--) {
      const sw = waves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        waves.splice(i, 1);
      } else {
        const prog = 1 - sw.life / sw.maxLife;
        const alpha = Math.max(0, sw.life / sw.maxLife);

        ctx.save();
        // Full-Screen Vertical Translucent Cyan Data-Bus Laser slicing through the Beat 7 Core Receptor
        const beamWidth = Math.max(12, Math.floor((1 - prog * 0.42) * 64));
        ctx.fillStyle = `rgba(56, 189, 248, ${(alpha * 0.42).toFixed(3)})`;
        ctx.fillRect(Math.floor(sw.x - beamWidth / 2), 0, beamWidth, h);

        const coreWidth = Math.max(4, Math.floor(beamWidth * 0.36));
        ctx.fillStyle = `rgba(224, 242, 254, ${(alpha * 0.78).toFixed(3)})`;
        ctx.fillRect(Math.floor(sw.x - coreWidth / 2), 0, coreWidth, h);

        // Expanding Ring of Discrete Green/Cyan Pixel Squares around the Beat 7 Core Receptor
        const ringRadius = 18 + prog * 112;
        const squareCount = 32;
        ctx.fillStyle = sw.isPerfect ? '#4ade80' : '#fde047';
        for (let k = 0; k < squareCount; k++) {
          const ang = (k / squareCount) * Math.PI * 2 + prog * 0.85;
          const jitterR = ringRadius + ((k % 3) - 1) * 6;
          const px = Math.floor(sw.x + Math.cos(ang) * jitterR);
          const py = Math.floor(sw.y + Math.sin(ang) * jitterR);
          ctx.fillRect(px - 3, py - 3, 6, 6);
        }
        ctx.restore();
      }
    }

    // 4. Render Particles & Directional Spark Streaks
    const pool = particlesRef.current;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          const alpha = p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
          ctx.restore();
        }
      }
    }

    // 5. SUDDEN SERVER ROOM POWER BLACKOUT / BLIND-BEAT OVERLAY
    if (!isTitleScreen && (blackoutState.isBlackout || blackoutState.isLightsBackFlash)) {
      drawBlackoutOverlay(
        ctx,
        w,
        h,
        blackoutState,
        currentBeat,
        beatProgress,
        timeMs
      );
    }

    // 6. TOP GLOSSY SRE COMM-LINK CUTSCENE BANNER WITH ENGINEER PORTRAIT POPPING OUT
    const showFullCutsceneBox =
      !isTitleScreen &&
      activeCutscene &&
      !stateRef.current.activeTerminalCutscene &&
      (forceCutscene ||
        currentBar === activeCutscene.startBar ||
        (currentBar === activeCutscene.startBar + 1 && currentBeat <= 4));

    if (showFullCutsceneBox && activeCutscene) {
      drawStoryCutsceneOverlay(ctx, w, activeCutscene, timeMs);
    } else if (!isTitleScreen && activeCutscene && !stateRef.current.activeTerminalCutscene) {
      // Compact 1-line subtitle strip after the initial cutscene bar so the stage breathes
      drawPhaseCalloutStrip(
        ctx,
        w,
        h,
        level,
        currentBar,
        currentBeat,
        (stateRef.current.popups?.length ?? 0) > 0,
        blackoutState.isBlackout
      );
    }

    // 7. Pre-Song Count-In Banner (centered cleanly above the lifeline, never colliding with top box)
    const activeCountIn = stateRef.current.countInLabel;
    if (!isTitleScreen && activeCountIn) {
      const countInY = showFullCutsceneBox ? 136 : 98;
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
      ctx.fillRect(Math.floor(w * 0.5 - 180), countInY, 360, 26);
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.floor(w * 0.5 - 180), countInY, 360, 26);
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.fillText(`─⋀⋁─ ${activeCountIn}`, Math.floor(w * 0.5), countInY + 17);
      ctx.restore();
    }

    if (comboPunchRef.current > 0) {
      comboPunchRef.current = Math.max(0, comboPunchRef.current - dt * 3.5);
    }
    const hasActiveComboPopup = judgmentPopupsRef.current.some((p) => p.isCombo);
    if (!isTitleScreen && combo >= 1 && !hasActiveComboPopup && !activeCutscene) {
      const comboVis = getComboVisualConfig(combo);
      const bobY = Math.sin(timeMs / 180) * 2.5;
      const beatPulse = (1 - beatProgress) * 0.08;
      const punch = comboPunchRef.current * 0.32;
      const liveScale = 1 + beatPulse + punch;
      const badgeX = w * 0.5;
      const badgeY = 92 + bobY;

      ctx.save();
      ctx.translate(badgeX, badgeY);
      ctx.scale(liveScale, liveScale);
      ctx.textAlign = 'center';
      ctx.font = `${comboVis.fontSize}px "Press Start 2P", monospace`;
      ctx.fillStyle = comboVis.color;
      ctx.shadowColor = comboVis.glowColor;
      ctx.shadowBlur = 12 + comboPunchRef.current * 8;
      ctx.fillText(`${combo}x COMBO`, 0, 0);

      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowBlur = 6;
      ctx.fillText(
        `[${comboVis.multiplier.toFixed(1)}x ${comboVis.tierLabel}]`,
        0,
        14
      );
      ctx.restore();
    }

    // 8. Render Floating Judgment & Combo Text Popups
    const popups = judgmentPopupsRef.current;
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      const decayRate = pop.isCombo ? 1.15 : 1.5;
      pop.life -= dt * decayRate;
      if (pop.life <= 0) {
        popups.splice(i, 1);
      } else {
        const maxLife = pop.maxLife ?? 1.0;
        const progress = 1 - pop.life / maxLife;
        const fontSize = pop.fontSize ?? 13;
        const popScale = pop.isCombo
          ? progress < 0.18
            ? 0.75 + (progress / 0.18) * 0.55
            : Math.max(1.0, 1.3 - (progress - 0.18) * 0.35)
          : 1.0;
        const floatOffset = pop.isCombo ? progress * 34 : progress * 24;

        ctx.save();
        ctx.globalAlpha = Math.min(1.0, pop.life * 1.25);
        ctx.translate(pop.x, pop.y - floatOffset);
        ctx.scale(popScale, popScale);
        ctx.font = `${fontSize}px "Press Start 2P", monospace`;
        ctx.fillStyle = pop.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = pop.glowColor || pop.color;
        ctx.shadowBlur = pop.isCombo ? 14 : 8;
        ctx.fillText(pop.text, 0, 0);

        if (pop.subText) {
          ctx.font = `${Math.max(8, Math.floor(fontSize * 0.45))}px "Press Start 2P", monospace`;
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 6;
          ctx.fillText(pop.subText, 0, Math.floor(fontSize * 0.75) + 6);
        }
        ctx.restore();
      }
    }

    // 8.5 Render "The Finger Engineer" Reaching Arm & Resonance Maintenance Button at bottom-center
    if (!isTitleScreen) {
      drawFingerEngineerHandAndButton(
        ctx,
        w,
        h,
        dischargeActive,
        beatProgress,
        Boolean(stateRef.current.twoPlayerMode),
        timeMs
      );
    }

    ctx.restore();

    // 9. Low-Health (<20%) Viewport Glitch Slice Displacement (geometric only, no colour tint overlay)
    if (glitchState.isGlitching) {
      drawLowHealthGlitchOverlay(ctx, canvas, w, h, glitchState, health, timeMs);
    }
  };

  /**
   * Renders "The Finger Engineer" — the night-shift engineer's blue-sleeved reaching arm,
   * pixel-art hand, Resonance Maintenance Instrument button, and a bright yellow pixel
   * press-spark burst whenever the key is struck on the 7th beat!
   */
  const drawFingerEngineerHandAndButton = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    isPressed: boolean,
    beatProg: number,
    isTwoPlayer: boolean,
    timeMs: number = 0
  ) => {
    ctx.save();
    const btnX = Math.floor(w * 0.38);
    const baseY = h - 4;
    const pressOffset = isPressed ? 5 : 0;
    const beatHover = Math.round(Math.sin(beatProg * Math.PI * 2) * 2);

    // 1. Resonance Maintenance Button Pedestal & Cap
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(btnX - 28, baseY - 12, 56, 12);
    ctx.strokeStyle = isPressed ? '#4ade80' : '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX - 28, baseY - 12, 56, 12);

    // Red/Green Resonance Plunger Cap
    ctx.fillStyle = isPressed ? '#4ade80' : '#ef4444';
    ctx.fillRect(btnX - 17, baseY - 19 + pressOffset, 34, 8);
    ctx.fillStyle = isPressed ? '#bbf7d0' : '#fca5a5';
    ctx.fillRect(btnX - 12, baseY - 18 + pressOffset, 24, 2);

    // Yellow/Cyan Pixel Press-Spark ('✨') when key is pressed
    if (isPressed) {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(btnX - 28, baseY - 24, 5, 5);
      ctx.fillRect(btnX + 22, baseY - 25, 5, 5);
      ctx.fillRect(btnX - 4, baseY - 32, 6, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(btnX - 20, baseY - 30, 4, 4);
      ctx.fillRect(btnX + 16, baseY - 30, 4, 4);
    }

    // 2. Reaching Blue Work-Uniform Sleeve & Hand from the right edge toward the Resonance Button
    const handY = baseY - 26 + pressOffset + (isPressed ? 2 : beatHover);
    const handLeft = btnX - 6;
    const sleeveStart = handLeft + 56;
    const sleeveEnd = w;

    // Dark outline around sleeve & hand for crisp pixel-art contrast over any stage
    ctx.fillStyle = '#020617';
    ctx.fillRect(sleeveStart - 8, handY, Math.max(80, sleeveEnd - sleeveStart + 8), 20);

    // Blue anti-static engineer sleeve
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(sleeveStart, handY + 2, Math.max(80, sleeveEnd - sleeveStart), 16);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(sleeveStart, handY + 3, Math.max(80, sleeveEnd - sleeveStart), 6);
    // Cuff folds
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(sleeveStart - 6, handY + 1, 9, 18);
    ctx.fillRect(sleeveStart + 18, handY + 2, 3, 15);
    ctx.fillRect(sleeveStart + 92, handY + 3, 3, 14);

    // Pixel-art hand & index finger poised over the Resonance Maintenance Button
    ctx.fillStyle = '#fed7aa';
    // Palm & wrist
    ctx.fillRect(handLeft + 18, handY + 3, 34, 13);
    // Extended index finger reaching over the button cap
    ctx.fillRect(handLeft - 12, handY + 2, 30, 7);
    // Thumb tucked underneath
    ctx.fillRect(handLeft + 6, handY + 11, 15, 6);
    // Highlight on finger
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(handLeft - 10, handY + 2, 26, 2);

    // Subtle label badge on sleeve
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = isPressed ? '#fde047' : '#bae6fd';
    ctx.textAlign = 'left';
    const pulseDot = Math.floor(timeMs / 300) % 2 === 0 ? '●' : '○';
    ctx.fillText(
      isTwoPlayer
        ? `${pulseDot} RESONANCE INSTRUMENT [P1:SPACE | P2:J/ENTER]`
        : `${pulseDot} THE FINGER ENGINEER · PRESS [SPACE] ON BEAT 7`,
      sleeveStart + 14,
      handY + 13
    );
    ctx.restore();
  };

  /**
   * Renders the Richly Illustrated Pixel-Art Server Room / Data Center Environment:
   * - On Title Screen (`isTitle=true`): Full-viewport Cold-Aisle Data Center Hall with raised
   *   perforated anti-static floor tiles, background 42U server cabinets with blinking LEDs,
   *   overhead yellow fiber-optic cable trays, wall-mounted Grafana/Prometheus NOC screens,
   *   and a volumetric spotlight illuminating the On-Call SRE Engineer, 42U Server Rack, and Fault Daemon.
   * - During Gameplay (`isTitle=false`): Deep slate chassis background (`#050811`) with subtle
   *   data-center structural framing around the Top Server Rack Bays and Bottom Oscilloscope Bus.
   */
  const drawServerRoomBackdrop = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    backdrop: StageBackdropId,
    isTitle: boolean,
    lvl: LevelConfig,
    beatProg: number,
    cpuLoadPercent: number,
    timeMs: number,
    dt: number
  ) => {
    ctx.save();

    // Base dark data-center chassis fill
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);

    // BPM-synchronized pulse & scroll velocity (no heavy color overlay)
    const effectiveBpm = getEffectiveBpm(lvl.bpm, stateRef.current.shiftMode);
    const bpmHz = effectiveBpm / 60;
    const bpmPulse = Math.pow(Math.max(0, 1 - beatProg), 2);
    const scrollOffset = (timeMs * 0.055 * bpmHz) % 18;

    if (!isTitle) {
      // Subtle structural rack rails on left/right margins during gameplay with procedural CPU-Load-driven blinking LEDs
      ctx.fillStyle = '#0a101f';
      ctx.fillRect(0, 0, 28, h);
      ctx.fillRect(w - 28, 0, 28, h);

      for (let idx = 0, ry = 12; ry < h - 12; ry += 18, idx++) {
        // Static rack cage-nut slot
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(5, ry, 5, 4);
        ctx.fillRect(w - 10, ry, 5, 4);

        // Procedurally generated blinking pattern on left & right server rack status LEDs oscillating with CPU Load
        const ledY = Math.floor(14 + ((ry + scrollOffset * 3.2) % (h - 28)));
        const leftLed = getServerRackLedBlinkState(
          0,
          idx,
          timeMs,
          cpuLoadPercent,
          bpmPulse
        );
        const rightLed = getServerRackLedBlinkState(
          1,
          idx,
          timeMs,
          cpuLoadPercent,
          bpmPulse
        );

        ctx.fillStyle = `rgba(${leftLed.rgb}, ${leftLed.alpha})`;
        const leftW = leftLed.isOn && bpmPulse > 0.35 ? 8 : 6;
        ctx.fillRect(14, ledY, leftW, 3);

        ctx.fillStyle = `rgba(${rightLed.rgb}, ${rightLed.alpha})`;
        const rightW = rightLed.isOn && bpmPulse > 0.35 ? 8 : 6;
        ctx.fillRect(w - 14 - rightW, ledY, rightW, 3);
      }

      // Subtle Moving BPM-Pulsing Data-Stream Lines along the horizontal chassis conduits (y = 61 & y = 288)
      const streamConduits = [61, 288];
      for (let cIdx = 0; cIdx < streamConduits.length; cIdx++) {
        const cy = streamConduits[cIdx];
        ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
        ctx.fillRect(36, cy, w - 72, 2);

        const packetCount = 8;
        const spanW = w - 72;
        for (let p = 0; p < packetCount; p++) {
          const dir = cIdx % 2 === 0 ? 1 : -1;
          const rawX =
            ((p * (spanW / packetCount) +
              dir * timeMs * 0.14 * bpmHz) %
              spanW +
              spanW) %
            spanW;
          const px = Math.floor(36 + rawX);
          const segW = Math.floor(14 + bpmPulse * 14);
          ctx.fillStyle =
            p % 2 === 0
              ? `rgba(56, 189, 248, ${(0.32 + bpmPulse * 0.48).toFixed(2)})`
              : `rgba(34, 197, 94, ${(0.28 + bpmPulse * 0.45).toFixed(2)})`;
          ctx.fillRect(px, cy, Math.min(segW, 36 + spanW - px), 2);
        }
      }

      ctx.restore();
      return;
    }

    // TITLE SCREEN SHOWCASE: Full-Viewport Illuminated Cold-Aisle Server Room Bay
    const floorStartY = Math.floor(h * 0.56);

    // 1. Server Room Insulated Acoustic Upper Wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, floorStartY);
    wallGrad.addColorStop(0, '#090f1d');
    wallGrad.addColorStop(0.35, '#111c33');
    wallGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, floorStartY);

    // Subtle Vertical Data-Stream Lines on Rear Data Center Wall pulsing with BPM
    for (let vx = 44; vx < w; vx += 84) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.fillRect(vx, 92, 1, floorStartY - 92);
      const streamY =
        92 + ((timeMs * 0.08 * bpmHz + vx * 1.7) % Math.max(10, floorStartY - 110));
      ctx.fillStyle = `rgba(56, 189, 248, ${(0.25 + bpmPulse * 0.45).toFixed(2)})`;
      ctx.fillRect(vx, Math.floor(streamY), 2, Math.floor(12 + bpmPulse * 8));
    }

    // 2. Overhead Yellow Fiber-Optic Cable Tray & Chilled-Air Ductwork
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 62, w, 26);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 84, w, 5);
    ctx.fillStyle = '#ca8a04';
    for (let cx = 12; cx < w; cx += 48) {
      ctx.fillRect(cx, 66, 32, 14);
    }
    // Overhead fiber trunk conduits with moving BPM data-stream pulses & scrolling ASCII data packets
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 91, w, 2);
    for (let p = 0; p < 10; p++) {
      const px = Math.floor(((p * 96 + timeMs * 0.16 * bpmHz) % w));
      ctx.fillStyle = `rgba(56, 189, 248, ${(0.45 + bpmPulse * 0.5).toFixed(2)})`;
      ctx.fillRect(px, 91, Math.floor(18 + bpmPulse * 12), 2);
    }

    // Subtle animated ASCII-style data packets scrolling at the rhythm of the current BPM
    const backdropAsciiPackets = getAsciiDataPackets(
      timeMs,
      effectiveBpm,
      beatProg,
      w,
      [78, 104]
    );
    ctx.save();
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    for (const pkt of backdropAsciiPackets) {
      ctx.fillStyle = pkt.isBeatHighlighted
        ? `rgba(74, 222, 128, ${pkt.alpha})`
        : `rgba(56, 189, 248, ${pkt.alpha})`;
      ctx.fillText(pkt.label, pkt.x, pkt.y);
    }
    ctx.restore();

    // 3. Background Row of 42U Server Cabinets (Left & Right of Central Security Airlock)
    const rackPositions = [52, 136, 220, 656, 740, 824];
    const activeCascadeSlot = Math.floor((timeMs * bpmHz) / 140) % 9;
    for (let rIdx = 0; rIdx < rackPositions.length; rIdx++) {
      const rx = rackPositions[rIdx];
      const ry = floorStartY - 168;
      const rw = 74;
      const rh = 168;

      // 42U Cabinet Outer Frame
      ctx.fillStyle = '#090d16';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(rx, ry, rw, rh);

      // Blade Server Chassis Slots & Procedurally Blinking CPU-Load Status LEDs
      for (let slot = 0; slot < 9; slot++) {
        const sy = ry + 10 + slot * 17;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx + 6, sy, rw - 12, 12);

        const isCascadeActive = (slot + rIdx) % 9 === activeCascadeSlot;
        const ledBlink = getServerRackLedBlinkState(
          rIdx + 2,
          slot,
          timeMs,
          cpuLoadPercent,
          bpmPulse
        );
        ctx.fillStyle = isCascadeActive
          ? '#fde047'
          : ledBlink.isOn
          ? ledBlink.color
          : '#0f172a';
        const ledSize = isCascadeActive && bpmPulse > 0.3 ? 5 : 4;
        ctx.fillRect(rx + 10, sy + 4, ledSize, 4);
        ctx.fillStyle = ledBlink.isOn
          ? `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`
          : '#0f172a';
        ctx.fillRect(rx + 18, sy + 4, 4, 4);

        // Drive bay ventilation slits with scrolling right-rail status tick
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx + 28, sy + 3, 34, 6);
        if (isCascadeActive || ledBlink.isOn) {
          ctx.fillStyle = `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`;
          ctx.fillRect(rx + 56, sy + 4, 6, 4);
        }
      }
    }

    // 4. Central Data Center Security Airlock Double Doors + Digital Status Sign
    const doorX = 385;
    const doorW = 190;
    const doorH = 158;
    const doorY = floorStartY - doorH;

    // Digital Status Header above Airlock
    ctx.fillStyle = '#020617';
    ctx.fillRect(doorX + 20, doorY - 30, 150, 24);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(doorX + 20, doorY - 30, 150, 24);
    ctx.fillStyle = '#4ade80';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DC-BAY // 200 OK', doorX + 95, doorY - 14);

    // Armored Sliding Airlock Doors
    ctx.fillStyle = '#334155';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(doorX + 6, doorY + 6, doorW / 2 - 8, doorH - 6);
    ctx.fillRect(doorX + doorW / 2 + 2, doorY + 6, doorW / 2 - 8, doorH - 6);
    // Reinforced glass inspection windows
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(doorX + 22, doorY + 24, 52, 48);
    ctx.fillRect(doorX + doorW / 2 + 18, doorY + 24, 52, 48);
    // Yellow/Black hazard stripe along bottom of airlock door
    ctx.fillStyle = '#eab308';
    ctx.fillRect(doorX + 6, doorY + doorH - 14, doorW - 12, 8);

    // 5. Wall-Mounted NOC Grafana/Prometheus Telemetry Display (Left of Airlock)
    ctx.fillStyle = '#020617';
    ctx.fillRect(306, floorStartY - 142, 68, 48);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(306, floorStartY - 142, 68, 48);
    // Live waveform on NOC screen
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(312, floorStartY - 114);
    ctx.lineTo(326, floorStartY - 128);
    ctx.lineTo(338, floorStartY - 106);
    ctx.lineTo(352, floorStartY - 130);
    ctx.lineTo(368, floorStartY - 114);
    ctx.stroke();

    // 6. Raised Anti-Static Data Center Floor Tiles with Perforated Cold-Aisle Vents
    const floorGrad = ctx.createLinearGradient(0, floorStartY, 0, h);
    floorGrad.addColorStop(0, '#0f172a');
    floorGrad.addColorStop(0.5, '#1e293b');
    floorGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorStartY, w, h - floorStartY);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    for (let y = floorStartY; y <= h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = -120; x <= w + 120; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, floorStartY);
      ctx.lineTo(x + (x - w * 0.5) * 0.42, h);
      ctx.stroke();
    }

    // Sub-floor Chilled Cyan Airflow Grates along the cold aisle
    for (let gx = 160; gx < w - 160; gx += 110) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fillRect(gx, floorStartY + 18, 64, 14);
    }

    // 7. Center-Stage Spotlight Cone on the Active Server Rack, SRE Engineer, and Daemon
    const spotCenterX = Math.floor(w * 0.5);
    const stageFloorY = floorStartY + 54;
    const bounceY = Math.round(Math.max(0, 1 - beatProg * 1.6) * 4);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.13)';
    ctx.beginPath();
    ctx.moveTo(spotCenterX - 90, 88);
    ctx.lineTo(spotCenterX + 90, 88);
    ctx.lineTo(spotCenterX + 230, h);
    ctx.lineTo(spotCenterX - 230, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(spotCenterX - 42, 88);
    ctx.lineTo(spotCenterX + 42, 88);
    ctx.lineTo(spotCenterX + 120, h);
    ctx.lineTo(spotCenterX - 120, h);
    ctx.closePath();
    ctx.fill();

    // Shadows on the raised floor tiles
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(spotCenterX - 155, stageFloorY + 26, 68, 10);
    ctx.fillRect(spotCenterX - 36, stageFloorY + 28, 72, 12);
    ctx.fillRect(spotCenterX + 88, stageFloorY + 26, 68, 10);

    const isFrame1 = Math.floor(timeMs / 380) % 2 === 0;
    const bossType = lvl.phases[0]?.panels[0]?.bossType || 'heap_leak';
    const bossMatrix =
      bossType === 'heap_leak'
        ? isFrame1
          ? SLIME_1
          : SLIME_2
        : bossType === 'deadlock_ghost'
        ? isFrame1
          ? DEADLOCK_GHOST_1
          : DEADLOCK_GHOST_2
        : isFrame1
        ? DDOS_BEAST_1
        : DDOS_BEAST_2;

    // Coiled Cyan Fiber-Optic Patch Cable connecting SRE Engineer to the 42U Server Rack
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(spotCenterX - 96, stageFloorY - 2);
    ctx.bezierCurveTo(
      spotCenterX - 70,
      stageFloorY + 18,
      spotCenterX - 50,
      stageFloorY + 14,
      spotCenterX - 28,
      stageFloorY - 8
    );
    ctx.stroke();

    // Animated Data Packet traveling along the Fiber Patch Cable
    const pktT = (timeMs % 600) / 600;
    const pktX = Math.floor(spotCenterX - 96 + pktT * 68);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(pktX, stageFloorY + 6, 6, 4);

    // On-Call SRE Engineer (Left of Center Rack)
    renderPixelMatrix(
      ctx,
      isFrame1 ? SRE_IDLE_1 : SRE_IDLE_2,
      spotCenterX - 150,
      stageFloorY - 36 - bounceY,
      3.8
    );

    // Primary 42U Blade Server Rack (Center)
    renderPixelMatrix(
      ctx,
      SERVER_RACK,
      spotCenterX - 36,
      stageFloorY - 68,
      3.8
    );

    // Blinking 6-Beat LEDs on the Center Server Rack
    for (let led = 0; led < 6; led++) {
      const ly = stageFloorY - 60 + led * 11;
      ctx.fillStyle = led === 5 ? '#fde047' : '#22c55e';
      ctx.fillRect(spotCenterX - 24, ly, 6, 5);
    }

    // Active Server Fault Daemon (Right of Center Rack)
    renderPixelMatrix(
      ctx,
      bossMatrix,
      spotCenterX + 92,
      stageFloorY - 36 - bounceY,
      3.8
    );

    // Keep Title Screen center stage clean (no redundant floating text over the server rack doors)
    smokeTimerRef.current += dt;
    ctx.restore();
  };

  /**
   * Renders a rich pixel-art Data Center / Computing interior inside each Server Bay card (`bx, by, bw, bh`):
   * - 'er_ward': Cold-Aisle 42U Data Center Server Bay (raised floor tiles, background racks, yellow fiber tray)
   * - 'sunlit_conservatory': NOC Command Center & Glass Fiber Vault (city grid window, Grafana wall, UPS banks)
   * - 'sakura_pagoda': DMZ Firewall & Packet Scrubbing Bastion (crimson-indigo WAF monoliths, DDoS map, hex stream)
   * - 'cosmic_meteor': Ring-0 Liquid-Cooled Mainframe Core (deep-blue kernel chamber, cyan coolant tubes, data packets)
   */
  const drawBayComputingInterior = (
    ctx: CanvasRenderingContext2D,
    bx: number,
    by: number,
    bw: number,
    bh: number,
    backdrop: StageBackdropId,
    panelColor: string,
    timeMs: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();

    const floorY = by + Math.floor(bh * 0.68);
    const effectiveBpm = getEffectiveBpm(
      stateRef.current.level.bpm,
      stateRef.current.shiftMode
    );
    const bpmHz = effectiveBpm / 60;
    const beatProg = stateRef.current.beatProgressRef
      ? stateRef.current.beatProgressRef.current
      : stateRef.current.beatProgress;
    const bpmPulse = Math.pow(Math.max(0, 1 - beatProg), 2);
    const cascadeStep = Math.floor((timeMs * bpmHz) / 130);
    const bayCpuLoadPercent = calculateCpuLoadState(
      stateRef.current.level,
      stateRef.current.shiftMode,
      stateRef.current.currentBar,
      stateRef.current.currentBeat,
      stateRef.current.popups?.length ?? 0,
      stateRef.current.forceHighCpuLoad
    ).loadPercent;

    // Helper to draw subtle BPM-pulsing horizontal data-stream lines across the bay backplane
    const drawBayDataStreamLines = (
      primaryRgb: string,
      secondaryRgb: string
    ) => {
      const traceY1 = by + 32;
      const traceY2 = floorY - 6;
      ctx.fillStyle = `rgba(${primaryRgb}, 0.14)`;
      ctx.fillRect(bx + 4, traceY1, bw - 8, 1);
      ctx.fillRect(bx + 4, traceY2, bw - 8, 1);

      const segCount = Math.max(3, Math.floor(bw / 110));
      const span = Math.max(40, bw - 24);
      for (let s = 0; s < segCount; s++) {
        const offset1 = Math.floor(
          ((s * (span / segCount) + timeMs * 0.12 * bpmHz) % span)
        );
        const offset2 = Math.floor(
          ((s * (span / segCount) - timeMs * 0.1 * bpmHz) % span + span) %
            span
        );
        const segLen = Math.floor(12 + bpmPulse * 12);
        const alpha = (0.3 + bpmPulse * 0.5).toFixed(2);
        ctx.fillStyle = `rgba(${primaryRgb}, ${alpha})`;
        ctx.fillRect(bx + 8 + offset1, traceY1, segLen, 2);
        ctx.fillStyle = `rgba(${secondaryRgb}, ${alpha})`;
        ctx.fillRect(bx + 8 + offset2, traceY2, segLen, 2);
      }

      // Subtle animated ASCII-style data packets scrolling across the bay at the rhythm of the current BPM
      const bayPackets = getAsciiDataPackets(
        timeMs,
        effectiveBpm,
        beatProg,
        Math.max(180, bw - 24),
        [traceY1 - 3, traceY2 - 3]
      );
      ctx.save();
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      for (const pkt of bayPackets) {
        const rgb = pkt.isBeatHighlighted ? secondaryRgb : primaryRgb;
        ctx.fillStyle = `rgba(${rgb}, ${pkt.alpha})`;
        ctx.fillText(pkt.label, bx + 8 + pkt.x, pkt.y);
      }
      ctx.restore();
    };

    if (backdrop === 'sakura_pagoda') {
      // DMZ Firewall & Packet Scrubbing Bastion
      const bgGrad = ctx.createLinearGradient(0, by, 0, by + bh);
      bgGrad.addColorStop(0, '#1f081e');
      bgGrad.addColorStop(0.65, '#3b072f');
      bgGrad.addColorStop(1, '#09040e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(bx, by, bw, bh);

      // Background WAF Firewall Monoliths with CPU-Load-driven procedural blinking status LEDs
      for (let rIdx = 0, rx = bx + 16; rx < bx + bw - 24; rx += 64, rIdx++) {
        ctx.fillStyle = '#140516';
        ctx.fillRect(rx, by + 26, 44, floorY - (by + 26));
        ctx.strokeStyle = '#9d174d';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, by + 26, 44, floorY - (by + 26));
        for (let sIdx = 0, ly = by + 34; ly < floorY - 8; ly += 12, sIdx++) {
          const isScrollHead = (sIdx + rIdx + cascadeStep) % 6 === 0;
          const ledBlink = getServerRackLedBlinkState(
            rIdx + 10,
            sIdx,
            timeMs,
            bayCpuLoadPercent,
            bpmPulse
          );
          ctx.fillStyle = isScrollHead
            ? '#fde047'
            : ledBlink.isOn
            ? `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`
            : '#4c0519';
          ctx.fillRect(rx + 6, ly, isScrollHead ? 32 : 24, isScrollHead ? 4 : 3);
        }
      }

      drawBayDataStreamLines('244, 63, 94', '251, 191, 36');

      // Cascading Hex / SYN-ACK Packet Inspection Streams
      ctx.font = '7px "Press Start 2P", monospace';
      for (let col = 0; col < Math.floor(bw / 72); col++) {
        const px = bx + 24 + col * 72;
        const py = by + 32 + ((timeMs * 0.04 * bpmHz + col * 29) % (bh - 52));
        ctx.fillStyle = col % 2 === 0 ? 'rgba(244, 63, 94, 0.45)' : 'rgba(251, 191, 36, 0.45)';
        ctx.fillText(col % 2 === 0 ? 'SYN' : 'ACK', px, py);
      }

      // Bastion Steel Grate Floor
      ctx.fillStyle = '#18061c';
      ctx.fillRect(bx, floorY, bw, by + bh - floorY);
      ctx.strokeStyle = '#831843';
      ctx.lineWidth = 1;
      for (let fx = bx; fx < bx + bw; fx += 24) {
        ctx.beginPath();
        ctx.moveTo(fx, floorY);
        ctx.lineTo(fx - 12, by + bh);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (backdrop === 'sunlit_conservatory') {
      // NOC Command Center & Glass Fiber Vault
      const skyGrad = ctx.createLinearGradient(0, by, 0, floorY);
      skyGrad.addColorStop(0, '#082f49');
      skyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(bx, by, bw, floorY - by);

      // Panoramic NOC Window with Metropolitan Skyline Grid & CPU-Load-driven blinking tower LEDs
      for (let bIdx = 0, bldX = bx + 14; bldX < bx + bw - 20; bldX += 54, bIdx++) {
        const bldH = 38 + ((bldX * 7) % 34);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bldX, floorY - 24 - bldH, 42, bldH);
        for (let wIdx = 0, wy = floorY - 20 - bldH; wy < floorY - 30; wy += 10, wIdx++) {
          const isPulseRow = (wIdx + bIdx + cascadeStep) % 4 === 0;
          const ledBlink = getServerRackLedBlinkState(
            bIdx + 20,
            wIdx,
            timeMs,
            bayCpuLoadPercent,
            bpmPulse
          );
          ctx.fillStyle = isPulseRow
            ? ledBlink.color
            : ledBlink.isOn
            ? `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`
            : '#0f172a';
          ctx.fillRect(bldX + 6, wy, 8, 4);
          ctx.fillRect(bldX + 22, wy, 8, 4);
        }
      }

      drawBayDataStreamLines('56, 189, 248', '16, 185, 129');

      // NOC Multi-Monitor Telemetry Rail & Copper Busbar
      ctx.fillStyle = '#090d16';
      ctx.fillRect(bx, floorY - 26, bw, 26);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(bx, floorY - 26, bw, 3);
      for (let mx = bx + 18; mx < bx + bw - 36; mx += 58) {
        ctx.fillStyle = '#022c22';
        ctx.fillRect(mx, floorY - 21, 44, 16);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx, floorY - 21, 44, 16);
      }

      // Polished Anti-Static NOC Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, floorY, bw, by + bh - floorY);
      ctx.strokeStyle = '#1e293b';
      for (let fx = bx; fx < bx + bw; fx += 28) {
        ctx.beginPath();
        ctx.moveTo(fx, floorY);
        ctx.lineTo(fx, by + bh);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (backdrop === 'cosmic_meteor') {
      // Ring-0 Liquid-Cooled Mainframe Core
      const coreGrad = ctx.createLinearGradient(0, by, 0, by + bh);
      coreGrad.addColorStop(0, '#020617');
      coreGrad.addColorStop(0.55, '#071952');
      coreGrad.addColorStop(1, '#03071e');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(bx, by, bw, bh);

      // Vertical Neon-Cyan Immersion Coolant Tubes with BPM-synced rising bubbles
      for (let tx = bx + 28; tx < bx + bw - 20; tx += 76) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.fillRect(tx, by + 20, 14, bh - 20);
        ctx.fillStyle = '#22d3ee';
        const bubbleY = by + 24 + ((timeMs * 0.05 * bpmHz + tx) % (bh - 40));
        ctx.fillRect(tx + 4, bubbleY, 6, 6);
      }

      drawBayDataStreamLines('56, 189, 248', '192, 132, 252');

      // Spinning Ring-0 Bus Core in Bay Center pulsing with BPM
      const ringCx = bx + Math.floor(bw * 0.5);
      const ringCy = by + Math.floor(bh * 0.48);
      ctx.strokeStyle = `rgba(56, 189, 248, ${(0.3 + bpmPulse * 0.35).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ringCx, ringCy, 34 + bpmPulse * 5, 0, Math.PI * 2);
      ctx.stroke();

      // Streaking High-Speed Optical Data Packets locked to BPM
      for (let p = 0; p < 8; p++) {
        const px = bx + ((p * 97 + timeMs * 0.14 * bpmHz) % Math.max(40, bw - 24));
        const py = by + 28 + ((p * 37) % Math.max(30, bh - 48));
        ctx.fillStyle = p % 2 === 0 ? '#38bdf8' : '#c084fc';
        ctx.fillRect(px, py, Math.floor(14 + bpmPulse * 8), 3);
      }

      ctx.restore();
      return;
    }

    // Default: 'er_ward' -> Cold-Aisle 42U Data Center Server Bay
    const wallGrad = ctx.createLinearGradient(0, by, 0, floorY);
    wallGrad.addColorStop(0, '#080e1c');
    wallGrad.addColorStop(1, '#111c33');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(bx, by, bw, floorY - by);

    // Overhead Yellow Fiber-Optic Cable Tray inside the bay
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, by + 22, bw, 8);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(bx, by + 29, bw, 3);

    // Moving BPM-pulsing data-stream lines along the bay fiber tray & floor conduit
    drawBayDataStreamLines('56, 189, 248', '34, 197, 94');

    // Background 42U Server Cabinets with CPU-Load-driven procedural blinking status LEDs
    for (let rIdx = 0, rx = bx + 14; rx < bx + bw - 36; rx += 56, rIdx++) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(rx, by + 35, 42, floorY - (by + 35));
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx, by + 35, 42, floorY - (by + 35));

      for (let sIdx = 0, ly = by + 42; ly < floorY - 8; ly += 14, sIdx++) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx + 4, ly, 34, 8);
        const isScrollHead = (sIdx + rIdx + cascadeStep) % 5 === 0;
        const ledBlink = getServerRackLedBlinkState(
          rIdx + 30,
          sIdx,
          timeMs,
          bayCpuLoadPercent,
          bpmPulse
        );
        ctx.fillStyle = isScrollHead
          ? ledBlink.color
          : ledBlink.isOn
          ? `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`
          : '#0f172a';
        const ledW = (isScrollHead || ledBlink.isOn) && bpmPulse > 0.3 ? 6 : 4;
        ctx.fillRect(rx + 7, ly + 2, ledW, 4);
        if (isScrollHead || ledBlink.isOn) {
          ctx.fillStyle = `rgba(${ledBlink.rgb}, ${ledBlink.alpha})`;
          ctx.fillRect(rx + 28, ly + 3, 7, 2);
        }
      }
    }

    // Raised Anti-Static Perforated Server Room Floor Tiles
    ctx.fillStyle = '#0b1324';
    ctx.fillRect(bx, floorY, bw, by + bh - floorY);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = floorY; y <= by + bh; y += 14) {
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + bw, y);
      ctx.stroke();
    }
    for (let x = bx; x <= bx + bw; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x + (x - (bx + bw / 2)) * 0.25, by + bh);
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Renders the Full-Bleed Open-Stage Server Room (`y = 62 .. 496`).
   * Inspired by Rhythm Doctor's open-stage composition:
   * - The pixel-art Data Center environment fills the entire stage band (`1`, `2`, or `3` horizontal bands).
   * - On the left (`x ≈ 46..158`), the On-Call SRE Engineer and 42U Blade Server Rack (with 6 beat LEDs) anchor the start of the lifeline.
   * - On the right (`x ≈ crosshairX`), the Server Fault Daemon hovers beside the Resonance Core receptor.
   * - When `spectacleState.spotlightActive` is true, a dramatic diagonal spotlight cone illuminates the engineer and rack.
   */
  const drawServerRackBays = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    panels: PanelSlotConfig[],
    stageBackdrop: StageBackdropId,
    beatInBarFloat: number,
    healthVal: number,
    isDischarging: boolean,
    dischargedPanelId: number | null,
    spectacleState: StageSpectacleState,
    timeMs: number,
    dt: number
  ) => {
    const panelCount = panels.length;
    const marginX = 16;
    const bayW = w - marginX * 2;
    const isFrame1 = Math.floor(timeMs / 350) % 2 === 0;

    for (let idx = 0; idx < panelCount; idx++) {
      const panel = panels[idx];
      const isReversed = Boolean(panel.reversed);
      const {
        crosshairX,
        trackY,
        slotsStartX,
        slotsTotalW,
        trackTop,
        singleTrackH,
      } = getSlot7ImpactCoords(
        w,
        h,
        panelCount,
        idx,
        isReversed,
        spectacleState.verticalTrackShiftPx
      );

      const bx = marginX;
      const by = trackTop + 2;
      const bayH = singleTrackH - 4;
      const prog = getPanelTrackProgress(beatInBarFloat, panel.pattern);
      const isBeat7 = prog.currentStep === 7;
      const isThisPanelDischarging =
        isDischarging && (dischargedPanelId === null || dischargedPanelId === panel.panelId);
      const beatBounce = Math.round(Math.max(0, 1 - prog.stepProgress * 1.6) * 4);

      // 1. Full-Bleed Pixel-Art Data Center Interior across the Stage Band
      drawBayComputingInterior(
        ctx,
        bx,
        by,
        bayW,
        bayH,
        stageBackdrop,
        panel.color,
        timeMs
      );

      // Subtle Stage Band Frame
      ctx.strokeStyle = isBeat7
        ? '#ef4444'
        : isThisPanelDischarging
        ? '#38bdf8'
        : 'rgba(56, 189, 248, 0.38)';
      ctx.lineWidth = isBeat7 || isThisPanelDischarging ? 2.5 : 1.5;
      ctx.strokeRect(bx, by, bayW, bayH);

      // Optional Spotlight Cone (for 2-Beat SVT / Bridge Breakdown phases)
      if (spectacleState.spotlightActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 6, 23, 0.56)';
        ctx.fillRect(bx + 1, by + 1, bayW - 2, bayH - 2);

        const spotCenterX = isReversed
          ? slotsStartX + slotsTotalW - 30
          : slotsStartX - 24;
        const grad = ctx.createRadialGradient(
          spotCenterX,
          trackY - 10,
          14,
          spotCenterX,
          trackY - 10,
          220
        );
        grad.addColorStop(0, 'rgba(253, 224, 71, 0.28)');
        grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.12)');
        grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(spotCenterX - 70, by);
        ctx.lineTo(spotCenterX + 70, by);
        ctx.lineTo(spotCenterX + 185, by + bayH);
        ctx.lineTo(spotCenterX - 185, by + bayH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const spriteScale = panelCount === 1 ? 3.6 : panelCount === 2 ? 2.7 : 2.1;
      const spriteSize = Math.floor(16 * spriteScale);
      const rackScale = panelCount === 1 ? 3.1 : panelCount === 2 ? 2.3 : 1.8;
      const rackW = Math.floor(20 * rackScale);
      const rackH = Math.floor(24 * rackScale);

      // Anchor SRE Engineer & 42U Server Rack at the origin end of the Horizontal Lifeline
      const floorY = Math.min(by + bayH - 26, Math.floor(trackY + spriteSize * 0.48));
      const originX = isReversed
        ? slotsStartX + slotsTotalW + 14
        : Math.max(bx + 14, slotsStartX - rackW - spriteSize - 10);

      // Compact Floor Bay Tag Pill beneath the SRE Engineer & Rack (never collides with top dialogue box)
      const badgeY = Math.min(by + bayH - 20, floorY + 5);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.fillRect(bx + 10, badgeY, 268, 17);
      ctx.strokeStyle = panel.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 10, badgeY, 268, 17);

      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = panel.color;
      ctx.textAlign = 'left';
      ctx.fillText(
        `BAY ${idx + 1}: ${panel.nodeName.slice(0, 15)}${isReversed ? ' ◄REV' : ''}`,
        bx + 16,
        badgeY + 12
      );

      ctx.textAlign = 'right';
      ctx.fillStyle =
        panel.pattern === 'double_time' || panel.pattern === 'two_beat_svt'
          ? '#38bdf8'
          : panel.pattern === 'off_beat' || panel.pattern === 'swing_beat'
          ? '#fde047'
          : panel.pattern === 'skip_beat' || panel.pattern === 'irregular_7_8'
          ? '#ec4899'
          : '#4ade80';
      ctx.fillText(getPatternLabel(panel.pattern).slice(0, 13), bx + 272, badgeY + 12);

      const sreX = isReversed ? originX + rackW + 6 : originX;
      const sreY = floorY - spriteSize - (isThisPanelDischarging ? 0 : beatBounce);
      const sreMatrix = isThisPanelDischarging
        ? SRE_DISCHARGE
        : isFrame1
        ? SRE_IDLE_1
        : SRE_IDLE_2;

      const rackX = isReversed ? originX : originX + spriteSize + 4;
      const rackY = floorY - rackH;
      const rackShake =
        healthVal < 40 || isBeat7 ? (Math.random() - 0.5) * 3 : 0;

      // Fiber-Optic Patch Cable connecting SRE Engineer to 42U Server Rack
      ctx.strokeStyle = isThisPanelDischarging ? '#fde047' : '#06b6d4';
      ctx.lineWidth = Math.max(2, Math.floor(spriteScale * 0.65));
      ctx.beginPath();
      ctx.moveTo(sreX + spriteSize * 0.5, floorY - Math.floor(spriteSize * 0.35));
      ctx.quadraticCurveTo(
        Math.floor((sreX + rackX + rackW * 0.5) * 0.5),
        floorY + 4,
        rackX + rackW * 0.5,
        floorY - Math.floor(rackH * 0.25)
      );
      ctx.stroke();

      // SRE Shadow & Sprite
      ctx.fillStyle = 'rgba(2, 6, 23, 0.7)';
      ctx.fillRect(sreX + 3, floorY - 4, spriteSize - 6, 5);
      renderPixelMatrix(ctx, sreMatrix, sreX, sreY, spriteScale);

      // 42U Server Rack Shadow, Sprite & 6 Blinking Beat LEDs
      ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
      ctx.fillRect(rackX + 2, floorY - 4, rackW - 4, 5);
      renderPixelMatrix(ctx, SERVER_RACK, rackX + rackShake, rackY, rackScale);

      for (let led = 0; led < 6; led++) {
        const pulseNum = led + 1;
        const isCloaked = panel.pattern === 'skip_beat' && pulseNum >= 4;
        const isLit = pulseNum <= prog.currentStep;
        ctx.fillStyle = isCloaked
          ? '#ec4899'
          : isBeat7
          ? '#ef4444'
          : isLit
          ? panel.color
          : '#1e293b';
        const ledW = Math.max(3, Math.floor(rackScale * 1.3));
        const ledH = Math.max(2, Math.floor(rackScale * 1.0));
        ctx.fillRect(
          rackX + Math.floor(rackW * 0.16) + rackShake,
          rackY + Math.floor(rackScale * 2.5) + led * Math.floor(rackScale * 3.1),
          ledW,
          ledH
        );
      }

      // Target End: Server Fault Daemon hovering right behind the Beat 7 Resonance Core
      const bossX = isReversed
        ? Math.max(bx + 18, crosshairX - spriteSize - 26)
        : Math.min(bx + bayW - spriteSize - 14, crosshairX + 26);
      const bossFloat = Math.sin(timeMs / 220 + idx) * 4 - beatBounce;
      const bossY = Math.floor(trackY - spriteSize * 0.55 + bossFloat);

      let bossMatrix = SLIME_1;
      if (panel.bossType === 'heap_leak') {
        bossMatrix = isFrame1 ? SLIME_1 : SLIME_2;
      } else if (panel.bossType === 'deadlock_ghost') {
        bossMatrix = isFrame1 ? DEADLOCK_GHOST_1 : DEADLOCK_GHOST_2;
      } else {
        bossMatrix = isFrame1 ? DDOS_BEAST_1 : DDOS_BEAST_2;
      }

      ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
      ctx.fillRect(bossX + 4, bossY + spriteSize - 2, spriteSize - 8, 5);
      renderPixelMatrix(ctx, bossMatrix, bossX, bossY, spriteScale);

      // Electric GC Arc across the Open Stage on Beat 7 Discharge
      if (isThisPanelDischarging) {
        drawPixelLightning(
          ctx,
          rackX + rackW * 0.5,
          trackY,
          crosshairX,
          trackY,
          3,
          '#38bdf8'
        );
        drawPixelLightning(
          ctx,
          crosshairX,
          trackY,
          bossX + spriteSize * 0.4,
          bossY + spriteSize * 0.5,
          2,
          '#fde047'
        );
      }
    }

    smokeTimerRef.current += dt;
  };

  /**
   * Renders a sleek, compact NOC Comms / Story Dialogue Strip at the top of the stage (`y = 62 .. 82`)
   * so the open-stage server room and horizontal lifeline remain completely unobstructed.
   */
  const drawPhaseCalloutStrip = (
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    lvl: LevelConfig,
    barIndex: number,
    beatInBar: number,
    hasPopup: boolean,
    isBlackout: boolean
  ) => {
    const callout = getBarCallout(lvl, barIndex, beatInBar, hasPopup, isBlackout);
    const stripX = 16;
    const stripY = 62;
    const stripW = w - 32;
    const stripH = 20;

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(stripX, stripY, stripW, stripH);
    ctx.strokeStyle = callout.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(stripX, stripY, stripW, stripH);

    const tagW = 102;
    ctx.fillStyle = callout.color;
    ctx.fillRect(stripX, stripY, tagW, stripH);
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#020617';
    ctx.textAlign = 'center';
    ctx.fillText(callout.speaker, stripX + tagW / 2, stripY + 13);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'left';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(callout.text.slice(0, 76), stripX + tagW + 10, stripY + 13);
    ctx.restore();
  };

  /**
   * Renders the Open-Stage Horizontal Lifeline (`drawMultiPanelOscilloscopeTracks`)
   * directly across the pixel-art server room at `trackY`, matching the iconic Rhythm Doctor
   * visual language while staying 100% authentic to our Server Room Emergency Repair theme:
   * - Crisp dark-outlined glowing Horizontal Lifeline connecting the 42U Server Rack on the left
   *   to the Resonance Core Heart-Crystal receptor at Beat 7 (`crosshairX`).
   * - Emerald/cyan line on Beats 1..4 transitioning to warm amber/gold on Beats 5..6.
   * - Bold Pink 'X' markers (`drawPinkMuteX`) directly on the lifeline for silent/skipped beats.
   * - Tall traveling ECG Pulse Spike (`─⋀⋁─`) sweeping smoothly along the lifeline at `needleX`.
   * - Floating beat countdown numerals (`3`, `2`, `1`) and rhythmic lyric chants right above the spike.
   * - In-Track Kernel Panic Popups obstructing Slots 4..7 when triggered.
   */
  const drawMultiPanelOscilloscopeTracks = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lvl: LevelConfig,
    panels: PanelSlotConfig[],
    barIndex: number,
    beatInBar: number,
    beatInBarFloat: number,
    isDischarging: boolean,
    dischargedPanelId: number | null,
    spectacleState: StageSpectacleState,
    timeMs: number
  ) => {
    const panelCount = panels.length;
    const activePopups = stateRef.current.popups || [];
    const hitBoxes: Array<{ id: number; x: number; y: number; w: number; h: number }> = [];

    for (let idx = 0; idx < panelCount; idx++) {
      const panel = panels[idx];
      const isReversed = Boolean(panel.reversed);
      const {
        crosshairX,
        trackY,
        slotsStartX,
        slotsTotalW,
        slotW,
        trackTop,
        singleTrackH,
      } = getSlot7ImpactCoords(
        w,
        h,
        panelCount,
        idx,
        isReversed,
        spectacleState.verticalTrackShiftPx
      );

      const prog = getPanelTrackProgress(beatInBarFloat, panel.pattern);
      const isBeat7 = prog.currentStep === 7;
      const isThisPanelDischarging =
        isDischarging && (dischargedPanelId === null || dischargedPanelId === panel.panelId);
      const panelBarGrade =
        stateRef.current.panelBarJudgments?.[`${barIndex}:${panel.panelId}`];
      const isResolvedHit = panelBarGrade === 'PERFECT' || panelBarGrade === 'GOOD';
      const isResolvedMiss = panelBarGrade === 'MISS';
      const mutedBeats = getMutedBeatsForPanel(panel.pattern, barIndex);
      const chant = getRowLyricChant(lvl, panel, barIndex, beatInBar);

      const lineStartX = isReversed ? crosshairX : slotsStartX;
      const lineEndX = isReversed ? slotsStartX + slotsTotalW : crosshairX;
      const splitX = isReversed
        ? slotsStartX + slotW * 3
        : slotsStartX + slotW * 4;

      // 1. Dark Pixel Outline behind the Open-Stage Horizontal Lifeline (ensures crisp contrast over any room)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(lineStartX, trackY);
      ctx.lineTo(lineEndX, trackY);
      ctx.stroke();

      // 2. Two-Tone Glowing Lifeline Core (Emerald/Cyan on Beats 1..4 -> Amber/Gold on Beats 5..6 -> Ruby/Emerald on Beat 7)
      const primaryLineColor = isThisPanelDischarging
        ? '#38bdf8'
        : isResolvedHit
        ? '#4ade80'
        : panel.color || '#22c55e';
      const approachLineColor = isBeat7
        ? '#ef4444'
        : isResolvedHit
        ? '#4ade80'
        : '#f59e0b';

      ctx.strokeStyle = isReversed ? approachLineColor : primaryLineColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(lineStartX, trackY);
      ctx.lineTo(splitX, trackY);
      ctx.stroke();

      ctx.strokeStyle = isReversed ? primaryLineColor : approachLineColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(splitX, trackY);
      ctx.lineTo(lineEndX, trackY);
      ctx.stroke();
      ctx.restore();

      // 3. Beat Tick Nodes (Slots 1..6), Pink 'X' Clock-Mask Markers, and Floating Countdown Numerals
      for (let slotIdx = 0; slotIdx < 7; slotIdx++) {
        const visualSlot = isReversed ? 6 - slotIdx : slotIdx;
        const beatNum = slotIdx + 1;
        const sx = slotsStartX + visualSlot * slotW;
        const slotCenterX = sx + slotW * 0.5;
        const isTargetSlot = beatNum === 7;
        const isCurrentSlot = prog.currentStep === beatNum && !prog.isFinishedInBar;
        const isCloakedSlot = mutedBeats.includes(beatNum);

        if (!isTargetSlot) {
          // Subtle Beat Node Tick on the Horizontal Lifeline
          ctx.fillStyle = '#020617';
          ctx.fillRect(slotCenterX - 4, trackY - 5, 8, 10);
          ctx.fillStyle = isCloakedSlot
            ? '#ec4899'
            : beatNum <= prog.currentStep
            ? '#fde047'
            : beatNum >= 5
            ? '#f59e0b'
            : primaryLineColor;
          ctx.fillRect(slotCenterX - 2, trackY - 3, 4, 6);

          // Bold Pink 'X' directly on the lifeline for muted/skipped beats (just like Rhythm Doctor!)
          if (isCloakedSlot) {
            drawPinkMuteX(ctx, slotCenterX, trackY, panelCount === 1 ? 14 : 11);
          }

          // Floating Beat Number / Countdown ('3', '2', '1') above the active beat on the lifeline
          if (isCurrentSlot) {
            const countVal = beatNum >= 4 && beatNum <= 6 ? 7 - beatNum : beatNum;
            const isCountdown = beatNum >= 4 && beatNum <= 6;
            ctx.save();
            ctx.font = isCountdown
              ? 'bold 16px "Press Start 2P", monospace'
              : '10px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#020617';
            ctx.fillText(
              String(countVal),
              slotCenterX + 2,
              trackY - (panelCount === 1 ? 42 : 28) + 2
            );
            ctx.fillStyle = isCountdown
              ? '#f472b6'
              : isCloakedSlot
              ? '#ec4899'
              : '#fde047';
            ctx.fillText(
              String(countVal),
              slotCenterX,
              trackY - (panelCount === 1 ? 42 : 28)
            );
            ctx.restore();
          }
        }
      }

      // 4. Traveling ECG Pulse Spike (`─⋀⋁─`) along the Open-Stage Horizontal Lifeline
      const needleProgress = isReversed ? 1 - prog.cycleProgress : prog.cycleProgress;
      const needleX = slotsStartX + needleProgress * slotsTotalW;
      const spikeHeight = panelCount === 1 ? 34 : panelCount === 2 ? 26 : 20;
      const spikeColor = isBeat7
        ? '#fde047'
        : isThisPanelDischarging
        ? '#38bdf8'
        : '#4ade80';

      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';

      // Dark outer stroke for ECG spike
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(needleX - 18, trackY);
      ctx.lineTo(needleX - 10, trackY);
      ctx.lineTo(needleX - 6, trackY - spikeHeight * 0.45);
      ctx.lineTo(needleX - 2, trackY + spikeHeight * 0.55);
      ctx.lineTo(needleX + 2, trackY - spikeHeight);
      ctx.lineTo(needleX + 6, trackY + spikeHeight * 0.85);
      ctx.lineTo(needleX + 10, trackY - spikeHeight * 0.35);
      ctx.lineTo(needleX + 14, trackY);
      ctx.lineTo(needleX + 20, trackY);
      ctx.stroke();

      // Glowing neon core stroke for ECG spike
      ctx.strokeStyle = spikeColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = spikeColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(needleX - 18, trackY);
      ctx.lineTo(needleX - 10, trackY);
      ctx.lineTo(needleX - 6, trackY - spikeHeight * 0.45);
      ctx.lineTo(needleX - 2, trackY + spikeHeight * 0.55);
      ctx.lineTo(needleX + 2, trackY - spikeHeight);
      ctx.lineTo(needleX + 6, trackY + spikeHeight * 0.85);
      ctx.lineTo(needleX + 10, trackY - spikeHeight * 0.35);
      ctx.lineTo(needleX + 14, trackY);
      ctx.lineTo(needleX + 20, trackY);
      ctx.stroke();
      ctx.restore();

      // Floating In-Song Lyric / Telemetry Chant above the center of the lifeline (e.g. "PING, PING, PING!")
      if (chant.text) {
        const chantX = slotsStartX + slotsTotalW * 0.46;
        const chantY = trackY - (panelCount === 1 ? 26 : 18);
        ctx.save();
        ctx.font = panelCount === 1 ? '9px "Press Start 2P", monospace' : '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#020617';
        ctx.fillText(chant.text.slice(0, 28), chantX + 1.5, chantY + 1.5);
        ctx.fillStyle = chant.color;
        ctx.fillText(chant.text.slice(0, 28), chantX, chantY);
        ctx.restore();
      }

      // 4.5 Beat-Synced Floating Musical / Telemetry Notes ('♪', '♫', '♮') drifting off the lifeline (like Rhythm Doctor!)
      const noteGlyphs = ['♪', '♫', '♪', '♮', '♫', '♪'];
      ctx.save();
      ctx.font = panelCount === 1 ? '12px "Press Start 2P", monospace' : '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      for (let n = 0; n < 5; n++) {
        const noteSlot = ((barIndex + n * 2) % 6);
        const noteX = slotsStartX + (isReversed ? 6 - noteSlot : noteSlot) * slotW + slotW * 0.35;
        const floatPhase = ((timeMs * 0.0018 + n * 0.37) % 1);
        const noteY = trackY - 12 - floatPhase * (panelCount === 1 ? 48 : 28) + (n % 2 === 0 ? -4 : 18);
        const noteAlpha = Math.sin(floatPhase * Math.PI) * 0.72;
        ctx.fillStyle = n % 2 === 0
          ? `rgba(74, 222, 128, ${noteAlpha.toFixed(2)})`
          : `rgba(253, 224, 71, ${noteAlpha.toFixed(2)})`;
        ctx.fillText(noteGlyphs[(barIndex + n) % noteGlyphs.length], noteX, noteY);
      }
      ctx.restore();

      // 5. Beat 7 Target Receptor: Pixelated Resonance Core Heart-Crystal at `(crosshairX, trackY)`
      const corePulse = isBeat7 || isThisPanelDischarging ? 1.22 : 1.0 + Math.max(0, 0.15 - prog.stepProgress * 0.2);
      const coreR = Math.round((panelCount === 1 ? 18 : 14) * corePulse);

      // Converging Target Approach Ring on Beats 5, 6, 7 (Audio-Visual Accessibility Cue)
      if (prog.currentStep >= 5 && !prog.isFinishedInBar && !isResolvedHit) {
        const remProgress = Math.max(0, 1 - prog.cycleProgress); // ~0.33 at Beat 5 -> 0.0 at Beat 7
        const approachRadius = coreR + 4 + remProgress * 95;
        ctx.save();
        ctx.strokeStyle = isBeat7 ? '#fde047' : 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = isBeat7 ? 3 : 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(crosshairX, trackY, approachRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(crosshairX, trackY);

      // Outer Dark Border of Resonance Core Crystal
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(0, -coreR * 0.55);
      ctx.lineTo(coreR * 0.55, -coreR);
      ctx.lineTo(coreR * 1.05, -coreR * 0.35);
      ctx.lineTo(coreR * 0.95, coreR * 0.35);
      ctx.lineTo(0, coreR * 1.15);
      ctx.lineTo(-coreR * 0.95, coreR * 0.35);
      ctx.lineTo(-coreR * 1.05, -coreR * 0.35);
      ctx.lineTo(-coreR * 0.55, -coreR);
      ctx.closePath();
      ctx.fill();

      // Inner Glowing Crystal Fill (Ruby Red -> Gold on Beat 7 -> Emerald on 200 OK!)
      ctx.fillStyle = isResolvedHit
        ? '#22c55e'
        : isThisPanelDischarging || isBeat7
        ? '#fde047'
        : isResolvedMiss
        ? '#991b1b'
        : '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -coreR * 0.42);
      ctx.lineTo(coreR * 0.48, -coreR * 0.82);
      ctx.lineTo(coreR * 0.86, -coreR * 0.28);
      ctx.lineTo(coreR * 0.78, coreR * 0.28);
      ctx.lineTo(0, coreR * 0.94);
      ctx.lineTo(-coreR * 0.78, coreR * 0.28);
      ctx.lineTo(-coreR * 0.86, -coreR * 0.28);
      ctx.lineTo(-coreR * 0.48, -coreR * 0.82);
      ctx.closePath();
      ctx.fill();

      // Crystal Specular Highlight & Circuit Crack Lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(-coreR * 0.52, -coreR * 0.55, 4, 4);
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-coreR * 0.3, -coreR * 0.1);
      ctx.lineTo(coreR * 0.1, coreR * 0.2);
      ctx.lineTo(coreR * 0.4, -coreR * 0.15);
      ctx.stroke();
      ctx.restore();

      // Target Receptor Prompt Label (`[SPACE]` / `[200 OK!]`) below the Core Crystal
      ctx.save();
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      const keyPrompt = isResolvedHit
        ? '200 OK!'
        : isResolvedMiss
        ? '502 MISS'
        : stateRef.current.twoPlayerMode && panelCount >= 2
        ? idx === 0
          ? 'P1:SPACE'
          : 'P2:J/ENT'
        : isBeat7
        ? 'SPACE NOW!'
        : 'BEAT 7';
      ctx.fillStyle = '#020617';
      ctx.fillText(keyPrompt, crosshairX + 1, trackY + coreR + 13);
      ctx.fillStyle = isResolvedHit
        ? '#4ade80'
        : isBeat7
        ? '#fde047'
        : '#fca5a5';
      ctx.fillText(keyPrompt, crosshairX, trackY + coreR + 12);
      ctx.restore();

      // 6. In-Track Kernel Panic Popup Obstruction (directly over Slots 4..7 on this track)
      const trackPopup = activePopups.find(
        (p) =>
          p.targetPanelId === panel.panelId ||
          p.targetPanelId === idx ||
          (panelCount === 1 && p.targetPanelId >= 0)
      );

      if (trackPopup) {
        const box = computeTrackPopupBox(
          slotsStartX,
          slotW,
          trackTop,
          singleTrackH,
          trackPopup.startSlot || 4,
          trackPopup.endSlot || 7,
          w,
          h
        );
        hitBoxes.push({
          id: trackPopup.id,
          x: box.boxX,
          y: box.boxY,
          w: box.boxWidth,
          h: box.boxHeight,
        });

        const jitterX = Math.sin(timeMs / 45) * 1.5;
        const bx = box.boxX + jitterX;
        const by = box.boxY;
        const bw = box.boxWidth;
        const bh = box.boxHeight;

        ctx.save();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(bx, by, bw, bh);

        const isNeedleUnderneath = prog.currentStep >= 4;
        const beatGlow = isNeedleUnderneath && prog.stepProgress < 0.35;
        ctx.strokeStyle = beatGlow ? '#fde047' : '#ef4444';
        ctx.lineWidth = beatGlow ? 3 : 2;
        ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);

        const headerH = Math.min(18, Math.max(13, Math.floor(bh * 0.24)));
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(bx + 2, by + 2, bw - 4, headerH);

        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(
          `[!] ${trackPopup.title.slice(0, 24)}`,
          bx + 8,
          by + Math.min(13, headerH - 2)
        );

        const closeBtnW = 16;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(bx + bw - closeBtnW - 4, by + 3, closeBtnW, headerH - 2);
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText('X', bx + bw - closeBtnW / 2 - 4, by + Math.min(13, headerH - 2));

        const bodyTop = by + headerH + 3;
        const bodyH = bh - headerH - 6;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx + 4, bodyTop, bw - 8, bodyH);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#f87171';
        ctx.fillText(
          trackPopup.message.slice(0, 44),
          bx + bw / 2,
          bodyTop + Math.floor(bodyH * 0.44)
        );

        const blink = Math.floor(timeMs / 200) % 2 === 0;
        ctx.fillStyle = blink ? '#fde047' : '#38bdf8';
        ctx.fillText(
          '[!] TRACK OBSTRUCTED - HIT BEAT 7 BY EAR! [CLICK X]',
          bx + bw / 2,
          bodyTop + Math.floor(bodyH * 0.82)
        );
        ctx.restore();
      }
    }

    popupHitBoxesRef.current = hitBoxes;
  };

  /**
   * Renders choreographed Stage Spectacle Interference effects (`getStageSpectacleState`)
   * inspired by Rhythm Doctor's music-video staging:
   * - Giant center-stage pixel countdown numeral (`7..1`) during `spotlight_countdown`, `window_split`, or `vhs_climax`
   * - Diagonal cascading delivery/server alert banners during `notification_cascade`
   * - Picture-in-Picture secondary security monitor window splits during `window_split`
   * - Brief CRT snow static burst on bar transitions during `vhs_climax`
   */
  const drawStageSpectacleOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    lvl: LevelConfig,
    spectacleState: StageSpectacleState,
    barIndex: number,
    beatInBar: number,
    beatProgress: number,
    timeMs: number
  ) => {
    if (spectacleState.effect === 'none') return;

    ctx.save();

    // 1. Giant Center-Stage Pixel Countdown Numeral (7..1)
    if (spectacleState.giantCountdownNumber !== null) {
      const pulseScale = 1 + Math.max(0, 1 - beatProgress * 2.2) * 0.25;
      const cx = Math.floor(w * 0.5);
      const cy = 148;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(pulseScale, pulseScale);
      ctx.font = 'bold 34px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.fillText(String(spectacleState.giantCountdownNumber), 3, 3);
      ctx.fillStyle =
        spectacleState.giantCountdownNumber === 1
          ? '#ef4444'
          : spectacleState.giantCountdownNumber <= 3
          ? '#fde047'
          : '#38bdf8';
      ctx.fillText(String(spectacleState.giantCountdownNumber), 0, 0);
      ctx.restore();
    }

    // 2. Cascading Notification Alert Banners (`notification_cascade`)
    if (spectacleState.cascadeBannerCount > 0) {
      const alertLabels = [
        '[!] ORDER #8841 TIMEOUT (ROW B)',
        '[!] COUPON LOCK QUEUE: 98.4%',
        '[!] RIDER DISPATCH RETRY #7',
        '[!] REDIS SHARD-02 HIGH IOPS',
      ];
      for (let i = 0; i < spectacleState.cascadeBannerCount; i++) {
        const cardW = 228;
        const cardH = 26;
        const cardX = w - cardW - 24 - i * 14;
        const bounceY = Math.round(Math.max(0, 1 - beatProgress * 2) * 3);
        const cardY = 92 + i * 30 - bounceY;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.fillRect(cardX, cardY, cardW, cardH);
        ctx.strokeStyle = i === spectacleState.cascadeBannerCount - 1 ? '#fde047' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cardX, cardY, cardW, cardH);

        ctx.fillStyle = i === spectacleState.cascadeBannerCount - 1 ? '#fde047' : '#0284c7';
        ctx.fillRect(cardX, cardY, 6, cardH);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'left';
        ctx.fillText(
          alertLabels[(barIndex + i) % alertLabels.length],
          cardX + 12,
          cardY + 16
        );
      }
    }

    // 3. Picture-in-Picture Security Monitor Window Split (`window_split`)
    if (spectacleState.windowSplitActive) {
      const pipW = 196;
      const pipH = 54;
      const pipX = w - pipW - 22;
      const pipY = 90;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.fillRect(pipX, pipY, pipW, pipH);
      ctx.strokeStyle = beatInBar === 7 ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipX, pipY, pipW, pipH);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(pipX + 2, pipY + 2, pipW - 4, 14);
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.fillText(`PIP CAM-02 // ${lvl.rackRow.slice(0, 14)}`, pipX + 6, pipY + 11);

      // Animated mini ECG trace inside PiP monitor
      ctx.strokeStyle = beatInBar === 7 ? '#fde047' : '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const traceY = pipY + 34;
      ctx.moveTo(pipX + 10, traceY);
      const spikeX = pipX + 20 + ((beatInBar - 1 + beatProgress) / 7) * (pipW - 40);
      ctx.lineTo(spikeX - 6, traceY);
      ctx.lineTo(spikeX - 2, traceY - 12);
      ctx.lineTo(spikeX + 2, traceY + 10);
      ctx.lineTo(spikeX + 6, traceY);
      ctx.lineTo(pipX + pipW - 10, traceY);
      ctx.stroke();
    }

    // 4. Brief CRT Static Snow Burst on Bar Transitions (`vhs_climax`)
    if (spectacleState.crtStaticBurstAlpha > 0) {
      ctx.fillStyle = `rgba(226, 232, 240, ${spectacleState.crtStaticBurstAlpha.toFixed(3)})`;
      for (let s = 0; s < 28; s++) {
        const sx = ((s * 137 + Math.floor(timeMs)) % (w - 40)) + 20;
        const sy = ((s * 89 + Math.floor(timeMs * 0.7)) % (h - 120)) + 70;
        const sw = 18 + (s % 5) * 14;
        ctx.fillRect(sx, sy, sw, 2);
      }
    }

    ctx.restore();
  };

  /**
   * Renders horizontal viewport slice displacements and a compact telemetry warning
   * when health drops below 20%, intensifying toward 0% without tinting the screen.
   */
  const drawLowHealthGlitchOverlay = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    glitchState: LowHealthGlitchState,
    healthVal: number,
    timeMs: number
  ) => {
    ctx.save();

    for (let s = 0; s < glitchState.sliceCount; s++) {
      const seed = Math.sin(timeMs * 0.037 + s * 19.3);
      const sliceY = Math.floor((seed * 0.5 + 0.5) * (h - 60) + 24);
      const sliceH = Math.floor(6 + glitchState.intensity * 18);
      const shiftX = Math.round(
        Math.cos(timeMs * 0.053 + s * 11.7) * (4 + glitchState.intensity * 22)
      );

      ctx.drawImage(canvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
    }

    const blink = Math.floor(timeMs / 140) % 2 === 0;
    const bannerW = 520;
    const bannerH = 20;
    const bannerX = Math.floor((w - bannerW) / 2 + glitchState.offsetX * 0.4);
    const bannerY = 64;

    ctx.fillStyle = 'rgba(24, 4, 8, 0.92)';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
    ctx.strokeStyle = blink ? '#ef4444' : '#fde047';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = blink ? '#ef4444' : '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(
      `[!] ${glitchState.statusLabel} | UPTIME ${Math.max(0, Math.round(healthVal))}% | GLITCH ${(glitchState.intensity * 100).toFixed(0)}%`,
      bannerX + bannerW / 2,
      bannerY + 13
    );

    ctx.restore();
  };

  /**
   * Renders the Top SRE Comm-Link Cutscene Banner with a Glossy Navy Box,
   * Double Cyan Border, Character Bust Portrait popping out of the top-left frame,
   * and a bouncing white '▼' prompt triangle.
   */
  const drawStoryCutsceneOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    cutscene: StoryCutsceneEvent,
    timeMs: number
  ) => {
    const boxW = Math.min(w - 96, 740);
    const boxH = 56;
    const boxX = Math.floor((w - boxW) / 2);
    const boxY = 64;

    const borderColor =
      cutscene.mood === 'panic'
        ? '#ef4444'
        : cutscene.mood === 'urgent'
        ? '#fde047'
        : '#38bdf8';

    ctx.save();

    // Sleek Translucent Deep Navy Dialogue Box (lets the server room atmosphere shine through)
    const navGrad = ctx.createLinearGradient(0, boxY, 0, boxY + boxH);
    navGrad.addColorStop(0, 'rgba(12, 74, 110, 0.92)');
    navGrad.addColorStop(0.25, 'rgba(3, 43, 82, 0.92)');
    navGrad.addColorStop(1, 'rgba(2, 21, 43, 0.92)');
    ctx.fillStyle = navGrad;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Metallic Double Border
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4;
    ctx.strokeRect(boxX - 1, boxY - 1, boxW + 2, boxH + 2);

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6);

    // Character Bust Portrait Popping Out of the Top-Left Frame
    const isTalkFrame = Math.floor(timeMs / 180) % 2 === 0;
    const portX = boxX + 16;
    const portY = boxY - 10;
    const portScale = 3.5;

    if (cutscene.avatarType === 'paige_sre') {
      renderPixelMatrix(
        ctx,
        isTalkFrame ? SRE_IDLE_1 : SRE_IDLE_2,
        portX,
        portY,
        portScale
      );
    } else if (cutscene.avatarType === 'ian_intern') {
      renderPixelMatrix(
        ctx,
        isTalkFrame ? SRE_IDLE_2 : SRE_DISCHARGE,
        portX,
        portY,
        portScale
      );
    } else if (cutscene.avatarType === 'kernel_ai') {
      renderPixelMatrix(ctx, SERVER_RACK, portX + 4, portY + 4, 3.4);
    } else {
      renderPixelMatrix(
        ctx,
        isTalkFrame ? DEADLOCK_GHOST_1 : DEADLOCK_GHOST_2,
        portX,
        portY,
        portScale
      );
    }

    // Speaker Header & Dialogue Text (crisp CJK + Latin readability on 960x540 stage)
    const textLeft = boxX + 94;
    const isZh = (stateRef.current.locale || 'zh') === 'zh';
    ctx.textAlign = 'left';
    ctx.font = isZh
      ? 'bold 12px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", monospace'
      : '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#020617';
    ctx.fillText(`${cutscene.speaker} [${cutscene.role}]`, textLeft + 1, boxY + 17);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${cutscene.speaker} [${cutscene.role}]`, textLeft, boxY + 16);

    const maxLineChars = isZh ? 36 : 56;
    const rawText = cutscene.text;
    let line1 = rawText;
    let line2 = '';
    if (rawText.length > maxLineChars) {
      const splitIdx = isZh ? -1 : rawText.lastIndexOf(' ', maxLineChars);
      const cut = splitIdx > 20 ? splitIdx : maxLineChars;
      line1 = rawText.slice(0, cut);
      line2 = rawText.slice(cut).trim();
    }

    ctx.font = isZh
      ? 'bold 14px "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif'
      : '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#020617';
    ctx.fillText(line1, textLeft + 1, boxY + 36);
    if (line2) {
      ctx.fillText(line2.slice(0, maxLineChars), textLeft + 1, boxY + 53);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line1, textLeft, boxY + 35);
    if (line2) {
      ctx.fillText(line2.slice(0, maxLineChars), textLeft, boxY + 52);
    }

    // Bouncing White '▼' Prompt Triangle in the bottom-right corner
    const bounceTri = Math.floor(timeMs / 250) % 2 === 0 ? 0 : 2;
    const triX = boxX + boxW - 18;
    const triY = boxY + boxH - 14 + bounceTri;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(triX - 5, triY);
    ctx.lineTo(triX + 5, triY);
    ctx.lineTo(triX, triY + 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  /**
   * Renders the Rhythm Doctor-inspired Sudden Screen Blackout / Blind-Beat effect.
   */
  const drawBlackoutOverlay = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    blackoutState: {
      isBlackout: boolean;
      darknessAlpha: number;
      reason: string;
      isLightsBackFlash: boolean;
    },
    currentBeat: number,
    beatProgress: number,
    timeMs: number
  ) => {
    ctx.save();

    ctx.fillStyle = `rgba(2, 3, 10, ${blackoutState.darknessAlpha})`;
    ctx.fillRect(0, 56, w, h - 120);

    const pulseRadius = 36 + (1 - beatProgress) * 28;
    ctx.strokeStyle =
      currentBeat === 6
        ? 'rgba(253, 224, 71, 0.75)'
        : currentBeat === 7
        ? 'rgba(34, 197, 94, 0.85)'
        : 'rgba(192, 132, 252, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.48, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    const blink = Math.floor(timeMs / 220) % 2 === 0;
    ctx.textAlign = 'center';
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = blink ? '#c084fc' : '#fde047';
    ctx.fillText(
      '[!] POWER OUTAGE - BLIND BEAT MODE [!]',
      w * 0.5,
      Math.floor(h * 0.45)
    );

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(
      blackoutState.reason.slice(0, 62),
      w * 0.5,
      Math.floor(h * 0.45) + 22
    );

    ctx.restore();
  };

  const handleCanvasPointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (canvas && popupHitBoxesRef.current.length > 0 && onDismissPopup) {
      const rect = canvas.getBoundingClientRect();
      // Compute actual rendered canvas area inside object-contain box
      const canvasAspect = canvas.width / canvas.height;
      const rectAspect = rect.width / rect.height;
      let renderW = rect.width;
      let renderH = rect.height;
      let offsetX = 0;
      let offsetY = 0;

      if (rectAspect > canvasAspect) {
        renderW = rect.height * canvasAspect;
        offsetX = (rect.width - renderW) / 2;
      } else {
        renderH = rect.width / canvasAspect;
        offsetY = (rect.height - renderH) / 2;
      }

      const clickX = ((e.clientX - rect.left - offsetX) / renderW) * canvas.width;
      const clickY = ((e.clientY - rect.top - offsetY) / renderH) * canvas.height;

      for (const box of popupHitBoxesRef.current) {
        if (
          clickX >= box.x &&
          clickX <= box.x + box.w &&
          clickY >= box.y &&
          clickY <= box.y + box.h
        ) {
          e.stopPropagation();
          spawnParticleBurst(
            box.x + box.w / 2,
            box.y + box.h / 2,
            20,
            ['#ef4444', '#fde047', '#ffffff'],
            5
          );
          onDismissPopup(box.id);
          return;
        }
      }
    }
    onCanvasClick?.();
  };

  const currentCpuLoad = calculateCpuLoadState(
    level,
    shiftMode,
    currentBar,
    currentBeat,
    popups.length,
    forceHighCpuLoad
  );
  const currentGlitchState = getLowHealthGlitchState(
    health,
    0.9,
    0.9,
    currentCpuLoad.loadPercent
  );
  const totalLines = activeTerminalCutscene?.lines.length ?? 0;
  const hasMoreLines = terminalLineIndex < totalLines - 1;
  const choices = activeTerminalCutscene?.choices ?? [];
  const chosenOption =
    selectedTerminalChoice !== null && choices[selectedTerminalChoice]
      ? choices[selectedTerminalChoice]
      : null;

  const currentBeatMultiplier = getComboMultiplier(combo);
  const sampleLedBlink = getServerRackLedBlinkState(
    0,
    0,
    0,
    currentCpuLoad.loadPercent,
    0
  );

  return (
    <div
      className="relative w-full h-full flex items-center justify-center cursor-pointer select-none"
      onClick={handleCanvasPointerDown}
      data-glitch-active={currentGlitchState.isGlitching ? 'true' : 'false'}
      data-glitch-intensity={currentGlitchState.intensity}
      data-cpu-load={currentCpuLoad.loadPercent}
      data-led-blink-hz={sampleLedBlink.blinkHz}
    >
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        className="w-full h-full max-h-screen object-contain pixelated"
      />
      <canvas
        ref={dataStreamCanvasRef}
        data-testid="data-stream-canvas"
        data-beat-multiplier={currentBeatMultiplier}
        width={960}
        height={540}
        className="absolute inset-0 w-full h-full max-h-screen object-contain pixelated pointer-events-none"
      />

      {/* Interactive Text-Based Terminal Cutscene Overlay during Song Breaks (`cutscene` flag) */}
      {activeTerminalCutscene && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={activeTerminalCutscene.title}
        >
          <div className="w-full max-w-3xl bg-slate-950 border-2 border-emerald-400 shadow-2xl font-mono text-left overflow-hidden">
            {/* Top CRT Terminal Title Bar */}
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-emerald-950/90 border-b border-emerald-500/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-block w-2.5 h-2.5 shrink-0 bg-emerald-400 animate-pulse" />
                <span className="font-pixel text-[8px] text-emerald-300 tracking-wider whitespace-nowrap truncate">
                  {activeTerminalCutscene.title}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-pixel text-[8px] text-amber-300 whitespace-nowrap">
                  CUTSCENE ACTIVE
                </span>
                {onSkipTerminalCutscene && (
                  <button
                    type="button"
                    onClick={onSkipTerminalCutscene}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-600 hover:border-amber-400 text-slate-300 hover:text-amber-300 font-pixel text-[8px] whitespace-nowrap transition"
                  >
                    SKIP [S]
                  </button>
                )}
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 space-y-4">
              {/* Speaker & Prompt Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">
                    {activeTerminalCutscene.terminalPrompt}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-pixel text-[9px] text-cyan-300">
                    {activeTerminalCutscene.speaker}
                  </span>
                </div>
                <span className="font-pixel text-[8px] text-slate-400">
                  [{activeTerminalCutscene.role}]
                </span>
              </div>

              {/* Multi-Line Interactive Terminal Dialogue Output */}
              <div className="space-y-2.5 min-h-[84px] bg-black/70 p-3.5 border border-slate-800">
                {activeTerminalCutscene.lines
                  .slice(0, terminalLineIndex + 1)
                  .map((line, idx) => {
                    const isLatest = idx === terminalLineIndex;
                    return (
                      <div
                        key={idx}
                        className="text-sm leading-relaxed text-emerald-200 font-mono flex items-start gap-2"
                      >
                        <span className="text-emerald-500 select-none">&gt;</span>
                        <span>
                          {line}
                          {isLatest && (
                            <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                          )}
                        </span>
                      </div>
                    );
                  })}

                {/* Executed Interactive Command & STDOUT Response */}
                {chosenOption && (
                  <div className="pt-2 mt-2 border-t border-slate-800/80 space-y-1 text-xs">
                    <div className="text-cyan-300">
                      {activeTerminalCutscene.terminalPrompt} {chosenOption.command}
                    </div>
                    <div className="text-amber-300 font-bold">
                      {chosenOption.responseLine}
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Terminal Diagnostic Command Options (when on final dialogue line) */}
              {!hasMoreLines && choices.length > 0 && (
                <div className="space-y-2">
                  <div className="font-pixel text-[8px] text-slate-400 uppercase tracking-wider">
                    SELECT INTERACTIVE TERMINAL ACTION [KEYS 1-{choices.length} OR CLICK]:
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {choices.map((choice, cIdx) => {
                      const isSelected = selectedTerminalChoice === cIdx;
                      return (
                        <button
                          key={choice.label}
                          type="button"
                          onClick={() => onSelectTerminalChoice?.(cIdx)}
                          className={`w-full text-left px-3.5 py-2.5 border transition flex flex-col gap-1 ${
                            isSelected
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900/90 border-slate-700 hover:border-cyan-400 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-[9px] text-cyan-300">
                              [{cIdx + 1}] {choice.label}
                            </span>
                            <span className="font-pixel text-[7px] text-emerald-400">
                              {isSelected ? 'EXECUTED' : 'RUN CMD'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            $ {choice.command}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Terminal Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono">
                  {hasMoreLines
                    ? `Line ${terminalLineIndex + 1} of ${totalLines} · Press SPACE or ENTER`
                    : 'Beat clock paused at song break · Ready to resume'}
                </span>
                <button
                  type="button"
                  onClick={onAdvanceTerminalCutscene}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-pixel text-[9px] font-bold tracking-wider transition shadow-lg shadow-emerald-600/30"
                >
                  {hasMoreLines
                    ? 'NEXT LINE [SPACE]'
                    : 'RESUME SHIFT [ENTER]'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
