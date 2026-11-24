// Copyright (c) 2026 Philipp Orlov

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * A toolbar toggle for local contrast (CLAHE). It only holds the on/off state, `pressed`; the host applies the
 * enhancement (see `claheCanvas`) when it is on.
 */
@Component({
  selector: 'ui-clahe-toggle',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button mat-icon-button type="button" class="clahe" [class.on]="pressed()" [attr.aria-pressed]="pressed()" [attr.aria-label]="label()" [matTooltip]="tooltip()" (click)="pressed.set(!pressed())">
      <mat-icon>contrast</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .clahe {
      --mat-icon-button-state-layer-size: 36px;
      --mat-icon-button-icon-size: 20px;
      width: 36px;
      height: 36px;
      padding: 6px;
    }
    .on {
      color: var(--mat-sys-primary);
      background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
    }
  `,
})
export class ClaheToggleComponent {
  /** On (the picture is enhanced) or off. Two-way: `[(pressed)]="on"`. */
  readonly pressed = model(false);
  readonly label = input('Local contrast (CLAHE)');
  readonly tooltip = input('Local contrast (CLAHE)');
}
