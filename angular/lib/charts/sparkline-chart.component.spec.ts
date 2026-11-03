import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SparklineSeries } from '@ui-kit/core/charts';

import { settle } from '../../testing/helpers';
import { SparklineChartComponent } from './sparkline-chart.component';

@Component({
  imports: [SparklineChartComponent],
  template: `<div [style.width.px]="width()"><ui-sparkline-chart [series]="series()" [height]="80" rightUnit="°C" /></div>`,
})
class HostComponent {
  readonly width = signal(400);
  readonly series = signal<SparklineSeries[]>([{ label: 'CPU', color: '#4caf50', values: [10, 20, 30], fill: true }]);
}

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve)));

describe('SparklineChartComponent', () => {
  it('draws at the canvas size and device pixel ratio, and redraws when resized', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await settle();
    await nextFrame();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    const dpr = window.devicePixelRatio || 1;
    expect(canvas.width).toBe(Math.round(400 * dpr));
    expect(canvas.height).toBe(Math.round(80 * dpr));

    fixture.componentInstance.width.set(250);
    await settle();
    await nextFrame();
    await settle();
    expect(canvas.width).toBe(Math.round(250 * dpr));
  });

  it('names the canvas with the latest values', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await settle();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('CPU: 30.00%');
  });

  it('shows a legend entry per series, even with two of one label', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.series.set([
      { label: 'A', color: '#f00', values: [1] },
      { label: 'A', color: '#00f', values: [2] },
    ]);
    await settle();
    expect(fixture.nativeElement.querySelectorAll('.legend-item').length).toBe(2);
  });

  it('follows the pointer without throwing', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await settle();
    await nextFrame();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: box.left + 200, clientY: box.top + 10 }));
    await settle();
    canvas.dispatchEvent(new PointerEvent('pointerleave'));
    await settle();
  });
});
