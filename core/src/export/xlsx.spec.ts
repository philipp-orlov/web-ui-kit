import { argb, columnName, excelFormat, sheetName, tableToXlsx, XLSX_MAX_TEXT, XlsxSheet, XlsxStyles } from './xlsx';
import { readZip } from './zip';

const text = (b: Uint8Array) => new TextDecoder().decode(b);

describe('xlsx writer', () => {
  it('names columns', () => {
    expect([0, 25, 26, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'ZZ', 'AAA']);
  });
  it('turns patterns into Excel formats', () => {
    expect(excelFormat('#,##0.00')).toBe('#,##0.00');
    expect(excelFormat('yyyy-MM-dd HH:mm')).toBe('yyyy-mm-dd hh:mm');
    expect(excelFormat(undefined)).toBe('General');
  });
  it('makes sheet names valid and unique', () => {
    const taken = new Set<string>();
    expect(sheetName('a/b', taken)).toBe('a_b');
    expect(sheetName('A/B', taken)).toBe('A_B 2');
    expect(sheetName('x'.repeat(40), taken).length).toBe(31);
  });
  it('normalises colours to RRGGBB and refuses what Excel cannot read', () => {
    expect(argb('#abc')).toBe('AABBCC');
    expect(argb('#1976d2')).toBe('1976D2');
    expect(argb('rgb(1,2,3)')).toBe('222222');
    const styles = new XlsxStyles();
    styles.style({ color: '#f00', fill: 'tomato' });
    expect(styles.xml()).toContain('rgb="FFFF0000"');
    expect(styles.xml()).not.toContain('rgb="FFOMATO"');
  });
  it('writes a sheet of 150,000 rows (Math.max(...rows) overflowed the stack)', () => {
    const sheet = new XlsxSheet('big');
    for (let r = 0; r < 150_000; r++) sheet.set(r, r === 149_999 ? 3 : 0, r, 0);
    const xml = sheet.xml();
    expect(xml).toContain('<dimension ref="A1:D150000"/>');
  });
  it('cuts text at the 32,767 characters a cell holds', () => {
    const sheet = new XlsxSheet('t');
    sheet.set(0, 0, 'x'.repeat(40_000), 0);
    const cell = /<t xml:space="preserve">([^<]*)<\/t>/.exec(sheet.xml())![1];
    expect(cell.length).toBe(XLSX_MAX_TEXT);
    expect(cell.endsWith('…')).toBe(true);
  });
  it('refuses a cell beyond the last row Excel opens', () => {
    expect(() => new XlsxSheet('t').set(1_048_576, 0, 1, 0)).toThrowError(RangeError);
  });
  it('writes one table as a workbook with typed cells, a frozen header and a filter', async () => {
    const bytes = await tableToXlsx({
      title: 'People',
      columns: [{ title: 'Name' }, { title: 'Score', format: '0.0' }, { title: 'Born', format: 'yyyy-MM-dd' }],
      rows: [['Ada', 3.25, '1815-12-10'], ['Bob', null, null]],
      now: new Date(Date.UTC(2026, 0, 1)),
    });
    const files = await readZip(bytes);
    expect([...files.keys()]).toContain('xl/worksheets/sheet1.xml');
    const sheet = text(files.get('xl/worksheets/sheet1.xml')!);
    expect(sheet).toContain('<autoFilter ref="A1:C3"/>');
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain('<v>3.25</v>');
    // a date is a serial number, not text
    expect(sheet).not.toContain('1815-12-10');
    expect(text(files.get('xl/workbook.xml')!)).toContain('name="People"');
    expect(text(files.get('docProps/core.xml')!)).toContain('<dc:creator>ui-kit</dc:creator>');
  });
});
