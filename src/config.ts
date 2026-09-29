/** p0.1 の定数。設計書 docs/implement/prototype-01.md 6 章。 */

/** 横方向のセル数の既定値。実際の値は実行時に変更できる（F-04） */
export const DEFAULT_COLUMNS = 8;

/** 縦方向のセル数の既定値 */
export const DEFAULT_ROWS = 8;

/** 行数・列数の下限 */
export const MIN_GRID_SIZE = 1;

/**
 * 行数・列数の上限。
 * ズーム・パンを持たない現状では、これを超えるとキャンバスが画面に収まらない。
 */
export const MAX_GRID_SIZE = 32;

/** 正方形セルの辺長（px）。キャンバスのピクセル寸法はこれと行数・列数から決まる */
export const CELL_SIZE = 48;

/** 背景色。書き出しには使わない（書き出しの背景は透過） */
export const COLOR_BG = '#ffffff';

/** 描画済み領域の色 */
export const COLOR_FILL = '#111111';

/** グリッド線・内接円の色 */
export const COLOR_GUIDE = '#d4d4d4';

/** ガイド線の太さ（px） */
export const GUIDE_WIDTH = 1;

/**
 * ドラッグ補間のサンプリング間隔（グリッド座標）。
 * 隅領域は円との接点付近で細くなるため、0.25 では横方向のドラッグで
 * 取りこぼしが出た。設計書 8.2 の 0.25 から 0.1 に変更している。
 */
export const SAMPLE_STEP = 0.1;
