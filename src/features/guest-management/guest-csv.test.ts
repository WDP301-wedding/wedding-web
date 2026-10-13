import { describe, expect, it } from 'vitest';

import { csvTemplate, csvToImportRows, normalizePhone, parseCsv } from './guest-csv';

const groups = [
  { guestGroupId: 'g-groom', name: 'Groom Side', status: 'ACTIVE' },
  { guestGroupId: 'g-bride', name: 'Bride Side', status: 'ACTIVE' },
  { guestGroupId: 'g-old', name: 'Cũ', status: 'ARCHIVED' },
];

describe('guest CSV import', () => {
  it('parses quoted commas, escaped quotes, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });

  it('turns the template into rows with group ids and E.164 phones', () => {
    const result = csvToImportRows(csvTemplate, groups);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        externalRowKey: 'K001',
        name: 'Nguyễn Văn An',
        guestGroupId: 'g-groom',
        phone: '+84901234567',
        operationalNote: 'Bạn đại học',
      },
      { externalRowKey: 'K002', name: 'Trần Thị Bình', guestGroupId: 'g-bride', phone: null, operationalNote: null },
    ]);
  });

  it('reports every invalid line instead of importing a partial list', () => {
    const csv = 'ma,ho_ten,nhom\nK1,,Groom Side\nK1,An,Groom Side\nK1,Bình,Groom Side\nK3,=cmd,Cũ\n';
    const result = csvToImportRows(csv, groups);
    expect(result.rows).toHaveLength(1);
    expect(result.errors.map((error) => error.line)).toEqual([2, 4, 5]);
    expect(result.errors[2]!.message).toContain('ô bắt đầu bằng');
    expect(result.errors[2]!.message).toContain('không có nhóm');
  });

  it('requires the key, name and group columns', () => {
    expect(csvToImportRows('ten\nAn\n', groups).errors[0]!.message).toContain('Thiếu cột');
  });

  it('normalizes Vietnamese phone numbers', () => {
    expect(normalizePhone('090 123 4567')).toBe('+84901234567');
    expect(normalizePhone('84901234567')).toBe('+84901234567');
    expect(normalizePhone('')).toBeNull();
    expect(() => normalizePhone('12ab')).toThrow();
  });
});
