/**
 * グリッドの幾何計算。UI・描画方式に依存しない純粋関数のみを置く。
 * 設計書 docs/implement/prototype-01.md 8 章、技術仕様書 6.2 / 7.2。
 */
import { CELL_SIZE, COLUMNS, ROWS, SAMPLE_STEP } from './config';
import type { GridPoint, RegionId, RegionKind, RegionShape } from './types';

/** セル中心から見た内接円の半径（グリッド座標） */
const UNIT_RADIUS = 0.5;

/** 隅領域を NW から時計回りに何回 90 度回して得るか */
const CORNER_TURNS: Record<Exclude<RegionKind, 'C'>, number> = {
  NW: 0,
  NE: 1,
  SE: 2,
  SW: 3,
};

/** SVG の円弧フラグ。隅領域はすべて同じ向きの四分円なので定数でよい */
export const ARC_LARGE_FLAG = 0;
export const ARC_SWEEP_FLAG = 0;

/** キャンバス上の CSS ピクセル座標をグリッド座標に変換する */
export function screenToGrid(px: number, py: number): GridPoint {
  return { gx: px / CELL_SIZE, gy: py / CELL_SIZE };
}

/**
 * グリッド座標の点が属する領域を返す。グリッド外なら null。
 * 円周上（中心からの距離がちょうど半径）は円領域に含める。
 */
export function hitTest(gx: number, gy: number): RegionId | null {
  const col = Math.floor(gx);
  const row = Math.floor(gy);
  if (col < 0 || col >= COLUMNS || row < 0 || row >= ROWS) return null;

  const lx = gx - col;
  const ly = gy - row;
  const dx = lx - 0.5;
  const dy = ly - 0.5;

  if (Math.hypot(dx, dy) <= UNIT_RADIUS) return { col, row, kind: 'C' };

  const kind: RegionKind = dy < 0 ? (dx < 0 ? 'NW' : 'NE') : dx < 0 ? 'SW' : 'SE';
  return { col, row, kind };
}

/**
 * 2 点間を等間隔にサンプリングし、通過した領域を重複なく返す。
 * 始点は含まない（直前の pointermove で処理済みのため）。
 */
export function regionsOnSegment(from: GridPoint, to: GridPoint): RegionId[] {
  const dist = Math.hypot(to.gx - from.gx, to.gy - from.gy);
  const steps = Math.max(1, Math.ceil(dist / SAMPLE_STEP));

  const found: RegionId[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const region = hitTest(from.gx + (to.gx - from.gx) * t, from.gy + (to.gy - from.gy) * t);
    if (!region) continue;

    const key = `${region.col},${region.row},${region.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(region);
  }
  return found;
}

/** 原点まわりに 90 度 × turns だけ回転する（画面座標系なので時計回り） */
function rotate(turns: number, x: number, y: number): { x: number; y: number } {
  switch (turns % 4) {
    case 1:
      return { x: -y, y: x };
    case 2:
      return { x: -x, y: -y };
    case 3:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

/**
 * 領域の形状をワールド座標（px）で返す。
 * 隅領域は NW の形（頂点 → 辺の中点 → 円弧 → 辺の中点）を回転して作る。
 */
export function regionShape(region: RegionId): RegionShape {
  const r = CELL_SIZE / 2;
  const cx = region.col * CELL_SIZE + r;
  const cy = region.row * CELL_SIZE + r;

  if (region.kind === 'C') return { type: 'circle', cx, cy, r };

  const turns = CORNER_TURNS[region.kind];
  const corner = rotate(turns, -r, -r);
  const arcStart = rotate(turns, 0, -r);
  const arcEnd = rotate(turns, -r, 0);

  return {
    type: 'corner',
    cx,
    cy,
    corner: { x: cx + corner.x, y: cy + corner.y },
    arcStart: { x: cx + arcStart.x, y: cy + arcStart.y },
    arcEnd: { x: cx + arcEnd.x, y: cy + arcEnd.y },
    r,
  };
}
