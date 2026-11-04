import React from 'react';
import { Volume2, VolumeX, Pause, RotateCcw, Flame, Server, Cpu } from 'lucide-react';
import { LevelConfig, PopupAlert, ShiftMode } from '../game/types';
import {
  getEffectiveBpm,
  calculateCpuLoadState,
  calculateCoolingFanAudioParams,
} from '../game/rules';
import { Locale, UI_TEXT } from '../game/i18n';

interface HUDProps {
  locale?: Locale;
  onToggleLocale?: () => void;
  level: LevelConfig;
  shiftMode: ShiftMode;
  health: number;
  score: number;
  combo: number;
  maxCombo: number;
  currentBeat: number;
  currentBar: number;
  totalBars: number;
  recentDeltas: number[];
  isMuted: boolean;
  popups: PopupAlert[];
  forceHighCpuLoad?: boolean;
  twoPlayerMode?: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onDismissPopup: (id: number) => void;
  onDefibrillate: () => void;
  onOpenTerminalCutscene?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  locale = 'zh',
  onToggleLocale,
  level,
  shiftMode,
  health,
  score,
  combo,
  currentBeat,
  currentBar,
  totalBars,
  recentDeltas = [],
  isMuted,
  popups,
  forceHighCpuLoad = false,
  twoPlayerMode = false,
  onToggleMute,
  onPause,
  onRestart,
  onDismissPopup,
  onDefibrillate,
  onOpenTerminalCutscene,
}) => {
  const ui = UI_TEXT[locale];
  const isGlitchState = health < 20;
  const healthPercent = Math.max(0, Math.min(100, health));
  const incidentProgressPct = Math.max(
    4,
    Math.min(100, Math.round(((currentBar + 1) / Math.max(1, totalBars)) * 100))
  );
  const effectiveBpm = getEffectiveBpm(level.bpm, shiftMode);
  const latestDelta = recentDeltas.length > 0 ? recentDeltas[recentDeltas.length - 1] : null;

  // Real-time CPU Load computed from the current song's rhythmic complexity
  const cpuLoad = calculateCpuLoadState(
    level,
    shiftMode,
    currentBar,
    currentBeat,
    popups.length,
    forceHighCpuLoad
  );
  const coolingFan = calculateCoolingFanAudioParams(
    cpuLoad.loadPercent,
    true,
    isMuted
  );
  const isCpuOverload = cpuLoad.loadPercent >= 85;

  const cpuBarColor =
    cpuLoad.tier === 'overload'
      ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
      : cpuLoad.tier === 'high'
      ? 'bg-amber-400'
      : cpuLoad.tier === 'elevated'
      ? 'bg-cyan-400'
      : 'bg-emerald-400';

  const activeBeatmapSection = level.beatmapStructure?.find(
    (s) => currentBar >= s.startBar && currentBar <= s.endBar
  );
  const currentBeatmapHit = level.beatmapHits?.[currentBar];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between px-3 py-1.5 font-pixel select-none">
      {/* Top Server Room NOC Telemetry Bar (Occupies y = 0..58 above the Server Rack Bays) */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Top-Left: Cluster Uptime Integrity + Real-Time CPU Load Rack Telemetry Modules */}
        <div className="flex items-stretch gap-2 pointer-events-auto">
          {/* Module 1: Dual Segmented Ruler Bars (Rhythm Doctor-inspired FAULT Progress + RACK Stability) */}
          <div
            data-testid="hud-dual-bars"
            className="flex flex-col justify-between bg-[#060a14]/95 border-2 border-slate-700 px-2.5 py-1 shadow-[0_3px_0_#020617] w-52 sm:w-60"
          >
            {/* Bar 1: FAULT / SONG PROGRESS (Purple/Magenta Segmented Ruler) */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[7px] font-bold text-fuchsia-300 w-12 shrink-0">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_6px_#e879f9] inline-block" />
                <span>{ui.faultBar}</span>
              </span>
              <div className="relative flex-1 h-2.5 bg-slate-950 border border-slate-600 overflow-hidden flex items-center">
                <div
                  className="h-full bg-gradient-to-r from-fuchsia-600 to-purple-400 transition-all duration-150"
                  style={{ width: `${Math.max(4, 100 - incidentProgressPct)}%` }}
                />
                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-[1px] ${
                        i % 2 === 0 ? 'h-full bg-white/75' : 'h-1.5 self-end bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[7px] text-fuchsia-200 font-mono tabular-nums w-9 text-right">
                {Math.min(totalBars, currentBar + 1)}/{totalBars}
              </span>
            </div>

            {/* Bar 2: RACK / ENGINEER STABILITY (Cyan/Emerald Segmented Ruler) */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[7px] font-bold w-12 shrink-0 ${
                  isGlitchState ? 'text-red-400 animate-pulse' : 'text-cyan-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isGlitchState
                      ? 'bg-red-500 shadow-[0_0_6px_#ef4444]'
                      : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
                  }`}
                />
                <span>{ui.rackBar}</span>
              </span>
              <div className="relative flex-1 h-2.5 bg-slate-950 border border-slate-600 overflow-hidden flex items-center">
                <div
                  className={`h-full transition-all duration-150 ${
                    healthPercent > 50
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      : healthPercent > 20
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${healthPercent}%` }}
                />
                <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-[1px] ${
                        i % 2 === 0 ? 'h-full bg-white/75' : 'h-1.5 self-end bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[7px] text-cyan-200 font-mono tabular-nums w-9 text-right">
                {healthPercent.toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[6px] text-slate-400 font-mono mt-0.5">
              <span className="text-cyan-400 font-bold">
                <Server className="w-2 h-2 inline mr-0.5" />
                {level.wardNumber} · {effectiveBpm}BPM
              </span>
              <span>
                {isGlitchState ? '502 CRIT' : '200 OK'} · {incidentProgressPct}% SYNCED
              </span>
            </div>
          </div>

          {/* Module 2: Real-Time CPU Load Bar (Rhythmic Complexity + Server Cooling Fan + Glitch Amplifier) */}
          <div
            data-testid="cpu-load-bar"
            data-cpu-load={cpuLoad.loadPercent}
            data-cpu-tier={cpuLoad.tier}
            data-fan-rpm={coolingFan.fanRpm}
            data-cooling-gain={coolingFan.gain}
            className={`flex flex-col justify-between bg-[#060a14]/95 border-2 px-2.5 py-1 shadow-[0_3px_0_#020617] w-48 sm:w-56 transition-colors ${
              isCpuOverload ? 'border-rose-500/90' : 'border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-[7px]">
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  isCpuOverload ? 'text-rose-400 animate-pulse' : 'text-cyan-300'
                }`}
              >
                <Cpu className="w-2.5 h-2.5" />
                <span>{ui.cpuLoad}</span>
              </span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  isCpuOverload
                    ? 'text-rose-400'
                    : cpuLoad.tier === 'high'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {cpuLoad.loadPercent}% · {coolingFan.fanRpm}RPM
              </span>
            </div>

            {/* Segmented 12-Core CPU Load Meter */}
            <div className="relative w-full h-2 bg-slate-950 border border-slate-700 overflow-hidden flex items-center my-0.5">
              <div
                className={`h-full transition-all duration-150 ${cpuBarColor}`}
                style={{ width: `${cpuLoad.loadPercent}%` }}
              />
              <div className="absolute inset-0 flex justify-between px-1 pointer-events-none">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} className="w-[1px] h-full bg-slate-950/75" />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[7px] font-mono">
              <span
                className={
                  isCpuOverload
                    ? 'text-rose-300 font-bold'
                    : 'text-slate-400'
                }
              >
                {cpuLoad.complexityLabel}
              </span>
              {cpuLoad.glitchAmplifier > 0 ? (
                <span className="text-amber-300 font-bold">
                  GLITCH +{(cpuLoad.glitchAmplifier * 100).toFixed(0)}%
                </span>
              ) : (
                <span className="text-cyan-400/80">
                  COOLING {coolingFan.cutoffHz}HZ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Center: 7-Step Bus Clock Beat Indicator (1-2-3-4-5-6-[GC]) + Beatmap Section */}
        <div className="hidden xl:flex flex-col items-center bg-[#060a14]/95 border-2 border-slate-700 px-2.5 py-1 shadow-[0_3px_0_#020617]">
          <div
            data-testid="hud-beatmap-section"
            className="text-[7px] text-slate-400 tracking-wider mb-0.5 font-mono flex items-center gap-1.5"
          >
            {activeBeatmapSection ? (
              <>
                <span className="text-emerald-400 font-bold">
                  {activeBeatmapSection.label}
                </span>
                {level.beatmapChords && (
                  <span className="text-cyan-300">[{level.beatmapChords}]</span>
                )}
                {currentBeatmapHit && (
                  <span className="text-amber-300">
                    HIT #{currentBar + 1} @{currentBeatmapHit.time_sec.toFixed(2)}s
                  </span>
                )}
              </>
            ) : (
              <span>{locale === 'zh' ? '7拍共鸣时钟' : '7-BEAT GC BUS CLOCK'}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7].map((b) => {
              const isActive = currentBeat === b;
              const isSeventh = b === 7;
              return (
                <div
                  key={b}
                  className={`px-1.5 py-0.5 text-[8px] font-bold border transition-all ${
                    isSeventh
                      ? isActive
                        ? 'bg-amber-400 text-slate-950 border-white scale-110 shadow-[0_0_8px_#fbbf24]'
                        : 'bg-amber-950/80 text-amber-300 border-amber-500/70'
                      : isActive
                      ? 'bg-cyan-400 text-slate-950 border-white'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {isSeventh ? '7:GC' : b}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Right Cluster: Score + Utility Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-2 bg-[#060a14]/95 border-2 border-slate-700 px-2.5 py-1.5 text-[8px] shadow-[0_3px_0_#020617]">
            <span className="text-emerald-400 font-bold tabular-nums">
              {ui.score} {score}
            </span>
            {combo > 1 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 font-bold">
                {combo}x
              </span>
            )}
          </div>

          {onToggleLocale && (
            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleLocale();
              }}
              tabIndex={-1}
              className="px-2 py-1.5 bg-indigo-950/95 border-2 border-indigo-400 text-indigo-100 text-[8px] font-bold hover:bg-indigo-900 transition cursor-pointer shadow-[0_3px_0_#020617]"
              title="Switch Language / 切换语言"
            >
              {locale === 'zh' ? '中/EN' : 'EN/中'}
            </button>
          )}

          {level.cutscene && onOpenTerminalCutscene && (
            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenTerminalCutscene();
              }}
              tabIndex={-1}
              className="px-2 py-1.5 bg-slate-900/95 border-2 border-emerald-500/70 text-emerald-300 text-[8px] font-bold hover:bg-emerald-950 transition cursor-pointer shadow-[0_3px_0_#020617]"
              title="Open Interactive SSH Incident Log [T]"
            >
              {ui.sshLog}
            </button>
          )}
          {popups.length > 0 && (
            <button
              onClick={(e) => {
                e.currentTarget.blur();
                onDismissPopup(popups[0].id);
              }}
              tabIndex={-1}
              className="px-2 py-1.5 bg-red-950 border-2 border-red-500 text-amber-300 text-[8px] font-bold animate-pulse hover:bg-red-900 transition flex items-center gap-1 cursor-pointer shadow-[0_3px_0_#020617]"
              title="Click to dismiss in-track kernel panic alert"
            >
              <Flame className="w-3 h-3 text-red-400" />
              <span>KILL [{popups.length}]</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            tabIndex={-1}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1.5 bg-slate-900/95 border-2 border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition text-slate-300 hover:text-white cursor-pointer shadow-[0_3px_0_#020617]"
            title="Mute [M]"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            tabIndex={-1}
            aria-label="Pause Game"
            className="p-1.5 bg-slate-900/95 border-2 border-slate-700 hover:border-cyan-500 hover:bg-slate-800 transition text-slate-300 hover:text-white cursor-pointer shadow-[0_3px_0_#020617]"
            title="Pause [Esc / P]"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            tabIndex={-1}
            aria-label="Restart Level"
            className="p-1.5 bg-slate-900/95 border-2 border-slate-700 hover:border-amber-500 hover:bg-slate-800 transition text-slate-300 hover:text-white cursor-pointer shadow-[0_3px_0_#020617]"
            title="Restart [R]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Compact Bus Timing Calibration Meter & Manual GC Trigger */}
      <div className="flex items-end justify-between w-full">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-48 bg-[#060a14]/92 border border-slate-700 px-2 py-0.5 flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[7px] font-mono text-slate-400">
              <span className="text-cyan-400">{ui.early}</span>
              <span className="text-emerald-400 font-bold">
                {latestDelta !== null
                  ? `${latestDelta >= 0 ? '+' : ''}${latestDelta}ms`
                  : '0.0ms SYNC'}
              </span>
              <span className="text-amber-400">{ui.late}</span>
            </div>
            <div className="relative w-full h-1 bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40"
                style={{ left: '27.5%', width: '45%' }}
              />
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-400 -translate-x-1/2" />
              {recentDeltas.map((d, idx) => {
                const clamped = Math.max(-95, Math.min(95, d));
                const pct = 50 + (clamped / 100) * 50;
                const isLatest = idx === recentDeltas.length - 1;
                const tickColor =
                  Math.abs(d) <= 45
                    ? 'bg-emerald-400'
                    : Math.abs(d) <= 95
                    ? 'bg-amber-400'
                    : 'bg-red-500';
                return (
                  <div
                    key={`${idx}-${d}`}
                    className={`absolute top-0 bottom-0 ${tickColor} ${
                      isLatest ? 'w-1 opacity-100' : 'w-0.5 opacity-45'
                    }`}
                    style={{ left: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.currentTarget.blur();
            onDefibrillate();
          }}
          className="px-3 py-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-400 text-emerald-200 text-[8px] font-bold tracking-wider transition cursor-pointer pointer-events-auto"
          title="Press SPACE on Beat 7 to Activate the Resonance Maintenance Instrument"
        >
          {twoPlayerMode ? ui.resonanceBtn2P : ui.resonanceBtn}
        </button>
      </div>
    </div>
  );
};
