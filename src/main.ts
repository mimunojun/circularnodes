/** 初期化とイベント配線。 */
import { createActions } from './actions';
import { attachInput } from './input';
import { attachMenuBar } from './menu';
import { render, setupCanvas } from './render';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) throw new Error('#canvas が見つかりません');

const ctx = setupCanvas(canvas);

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

const actions = createActions(requestRender);
const menuBar = attachMenuBar(document.body, actions);

attachInput(canvas, { onChange: requestRender, actions, onEscape: menuBar.closeMenus });
render(ctx);
