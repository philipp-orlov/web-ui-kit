// Copyright (c) 2026 Philipp Orlov

/** Pixels, as ImageData has them (RGBA, row by row). Plain objects work too, so this runs outside a browser. */
export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ClaheOptions {
  /** Tiles across and down the picture: more tiles follow smaller detail. Default 8. */
  tiles?: number;
  /** Contrast limit per tile, as a multiple of the average bin height. Higher is stronger. Default 2. */
  clip?: number;
}

/**
 * Contrast-limited adaptive histogram equalisation (CLAHE) of the picture's luma. Each tile gets its own
 * equalisation curve, with the histogram clipped so flat areas do not turn to noise; the curves are blended
 * bilinearly across tile borders so there are no seams. Colour is kept: each pixel moves by the change of its luma.
 * Alpha is left alone. Returns a new buffer; the input is not changed.
 */
export function clahe(src: PixelBuffer, options: ClaheOptions = {}): PixelBuffer {
  const { width: w, height: h, data } = src;
  const out: PixelBuffer = { width: w, height: h, data: new Uint8ClampedArray(data) };
  if (w === 0 || h === 0) return out;

  const nx = Math.max(1, Math.min(options.tiles ?? 8, w));
  const ny = Math.max(1, Math.min(options.tiles ?? 8, h));
  const clip = options.clip ?? 2;
  const tw = Math.ceil(w / nx);
  const th = Math.ceil(h / ny);

  // Luma of every pixel, once.
  const luma = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    luma[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29 + 128) >> 8; // 0.299 R + 0.587 G + 0.114 B
  }

  // One equalisation curve (a 256-entry lookup table) per tile.
  const lut = new Uint8Array(nx * ny * 256);
  const hist = new Uint32Array(256);
  for (let ty = 0; ty < ny; ty++) {
    for (let tx = 0; tx < nx; tx++) {
      const x0 = tx * tw, x1 = Math.min(w, x0 + tw);
      const y0 = ty * th, y1 = Math.min(h, y0 + th);
      const base = (ty * nx + tx) * 256;
      const area = (x1 - x0) * (y1 - y0);
      if (area <= 0) {
        for (let v = 0; v < 256; v++) lut[base + v] = v;
        continue;
      }
      hist.fill(0);
      for (let y = y0; y < y1; y++) {
        const row = y * w;
        for (let x = x0; x < x1; x++) hist[luma[row + x]]++;
      }
      // Clip the histogram and spread the excess evenly over all bins.
      const limit = Math.max(1, Math.floor((clip * area) / 256));
      let excess = 0;
      for (let v = 0; v < 256; v++) {
        if (hist[v] > limit) {
          excess += hist[v] - limit;
          hist[v] = limit;
        }
      }
      const share = Math.floor(excess / 256);
      let rest = excess - share * 256;
      for (let v = 0; v < 256; v++) hist[v] += share;
      for (let v = 0; rest > 0; v++, rest--) hist[v]++;

      // Cumulative distribution, mapped to 0..255.
      let cdf = 0;
      let cdfMin = -1;
      for (let v = 0; v < 256; v++) {
        cdf += hist[v];
        if (cdfMin < 0 && hist[v] > 0) cdfMin = cdf - hist[v];
        const denom = area - (cdfMin < 0 ? 0 : cdfMin);
        lut[base + v] = denom > 0 ? Math.round(((cdf - (cdfMin < 0 ? 0 : cdfMin)) * 255) / denom) : v;
      }
    }
  }

  // Each pixel: blend the four tile curves around its centre, bilinearly.
  for (let y = 0; y < h; y++) {
    const gy = ((y + 0.5) * ny) / h - 0.5;
    const ty0 = clamp(Math.floor(gy), 0, ny - 1);
    const ty1 = Math.min(ty0 + 1, ny - 1);
    const fy = clamp(gy - ty0, 0, 1);
    for (let x = 0; x < w; x++) {
      const gx = ((x + 0.5) * nx) / w - 0.5;
      const tx0 = clamp(Math.floor(gx), 0, nx - 1);
      const tx1 = Math.min(tx0 + 1, nx - 1);
      const fx = clamp(gx - tx0, 0, 1);

      const i = y * w + x;
      const v = luma[i];
      const a = lut[(ty0 * nx + tx0) * 256 + v];
      const b = lut[(ty0 * nx + tx1) * 256 + v];
      const c = lut[(ty1 * nx + tx0) * 256 + v];
      const d = lut[(ty1 * nx + tx1) * 256 + v];
      const top = a + (b - a) * fx;
      const bottom = c + (d - c) * fx;
      const nv = top + (bottom - top) * fy;

      // Move the colour by the change in luma: hue and saturation stay put, and black stays a gray.
      const delta = nv - v;
      const p = i * 4;
      out.data[p] = data[p] + delta;
      out.data[p + 1] = data[p + 1] + delta;
      out.data[p + 2] = data[p + 2] + delta;
    }
  }
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
