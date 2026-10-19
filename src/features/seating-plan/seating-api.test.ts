import { afterEach, describe, expect, it, vi } from 'vitest';
import { seatingApi, zoomedViewBox } from './seating-api';

describe('zoomedViewBox', () => {
  it('keeps the full plan at zoom 1 and ignores panning', () => {
    expect(zoomedViewBox('0 0 400 200', 1, 50, 50)).toBe('0 0 400 200');
  });
  it('zooms around the centre', () => {
    expect(zoomedViewBox('0 0 400 200', 2, 0, 0)).toBe('100 50 200 100');
  });
  it('clamps zoom and panning to the plan bounds', () => {
    expect(zoomedViewBox('0 0 400 200', 10, 1000, -1000)).toBe('300 0 100 50');
  });
});

describe('seatingApi.current', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it('reads the current plan without a stored planId and keeps null as "no plan yet"', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000/api/v1');
    const fetch = vi.fn((request: Request) =>
      Promise.resolve(
        Response.json({ data: request.url.endsWith('/current') ? null : { seatingPlanId: 'x' } }),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    await expect(seatingApi.current('token', 'booking')).resolves.toBeNull();
    const request = fetch.mock.calls[0]![0];
    expect(request.url).toBe('http://localhost:4000/api/v1/bookings/booking/seating-plans/current');
    expect(request.headers.get('Authorization')).toBe('Bearer token');
  });
});
