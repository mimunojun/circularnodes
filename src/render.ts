/**
 * Canvas 2D への描画。設計書 docs/implement/prototype-01.md 9 章。
 * 差分描画は行わず、状態が変わるたびに全面を描き直す。
 */
import { CELL_SIZE, COLOR_BG, COLOR_FILL, COLOR_GUIDE, GUIDE_WIDTH } from './config';
import { gridPixelSize, regionShape } from './geometry';
import { editor, filledRegions, grid } from './state';
import type { RegionId } from './types';

/**
 * キャンバスを現在のグリッドの実寸に合わせ、devicePixelRatio を考慮した context を返す。
 * グリッドの大きさが変わったあとに呼び直してよい（寸法の代入で context の状態は初期化される）。
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const { width, height } = gridPixelSize(grid);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context を取得できませんでした');
  ctx.scale(dpr, dpr);
  return ctx;
}

/** 領域の輪郭を現在のパスに追加する */
export function traceRegion(ctx: CanvasRenderingContext2D, region: RegionId): void {
  const shape = regionShape(region);

  if (shape.type === 'circle') {
    ctx.moveTo(shape.cx + shape.r, shape.cy);
    ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
    return;
  }

  const startAngle = Math.atan2(shape.arcStart.y - shape.cy, shape.arcStart.x - shape.cx);
  const endAngle = Math.atan2(shape.arcEnd.y - shape.cy, shape.arcEnd.x - shape.cx);

  ctx.moveTo(shape.corner.x, shape.corner.y);
  ctx.lineTo(shape.arcStart.x, shape.arcStart.y);
  ctx.arc(shape.cx, shape.cy, shape.r, startAngle, endAngle, true);
  ctx.closePath();
}

/** 描画済み領域のみを塗る。書き出し側からも使う */
export function paintGlyph(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_FILL;
  ctx.beginPath();
  for (const region of filledRegions()) {
    traceRegion(ctx, region);
  }
  ctx.fill();
}

function drawGuides(ctx: CanvasRenderingContext2D): void {
  const { width, height } = gridPixelSize(grid);
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = GUIDE_WIDTH;

  // 正方形グリッド線。線幅 1px を境界にぴったり乗せるため半ピクセルずらす
  const offset = GUIDE_WIDTH / 2;
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

  // 正円グリッド線
  const r = CELL_SIZE / 2;
  ctx.beginPath();
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      const cx = col * CELL_SIZE + r;
      const cy = row * CELL_SIZE + r;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  ctx.stroke();
}

export function render(ctx: CanvasRenderingContext2D): void {
  const { width, height } = gridPixelSize(grid);
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, height);

  paintGlyph(ctx);

  if (editor.showGuide) drawGuides(ctx);
}
