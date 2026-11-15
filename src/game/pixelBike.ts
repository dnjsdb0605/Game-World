import * as THREE from 'three';
import type { BikeFrameStyle, BikeType } from './types';

export const PIXEL_COLS = 28;
export const PIXEL_ROWS = 16;
export const PIXEL_TOTAL = PIXEL_COLS * PIXEL_ROWS;

export const DEFAULT_FRAME_FOR_BIKE: Record<BikeType, BikeFrameStyle> = {
  normal: 'diamond',
  ttareungi: 'stepthrough',
  fixie: 'track',
  pro: 'aero',
  custom: 'diamond',
};

export const FRAME_OPTIONS: {
  id: BikeFrameStyle;
  label: string;
  desc: string;
}[] = [
  { id: 'diamond', label: '다이아몬드 도안', desc: '표준 자전거 · 앞 바구니' },
  { id: 'stepthrough', label: '스텝스루 도안', desc: '낮은 프레임 · 편안한 형태' },
  { id: 'track', label: '수평 트랙 도안', desc: '일직선 프레임 · 심플형' },
  { id: 'aero', label: '에어로 로드 도안', desc: '드롭바 · 레이싱 형태' },
];

export const PIXEL_PALETTE: { hex: string; name: string }[] = [
  { hex: '#38bdf8', name: '스카이 블루' },
  { hex: '#0284c7', name: '코발트 블루' },
  { hex: '#10b981', name: '에메랄드 그린' },
  { hex: '#14b8a6', name: '민트' },
  { hex: '#facc15', name: '썬 옐로우' },
  { hex: '#fbbf24', name: '골드' },
  { hex: '#f97316', name: '오렌지' },
  { hex: '#ef4444', name: '레이싱 레드' },
  { hex: '#f43f5e', name: '로즈' },
  { hex: '#ec4899', name: '네온 핑크' },
  { hex: '#a855f7', name: '퍼플' },
  { hex: '#f8fafc', name: '화이트' },
  { hex: '#94a3b8', name: '실버 그레이' },
  { hex: '#334155', name: '다크 슬레이트' },
  { hex: '#0f172a', name: '타이어 블랙' },
  { hex: '#92400e', name: '클래식 브라운' },
];

export function createEmptyPixelGrid(): (string | null)[] {
  return Array.from({ length: PIXEL_TOTAL }, () => null);
}

function setPx(grid: (string | null)[], col: number, row: number, color: string): void {
  const c = Math.round(col);
  const r = Math.round(row);
  if (c >= 0 && c < PIXEL_COLS && r >= 0 && r < PIXEL_ROWS) {
    grid[r * PIXEL_COLS + c] = color;
  }
}

function drawLine(
  grid: (string | null)[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
): void {
  let cx = Math.round(x0);
  let cy = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - cx);
  const dy = Math.abs(ty - cy);
  const sx = cx < tx ? 1 : -1;
  const sy = cy < ty ? 1 : -1;
  let err = dx - dy;

  while (true) {
    setPx(grid, cx, cy, color);
    if (cx === tx && cy === ty) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}

function drawPixelWheel(grid: (string | null)[], cx: number, cy: number, rimColor: string): void {
  const tire = '#0f172a';
  // Crisp 9x9 hollow pixel wheel ring (radius ~4)
  const tireOffsets: [number, number][] = [
    [-1, -4], [0, -4], [1, -4],
    [-3, -3], [-2, -3], [2, -3], [3, -3],
    [-3, -2], [3, -2],
    [-4, -1], [4, -1],
    [-4, 0], [4, 0],
    [-4, 1], [4, 1],
    [-3, 2], [3, 2],
    [-3, 3], [-2, 3], [2, 3], [3, 3],
    [-1, 4], [0, 4], [1, 4],
  ];
  const rimOffsets: [number, number][] = [
    [-1, -3], [0, -3], [1, -3],
    [-2, -2], [2, -2],
    [-3, -1], [3, -1],
    [-3, 0], [3, 0],
    [-3, 1], [3, 1],
    [-2, 2], [2, 2],
    [-1, 3], [0, 3], [1, 3],
  ];

  tireOffsets.forEach(([dx, dy]) => setPx(grid, cx + dx, cy + dy, tire));
  rimOffsets.forEach(([dx, dy]) => setPx(grid, cx + dx, cy + dy, rimColor));
  setPx(grid, cx, cy, '#f8fafc');
}

/**
 * Generates a ready-to-ride 28x16 pixel bicycle template for any of the 4 frame styles.
 */
export function buildStarterPixelBike(
  style: BikeFrameStyle,
  frameColor = '#38bdf8'
): (string | null)[] {
  const grid = createEmptyPixelGrid();
  const rearHub = { x: 5, y: 11 };
  const frontHub = { x: 22, y: 11 };
  const bb = { x: 12, y: 11 };

  const rimColor =
    style === 'aero'
      ? '#fbbf24'
      : style === 'track'
      ? '#f43f5e'
      : style === 'stepthrough'
      ? '#e2e8f0'
      : '#cbd5e1';

  // 1. Wheels
  drawPixelWheel(grid, rearHub.x, rearHub.y, rimColor);
  drawPixelWheel(grid, frontHub.x, frontHub.y, rimColor);

  // 2. Frame tubes
  if (style === 'diamond') {
    drawLine(grid, rearHub.x, rearHub.y, bb.x, bb.y, frameColor);
    drawLine(grid, rearHub.x, rearHub.y, 10, 5, frameColor);
    drawLine(grid, bb.x, bb.y, 10, 5, frameColor);
    drawLine(grid, 10, 5, 19, 5, frameColor);
    drawLine(grid, bb.x, bb.y, 19, 6, frameColor);
    drawLine(grid, 19, 4, 20, 7, frameColor);
    drawLine(grid, 20, 7, frontHub.x, frontHub.y, frameColor);
    // Front basket + rear rack
    drawLine(grid, 21, 3, 24, 3, '#cbd5e1');
    drawLine(grid, 21, 5, 24, 5, '#cbd5e1');
    drawLine(grid, 24, 3, 24, 5, '#cbd5e1');
    drawLine(grid, 3, 6, 8, 6, '#94a3b8');
    setPx(grid, 2, 6, '#ef4444');
  } else if (style === 'stepthrough') {
    drawLine(grid, rearHub.x, rearHub.y, bb.x, bb.y, frameColor);
    drawLine(grid, rearHub.x, rearHub.y, 9, 5, frameColor);
    drawLine(grid, bb.x, bb.y, 9, 5, frameColor);
    // Low curved U-downtube
    drawLine(grid, 19, 5, 17, 9, frameColor);
    drawLine(grid, 17, 9, 15, 11, frameColor);
    drawLine(grid, 15, 11, bb.x, bb.y, frameColor);
    drawLine(grid, 19, 4, 20, 7, frameColor);
    drawLine(grid, 20, 7, frontHub.x, frontHub.y, frameColor);
    // Basket
    drawLine(grid, 21, 3, 24, 3, '#f8fafc');
    drawLine(grid, 21, 5, 24, 5, '#f8fafc');
    drawLine(grid, 24, 3, 24, 5, '#f8fafc');
  } else if (style === 'track') {
    drawLine(grid, rearHub.x, rearHub.y, bb.x, bb.y, frameColor);
    drawLine(grid, rearHub.x, rearHub.y, 10, 4, frameColor);
    drawLine(grid, bb.x, bb.y, 10, 4, frameColor);
    drawLine(grid, 10, 4, 20, 4, frameColor);
    drawLine(grid, bb.x, bb.y, 20, 6, frameColor);
    drawLine(grid, 20, 3, 20, 6, frameColor);
    drawLine(grid, 20, 6, frontHub.x, frontHub.y, '#e2e8f0');
  } else {
    // Aero racing silhouette
    drawLine(grid, rearHub.x, rearHub.y, bb.x, bb.y, frameColor);
    drawLine(grid, rearHub.x, rearHub.y, 10, 5, frameColor);
    drawLine(grid, bb.x, bb.y, 10, 5, frameColor);
    drawLine(grid, 10, 5, 19, 4, frameColor);
    drawLine(grid, bb.x, bb.y, 19, 6, frameColor);
    drawLine(grid, bb.x, bb.y - 1, 19, 5, '#fbbf24');
    drawLine(grid, 19, 3, 20, 6, frameColor);
    drawLine(grid, 20, 6, frontHub.x, frontHub.y, frameColor);
  }

  // 3. Seatpost & Saddle
  const seatRow = style === 'track' ? 3 : 4;
  setPx(grid, 9, seatRow, '#e2e8f0');
  drawLine(grid, 7, seatRow - 1, 11, seatRow - 1, '#92400e');

  // 4. Handlebar
  if (style === 'aero' || style === 'track') {
    setPx(grid, 19, 2, '#cbd5e1');
    drawLine(grid, 19, 2, 22, 2, '#f8fafc');
    setPx(grid, 23, 3, '#f8fafc');
    setPx(grid, 22, 4, '#f8fafc');
  } else {
    drawLine(grid, 19, 3, 19, 2, '#e2e8f0');
    drawLine(grid, 17, 1, 19, 2, '#334155');
  }

  // 5. Crank hub
  setPx(grid, bb.x, bb.y, '#facc15');
  return grid;
}

export function hasCustomPixels(pixels: (string | null)[]): boolean {
  return pixels.some((c) => c !== null);
}

/**
 * Converts a 28x16 custom pixel drawing directly into a 3D InstancedMesh voxel bicycle
 * aligned with PlayerBikeRig coordinates (rear = +Z, front = -Z, up = +Y).
 */
export function createVoxelBikeMesh(pixels: (string | null)[]): THREE.InstancedMesh {
  const filled: { col: number; row: number; hex: string }[] = [];
  for (let r = 0; r < PIXEL_ROWS; r++) {
    for (let c = 0; c < PIXEL_COLS; c++) {
      const hex = pixels[r * PIXEL_COLS + c];
      if (hex) {
        filled.push({ col: c, row: r, hex });
      }
    }
  }

  if (filled.length === 0) {
    filled.push({ col: 13, row: 8, hex: '#38bdf8' });
  }

  const voxelSize = 0.064;
  const voxelWidthX = 0.17;
  const geom = new THREE.BoxGeometry(voxelWidthX, voxelSize * 0.96, voxelSize * 0.96);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.1,
  });

  const mesh = new THREE.InstancedMesh(geom, mat, filled.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < filled.length; i++) {
    const item = filled[i];
    // col 0 (left on canvas) -> rear (+Z); col 27 (right on canvas) -> front (-Z)
    const z = 0.88 - (item.col + 0.5) * voxelSize;
    // row 15 (bottom on canvas) -> ground y~0.05; row 0 (top) -> y~1.02
    const y = 0.03 + (PIXEL_ROWS - 1 - item.row + 0.5) * voxelSize;
    dummy.position.set(0, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    color.set(item.hex);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
  return mesh;
}
