import { clampSource, lensSource, placeLens } from './lens';

function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

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

  it('skips a side that would cover a rectangle to avoid', () => {
    // Pointer near the middle-right: the right side would sit on the toolbar, so the lens goes left.
    const bar = { x: 600, y: 350, w: 300, h: 60 };
    const l = placeLens({ x: 500, y: 380 }, 200, bounds, 16, [bar]);
    expect(l.side).toBe('left');
    expect(overlap(l, bar)).toBe(false);
  });

  it('pushes a side clear of a toolbar it would overlap, when the pointer is on the toolbar', () => {
    // Pointer on a bar at the bottom: above the pointer is the bar, so the lens goes above the bar.
    const bar = { x: 300, y: 700, w: 500, h: 40 };
    const l = placeLens({ x: 500, y: 720 }, 200, { x: 0, y: 0, w: 1000, h: 800 }, 16, [bar]);
    expect(overlap(l, bar)).toBe(false);
    expect(l.y + l.h).toBeLessThanOrEqual(bar.y);
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

describe('clampSource', () => {
  it('moves a sample that hangs over the bottom edge back inside, keeping its size', () => {
    const r = clampSource({ x: 100, y: 690, w: 60, h: 60 }, 1000, 720);
    expect(r).toEqual({ x: 100, y: 660, w: 60, h: 60 });
  });

  it('leaves a sample that is already inside alone', () => {
    expect(clampSource({ x: 10, y: 20, w: 60, h: 60 }, 1000, 720)).toEqual({ x: 10, y: 20, w: 60, h: 60 });
  });

  it('shrinks a sample larger than the picture to fit it', () => {
    expect(clampSource({ x: -20, y: -20, w: 900, h: 900 }, 300, 200)).toEqual({ x: 0, y: 0, w: 300, h: 200 });
  });
});
