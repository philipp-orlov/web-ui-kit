// Copyright (c) 2026 Philipp Orlov

export interface Pt {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LensSide = 'right' | 'left' | 'below' | 'above';

export interface LensPlacement extends Box {
  /** Which side of the pointer the lens sits on. */
  side: LensSide;
}

/**
 * Where a square lens of `size` goes for a pointer at `p`, inside `bounds` (the visible part of the picture).
 * It prefers the right of the pointer, then the left, then below, then above, and takes the first side it fits on
 * without leaving `bounds`: near the right edge it moves left, near the bottom it moves above, and so on. The lens
 * always sits `gap` away from the pointer, so the pointer stays visible. Rectangles in `avoid` (a toolbar over the picture,
 * say) are treated like the border: a side that would cover one is skipped. If no side fits (a picture smaller than
 * the lens), the lens is clamped into `bounds` on the side with the most room.
 */
export function placeLens(p: Pt, size: number, bounds: Box, gap = 16, avoid: readonly Box[] = []): LensPlacement {
  const half = size / 2;
  const candidates: LensPlacement[] = [
    { side: 'right', x: p.x + gap, y: p.y - half, w: size, h: size },
    { side: 'left', x: p.x - gap - size, y: p.y - half, w: size, h: size },
    { side: 'below', x: p.x - half, y: p.y + gap, w: size, h: size },
    { side: 'above', x: p.x - half, y: p.y - gap - size, w: size, h: size },
  ];
  const clear = (c: Box) => fits(c, bounds) && avoid.every(a => overlap(c, a) === 0);
  for (const c of candidates) {
    if (clear(c)) return c;
  }
  // Near a corner no side fits whole. Slide each side along its free axis (left and right move up or down, above and
  // below move sideways); that never covers the pointer, since the lens stays clear of it on the other axis.
  for (const c of candidates) {
    const slid = c.side === 'left' || c.side === 'right'
      ? { ...c, y: clamp(c.y, bounds.y, bounds.y + bounds.h - size) }
      : { ...c, x: clamp(c.x, bounds.x, bounds.x + bounds.w - size) };
    if (clear(slid)) return slid;
  }
  // Still in the way of a toolbar: push each side clear of the rectangles it overlaps (the lens stays on its side of the
  // pointer, so the pointer is never covered), and take the first that fits.
  for (const c of candidates) {
    const pushed = pushClear(c, avoid, gap);
    if (clear(pushed)) return pushed;
  }
  // Still nothing clear (a picture smaller than the lens, or the toolbar in the way): the side with most room, inside the bounds.
  let best = candidates[0];
  let bestVisible = -1;
  for (const c of candidates) {
    const visible = overlap(c, bounds);
    if (visible > bestVisible) {
      best = c;
      bestVisible = visible;
    }
  }
  return {
    ...best,
    x: clamp(best.x, bounds.x, bounds.x + bounds.w - size),
    y: clamp(best.y, bounds.y, bounds.y + bounds.h - size),
  };
}

/**
 * The rectangle of the picture the lens shows, in picture pixels: centred on the pointer's picture position `q`,
 * `size / (zoom * scale)` wide, so the lens shows the picture at `zoom` times the current on-screen scale.
 */
export function lensSource(q: Pt, size: number, zoom: number, scale: number): Box {
  const side = size / (zoom * scale);
  return { x: q.x - side / 2, y: q.y - side / 2, w: side, h: side };
}

function pushClear(c: LensPlacement, avoid: readonly Box[], gap: number): LensPlacement {
  let out = { ...c };
  for (const a of avoid) {
    if (overlap(out, a) === 0) continue;
    if (out.side === 'above') out = { ...out, y: Math.min(out.y, a.y - gap - out.h) };
    else if (out.side === 'below') out = { ...out, y: Math.max(out.y, a.y + a.h + gap) };
    else if (out.side === 'left') out = { ...out, x: Math.min(out.x, a.x - gap - out.w) };
    else out = { ...out, x: Math.max(out.x, a.x + a.w + gap) };
  }
  return out;
}

/**
 * The sampled rectangle moved (not resized) so that it lies inside a picture of `width × height`, so that the lens
 * keeps showing picture up to the edge instead of empty space. A rectangle larger than the picture is shrunk to it.
 */
export function clampSource(r: Box, width: number, height: number): Box {
  const w = Math.min(r.w, width);
  const h = Math.min(r.h, height);
  return {
    x: clamp(r.x, 0, width - w),
    y: clamp(r.y, 0, height - h),
    w,
    h,
  };
}

function fits(c: Box, b: Box): boolean {
  return c.x >= b.x && c.y >= b.y && c.x + c.w <= b.x + b.w && c.y + c.h <= b.y + b.h;
}

function overlap(c: Box, b: Box): number {
  const w = Math.min(c.x + c.w, b.x + b.w) - Math.max(c.x, b.x);
  const h = Math.min(c.y + c.h, b.y + b.h) - Math.max(c.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
