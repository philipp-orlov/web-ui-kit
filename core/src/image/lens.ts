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
 * always sits `gap` away from the pointer, so the pointer stays visible. If no side fits (a picture smaller than
 * the lens), the lens is clamped into `bounds` on the side with the most room.
 */
export function placeLens(p: Pt, size: number, bounds: Box, gap = 16): LensPlacement {
  const half = size / 2;
  const candidates: LensPlacement[] = [
    { side: 'right', x: p.x + gap, y: p.y - half, w: size, h: size },
    { side: 'left', x: p.x - gap - size, y: p.y - half, w: size, h: size },
    { side: 'below', x: p.x - half, y: p.y + gap, w: size, h: size },
    { side: 'above', x: p.x - half, y: p.y - gap - size, w: size, h: size },
  ];
  for (const c of candidates) {
    if (fits(c, bounds)) return c;
  }
  // Near a corner no side fits whole. Slide each side along its free axis (left and right move up or down, above and
  // below move sideways); that never covers the pointer, since the lens stays clear of it on the other axis.
  for (const c of candidates) {
    const slid = c.side === 'left' || c.side === 'right'
      ? { ...c, y: clamp(c.y, bounds.y, bounds.y + bounds.h - size) }
      : { ...c, x: clamp(c.x, bounds.x, bounds.x + bounds.w - size) };
    if (fits(slid, bounds)) return slid;
  }
  // Still nothing (a picture smaller than the lens): keep the side with most room, pulled inside the bounds.
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
