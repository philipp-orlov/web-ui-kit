// @vitest-environment jsdom
import { applyTheme, saveTheme, storedTheme } from './theme';

describe('theme', () => {
  beforeEach(() => localStorage.clear());
  it('remembers light and dark, and forgets system', () => {
    saveTheme('dark', 'k');
    expect(storedTheme('k')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    saveTheme('system', 'k');
    expect(localStorage.getItem('k')).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
  it('reads anything else as system', () => {
    localStorage.setItem('k', 'purple');
    expect(storedTheme('k')).toBe('system');
  });
  it('applies to another root', () => {
    const root = document.createElement('div');
    applyTheme('light', root);
    expect(root.dataset['theme']).toBe('light');
  });
});
