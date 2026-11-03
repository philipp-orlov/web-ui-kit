// Copyright (c) 2026 Philipp Orlov

/**
 * Hands a Blob to the browser as a file to save. The object URL is revoked later, not at once: Firefox and Safari
 * start the download after click() returns, and a URL revoked synchronously makes them save nothing.
 */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Hands `text` to the browser as a file to save. */
export function downloadText(fileName: string, text: string, mimeType: string): void {
  downloadBlob(fileName, new Blob([text], { type: mimeType }));
}

/** Hands bytes (a PDF, an XLSX) to the browser as a file to save. */
export function downloadBytes(fileName: string, bytes: Uint8Array, mimeType: string): void {
  downloadBlob(fileName, new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mimeType }));
}
