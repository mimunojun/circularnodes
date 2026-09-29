/**
 * Canvas 2D への描画。設計書 docs/implement/prototype-01.md 9 章。
 * 差分描画は行わず、状態が変わるたびに全面を描き直す。
 */
import {
  CELL_SIZE,
  COLOR_BG,
  COLOR_FILL,
  COLOR_GUIDE,
  COLOR_HIGHLIGHT,
  GUIDE_WIDTH,
  HIGHLIGHT_WIDTH,
  MAX_BACKING_SIZE,
} from './config';
import { gridPixelSize, regionShape } from './geometry';
import { editor, filledRegions, grid } from './state';
import type { RegionId } from './types';

/**
 * キャンバスを現在のグリッドと倍率に合わせ、描画用の context を返す。
 * グリッドの大きさや倍率が変わったあとに呼び直してよい
 * （寸法の代入で context の状態は初期化される）。
 *
 * 表示寸法は倍率どおりにし、描画先は倍率と devicePixelRatio の分だけ
 * 細かく取る。拡大しても輪郭が滑らかに保たれる（機能仕様書 14.6）。
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const { width, height } = gridPixelSize(grid);
  const dpr = window.devicePixelRatio || 1;

  // 描画先が過大にならないよう、一辺の上限で頭打ちにする
  const maxScale = MAX_BACKING_SIZE / Math.max(width, height);
  const scale = Math.min(editor.zoom * dpr, maxScale);

  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.style.width = `${width * editor.zoom}px`;
  canvas.style.height = `${height * editor.zoom}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context を取得できませんでした');
  // 丸めた実寸から倍率を求め直し、端が欠けないようにする
  ctx.scale(canvas.width / width, canvas.height / height);
  return ctx;
}

/** 領域の輪郭を現在のパスに追加する */
export function traceRegion(
  ctx: CanvasRenderingContext2D,
  region: RegionId,
  shapeValue: number,
): void {
  const shape = regionShape(region, shapeValue);

  if (shape.type === 'circle') {
    ctx.moveTo(shape.cx + shape.r, shape.cy);
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    return;
  }

  if (shape.type === 'corner') {
    const startAngle = Math.atan2(shape.arcStart.y - shape.cy, shape.arcStart.x - shape.cx);
    const endAngle = Math.atan2(shape.arcEnd.y - shape.cy, shape.arcEnd.x - shape.cx);

    ctx.moveTo(shape.corner.x, shape.corner.y);
    ctx.lineTo(shape.arcStart.x, shape.arcStart.y);
    ctx.arc(shape.cx, shape.cy, shape.r, startAngle, endAngle, true);
    ctx.closePath();
    return;
  }

  ctx.moveTo(shape.start.x, shape.start.y);
  for (const segment of shape.segments) {
    if (segment.type === 'line') ctx.lineTo(segment.to.x, segment.to.y);
    else ctx.bezierCurveTo(segment.c1.x, segment.c1.y, segment.c2.x, segment.c2.y, segment.to.x, segment.to.y);
  }
  ctx.closePath();
}

/** 描画済み領域のみを塗る。書き出し側からも使う */
export function paintGlyph(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_FILL;
  ctx.beginPath();
  for (const region of filledRegions()) {
    traceRegion(ctx, region, grid.shape);
  }
  ctx.fill();
}

function drawGuides(ctx: CanvasRenderingContext2D): void {
  const { width, height } = gridPixelSize(grid);
  // ガイド線の太さは倍率によらず一定に保つ（機能仕様書 14.6）
  const lineWidth = GUIDE_WIDTH / editor.zoom;
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = lineWidth;

  // 正方形グリッド線。線を境界にぴったり乗せるため半線幅ずらす
  const offset = lineWidth / 2;
  ctx.beginPath();
  for (let col = 0; col <= grid.columns; col++) {
    const x = Math.min(col * CELL_SIZE + offset, width - offset);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let row = 0; row <= grid.rows; row++) {
    const y = Math.min(row * CELL_SIZE + offset, height - offset);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // ノードグリッド線。中心領域の輪郭そのものなので、ノード形状に追従する
  ctx.beginPath();
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      traceRegion(ctx, { col, row, kind: 'C' }, grid.shape);
    }
  }
  ctx.stroke();
}

/** ポインタが乗っている領域の輪郭を強調する（F-12）。書き出しには含めない */
function drawHighlight(ctx: CanvasRenderingContext2D, region: RegionId): void {
  ctx.strokeStyle = COLOR_HIGHLIGHT;
  // 線幅は倍率によらず一定に保つ
  ctx.lineWidth = HIGHLIGHT_WIDTH / editor.zoom;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  traceRegion(ctx, region, grid.shape);
  ctx.stroke();
}

export function render(ctx: CanvasRenderingContext2D): void {
  const { width, height } = gridPixelSize(grid);
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, height);

  paintGlyph(ctx);

  if (editor.showGuide) drawGuides(ctx);

  // 他のすべてより前面に描く
  if (editor.showHighlight && editor.hoverRegion) drawHighlight(ctx, editor.hoverRegion);
}
