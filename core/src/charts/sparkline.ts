// Copyright (c) 2026 Philipp Orlov

// A compact scrolling multi-line chart drawn on a 2D canvas: a few overlaid series (utilisation, temperature, ...),
// a light grid, tick labels on one or two sides, and a hover readout. Framework-free: the Angular
// SparklineChartComponent (and a future React one) owns the canvas, its size and the pointer, and calls drawSparkline.

export interface SparklineSeries {
  label: string;
  /** Any CSS colour: `#4caf50`, `rgb(…)`, `hsl(…)`, a name. */
  color: string;
  /** Oldest first, the same length in every series of a chart. null or NaN is a gap in the line. */
  values: readonly (number | null)[];
  /** Shade the area under the line. */
  fill?: boolean;
  /** The unit of this series' hover readout, when it is not the left axis' unit (°C on a % chart). */
  unit?: string;
  /** Decimals of the hover readout; 2 for '%' and 1 otherwise when not given. */
  decimals?: number;
}

/** The colours of what is not data; the component takes them from the theme. */
export interface SparklineColors {
  grid: string;
  gridMinor: string;
  text: string;
  crosshair: string;
}

/** Light-on-dark defaults: what gscope's dashboard always drew. */
export const DARK_SPARKLINE_COLORS: SparklineColors = {
  grid: 'rgba(255, 255, 255, 0.12)',
  gridMinor: 'rgba(255, 255, 255, 0.07)',
  text: 'rgba(255, 255, 255, 0.55)',
  crosshair: 'rgba(255, 255, 255, 0.45)',
};

/** The same, dark on light. */
export const LIGHT_SPARKLINE_COLORS: SparklineColors = {
  grid: 'rgba(0, 0, 0, 0.12)',
  gridMinor: 'rgba(0, 0, 0, 0.06)',
  text: 'rgba(0, 0, 0, 0.6)',
  crosshair: 'rgba(0, 0, 0, 0.45)',
};

export interface SparklineOptions {
  /** CSS pixels. */
  width: number;
  height: number;
  /** The top of the axis; the bottom is 0. */
  max: number;
  series: readonly SparklineSeries[];
  /** The unit of the tick labels on the left, the axis every series is plotted against. */
  leftUnit?: string;
  /** Adds the same tick values on the right in another unit. */
  rightUnit?: string;
  /** The index the pointer is over, or null. */
  hoverIndex?: number | null;
  colors?: SparklineColors;
  font?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface SparklineLayout {
  leftMargin: number;
  rightMargin: number;
  plotWidth: number;
}

const FONT = '10px system-ui, sans-serif';

const isGap = (v: number | null | undefined): boolean => v === null || v === undefined || Number.isNaN(v);

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}

/**
 * Maps values (0..max) onto pixels across `width` x `height`, oldest first from left to right. A single value sits at
 * the right edge. A gap (null, NaN) is null, so the line breaks there instead of dropping to 0.
 */
export function computePoints(values: readonly (number | null)[], width: number, height: number, max: number): (Point | null)[] {
  if (values.length === 0) return [];
  const y = (v: number) => height - (clamp(v, max) / max) * height;
  if (values.length === 1) return [isGap(values[0]) ? null : { x: width, y: y(values[0]!) }];
  const stepX = width / (values.length - 1);
  return values.map((v, i) => (isGap(v) ? null : { x: i * stepX, y: y(v!) }));
}

/** The data index nearest to `localX` (relative to the plot area). */
export function indexFromX(localX: number, plotWidth: number, count: number): number {
  if (count <= 1 || plotWidth <= 0) return 0;
  const index = Math.round(localX / (plotWidth / (count - 1)));
  return Math.min(count - 1, Math.max(0, index));
}

/** A tick value with at most two decimals and no trailing zeros: 50, 0.65, 33.33. */
export function formatTick(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * The colour with an alpha, whatever CSS form it has: the canvas normalises it to `#rrggbb` or `rgba(…)`. The old
 * hex-only slicing turned `rgb(…)`, `#abc` or a name into NaN and drew no fill.
 */
export function withAlpha(context: CanvasRenderingContext2D, color: string, alpha: number): string {
  context.fillStyle = '#000000';
  context.fillStyle = color;
  const normal = String(context.fillStyle);
  const hex = /^#([0-9a-f]{6})$/i.exec(normal);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgba = /^rgba?\(([^,]+),([^,]+),([^,)]+)/.exec(normal);
  return rgba ? `rgba(${rgba[1].trim()}, ${rgba[2].trim()}, ${rgba[3].trim()}, ${alpha})` : normal;
}

function tickLabels(max: number, unit: string): string[] {
  return [`${formatTick(max)}${unit}`, `${formatTick(max / 2)}${unit}`, `0${unit}`];
}

function margin(context: CanvasRenderingContext2D | null, labels: string[], minimum: number, font: string): number {
  if (!context) return minimum;
  context.font = font;
  const widest = Math.max(...labels.map(l => context.measureText(l).width));
  return Math.max(minimum, Math.ceil(widest) + 8);
}

/** The margins the tick labels need, and the width left for the plot. */
export function sparklineLayout(context: CanvasRenderingContext2D | null, options: SparklineOptions): SparklineLayout {
  const font = options.font ?? FONT;
  const leftMargin = margin(context, tickLabels(options.max, options.leftUnit ?? '%'), 30, font);
  const rightMargin = options.rightUnit ? margin(context, tickLabels(options.max, options.rightUnit), 34, font) : 4;
  return { leftMargin, rightMargin, plotWidth: Math.max(0, options.width - leftMargin - rightMargin) };
}

/** Draws the whole chart into `context`, which is already scaled to CSS pixels. Returns the layout it used. */
export function drawSparkline(context: CanvasRenderingContext2D, options: SparklineOptions): SparklineLayout {
  const { width, height, max, series } = options;
  const colors = options.colors ?? DARK_SPARKLINE_COLORS;
  const font = options.font ?? FONT;
  const leftUnit = options.leftUnit ?? '%';
  const layout = sparklineLayout(context, options);
  const { leftMargin, rightMargin, plotWidth } = layout;

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(leftMargin, 0);
  drawGrid(context, plotWidth, height, colors);
  for (const s of series) {
    drawSeries(context, computePoints(s.values, plotWidth, height, max), s, height);
  }
  const hover = options.hoverIndex ?? null;
  if (hover !== null) drawHover(context, series, hover, plotWidth, height, max, leftUnit, colors, font);
  context.restore();

  context.font = font;
  context.fillStyle = colors.text;
  drawTicks(context, leftMargin - 4, 'right', height, tickLabels(max, leftUnit));
  if (options.rightUnit) drawTicks(context, width - rightMargin + 4, 'left', height, tickLabels(max, options.rightUnit));
  return layout;
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number, colors: SparklineColors): void {
  context.lineWidth = 1;
  context.strokeStyle = colors.grid;
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const y = Math.round(height * f) + 0.5;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  // The vertical lines are fainter: a reference grid, not a second series.
  context.strokeStyle = colors.gridMinor;
  for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const x = Math.round(width * f) + 0.5;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
}

function drawTicks(context: CanvasRenderingContext2D, x: number, align: CanvasTextAlign, height: number, labels: string[]): void {
  context.textAlign = align;
  context.textBaseline = 'top';
  context.fillText(labels[0], x, 2);
  context.textBaseline = 'middle';
  context.fillText(labels[1], x, height / 2);
  context.textBaseline = 'bottom';
  context.fillText(labels[2], x, height - 2);
}

/** The runs of points between gaps. */
function runs(points: (Point | null)[]): Point[][] {
  const out: Point[][] = [];
  let run: Point[] = [];
  for (const p of points) {
    if (p) run.push(p);
    else if (run.length) {
      out.push(run);
      run = [];
    }
  }
  if (run.length) out.push(run);
  return out;
}

function drawSeries(context: CanvasRenderingContext2D, points: (Point | null)[], series: SparklineSeries, height: number): void {
  const parts = runs(points).filter(run => run.length >= 2);
  if (series.fill) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, withAlpha(context, series.color, 0.35));
    gradient.addColorStop(1, withAlpha(context, series.color, 0.02));
    for (const run of parts) {
      context.beginPath();
      context.moveTo(run[0].x, height);
      for (const p of run) context.lineTo(p.x, p.y);
      context.lineTo(run[run.length - 1].x, height);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
    }
  }
  context.strokeStyle = series.color;
  context.lineWidth = 1.5;
  context.lineJoin = 'round';
  for (const run of parts) {
    context.beginPath();
    context.moveTo(run[0].x, run[0].y);
    for (const p of run.slice(1)) context.lineTo(p.x, p.y);
    context.stroke();
  }
}

/** The text of one series at an index: `CPU: 42.50%`, or `CPU: –` in a gap. */
export function readout(series: SparklineSeries, index: number, leftUnit: string): string {
  const value = series.values[index];
  const unit = series.unit ?? leftUnit;
  const decimals = series.decimals ?? (unit === '%' ? 2 : 1);
  return `${series.label}: ${value === null || value === undefined || !Number.isFinite(value) ? '–' : value.toFixed(decimals)}${unit}`;
}

function drawHover(
  context: CanvasRenderingContext2D,
  series: readonly SparklineSeries[],
  index: number,
  plotWidth: number,
  height: number,
  max: number,
  leftUnit: string,
  colors: SparklineColors,
  font: string,
): void {
  const count = series[0]?.values.length ?? 0;
  if (count === 0) return;
  // The same x mapping as computePoints, the single-point case included.
  const x = count === 1 ? plotWidth : (index * plotWidth) / (count - 1);
  context.strokeStyle = colors.crosshair;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, height);
  context.stroke();

  context.font = font;
  context.textBaseline = 'top';
  const texts = series.map(s => readout(s, index, leftUnit));
  const widest = Math.max(0, ...texts.map(t => context.measureText(t).width));
  // Right of the line while the text fits there, else left of it: measured, not a fixed 90 px that cut long labels.
  const right = x + 6 + widest <= plotWidth;
  context.textAlign = right ? 'left' : 'right';
  const labelX = right ? x + 6 : Math.max(widest, x - 6);
  series.forEach((s, i) => {
    const point = computePoints(s.values, plotWidth, height, max)[index];
    if (point) {
      context.beginPath();
      context.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
      context.fillStyle = s.color;
      context.fill();
    }
    context.fillStyle = s.color;
    context.fillText(texts[i], labelX, 2 + i * 12);
  });
}

/** A short text of the latest values, for the canvas' accessible name. */
export function sparklineSummary(series: readonly SparklineSeries[], leftUnit = '%'): string {
  return series.map(s => readout(s, s.values.length - 1, leftUnit)).join(', ');
}
