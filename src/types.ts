/** セル内の領域種別。C = 内接円の内側、他は円弧で切り取られた四隅 */
export type RegionKind = 'C' | 'NW' | 'NE' | 'SW' | 'SE';

/**
 * 領域の格納順。技術仕様書 4.4 のインデックス規則に対応する。
 * index = (row * COLUMNS + col) * REGIONS_PER_CELL + KIND_INDEX[kind]
 */
export const KIND_ORDER = ['C', 'NW', 'NE', 'SW', 'SE'] as const satisfies readonly RegionKind[];

export const REGIONS_PER_CELL = KIND_ORDER.length;

export const KIND_INDEX: Record<RegionKind, number> = {
  C: 0,
  NW: 1,
  NE: 2,
  SW: 3,
  SE: 4,
};

/** 領域の識別子。形状は持たず、geometry が都度導出する */
export type RegionId = {
  col: number;
  row: number;
  kind: RegionKind;
};

/** グリッドの大きさ（セル数） */
export type GridSize = {
  columns: number;
  rows: number;
};

/** グリッド座標上の点。単位はセル 1 個分 */
export type GridPoint = { gx: number; gy: number };

/** 1 ストロークの間だけ固定される描画モード */
export type StrokeMode = 'fill' | 'erase';

/**
 * 領域の形状。Canvas の描画命令と SVG のパス文字列の双方をここから生成する。
 * 座標はワールド座標（px）。
 */
export type RegionShape =
  | { type: 'circle'; cx: number; cy: number; r: number }
  | {
      type: 'corner';
      /** 円弧の中心（セル中心） */
      cx: number;
      cy: number;
      /** セルの頂点 */
      corner: { x: number; y: number };
      /** 円弧の始点（辺の中点） */
      arcStart: { x: number; y: number };
      /** 円弧の終点（辺の中点） */
      arcEnd: { x: number; y: number };
      r: number;
    };
