/** 初期化とイベント配線。 */
import { createActions } from './actions';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STOPS } from './config';
import { createGridSizeDialog } from './dialog';
import { gridPixelSize } from './geometry';
import { attachInput } from './input';
import { attachMenuBar } from './menu';
import { render, type Viewport } from './render';
import { createShapeDialog } from './shape-dialog';
import { editor, grid, setZoom } from './state';
import { attachStatusBar } from './statusbar';

function mustFind<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} が見つかりません`);
  return element;
}

const canvas = mustFind<HTMLCanvasElement>('#canvas');
const stage = mustFind<HTMLElement>('#stage');
/** グリッドと同じ大きさを占める要素。地色とポインタ操作を受け持つ */
const paper = mustFind<HTMLElement>('#paper');
/** スクロール範囲を決める箱 */
const inner = mustFind<HTMLElement>('#stage-inner');

/**
 * 用紙の寸法をグリッドと倍率に合わせ、その外側に表示領域の半分ずつ余白を取る。
 * 用紙のどの点もステージの中央まで持ってこられるようにするため（機能仕様書 15.4）。
 */
function syncPaper(): void {
  const { width, height } = gridPixelSize(grid);
  const paperWidth = width * editor.zoom;
  const paperHeight = height * editor.zoom;
  const marginX = stage.clientWidth / 2;
  const marginY = stage.clientHeight / 2;

  paper.style.width = `${paperWidth}px`;
  paper.style.height = `${paperHeight}px`;
  paper.style.left = `${marginX}px`;
  paper.style.top = `${marginY}px`;
  inner.style.width = `${paperWidth + marginX * 2}px`;
  inner.style.height = `${paperHeight + marginY * 2}px`;
}

/** 用紙がステージの中央に来るようスクロール位置を合わせる */
function centerPaper(): void {
  stage.scrollLeft = (inner.offsetWidth - stage.clientWidth) / 2;
  stage.scrollTop = (inner.offsetHeight - stage.clientHeight) / 2;
}

/** キャンバスから見た用紙の位置と、表示領域の大きさ */
function viewport(): Viewport {
  const stageBox = stage.getBoundingClientRect();
  const paperBox = paper.getBoundingClientRect();
  return {
    offsetX: paperBox.left - stageBox.left,
    offsetY: paperBox.top - stageBox.top,
    width: stage.clientWidth,
    height: stage.clientHeight,
  };
}

// 再描画は状態変更時のみ。1 フレームに 1 回へ束ねる
let frameRequested = false;
function requestRender(): void {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    render(canvas, viewport());
  });
}

/** 倍率が変わったら、用紙の寸法を合わせ直してから描き直す */
function applyViewChange(): void {
  syncPaper();
  statusBar.update();
  requestRender();
}

/** グリッドの大きさが変わったときは、あわせて表示位置を中央へ戻す */
function applyGridChange(): void {
  applyViewChange();
  centerPaper();
}

/**
 * 画面上の一点 (clientX, clientY) を動かさずに倍率を変える（機能仕様書 14.4）。
 * 用紙の寸法を変えたあと、ずれた分だけステージをスクロールして戻す。
 */
function zoomAt(zoom: number, clientX: number, clientY: number): void {
  // ポインタがステージの外（バーの上など）にあるときは、ステージの縁で受け止める
  const box = stage.getBoundingClientRect();
  const anchorX = Math.min(Math.max(clientX, box.left), box.right);
  const anchorY = Math.min(Math.max(clientY, box.top), box.bottom);

  const before = paper.getBoundingClientRect();
  // 基準点の下にあるワールド座標
  const worldX = (anchorX - before.left) / editor.zoom;
  const worldY = (anchorY - before.top) / editor.zoom;

  if (!setZoom(zoom)) return;
  applyViewChange();

  const after = paper.getBoundingClientRect();
  stage.scrollLeft += after.left + worldX * editor.zoom - anchorX;
  stage.scrollTop += after.top + worldY * editor.zoom - anchorY;
}

/** ステージの中心を保ったまま、次（前）の段階へ倍率を移す */
function zoomToStop(direction: 1 | -1): void {
  const current = editor.zoom;
  const next =
    direction > 0
      ? (ZOOM_STOPS.find((stop) => stop > current + 1e-6) ?? MAX_ZOOM)
      : ([...ZOOM_STOPS].reverse().find((stop) => stop < current - 1e-6) ?? MIN_ZOOM);

  const box = stage.getBoundingClientRect();
  zoomAt(next, box.left + box.width / 2, box.top + box.height / 2);
}

const statusBar = attachStatusBar(document.body, {
  hint: 'ドラッグ: 領域を塗る / 塗り済みの領域から始めると消す',
  getZoom: () => editor.zoom,
  onZoomOut: () => zoomToStop(-1),
  onZoomIn: () => zoomToStop(1),
});

const dialog = createGridSizeDialog(document.body);
const shapeDialog = createShapeDialog(document.body);
const actions = createActions({
  onChange: requestRender,
  onGridChange: applyGridChange,
  dialog,
  shapeDialog,
});
const menuBar = attachMenuBar(document.body, actions);

attachInput(paper, {
  onChange: requestRender,
  actions,
  onEscape: menuBar.closeMenus,
  stage,
  onZoomAt: zoomAt,
});

// 表示範囲だけを描くため、スクロールとステージの伸縮でも描き直す
stage.addEventListener('scroll', requestRender, { passive: true });
// 余白は表示領域の大きさから決まるので、伸縮したら取り直す
new ResizeObserver(() => {
  syncPaper();
  requestRender();
}).observe(stage);

syncPaper();
centerPaper();
requestRender();
