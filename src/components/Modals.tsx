import React from 'react';
import { Play, RotateCcw, Home, Trophy, AlertTriangle, Sliders, Sparkles } from 'lucide-react';
import { RunStats, LevelConfig, ShiftMode } from '../game/types';
import { Locale, UI_TEXT, getLocalizedLevelInfo } from '../game/i18n';

interface PauseModalProps {
  locale?: Locale;
  score: number;
  combo: number;
  audioOffsetMs: number;
  onAdjustAudioOffset: (deltaMs: number) => void;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  locale = 'zh',
  score,
  combo,
  audioOffsetMs,
  onAdjustAudioOffset,
  onResume,
  onRestart,
  onQuitToTitle,
}) => {
  const ui = UI_TEXT[locale];
  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4 select-none font-pixel">
      <div className="w-full max-w-md bg-slate-950 pixel-box-cyan p-6 text-white text-center">
        <h2 className="text-xl text-cyan-400 mb-2 glow-cyan">{ui.pauseTitle}</h2>
        <p className="text-[10px] text-slate-400 font-mono mb-5">
          {ui.pauseSubtitle}
        </p>

        {/* Current Run Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-900/80 p-3 border border-slate-800 text-[10px]">
          <div>
            <div className="text-slate-500 mb-1">{ui.score}</div>
            <div className="text-cyan-300 font-bold tabular-nums text-sm">{score}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">COMBO</div>
            <div className="text-amber-400 font-bold tabular-nums text-sm">{combo}</div>
          </div>
        </div>

        {/* Mid-Game Audio Latency Calibration */}
        <div className="mb-5 bg-slate-900/60 border border-slate-800 p-2.5 flex items-center justify-between text-[9px] font-mono">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            {locale === 'zh' ? '音频延迟偏移:' : 'AUDIO SYNC OFFSET:'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAdjustAudioOffset(-5)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600"
            >
              -5ms
            </button>
            <span className="text-white font-bold tabular-nums min-w-[44px]">
              {audioOffsetMs >= 0 ? `+${audioOffsetMs}ms` : `${audioOffsetMs}ms`}
            </span>
            <button
              onClick={() => onAdjustAudioOffset(5)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600"
            >
              +5ms
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs flex items-center justify-center gap-2 border-2 border-cyan-300 transition"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{ui.resumeBtn}</span>
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-2 border border-slate-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{ui.restartBtn}</span>
          </button>
          <button
            onClick={onQuitToTitle}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
          >
            <Home className="w-4 h-4" />
            <span>{ui.abortToTitle}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  locale?: Locale;
  level: LevelConfig;
  shiftMode: ShiftMode;
  stats: RunStats;
  isNewRecord?: boolean;
  onNextLevel: () => void;
  onRetry: () => void;
  onQuitToTitle: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  locale = 'zh',
  level,
  shiftMode,
  stats,
  isNewRecord = false,
  onNextLevel,
  onRetry,
  onQuitToTitle,
}) => {
  const ui = UI_TEXT[locale];
  const locLvl = getLocalizedLevelInfo(level, locale);
  const rankColors: Record<RunStats['rank'], string> = {
    'S+': 'text-amber-300 border-amber-300 bg-amber-500/10 shadow-[0_0_25px_rgba(251,191,36,0.85)]',
    S: 'text-amber-400 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]',
    A: 'text-emerald-400 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]',
    B: 'text-cyan-400 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    C: 'text-purple-400 border-purple-400',
    F: 'text-red-500 border-red-500',
  };

  const accuracy =
    stats.totalNotes > 0
      ? Math.round(((stats.perfectCount * 1.0 + stats.goodCount * 0.5) / stats.totalNotes) * 100)
      : 100;

  return (
    <div className="absolute inset-0 z-40 bg-black/85 flex items-center justify-center p-4 select-none font-pixel">
      <div className="w-full max-w-lg bg-slate-950 pixel-box-green p-6 text-white text-center">
        <div className="flex items-center justify-center gap-2 text-emerald-400 mb-1 glow-green">
          <Trophy className="w-5 h-5" />
          <h2 className="text-lg md:text-xl">{ui.victoryTitle}</h2>
        </div>
        <p className="text-[10px] text-slate-400 font-mono mb-2">
          {level.wardNumber} ({locLvl.rackRow || 'Row A'}) ·{' '}
          {shiftMode === 'night'
            ? locale === 'zh'
              ? '夜班超频'
              : 'NIGHT SHIFT'
            : locale === 'zh'
            ? '标准值班'
            : 'STANDARD SHIFT'}{' '}
          · {locLvl.name.toUpperCase()}
        </p>

        {shiftMode === 'night' && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 bg-purple-950/70 border border-purple-400 text-purple-200 text-[8px] font-mono">
            <span>
              {locale === 'zh'
                ? '★ 夜班称号解锁：共鸣大师 ★'
                : '★ NIGHT SHIFT TITLE UNLOCKED: RESONANCE MASTER ★'}
            </span>
          </div>
        )}

        {isNewRecord && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 bg-amber-500/20 border border-amber-400 text-amber-300 text-[9px] font-bold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {locale === 'zh'
                ? '★ 刷新本机柜最高抢修纪录！ ★'
                : '★ NEW PERSONAL SERVER BAY RECORD! ★'}
            </span>
          </div>
        )}

        {/* People Behind the Machine & Duty Log Message */}
        {(locLvl.serviceUser || locLvl.onSuccessMessage) && (
          <div
            data-testid="victory-duty-log"
            className="mb-3 bg-emerald-950/35 border border-emerald-500/50 px-3 py-2 text-left font-mono text-[9px]"
          >
            {locLvl.serviceUser && (
              <div className="text-cyan-300 mb-1">
                <span className="text-slate-400">{ui.behindMachine} </span>
                <span>{locLvl.serviceUser}</span>
              </div>
            )}
            {locLvl.onSuccessMessage && (
              <div className="text-emerald-300 font-bold">
                &gt; &ldquo;{locLvl.onSuccessMessage}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* F-3 Daybreak Finale Epilogue Messages */}
        {level.epilogueMessages && level.epilogueMessages.length > 0 && (
          <div
            data-testid="daybreak-epilogue-box"
            className="mb-3 bg-slate-900/95 border-2 border-amber-400/80 p-3 text-left font-mono text-[9px] space-y-1"
          >
            <div className="text-amber-300 font-bold text-[8px] tracking-wider uppercase mb-1">
              {locale === 'zh'
                ? '临海市 · 天亮后的机房留言：'
                : 'LINHAI CITY · DAYBREAK MESSAGES RECEIVED:'}
            </div>
            {level.epilogueMessages.map((msg, idx) => (
              <div key={idx} className="text-emerald-300">
                •{' '}
                {typeof msg === 'string' ? (
                  <span>&ldquo;{msg}&rdquo;</span>
                ) : (
                  <>
                    <span className="text-cyan-300 font-bold">{msg.sender}: </span>
                    <span>&ldquo;{msg.text}&rdquo;</span>
                  </>
                )}
              </div>
            ))}
            <div className="pt-1.5 mt-1.5 border-t border-slate-700 text-amber-200 font-bold text-center text-[10px]">
              {locale === 'zh'
                ? '“你修的不是机器，是机器背后的人。”'
                : '“What you repair isn’t the machine — it’s the people behind it.”'}
            </div>
          </div>
        )}

        {/* Big Rank Badge */}
        <div className="my-2 flex justify-center items-center">
          <div
            className={`w-16 h-16 flex items-center justify-center text-2xl font-extrabold border-4 ${
              rankColors[stats.rank]
            }`}
          >
            {stats.rank}
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2.5 border border-slate-800 text-[9px] mb-3">
          <div className="p-1 border-r border-slate-800">
            <div className="text-slate-500 mb-0.5">{ui.score}</div>
            <div className="text-emerald-400 text-sm font-bold tabular-nums">{stats.score}</div>
          </div>
          <div className="p-1 border-r border-slate-800">
            <div className="text-slate-500 mb-0.5">{locale === 'zh' ? '准度' : 'ACCURACY'}</div>
            <div className="text-cyan-400 text-sm font-bold tabular-nums">{accuracy}%</div>
          </div>
          <div className="p-1">
            <div className="text-slate-500 mb-0.5">MAX COMBO</div>
            <div className="text-amber-400 text-sm font-bold tabular-nums">{stats.maxCombo}</div>
          </div>
        </div>

        {/* Hit & Timing Breakdown */}
        <div className="flex flex-col gap-1 text-[9px] font-mono text-slate-400 mb-4 bg-black/60 p-2 border border-slate-900">
          <div className="flex justify-around">
            <div>
              PERFECT: <span className="text-emerald-400 font-bold">{stats.perfectCount}</span>
            </div>
            <div>
              GOOD: <span className="text-amber-400 font-bold">{stats.goodCount}</span>
            </div>
            <div>
              MISS: <span className="text-red-400 font-bold">{stats.missCount}</span>
            </div>
            <div>
              JITTER: <span className="text-cyan-400 font-bold">±{Math.abs(stats.averageDeltaMs).toFixed(0)}ms</span>
            </div>
          </div>
          <div className="flex justify-around pt-1 border-t border-slate-900 text-[8px]">
            <div>
              EARLY (-ms): <span className="text-cyan-300 font-bold">{stats.earlyCount || 0}</span>
            </div>
            <div>
              LATE (+ms): <span className="text-amber-300 font-bold">{stats.lateCount || 0}</span>
            </div>
            <div>
              BLIND OBSTRUCTION HITS:{' '}
              <span className="text-fde047 text-amber-300 font-bold">{stats.blindHitCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onNextLevel}
            data-start="true"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 border-2 border-emerald-300 transition"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>{ui.nextRackBtn}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{ui.retryBtn}</span>
            </button>
            <button
              onClick={onQuitToTitle}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center gap-1.5 border border-slate-800 transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{ui.serverBaySelect}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  locale?: Locale;
  level: LevelConfig;
  stats: RunStats;
  onRetry: () => void;
  onQuitToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  locale = 'zh',
  level,
  stats,
  onRetry,
  onQuitToTitle,
}) => {
  const ui = UI_TEXT[locale];
  const locLvl = getLocalizedLevelInfo(level, locale);
  return (
    <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4 select-none font-pixel">
      <div className="w-full max-w-md bg-slate-950 pixel-box-red p-6 text-white text-center">
        <div className="flex items-center justify-center gap-2 text-red-500 mb-1 glow-red">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <h2 className="text-lg md:text-xl">{ui.gameOverTitle}</h2>
        </div>
        <p className="text-[10px] text-red-400 font-mono mb-4">
          {ui.gameOverSubtitle}
        </p>

        {/* Spoof Incident Postmortem */}
        <div className="bg-red-950/30 border border-red-900/60 p-3 text-left font-mono text-[9px] text-slate-300 mb-6 leading-relaxed">
          <div className="text-red-400 font-bold mb-1">
            {locale === 'zh' ? '故障根因诊断报告:' : 'INCIDENT ROOT CAUSE:'}
          </div>
          <div>
            • {locale === 'zh' ? '目标机柜:' : 'Target Rack:'} {locLvl.rackRow} ({level.serverType})
          </div>
          <div>
            • {locale === 'zh' ? '致命错误: 第 7 拍共鸣合闸连续失误' : 'Fatal: GC pulse missed on 7th Bus Clock Cycle'}
          </div>
          <div>
            • {locale === 'zh' ? '影响服务:' : 'Result:'} {locLvl.serviceUser}
          </div>
        </div>

        {/* Stats before crash */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-900/80 p-3 border border-slate-800 text-[10px]">
          <div>
            <div className="text-slate-500 mb-1">{ui.score}</div>
            <div className="text-red-400 font-bold tabular-nums text-sm">{stats.score}</div>
          </div>
          <div>
            <div className="text-slate-500 mb-1">MAX COMBO</div>
            <div className="text-amber-400 font-bold tabular-nums text-sm">{stats.maxCombo}</div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            data-start="true"
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{ui.rebootRetryBtn}</span>
          </button>
          <button
            onClick={onQuitToTitle}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center gap-1.5 border border-slate-800 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{ui.serverBaySelect}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

