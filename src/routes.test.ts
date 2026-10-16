import { describe, expect, it } from 'vitest';

import { legacyRedirects, routes, withBooking } from './routes';

describe('route table', () => {
  it('appends bookingId while keeping existing query and fragment', () => {
    expect(withBooking(routes.payment, 'b1')).toBe('/khong-gian/thanh-toan?bookingId=b1');
    expect(withBooking(routes.seating, 'b1')).toBe(
      '/khong-gian/chuan-bi/khach?xem=so-do&bookingId=b1',
    );
    expect(withBooking('/x#a', 'b 1')).toBe('/x?bookingId=b%201#a');
    expect(withBooking(routes.space, null)).toBe('/khong-gian');
  });

  it('redirects every legacy route that emails or bookmarks may still use', () => {
    const sources = legacyRedirects.map((rule) => rule.source);
    for (const legacy of [
      '/halls',
      '/menus',
      '/consultation',
      '/account',
      '/overview',
      '/workspace',
      '/contract',
      '/billing',
      '/payment-return',
      '/guests',
      '/seating',
      '/invitations',
      '/appendices',
      '/invoices',
      '/notifications',
      '/invitation/:slug',
      '/invitation/personal',
      '/reset-password',
      '/workspace-invitation',
    ])
      expect(sources).toContain(legacy);
    // Thứ tự quan trọng: /invitation/personal phải đứng trước /invitation/:slug.
    expect(sources.indexOf('/invitation/personal')).toBeLessThan(
      sources.indexOf('/invitation/:slug'),
    );
  });
});
