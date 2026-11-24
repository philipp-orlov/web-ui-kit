import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../testing/helpers';
import { ClaheToggleComponent } from './clahe-toggle.component';
import { LensComponent, type LensView } from './lens.component';
import { claheCanvas } from './clahe-canvas';

const view: LensView = { tx: 0, ty: 0, scale: 1, imageWidth: 400, imageHeight: 300, viewWidth: 400, viewHeight: 300 };

function picture(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < w; x += 4) {
    ctx.fillStyle = `rgb(${100 + (x % 40)},${100 + (x % 40)},${100 + (x % 40)})`;
    ctx.fillRect(x, 0, 4, h);
  }
  return c;
}

@Component({
  imports: [LensComponent],
  template: `<div style="position: relative; width: 400px; height: 300px"><ui-lens [source]="src" [view]="view()" [pointer]="pointer()" /></div>`,
})
class LensHostComponent {
  readonly src = picture(400, 300);
  readonly view = signal<LensView | null>(view);
  readonly pointer = signal<{ x: number; y: number } | null>({ x: 100, y: 100 });
}

describe('LensComponent', () => {
  it('shows a canvas beside the pointer, and hides it when the pointer leaves the picture', async () => {
    const fixture = TestBed.createComponent(LensHostComponent);
    await settle();
    expect(fixture.nativeElement.querySelector('canvas.lens')).not.toBeNull();

    fixture.componentInstance.pointer.set({ x: 390, y: 290 });
    await settle();
    const lens: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas.lens');
    // Near the bottom-right corner the lens slides in from the right side, so it starts left of the pointer.
    expect(parseFloat(lens.style.left)).toBeLessThan(390);

    fixture.componentInstance.pointer.set(null);
    await settle();
    expect(fixture.nativeElement.querySelector('canvas.lens')).toBeNull();
  });
});

@Component({
  imports: [ClaheToggleComponent],
  template: `<ui-clahe-toggle [(pressed)]="on" />`,
})
class ToggleHostComponent {
  readonly on = signal(false);
}

describe('ClaheToggleComponent', () => {
  it('flips its pressed state on click and reports it to aria-pressed', async () => {
    const fixture = TestBed.createComponent(ToggleHostComponent);
    await settle();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    await settle();
    expect(fixture.componentInstance.on()).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('claheCanvas', () => {
  it('returns a cached canvas of the natural size for the same source', () => {
    const src = picture(64, 48);
    const a = claheCanvas(src);
    expect(a.width).toBe(64);
    expect(a.height).toBe(48);
    expect(claheCanvas(src)).toBe(a);
  });
});
