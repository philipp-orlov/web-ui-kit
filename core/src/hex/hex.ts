// Copyright (c) 2026 Philipp Orlov

// What a hex dump shows, as pure functions of the bytes: rows of 16, offsets, hex pairs, printable characters and the
// region a byte falls in. Framework-free; the Angular HexDumpComponent renders it.

/** A stretch of bytes with a meaning, painted in its own colour. */
export interface HexRegion {
  from: number;
  /** Exclusive. */
  to: number;
  label: string;
  color: string;
}

export interface HexSelection {
  from: number;
  /** Exclusive. */
  to: number;
}

export const BYTES_PER_ROW = 16;

export const hexRowCount = (length: number): number => Math.ceil(length / BYTES_PER_ROW);

/** The offset of a row as 8 hex digits, counted from `base` (the place of the bytes in a file). */
export const hexRowOffset = (row: number, base = 0): string => (base + row * BYTES_PER_ROW).toString(16).padStart(8, '0');

export const hexByte = (bytes: Uint8Array, i: number): string => (i < bytes.length ? bytes[i].toString(16).padStart(2, '0') : '  ');

/** The byte as a character: printable ASCII as it is, anything else a middle dot. */
export function hexChar(bytes: Uint8Array, i: number): string {
  if (i >= bytes.length) return ' ';
  const b = bytes[i];
  return b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·';
}

/** The first region that holds byte `i`. Regions are few; a linear scan is fine. */
export const hexRegionAt = (regions: readonly HexRegion[], i: number): HexRegion | undefined => regions.find(r => i >= r.from && i < r.to);

/** The tooltip of a byte: its offset in the file (with `base`), and its region. */
export function hexTitle(regions: readonly HexRegion[], i: number, base = 0): string {
  const region = hexRegionAt(regions, i);
  return `offset ${base + i}${region ? ' · ' + region.label : ''}`;
}

export const hexInSelection = (selection: HexSelection | null, i: number): boolean => selection !== null && i >= selection.from && i < selection.to;
