import { hexByte, hexChar, hexInSelection, hexRegionAt, hexRowCount, hexRowOffset, hexTitle } from './hex';

describe('hex', () => {
  const bytes = new Uint8Array([0x48, 0x69, 0x00, 0x7f, 0xff]);
  const regions = [{ from: 0, to: 2, label: 'header', color: '#fee' }];
  it('lays out rows and offsets', () => {
    expect(hexRowCount(0)).toBe(0);
    expect(hexRowCount(17)).toBe(2);
    expect(hexRowOffset(1, 4096)).toBe('00001010');
  });
  it('shows bytes and printable characters, padding past the end', () => {
    expect([0, 1, 2, 4, 5].map(i => hexByte(bytes, i))).toEqual(['48', '69', '00', 'ff', '  ']);
    expect([0, 1, 2, 3, 5].map(i => hexChar(bytes, i))).toEqual(['H', 'i', '·', '·', ' ']);
  });
  it('finds regions and counts the offset in the title from the base', () => {
    expect(hexRegionAt(regions, 1)?.label).toBe('header');
    expect(hexRegionAt(regions, 2)).toBeUndefined();
    expect(hexTitle(regions, 1, 4096)).toBe('offset 4097 · header');
  });
  it('tests a selection', () => {
    expect(hexInSelection({ from: 1, to: 3 }, 2)).toBe(true);
    expect(hexInSelection({ from: 1, to: 3 }, 3)).toBe(false);
    expect(hexInSelection(null, 0)).toBe(false);
  });
});
