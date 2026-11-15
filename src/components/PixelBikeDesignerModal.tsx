import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Eraser,
  Grid3X3,
  Palette,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildStarterPixelBike,
  createEmptyPixelGrid,
  FRAME_OPTIONS,
  PIXEL_COLS,
  PIXEL_PALETTE,
  PIXEL_ROWS,
} from '../game/pixelBike';
import type { BikeFrameStyle } from '../game/types';
import { BikeIllustration } from './BikeIllustration';

interface PixelBikeDesignerModalProps {
  pixels: (string | null)[];
  onChangePixels: (nextPixels: (string | null)[]) => void;
  onClose: () => void;
}

export const PixelBikeDesignerModal: React.FC<PixelBikeDesignerModalProps> = ({
  pixels,
  onChangePixels,
  onClose,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>('#38bdf8');
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [activeTemplate, setActiveTemplate] = useState<BikeFrameStyle | 'blank'>('diamond');
  const paintingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const filledCount = useMemo(
    () => pixels.reduce((acc, c) => (c ? acc + 1 : acc), 0),
    [pixels]
  );

  const paintAtClientPos = (clientX: number, clientY: number) => {
    const el = gridRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const col = Math.floor(((clientX - rect.left) / rect.width) * PIXEL_COLS);
    const row = Math.floor(((clientY - rect.top) / rect.height) * PIXEL_ROWS);
    if (col < 0 || col >= PIXEL_COLS || row < 0 || row >= PIXEL_ROWS) return;

    const idx = row * PIXEL_COLS + col;
    const targetVal = tool === 'eraser' ? null : selectedColor;
    if (pixels[idx] === targetVal) return;

    const next = pixels.slice();
    next[idx] = targetVal;
    onChangePixels(next);
  };

  const handleLoadTemplate = (style: BikeFrameStyle) => {
    setActiveTemplate(style);
    onChangePixels(buildStarterPixelBike(style, selectedColor));
    setTool('brush');
  };

  const handleClearCanvas = () => {
    setActiveTemplate('blank');
    onChangePixels(createEmptyPixelGrid());
    setTool('brush');
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/90 flex items-center justify-center p-2.5 sm:p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/15 rounded-2xl p-3.5 sm:p-5 shadow-2xl max-h-[94dvh] overflow-y-auto touch-pan-y">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/45 text-amber-300 shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-amber-300 truncate">
                나만의 커스텀 3D 자전거 제작소
              </div>
              <h2 className="text-base sm:text-lg font-black text-white leading-snug truncate">
                픽셀로 자전거를 그려 3D로 타보세요!
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Starter Frame Templates or Blank Canvas */}
        <div className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-300">
              1. 도안으로 시작하거나 백지에서 자유롭게 그려보세요
            </span>
            <button
              type="button"
              onClick={handleClearCanvas}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                activeTemplate === 'blank'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-slate-950/80 border-white/12 text-slate-300 hover:border-white/30 hover:text-white'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>모두 지우고 새로 그리기</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FRAME_OPTIONS.map((frame) => {
              const active = activeTemplate === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleLoadTemplate(frame.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-colors cursor-pointer ${
                    active
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-slate-950/70 border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-bold truncate">
                    <Sparkles className="w-3 h-3 text-sky-300 shrink-0" />
                    <span className="truncate">{frame.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{frame.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Freehand 28x16 Pixel Drawing Canvas */}
        <div className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Grid3X3 className="w-3.5 h-3.5 text-sky-300" />
              <span>2. 터치/드래그로 픽셀 그리기 (뒤 ← · → 앞 진행방향)</span>
            </span>
            <span className="text-[11px] font-mono-num text-slate-400">
              블록 {filledCount}개
            </span>
          </div>

          <div className="relative w-full aspect-[28/16] max-h-[320px] mx-auto rounded-xl bg-slate-950 border border-white/15 overflow-hidden p-1.5 sm:p-2">
            <div
              ref={gridRef}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                paintingRef.current = true;
                paintAtClientPos(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!paintingRef.current) return;
                paintAtClientPos(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                paintingRef.current = false;
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
              }}
              onPointerCancel={() => {
                paintingRef.current = false;
              }}
              className="w-full h-full grid touch-none select-none cursor-crosshair"
              style={{
                gridTemplateColumns: `repeat(${PIXEL_COLS}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${PIXEL_ROWS}, minmax(0, 1fr))`,
              }}
              role="application"
              aria-label="커스텀 픽셀 자전거 캔버스"
            >
              {pixels.map((hex, idx) => (
                <div
                  key={idx}
                  className="border border-white/[0.08]"
                  style={{
                    backgroundColor: hex ?? 'rgba(15, 23, 42, 0.4)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Color Palette & Eraser */}
        <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 mb-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {PIXEL_PALETTE.map((swatch) => {
                const active = tool === 'brush' && selectedColor === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    title={swatch.name}
                    aria-label={swatch.name}
                    onClick={() => {
                      setSelectedColor(swatch.hex);
                      setTool('brush');
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-transform cursor-pointer ${
                      active
                        ? 'border-white scale-110 shadow-lg'
                        : 'border-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === 'eraser' ? 'brush' : 'eraser'))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                tool === 'eraser'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-100'
                  : 'bg-slate-900 border-white/12 text-slate-300 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>{tool === 'eraser' ? '지우개 사용 중' : '지우개'}</span>
            </button>
          </div>
        </div>

        {/* Footer Preview & Apply CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-24 h-12 rounded-lg bg-slate-950 border border-white/10 p-1 shrink-0">
              <BikeIllustration
                bikeType="custom"
                customPixels={pixels}
                active
                className="w-full h-full"
              />
            </div>
            <div className="text-xs text-slate-300 min-w-0">
              <div className="font-bold text-white truncate">실시간 3D 블록 변환 적용됨</div>
              <div className="text-[11px] text-slate-400 truncate">
                엉성하거나 개성 있어도 그린 그대로 3D로 달립니다
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={filledCount === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-black text-sm cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>{filledCount === 0 ? '1칸 이상 그려주세요' : '완성! 이 자전거로 타기'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
