// Copyright (c) 2026 Philipp Orlov

import { formatDate, formatNumber, formatValue, toDate } from './format';

describe('formatNumber', () => {
  it('groups and rounds', () => {
    expect(formatNumber(1234567.891, '#,##0.00')).toBe('1,234,567.89');
    expect(formatNumber(0.5, '#,##0.00')).toBe('0.50');
    expect(formatNumber(1234.5, '#,##0')).toBe('1,235');
    expect(formatNumber(-1234.5, '#,##0.0')).toBe('-1,234.5');
  });
  it('keeps optional decimals only when needed', () => {
    expect(formatNumber(3, '0.##')).toBe('3');
    expect(formatNumber(3.5, '0.##')).toBe('3.5');
    expect(formatNumber(3.14159, '0.##')).toBe('3.14');
    expect(formatNumber(3, '0.0#')).toBe('3.0');
  });
  it('pads whole digits', () => {
    expect(formatNumber(7, '000')).toBe('007');
    expect(formatNumber(0.25, '#.00')).toBe('.25');
  });
  it('handles percent, prefixes and suffixes', () => {
    expect(formatNumber(0.256, '0.0%')).toBe('25.6%');
    expect(formatNumber(1234.5, '$#,##0.00')).toBe('$1,234.50');
    expect(formatNumber(12, '0 "kg"')).toBe('12 "kg"');
  });
  it('does not show negative zero', () => {
    expect(formatNumber(-0.001, '0.00')).toBe('0.00');
  });
  it('prints plain numbers readably', () => {
    expect(formatNumber(1 / 3, '')).toBe('0.3333333333');
    expect(formatNumber(42, '')).toBe('42');
  });
});

describe('dates', () => {
  it('reads ISO strings as UTC and numbers by magnitude', () => {
    expect(toDate('2026-10-29 13:05:09')!.toISOString()).toBe('2026-10-29T13:05:09.000Z');
    expect(toDate('2026-10-29')!.toISOString()).toBe('2026-10-29T00:00:00.000Z');
    const t = Date.UTC(2026, 9, 29, 13, 5, 9);
    expect(toDate(t)!.getTime()).toBe(t);
    expect(toDate(t * 1000)!.getTime()).toBe(t);
    expect(toDate(t / 1000)!.getTime()).toBe(t);
    expect(toDate('not a date')).toBeNull();
  });
  it('formats with patterns', () => {
    expect(formatDate('2026-03-04T05:06:07Z', 'yyyy-MM-dd HH:mm:ss')).toBe('2026-03-04 05:06:07');
    expect(formatDate('2026-03-04', 'dd/MM/yy')).toBe('04/03/26');
    expect(formatDate('rubbish', 'yyyy')).toBe('rubbish');
  });
  it('formatValue picks by pattern', () => {
    expect(formatValue(null, '#')).toBe('');
    expect(formatValue('2026-03-04', 'yyyy')).toBe('2026');
    expect(formatValue(1234.5, '#,##0')).toBe('1,235');
    expect(formatValue('12.5', '0.00')).toBe('12.50');
    expect(formatValue('text', '0.00')).toBe('text');
    expect(formatValue(true)).toBe('true');
  });
});

