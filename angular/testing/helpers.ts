// Copyright (c) 2026 Philipp Orlov

import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/** Waits until the views have caught up with the signals. */
export async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

export function query<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`nothing matches ${selector}`);
  }
  return found;
}

export function typeInto(input: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
