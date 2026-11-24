// Copyright (c) 2026 Philipp Orlov

import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { clampSource, lensSource, placeLens, type Box, type Pt } from '@web-ui-kit/core/image';

/**
 * Where the picture sits in its view, in view pixels: the picture's top-left at (tx, ty), drawn `imageWidth × scale`
 * wide. Rebuild this object when the view moves or zooms, so the lens redraws.
 */
export interface LensView {
  tx: number;
  ty: number;
  scale: number;
  imageWidth: number;
  imageHeight: number;
  viewWidth: number;
  viewHeight: number;
}

/**
 * A magnifier that follows the pointer: a square with rounded corners showing the picture under the pointer at `zoom` times the view's
 * scale. It sits to the right of the pointer, moving left, below or above it near the borders of the picture and
 * clear of any `avoid` rectangles, so it never covers the pointer. Place it in a relatively positioned parent the size of the view; it ignores the pointer
 * itself (pointer-events none), so the parent keeps receiving the mouse.
 */
@Component({
  selector: 'ui-lens',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (placement(); as p) {
      <canvas #canvas class="lens" [style.left.px]="p.x" [style.top.px]="p.y" [style.width.px]="size()" [style.height.px]="size()" aria-hidden="true"></canvas>
    }
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;
      z-index: 2;
    }
    .lens {
      position: absolute;
      border-radius: 14px;
      border: 2px solid rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      background: #000;
    }
  `,
})
export class LensComponent {
  /** The picture to magnify, at its natural size (the original or an enhanced copy). */
  readonly source = input<CanvasImageSource | null>(null);
  readonly view = input<LensView | null>(null);
  /** The pointer in view pixels; null hides the lens. */
  readonly pointer = input<Pt | null>(null);
  /** Magnification relative to the view's scale. */
  readonly zoom = input(3);
  /** Side length in view pixels. */
  readonly size = input(180);
  /** Rectangles in view pixels the lens must not cover (a toolbar over the picture). */
  readonly avoid = input<Box[]>([]);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** Where the lens sits, or null when there is nothing to show (no pointer, or the pointer is off the picture). */
  protected readonly placement = computed(() => {
    const v = this.view();
    const q = this.pointer();
    if (!v || !q || !this.source()) return null;
    const onPicture = q.x >= v.tx && q.y >= v.ty && q.x < v.tx + v.imageWidth * v.scale && q.y < v.ty + v.imageHeight * v.scale;
    if (!onPicture) return null;
    return placeLens(q, this.size(), visibleBounds(v), 16, this.avoid());
  });

  private readonly paint = effect(() => {
    const p = this.placement();
    const src = this.source();
    const v = this.view();
    const q = this.pointer();
    const canvas = this.canvasRef()?.nativeElement;
    if (!p || !src || !v || !q || !canvas) return;

    const size = this.size();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const picture = { x: (q.x - v.tx) / v.scale, y: (q.y - v.ty) / v.scale };
    // Near an edge the sampled area would hang over the picture: slide it inside, so the lens shows picture up to the edge.
    const from: Box = clampSource(lensSource(picture, size, this.zoom(), v.scale), v.imageWidth, v.imageHeight);
    const k = size / from.w;
    ctx.save();
    roundedSquare(ctx, 1, 1, size - 2, size - 2, LENS_RADIUS - 1);
    ctx.clip();
    ctx.imageSmoothingEnabled = v.scale * this.zoom() < 3;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, from.x, from.y, from.w, from.h, 0, 0, size, size);
    ctx.restore();

    // A small cross where the pointer is, so the lens shows exactly which spot it magnifies (it moves off the centre
    // when the sample was slid inside the picture).
    const cx = Math.round((picture.x - from.x) * k) + 0.5;
    const cy = Math.round((picture.y - from.y) * k) + 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx, cy + 6);
    ctx.stroke();
  });
}

const LENS_RADIUS = 14;

/** A square with rounded corners, as a path (no ctx.roundRect, so older browsers work too). */
function roundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The part of the view the picture covers: the lens must stay on the picture, not on the grey around it. */
function visibleBounds(v: LensView): Box {
  const x0 = Math.max(0, v.tx);
  const y0 = Math.max(0, v.ty);
  const x1 = Math.min(v.viewWidth, v.tx + v.imageWidth * v.scale);
  const y1 = Math.min(v.viewHeight, v.ty + v.imageHeight * v.scale);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
