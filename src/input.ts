/**
 * Pointer / Key の入力処理。設計書 docs/implement/prototype-01.md 10 章。
 * ツール切替は持たず、ストローク開始位置の状態で塗り／消しを決める。
 */
import type { Actions } from './actions';
import { ZOOM_WHEEL_SENSITIVITY } from './config';
import { hitTest, regionsOnSegment, screenToGrid } from './geometry';
import { editor, grid, isFilled, setFilled, setHoverRegion } from './state';
import type { GridPoint, RegionId } from './types';

function pointerToGrid(canvas: HTMLCanvasElement, event: PointerEvent): GridPoint {
  const rect = canvas.getBoundingClientRect();
  return screenToGrid(event.clientX - rect.left, event.clientY - rect.top, editor.zoom);
}

function applyStroke(regions: RegionId[]): boolean {
  const value = editor.strokeMode === 'fill';
  let changed = false;
  for (const region of regions) {
    if (setFilled(region, value)) changed = true;
  }
  return changed;
}

/** Space を押している間のパン（F-11）。待機と実行の状態を持つ */
function attachPan(stage: HTMLElement): { isReady: () => boolean; setReady: (ready: boolean) => void } {
  let ready = false;
  let drag: { pointerId: number; x: number; y: number; left: number; top: number } | null = null;

  const endDrag = (): void => {
    if (!drag) return;
    if (stage.hasPointerCapture(drag.pointerId)) stage.releasePointerCapture(drag.pointerId);
    drag = null;
    stage.classList.remove('is-panning');
  };

  // 描画ハンドラへ渡さないよう、キャプチャ段階で受けて伝播を止める
  stage.addEventListener(
    'pointerdown',
    (event) => {
      if (!ready) return;
      event.preventDefault();
      event.stopPropagation();
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: stage.scrollLeft,
        top: stage.scrollTop,
      };
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-panning');
    },
    true,
  );

  stage.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.stopPropagation();
      // スクロール範囲の外へは出ないので、端まで来たらそこで止まる
      stage.scrollLeft = drag.left - (event.clientX - drag.x);
      stage.scrollTop = drag.top - (event.clientY - drag.y);
    },
    true,
  );

  for (const type of ['pointerup', 'pointercancel'] as const) {
    stage.addEventListener(type, endDrag, true);
  }

  return {
    isReady: () => ready,
    setReady(next) {
      if (next === ready) return;
      ready = next;
      stage.classList.toggle('is-pan-ready', next);
      // 押しながらのドラッグ中に離されたら、その時点で終える
      if (!next) endDrag();
    },
  };
}

export type InputDeps = {
  /** 状態が変わったときだけ呼ばれる */
  onChange: () => void;
  /** メニューと共有するコマンド */
  actions: Actions;
  /** Esc が押されたとき */
  onEscape: () => void;
  /** パンの対象となるスクロール領域 */
  stage: HTMLElement;
  /** 指定した倍率へ、画面上の一点を動かさないように変更する */
  onZoomAt: (zoom: number, clientX: number, clientY: number) => void;
};

/** 入力を配線する */
export function attachInput(canvas: HTMLCanvasElement, deps: InputDeps): void {
  const { onChange, actions, onEscape, stage, onZoomAt } = deps;
  const pan = attachPan(stage);

  canvas.addEventListener('pointerdown', (event) => {
    const point = pointerToGrid(canvas, event);
    const region = hitTest(point.gx, point.gy, grid);
    if (!region) return;

    // ストローク全体のモードを開始位置の状態で決める
    editor.strokeMode = isFilled(region) ? 'erase' : 'fill';
    editor.lastPoint = point;
    canvas.setPointerCapture(event.pointerId);

    setHoverRegion(region);
    applyStroke([region]);
    onChange();
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = pointerToGrid(canvas, event);

    // パン中は描画の対象を示す必要がないため強調しない（機能仕様書 16.3）
    const hover = pan.isReady() ? null : hitTest(point.gx, point.gy, grid);
    let changed = setHoverRegion(hover);

    if (editor.strokeMode !== null && editor.lastPoint !== null) {
      const regions = regionsOnSegment(editor.lastPoint, point, grid);
      editor.lastPoint = point;
      if (applyStroke(regions)) changed = true;
    }

    if (changed) onChange();
  });

  canvas.addEventListener('pointerleave', () => {
    if (setHoverRegion(null)) onChange();
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
  // ⌘ / Ctrl + ホイールでズーム（機能仕様書 14.3）。
  // ポインタがバーの上にあってもブラウザのページズームに渡らないよう window で受け、
  // preventDefault するため passive: false で登録する
  window.addEventListener(
    'wheel',
    (event) => {
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY);
      onZoomAt(editor.zoom * factor, event.clientX, event.clientY);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      onEscape();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // ダイアログの入力欄で打鍵している間はショートカットとして扱わない
    if (event.target instanceof HTMLElement && event.target.closest('input, dialog')) return;

    if (event.key === ' ') {
      // ブラウザ既定のスペースによるスクロールを抑える
      event.preventDefault();
      pan.setReady(true);
      if (setHoverRegion(null)) onChange();
      return;
    }

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

  window.addEventListener('keyup', (event) => {
    if (event.key === ' ') pan.setReady(false);
  });

  // キー操作の取りこぼしで押しっぱなしになるのを防ぐ
  window.addEventListener('blur', () => pan.setReady(false));
}
