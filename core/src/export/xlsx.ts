// Copyright (c) 2026 Philipp Orlov

// An XLSX (SpreadsheetML) writer: sheets of typed cells with shared styles, frozen panes, filters, merges and links,
// packed with the ZIP writer. Framework-free. libsql's report export builds its workbooks with it, and
// `tableToXlsx` writes one table, for a grid export.

import { toDate, Value } from '../format/format';
import { buildZip } from './zip';

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

/** `#rgb` or `#rrggbb` as the RRGGBB Excel wants; anything else is the fallback, not a broken file. */
export function argb(color: string, fallback = '222222'): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return fallback;
  const hex = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  return hex.toUpperCase();
}

const esc = (s: string): string => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A report's number or date pattern as an Excel format code. */
export function excelFormat(pattern: string | undefined): string {
  if (!pattern) return 'General';
  if (/yyyy|yy|MM|dd|HH|mm|ss/.test(pattern)) return pattern.replace(/MM/g, 'mm').replace(/HH/g, 'hh');
  // text around the digits has to be quoted; the digit marks, separators and signs are format characters
  return pattern.replace(/[A-Za-z\u0080-￿][^#0.,%$\-+()\s]*/g, t => `"${t.replace(/"/g, '')}"`);
}

/** The letters of a column: 0 is A, 26 is AA. */
export const columnName = (n: number): string => {
  let s = '';
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

export interface XlsxLook {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  fill?: string;
  fmt?: string;
  align?: 'left' | 'center' | 'right';
  indent?: number;
  wrap?: boolean;
  top?: 'thin' | 'medium';
  bottom?: 'thin' | 'medium';
  underline?: boolean;
}

export class XlsxStyles {
  private readonly fonts: string[] = [];
  private readonly fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  private readonly borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  private readonly numFmts: string[] = [];
  private readonly xfs: string[] = [];
  private readonly index = new Map<string, number>();
  constructor() {
    this.style({});
  }
  private pick(list: string[], xml: string): number {
    const at = list.indexOf(xml);
    if (at >= 0) return at;
    list.push(xml);
    return list.length - 1;
  }
  style(l: XlsxLook): number {
    const key = JSON.stringify(l);
    const have = this.index.get(key);
    if (have !== undefined) return have;
    const font = this.pick(
      this.fonts,
      `<font>${l.bold ? '<b/>' : ''}${l.italic ? '<i/>' : ''}${l.underline ? '<u/>' : ''}<sz val="${l.size ?? 10}"/><color rgb="FF${argb(l.color ?? '#222222')}"/><name val="Arial"/><family val="2"/></font>`,
    );
    const fill = l.fill ? this.pick(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${argb(l.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const side = (name: string, kind?: string): string => (kind ? `<${name} style="${kind}"><color rgb="FF6B7280"/></${name}>` : `<${name}/>`);
    const border = l.top || l.bottom ? this.pick(this.borders, `<border><left/><right/>${side('top', l.top)}${side('bottom', l.bottom)}<diagonal/></border>`) : 0;
    let fmt = 0;
    if (l.fmt && l.fmt !== 'General') {
      const code = `<numFmt numFmtId="@" formatCode="${esc(l.fmt)}"/>`;
      let at = this.numFmts.indexOf(code);
      if (at < 0) at = this.numFmts.push(code) - 1;
      fmt = 164 + at;
    }
    const align = l.align || l.indent || l.wrap ? `<alignment${l.align ? ` horizontal="${l.align}"` : ''} vertical="center"${l.indent ? ` indent="${l.indent}"` : ''}${l.wrap ? ' wrapText="1"' : ''}/>` : '<alignment vertical="center"/>';
    this.xfs.push(`<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`);
    this.index.set(key, this.xfs.length - 1);
    return this.xfs.length - 1;
  }
  xml(): string {
    return (
      XML +
      `<styleSheet xmlns="${NS}">` +
      (this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((x, i) => x.replace('"@"', `"${164 + i}"`)).join('')}</numFmts>` : '') +
      `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>` +
      `<fills count="${this.fills.length}">${this.fills.join('')}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
    );
  }
}

type Cell = { v: Value | Date; s: number } | undefined;

/** Excel's limits: longer text makes a file Excel has to repair, more rows or columns one it cannot open. */
export const XLSX_MAX_TEXT = 32767;
export const XLSX_MAX_ROWS = 1048576;
export const XLSX_MAX_COLUMNS = 16384;

export class XlsxSheet {
  readonly rows: Cell[][] = [];
  readonly widths: number[] = [];
  readonly heights = new Map<number, number>();
  freeze?: { row: number; col: number };
  filter?: string;
  tab?: string;
  merges: string[] = [];
  links: { ref: string; location: string }[] = [];
  constructor(readonly name: string) {}
  set(r: number, c: number, v: Value | Date, s: number): void {
    if (r >= XLSX_MAX_ROWS || c >= XLSX_MAX_COLUMNS) throw new RangeError(`cell ${columnName(Math.min(c, XLSX_MAX_COLUMNS - 1))}${r + 1} is beyond what Excel opens`);
    (this.rows[r] ??= [])[c] = { v, s };
  }
  width(c: number, w: number): void {
    this.widths[c] = Math.max(this.widths[c] ?? 0, Math.min(w, 70));
  }
  xml(): string {
    const cells = (row: Cell[] | undefined, r: number): string => {
      if (!row) return '';
      let out = '';
      row.forEach((cell, c) => {
        if (!cell) return;
        const ref = columnName(c) + (r + 1);
        const v = cell.v;
        if (v === null || v === '') out += `<c r="${ref}" s="${cell.s}"/>`;
        else if (v instanceof Date) out += `<c r="${ref}" s="${cell.s}"><v>${v.getTime() / 86400000 + 25569}</v></c>`;
        else if (typeof v === 'number') out += Number.isFinite(v) ? `<c r="${ref}" s="${cell.s}"><v>${v}</v></c>` : `<c r="${ref}" s="${cell.s}"/>`;
        else if (typeof v === 'boolean') out += `<c r="${ref}" s="${cell.s}" t="b"><v>${v ? 1 : 0}</v></c>`;
        else out += `<c r="${ref}" s="${cell.s}" t="inlineStr"><is><t xml:space="preserve">${esc(v.length > XLSX_MAX_TEXT ? v.slice(0, XLSX_MAX_TEXT - 1) + '…' : v)}</t></is></c>`;
      });
      return out;
    };
    const last = this.rows.length;
    // A loop, not Math.max(...rows): spreading a sheet of 120,000 rows overflows the stack.
    let lastCol = -1;
    for (const row of this.rows) if (row && row.length - 1 > lastCol) lastCol = row.length - 1;
    const pane = this.freeze
      ? `<pane${this.freeze.col ? ` xSplit="${this.freeze.col}"` : ''}${this.freeze.row ? ` ySplit="${this.freeze.row}"` : ''} topLeftCell="${columnName(this.freeze.col)}${this.freeze.row + 1}" activePane="${this.freeze.row && this.freeze.col ? 'bottomRight' : this.freeze.row ? 'bottomLeft' : 'topRight'}" state="frozen"/>`
      : '';
    return (
      XML +
      `<worksheet xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      (this.tab ? `<sheetPr><tabColor rgb="FF${argb(this.tab)}"/></sheetPr>` : '') +
      `<dimension ref="A1:${columnName(Math.max(lastCol, 0))}${Math.max(last, 1)}"/>` +
      `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews>` +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      (this.widths.length ? `<cols>${this.widths.map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${w.toFixed(1)}" customWidth="1"/>` : '')).join('')}</cols>` : '') +
      `<sheetData>${Array.from({ length: last }, (_, r) => {
        const h = this.heights.get(r);
        return `<row r="${r + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${cells(this.rows[r], r)}</row>`;
      }).join('')}</sheetData>` +
      (this.filter ? `<autoFilter ref="${this.filter}"/>` : '') +
      (this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') +
      (this.links.length ? `<hyperlinks>${this.links.map(l => `<hyperlink ref="${l.ref}" location="${esc(l.location)}"/>`).join('')}</hyperlinks>` : '') +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
      '<pageSetup orientation="landscape" fitToHeight="0"/>' +
      '</worksheet>'
    );
  }
}

/** A name Excel accepts for a sheet: at most 31 characters, none of []:*?/\, not taken. */
export function sheetName(want: string, taken: Set<string>): string {
  const base = (want.replace(/[\[\]:*?/\\]/g, '_').replace(/^'+|'+$/g, '').trim() || 'Sheet').slice(0, 31);
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = base.slice(0, 31 - String(n).length - 1) + ' ' + n;
  taken.add(name.toLowerCase());
  return name;
}

/** The value for an Excel cell: a date pattern makes a date of text or numbers, anything else stays. */
export function xlsxCellValue(v: Value | undefined, pattern: string | undefined): Value | Date {
  if (v === undefined) return null;
  if (pattern && /yyyy|yy|MM|dd|HH|mm|ss/.test(pattern) && v !== null && v !== '') return toDate(v) ?? v;
  return v;
}

export interface WorkbookMeta {
  title: string;
  /** dc:creator of the document properties. */
  creator?: string;
  now?: Date;
}

/** The XLSX file of `sheets`, in order; the first is the one that opens. */
export async function buildWorkbook(sheets: XlsxSheet[], styles: XlsxStyles, meta: WorkbookMeta): Promise<Uint8Array> {
  const now = meta.now ?? new Date();
  const title = meta.title;
  const creator = meta.creator ?? 'ui-kit';
  // ---- the package ----------------------------------------------------------------------------------------------------
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const entries = [
    {
      name: '[Content_Types].xml',
      data: XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
        sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>',
    },
    {
      name: '_rels/.rels',
      data: XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    },
    {
      name: 'docProps/core.xml',
      data: XML + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>${esc(creator)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</dcterms:created></cp:coreProperties>`,
    },
    {
      name: 'xl/workbook.xml',
      data: XML + `<workbook xmlns="${NS}" xmlns:r="${rel}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${rel}/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: 'xl/styles.xml', data: styles.xml() },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml() })),
  ];
  return buildZip(entries, now);
}

export interface XlsxTable {
  /** The sheet name (made valid) and the document title. */
  title: string;
  columns: { title: string; /** A number or date pattern (`#,##0.00`, `yyyy-MM-dd`). */ format?: string; width?: number }[];
  rows: Value[][];
  now?: Date;
  creator?: string;
}

/** One table as a workbook: a bold, frozen header row with a filter, and typed cells. */
export async function tableToXlsx(table: XlsxTable): Promise<Uint8Array> {
  const styles = new XlsxStyles();
  const sheet = new XlsxSheet(sheetName(table.title, new Set()));
  const header = styles.style({ bold: true, fill: '#f1f3f5', bottom: 'thin' });
  const looks = table.columns.map(c => {
    const fmt = c.format ? excelFormat(c.format) : undefined;
    return { pattern: c.format, style: styles.style(fmt ? { fmt } : {}) };
  });
  table.columns.forEach((c, i) => {
    sheet.set(0, i, c.title, header);
    sheet.width(i, c.width ?? Math.max(10, c.title.length + 4));
  });
  table.rows.forEach((row, r) => row.forEach((v, i) => sheet.set(r + 1, i, xlsxCellValue(v, looks[i]?.pattern), looks[i]?.style ?? 0)));
  if (table.columns.length) {
    sheet.freeze = { row: 1, col: 0 };
    sheet.filter = `A1:${columnName(table.columns.length - 1)}${table.rows.length + 1}`;
  }
  return buildWorkbook([sheet], styles, { title: table.title, creator: table.creator, now: table.now });
}
