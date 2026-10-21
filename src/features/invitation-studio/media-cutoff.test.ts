import { describe, expect, it } from 'vitest';
import { estimateMediaCutoff } from './media-cutoff';

describe('estimateMediaCutoff', () => {
  it('is 72 hours before the Vietnam-time event start', () => {
    // 16/10/2026 17:00 (UTC+7) = 10:00Z → trừ 72 giờ = 13/10 10:00Z.
    expect(estimateMediaCutoff('2026-10-16', '17:00')).toBe('2026-10-13T10:00:00.000Z');
  });
  it('returns null for malformed input', () => {
    expect(estimateMediaCutoff('16/10/2026', '17:00')).toBeNull();
    expect(estimateMediaCutoff('2026-10-16', '5pm')).toBeNull();
  });
});
