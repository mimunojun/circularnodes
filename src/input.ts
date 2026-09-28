/**
 * Pointer / Key の入力処理。設計書 docs/implement/prototype-01.md 10 章。
 * ツール切替は持たず、ストローク開始位置の状態で塗り／消しを決める。
 */
import { exportPng, exportSvg } from './export';
import { hitTest, regionsOnSegment, screenToGrid } from './geometry';
import { editor, isFilled, setFilled } from './state';
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

/** 入力を配線する。状態が変わったときだけ onChange を呼ぶ */
export function attachInput(canvas: HTMLCanvasElement, onChange: () => void): void {
  canvas.addEventListener('pointerdown', (event) => {
    const point = pointerToGrid(canvas, event);
    const region = hitTest(point.gx, point.gy);
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
    const regions = regionsOnSegment(editor.lastPoint, point);
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

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    switch (event.key.toLowerCase()) {
      case 'g':
        editor.showGuide = !editor.showGuide;
        onChange();
        break;
      case 'p':
        exportPng();
        break;
      case 's':
        exportSvg();
        break;
      default:
        break;
    }
  });
}
