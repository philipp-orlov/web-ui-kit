// Copyright (c) 2026 Philipp Orlov

// CSV as RFC 4180 describes it: fields with a comma, a quote or a line break are quoted, quotes are doubled, lines end
// with CRLF. null is an empty field. Framework-free.

import { Value } from '../format/format';

export interface CsvOptions {
  /** Write the column names as the first line (default true). */
  header?: boolean;
  /** Start with a byte order mark, so that Excel reads the file as UTF-8. */
  bom?: boolean;
  /**
   * Make text that a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, tab or CR first) plain text, with a `'`
   * before it. Turn it on for files from data the user did not write (OWASP "CSV injection"); numbers stay as they are.
   */
  safe?: boolean;
}

const FORMULA = /^[=+\-@\t\r]/;

function field(v: Value | undefined, safe: boolean): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
  if (safe && typeof v === 'string' && FORMULA.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(columns: string[], rows: Value[][], options: CsvOptions = {}): string {
  const safe = options.safe ?? false;
  const lines: string[] = [];
  if (options.header !== false) lines.push(columns.map(c => field(c, safe)).join(','));
  for (const row of rows) lines.push(row.map(v => field(v, safe)).join(','));
  return (options.bom ? '﻿' : '') + lines.join('\r\n') + '\r\n';
}
