import { lensSource, placeLens } from './lens';

const bounds = { x: 0, y: 0, w: 1000, h: 800 };

describe('placeLens', () => {
  it('sits to the right of the pointer when there is room', () => {
    const l = placeLens({ x: 300, y: 400 }, 200, bounds);
    expect(l.side).toBe('right');
    expect(l.x).toBe(316);
    expect(l.y).toBe(300);
  });

  it('switches to the left near the right border', () => {
    expect(placeLens({ x: 950, y: 400 }, 200, bounds).side).toBe('left');
  });

  it('switches to below near the top border', () => {
    expect(placeLens({ x: 500, y: 20 }, 200, bounds).side).toBe('below');
  });

  it('switches to above near the bottom border', () => {
    expect(placeLens({ x: 300, y: 790 }, 200, bounds).side).toBe('above');
  });

  it('slides along the border in a corner, and still keeps the pointer clear', () => {
    const l = placeLens({ x: 990, y: 790 }, 200, bounds);
    expect(l.x).toBeGreaterThanOrEqual(0);
    expect(l.x + l.w).toBeLessThanOrEqual(1000);
    expect(l.y + l.h).toBeLessThanOrEqual(800);
    expect(990 >= l.x && 990 <= l.x + l.w && 790 >= l.y && 790 <= l.y + l.h).toBe(false);
  });

  it('never covers the pointer and stays inside the bounds', () => {
    for (let x = 0; x <= 1000; x += 37) {
      for (let y = 0; y <= 800; y += 41) {
        const p = { x, y };
        const l = placeLens(p, 200, bounds);
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.y).toBeGreaterThanOrEqual(0);
        expect(l.x + l.w).toBeLessThanOrEqual(1000);
        expect(l.y + l.h).toBeLessThanOrEqual(800);
        const covers = p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h;
        expect(covers).toBe(false);
      }
    }
  });

  it('clamps into a picture smaller than the lens', () => {
    const small = { x: 10, y: 10, w: 120, h: 120 };
    const l = placeLens({ x: 60, y: 60 }, 200, small);
    expect(l.x).toBeGreaterThanOrEqual(10);
    expect(l.y).toBeGreaterThanOrEqual(10);
    expect(l.x).toBeLessThanOrEqual(10);
  });
});

describe('lensSource', () => {
  it('shows the picture at the lens zoom times the current scale, centred on the pointer', () => {
    const r = lensSource({ x: 500, y: 400 }, 200, 3, 0.5);
    expect(r.w).toBe(200 / (3 * 0.5));
    expect(r.x + r.w / 2).toBe(500);
    expect(r.y + r.h / 2).toBe(400);
  });
});
