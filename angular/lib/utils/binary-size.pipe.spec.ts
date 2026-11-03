import { BinarySizePipe } from './binary-size.pipe';

describe('BinarySizePipe', () => {
  it('formats MiB and treats null as 0', () => {
    const pipe = new BinarySizePipe();
    expect(pipe.transform(2048)).toBe('2.00 GiB');
    expect(pipe.transform(null)).toBe('0 KiB');
    expect(pipe.transform(undefined)).toBe('0 KiB');
  });
});
