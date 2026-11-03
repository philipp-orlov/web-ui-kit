// Copyright (c) 2026 Philipp Orlov

// Light, dark or the system's colour scheme, remembered in the browser. Framework-free: the Angular ThemeService and
// a future React hook both keep their state in a signal or a hook and call these.

export type ThemeChoice = 'system' | 'light' | 'dark';

export const DEFAULT_THEME_STORAGE_KEY = 'ui-kit.theme';

export function storedTheme(key = DEFAULT_THEME_STORAGE_KEY): ThemeChoice {
  try {
    const v = localStorage.getItem(key);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** `html[data-theme]` picks the colour scheme the Material theme follows; without it the browser's own setting decides. */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

/** Applies the choice and remembers it; 'system' forgets it. */
export function saveTheme(choice: ThemeChoice, key = DEFAULT_THEME_STORAGE_KEY): void {
  applyTheme(choice);
  try {
    if (choice === 'system') localStorage.removeItem(key);
    else localStorage.setItem(key, choice);
  } catch {
    // private window or blocked storage: the choice lasts until the page is closed
  }
}

export const THEME_OPTIONS: readonly { value: ThemeChoice; label: string; icon: string }[] = [
  { value: 'system', label: 'System', icon: 'brightness_auto' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
];
