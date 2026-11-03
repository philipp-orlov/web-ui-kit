import { computePoints, drawSparkline, formatTick, indexFromX, readout, sparklineLayout, sparklineSummary, withAlpha } from './sparkline';

/** Records what is drawn; normalises colours the way a canvas does for the forms the specs use. */
function recorder() {
  const calls: { op: string; args: unknown[]; fillStyle: string; textAlign: string }[] = [];
  let fill = '#000000';
  const ctx: Record<string, unknown> = {
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    get fillStyle() {
      return fill;
    },
    set fillStyle(v: string) {
      const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
      fill = short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase() : v === 'red' ? '#ff0000' : v;
    },
    measureText: (t: string) => ({ width: t.length * 6 }),
    createLinearGradient: () => ({ addColorStop: (_: number, c: string) => calls.push({ op: 'stop', args: [c], fillStyle: fill, textAlign: '' }) }),
  };
  for (const op of ['clearRect', 'save', 'restore', 'translate', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke', 'fill', 'fillText', 'arc']) {
    ctx[op] = (...args: unknown[]) => calls.push({ op, args, fillStyle: fill, textAlign: ctx['textAlign'] as string });
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

describe('computePoints', () => {
  it('returns nothing for no values and puts one value at the right edge', () => {
    expect(computePoints([], 100, 50, 100)).toEqual([]);
    expect(computePoints([50], 100, 50, 100)).toEqual([{ x: 100, y: 25 }]);
  });
  it('spreads values evenly, oldest first, and clamps out-of-range ones', () => {
    expect(computePoints([0, 50, 100], 100, 50, 100).map(p => p!.x)).toEqual([0, 50, 100]);
    const [low, high] = computePoints([-10, 200], 100, 50, 100);
    expect(low!.y).toBe(50);
    expect(high!.y).toBe(0);
  });
  it('makes null and NaN gaps instead of dropping to zero', () => {
    expect(computePoints([10, null, NaN, 20], 90, 50, 100).map(p => p === null)).toEqual([false, true, true, false]);
  });
});

describe('indexFromX', () => {
  it('maps edges, rounds, clamps', () => {
    expect(indexFromX(0, 100, 5)).toBe(0);
    expect(indexFromX(100, 100, 5)).toBe(4);
    expect(indexFromX(24, 100, 5)).toBe(1);
    expect(indexFromX(-50, 100, 5)).toBe(0);
    expect(indexFromX(500, 100, 5)).toBe(4);
    expect(indexFromX(50, 100, 1)).toBe(0);
    expect(indexFromX(50, 0, 5)).toBe(0);
  });
});

describe('labels', () => {
  it('formats ticks with at most two decimals', () => {
    expect(formatTick(50)).toBe('50');
    expect(formatTick(1.3 / 2)).toBe('0.65');
    expect(formatTick(100 / 3)).toBe('33.33');
  });
  it('reads out a value, a gap and a unit of the series', () => {
    expect(readout({ label: 'CPU', color: '#fff', values: [42.5] }, 0, '%')).toBe('CPU: 42.50%');
    expect(readout({ label: 'Temp', color: '#fff', values: [null], unit: '°C' }, 0, '%')).toBe('Temp: –°C');
    expect(sparklineSummary([{ label: 'In', color: '#fff', values: [1, 2], unit: ' MiB/s' }])).toBe('In: 2.0 MiB/s');
  });
  it('sizes the margins from the label text', () => {
    const { ctx } = recorder();
    const narrow = sparklineLayout(ctx, { width: 300, height: 90, max: 100, series: [] });
    const wide = sparklineLayout(ctx, { width: 300, height: 90, max: 100, series: [], leftUnit: ' MiB/s', rightUnit: '°C' });
    expect(wide.leftMargin).toBeGreaterThan(narrow.leftMargin);
    expect(wide.plotWidth).toBe(300 - wide.leftMargin - wide.rightMargin);
  });
});

describe('withAlpha', () => {
  it('works for any colour the canvas understands, not only #rrggbb', () => {
    const { ctx } = recorder();
    expect(withAlpha(ctx, '#4caf50', 0.5)).toBe('rgba(76, 175, 80, 0.5)');
    expect(withAlpha(ctx, '#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
    expect(withAlpha(ctx, 'red', 0.2)).toBe('rgba(255, 0, 0, 0.2)');
    expect(withAlpha(ctx, 'rgba(1, 2, 3, 1)', 0.3)).toBe('rgba(1, 2, 3, 0.3)');
  });
});

describe('drawSparkline', () => {
  it('breaks the line at a gap: two strokes for two runs', () => {
    const { ctx, calls } = recorder();
    drawSparkline(ctx, { width: 300, height: 90, max: 100, series: [{ label: 'a', color: '#ff0000', values: [1, 2, null, 3, 4] }] });
    const moves = calls.filter(c => c.op === 'moveTo' && c.args[1] !== 0 && c.args[1] !== 90);
    // the grid draws its own lines; the series starts a path at x=0 and after the gap
    expect(moves.some(m => m.args[0] === 0)).toBe(true);
    expect(calls.filter(c => c.op === 'stroke').length).toBeGreaterThanOrEqual(11 + 2);
  });
  it('puts the hover readout left of the line near the right edge, so it is not cut off', () => {
    const { ctx, calls } = recorder();
    const series = [{ label: 'Temperature', color: '#ff9800', values: [10, 20, 30], unit: '°C' }];
    drawSparkline(ctx, { width: 300, height: 90, max: 100, series, hoverIndex: 2 });
    const text = calls.find(c => c.op === 'fillText' && String(c.args[0]).startsWith('Temperature'))!;
    expect(text.textAlign).toBe('right');
    expect(calls.some(c => c.op === 'arc')).toBe(true);
  });
});
