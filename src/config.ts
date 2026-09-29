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
export const MAX_GRID_SIZE = 100;

/** 正方形セルの辺長（px）。キャンバスのピクセル寸法はこれと行数・列数から決まる */
export const CELL_SIZE = 48;

/** 正円になるノード形状（機能仕様書 17.2）。表示値の中央 0.5 に対応する */
export const CIRCLE_SHAPE = 0.5;

/** 既定のノード形状 */
export const DEFAULT_SHAPE = CIRCLE_SHAPE;

/** ノード形状の下限・上限（機能仕様書 17.6） */
export const MIN_SHAPE = -0.5;
export const MAX_SHAPE = 0.625;

/** 表示値（0〜1 に正規化した値）の刻み */
export const SHAPE_STEP = 0.001;

/**
 * スライダーが厳密に描ける値へ吸着する距離（スライダー上の px）。
 * ドラッグ中のみ働き、数値入力には効かない（機能仕様書 17.5）。
 * 値ではなく画面上の距離で決めるのは、操作感が幅に左右されないようにするため。
 */
export const SHAPE_SNAP_DISTANCE = 8;

/** ダイアログ内プレビューの一辺（px） */
export const SHAPE_PREVIEW_SIZE = 112;

/** 四分曲線あたりの 3 次ベジェ分割数（機能仕様書 17.7） */
export const SHAPE_CURVE_SEGMENTS = 4;

/** 既定の表示倍率（機能仕様書 14.2） */
export const DEFAULT_ZOOM = 1;

/** 表示倍率の下限・上限 */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** ステータスバーの「+」「-」ボタンが移動する倍率の段階 */
export const ZOOM_STOPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** ホイールの移動量（px）から倍率への変換係数。大きいほど敏感になる */
export const ZOOM_WHEEL_SENSITIVITY = 0.0025;

/** 背景色。書き出しには使わない（書き出しの背景は透過） */
export const COLOR_BG = '#ffffff';

/** 描画済み領域の色 */
export const COLOR_FILL = '#111111';

/** グリッド線・内接円の色 */
export const COLOR_GUIDE = '#d4d4d4';

/** ガイド線の太さ（px） */
export const GUIDE_WIDTH = 1;

/** ハイライトの色（機能仕様書 16.2）。グリッド線・字形のいずれとも紛れない赤 */
export const COLOR_HIGHLIGHT = '#e5484d';

/** ハイライトの線幅（px）。グリッド線より少しだけ太くする */
export const HIGHLIGHT_WIDTH = 2;

/**
 * ドラッグ補間のサンプリング間隔（グリッド座標）。
 * 隅領域は円との接点付近で細くなるため、0.25 では横方向のドラッグで
 * 取りこぼしが出た。設計書 8.2 の 0.25 から 0.1 に変更している。
 */
export const SAMPLE_STEP = 0.1;
