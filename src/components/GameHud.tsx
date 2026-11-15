import React from 'react';
import { Bell, Pause, Shield, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import type { HudSnapshot, MobileInputState } from '../game/types';

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
  const progressPct = hud.targetDistanceM
    ? Math.min(100, (hud.distanceM / hud.targetDistanceM) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Helmet Hearts, Shield, Zone & Distance */}
        <div className="bg-slate-950/84 border border-white/12 rounded-xl px-4 py-3 min-w-[210px]">
          <div className="flex items-center justify-between gap-4 mb-2">
            {/* Custom SVG Helmet/Heart durability icons */}
            <div className="flex items-center gap-1.5" aria-label={`안전 내구도 ${hud.hearts}/${hud.maxHearts}`}>
              {Array.from({ length: hud.maxHearts }).map((_, idx) => {
                const alive = idx < hud.hearts;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className={`w-6 h-6 transition-transform ${alive ? 'scale-100' : 'scale-90 opacity-30'}`}
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
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-300 ml-1">
                  <Shield className="w-4 h-4 fill-sky-400/30" />
                  보호막
                </span>
              )}
            </div>

            {hud.doubleScoreTimer > 0 && (
              <span className="font-mono-num text-xs font-bold text-amber-300">
                2X {hud.doubleScoreTimer}s
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
            <span className="font-medium truncate">{hud.zoneName}</span>
            <span className="font-mono-num font-bold text-white ml-2">
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
        <div className="flex items-start gap-2.5">
          <div className="bg-slate-950/84 border border-white/12 rounded-xl px-4 py-2.5 text-right">
            <div className="flex items-baseline justify-end gap-3">
              {hud.combo > 1 && (
                <span className="font-display text-sm font-bold text-amber-400 tabular-nums">
                  {hud.combo} COMBO
                </span>
              )}
              <span className="font-mono-num text-2xl font-bold text-white leading-none">
                {hud.score.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 mt-1 text-xs text-slate-400">
              <span>속도</span>
              <span
                className={`font-mono-num font-bold text-sm ${
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

          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={onPause}
              aria-label="일시정지"
              className="p-2.5 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="p-2.5 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Transient Hazard Telegraph Warning / Bonus Callout (High and unobtrusive) */}
      <div className="flex flex-col items-center gap-2 -mt-auto mb-auto pt-3">
        {hud.activeWarning && (
          <div className="bg-amber-500/95 text-slate-950 px-4 py-1.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{hud.activeWarning}</span>
          </div>
        )}
        {hud.activeCallout && (
          <div
            key={hud.activeCallout.id}
            className={`px-4 py-1.5 rounded-xl font-bold text-sm shadow-lg border ${
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

      {/* Bottom Perimeter: Compact Key Status Strip + Touch Controls on small viewports */}
      <div className="flex items-end justify-between gap-4">
        {/* Mobile/Touch Steering Pad */}
        <div className="pointer-events-auto flex md:hidden items-center gap-2">
          <button
            type="button"
            onPointerDown={() => onMobileInput({ left: true })}
            onPointerUp={() => onMobileInput({ left: false })}
            onPointerLeave={() => onMobileInput({ left: false })}
            className="w-12 h-12 rounded-xl bg-slate-950/84 border border-white/15 text-white font-bold active:bg-sky-500/40"
          >
            ←
          </button>
          <button
            type="button"
            onPointerDown={() => onMobileInput({ right: true })}
            onPointerUp={() => onMobileInput({ right: false })}
            onPointerLeave={() => onMobileInput({ right: false })}
            className="w-12 h-12 rounded-xl bg-slate-950/84 border border-white/15 text-white font-bold active:bg-sky-500/40"
          >
            →
          </button>
        </div>

        {/* Desktop unobtrusive action hint strip */}
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

        {/* Mobile/Touch Action Pad */}
        <div className="pointer-events-auto flex md:hidden items-center gap-2">
          <button
            type="button"
            onPointerDown={() => onMobileInput({ brake: true })}
            onPointerUp={() => onMobileInput({ brake: false })}
            onPointerLeave={() => onMobileInput({ brake: false })}
            className="px-4 h-12 rounded-xl bg-rose-950/88 border border-rose-400/40 text-rose-200 text-xs font-bold"
          >
            브레이크
          </button>
          <button
            type="button"
            onClick={onBell}
            className="px-4 h-12 rounded-xl bg-sky-950/88 border border-sky-400/40 text-sky-200 text-xs font-bold"
          >
            경적
          </button>
        </div>
      </div>
    </div>
  );
};
