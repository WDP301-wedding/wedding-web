import { describe, expect, it } from 'vitest';

import { ApiClientError } from './client';
import { describeApiError } from './api-errors';
import { notificationHref, type InboxItem } from '../../features/notifications/notification-api';
import { viewBoxOf, type SeatingTable } from '../../features/seating-plan/seating-api';

const apiError = (
  code: string,
  status: number,
  details?: { code: string; message: string; path: string }[],
) =>
  new ApiClientError({
    kind: 'api',
    code,
    message: 'server text',
    requestId: 'req-1',
    status,
    ...(details ? { details } : {}),
  });

describe('describeApiError', () => {
  it('maps by error.code, not by the server message, and keeps the request id', () => {
    expect(describeApiError(apiError('COUPLE_NAMES_INCOMPLETE', 409))).toEqual({
      message: 'Cần nhập đủ tên cô dâu và chú rể trước khi gửi duyệt hợp đồng.',
      requestId: 'req-1',
      code: 'COUPLE_NAMES_INCOMPLETE',
    });
  });

  it('falls back to the HTTP status and lists invalid fields for 422', () => {
    const result = describeApiError(
      apiError('SOMETHING_NEW', 422, [{ code: 'too_big', message: 'x', path: 'lines.0.quantity' }]),
    );
    expect(result.message).toContain('lines.0.quantity');
  });

  it('lets a screen override a message', () => {
    expect(
      describeApiError(apiError('SEATING_PLAN_EXISTS', 409), { SEATING_PLAN_EXISTS: 'Khác' })
        .message,
    ).toBe('Khác');
  });

  it('explains network failures without implying the command ran twice', () => {
    const error = new ApiClientError({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'x',
      requestId: 'r',
    });
    expect(describeApiError(error).message).toContain('không bị lặp');
  });
});

describe('notificationHref', () => {
  const item = (purpose: InboxItem['purpose'], bookingId: string | null = 'b1') =>
    ({ purpose, resource: { bookingId, owner: 'booking', data: {} } }) as unknown as InboxItem;

  it('routes each purpose to the matching couple screen', () => {
    expect(notificationHref(item('CONTRACT'))).toBe('/khong-gian/thoa-thuan/hop-dong?bookingId=b1');
    expect(notificationHref(item('APPENDIX'))).toBe('/khong-gian/chuan-bi/phu-luc?bookingId=b1');
    expect(notificationHref(item('FINAL_INVOICE'))).toBe('/khong-gian/quyet-toan?bookingId=b1');
    expect(notificationHref(item('PRINT'))).toBe(
      '/khong-gian/chuan-bi/thiep?bookingId=b1&tab=print',
    );
    expect(notificationHref(item('PAYMENT', null))).toBeNull();
  });
});

describe('viewBoxOf', () => {
  it('uses top-left coordinates and leaves room for rotated tables', () => {
    const tables = [
      { x: 0, y: 0, width: 100, height: 100, rotationDegrees: 0 },
      { x: 200, y: 0, width: 100, height: 100, rotationDegrees: 45 },
    ] as SeatingTable[];
    const [minX, minY, width, height] = viewBoxOf(tables).split(' ').map(Number);
    const radius = Math.hypot(100, 100) / 2;
    expect(minX).toBeCloseTo(50 - radius - 20);
    expect(minY).toBeCloseTo(50 - radius - 20);
    expect(width).toBeCloseTo(250 + radius * 2 + 40 - 50);
    expect(height).toBeCloseTo(radius * 2 + 40);
  });
});
