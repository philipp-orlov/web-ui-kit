import { fitPanes, sashTarget } from './sizing';

describe('sashTarget', () => {
  it('moves within both minimums', () => {
    expect(sashTarget(200, 300, 100, 100, 50)).toBe(250);
    expect(sashTarget(200, 300, 100, 100, -500)).toBe(100);
    expect(sashTarget(200, 300, 100, 100, 500)).toBe(400);
  });
  it('does not move a pair that is below its minimums', () => {
    expect(sashTarget(50, 50, 100, 100, 10)).toBeNull();
  });
});

describe('fitPanes', () => {
  it('leaves panes that fit alone', () => {
    expect(fitPanes([{ size: 200, min: 100, flexible: false }, { size: 0, min: 120, flexible: true }], 800)).toEqual([200, 120]);
  });
  it('shrinks the fixed panes from the last one back', () => {
    const panes = [
      { size: 300, min: 100, flexible: false },
      { size: 0, min: 100, flexible: true },
      { size: 300, min: 150, flexible: false },
    ];
    // 300 + 100 + 300 = 700 in 500: the last gives 150 (to its minimum), then the first gives 50.
    expect(fitPanes(panes, 500)).toEqual([250, 100, 150]);
  });
});
