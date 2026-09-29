/**
 * メニュー（menu.ts）とショートカット（input.ts）が共有するコマンド。
 * どちらの入口から呼んでも同じ挙動になるよう、操作の単位をここに集約する。
 */
import { DEFAULT_COLUMNS, DEFAULT_ROWS } from './config';
import type { GridSizeDialog } from './dialog';
import { exportPng, exportSvg } from './export';
import type { ShapeDialog } from './shape-dialog';
import {
  editor,
  grid,
  hasDrawing,
  hasDrawingOutside,
  resetGrid,
  resizeGrid,
  setShape,
} from './state';

export type Actions = {
  newDocument: () => void;
  changeCanvasSize: () => void;
  changeShape: () => void;
  exportPng: () => void;
  exportSvg: () => void;
  toggleGuide: () => void;
  isGuideVisible: () => boolean;
  toggleHighlight: () => void;
  isHighlightVisible: () => boolean;
};

export type ActionDeps = {
  /** 描画内容が変わったときに呼ぶ */
  onChange: () => void;
  /** グリッドの大きさが変わったときに呼ぶ（キャンバスの寸法を合わせ直す） */
  onGridChange: () => void;
  dialog: GridSizeDialog;
  shapeDialog: ShapeDialog;
};

export function createActions(deps: ActionDeps): Actions {
  const { onChange, onGridChange, dialog, shapeDialog } = deps;

  return {
    /** サイズを尋ねてから、その大きさの空のキャンバスにする */
    newDocument() {
      dialog.open({
        title: '新規作成',
        confirmLabel: '作成',
        initial: { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS },
        // Undo を持たないため、失う描画があることをダイアログ上で知らせる
        ...(hasDrawing() ? { warn: () => '現在の描画は破棄されます' } : {}),
        onConfirm(size) {
          resetGrid(size);
          onGridChange();
        },
      });
    },

    changeCanvasSize() {
      dialog.open({
        title: 'キャンバスサイズを変更',
        confirmLabel: '決定',
        initial: { columns: grid.columns, rows: grid.rows },
        warn: (size) =>
          hasDrawingOutside(size) ? '縮小により、範囲外になる描画は失われます' : null,
        onConfirm(size) {
          if (resizeGrid(size)) onGridChange();
        },
      });
    },

    /** ノード形状。操作中は即座に反映する（機能仕様書 17.5） */
    changeShape() {
      shapeDialog.open({
        initial: grid.shape,
        onChange(shape) {
          if (setShape(shape)) onChange();
        },
      });
    },

    exportPng,
    exportSvg,

    toggleGuide() {
      editor.showGuide = !editor.showGuide;
      onChange();
    },

    isGuideVisible: () => editor.showGuide,

    toggleHighlight() {
      editor.showHighlight = !editor.showHighlight;
      onChange();
    },

    isHighlightVisible: () => editor.showHighlight,
  };
}
