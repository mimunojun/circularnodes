/**
 * ノード形状変更ダイアログ。機能仕様書 17.4 / 17.5。
 * 形は数値から想像しにくいため、セル 1 つのプレビューとキャンバスへの即時反映を併用する。
 */
import {
  CIRCLE_SHAPE,
  COLOR_BG,
  COLOR_FILL,
  COLOR_GUIDE,
  CELL_SIZE,
  MAX_SHAPE,
  MIN_SHAPE,
  SHAPE_PREVIEW_SIZE,
  SHAPE_SNAP_DISTANCE,
  SHAPE_STEP,
} from './config';
import { traceRegion } from './render';
import { createSlider } from './slider';

export type ShapeDialogOptions = {
  /** 開いたときの値 */
  initial: number;
  /** 操作のたびに呼ばれる。キャンセル時は開いたときの値で呼び戻す */
  onChange: (shape: number) => void;
};

export type ShapeDialog = { open: (options: ShapeDialogOptions) => void };

/**
 * 表示値は正円を中央の 0.5 に置く 2 区間の線形対応（機能仕様書 17.4）。
 * 前半と後半で t の進み方が変わる。
 */
const MIDPOINT = 0.5;

/** 表示値（0〜1）から形状値 t へ */
function toShape(normalized: number): number {
  return normalized <= MIDPOINT
    ? MIN_SHAPE + (normalized / MIDPOINT) * (CIRCLE_SHAPE - MIN_SHAPE)
    : CIRCLE_SHAPE + ((normalized - MIDPOINT) / MIDPOINT) * (MAX_SHAPE - CIRCLE_SHAPE);
}

/** 形状値 t から表示値（0〜1）へ */
function toNormalized(shape: number): number {
  return shape <= CIRCLE_SHAPE
    ? ((shape - MIN_SHAPE) / (CIRCLE_SHAPE - MIN_SHAPE)) * MIDPOINT
    : MIDPOINT + ((shape - CIRCLE_SHAPE) / (MAX_SHAPE - CIRCLE_SHAPE)) * MIDPOINT;
}

/**
 * 吸着先。厳密に描ける 2 つの形（45 度の正方形と正円、機能仕様書 17.7）。
 * 表示値の定義から導くので、範囲を変えても追従する。
 */
const SNAP_POINTS = [toNormalized(0), toNormalized(CIRCLE_SHAPE)];

/** 刻みに丸めたうえで、末尾の 0 を落とした文字列にする */
function format(normalized: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(SHAPE_STEP)));
  return String(Number(normalized.toFixed(digits)));
}

/** セル 1 つを切り出したプレビュー。中心領域を塗り、外形を枠線で示す */
function drawPreview(canvas: HTMLCanvasElement, shape: number): void {
  const dpr = window.devicePixelRatio || 1;
  const scale = (SHAPE_PREVIEW_SIZE / CELL_SIZE) * dpr;
  canvas.width = SHAPE_PREVIEW_SIZE * dpr;
  canvas.height = SHAPE_PREVIEW_SIZE * dpr;
  canvas.style.width = `${SHAPE_PREVIEW_SIZE}px`;
  canvas.style.height = `${SHAPE_PREVIEW_SIZE}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

  ctx.fillStyle = COLOR_FILL;
  ctx.beginPath();
  traceRegion(ctx, { col: 0, row: 0, kind: 'C' }, shape);
  ctx.fill();

  // 枠線は 1 CSS px 相当。半線幅ぶん内側に寄せてセルの外に出さない
  const lineWidth = CELL_SIZE / SHAPE_PREVIEW_SIZE;
  ctx.strokeStyle = COLOR_GUIDE;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(
    lineWidth / 2,
    lineWidth / 2,
    CELL_SIZE - lineWidth,
    CELL_SIZE - lineWidth,
  );
}

export function createShapeDialog(host: HTMLElement): ShapeDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';

  const form = document.createElement('form');
  form.method = 'dialog';
  form.className = 'dialog__form';

  const title = document.createElement('h2');
  title.className = 'dialog__title';
  title.textContent = 'ノード形状';

  const preview = document.createElement('canvas');
  preview.className = 'dialog__preview';

  const row = document.createElement('div');
  row.className = 'dialog__row dialog__row--shape';

  const slider = createSlider({
    min: 0,
    max: 1,
    step: SHAPE_STEP,
    snapTo: SNAP_POINTS,
    snapDistance: SHAPE_SNAP_DISTANCE,
    label: 'ノード形状',
    onInput: (next) => show(next, true),
  });

  const field = document.createElement('label');
  field.className = 'dialog__field';
  const number = document.createElement('input');
  number.type = 'number';
  number.min = '0';
  number.max = '1';
  number.step = String(SHAPE_STEP);
  field.append(number);

  row.append(slider.element, field);

  const hint = document.createElement('p');
  hint.className = 'dialog__hint';
  hint.textContent = `0 〜 1（${format(toNormalized(0))} で菱形、${format(toNormalized(0.5))} で正円）`;

  const buttons = document.createElement('div');
  buttons.className = 'dialog__buttons';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'キャンセル';
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.className = 'is-primary';
  confirm.value = 'ok';
  confirm.textContent = '決定';
  buttons.append(cancel, confirm);

  form.append(title, preview, row, hint, buttons);
  dialog.append(form);
  host.append(dialog);

  let current: ShapeDialogOptions | null = null;
  let shown = toNormalized(CIRCLE_SHAPE);

  /** 表示を値に合わせ、プレビューとキャンバスへ反映する */
  function show(normalized: number, notify: boolean): void {
    shown = Math.min(1, Math.max(0, normalized));
    const text = format(shown);
    slider.setValue(Number(text));
    number.value = text;

    const shape = toShape(Number(text));
    drawPreview(preview, shape);
    if (notify) current?.onChange(shape);
  }

  // 数値入力では吸着しない（機能仕様書 17.5）。空や不正なときは直前の値を保つ
  number.addEventListener('input', () => {
    const parsed = Number(number.value);
    const valid = number.value.trim() !== '' && Number.isFinite(parsed);
    show(valid ? parsed : shown, true);
  });

  cancel.addEventListener('click', () => dialog.close('cancel'));

  dialog.addEventListener('close', () => {
    const options = current;
    current = null;
    // 決定以外で閉じたときは開いたときの値へ戻す
    if (options && dialog.returnValue !== 'ok') options.onChange(options.initial);
  });

  return {
    open(options) {
      current = options;
      dialog.returnValue = '';
      // つまみの位置は幅から決まるので、表示してから値を反映する
      dialog.showModal();
      show(toNormalized(options.initial), false);
      slider.focus();
    },
  };
}
