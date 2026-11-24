// Copyright (c) 2026 Philipp Orlov

import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { lensSource, placeLens, type Box, type Pt } from '@web-ui-kit/core/image';

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
 * A magnifier that follows the pointer: a circle showing the picture under the pointer at `zoom` times the view's
 * scale. It sits to the right of the pointer, moving left, below or above it near the borders of the picture, so it
 * never covers the pointer. Place it in a relatively positioned parent the size of the view; it ignores the pointer
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
      border-radius: 50%;
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
  /** Diameter in view pixels. */
  readonly size = input(180);

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** Where the lens sits, or null when there is nothing to show (no pointer, or the pointer is off the picture). */
  protected readonly placement = computed(() => {
    const v = this.view();
    const q = this.pointer();
    if (!v || !q || !this.source()) return null;
    const onPicture = q.x >= v.tx && q.y >= v.ty && q.x < v.tx + v.imageWidth * v.scale && q.y < v.ty + v.imageHeight * v.scale;
    if (!onPicture) return null;
    return placeLens(q, this.size(), visibleBounds(v));
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
    const from: Box = lensSource(picture, size, this.zoom(), v.scale);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = v.scale * this.zoom() < 3;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, from.x, from.y, from.w, from.h, 0, 0, size, size);
    ctx.restore();

    // A small cross where the pointer is, so the lens shows exactly which spot it magnifies.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 6, size / 2 + 0.5);
    ctx.lineTo(size / 2 + 6, size / 2 + 0.5);
    ctx.moveTo(size / 2 + 0.5, size / 2 - 6);
    ctx.lineTo(size / 2 + 0.5, size / 2 + 6);
    ctx.stroke();
  });
}

/** The part of the view the picture covers: the lens must stay on the picture, not on the grey around it. */
function visibleBounds(v: LensView): Box {
  const x0 = Math.max(0, v.tx);
  const y0 = Math.max(0, v.ty);
  const x1 = Math.min(v.viewWidth, v.tx + v.imageWidth * v.scale);
  const y1 = Math.min(v.viewHeight, v.ty + v.imageHeight * v.scale);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
