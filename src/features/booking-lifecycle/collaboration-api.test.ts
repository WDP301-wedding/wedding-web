import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createCollaborationGateway } from './collaboration-api';

const token = 'test-token';
const bookingId = 'booking';
const revisionId = 'timeline';
const timeline = {
  bookingId,
  expectedRevision: 7,
  predecessorRevisionId: revisionId,
  items: [{ order: 0, startTime: '18:00', title: 'Welcome' }],
};
function response(data: unknown): Promise<Response> {
  return Promise.resolve(Response.json({ data }));
}
function harness(data: unknown = {}) {
  const requests: Request[] = [];
  const fetch = vi.fn((request: Request) => {
    requests.push(request.clone());
    return response(data);
  });
  const client = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', fetch });
  return { requests, fetch, client };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('collaboration HTTP adapter', () => {
  // `proposal.menus` là mảng bắt buộc từ BE PR #65; adapter copy nó thành mảng thật.
  const proposal = { menus: [{ name: 'Mùa Thu', tableCount: 20 }] };
  it.each([
    { proposal, timeline: null, effectiveTimeline: null },
    {
      proposal,
      timeline: { items: [{ title: 'Draft' }] },
      effectiveTimeline: { items: [{ title: 'Effective' }] },
      cancellationRequests: [{ requestId: 'request' }],
    },
  ])('preserves server timeline and cancellation data: %j', async (data) => {
    const h = harness(data);
    const gateway = createCollaborationGateway(h.client);
    expect(await gateway.load(token, bookingId)).toEqual(data);
    expect(h.requests[0]?.url).toBe('http://localhost:4000/api/v1/bookings/booking/proposal');
    expect(h.requests[0]?.headers.get('Authorization')).toBe('Bearer test-token');
  });
  it('rejects a response without proposal data', async () => {
    const h = harness();
    h.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(createCollaborationGateway(h.client).load(token, bookingId)).rejects.toThrow(
      'Thiếu dữ liệu',
    );
  });
  it('creates and reuses the default client lazily', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000/api/v1');
    const fetch = vi.fn(() =>
      response({ proposal: { menus: [] }, timeline: null, effectiveTimeline: null }),
    );
    vi.stubGlobal('fetch', fetch);
    const gateway = createCollaborationGateway();
    await gateway.load(token, bookingId);
    await gateway.load(token, bookingId);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('sends exact revisions, reasons and idempotency headers for every command', async () => {
    const h = harness();
    const gateway = createCollaborationGateway(h.client);
    await gateway.saveTimeline(token, timeline);
    await gateway.approve(token, { bookingId, revisionId, expectedRevision: 7 });
    await gateway.withdraw(token, {
      bookingId,
      revisionId,
      expectedRevision: 7,
      reason: 'Withdraw',
    });
    await gateway.requestChange(token, { ...timeline, reason: 'Change' });
    await gateway.requestCancellation(token, { bookingId, expectedRevision: 7, reason: 'Cancel' });
    const expected = [
      [
        'timeline-revisions',
        { expectedRevision: 7, predecessorRevisionId: revisionId, items: timeline.items },
      ],
      ['timeline-revisions/timeline/approvals', { expectedRevision: 7 }],
      ['timeline-revisions/timeline/withdrawals', { expectedRevision: 7, reason: 'Withdraw' }],
      ['change-requests', { expectedRevision: 7, items: timeline.items, reason: 'Change' }],
      ['cancellation-requests', { expectedRevision: 7, reason: 'Cancel' }],
    ] as const;
    for (const [index, [path, body]] of expected.entries()) {
      const sent = h.requests[index]!;
      expect(sent.url).toBe('http://localhost:4000/api/v1/bookings/booking/' + path);
      expect(sent.method).toBe('POST');
      expect(await sent.json()).toEqual(body);
      expect(sent.headers.get('Authorization')).toBe('Bearer test-token');
      expect(sent.headers.get('Idempotency-Key')).toMatch(/:[0-9a-f-]{36}$/);
    }
    expect(new Set(h.requests.map((r) => r.headers.get('Idempotency-Key'))).size).toBe(5);
  });
});
