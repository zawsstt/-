import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Flame,
  Sun,
  Sliders,
  Disc,
  Wrench,
  Star,
  Server,
  ChevronLeft,
  ChevronRight,
  X,
  Terminal,
  Users,
  User,
  ShieldAlert,
  HeartHandshake,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  BeatPatternType,
  ChapterId,
  CustomLevelParams,
  LevelConfig,
  MusicTrackId,
  ShiftMode,
  StageBackdropId,
  WardProgress,
} from '../game/types';
import { CHAPTER_GROUPS, LEVELS } from '../game/levels';
import {
  getEffectiveBpm,
  MUSIC_TRACK_RESERVE,
  getMusicTrackMeta,
  createCustomLevelConfig,
  isLevelUnlocked,
  getPatternLabel,
} from '../game/rules';
import {
  Locale,
  UI_TEXT,
  getLocalizedChapterMeta,
  getLocalizedLevelInfo,
} from '../game/i18n';
import { soundEngine } from '../game/sound';

interface TitleScreenProps {
  locale: Locale;
  onToggleLocale: () => void;
  selectedLevel: LevelConfig;
  shiftMode: ShiftMode;
  twoPlayerMode: boolean;
  selectedTrackId: MusicTrackId | null;
  wardProgress: WardProgress;
  onSelectLevel: (level: LevelConfig) => void;
  onSelectShiftMode: (mode: ShiftMode) => void;
  onToggleTwoPlayerMode: () => void;
  onSelectTrackId: (trackId: MusicTrackId | null) => void;
  onAdjustAudioOffset: (deltaMs: number) => void;
  onStartGame: (customLevel?: LevelConfig) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  locale,
  onToggleLocale,
  selectedLevel,
  shiftMode,
  twoPlayerMode,
  selectedTrackId,
  wardProgress,
  onSelectLevel,
  onSelectShiftMode,
  onToggleTwoPlayerMode,
  onSelectTrackId,
  onAdjustAudioOffset,
  onStartGame,
  isMuted,
  onToggleMute,
}) => {
  const ui = UI_TEXT[locale];
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [freePlayUnlocked, setFreePlayUnlocked] = useState(true);
  const [calibrationStatus, setCalibrationStatus] = useState<string>(
    locale === 'zh'
      ? '在第 4 声提示音时按下校准键，自动测量设备音频延迟'
      : 'Tap on the 4th beat to auto-calibrate device latency'
  );
  const calibrationTargetSecRef = useRef<number | null>(null);

  // Built-in Server Bay Stage Builder State
  const [editorParams, setEditorParams] = useState<CustomLevelParams>({
    title: 'Row Z // Custom Resonance Repair',
    patientName: 'Lingering Process (Custom)',
    bpm: 116,
    totalBars: 8,
    musicTrackId: 'track_ddos_megalovania',
    stageBackdrop: 'er_ward',
    pattern: 'off_beat',
    panelCount: 1,
    reversedRow: false,
    enableBlackout: false,
    enablePopups: false,
  });

  const activeChapterId: ChapterId = selectedLevel.chapterId || 'prologue';
  const activeChapter =
    CHAPTER_GROUPS.find((c) => c.id === activeChapterId) || CHAPTER_GROUPS[0];
  const localizedActiveChapter = getLocalizedChapterMeta(activeChapterId, locale);
  const localizedSelectedLevel = getLocalizedLevelInfo(selectedLevel, locale);
  const chapterLevels = LEVELS.filter(
    (l) => (l.chapterId || 'prologue') === activeChapterId
  );

  const activeTrackId = selectedTrackId || selectedLevel.musicTrackId;
  const activeTrackMeta = getMusicTrackMeta(activeTrackId);
  const currentIdx = Math.max(
    0,
    LEVELS.findIndex((l) => l.id === selectedLevel.id)
  );
  const rec = wardProgress.records[`${selectedLevel.id}:${shiftMode}`];
  const effectiveBpm = getEffectiveBpm(selectedLevel.bpm, shiftMode);
  const isCurrentUnlocked = isLevelUnlocked(
    currentIdx,
    LEVELS,
    wardProgress,
    shiftMode,
    freePlayUnlocked
  );

  const handleSelectChapter = (chapterId: ChapterId) => {
    const firstInChapter = LEVELS.find((l) => l.chapterId === chapterId);
    if (firstInChapter) {
      onSelectLevel(firstInChapter);
    }
  };

  const handleCycleBay = (dir: -1 | 1) => {
    const nextIdx = (currentIdx + dir + LEVELS.length) % LEVELS.length;
    onSelectLevel(LEVELS[nextIdx]);
  };

  const handleLaunchCustomLevel = () => {
    const customLvl = createCustomLevelConfig(editorParams);
    setShowEditorModal(false);
    onStartGame(customLvl);
  };

  const handleStartCalibrationTest = () => {
    soundEngine.ensureRunning();
    const now = soundEngine.getAudioTime();
    const interval = 0.5; // 120 BPM reference pulse
    for (let step = 1; step <= 4; step++) {
      soundEngine.playCountInTick(step, now + step * interval);
    }
    calibrationTargetSecRef.current = now + 4 * interval;
    setCalibrationStatus(
      locale === 'zh'
        ? '正在监听... 请在第 4 声提示音时点击【立即敲击】！'
        : 'Listening... Press [TAP NOW] on the 4th chime!'
    );
  };

  const handleTapCalibration = () => {
    if (calibrationTargetSecRef.current === null) {
      handleStartCalibrationTest();
      return;
    }
    const now = soundEngine.getAudioTime();
    const rawDeltaMs = Math.round((now - calibrationTargetSecRef.current) * 1000);
    const clampedDelta = Math.max(-60, Math.min(60, rawDeltaMs));
    const adjustment = clampedDelta - wardProgress.audioOffsetMs;
    onAdjustAudioOffset(adjustment);
    calibrationTargetSecRef.current = null;
    setCalibrationStatus(
      locale === 'zh'
        ? `校准完成！测得设备偏移 ${clampedDelta >= 0 ? `+${clampedDelta}` : clampedDelta}ms。`
        : `Calibrated! Measured ${clampedDelta >= 0 ? `+${clampedDelta}` : clampedDelta}ms device offset.`
    );
  };

  const uniquePatterns = Array.from(
    new Set(
      selectedLevel.phases.flatMap((p) =>
        p.panels.map((pan) => getPatternLabel(pan.pattern))
      )
    )
  ).join(' + ');

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-3.5 sm:p-4 font-pixel select-none text-white pointer-events-none">
      {/* TOP BAR: Chaosheng Data Center Title Lockup (Left) + Fictional Disclaimer & Utility Deck (Right) */}
      <div className="flex flex-wrap items-start justify-between gap-2.5 w-full">
        {/* Top-Left Custom SVG Title Emblem */}
        <div className="flex items-center gap-3 bg-[#060a14]/94 border-2 border-cyan-400 px-3.5 py-2 shadow-[0_4px_0_#020617] pointer-events-auto">
          <svg
            viewBox="0 0 44 44"
            className="w-10 h-10 shrink-0"
            shapeRendering="crispEdges"
          >
            <rect
              x="2"
              y="2"
              width="40"
              height="40"
              fill="#0f172a"
              stroke="#22d3ee"
              strokeWidth="2"
            />
            <rect x="7" y="8" width="30" height="6" fill="#1e293b" />
            <rect x="9" y="10" width="4" height="2" fill="#10b981" />
            <rect x="15" y="10" width="4" height="2" fill="#10b981" />
            <rect x="31" y="10" width="4" height="2" fill="#38bdf8" />
            <rect x="7" y="17" width="30" height="6" fill="#1e293b" />
            <rect x="9" y="19" width="4" height="2" fill="#f59e0b" />
            <rect x="15" y="19" width="4" height="2" fill="#ef4444" />
            <rect x="31" y="19" width="4" height="2" fill="#ef4444" />
            <polyline
              points="6,33 15,33 19,26 23,39 27,24 31,33 38,33"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
            />
          </svg>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block w-2 h-2 bg-emerald-400 animate-ping" />
              <h1 className="text-xs sm:text-sm text-white font-bold tracking-wider drop-shadow-[0_2px_0_#0f172a]">
                {ui.gameTitle}
              </h1>
              <span className="px-1.5 py-0.5 bg-cyan-950 border border-cyan-400 text-[7px] text-cyan-200">
                {ui.dataCenterBadge}
              </span>
            </div>
            <p className="text-[7px] text-emerald-300 tracking-wider mt-1 font-mono">
              {ui.gameSubtitle}
            </p>
            <p
              data-testid="fictional-disclaimer"
              className="text-[7px] text-amber-300/90 font-mono mt-0.5 flex items-center gap-1"
            >
              <ShieldAlert className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span>{ui.fictionalDisclaimer}</span>
            </p>
          </div>
        </div>

        {/* Top-Right Utility Controls (Language Toggle, Featured OST Levels 1-1, 1-2, 1-3 Launch, 1P/2P Co-Op, Progression Gate, Stage Builder, Audio & BGM, Mute) */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleLocale}
            data-testid="lang-toggle"
            className="flex items-center gap-1.5 px-2.5 py-2 bg-indigo-950/95 border-2 border-indigo-400 hover:bg-indigo-900 text-[8px] text-indigo-100 font-bold transition cursor-pointer shadow-[0_3px_0_#020617]"
            title="Switch Language / 切换中英文"
          >
            <span>{ui.langLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const lvl11 =
                LEVELS.find((l) => l.id === 'c1_1_hesitating_message') || LEVELS[0];
              setFreePlayUnlocked(true);
              onSelectLevel(lvl11);
              onStartGame(lvl11);
            }}
            data-testid="launch-ost-1-1"
            className="flex items-center gap-1.5 px-2 py-2 bg-cyan-950/95 border-2 border-cyan-400 hover:bg-cyan-900 text-[8px] text-cyan-200 font-bold transition cursor-pointer shadow-[0_3px_0_#020617]"
            title="Play 1-1: The Message Written & Deleted (Samurai Techno OST · 130 BPM · 76s)"
          >
            <Disc className="w-3.5 h-3.5 text-cyan-300" />
            <span>{locale === 'zh' ? '★ 1-1 原声 (76秒)' : '★ 1-1 OST (76S)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const featured =
                LEVELS.find((l) => l.id === 'c1_2_delivery_orders') || LEVELS[0];
              setFreePlayUnlocked(true);
              onSelectLevel(featured);
              onStartGame(featured);
            }}
            data-testid="launch-featured-beatmap"
            className="flex items-center gap-1.5 px-2 py-2 bg-emerald-950/95 border-2 border-emerald-400 hover:bg-emerald-900 text-[8px] text-emerald-200 font-bold transition cursor-pointer shadow-[0_3px_0_#020617]"
            title="Play 1-2: Peak-Hour Delivery Orders (高峰期的外卖单 · 112 BPM · 137s)"
          >
            <Disc className="w-3.5 h-3.5 text-emerald-300" />
            <span>{locale === 'zh' ? '★ 1-2 外卖单 (137秒)' : '★ 1-2 OST (137S)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const lvl13 =
                LEVELS.find((l) => l.id === 'c1_3_wobbly_fan') || LEVELS[0];
              setFreePlayUnlocked(true);
              onSelectLevel(lvl13);
              onStartGame(lvl13);
            }}
            data-testid="launch-ost-1-3"
            className="flex items-center gap-1.5 px-2 py-2 bg-fuchsia-950/95 border-2 border-fuchsia-400 hover:bg-fuchsia-900 text-[8px] text-fuchsia-200 font-bold transition cursor-pointer shadow-[0_3px_0_#020617]"
            title="Play 1-3: Sleepless Night Radio & Old Fan (东方不眠夜 · Battleworn Insomniac OST · 100 BPM · 161s)"
          >
            <Disc className="w-3.5 h-3.5 text-fuchsia-300" />
            <span>{locale === 'zh' ? '★ 1-3 东方不眠夜 (161秒)' : '★ 1-3 BOSS OST (161S)'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTwoPlayerMode}
            data-testid="toggle-2p-button"
            className={`flex items-center gap-1.5 px-2.5 py-2 border-2 text-[8px] transition cursor-pointer shadow-[0_3px_0_#020617] ${
              twoPlayerMode
                ? 'bg-purple-950/95 border-purple-400 text-purple-200 font-bold'
                : 'bg-[#060a14]/92 border-slate-600 hover:border-purple-400 text-slate-200'
            }`}
            title="Two-Player Mode: P1 [SPACE] takes Track 1, P2 [ENTER/J] takes Track 2"
          >
            {twoPlayerMode ? (
              <>
                <Users className="w-3.5 h-3.5 text-purple-300" />
                <span>{ui.coop2P}</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-cyan-300" />
                <span>{ui.solo1P}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFreePlayUnlocked((prev) => !prev)}
            data-testid="toggle-progression-gate"
            className={`flex items-center gap-1.5 px-2.5 py-2 border-2 text-[8px] transition cursor-pointer shadow-[0_3px_0_#020617] ${
              freePlayUnlocked
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                : 'bg-slate-900/95 border-amber-400 text-amber-200'
            }`}
            title="Toggle Rank B Progression Gate vs. Free-Play All 20 Levels"
          >
            {freePlayUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                <span>{ui.freePlay}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>{ui.rankBGate}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowEditorModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-amber-950/90 border-2 border-amber-400 hover:bg-amber-900 text-[8px] text-amber-200 transition cursor-pointer shadow-[0_3px_0_#020617]"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-300" />
            <span>{ui.stageBuilder}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAudioDrawer((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-[#060a14]/92 border-2 border-slate-600 hover:border-cyan-400 text-[8px] text-slate-200 transition cursor-pointer shadow-[0_3px_0_#020617]"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{ui.calibrateBgm}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-[#060a14]/92 border-2 border-slate-600 hover:border-emerald-400 text-[8px] text-slate-200 transition cursor-pointer shadow-[0_3px_0_#020617]"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isMuted ? ui.muted : ui.soundOn}</span>
          </button>
        </div>
      </div>

      {/* CENTER VIEWPORT: Open Cold-Aisle 42U Data Center Showcase */}

      {/* BOTTOM CONSOLE DOCK: 6-Chapter Selector + Chapter Levels + Duty Briefing + START SHIFT */}
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-1.5 pointer-events-auto">
        {/* Row 1: 6-Chapter Tabs (Prologue + Chapters 1–4 + Finale) */}
        <div
          className="grid grid-cols-3 sm:grid-cols-6 gap-1"
          role="tablist"
          aria-label="Campaign Chapters"
        >
          {CHAPTER_GROUPS.map((ch) => {
            const isChActive = ch.id === activeChapterId;
            const lvlsInCh = LEVELS.filter((l) => l.chapterId === ch.id);
            const clearedCount = lvlsInCh.filter(
              (l) => wardProgress.records[`${l.id}:${shiftMode}`]?.cleared
            ).length;
            const locCh = getLocalizedChapterMeta(ch.id, locale);
            return (
              <button
                key={ch.id}
                type="button"
                role="tab"
                data-testid={`chapter-tab-${ch.id}`}
                aria-selected={isChActive}
                onClick={() => handleSelectChapter(ch.id)}
                className={`px-2 py-1.5 border text-left transition cursor-pointer flex items-center justify-between ${
                  isChActive
                    ? 'bg-cyan-950/95 border-cyan-400 text-white'
                    : 'bg-[#060a14]/90 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <span className="text-[7px] font-bold tracking-wider truncate">
                  {locCh.code}
                </span>
                <span className="text-[7px] font-mono text-emerald-300 ml-1">
                  {clearedCount}/{lvlsInCh.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Levels within the Active Chapter */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
          data-testid="chapter-level-list"
        >
          {chapterLevels.map((lvl) => {
            const globalIdx = LEVELS.findIndex((x) => x.id === lvl.id);
            const isSel = selectedLevel.id === lvl.id;
            const bayRec = wardProgress.records[`${lvl.id}:${shiftMode}`];
            const unlocked = isLevelUnlocked(
              globalIdx,
              LEVELS,
              wardProgress,
              shiftMode,
              freePlayUnlocked
            );
            const locLvl = getLocalizedLevelInfo(lvl, locale);
            return (
              <button
                key={lvl.id}
                type="button"
                data-testid={`level-option-${lvl.wardNumber}`}
                onClick={() => onSelectLevel(lvl)}
                className={`px-2.5 py-1.5 border-2 text-left transition cursor-pointer flex items-center justify-between ${
                  isSel
                    ? 'bg-[#0c192e]/95 border-cyan-400 text-white shadow-[0_3px_0_#020617]'
                    : unlocked
                    ? 'bg-[#060a14]/90 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                    : 'bg-[#060a14]/75 border-slate-900 text-slate-500 hover:border-amber-500/60'
                }`}
              >
                <div className="truncate pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-cyan-300">
                      {lvl.wardNumber}
                    </span>
                    <span className="text-[7px] text-amber-300/90 font-mono truncate">
                      {locLvl.rackRow}
                    </span>
                    {lvl.externalAudioUrl && (
                      <span className="px-1 py-0.2 bg-emerald-950 border border-emerald-400 text-emerald-300 text-[6px] font-mono shrink-0">
                        {locale === 'zh' ? '原声谱面' : 'MP3+JSON'}
                      </span>
                    )}
                  </div>
                  <div className="text-[7px] text-slate-200 truncate mt-0.5 font-mono">
                    {locLvl.name.replace(/^[A-Z0-9-]+:\s*/, '')}
                  </div>
                </div>
                {bayRec?.cleared ? (
                  <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-400 text-emerald-300 text-[7px] font-bold shrink-0">
                    {bayRec.bestRank}
                  </span>
                ) : !unlocked ? (
                  <span className="px-1 py-0.5 bg-amber-950/80 border border-amber-500/60 text-amber-300 text-[6px] font-mono shrink-0">
                    NEED B
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Row 3: Selected Level Story & Service Briefing + Shift Mode + START REPAIR CTA */}
        <div className="bg-[#060a14]/95 border-2 border-slate-600 p-2.5 sm:p-3 shadow-[0_6px_24px_rgba(0,0,0,0.9)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Left: Selected Rack Spec & "People Behind the Machine" */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-950 border border-cyan-400 text-cyan-200 text-[8px] font-bold">
                <Server className="w-3 h-3 text-cyan-400" />
                <span>{localizedSelectedLevel.name}</span>
              </span>
              <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-emerald-300 text-[8px] font-mono">
                {effectiveBpm} BPM · {selectedLevel.totalBars} {locale === 'zh' ? '小节' : 'BARS'}
                {selectedLevel.durationSec ? ` · ${selectedLevel.durationSec.toFixed(0)}S` : ''}
              </span>
              {selectedLevel.externalAudioUrl && (
                <span
                  data-testid="beatmap-badge"
                  className="px-2 py-0.5 bg-emerald-950 border border-emerald-400 text-emerald-200 text-[7px] font-mono font-bold"
                >
                  {locale === 'zh'
                    ? `原声纯音乐 + 节拍谱面 (${selectedLevel.beatmapChords || 'Am-F-C-G'})`
                    : `ORIG MP3 + BEATMAP (${selectedLevel.beatmapChords || 'Am-F-C-G'})`}
                </span>
              )}
              <span className="px-2 py-0.5 bg-amber-950/70 border border-amber-500/60 text-amber-300 text-[7px] font-mono">
                {uniquePatterns}
              </span>
              {rec && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-300 text-[8px]">
                  <Star className="w-2.5 h-2.5 fill-emerald-300" />
                  <span>
                    BEST {rec.bestRank} ({rec.highScore})
                  </span>
                </span>
              )}
            </div>

            {localizedSelectedLevel.serviceUser && (
              <div className="text-[9px] text-emerald-300 font-mono flex items-center gap-1.5 truncate">
                <HeartHandshake className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-bold">{ui.behindMachine}</span>
                <span className="text-slate-200 truncate">
                  {localizedSelectedLevel.serviceUser}
                </span>
              </div>
            )}

            <div className="text-[9px] text-slate-300 font-mono leading-snug line-clamp-1">
              <span className="text-cyan-400 mr-1.5">
                [{localizedActiveChapter.code || activeChapter.code} · {localizedSelectedLevel.rackRow}]
              </span>
              {localizedSelectedLevel.patientDescription}
            </div>
          </div>

          {/* Right: Shift Mode Toggle + Tactile START SHIFT Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onSelectShiftMode(shiftMode === 'day' ? 'night' : 'day')
              }
              className={`px-2.5 py-2.5 border-2 text-[8px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[0_3px_0_#020617] ${
                shiftMode === 'night'
                  ? 'bg-rose-950 border-rose-500 text-rose-200'
                  : 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-400'
              }`}
              title="Toggle Standard Duty (1.0x, ±40ms) / Night Shift Overclock (1.15x, -20% tighter window)"
            >
              {shiftMode === 'night' ? (
                <>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>{ui.nightShift}</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span>{ui.standardShift}</span>
                </>
              )}
            </button>

            {/* Primary Bay Stepper + START SHIFT Button */}
            <div className="flex items-stretch bg-emerald-500 hover:bg-emerald-400 border-2 border-emerald-200 shadow-[0_4px_0_#064e3b] transition">
              <button
                type="button"
                onClick={() => handleCycleBay(-1)}
                className="px-2 py-2.5 hover:bg-emerald-600/60 text-slate-950 flex items-center justify-center cursor-pointer border-r border-emerald-700/40"
                title="Previous Level [←]"
                aria-label="Previous Server Bay"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isCurrentUnlocked) {
                    setFreePlayUnlocked(true);
                  }
                  onStartGame();
                }}
                data-start="true"
                data-testid="start-button"
                className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-slate-950 font-bold text-xs tracking-wider cursor-pointer"
              >
                <Terminal className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isCurrentUnlocked
                    ? `${ui.startPrefix} ${selectedLevel.wardNumber} [ENTER]`
                    : `${ui.unlockAndStartPrefix} ${selectedLevel.wardNumber}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCycleBay(1)}
                className="px-2 py-2.5 hover:bg-emerald-600/60 text-slate-950 flex items-center justify-center cursor-pointer border-l border-emerald-700/40"
                title="Next Level [→]"
                aria-label="Next Server Bay"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Audio Latency Calibration & 6-Track Soundtrack Reserve Modal */}
      {showAudioDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-[#070b14] border-2 border-cyan-400 p-5 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-cyan-300">
                <Disc className="w-4 h-4 text-cyan-400" />
                <span>AUDIO LATENCY CALIBRATION &amp; SOUNDTRACK</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioDrawer(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close Audio Settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="text-[9px] text-slate-400">
                DEVICE AUDIO / INPUT LATENCY CALIBRATION (PERFECT ±40ms, GOOD ±90ms)
              </div>
              <div className="flex items-center justify-between bg-[#0b1222] border border-slate-800 px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => onAdjustAudioOffset(-5)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 text-[10px] cursor-pointer"
                >
                  -5ms
                </button>
                <span className="text-xs text-white font-bold tabular-nums">
                  {wardProgress.audioOffsetMs >= 0
                    ? `+${wardProgress.audioOffsetMs}ms`
                    : `${wardProgress.audioOffsetMs}ms`}
                </span>
                <button
                  type="button"
                  onClick={() => onAdjustAudioOffset(5)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-600 text-[10px] cursor-pointer"
                >
                  +5ms
                </button>
              </div>

              {/* Interactive 4-Beat Tap Latency Calibration */}
              <div className="bg-slate-900/90 border border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-[9px] text-slate-300 font-mono">
                  {calibrationStatus}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleStartCalibrationTest}
                    className="px-2.5 py-1.5 bg-cyan-950 border border-cyan-400 text-cyan-200 text-[8px] cursor-pointer"
                  >
                    1. PLAY 4 CHIMES
                  </button>
                  <button
                    type="button"
                    onClick={handleTapCalibration}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[8px] cursor-pointer"
                  >
                    2. TAP ON 4TH!
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[9px] text-slate-400 mb-2">
                <span>BGM TRACK SELECT</span>
                <span className="text-emerald-400 font-mono">
                  {activeTrackMeta.title}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MUSIC_TRACK_RESERVE.map((trk, idx) => {
                  const isActive = activeTrackId === trk.id;
                  return (
                    <button
                      key={trk.id}
                      type="button"
                      onClick={() =>
                        onSelectTrackId(
                          trk.id === selectedLevel.musicTrackId ? null : trk.id
                        )
                      }
                      className={`px-3 py-2 text-left border font-mono text-[10px] transition truncate cursor-pointer ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200 font-bold'
                          : 'border-slate-800 bg-[#0b1222] text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <span className="text-cyan-400 mr-1.5">0{idx + 1}.</span>
                      <span>{trk.title.replace(/^\d+\.\s*/, '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Built-in Server Room Stage Builder Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
          <div className="w-full max-w-xl bg-[#070b14] border-2 border-amber-400 p-5 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>CHAOSHENG DC STAGE BUILDER (CUSTOM RACK CHART)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close Stage Builder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[9px]">
              <div>
                <label className="block text-slate-400 mb-1">INCIDENT TITLE</label>
                <input
                  type="text"
                  value={editorParams.title}
                  onChange={(e) =>
                    setEditorParams((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 px-2.5 py-2 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  CLOCK SPEED: {editorParams.bpm} BPM ({editorParams.totalBars} BARS)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={80}
                    max={165}
                    step={5}
                    value={editorParams.bpm}
                    onChange={(e) =>
                      setEditorParams((p) => ({
                        ...p,
                        bpm: Number(e.target.value),
                      }))
                    }
                    className="flex-1 accent-amber-400"
                  />
                  <span className="text-amber-300 font-mono text-xs">
                    {editorParams.bpm}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Center Zone Backdrop Selector */}
            <div>
              <div className="text-[9px] text-slate-400 mb-1.5">
                SELECT DATA CENTER ENVIRONMENT
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px]">
                {(
                  [
                    { id: 'er_ward', label: 'COLD-AISLE 42U BAY' },
                    { id: 'sunlit_conservatory', label: 'LINHAI WINDOW VAULT' },
                    { id: 'sakura_pagoda', label: 'COOLING & RELAY BAY' },
                    { id: 'cosmic_meteor', label: 'CORE RACK CHAMBER' },
                  ] as Array<{ id: StageBackdropId; label: string }>
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() =>
                      setEditorParams((p) => ({ ...p, stageBackdrop: st.id }))
                    }
                    className={`py-2 px-2 border text-center cursor-pointer transition ${
                      editorParams.stageBackdrop === st.id
                        ? 'bg-amber-950 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Beat Pattern & Multi-Bay Split Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] text-slate-400 mb-1.5">
                  RHYTHM MECHANIC PATTERN
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[7px]">
                  {(
                    [
                      { id: 'on_beat', label: '1X CLASSIC 7-BEAT' },
                      { id: 'off_beat', label: '&7 HALF-BEAT OFFSET' },
                      { id: 'double_time', label: '2X FAST OVERCLOCK' },
                      { id: 'skip_beat', label: 'SILENT / DROPPED' },
                      { id: 'swing_beat', label: 'SWING GROOVE' },
                      { id: 'irregular_7_8', label: '7/8 IRREGULAR' },
                      { id: 'two_beat_svt', label: '2-BEAT SVT BURST' },
                    ] as Array<{ id: BeatPatternType; label: string }>
                  ).map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() =>
                        setEditorParams((p) => ({ ...p, pattern: pat.id }))
                      }
                      className={`py-1.5 px-2 border cursor-pointer ${
                        editorParams.pattern === pat.id
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] text-slate-400 mb-1.5">
                  PARALLEL RACK TRACKS &amp; INTERFERENCE
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[8px] mb-2">
                  {([1, 2, 3] as Array<1 | 2 | 3>).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() =>
                        setEditorParams((p) => ({ ...p, panelCount: cnt }))
                      }
                      className={`py-1.5 border cursor-pointer ${
                        editorParams.panelCount === cnt
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {cnt} {cnt === 1 ? 'RACK' : 'RACKS'}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[8px]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditorParams((p) => ({
                        ...p,
                        reversedRow: !p.reversedRow,
                      }))
                    }
                    className={`px-2.5 py-1.5 border cursor-pointer ${
                      editorParams.reversedRow
                        ? 'bg-purple-950 border-purple-400 text-purple-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⇄ REVERSED BUS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditorParams((p) => ({
                        ...p,
                        enableBlackout: !p.enableBlackout,
                      }))
                    }
                    className={`px-2.5 py-1.5 border cursor-pointer ${
                      editorParams.enableBlackout
                        ? 'bg-rose-950 border-rose-400 text-rose-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    POWER BLACKOUT
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2.5 bg-slate-900 border border-slate-700 text-slate-300 text-[9px] cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleLaunchCustomLevel}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] border-2 border-emerald-200 cursor-pointer"
              >
                ▶ DEPLOY CUSTOM RACK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
