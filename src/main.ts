/** 初期化とイベント配線。 */
import { createActions } from './actions';
import { createGridSizeDialog } from './dialog';
import { attachInput } from './input';
import { attachMenuBar } from './menu';
import { render, setupCanvas } from './render';

function requireCanvas(): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>('#canvas');
  if (!element) throw new Error('#canvas が見つかりません');
  return element;
}

const canvas = requireCanvas();

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

/** グリッドの大きさが変わったら、キャンバスの寸法を合わせ直してから描き直す */
function applyGridChange(): void {
  ctx = setupCanvas(canvas);
  requestRender();
}

const dialog = createGridSizeDialog(document.body);
const actions = createActions({ onChange: requestRender, onGridChange: applyGridChange, dialog });
const menuBar = attachMenuBar(document.body, actions);

attachInput(canvas, { onChange: requestRender, actions, onEscape: menuBar.closeMenus });
render(ctx);
