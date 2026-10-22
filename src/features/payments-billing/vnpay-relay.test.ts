import { describe, expect, it, vi } from 'vitest';
import { relayVnpayQuery } from './vnpay-relay';

const backendOrigin = 'https://backend.example/api/v1';
const bookingId = '1ca0f1c7-dcb4-4ef7-bfa7-112377342d15';
const attemptId = 'aff5dbfe-1344-45c4-b5a9-50a63d4c193d';
const bearer = 'Bearer fixture-user-token';
const attemptPath = `${backendOrigin}/bookings/${bookingId}/payments/${attemptId}`;
const providerUrl = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
const signedRequest = {
  vnp_RequestId: 'server-request-id',
  vnp_Version: '2.1.0',
  vnp_Command: 'querydr',
  vnp_TmnCode: 'SANDBOX',
  vnp_TxnRef: 'server-transaction',
  vnp_TransactionDate: '20261023010000',
  vnp_CreateDate: '20261023010500',
  vnp_IpAddr: '127.0.0.1',
  vnp_OrderInfo: 'server-signed-description',
  vnp_SecureHash: 'a'.repeat(128),
};
const providerResponse = {
  vnp_ResponseId: 'provider-response-id',
  vnp_Command: 'querydr',
  vnp_ResponseCode: '00',
  vnp_TransactionStatus: '02',
  vnp_TxnRef: signedRequest.vnp_TxnRef,
  vnp_Amount: '123456700',
  vnp_SecureHash: 'b'.repeat(128),
  vnp_Message: 'Original provider response, backend must verify before settlement',
};
const attempt = {
  paymentAttemptId: attemptId,
  purpose: 'DEPOSIT',
  status: 'FAILED',
  amountVnd: 1234567,
  applicationStatus: null,
  expiresAt: '2026-10-23T01:15:00Z',
};
function request(body: unknown = { bookingId, attemptId }, authorization: string | null = bearer) {
  return new Request('https://wedding.example/api/payments/reconcile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'fixture-refresh-session=private',
      ...(authorization === null ? {} : { Authorization: authorization }),
    },
    body: JSON.stringify(body),
  });
}
function calls(fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>) {
  return fetch.mock.calls.map(([input, init]) => new Request(input, init));
}
const query = () => Response.json({ data: { request: signedRequest } });

describe('authenticated VNPay query relay', () => {
  it('reads an existing checkout before payment without consuming the provider query window', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: attempt }));
    const response = await relayVnpayQuery(request({ bookingId, attemptId, check: false }), {
      fetch,
      backendOrigin,
    });
    expect(response.status).toBe(200);
    expect(calls(fetch).map((x) => x.url)).toEqual([`${attemptPath}?reconcile=false`]);
  });
  it('keeps status readable without issuing another provider query during its cooldown', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: 'PAYMENT_QUERY_COOLDOWN' } },
          { status: 429, headers: { 'Retry-After': '305' } },
        ),
      )
      .mockResolvedValueOnce(Response.json({ data: attempt }));
    const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
    expect(response.status).toBe(200);
    expect(calls(fetch).map((x) => x.url)).toEqual([
      `${attemptPath}/query`,
      `${attemptPath}?reconcile=false`,
    ]);
    expect(response.headers.get('retry-after')).toBe('305');
  });
  it.each([null, '', 'Basic fixture', 'Bearer '])(
    'requires a bearer token before any upstream call (%s)',
    async (authorization) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const response = await relayVnpayQuery(request(undefined, authorization), {
        fetch,
        backendOrigin,
      });
      expect(response.status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    { bookingId: 'not-a-booking-uuid', attemptId },
    { bookingId, attemptId: '../another-booking' },
    { bookingId },
    { bookingId, attemptId, providerUrl: 'https://evil.example/query' },
    { bookingId, attemptId, amountVnd: 1 },
    [{ bookingId, attemptId }],
    null,
  ])('rejects malformed or extra input fields without contacting a provider (%j)', async (body) => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const response = await relayVnpayQuery(request(body), { fetch, backendOrigin });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON before requesting a signed query', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const input = new Request('https://wedding.example/api/payments/reconcile', {
      method: 'POST',
      headers: { Authorization: bearer, 'Content-Type': 'application/json' },
      body: '{broken',
    });
    expect((await relayVnpayQuery(input, { fetch, backendOrigin })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the server-signed query at the fixed sandbox URL, then submits unchanged evidence for backend verification', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(query())
      .mockResolvedValueOnce(Response.json(providerResponse))
      .mockResolvedValueOnce(Response.json({ data: attempt }));
    const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: attempt });
    const upstream = calls(fetch);
    expect(upstream).toHaveLength(3);
    expect(upstream[0]!.url).toBe(`${attemptPath}/query`);
    expect(upstream[0]!.method).toBe('GET');
    expect(upstream[0]!.headers.get('Authorization')).toBe(bearer);
    expect(upstream[1]!.url).toBe(providerUrl);
    expect(upstream[1]!.method).toBe('POST');
    expect(await upstream[1]!.json()).toEqual(signedRequest);
    expect(upstream[1]!.headers.get('Authorization')).toBeNull();
    expect(upstream[1]!.headers.get('Cookie')).toBeNull();
    expect(['error', 'manual']).toContain(upstream[1]!.redirect);
    expect(upstream[2]!.url).toBe(`${attemptPath}/evidence`);
    expect(upstream[2]!.method).toBe('POST');
    expect(upstream[2]!.headers.get('Authorization')).toBe(bearer);
    expect(await upstream[2]!.json()).toEqual({ response: providerResponse });
    expect(upstream.every((input) => input.cache === 'no-store')).toBe(true);
  });

  it('reads the authoritative backend detail when no provider query is needed', async () => {
    const terminal = { ...attempt, status: 'SUCCEEDED', applicationStatus: 'SUCCEEDED' };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json({ data: { request: null } }))
      .mockResolvedValueOnce(Response.json({ data: terminal }));
    const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: terminal });
    const upstream = calls(fetch);
    expect(upstream.map((input) => input.url)).toEqual([`${attemptPath}/query`, attemptPath]);
    expect(upstream.every((input) => input.method === 'GET')).toBe(true);
    expect(upstream.every((input) => input.headers.get('Authorization') === bearer)).toBe(true);
  });

  it.each(['query', 'evidence', 'detail'] as const)(
    'preserves backend API errors from %s instead of treating them as payment success',
    async (stage) => {
      const error = {
        error: {
          code: stage === 'query' ? 'BOOKING_NOT_FOUND' : 'PAYMENT_EVIDENCE_INVALID',
          message: 'Backend rejected the request',
          requestId: '11ab3df2-291b-4aef-91a5-b50cd2d95482',
        },
      };
      const status = stage === 'query' ? 404 : 409;
      const fetch = vi.fn<typeof globalThis.fetch>();
      if (stage === 'evidence')
        fetch.mockResolvedValueOnce(query()).mockResolvedValueOnce(Response.json(providerResponse));
      else if (stage === 'detail')
        fetch.mockResolvedValueOnce(Response.json({ data: { request: null } }));
      fetch.mockResolvedValueOnce(Response.json(error, { status }));
      const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(error);
      expect(fetch).toHaveBeenCalledTimes(stage === 'query' ? 1 : stage === 'detail' ? 2 : 3);
    },
  );

  it.each([
    () => Response.json({ message: 'unavailable' }, { status: 503 }),
    () => Response.redirect('https://evil.example/query', 302),
    () => new Response('<html>provider unavailable</html>', { status: 200 }),
    () => Response.json(null),
    () => Response.json({ vnp_ResponseCode: 0 }),
  ])(
    'leaves the payment unresolved when the provider fails or returns invalid evidence (%#)',
    async (provider) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(query());
      fetch.mockResolvedValueOnce(provider());
      const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
      expect(response.status).toBe(503);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(calls(fetch).some((input) => input.url.endsWith('/evidence'))).toBe(false);
    },
  );

  it('keeps network failure unresolved without posting evidence', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(query())
      .mockRejectedValueOnce(new Error('Provider connection closed'));
    const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([{}, { data: {} }, { data: { request: [] } }, { data: { request: { value: 1 } } }])(
    'fails closed on malformed signed-query data (%j)',
    async (body) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(Response.json(body));
      const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
      expect(response.status).toBe(503);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects a provider body larger than 16 KB before reading its remaining stream', async () => {
    const cancel = vi.fn();
    let reads = 0;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++;
          if (reads === 1) controller.enqueue(new TextEncoder().encode('x'.repeat(16 * 1024 + 1)));
          else controller.close();
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(query())
      .mockResolvedValueOnce(
        new Response(body, { headers: { 'Content-Type': 'application/json' } }),
      );
    const response = await relayVnpayQuery(request(), { fetch, backendOrigin });
    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reads).toBe(1);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
