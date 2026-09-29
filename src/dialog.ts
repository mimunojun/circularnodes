/**
 * キャンバスサイズ変更ダイアログ。機能仕様書 8.2。
 * 「編集 > キャンバスサイズを変更…」と「ファイル > 新規作成」の双方から使う。
 */
import { MAX_GRID_SIZE, MIN_GRID_SIZE } from './config';
import type { GridSize } from './types';

export type GridSizeDialogOptions = {
  title: string;
  confirmLabel: string;
  /** 入力欄の初期値 */
  initial: GridSize;
  /** 決定されたときだけ呼ばれる */
  onConfirm: (size: GridSize) => void;
  /** 入力中のサイズに対する警告文。null なら警告を出さない */
  warn?: (size: GridSize) => string | null;
};

export type GridSizeDialog = { open: (options: GridSizeDialogOptions) => void };

function field(labelText: string): { wrap: HTMLLabelElement; input: HTMLInputElement } {
  const wrap = document.createElement('label');
  wrap.className = 'dialog__field';

  const caption = document.createElement('span');
  caption.textContent = labelText;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(MIN_GRID_SIZE);
  input.max = String(MAX_GRID_SIZE);
  input.step = '1';
  input.required = true;
  input.inputMode = 'numeric';

  wrap.append(caption, input);
  return { wrap, input };
}

export function createGridSizeDialog(host: HTMLElement): GridSizeDialog {
  const dialog = document.createElement('dialog');
  dialog.className = 'dialog';

  const form = document.createElement('form');
  form.method = 'dialog';
  form.className = 'dialog__form';

  const title = document.createElement('h2');
  title.className = 'dialog__title';

  const row = document.createElement('div');
  row.className = 'dialog__row';
  const columns = field('横');
  const rows = field('縦');
  const times = document.createElement('span');
  times.className = 'dialog__times';
  times.textContent = '×';
  row.append(columns.wrap, times, rows.wrap);

  const hint = document.createElement('p');
  hint.className = 'dialog__hint';
  hint.textContent = `${MIN_GRID_SIZE} 〜 ${MAX_GRID_SIZE} のセル数で指定します`;

  const warning = document.createElement('p');
  warning.className = 'dialog__warning';
  warning.hidden = true;

  const buttons = document.createElement('div');
  buttons.className = 'dialog__buttons';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'キャンセル';
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.className = 'is-primary';
  buttons.append(cancel, confirm);

  form.append(title, row, hint, warning, buttons);
  dialog.append(form);
  host.append(dialog);

  let current: GridSizeDialogOptions | null = null;

  /** 入力値を読む。整数でない・範囲外なら null */
  function readSize(): GridSize | null {
    const parse = (input: HTMLInputElement): number | null => {
      const value = Number(input.value);
      if (input.value.trim() === '' || !Number.isInteger(value)) return null;
      if (value < MIN_GRID_SIZE || value > MAX_GRID_SIZE) return null;
      return value;
    };
    const parsedColumns = parse(columns.input);
    const parsedRows = parse(rows.input);
    if (parsedColumns === null || parsedRows === null) return null;
    return { columns: parsedColumns, rows: parsedRows };
  }

  function validate(): void {
    const size = readSize();
    confirm.disabled = size === null;
    hint.classList.toggle('is-invalid', size === null);

    const message = size && current?.warn ? current.warn(size) : null;
    warning.textContent = message ?? '';
    warning.hidden = message === null;
  }

  columns.input.addEventListener('input', validate);
  rows.input.addEventListener('input', validate);

  cancel.addEventListener('click', () => dialog.close('cancel'));

  form.addEventListener('submit', (event) => {
    const size = readSize();
    if (!size) {
      event.preventDefault();
      return;
    }
    // method="dialog" なので既定動作でそのまま閉じる
    const options = current;
    current = null;
    queueMicrotask(() => options?.onConfirm(size));
  });

  dialog.addEventListener('close', () => {
    current = null;
  });

  return {
    open(options) {
      current = options;
      title.textContent = options.title;
      confirm.textContent = options.confirmLabel;
      columns.input.value = String(options.initial.columns);
      rows.input.value = String(options.initial.rows);
      validate();
      dialog.showModal();
      columns.input.focus();
      columns.input.select();
    },
  };
}
