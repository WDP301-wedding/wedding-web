import { afterEach, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { paymentStatusFetch } from '../../features/payments-billing/payment-status-fetch';

afterEach(() => vi.unstubAllGlobals());

it.each(['GET', 'POST'])(
  'leaves other billing %s requests on the original API transport',
  async (method) => {
    const input = new Request('https://api.example.com/api/v1/bookings/booking/billing', {
      method,
    });
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: {} }));
    vi.stubGlobal('fetch', send);
    await paymentStatusFetch(input);
    expect(send).toHaveBeenCalledWith(input);
  },
);

it('routes browser payment status through the authenticated server relay while retaining API policy', async () => {
  const bookingId = '10000000-0000-4000-8000-000000000001';
  const attemptId = '20000000-0000-4000-8000-000000000001';
  const send = vi.fn<typeof fetch>(async (input) => {
    const request = input as Request;
    expect(new URL(request.url).pathname).toBe('/api/payments/reconcile');
    expect(request.method).toBe('POST');
    expect(request.headers.get('authorization')).toBe('Bearer controlled-test');
    expect(await request.json()).toEqual({ bookingId, attemptId });
    return Response.json({ data: { status: 'FAILED' } });
  });
  vi.stubGlobal('fetch', send);
  const result = await createApiClient({
    fetch: paymentStatusFetch,
    baseUrl: 'https://api.example.com/api/v1',
  }).GET('/bookings/{bookingId}/payments/{attemptId}', {
    params: { path: { bookingId, attemptId } },
    headers: { Authorization: 'Bearer controlled-test' },
  });
  expect(result.data?.data.status).toBe('FAILED');
  expect(send).toHaveBeenCalledOnce();
});

it('preserves passive checkout reads without an automatic provider query', async () => {
  const bookingId = '10000000-0000-4000-8000-000000000001';
  const attemptId = '20000000-0000-4000-8000-000000000001';
  const send = vi.fn<typeof fetch>(async (input) => {
    expect(await (input as Request).json()).toEqual({ bookingId, attemptId, check: false });
    return Response.json({ data: { status: 'PENDING' } });
  });
  vi.stubGlobal('fetch', send);
  await createApiClient({
    fetch: paymentStatusFetch,
    baseUrl: 'https://api.example.com/api/v1',
  }).GET('/bookings/{bookingId}/payments/{attemptId}', {
    params: { path: { bookingId, attemptId }, query: { reconcile: 'false' } },
  });
  expect(send).toHaveBeenCalledOnce();
});
