import { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { PauseModal } from './components/PauseModal';
import { ResultModal } from './components/ResultModal';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine } from './game/audio';
import { BikeSafetyEngine } from './game/BikeSafetyEngine';
import type {
  DifficultyMode,
  GamePhase,
  HudSnapshot,
  MobileInputState,
  RunSummary,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  speedKmh: 25,
  distanceM: 0,
  targetDistanceM: 1500,
  score: 0,
  combo: 0,
  maxCombo: 0,
  hearts: 3,
  maxHearts: 3,
  hasShield: false,
  doubleScoreTimer: 0,
  bellCooldownRatio: 0,
  brakeActive: false,
  zoneName: '1구간 · 주택가 골목',
  zoneIndex: 1,
  activeCallout: null,
  activeWarning: null,
  nearMissCount: 0,
  defensiveCount: 0,
  hitCounts: {
    dooring: 0,
    blind_car: 0,
    smombie: 0,
    pothole: 0,
    roadwork: 0,
    scooter: 0,
    red_signal: 0,
    traffic_car: 0,
    pet: 0,
    kids: 0,
    wrong_way_bike: 0,
    puddle: 0,
    gravel: 0,
  },
  encounterCounts: {
    dooring: 0,
    blind_car: 0,
    smombie: 0,
    pothole: 0,
    roadwork: 0,
    scooter: 0,
    red_signal: 0,
    traffic_car: 0,
    pet: 0,
    kids: 0,
    wrong_way_bike: 0,
    puddle: 0,
    gravel: 0,
  },
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BikeSafetyEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [mode, setMode] = useState<DifficultyMode>('city');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [muted, setMuted] = useState(false);
  const [crashFlash, setCrashFlash] = useState(false);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    let flashTimeout = 0;
    try {
      const engine = new BikeSafetyEngine(mountEl, {
        onHudUpdate: (snapshot) => setHud(snapshot),
        onGameOver: (runSummary) => setSummary(runSummary),
        onPhaseChange: (nextPhase) => setPhase(nextPhase),
        onCrashFlash: () => {
          setCrashFlash(true);
          window.clearTimeout(flashTimeout);
          flashTimeout = window.setTimeout(() => setCrashFlash(false), 220);
        },
      });
      engineRef.current = engine;

      const canvasEl = mountEl.querySelector('canvas');
      const onLost = (e: Event) => {
        e.preventDefault();
      };
      const onRestored = () => {
        // Renderer auto-recovers scene buffers
      };
      canvasEl?.addEventListener('webglcontextlost', onLost);
      canvasEl?.addEventListener('webglcontextrestored', onRestored);

      return () => {
        window.clearTimeout(flashTimeout);
        canvasEl?.removeEventListener('webglcontextlost', onLost);
        canvasEl?.removeEventListener('webglcontextrestored', onRestored);
        engine.dispose();
        engineRef.current = null;
      };
    } catch {
      setWebglError(true);
    }
  }, []);

  const handleSelectMode = (nextMode: DifficultyMode) => {
    setMode(nextMode);
    engineRef.current?.setMode(nextMode);
  };

  const handleStart = (selectedMode: DifficultyMode) => {
    setMode(selectedMode);
    setSummary(null);
    engineRef.current?.startRun(selectedMode);
  };

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleResume = () => {
    engineRef.current?.resume();
  };

  const handleExitToTitle = () => {
    setSummary(null);
    engineRef.current?.returnToTitle();
  };

  const handleMobileInput = (patch: Partial<MobileInputState>) => {
    engineRef.current?.setMobileInput(patch);
  };

  const handleBell = () => {
    engineRef.current?.triggerBell();
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Isolated WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full"
        aria-label="3D 자전거 안전 주행 시뮬레이션 화면"
      />

      {/* WebGL Unavailable Fallback */}
      {webglError && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950 p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-white/12 rounded-2xl p-6">
            <h1 className="text-xl font-bold text-white mb-2">3D 그래픽을 초기화할 수 없습니다</h1>
            <p className="text-sm text-slate-300">
              브라우저의 하드웨어 가속 또는 WebGL2 지원이 비활성화되어 있습니다. 설정을 확인한 뒤 새로고침 해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Brief Collision Red Edge Flash */}
      <div
        className={`fixed inset-0 z-10 pointer-events-none transition-opacity duration-200 ${
          crashFlash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 90px 28px rgba(239, 68, 68, 0.68)',
        }}
      />

      {/* Game Shell States */}
      {phase === 'title' && (
        <TitleOverlay
          mode={mode}
          onSelectMode={handleSelectMode}
          onStart={handleStart}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}

      {phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onMobileInput={handleMobileInput}
          onBell={handleBell}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={() => handleStart(mode)}
          onExitToTitle={handleExitToTitle}
        />
      )}

      {(phase === 'gameover' || phase === 'victory') && summary && (
        <ResultModal
          summary={summary}
          onRetry={() => handleStart(mode)}
          onExitToTitle={handleExitToTitle}
        />
      )}
    </main>
  );
}
