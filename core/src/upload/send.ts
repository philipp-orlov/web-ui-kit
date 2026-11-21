// Copyright (c) 2026 Philipp Orlov

import type { Sender, Transfer, UploadResponse } from './queue';

/** The connection failed before the server answered (offline, server down, proxy refused). */
export class TransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

export interface XhrSenderOptions {
  /** The address the file is posted to. A function, so a changed address is used by the next file. */
  url: () => string;
  /** Headers for one file, e.g. the sign-in token and the file's name. */
  headers?: (file: File) => Record<string, string>;
}

/**
 * Posts each file as the raw body of one request (Content-Type: application/octet-stream). Progress comes from the
 * browser's own count of bytes sent, so it moves while the file travels, not when the server answers.
 */
export function xhrSender(options: XhrSenderOptions): Sender {
  return (file, hooks) => {
    const xhr = new XMLHttpRequest();
    const done = new Promise<UploadResponse>((resolve, reject) => {
      xhr.open('POST', options.url());
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      for (const [name, value] of Object.entries(options.headers?.(file) ?? {})) xhr.setRequestHeader(name, value);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0) hooks.onProgress(event.loaded / event.total);
      };
      xhr.upload.onload = () => hooks.onSent();
      xhr.onload = () => resolve({ status: xhr.status, body: parseBody(xhr.responseText) });
      xhr.onerror = () => reject(new TransferError('The connection was lost while sending the file.'));
      xhr.ontimeout = () => reject(new TransferError('The server did not answer in time.'));
      xhr.onabort = () => reject(new TransferError('The upload was stopped.'));
      xhr.send(file);
    });
    // The rejection is handled by the queue; this keeps an aborted transfer from reporting twice.
    done.catch(() => undefined);
    const transfer: Transfer = { done, abort: () => xhr.abort() };
    return transfer;
  };
}

function parseBody(text: string): unknown {
  if (text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
