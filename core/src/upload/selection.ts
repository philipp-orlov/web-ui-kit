// Copyright (c) 2026 Philipp Orlov

/** What a selection of files must satisfy before any of it is sent. */
export interface SelectionRules {
  /** The most files taken in one go. A larger selection is refused as a whole, so nothing is sent by surprise. */
  maxFiles: number;
  /** The largest file taken, in bytes. */
  maxBytes: number;
  /** Decides by name whether a file is of a kind the server takes. */
  accepts(fileName: string): boolean;
}

export interface RejectedFile {
  file: File;
  reason: string;
}

export interface Selection {
  /** Files to send. Empty when the whole selection was refused. */
  accepted: File[];
  /** Files refused one by one, each with the reason in words a person can act on. */
  rejected: RejectedFile[];
  /** The number of files chosen when there were more than `maxFiles`; 0 otherwise. */
  tooMany: number;
}

/** Human-readable size: "512 KB", "3.4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Sorts a selection into files to send and files refused, before anything is uploaded. A selection with more files
 * than `maxFiles` is refused as a whole and says how many were chosen.
 */
export function checkSelection(files: readonly File[], rules: SelectionRules): Selection {
  if (files.length > rules.maxFiles) return { accepted: [], rejected: [], tooMany: files.length };

  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    if (!rules.accepts(file.name)) rejected.push({ file, reason: 'This kind of file cannot be added here.' });
    else if (file.size === 0) rejected.push({ file, reason: 'The file is empty.' });
    else if (file.size > rules.maxBytes) rejected.push({ file, reason: `The file is larger than ${formatBytes(rules.maxBytes)}.` });
    else accepted.push(file);
  }
  return { accepted, rejected, tooMany: 0 };
}

/** The file-name extensions of a list such as ['.jpg', '.pdf'], compared without case. */
export function extensionsAccept(extensions: readonly string[]): (fileName: string) => boolean {
  const wanted = extensions.map(e => e.toLowerCase());
  return fileName => {
    const dot = fileName.lastIndexOf('.');
    return dot > 0 && wanted.includes(fileName.slice(dot).toLowerCase());
  };
}
