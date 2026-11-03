// Copyright (c) 2026 Philipp Orlov

/** A size given in MiB as KiB, MiB or GiB, whichever reads best. */
export function formatBinarySize(valueMib: number): string {
  const safe = Number.isFinite(valueMib) && valueMib > 0 ? valueMib : 0;
  if (safe >= 1024 * 1024) {
    const tib = safe / (1024 * 1024);
    return `${tib.toFixed(tib >= 10 ? 1 : 2)} TiB`;
  }
  if (safe >= 1024) {
    const gib = safe / 1024;
    return `${gib.toFixed(gib >= 10 ? 1 : 2)} GiB`;
  }
  if (safe >= 1) {
    // 1023.96 MiB rounds to "1024 MiB": say 1.00 GiB instead.
    const text = safe.toFixed(safe >= 10 ? 0 : 1);
    return Number(text) >= 1024 ? '1.00 GiB' : `${text} MiB`;
  }
  // Below 1 KiB of a MiB the value rounds to 0 KiB; 1023.6 KiB would read "1024 KiB".
  const kib = Math.round(safe * 1024);
  return kib >= 1024 ? '1.0 MiB' : `${kib} KiB`;
}

/** A byte count as B, KiB, MiB, GiB or TiB. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  return formatBinarySize(bytes / (1024 * 1024));
}
