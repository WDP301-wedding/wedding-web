import { z } from 'zod';

const inputSchema = z.strictObject({
  bookingId: z.uuid(),
  attemptId: z.uuid(),
  check: z.literal(false).optional(),
});
const fields = z.record(z.string().max(64), z.string().max(512));
const querySchema = z.strictObject({ data: z.strictObject({ request: fields.nullable() }) });
const providerUrl = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
const noStore = { 'Cache-Control': 'no-store' };

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Missing provider body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 16_384) {
        await reader.cancel();
        throw new Error('Provider response limit');
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

/** Transport only. The backend owns authorization, HMAC verification and ledger writes. */
export async function relayVnpayQuery(
  request: Request,
  options: Readonly<{ fetch: typeof fetch; backendOrigin: string }>,
): Promise<Response> {
  const requestId =
    z.uuid().safeParse(request.headers.get('x-request-id')).data ?? crypto.randomUUID();
  const error = (status: number, code: string, message: string) =>
    Response.json({ error: { code, message, requestId } }, { status, headers: noStore });
  const authorization = request.headers.get('authorization');
  if (!authorization || !/^Bearer \S+$/i.test(authorization))
    return error(401, 'UNAUTHENTICATED', 'Please sign in to check payment status.');
  let input: z.infer<typeof inputSchema>;
  try {
    if (Number(request.headers.get('content-length')) > 1024) throw new Error('Input limit');
    const text = await request.text();
    if (text.length > 1024) throw new Error('Input limit');
    input = inputSchema.parse(JSON.parse(text));
  } catch {
    return error(400, 'VALIDATION_ERROR', 'A booking and payment attempt are required.');
  }
  const base = options.backendOrigin.replace(/\/+$/, '');
  const path = `${base}/bookings/${input.bookingId}/payments/${input.attemptId}`;
  const headers = { Authorization: authorization, 'x-request-id': requestId };
  const backend = (url: string, body?: unknown) =>
    options.fetch(url, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...headers,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
    });
  const forward = async (response: Response) =>
    Response.json(await boundedJson(response), {
      status: response.status,
      headers: {
        ...noStore,
        ...(response.headers.has('retry-after')
          ? { 'Retry-After': response.headers.get('retry-after')! }
          : {}),
      },
    });
  try {
    if (input.check === false) return await forward(await backend(`${path}?reconcile=false`));
    const prepared = await backend(`${path}/query`);
    if (prepared.status === 429) {
      const response = await forward(await backend(`${path}?reconcile=false`));
      response.headers.set('Retry-After', prepared.headers.get('retry-after') ?? '305');
      return response;
    }
    if (!prepared.ok) return await forward(prepared);
    const query = querySchema.parse(await boundedJson(prepared)).data.request;
    if (query === null) return await forward(await backend(path));
    if (query.vnp_Command !== 'querydr' || query.vnp_Version !== '2.1.0')
      throw new Error('Invalid provider command');
    // Credentials belong only on backend calls; VNPay receives its signed query only.
    const provider = await options.fetch(providerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
    });
    if (!provider.ok) throw new Error('Provider unavailable');
    const response = fields.parse(await boundedJson(provider));
    return await forward(await backend(`${path}/evidence`, { response }));
  } catch {
    return error(
      503,
      'PAYMENT_PROVIDER_UNAVAILABLE',
      'Payment status could not be verified. Please try again later.',
    );
  }
}
