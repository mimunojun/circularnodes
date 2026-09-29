/**
 * スライダー。
 *
 * ネイティブの `<input type="range">` はドラッグ中、つまみの位置がポインタに
 * 固定され、値を書き換えても描画が追従しない。吸着（機能仕様書 17.5）では
 * つまみが吸着位置に見える必要があるため、自前で描画と操作を持つ。
 */
export type SliderOptions = {
  min: number;
  max: number;
  step: number;
  /** ドラッグ中に吸着する値 */
  snapTo?: number[];
  /** 吸着が働く距離（スライダー上の px） */
  snapDistance?: number;
  /** 読み上げ用のラベル */
  label?: string;
  /** 値が変わったときに呼ばれる */
  onInput: (value: number) => void;
};

export type Slider = {
  element: HTMLElement;
  setValue: (value: number) => void;
  focus: () => void;
};

/** つまみの直径（px）。CSS と揃える */
const THUMB_SIZE = 16;

export function createSlider(options: SliderOptions): Slider {
  const { min, max, step, snapTo = [], snapDistance = 0, label, onInput } = options;

  const root = document.createElement('div');
  root.className = 'slider';
  root.tabIndex = 0;
  root.setAttribute('role', 'slider');
  root.setAttribute('aria-valuemin', String(min));
  root.setAttribute('aria-valuemax', String(max));
  if (label) root.setAttribute('aria-label', label);

  const track = document.createElement('div');
  track.className = 'slider__track';
  const fill = document.createElement('div');
  fill.className = 'slider__fill';
  track.append(fill);

  // 吸着位置の目印。どこで止まるかを見えるようにする
  for (const point of snapTo) {
    const mark = document.createElement('div');
    mark.className = 'slider__mark';
    mark.style.left = `${((point - min) / (max - min)) * 100}%`;
    track.append(mark);
  }

  const thumb = document.createElement('div');
  thumb.className = 'slider__thumb';

  root.append(track, thumb);

  // 幅が決まっていないうちに描くと、つまみが端に寄ったままになる。
  // 表示されたときや幅が変わったときに描き直す
  new ResizeObserver(() => render()).observe(root);

  let value = min;

  const clamp = (raw: number): number => Math.min(max, Math.max(min, raw));

  /** 刻みに丸める。浮動小数の桁あふれを落とす */
  const quantize = (raw: number): number => Number((Math.round(raw / step) * step).toFixed(6));

  /** つまみが動ける幅（px）。両端で track からはみ出さないようにする */
  const travel = (): number => Math.max(1, root.clientWidth - THUMB_SIZE);

  function render(): void {
    const ratio = (value - min) / (max - min);
    thumb.style.left = `${THUMB_SIZE / 2 + ratio * travel()}px`;
    fill.style.width = `${(ratio * 100).toFixed(4)}%`;
    root.setAttribute('aria-valuenow', String(value));
  }

  function set(next: number, notify: boolean): void {
    const clamped = clamp(quantize(next));
    if (clamped === value) {
      render();
      return;
    }
    value = clamped;
    render();
    if (notify) onInput(value);
  }

  /** ポインタ位置から値を求める。吸着点の近くならそこへ寄せる */
  function valueAt(clientX: number): number {
    const rect = root.getBoundingClientRect();
    const ratio = (clientX - rect.left - THUMB_SIZE / 2) / travel();
    const raw = clamp(min + ratio * (max - min));

    const perPixel = (max - min) / travel();
    const threshold = snapDistance * perPixel;
    return snapTo.find((point) => Math.abs(raw - point) <= threshold) ?? raw;
  }

  root.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    root.focus();
    root.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
    set(valueAt(event.clientX), true);
  });

  root.addEventListener('pointermove', (event) => {
    if (!root.hasPointerCapture(event.pointerId)) return;
    set(valueAt(event.clientX), true);
  });

  for (const type of ['pointerup', 'pointercancel'] as const) {
    root.addEventListener(type, (event) => {
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
      root.classList.remove('is-dragging');
    });
  }

  // キー操作では吸着しない。吸着範囲から出られなくなるため
  root.addEventListener('keydown', (event) => {
    const moves: Record<string, number> = {
      ArrowLeft: -step,
      ArrowDown: -step,
      ArrowRight: step,
      ArrowUp: step,
      PageDown: -step * 10,
      PageUp: step * 10,
    };
    if (event.key === 'Home') {
      event.preventDefault();
      set(min, true);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      set(max, true);
      return;
    }
    const delta = moves[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    set(value + delta, true);
  });

  return {
    element: root,
    setValue: (next) => set(next, false),
    focus: () => root.focus(),
  };
}
