/**
 * Canvas 2D への描画。設計書 docs/implement/prototype-01.md 9 章。
 *
 * キャンバスは表示領域（ステージ）と同じ大きさだけを持ち、見えている範囲の
 * セルだけを描く。グリッド全体を毎フレーム描くと、大きなグリッドでは
 * 1 フレームに秒単位を要してしまうためである。
 */
import { CELL_SIZE, COLOR_FILL, COLOR_GUIDE, COLOR_HIGHLIGHT, GUIDE_WIDTH, HIGHLIGHT_WIDTH } from './config';
import { gridPixelSize, regionShape } from './geometry';
import { editor, filledRegions, grid, type CellBounds } from './state';
import type { RegionId } from './types';

/** 表示領域。キャンバスの左上を原点とした CSS ピクセルで表す */
export type Viewport = {
  /** グリッドの原点（左上）の位置 */
  offsetX: number;
  offsetY: number;
  /** 表示領域の大きさ */
  width: number;
  height: number;
};

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
    else
      ctx.bezierCurveTo(
        segment.c1.x,
        segment.c1.y,
        segment.c2.x,
        segment.c2.y,
        segment.to.x,
        segment.to.y,
      );
  }
  ctx.closePath();
}

/** 描画済み領域のみを塗る。書き出し側からも使う（範囲を絞らなければグリッド全体） */
export function paintGlyph(ctx: CanvasRenderingContext2D, bounds?: CellBounds): void {
  ctx.fillStyle = COLOR_FILL;
  ctx.beginPath();
  for (const region of filledRegions(bounds)) {
    traceRegion(ctx, region, grid.shape);
  }
  ctx.fill();
}

function drawGuides(ctx: CanvasRenderingContext2D, bounds: CellBounds): void {
  const { width, height } = gridPixelSize(grid);
  // ガイド線の太さは倍率によらず一定に保つ（機能仕様書 14.6）
  const lineWidth = GUIDE_WIDTH / editor.zoom;
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = lineWidth;

  // 正方形グリッド線。線を境界にぴったり乗せるため半線幅ずらす
  const offset = lineWidth / 2;
  ctx.beginPath();
  for (let col = bounds.colStart; col <= bounds.colEnd + 1; col++) {
    const x = Math.min(col * CELL_SIZE + offset, width - offset);
    ctx.moveTo(x, bounds.rowStart * CELL_SIZE);
    ctx.lineTo(x, Math.min((bounds.rowEnd + 1) * CELL_SIZE, height));
  }
  for (let row = bounds.rowStart; row <= bounds.rowEnd + 1; row++) {
    const y = Math.min(row * CELL_SIZE + offset, height - offset);
    ctx.moveTo(bounds.colStart * CELL_SIZE, y);
    ctx.lineTo(Math.min((bounds.colEnd + 1) * CELL_SIZE, width), y);
  }
  ctx.stroke();

  // ノードグリッド線。中心領域の輪郭そのものなので、ノード形状に追従する
  ctx.beginPath();
  for (let row = bounds.rowStart; row <= bounds.rowEnd; row++) {
    for (let col = bounds.colStart; col <= bounds.colEnd; col++) {
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

/** 表示領域に入っているセルの範囲を求める。端の線が欠けないよう 1 セル広げる */
function visibleCells(view: Viewport): CellBounds {
  const left = -view.offsetX / editor.zoom;
  const top = -view.offsetY / editor.zoom;
  const right = (view.width - view.offsetX) / editor.zoom;
  const bottom = (view.height - view.offsetY) / editor.zoom;

  return {
    colStart: Math.max(0, Math.floor(left / CELL_SIZE) - 1),
    colEnd: Math.min(grid.columns - 1, Math.floor(right / CELL_SIZE) + 1),
    rowStart: Math.max(0, Math.floor(top / CELL_SIZE) - 1),
    rowEnd: Math.min(grid.rows - 1, Math.floor(bottom / CELL_SIZE) + 1),
  };
}

/**
 * 表示領域を描き直す。キャンバスの寸法は表示領域に合わせる。
 * グリッドの地色はキャンバスの下に敷いた要素が受け持つため、ここでは描かない。
 */
export function render(canvas: HTMLCanvasElement, view: Viewport): void {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(view.width * dpr));
  const height = Math.max(1, Math.round(view.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context を取得できませんでした');

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // ワールド座標 → デバイスピクセル
  const scale = editor.zoom * dpr;
  ctx.setTransform(scale, 0, 0, scale, view.offsetX * dpr, view.offsetY * dpr);

  const bounds = visibleCells(view);
  if (bounds.colEnd < bounds.colStart || bounds.rowEnd < bounds.rowStart) return;

  paintGlyph(ctx, bounds);

  if (editor.showGuide) drawGuides(ctx, bounds);

  // 他のすべてより前面に描く
  if (editor.showHighlight && editor.hoverRegion) drawHighlight(ctx, editor.hoverRegion);
}
