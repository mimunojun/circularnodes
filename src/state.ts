/**
 * 描画状態とエディタ状態。設計書 docs/implement/prototype-01.md 7 章。
 * 状態は密配列で保持し、キャンバスサイズの変更時に作り直す。
 */
import { DEFAULT_COLUMNS, DEFAULT_ROWS, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from './config';
import {
  KIND_INDEX,
  KIND_ORDER,
  REGIONS_PER_CELL,
  type GridSize,
  type RegionId,
  type StrokeMode,
} from './types';

/** 現在のグリッドの大きさ。F-04 で実行時に変わる */
export const grid: GridSize = { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS };

/** 描画状態。0 = 未描画, 1 = 描画済み */
let filled = new Uint8Array(grid.columns * grid.rows * REGIONS_PER_CELL);

function indexIn(size: GridSize, col: number, row: number, kindIndex: number): number {
  return (row * size.columns + col) * REGIONS_PER_CELL + kindIndex;
}

export function regionIndex(region: RegionId): number {
  return indexIn(grid, region.col, region.row, KIND_INDEX[region.kind]);
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
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      for (const kind of KIND_ORDER) {
        if (filled[indexIn(grid, col, row, KIND_INDEX[kind])] === 1) {
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

/** 指定サイズに縮めたとき、範囲外に出て失われる描画があるか */
export function hasDrawingOutside(size: GridSize): boolean {
  for (const region of filledRegions()) {
    if (region.col >= size.columns || region.row >= size.rows) return true;
  }
  return false;
}

/**
 * グリッドの大きさを変える。新旧のセル範囲が重なる部分の描画だけを引き継ぎ、
 * 範囲外になった領域の描画は失われる（機能仕様書 8.3）。
 */
export function resizeGrid(size: GridSize): boolean {
  if (size.columns === grid.columns && size.rows === grid.rows) return false;

  const next = new Uint8Array(size.columns * size.rows * REGIONS_PER_CELL);
  const columns = Math.min(grid.columns, size.columns);
  const rows = Math.min(grid.rows, size.rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      for (let kind = 0; kind < REGIONS_PER_CELL; kind++) {
        next[indexIn(size, col, row, kind)] = filled[indexIn(grid, col, row, kind)] as number;
      }
    }
  }

  grid.columns = size.columns;
  grid.rows = size.rows;
  filled = next;
  return true;
}

/** 指定サイズの空のキャンバスにする */
export function resetGrid(size: GridSize): void {
  grid.columns = size.columns;
  grid.rows = size.rows;
  filled = new Uint8Array(size.columns * size.rows * REGIONS_PER_CELL);
}

export type EditorState = {
  /** 現在のストロークのモード。null ならドラッグ中でない */
  strokeMode: StrokeMode | null;
  /** 直前のポインタ位置（補間に使う）。グリッド座標 */
  lastPoint: { gx: number; gy: number } | null;
  showGuide: boolean;
  /** 表示倍率。描画内容・書き出し結果には影響しない（F-10） */
  zoom: number;
};

export const editor: EditorState = {
  strokeMode: null,
  lastPoint: null,
  showGuide: true,
  zoom: DEFAULT_ZOOM,
};

/** 倍率を範囲内に収めて設定する。値が変わったときだけ true を返す */
export function setZoom(zoom: number): boolean {
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  if (next === editor.zoom) return false;
  editor.zoom = next;
  return true;
}
