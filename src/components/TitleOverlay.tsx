import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ExternalLink,
  Palette,
  Play,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import type { BikeType, DifficultyMode } from '../game/types';
import { BikeIllustration } from './BikeIllustration';
import { PixelBikeDesignerModal } from './PixelBikeDesignerModal';

interface TitleOverlayProps {
  mode: DifficultyMode;
  bikeType: BikeType;
  customPixels: (string | null)[];
  showFixieModal: boolean;
  onSelectMode: (mode: DifficultyMode) => void;
  onSelectBike: (bikeType: BikeType) => void;
  onChangeCustomPixels: (pixels: (string | null)[]) => void;
  onCloseFixieModal: () => void;
  onModalVisibilityChange?: (open: boolean) => void;
  onStart: (mode: DifficultyMode) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const BIKE_OPTIONS: {
  id: BikeType;
  label: string;
  sub: string;
  specLine: string;
  handlingLine: string;
}[] = [
  {
    id: 'normal',
    label: '일반자전거',
    sub: '표준 통학 · 앞/뒤 브레이크',
    specLine: '다이아몬드 프레임 · 앞 바구니 & 짐받이 · 흙받이 장착',
    handlingLine: '제동: 앞/뒤 브레이크 · 안정적인 표준 균형',
  },
  {
    id: 'ttareungi',
    label: '따릉이',
    sub: '공공자전거 · 안정적 주행',
    specLine: '스텝스루 저상 프레임 · 화이트 앞 바구니 · 체인 가드',
    handlingLine: '제동: 앞/뒤 브레이크 · 편안한 시내 주행감',
  },
  {
    id: 'fixie',
    label: '픽시자전거',
    sub: '고정기어 · 브레이크 점검',
    specLine: '수평 트랙 프레임 · 불혼 핸들바 · 바구니/짐받이 없음',
    handlingLine: '고정기어 구조 · 임시 브레이크 장착 후 안전 확인 필수',
  },
  {
    id: 'pro',
    label: '고급자전거',
    sub: '고속 로드 · 민첩한 조향',
    specLine: '카본 에어로 프레임 · 로드 드롭바 · 디스크 브레이크',
    handlingLine: '제동: 듀얼 디스크 · 빠른 가속과 민첩한 코너링',
  },
  {
    id: 'custom',
    label: '커스텀 자전거',
    sub: '픽셀 3D · 직접 제작',
    specLine: '28×16 픽셀 자유 드로잉 · 그린 모양 그대로 3D 블록 변신',
    handlingLine: '직접 그린 개성 만점 3D 픽셀 자전거로 안전 주행',
  },
];

const MODE_OPTIONS: { id: DifficultyMode; label: string; desc: string }[] = [
  { id: 'school', label: '스쿨존 등굣길 (800m)', desc: '기초 위험 예측 · 안전거리 연습' },
  { id: 'city', label: '도심 챌린지 (1500m)', desc: '교차로·신호등·급정거 복합 코스' },
  { id: 'endless', label: '무한 안전 라이딩', desc: '최고 기록 도전 · 속도 점진 상승' },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  mode,
  bikeType,
  customPixels,
  showFixieModal,
  onSelectMode,
  onSelectBike,
  onChangeCustomPixels,
  onCloseFixieModal,
  onModalVisibilityChange,
  onStart,
  muted,
  onToggleMute,
}) => {
  const activeOption = MODE_OPTIONS.find((m) => m.id === mode) ?? MODE_OPTIONS[1];
  const activeBike = BIKE_OPTIONS.find((b) => b.id === bikeType) ?? BIKE_OPTIONS[0];

  const [brakeInstallPct, setBrakeInstallPct] = useState(100);
  const [showDesignerModal, setShowDesignerModal] = useState(false);

  useEffect(() => {
    onModalVisibilityChange?.(showFixieModal || showDesignerModal);
  }, [showFixieModal, showDesignerModal, onModalVisibilityChange]);

  useEffect(() => {
    if (bikeType !== 'fixie') {
      setBrakeInstallPct(100);
      return;
    }

    setBrakeInstallPct(0);
    const start = performance.now();
    const duration = 1080;
    let raf = 0;

    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / duration);
      setBrakeInstallPct(Math.round(ratio * 100));
      if (ratio < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bikeType]);

  const handleSwitchSafeBike = (safeBike: Exclude<BikeType, 'fixie'>) => {
    onSelectBike(safeBike);
    onCloseFixieModal();
  };

  return (
    <>
      <div className="fixed inset-0 z-20 flex flex-col justify-between pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-6 md:p-8 lg:p-10 pointer-events-none overflow-y-auto touch-pan-y">
        {/* Top row: Bespoke inline SVG Title Lockup + Sound toggle */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4 my-auto md:my-0">
          <div className="pointer-events-auto flex-1 max-w-3xl min-w-0">
            <div className="bg-slate-950/86 border border-white/12 rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl">
              {/* Bespoke SVG Title Lockup */}
              <svg
                viewBox="0 0 420 96"
                className="w-full max-w-[240px] sm:max-w-[300px] md:max-w-[330px] h-auto mb-2"
                role="img"
                aria-label="라이딩 세이프 로고"
              >
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

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3">
                3인칭 주행 시점에서 신호등 정지선, 개문 사고, 교차로 차량, 보행자 등
                실제 도로 위 위험 요소를 예측하고 자전거 전용도로에서 안전하게 완주하세요.
              </p>

              {/* Step 1: Bike Selector with Visual Bicycle Shapes */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-300 mb-1.5">
                  <Bike className="w-3.5 h-3.5 text-sky-300" />
                  <span>자전거 선택 (모양을 보고 고르거나 커스텀 픽셀로 만들어 보세요)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
                  {BIKE_OPTIONS.map((bike) => {
                    const active = bike.id === bikeType;
                    return (
                      <button
                        key={bike.id}
                        type="button"
                        onClick={() => onSelectBike(bike.id)}
                        className={`px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-xl text-left border transition-colors cursor-pointer touch-pan-y ${
                          active
                            ? bike.id === 'fixie'
                              ? 'bg-rose-500/20 border-rose-400 text-white'
                              : bike.id === 'custom'
                              ? 'bg-amber-400/20 border-amber-400 text-white'
                              : 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-900/80 border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <BikeIllustration
                          bikeType={bike.id}
                          customPixels={bike.id === 'custom' ? customPixels : undefined}
                          active={active}
                          brakeProgress={bike.id === 'fixie' && active ? brakeInstallPct / 100 : 1}
                          className="w-full h-11 sm:h-12 mb-1"
                        />
                        <div className="text-xs font-bold truncate">{bike.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{bike.sub}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Bike Visual Design Preview Showcase */}
                <div
                  className={`mt-2 rounded-xl border px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5 ${
                    bikeType === 'fixie'
                      ? 'border-amber-400/45 bg-amber-950/35'
                      : bikeType === 'custom'
                      ? 'border-amber-400/40 bg-slate-900/85'
                      : 'border-white/12 bg-slate-900/75'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-28 sm:w-36 shrink-0 rounded-lg bg-slate-950/70 border border-white/8 px-2 py-1">
                      <BikeIllustration
                        bikeType={bikeType}
                        customPixels={bikeType === 'custom' ? customPixels : undefined}
                        active
                        brakeProgress={bikeType === 'fixie' ? brakeInstallPct / 100 : 1}
                        className="w-full h-14 sm:h-16"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-black text-white truncate">
                          {activeBike.label} 디자인 미리보기
                        </span>
                        {bikeType === 'fixie' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 font-mono-num shrink-0">
                            {brakeInstallPct < 100 ? (
                              <Wrench className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            )}
                            <span>브레이크 {brakeInstallPct}%</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-200 truncate mt-0.5">
                        {activeBike.specLine}
                      </p>
                      {bikeType === 'fixie' ? (
                        <div className="mt-1.5">
                          <div className="text-[10px] sm:text-[11px] font-bold text-amber-200 truncate">
                            {brakeInstallPct < 100
                              ? '안전 수칙 적용 중: 픽시자전거에 앞·뒤 브레이크 장착 중...'
                              : '앞·뒤 브레이크 임시 장착 완료 (도로 주행 안전 확인 필요)'}
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-amber-400 transition-all duration-75"
                              style={{ width: `${brakeInstallPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                          {activeBike.handlingLine}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (bikeType !== 'custom') {
                        onSelectBike('custom');
                      }
                      setShowDesignerModal(true);
                    }}
                    className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      bikeType === 'custom'
                        ? 'bg-amber-400 hover:bg-amber-300 border-amber-300 text-slate-950 font-black'
                        : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-400/50 text-sky-200 hover:text-white'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>{bikeType === 'custom' ? '픽셀 직접 그리기 · 수정' : '커스텀 픽셀 만들기'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Interactive Course Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                {MODE_OPTIONS.map((opt) => {
                  const active = opt.id === mode;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectMode(opt.id)}
                      className={`px-3 py-2 sm:py-2.5 rounded-xl text-left border transition-colors cursor-pointer touch-pan-y ${
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
              <p className="text-[11px] sm:text-xs text-slate-400 mb-3.5 sm:mb-4">{activeOption.desc}</p>

              {/* Primary Start CTA */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => onStart(mode)}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base tracking-tight transition-transform active:scale-95 cursor-pointer shadow-lg ${
                    bikeType === 'fixie'
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{bikeType === 'fixie' ? '픽시자전거 도로 주행 시도' : '주행 시작'}</span>
                </button>
                <span className="hidden md:inline text-xs text-slate-400">
                  Enter 키로 바로 시작
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="pointer-events-auto shrink-0 p-2.5 sm:p-3 rounded-xl bg-slate-950/84 border border-white/12 text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Bottom single flat control-hint line */}
        <div className="hidden sm:flex justify-center pt-3">
          <div className="bg-slate-950/84 border border-white/10 rounded-xl px-4 md:px-5 py-2 text-xs md:text-sm text-slate-200 tracking-tight text-center">
            <span className="font-bold text-amber-300">A / D</span> 조향
            <span className="mx-2 text-slate-500">·</span>
            <span className="font-bold text-amber-300">W</span> 가속
            <span className="mx-2 text-slate-500">·</span>
            <span className="font-bold text-amber-300">S</span> 브레이크
            <span className="mx-2 text-slate-500">·</span>
            <span className="font-bold text-sky-300">E / Space</span> 경적(벨)
            <span className="mx-2 text-slate-500">·</span>
            <span className="font-bold text-slate-300">Esc</span> 일시정지
          </div>
        </div>
      </div>

      {/* Fixie Danger Warning & YouTube Video Modal */}
      {showFixieModal && (
        <div className="fixed inset-0 z-40 bg-slate-950/88 flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-rose-500/45 rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto touch-pan-y">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-300 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-300">도로 주행 불가 안내</div>
                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    픽시자전거는 위험해서 도로에 나갈 수 없습니다!
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseFixieModal}
                aria-label="닫기"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3.5">
              앞·뒤 브레이크를 임시로 달아 보았지만, 픽시자전거(고정기어)는 페달이 멈추지 않고
              급정거 시 뒷바퀴 미끄러짐(스키딩)과 제동 거리 증가로 실제 도로에서는 매우 위험해
              도저히 출발할 수 없습니다. 아래 위험성 교육 영상을 확인하고 안전한 다른 자전거를 선택하세요!
            </p>

            {/* Embedded YouTube Safety Video + Direct Link */}
            <div className="rounded-xl overflow-hidden border border-white/12 bg-black aspect-video mb-2.5">
              <iframe
                src="https://www.youtube.com/embed/7qZbkmubNIU?rel=0"
                title="픽시자전거 위험성 안전 교육 영상"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[11px] sm:text-xs text-slate-400">
                영상이 재생되지 않으면 아래 링크로 직접 시청하세요.
              </span>
              <a
                href="https://www.youtube.com/watch?v=7qZbkmubNIU"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>유튜브에서 위험 영상 보기</span>
              </a>
            </div>

            <div className="border-t border-white/10 pt-3.5">
              <div className="text-xs font-bold text-slate-300 mb-2">
                안전한 다른 자전거로 바꿔서 출발하기:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchSafeBike('normal')}
                  className="flex items-center justify-center sm:flex-col gap-2 sm:gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-400/60 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <BikeIllustration bikeType="normal" active className="w-16 sm:w-20 h-9 sm:h-10 shrink-0" />
                  <span className="text-sky-300">일반자전거 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSafeBike('ttareungi')}
                  className="flex items-center justify-center sm:flex-col gap-2 sm:gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-400/60 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <BikeIllustration bikeType="ttareungi" active className="w-16 sm:w-20 h-9 sm:h-10 shrink-0" />
                  <span className="text-emerald-300">따릉이 선택</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSafeBike('pro')}
                  className="flex items-center justify-center sm:flex-col gap-2 sm:gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/60 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <BikeIllustration bikeType="pro" active className="w-16 sm:w-20 h-9 sm:h-10 shrink-0" />
                  <span className="text-amber-300">고급자전거 선택</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Custom 3D Pixel Bike Studio Modal */}
      {showDesignerModal && (
        <PixelBikeDesignerModal
          pixels={customPixels}
          onChangePixels={onChangeCustomPixels}
          onClose={() => setShowDesignerModal(false)}
        />
      )}
    </>
  );
};
