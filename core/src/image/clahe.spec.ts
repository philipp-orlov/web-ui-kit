import { PixelBuffer, clahe } from './clahe';

function gray(w: number, h: number, value: (x: number, y: number) => number): PixelBuffer {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = value(x, y);
      const p = (y * w + x) * 4;
      data[p] = data[p + 1] = data[p + 2] = v;
      data[p + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

const range = (img: PixelBuffer) => {
  let lo = 255, hi = 0;
  for (let p = 0; p < img.data.length; p += 4) {
    lo = Math.min(lo, img.data[p]);
    hi = Math.max(hi, img.data[p]);
  }
  return hi - lo;
};

describe('clahe', () => {
  it('stretches a low-contrast picture towards the full range', () => {
    // Values only between 100 and 140.
    const src = gray(64, 64, (x, y) => 100 + ((x * 7 + y * 3) % 41));
    const out = clahe(src);
    expect(range(src)).toBeLessThanOrEqual(40);
    expect(range(out)).toBeGreaterThan(150);
  });

  it('keeps gray pixels gray and the alpha channel as it was', () => {
    const src = gray(32, 16, (x) => (x * 8) % 256);
    src.data[3] = 128; // one semi-transparent pixel
    const out = clahe(src);
    for (let p = 0; p < out.data.length; p += 4) {
      expect(out.data[p]).toBe(out.data[p + 1]);
      expect(out.data[p]).toBe(out.data[p + 2]);
    }
    expect(out.data[3]).toBe(128);
    expect(out.data[7]).toBe(255);
  });

  it('moves all three channels of a colour by the same amount, so hue is kept', () => {
    const w = 32, h = 32;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let p = 0; p < data.length; p += 4) {
      const v = 90 + ((p / 4) * 13) % 60;
      data[p] = v + 30; // reddish: each pixel is the same gray plus a fixed tint
      data[p + 1] = v;
      data[p + 2] = v - 20;
      data[p + 3] = 255;
    }
    const src: PixelBuffer = { width: w, height: h, data };
    const out = clahe(src);
    let checked = 0;
    for (let p = 0; p < data.length; p += 4) {
      const shift = [out.data[p] - src.data[p], out.data[p + 1] - src.data[p + 1], out.data[p + 2] - src.data[p + 2]];
      const clipped = [out.data[p], out.data[p + 1], out.data[p + 2]].some(c => c === 0 || c === 255);
      if (clipped) continue;
      checked++;
      expect(shift[0]).toBe(shift[1]);
      expect(shift[1]).toBe(shift[2]);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('does not change the input and returns the same size', () => {
    const src = gray(20, 9, (x, y) => (x + y) * 5);
    const before = Uint8ClampedArray.from(src.data);
    const out = clahe(src, { tiles: 4, clip: 3 });
    expect(out.width).toBe(20);
    expect(out.height).toBe(9);
    expect(src.data).toEqual(before);
  });

  it('handles a picture smaller than the tile grid and empty pictures', () => {
    expect(() => clahe(gray(3, 2, () => 9))).not.toThrow();
    expect(clahe({ width: 0, height: 0, data: new Uint8ClampedArray(0) }).data.length).toBe(0);
  });
});
