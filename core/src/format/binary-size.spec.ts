import { formatBinarySize, formatBytes } from './binary-size';

describe('formatBinarySize', () => {
  it('picks KiB, MiB, GiB or TiB', () => {
    expect(formatBinarySize(0.5)).toBe('512 KiB');
    expect(formatBinarySize(5)).toBe('5.0 MiB');
    expect(formatBinarySize(512)).toBe('512 MiB');
    expect(formatBinarySize(2048)).toBe('2.00 GiB');
    expect(formatBinarySize(20480)).toBe('20.0 GiB');
    expect(formatBinarySize(3 * 1024 * 1024)).toBe('3.00 TiB');
  });
  it('treats bad input as 0', () => {
    expect(formatBinarySize(NaN)).toBe('0 KiB');
    expect(formatBinarySize(-3)).toBe('0 KiB');
  });
  it('does not show "1024" of a unit when rounding reaches the next one', () => {
    expect(formatBinarySize(1023.9)).toBe('1.00 GiB');
    expect(formatBinarySize(0.9999)).toBe('1.0 MiB');
  });
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MiB');
  });
});
