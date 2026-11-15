import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Gamepad2,
  OctagonAlert,
  Pause,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ForecastAlert, HudSnapshot, MobileInputState } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onMobileInput: (patch: Partial<MobileInputState>) => void;
  onBell: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
  onMobileInput,
  onBell,
}) => {
  const [hasTouchCapability, setHasTouchCapability] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(pointer: coarse)').matches ||
      (navigator.maxTouchPoints ?? 0) > 0
    );
  });

  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  });

  useEffect(() => {
    const onFirstTouch = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setHasTouchCapability(true);
        setShowTouchControls(true);
      }
    };
    window.addEventListener('pointerdown', onFirstTouch, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstTouch);
      onMobileInput({ left: false, right: false, accel: false, brake: false });
    };
  }, [onMobileInput]);

  const handleToggleTouchControls = () => {
    setShowTouchControls((prev) => {
      if (prev) {
        onMobileInput({ left: false, right: false, accel: false, brake: false });
      }
      return !prev;
    });
  };

  const progressPct = hud.targetDistanceM
    ? Math.min(100, (hud.distanceM / hud.targetDistanceM) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))] pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))] sm:p-4 md:p-5">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left: Helmet Hearts, Shield, Zone & Distance */}
        <div className="bg-slate-950/84 border border-white/12 rounded-xl px-2.5 py-2 sm:px-4 sm:py-3 min-w-0 max-w-[54vw] sm:max-w-none sm:min-w-[220px]">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1 sm:gap-1.5" aria-label={`안전 내구도 ${hud.hearts}/${hud.maxHearts}`}>
              {Array.from({ length: hud.maxHearts }).map((_, idx) => {
                const alive = idx < hud.hearts;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform ${
                      alive ? 'scale-100' : 'scale-90 opacity-30'
                    }`}
                  >
                    <path
                      d="M12 3C6.8 3 3 6.9 3 12v2.5c0 .8.7 1.5 1.5 1.5H19.5c.8 0 1.5-.7 1.5-1.5V12c0-5.1-3.8-9-9-9Z"
                      fill={alive ? '#f97316' : '#475569'}
                    />
                    <path
                      d="M7.5 16l2 4h5l2-4"
                      fill="none"
                      stroke={alive ? '#fed7aa' : '#64748b'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                );
              })}
              {hud.hasShield && (
                <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-sky-300 ml-0.5 sm:ml-1">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-sky-400/30" />
                  <span className="hidden sm:inline">보호막</span>
                </span>
              )}
            </div>

            {hud.doubleScoreTimer > 0 && (
              <span className="font-mono-num text-[10px] sm:text-xs font-bold text-amber-300 shrink-0">
                2X {hud.doubleScoreTimer}s
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-300 mb-1 sm:mb-1.5 gap-2">
            <span className="font-medium truncate">{hud.zoneName}</span>
            <span className="font-mono-num font-bold text-white shrink-0">
              {hud.distanceM}m{hud.targetDistanceM ? ` / ${hud.targetDistanceM}m` : ''}
            </span>
          </div>

          {progressPct !== null && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Top-Right: Score, Combo, Speedometer & Action Buttons */}
        <div className="flex items-start gap-1.5 sm:gap-2.5 shrink-0">
          <div className="bg-slate-950/84 border border-white/12 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-right">
            <div className="flex items-baseline justify-end gap-2 sm:gap-3">
              {hud.combo > 1 && (
                <span className="font-display text-[11px] sm:text-sm font-bold text-amber-400 tabular-nums">
                  {hud.combo} COMBO
                </span>
              )}
              <span className="font-mono-num text-lg sm:text-2xl font-bold text-white leading-none">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-1 text-[11px] sm:text-xs text-slate-400">
              <span>속도</span>
              <span
                className={`font-mono-num font-bold text-xs sm:text-sm ${
                  hud.brakeActive
                    ? 'text-rose-400'
                    : hud.speedKmh >= 30
                    ? 'text-amber-300'
                    : 'text-sky-300'
                }`}
              >
                {hud.speedKmh} km/h
              </span>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onPause}
              aria-label="일시정지"
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer touch-none"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer touch-none"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {hasTouchCapability && (
              <button
                type="button"
                onClick={handleToggleTouchControls}
                aria-label={showTouchControls ? '터치 패드 숨기기' : '터치 패드 보이기'}
                title={showTouchControls ? '터치 패드 숨기기' : '터치 패드 보이기'}
                className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer touch-none ${
                  showTouchControls
                    ? 'bg-sky-500/25 border-sky-400/60 text-sky-200'
                    : 'bg-slate-950/84 border-white/12 text-slate-300 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top-Center: Early Hazard Forecast + Urgent Warnings / Callouts */}
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 mb-auto w-full px-1">
        {hud.activeWarning && (
          <div className="bg-amber-500/95 text-slate-950 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg max-w-[92vw] sm:max-w-lg text-center">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{hud.activeWarning}</span>
          </div>
        )}

        {hud.activeForecast && (
          <ForecastBanner forecast={hud.activeForecast} />
        )}

        {hud.activeCallout && (
          <div
            key={hud.activeCallout.id}
            className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg border max-w-[92vw] text-center ${
              hud.activeCallout.tone === 'danger'
                ? 'bg-rose-950/92 border-rose-500/70 text-rose-200'
                : hud.activeCallout.tone === 'warn'
                ? 'bg-slate-900/90 border-amber-400/60 text-amber-200'
                : 'bg-emerald-950/92 border-emerald-400/70 text-emerald-200'
            }`}
          >
            <span>{hud.activeCallout.text}</span>
            {hud.activeCallout.points > 0 && (
              <span className="font-mono-num ml-2 text-amber-300">
                +{hud.activeCallout.points}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Perimeter: Touch Controls (Android/Tablet/Chromebook Touch) OR Desktop Key Strip */}
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {showTouchControls ? (
          (() => {
            const bindHold = (field: keyof MobileInputState) => ({
              onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
                e.preventDefault();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Ignore if pointer capture is unsupported
                }
                onMobileInput({ [field]: true });
              },
              onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
                try {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }
                } catch {
                  // Ignore
                }
                onMobileInput({ [field]: false });
              },
              onPointerCancel: () => onMobileInput({ [field]: false }),
              onLostPointerCapture: () => onMobileInput({ [field]: false }),
              onContextMenu: (e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault(),
            });

            const signalBrakeSuggested =
              hud.activeForecast?.dir === 'stop' &&
              hud.activeForecast.title.includes('신호등');

            return (
              <>
                {/* Touch Steering Pad */}
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5">
                  <button
                    type="button"
                    aria-label="왼쪽으로 조향"
                    {...bindHold('left')}
                    className="w-13 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/86 border border-white/20 text-white flex items-center justify-center active:bg-sky-500/45 active:border-sky-300 touch-none select-none cursor-pointer shadow-lg"
                  >
                    <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                  <button
                    type="button"
                    aria-label="오른쪽으로 조향"
                    {...bindHold('right')}
                    className="w-13 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/86 border border-white/20 text-white flex items-center justify-center active:bg-sky-500/45 active:border-sky-300 touch-none select-none cursor-pointer shadow-lg"
                  >
                    <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                </div>

                {/* Touch Action Pad: Prominent Brake + Accel + Bell */}
                <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2.5">
                  <button
                    type="button"
                    aria-label="브레이크"
                    {...bindHold('brake')}
                    className={`min-w-[74px] sm:min-w-[92px] px-3 sm:px-5 h-14 sm:h-16 rounded-2xl border text-xs sm:text-sm font-black touch-none select-none cursor-pointer shadow-lg transition-transform flex flex-col items-center justify-center leading-tight ${
                      hud.brakeActive
                        ? 'bg-rose-500 border-white text-white scale-95'
                        : signalBrakeSuggested
                        ? 'bg-rose-700/95 border-amber-300 text-white ring-2 ring-amber-300 animate-pulse'
                        : 'bg-rose-950/90 border-rose-400/60 text-rose-100'
                    }`}
                  >
                    <span>브레이크</span>
                    <span className="text-[10px] font-bold opacity-85">정지 · 감속</span>
                  </button>
                  <button
                    type="button"
                    aria-label="가속"
                    {...bindHold('accel')}
                    className="min-w-[46px] px-2.5 sm:px-4 h-14 sm:h-16 rounded-2xl bg-emerald-950/88 border border-emerald-400/50 text-emerald-100 text-[11px] sm:text-sm font-black active:bg-emerald-500/50 touch-none select-none cursor-pointer shadow-lg"
                  >
                    가속
                  </button>
                  <button
                    type="button"
                    aria-label="경적 울리기"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      onBell();
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative overflow-hidden min-w-[48px] px-2.5 sm:px-4 h-14 sm:h-16 rounded-2xl bg-sky-950/88 border border-sky-400/50 text-sky-100 text-[11px] sm:text-sm font-black active:bg-sky-500/50 touch-none select-none cursor-pointer shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>경적</span>
                    </span>
                    <span className="w-8 sm:w-10 h-1 bg-slate-800/90 rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-sky-300"
                        style={{ width: `${Math.round((1 - hud.bellCooldownRatio) * 100)}%` }}
                      />
                    </span>
                  </button>
                </div>
              </>
            );
          })()
        ) : (
          /* Desktop / Chromebook keyboard action hint strip */
          <div className="hidden md:flex mx-auto items-center gap-4 bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-300">
            <span>
              <strong className="text-white">A/D</strong> 조향
            </span>
            <span className="text-slate-600">·</span>
            <span>
              <strong className="text-white">W/S</strong> 가속·브레이크
            </span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-sky-300" />
              <strong className="text-sky-300">E / Space</strong> 경적
              <span className="inline-block w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <span
                  className="block h-full bg-sky-400"
                  style={{ width: `${Math.round((1 - hud.bellCooldownRatio) * 100)}%` }}
                />
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const ForecastBanner: React.FC<{ forecast: ForecastAlert }> = ({ forecast }) => {
  const toneStyles =
    forecast.tone === 'rose'
      ? {
          wrap: 'bg-slate-950/90 border-rose-500/70 text-white',
          badge: 'bg-rose-500/20 border-rose-400/60 text-rose-300',
          dist: 'text-rose-300',
        }
      : forecast.tone === 'sky'
      ? {
          wrap: 'bg-slate-950/88 border-sky-400/60 text-white',
          badge: 'bg-sky-500/20 border-sky-400/60 text-sky-300',
          dist: 'text-sky-300',
        }
      : {
          wrap: 'bg-slate-950/90 border-amber-400/70 text-white',
          badge: 'bg-amber-500/20 border-amber-400/60 text-amber-300',
          dist: 'text-amber-300',
        };

  const DirIcon =
    forecast.dir === 'left'
      ? ArrowLeft
      : forecast.dir === 'right'
      ? ArrowRight
      : forecast.dir === 'down'
      ? ArrowDown
      : forecast.dir === 'up'
      ? ArrowUp
      : OctagonAlert;

  return (
    <div
      className={`border rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg flex items-center gap-2.5 sm:gap-3 w-full max-w-[340px] sm:max-w-md ${toneStyles.wrap}`}
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex flex-col items-center justify-center shrink-0 ${toneStyles.badge}`}
      >
        <DirIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-xs sm:text-sm tracking-tight truncate">
            {forecast.title}
          </span>
          <span className={`font-mono-num text-[11px] sm:text-xs font-bold shrink-0 ${toneStyles.dist}`}>
            {forecast.distanceM}m 앞
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-300 truncate">{forecast.detail}</p>
      </div>
    </div>
  );
};
