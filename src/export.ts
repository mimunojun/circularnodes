/**
 * PNG / SVG 書き出し。設計書 docs/implement/prototype-01.md 11 章。
 * ガイドは含めず、描画済み領域のみを背景透過で出力する。
 */
import { COLOR_FILL } from './config';
import { ARC_LARGE_FLAG, ARC_SWEEP_FLAG, gridPixelSize, regionShape } from './geometry';
import { paintGlyph } from './render';
import { filledRegions, grid } from './state';

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 余分な小数を落とす */
function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

/** ガイド無し・背景透過で PNG を書き出す */
export function exportPng(): void {
  const { width, height } = gridPixelSize(grid);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('書き出し用の Canvas 2D context を取得できませんでした');

  paintGlyph(ctx);

  canvas.toBlob((blob) => {
    if (blob) download(blob, `circularnodes-${timestamp()}.png`);
  }, 'image/png');
}

/** 描画済み領域を 1 つずつ要素として直列化する。パスの結合は行わない */
export function buildSvg(): string {
  const { width, height } = gridPixelSize(grid);
  const elements: string[] = [];

  for (const region of filledRegions()) {
    const shape = regionShape(region, grid.shape);

    if (shape.type === 'circle') {
      elements.push(
        `    <circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}"/>`,
      );
      continue;
    }

    if (shape.type === 'corner') {
      const d = [
        `M ${num(shape.corner.x)} ${num(shape.corner.y)}`,
        `L ${num(shape.arcStart.x)} ${num(shape.arcStart.y)}`,
        `A ${num(shape.r)} ${num(shape.r)} 0 ${ARC_LARGE_FLAG} ${ARC_SWEEP_FLAG}` +
          ` ${num(shape.arcEnd.x)} ${num(shape.arcEnd.y)}`,
        'Z',
      ].join(' ');
      elements.push(`    <path d="${d}"/>`);
      continue;
    }

    const commands = [`M ${num(shape.start.x)} ${num(shape.start.y)}`];
    for (const segment of shape.segments) {
      commands.push(
        segment.type === 'line'
          ? `L ${num(segment.to.x)} ${num(segment.to.y)}`
          : `C ${num(segment.c1.x)} ${num(segment.c1.y)}` +
            ` ${num(segment.c2.x)} ${num(segment.c2.y)}` +
            ` ${num(segment.to.x)} ${num(segment.to.y)}`,
      );
    }
    commands.push('Z');
    elements.push(`    <path d="${commands.join(' ')}"/>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"` +
      ` viewBox="0 0 ${width} ${height}">`,
    `  <g fill="${COLOR_FILL}">`,
    ...elements,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

export function exportSvg(): void {
  const blob = new Blob([buildSvg()], { type: 'image/svg+xml' });
  download(blob, `circularnodes-${timestamp()}.svg`);
}
