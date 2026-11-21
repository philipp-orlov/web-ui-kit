import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { settle } from '../../testing/helpers';
import { UploadComponent } from './upload.component';

@Component({
  imports: [UploadComponent],
  template: `<ui-upload [url]="url()" [extensions]="['.jpg', '.pdf']" [maxFiles]="2" />`,
})
class HostComponent {
  readonly url = signal('/upload');
}

describe('UploadComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('shows the button and the drop zone', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await settle();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button')?.textContent).toContain('Choose files');
    expect(el.querySelector('.zone')).not.toBeNull();
    expect(el.querySelector('input[type=file]')?.getAttribute('accept')).toBe('.jpg,.pdf');
  });

  it('refuses a choice over the limit as a whole, and says why', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const picker = (fixture.nativeElement as HTMLElement).querySelector('input[type=file]') as HTMLInputElement;
    const files = [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg'), new File(['c'], 'c.jpg')];
    Object.defineProperty(picker, 'files', { value: files, configurable: true });
    picker.dispatchEvent(new Event('change'));
    await settle();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role=alert]');
    expect(alert?.textContent).toContain('You chose 3 files');
    expect((fixture.nativeElement as HTMLElement).querySelector('.files')).toBeNull();
  });
});
