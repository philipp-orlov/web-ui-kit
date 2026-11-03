// Copyright (c) 2026 Philipp Orlov

import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { DEFAULT_THEME_STORAGE_KEY, ThemeChoice, applyTheme, saveTheme, storedTheme } from '@web-ui-kit/core/theme';

/** The localStorage key that remembers the choice; give each app its own so that apps on one origin do not share it. */
export const THEME_STORAGE_KEY = new InjectionToken<string>('THEME_STORAGE_KEY', { factory: () => DEFAULT_THEME_STORAGE_KEY });

/** Light, dark or the system's setting, remembered in this browser. The logic is @web-ui-kit/core/theme's; this is its signal. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = inject(THEME_STORAGE_KEY);
  readonly choice = signal<ThemeChoice>(storedTheme(this.key));

  constructor() {
    applyTheme(this.choice());
  }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
    saveTheme(choice, this.key);
  }
}
