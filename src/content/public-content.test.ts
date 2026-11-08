import { describe, expect, it } from 'vitest';
import { describeShifts, faqs } from './public-content';

describe('public content', () => {
  it('describes shift hours from the catalog, falling back to the published hours', () => {
    expect(
      describeShifts([
        { code: 'LUNCH', startTime: '10:30', endTime: '14:30' },
        { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
      ]),
    ).toBe('ca trưa (10:30–14:30) và ca tối (17:00–22:00)');
    expect(describeShifts(undefined)).toBe('ca trưa (10:00–14:00) và ca tối (17:00–22:00)');
  });

  it('refers to the frozen contract deposit terms and has no duplicate questions', () => {
    const answer = faqs.find((item) => item.question.startsWith('Đặt cọc'))?.answer;
    expect(answer).toContain('Tỷ lệ và số tiền cọc');
    expect(answer).toContain('hợp đồng');
    expect(answer).not.toContain('30%');
    expect(new Set(faqs.map((item) => item.question)).size).toBe(faqs.length);
  });
});
