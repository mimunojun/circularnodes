/** p0.1 の定数。設計書 docs/implement/prototype-01.md 6 章。 */

/** 横方向のセル数 */
export const COLUMNS = 8;

/** 縦方向のセル数 */
export const ROWS = 8;

/** 正方形セルの辺長（px）。キャンバスの寸法もここから決まる */
export const CELL_SIZE = 48;

/** キャンバスの幅（px） */
export const CANVAS_WIDTH = COLUMNS * CELL_SIZE;

/** キャンバスの高さ（px） */
export const CANVAS_HEIGHT = ROWS * CELL_SIZE;

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
