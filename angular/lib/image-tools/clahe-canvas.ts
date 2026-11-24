// Copyright (c) 2026 Philipp Orlov

import { clahe, type ClaheOptions } from '@web-ui-kit/core/image';

/** Anything a canvas can draw from, with a known natural size. */
export type PictureSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

const cache = new WeakMap<PictureSource, Map<string, HTMLCanvasElement>>();

/**
 * The picture with CLAHE applied, as a canvas of the picture's natural size. The result is cached per source and
 * options, so toggling the enhancement on and off again costs nothing after the first time. The work runs on the
 * main thread: a few hundred milliseconds for a multi-megapixel photograph.
 */
export function claheCanvas(source: PictureSource, options: ClaheOptions = {}): HTMLCanvasElement {
  const key = `${options.tiles ?? 8}/${options.clip ?? 2}`;
  let byOptions = cache.get(source);
  if (!byOptions) {
    byOptions = new Map();
    cache.set(source, byOptions);
  }
  const cached = byOptions.get(key);
  if (cached) return cached;

  const { width, height } = sizeOf(source);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.drawImage(source, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  pixels.data.set(clahe(pixels, options).data);
  ctx.putImageData(pixels, 0, 0);

  byOptions.set(key, canvas);
  return canvas;
}

function sizeOf(source: PictureSource): { width: number; height: number } {
  if ('naturalWidth' in source) return { width: source.naturalWidth, height: source.naturalHeight };
  return { width: source.width, height: source.height };
}
