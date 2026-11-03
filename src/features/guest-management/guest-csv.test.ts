import { describe, expect, it } from 'vitest';

import {
  createCsvTemplate,
  csvTemplate,
  csvToImportRows,
  detectDelimiter,
  normalizePhone,
  parseCsv,
} from './guest-csv';

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

  it('detects comma, semicolon and tab delimiters', () => {
    expect(detectDelimiter('ma,ho_ten,nhom')).toBe(',');
    expect(detectDelimiter('ma;ho_ten;nhom')).toBe(';');
    expect(detectDelimiter('ma\tho_ten\tnhom')).toBe('\t');
    expect(detectDelimiter('"ma, code";"ho_ten";"nhom"')).toBe(';');
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
      {
        externalRowKey: 'K002',
        name: 'Trần Thị Bình',
        guestGroupId: 'g-bride',
        phone: null,
        operationalNote: null,
      },
    ]);
  });

  it('supports semicolon-delimited CSV exported from Excel', () => {
    const semicolonCsv =
      'ma;ho_ten;nhom;so_dien_thoai;ghi_chu\r\n' +
      'K001;Nguyễn Văn An;Nhà trai;0901234567;Bạn đại học\r\n' +
      'K002;Trần Thị Bình;Nhà gái;;\r\n';
    const result = csvToImportRows(semicolonCsv, groups);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]!.name).toBe('Nguyễn Văn An');
    expect(result.rows[0]!.guestGroupId).toBe('g-groom');
  });

  it('supports tab-delimited text/TSV', () => {
    const tabCsv = 'ma\tho_ten\tnhom\nK001\tNguyễn Văn An\tNhà trai\n';
    const result = csvToImportRows(tabCsv, groups);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]!.name).toBe('Nguyễn Văn An');
  });

  it('supports Vietnamese accented column aliases', () => {
    const viCsv =
      'Mã,Họ và tên,Nhóm,Số điện thoại,Ghi chú\n' +
      'K001,Nguyễn Văn An,Nhà trai,0901234567,Bạn đại học\n';
    const result = csvToImportRows(viCsv, groups);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]!.externalRowKey).toBe('K001');
    expect(result.rows[0]!.name).toBe('Nguyễn Văn An');
    expect(result.rows[0]!.guestGroupId).toBe('g-groom');
  });

  it('supports English and alternative column aliases', () => {
    const enCsv =
      'code,full_name,group,phone,note\n' +
      'K001,Nguyễn Văn An,Groom Side,+84901234567,Colleague\n';
    const result = csvToImportRows(enCsv, groups);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]!.externalRowKey).toBe('K001');
    expect(result.rows[0]!.name).toBe('Nguyễn Văn An');
    expect(result.rows[0]!.guestGroupId).toBe('g-groom');
  });

  it('creates dynamic template matching booking active groups', () => {
    const customTemplate = createCsvTemplate(groups);
    expect(customTemplate).toContain('Nhà trai');
    expect(customTemplate).toContain('Nhà gái');
  });

  it('reports every invalid line instead of importing a partial list', () => {
    const csv =
      'ma,ho_ten,nhom\nK1,,Groom Side\nK1,An,Groom Side\nK1,Bình,Groom Side\nK3,=cmd,Cũ\n';
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
