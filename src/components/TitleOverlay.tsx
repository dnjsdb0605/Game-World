import React from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import type { DifficultyMode } from '../game/types';

interface TitleOverlayProps {
  mode: DifficultyMode;
  onSelectMode: (mode: DifficultyMode) => void;
  onStart: (mode: DifficultyMode) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const MODE_OPTIONS: { id: DifficultyMode; label: string; desc: string }[] = [
  { id: 'school', label: '스쿨존 등굣길 (800m)', desc: '기초 위험 예측 · 안전거리 연습' },
  { id: 'city', label: '도심 챌린지 (1500m)', desc: '교차로·신호등·급정거 복합 코스' },
  { id: 'endless', label: '무한 안전 라이딩', desc: '최고 기록 도전 · 속도 점진 상승' },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  mode,
  onSelectMode,
  onStart,
  muted,
  onToggleMute,
}) => {
  const activeOption = MODE_OPTIONS.find((m) => m.id === mode) ?? MODE_OPTIONS[1];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top row: Bespoke inline SVG Title Lockup + Sound toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-xl">
          <div className="bg-slate-950/84 border border-white/12 rounded-2xl p-6 md:p-7 shadow-2xl">
            {/* Bespoke SVG Title Lockup */}
            <svg
              viewBox="0 0 420 96"
              className="w-full max-w-[360px] h-auto mb-3"
              role="img"
              aria-label="라이딩 세이프 로고"
            >
              {/* Stylized bicycle wheel + road shield emblem */}
              <circle cx="42" cy="50" r="28" fill="none" stroke="#38bdf8" strokeWidth="5" />
              <circle cx="42" cy="50" r="8" fill="#facc15" />
              <path d="M42 22 L42 78 M14 50 L70 50 M22 30 L62 70 M62 30 L22 70" stroke="#7dd3fc" strokeWidth="2.2" opacity="0.7" />
              <path d="M84 22 L116 22 L124 38 L92 38 Z" fill="#f97316" />
              <text
                x="88"
                y="62"
                fill="#f8fafc"
                fontSize="36"
                fontWeight="900"
                fontFamily="Noto Sans KR, sans-serif"
                letterSpacing="-1"
              >
                라이딩 세이프
              </text>
              <text
                x="90"
                y="84"
                fill="#94a3b8"
                fontSize="13"
                fontWeight="700"
                fontFamily="Chakra Petch, sans-serif"
                letterSpacing="2.5"
              >
                3D BICYCLE SAFETY CHALLENGE
              </text>
            </svg>

            <p className="text-sm md:text-base text-slate-200 leading-relaxed mb-5">
              3인칭 주행 시점에서 개문 사고, 사각지대 차량, 스마트폰 보행자 등
              실제 도로 위 위험 요소를 예측하고 방어 운전으로 안전하게 완주하세요.
            </p>

            {/* Interactive Course Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {MODE_OPTIONS.map((opt) => {
                const active = opt.id === mode;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onSelectMode(opt.id)}
                    className={`px-3 py-2.5 rounded-xl text-left border transition-colors cursor-pointer ${
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold whitespace-nowrap truncate">{opt.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mb-5">{activeOption.desc}</p>

            {/* Primary Start CTA */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onStart(mode)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base tracking-tight transition-transform active:scale-95 cursor-pointer shadow-lg"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>주행 시작</span>
              </button>
              <span className="hidden sm:inline text-xs text-slate-400">
                Enter 또는 Space 키로 바로 시작
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          className="pointer-events-auto p-3 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Bottom single flat control-hint line */}
      <div className="flex justify-center">
        <div className="bg-slate-950/84 border border-white/10 rounded-xl px-5 py-2.5 text-xs md:text-sm text-slate-200 tracking-tight">
          <span className="font-bold text-amber-300">A / D</span> 조향
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-bold text-amber-300">W</span> 가속
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-bold text-amber-300">S</span> 브레이크
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-bold text-amber-300">Space</span> 점프
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-bold text-sky-300">E</span> 경적(벨)
          <span className="mx-2 text-slate-500">·</span>
          <span className="font-bold text-slate-300">Esc</span> 일시정지
        </div>
      </div>
    </div>
  );
};
