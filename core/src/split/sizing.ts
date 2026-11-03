// Copyright (c) 2026 Philipp Orlov

// The arithmetic of a split layout (panes in a row or a column with sashes between them), free of the DOM and of any
// framework: the Angular SplitComponent measures, calls these and applies the result.

export interface PaneExtent {
  /** The pane's size along the split axis, in pixels. */
  size: number;
  /** The smallest size the pane may have. */
  min: number;
  /** The pane that takes the remaining space; its size is not kept. */
  flexible: boolean;
}

/**
 * Where a sash between two panes lands when it moves by `delta` pixels: the size of the pane before it, between both
 * minimums. The pair shares `before + after`. null when the pair is already below its minimums and cannot move.
 */
export function sashTarget(before: number, after: number, minBefore: number, minAfter: number, delta: number): number | null {
  const total = before + after;
  if (total < minBefore + minAfter) return null;
  return Math.max(minBefore, Math.min(before + delta, total - minAfter));
}

/**
 * The sizes that make the fixed panes fit next to the flexible one: when they overflow `available`, the fixed panes
 * give way from the last one back, each down to its minimum. Returns the new size of every pane (the flexible one's
 * entry is its minimum and is not meant to be applied).
 */
export function fitPanes(panes: readonly PaneExtent[], available: number): number[] {
  const sizes = panes.map(p => (p.flexible ? p.min : p.size));
  let overflow = sizes.reduce((sum, s) => sum + s, 0) - available;
  for (let i = panes.length - 1; i >= 0 && overflow > 0; i--) {
    if (panes[i].flexible) continue;
    const give = Math.min(overflow, Math.max(0, sizes[i] - panes[i].min));
    sizes[i] -= give;
    overflow -= give;
  }
  return sizes;
}
