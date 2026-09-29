/**
 * メニュー（menu.ts）とショートカット（input.ts）が共有するコマンド。
 * どちらの入口から呼んでも同じ挙動になるよう、操作の単位をここに集約する。
 */
import { exportPng, exportSvg } from './export';
import { clearAll, editor, hasDrawing } from './state';

export type Actions = {
  newDocument: () => void;
  exportPng: () => void;
  exportSvg: () => void;
  toggleGuide: () => void;
  isGuideVisible: () => boolean;
};

/** onChange は状態が変わったときだけ呼ぶ */
export function createActions(onChange: () => void): Actions {
  return {
    newDocument() {
      // Undo を持たないため、失う描画があるときだけ確認する
      if (hasDrawing() && !window.confirm('描画中の内容を破棄して新規作成しますか？')) return;
      if (clearAll()) onChange();
    },

    exportPng,
    exportSvg,

    toggleGuide() {
      editor.showGuide = !editor.showGuide;
      onChange();
    },

    isGuideVisible: () => editor.showGuide,
  };
}
