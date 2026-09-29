/** 初期化とイベント配線。 */
import { createActions } from './actions';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STOPS } from './config';
import { createGridSizeDialog } from './dialog';
import { attachInput } from './input';
import { attachMenuBar } from './menu';
import { render, setupCanvas } from './render';
import { editor, setZoom } from './state';
import { attachStatusBar } from './statusbar';

function mustFind<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} が見つかりません`);
  return element;
}

const canvas = mustFind<HTMLCanvasElement>('#canvas');
const stage = mustFind<HTMLElement>('#stage');

let ctx = setupCanvas(canvas);

// 再描画は状態変更時のみ。1 フレームに 1 回へ束ねる
let frameRequested = false;
function requestRender(): void {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    render(ctx);
  });
}

/** グリッドの大きさや倍率が変わったら、キャンバスの寸法を合わせ直してから描き直す */
function applyViewChange(): void {
  ctx = setupCanvas(canvas);
  statusBar.update();
  requestRender();
}

/**
 * 画面上の一点 (clientX, clientY) を動かさずに倍率を変える（機能仕様書 14.4）。
 * キャンバスの寸法を変えたあと、ずれた分だけステージをスクロールして戻す。
 */
function zoomAt(zoom: number, clientX: number, clientY: number): void {
  // ポインタがステージの外（バーの上など）にあるときは、ステージの縁で受け止める
  const box = stage.getBoundingClientRect();
  const anchorX = Math.min(Math.max(clientX, box.left), box.right);
  const anchorY = Math.min(Math.max(clientY, box.top), box.bottom);

  const before = canvas.getBoundingClientRect();
  // 基準点の下にあるワールド座標
  const worldX = (anchorX - before.left) / editor.zoom;
  const worldY = (anchorY - before.top) / editor.zoom;

  if (!setZoom(zoom)) return;
  applyViewChange();

  const after = canvas.getBoundingClientRect();
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
const actions = createActions({ onChange: requestRender, onGridChange: applyViewChange, dialog });
const menuBar = attachMenuBar(document.body, actions);

attachInput(canvas, {
  onChange: requestRender,
  actions,
  onEscape: menuBar.closeMenus,
  stage,
  onZoomAt: zoomAt,
});

render(ctx);
