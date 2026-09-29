/**
 * ステータスバー。機能仕様書 14.5。
 * 左に操作の説明、右端に現在の倍率、その左に「-」「+」ボタンを置く。
 */
import { MAX_ZOOM, MIN_ZOOM } from './config';

export type StatusBarDeps = {
  /** 左に出す操作の説明 */
  hint: string;
  getZoom: () => number;
  onZoomOut: () => void;
  onZoomIn: () => void;
};

export type StatusBar = {
  /** 倍率の表示とボタンの活殺を現在の状態に合わせる */
  update: () => void;
};

function zoomButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'zoom__button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function attachStatusBar(host: HTMLElement, deps: StatusBarDeps): StatusBar {
  const bar = document.createElement('footer');
  bar.className = 'statusbar';

  const hint = document.createElement('span');
  hint.className = 'statusbar__hint';
  hint.textContent = deps.hint;

  const zoom = document.createElement('div');
  zoom.className = 'zoom';

  const out = zoomButton('-', deps.onZoomOut);
  out.setAttribute('aria-label', '縮小');
  const into = zoomButton('+', deps.onZoomIn);
  into.setAttribute('aria-label', '拡大');

  const value = document.createElement('span');
  value.className = 'zoom__value';
  value.setAttribute('aria-live', 'polite');

  zoom.append(out, into, value);
  bar.append(hint, zoom);
  host.append(bar);

  const update = (): void => {
    const current = deps.getZoom();
    value.textContent = `${Math.round(current * 100)}%`;
    out.disabled = current <= MIN_ZOOM;
    into.disabled = current >= MAX_ZOOM;
  };

  update();
  return { update };
}
