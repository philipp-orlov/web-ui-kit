// Copyright (c) 2026 Philipp Orlov

import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes what needs it', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y'], ['he said "hi"', null], ['line\nbreak', true]])).toBe('a,b\r\n1,"x,y"\r\n"he said ""hi""",\r\n"line\nbreak",true\r\n');
  });
  it('can leave out the header and add a byte order mark', () => {
    expect(toCsv(['a'], [[1]], { header: false, bom: true })).toBe('﻿1\r\n');
  });
});

describe('toCsv with safe', () => {
  it('makes text that starts like a formula plain text, and leaves numbers', () => {
    expect(toCsv(['a'], [['=HYPERLINK("x")'], ['@SUM(A1)'], ['-2+3'], [-5], ['ok']], { header: false, safe: true })).toBe(
      `"'=HYPERLINK(""x"")"\r\n'@SUM(A1)\r\n'-2+3\r\n-5\r\nok\r\n`,
    );
  });
});
