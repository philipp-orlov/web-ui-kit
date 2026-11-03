// Copyright (c) 2026 Philipp Orlov

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  DARK_SPARKLINE_COLORS,
  LIGHT_SPARKLINE_COLORS,
  SparklineColors,
  SparklineSeries,
  drawSparkline,
  indexFromX,
  sparklineLayout,
  sparklineSummary,
} from '@web-ui-kit/core/charts';

/**
 * A compact scrolling multi-line chart on a canvas (see drawSparkline in @web-ui-kit/core/charts). It redraws when its
 * inputs change, when it is resized and while the pointer moves over it, never on a timer, so an idle dashboard costs
 * nothing.
 *
 * Colours of the grid and the labels follow the theme: light text means a dark theme. Set `--ui-sparkline-grid`,
 * `--ui-sparkline-grid-minor`, `--ui-sparkline-text` or `--ui-sparkline-crosshair` on the host, or `[colors]`, to
 * choose them; `--ui-sparkline-background` is the plot's background.
 */
@Component({
  selector: 'ui-sparkline-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="legend">
      @for (item of series(); track $index) {
        <span class="legend-item">
          <span class="legend-dot" [style.background]="item.color"></span>
          {{ item.label }}
        </span>
      }
    </div>
    <canvas
      #canvas
      class="sparkline"
      role="img"
      [attr.aria-label]="label()"
      [style.height.px]="height()"
      (pointermove)="onPointerMove($event)"
      (pointerleave)="onPointerLeave()"
    ></canvas>
  `,
  styleUrl: './sparkline-chart.component.scss',
})
export class SparklineChartComponent {
  readonly series = input<readonly SparklineSeries[]>([]);
  readonly max = input(100);
  readonly height = input(96);
  /** The unit of the left-hand scale, the axis every series is plotted against. */
  readonly leftUnit = input('%');
  /** A second scale on the right with the same ticks in another unit (°C on a % chart). */
  readonly rightUnit = input<string | undefined>(undefined);
  /** Overrides the colours taken from the theme. */
  readonly colors = input<SparklineColors | null>(null);
  /** The accessible name; the latest values when not given. */
  readonly ariaLabel = input<string | null>(null);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  /** The canvas' CSS width; a ResizeObserver keeps it, so a resized window redraws at once and stays sharp. */
  private readonly width = signal(0);
  private readonly hoverIndex = signal<number | null>(null);

  protected readonly label = computed(() => this.ariaLabel() ?? sparklineSummary(this.series(), this.leftUnit()));

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const canvas = this.canvasRef().nativeElement;
      this.width.set(canvas.clientWidth);
      // jsdom and some embedded browsers have no ResizeObserver: then the chart keeps its first width.
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.width.set(canvas.clientWidth));
      observer.observe(canvas);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    // Every input is read here, so a change of any of them (the units too) redraws.
    effect(() => {
      const width = this.width();
      if (width === 0) return;
      this.draw(width, this.hoverIndex());
    });
  }

  protected onPointerMove(event: PointerEvent): void {
    const count = this.series()[0]?.values.length ?? 0;
    if (count === 0) return;
    const canvas = this.canvasRef().nativeElement;
    const layout = sparklineLayout(canvas.getContext('2d'), this.options(this.width()));
    const x = event.clientX - canvas.getBoundingClientRect().left;
    this.hoverIndex.set(indexFromX(x - layout.leftMargin, layout.plotWidth, count));
  }

  protected onPointerLeave(): void {
    this.hoverIndex.set(null);
  }

  private options(width: number) {
    return {
      width,
      height: this.height(),
      max: this.max(),
      series: this.series(),
      leftUnit: this.leftUnit(),
      rightUnit: this.rightUnit(),
    };
  }

  private draw(width: number, hoverIndex: number | null): void {
    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) return;
    const options = this.options(width);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(options.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSparkline(context, { ...options, hoverIndex, colors: this.colors() ?? this.themeColors() });
  }

  /** The theme's colours: custom properties when set, else light or dark ones by the luminance of the text colour. */
  private themeColors(): SparklineColors {
    const style = getComputedStyle(this.host);
    const rgb = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(style.color);
    const dark = rgb ? 0.2126 * +rgb[1] + 0.7152 * +rgb[2] + 0.0722 * +rgb[3] > 128 : true;
    const base = dark ? DARK_SPARKLINE_COLORS : LIGHT_SPARKLINE_COLORS;
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
      grid: read('--ui-sparkline-grid', base.grid),
      gridMinor: read('--ui-sparkline-grid-minor', base.gridMinor),
      text: read('--ui-sparkline-text', base.text),
      crosshair: read('--ui-sparkline-crosshair', base.crosshair),
    };
  }
}
