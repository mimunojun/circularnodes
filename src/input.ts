/**
 * Pointer / Key の入力処理。設計書 docs/implement/prototype-01.md 10 章。
 * ツール切替は持たず、ストローク開始位置の状態で塗り／消しを決める。
 */
import type { Actions } from './actions';
import { hitTest, regionsOnSegment, screenToGrid } from './geometry';
import { editor, grid, isFilled, setFilled } from './state';
import type { GridPoint, RegionId } from './types';

function pointerToGrid(canvas: HTMLCanvasElement, event: PointerEvent): GridPoint {
  const rect = canvas.getBoundingClientRect();
  return screenToGrid(event.clientX - rect.left, event.clientY - rect.top);
}

function applyStroke(regions: RegionId[]): boolean {
  const value = editor.strokeMode === 'fill';
  let changed = false;
  for (const region of regions) {
    if (setFilled(region, value)) changed = true;
  }
  return changed;
}

export type InputDeps = {
  /** 状態が変わったときだけ呼ばれる */
  onChange: () => void;
  /** メニューと共有するコマンド */
  actions: Actions;
  /** Esc が押されたとき */
  onEscape: () => void;
};

/** 入力を配線する */
export function attachInput(canvas: HTMLCanvasElement, deps: InputDeps): void {
  const { onChange, actions, onEscape } = deps;

  canvas.addEventListener('pointerdown', (event) => {
    const point = pointerToGrid(canvas, event);
    const region = hitTest(point.gx, point.gy, grid);
    if (!region) return;

    // ストローク全体のモードを開始位置の状態で決める
    editor.strokeMode = isFilled(region) ? 'erase' : 'fill';
    editor.lastPoint = point;
    canvas.setPointerCapture(event.pointerId);

    if (applyStroke([region])) onChange();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (editor.strokeMode === null || editor.lastPoint === null) return;

    const point = pointerToGrid(canvas, event);
    const regions = regionsOnSegment(editor.lastPoint, point, grid);
    editor.lastPoint = point;

    if (applyStroke(regions)) onChange();
  });

  const endStroke = (event: PointerEvent) => {
    if (editor.strokeMode === null) return;
    editor.strokeMode = null;
    editor.lastPoint = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  // ショートカットは修飾キーを伴わない単独キー（機能仕様書 13.7）
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      onEscape();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // ダイアログの入力欄で打鍵している間はショートカットとして扱わない
    if (event.target instanceof HTMLElement && event.target.closest('input, dialog')) return;

    const shortcut: Record<string, () => void> = {
      n: actions.newDocument,
      g: actions.toggleGuide,
      p: actions.exportPng,
      s: actions.exportSvg,
    };
    const run = shortcut[event.key.toLowerCase()];
    if (!run) return;

    // ダイアログを開くショートカットでは、この打鍵がそのまま入力欄へ入らないようにする
    event.preventDefault();
    run();
  });
}
