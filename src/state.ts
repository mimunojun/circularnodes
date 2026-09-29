/**
 * 描画状態とエディタ状態。設計書 docs/implement/prototype-01.md 7 章。
 * p0.1 はグリッドが固定のため、状態は密配列で保持する。
 */
import { COLUMNS, ROWS } from './config';
import { KIND_INDEX, KIND_ORDER, REGIONS_PER_CELL, type RegionId, type StrokeMode } from './types';

/** 描画状態。0 = 未描画, 1 = 描画済み */
export const filled = new Uint8Array(COLUMNS * ROWS * REGIONS_PER_CELL);

export function regionIndex(region: RegionId): number {
  return (region.row * COLUMNS + region.col) * REGIONS_PER_CELL + KIND_INDEX[region.kind];
}

export function isFilled(region: RegionId): boolean {
  return filled[regionIndex(region)] === 1;
}

/** 領域の状態を設定する。値が変わったときだけ true を返す */
export function setFilled(region: RegionId, value: boolean): boolean {
  const index = regionIndex(region);
  const next = value ? 1 : 0;
  if (filled[index] === next) return false;
  filled[index] = next;
  return true;
}

/** 描画済みの領域を走査順（row → col → kind）に列挙する */
export function* filledRegions(): Generator<RegionId> {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      for (const kind of KIND_ORDER) {
        if (filled[(row * COLUMNS + col) * REGIONS_PER_CELL + KIND_INDEX[kind]] === 1) {
          yield { col, row, kind };
        }
      }
    }
  }
}

/** 描画済みの領域が 1 つでもあるか */
export function hasDrawing(): boolean {
  return filled.some((value) => value === 1);
}

/** すべての領域を未描画に戻す。状態が変わったときだけ true を返す */
export function clearAll(): boolean {
  if (!hasDrawing()) return false;
  filled.fill(0);
  return true;
}

export type EditorState = {
  /** 現在のストロークのモード。null ならドラッグ中でない */
  strokeMode: StrokeMode | null;
  /** 直前のポインタ位置（補間に使う）。グリッド座標 */
  lastPoint: { gx: number; gy: number } | null;
  showGuide: boolean;
};

export const editor: EditorState = {
  strokeMode: null,
  lastPoint: null,
  showGuide: true,
};
