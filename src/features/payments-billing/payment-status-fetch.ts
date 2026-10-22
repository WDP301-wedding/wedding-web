// The web server can reach sandbox querydr when the API host's outbound route cannot.
// The API still authorizes the order and verifies every provider signature.
export function paymentStatusFetch(request: Request): Promise<Response> {
  const match = new URL(request.url).pathname.match(
    /\/bookings\/([\da-f-]{36})\/payments\/([\da-f-]{36})$/i,
  );
  if (typeof window !== 'undefined' && request.method === 'GET' && match) {
    return globalThis.fetch(
      new Request(new URL('/api/payments/reconcile', window.location.origin), {
        method: 'POST',
        headers: {
          Authorization: request.headers.get('authorization') ?? '',
          'Content-Type': 'application/json',
          'x-request-id': request.headers.get('x-request-id') ?? crypto.randomUUID(),
        },
        body: JSON.stringify({
          bookingId: match[1],
          attemptId: match[2],
          ...(new URL(request.url).searchParams.get('reconcile') === 'false'
            ? { check: false }
            : {}),
        }),
        cache: 'no-store',
        redirect: 'error',
        signal: request.signal,
      }),
    );
  }
  return globalThis.fetch(request);
}
