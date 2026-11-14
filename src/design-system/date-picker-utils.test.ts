import { expect, it } from 'vitest';
import { maskDateInput, parseDateParts } from './date-picker-utils';

it('formats typed digits as dd/mm/yyyy one keystroke at a time', () => {
  const typed = ['1', '12', '121', '1212', '12122', '12/12/2026'].map((value) =>
    maskDateInput(value),
  );
  expect(typed).toEqual(['1', '12', '12/1', '12/12', '12/12/2', '12/12/2026']);
  // Gõ tiếp sau khi đã có dấu "/" (lỗi cũ: số nối mãi vào tháng) và gõ quá 8 chữ số.
  expect(maskDateInput('12/122')).toBe('12/12/2');
  expect(maskDateInput('12/12/20261')).toBe('12/12/2026');
  expect(parseDateParts(maskDateInput('20122026'))).toEqual({ year: 2026, month: 12, day: 20 });
});

it('pads a single-digit day or month closed by a separator, and keeps a pasted ISO date', () => {
  expect(maskDateInput('5/3/2026')).toBe('05/03/2026');
  expect(maskDateInput('5-')).toBe('05');
  expect(maskDateInput('ab12c')).toBe('12');
  expect(maskDateInput('2026-12-20')).toBe('2026-12-20');
});
