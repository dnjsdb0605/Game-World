import React from 'react';
import {
  DEFAULT_FRAME_FOR_BIKE,
  PIXEL_COLS,
  PIXEL_ROWS,
} from '../game/pixelBike';
import type { BikeFrameStyle, BikeType } from '../game/types';

interface BikeIllustrationProps {
  bikeType: BikeType;
  frameStyle?: BikeFrameStyle;
  customPixels?: (string | null)[];
  className?: string;
  /** 0..1 progress used when animating brake caliper & lever installation on the fixie */
  brakeProgress?: number;
  /** Emphasize visual contrast slightly for active card/preview */
  active?: boolean;
}

export const BikeIllustration: React.FC<BikeIllustrationProps> = ({
  bikeType,
  frameStyle,
  customPixels,
  className = 'w-full h-14',
  brakeProgress = 1,
  active = false,
}) => {
  if (bikeType === 'custom') {
    const cellW = 148 / PIXEL_COLS;
    const cellH = 80 / PIXEL_ROWS;
    const hasAny = Boolean(customPixels?.some((c) => c !== null));

    return (
      <svg
        viewBox="0 0 180 100"
        className={className}
        fill="none"
        aria-hidden="true"
      >
        <line
          x1="16"
          y1="93"
          x2="164"
          y2="93"
          stroke={active ? 'rgba(148,163,184,0.45)' : 'rgba(148,163,184,0.25)'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {hasAny && customPixels ? (
          <g shapeRendering="crispEdges">
            {Array.from({ length: PIXEL_ROWS }).map((_, r) =>
              Array.from({ length: PIXEL_COLS }).map((__, c) => {
                const hex = customPixels[r * PIXEL_COLS + c];
                if (!hex) return null;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={16 + c * cellW}
                    y={11 + r * cellH}
                    width={cellW + 0.15}
                    height={cellH + 0.15}
                    fill={hex}
                  />
                );
              })
            )}
          </g>
        ) : (
          <text
            x="90"
            y="54"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="700"
          >
            픽셀을 그려주세요
          </text>
        )}
      </svg>
    );
  }

  const activeFrame = frameStyle ?? DEFAULT_FRAME_FOR_BIKE[bikeType];
  const clampedBrake = Math.max(0, Math.min(1, brakeProgress));
  const brakeDropY = (1 - clampedBrake) * -18;
  const brakeOpacity = 0.25 + clampedBrake * 0.75;

  const rearHub = { x: 44, y: 68 };
  const frontHub = { x: 136, y: 68 };
  const wheelR = 23;

  const framePrimaryColor =
    bikeType === 'ttareungi'
      ? '#10b981'
      : bikeType === 'fixie'
      ? '#94a3b8'
      : bikeType === 'pro'
      ? '#e2e8f0'
      : '#38bdf8';

  const frameAccentColor =
    bikeType === 'ttareungi'
      ? '#6ee7b7'
      : bikeType === 'fixie'
      ? '#cbd5e1'
      : bikeType === 'pro'
      ? '#fbbf24'
      : '#7dd3fc';

  return (
    <svg
      viewBox="0 0 180 100"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Ground line */}
      <line
        x1="18"
        y1="93"
        x2="162"
        y2="93"
        stroke={active ? 'rgba(148,163,184,0.45)' : 'rgba(148,163,184,0.25)'}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* === WHEELS === */}
      {[rearHub, frontHub].map((hub, idx) => {
        const isFixie = bikeType === 'fixie';
        const isPro = bikeType === 'pro';
        const rimColor =
          bikeType === 'normal'
            ? '#cbd5e1'
            : bikeType === 'ttareungi'
            ? '#e2e8f0'
            : isFixie
            ? '#f43f5e'
            : '#fbbf24';

        return (
          <g key={idx}>
            <circle
              cx={hub.x}
              cy={hub.y}
              r={wheelR}
              stroke="#0f172a"
              strokeWidth={isPro ? 4.2 : 4.8}
            />
            <circle
              cx={hub.x}
              cy={hub.y}
              r={wheelR + 1.4}
              stroke="#475569"
              strokeWidth="0.9"
            />
            <circle
              cx={hub.x}
              cy={hub.y}
              r={isFixie || isPro ? wheelR - 3.6 : wheelR - 2.6}
              stroke={rimColor}
              strokeWidth={isFixie ? 3.4 : isPro ? 3.2 : 1.9}
              opacity={isPro ? 0.92 : 1}
            />
            {[0, 45, 90, 135].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const rIn = isPro ? wheelR - 5 : wheelR - 3.5;
              const dx = Math.cos(rad) * rIn;
              const dy = Math.sin(rad) * rIn;
              return (
                <line
                  key={deg}
                  x1={hub.x - dx}
                  y1={hub.y - dy}
                  x2={hub.x + dx}
                  y2={hub.y + dy}
                  stroke={isFixie ? 'rgba(248,113,113,0.4)' : 'rgba(203,213,225,0.45)'}
                  strokeWidth={isPro ? '0.9' : '1.1'}
                />
              );
            })}
            {isPro && (
              <circle
                cx={hub.x}
                cy={hub.y}
                r={7.5}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="2 1.5"
              />
            )}
            <circle
              cx={hub.x}
              cy={hub.y}
              r={isPro ? 3.4 : 3}
              fill={isFixie ? '#f43f5e' : isPro ? '#fbbf24' : '#e2e8f0'}
            />
          </g>
        );
      })}

      {/* === FENDERS / RACK (Normal & Ttareungi) === */}
      {(bikeType === 'normal' || bikeType === 'ttareungi') && (
        <g>
          <path
            d="M 20 64 A 26 26 0 0 1 65 51"
            stroke={bikeType === 'ttareungi' ? '#f8fafc' : '#94a3b8'}
            strokeWidth={bikeType === 'ttareungi' ? 2.8 : 2.4}
            strokeLinecap="round"
          />
          <path
            d="M 114 52 A 26 26 0 0 1 159 62"
            stroke={bikeType === 'ttareungi' ? '#f8fafc' : '#94a3b8'}
            strokeWidth={bikeType === 'ttareungi' ? 2.8 : 2.4}
            strokeLinecap="round"
          />
          <path
            d="M 23 43 L 62 43 M 30 43 L 44 68 M 56 43 L 44 68"
            stroke={bikeType === 'ttareungi' ? '#10b981' : '#cbd5e1'}
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <rect x="20" y="40" width="5" height="4.5" rx="1" fill="#ef4444" />
        </g>
      )}

      {/* === FRAME GEOMETRY === */}
      {activeFrame === 'diamond' && (
        <g>
          <path d="M 44 68 L 80 68 L 66 35 Z" stroke={framePrimaryColor} strokeWidth="3.6" strokeLinejoin="round" />
          <path d="M 67 37 L 116 35 L 80 68" stroke={framePrimaryColor} strokeWidth="3.8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M 114 29 L 118 42 L 136 68" stroke={framePrimaryColor} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {activeFrame === 'stepthrough' && (
        <g>
          <path d="M 44 68 L 80 68 L 65 36" stroke={framePrimaryColor} strokeWidth="3.8" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M 44 68 L 65 36" stroke={framePrimaryColor} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 116 36 C 107 58, 95 68, 80 68" stroke={framePrimaryColor} strokeWidth="5.2" strokeLinecap="round" />
          <path d="M 116 36 C 107 58, 95 68, 80 68" stroke={frameAccentColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
          <path d="M 114 29 L 118 42 L 136 68" stroke={framePrimaryColor} strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {activeFrame === 'track' && (
        <g>
          <path d="M 44 68 L 80 68 L 68 33 Z" stroke={framePrimaryColor} strokeWidth="3.4" strokeLinejoin="round" />
          <path d="M 68 33 L 122 33 L 80 68" stroke={framePrimaryColor} strokeWidth="3.7" strokeLinejoin="round" />
          <path d="M 121 29 L 124 41 L 136 68" stroke={frameAccentColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {activeFrame === 'aero' && (
        <g>
          <path d="M 44 68 L 80 68 L 69 37 Z" stroke={bikeType === 'pro' ? '#64748b' : framePrimaryColor} strokeWidth="3.8" strokeLinejoin="round" />
          <path d="M 69 37 L 120 31 L 80 68" stroke={framePrimaryColor} strokeWidth="4.3" strokeLinejoin="round" />
          <line x1="72" y1="36.5" x2="118" y2="31.5" stroke={frameAccentColor} strokeWidth="1.7" strokeLinecap="round" />
          <line x1="84" y1="64" x2="117" y2="34" stroke={frameAccentColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 119 27 L 123 40 L 136 68" stroke={framePrimaryColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* === BIKE-SPECIFIC COCKPIT, BASKETS, SADDLE & BRAKES === */}
      {bikeType === 'normal' && (
        <g>
          <line x1="66" y1="35" x2="63" y2="25" stroke="#e2e8f0" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 54 24 Q 63 21 72 25 Q 63 28 54 24 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
          <path d="M 115 31 L 113 18 Q 108 16 102 19" stroke="#e2e8f0" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="102" cy="19" r="2.6" fill="#334155" />
          <path d="M 106 20 L 111 23" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 122 25 L 147 25 L 144 41 L 122 41 Z" fill="rgba(56,189,248,0.14)" stroke="#cbd5e1" strokeWidth="2" strokeLinejoin="round" />
          <line x1="129" y1="25" x2="128" y2="41" stroke="#cbd5e1" strokeWidth="1.1" />
          <line x1="138" y1="25" x2="137" y2="41" stroke="#cbd5e1" strokeWidth="1.1" />
          <line x1="122" y1="33" x2="146" y2="33" stroke="#cbd5e1" strokeWidth="1.1" />
          <circle cx="80" cy="68" r="5.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
          <circle cx="62" cy="49" r="2.4" fill="#e2e8f0" />
          <circle cx="123" cy="49" r="2.4" fill="#e2e8f0" />
        </g>
      )}

      {bikeType === 'ttareungi' && (
        <g>
          <rect x="43" y="63" width="41" height="10" rx="5" fill="#065f46" stroke="#34d399" strokeWidth="1.3" />
          <circle cx="80" cy="68" r="4.5" fill="#f8fafc" />
          <line x1="65" y1="36" x2="62" y2="25" stroke="#e2e8f0" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M 52 24 Q 62 20 71 25 Q 62 28 52 24 Z" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
          <path d="M 115 30 L 113 17 Q 107 15 101 18" stroke="#e2e8f0" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="101" cy="18" r="2.8" fill="#10b981" />
          <circle cx="111" cy="14" r="2" fill="#facc15" />
          <path d="M 122 24 L 149 24 L 146 41 L 122 41 Z" fill="rgba(16,185,129,0.18)" stroke="#f8fafc" strokeWidth="2.1" strokeLinejoin="round" />
          <rect x="123" y="29" width="24" height="5" fill="#10b981" opacity="0.85" />
          <circle cx="123" cy="49" r="2.5" fill="#10b981" />
        </g>
      )}

      {bikeType === 'fixie' && (
        <g>
          <line x1="68" y1="33" x2="64" y2="21" stroke="#334155" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M 55 21 L 75 20 L 71 23 L 56 23 Z" fill="#f43f5e" />
          <path d="M 121 30 L 123 23 L 135 23 Q 143 24 140 34 Q 137 41 129 40" stroke="#e2e8f0" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="80" cy="68" r="6.5" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.8" />
          <circle cx="44" cy="68" r="2" fill="#f8fafc" />
          <g transform={`translate(0, ${brakeDropY})`} opacity={brakeOpacity}>
            <path d="M 134 23 L 141 29" stroke="#fbbf24" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="135" cy="23" r="2.6" fill="#f43f5e" stroke="#fbbf24" strokeWidth="1.2" />
            <rect x="123" y="45" width="7" height="6" rx="1.5" fill="#fbbf24" stroke="#f43f5e" strokeWidth="1.2" />
            <rect x="56" y="45" width="7" height="6" rx="1.5" fill="#fbbf24" stroke="#f43f5e" strokeWidth="1.2" />
          </g>
        </g>
      )}

      {bikeType === 'pro' && (
        <g>
          <line x1="69" y1="37" x2="65" y2="21" stroke="#334155" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M 55 21 L 76 20 L 72 23 L 57 23 Z" fill="#fbbf24" />
          <path d="M 120 28 L 122 22 L 134 22 Q 143 24 141 36 Q 139 44 127 43" stroke="#cbd5e1" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M 132 22 L 137 18 L 140 24 L 134 25 Z" fill="#fbbf24" />
          <line x1="138" y1="24" x2="136" y2="34" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
          <rect x="89" y="47" width="6" height="12" rx="2" transform="rotate(35 92 53)" fill="#fbbf24" />
          <circle cx="80" cy="68" r="6.8" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
};
