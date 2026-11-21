// Copyright (c) 2026 Philipp Orlov

import { TransferError } from './send';
import type { Describe, Outcome } from './queue';

/**
 * The default reading of an answer: a 2xx answer is a success, and its body's `message` (when text) is what the person
 * sees; anything else is an error, worded from the body's `message` or `error` field. An application whose server says
 * more (a duplicate is a warning, not a success) passes its own Describe to the queue.
 */
export const describeResponse: Describe = result => {
  if (result instanceof Error) {
    return { level: 'error', message: result instanceof TransferError ? result.message : `Could not send the file: ${result.message}` };
  }
  const message = textField(result.body, 'message') ?? textField(result.body, 'error');
  if (result.status >= 200 && result.status < 300) {
    return { level: 'success', message: message ?? 'Added.' } satisfies Outcome;
  }
  return { level: 'error', message: message ?? `The server refused the file (HTTP ${result.status}).` };
};

function textField(body: unknown, key: string): string | undefined {
  if (body && typeof body === 'object' && key in body) {
    const value = (body as Record<string, unknown>)[key];
    if (typeof value === 'string' && value !== '') return value;
  }
  return undefined;
}
