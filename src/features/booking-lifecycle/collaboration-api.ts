import { createApiClient, type ApiClient } from '../../lib/api/client';

export type ProposalView = Readonly<{
  bookingId: string;
  consultationId: string;
  phase: 'DRAFT' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  revision: number;
  eventDate: string;
  planningHeadcount: number;
  proposal: Readonly<{
    hall: Readonly<{ id: string; name: string; description: string; maxGuests: number }>;
    shift: Readonly<{ code: 'LUNCH' | 'DINNER'; startTime: string; endTime: string }>;
    menu: Readonly<{ name: string; description: string; priceVndPerTable: number }>;
    tableCount: number;
    baseChargeVnd: number;
    depositAmountVnd: number;
  }>;
  timeline: null | Readonly<{
    revisionId: string;
    revisionNumber: number;
    predecessorRevisionId: string | null;
    managerApprovedAt: string | null;
    coupleApprovedAt: string | null;
    items: readonly Readonly<{
      itemId: string;
      order: number;
      startTime: string;
      title: string;
      description: string | null;
    }>[];
  }>;
  capabilities: Readonly<{
    accessLevel: 'RESTRICTED' | 'FULL';
    canEditTimeline: boolean;
    canApproveTimeline: boolean;
    canRequestCancellation: boolean;
  }>;
}>;

type TimelineInput = Readonly<{
  bookingId: string;
  expectedRevision: number;
  predecessorRevisionId: string | null;
  startTime: string;
  title: string;
  description?: string;
}>;

export interface CollaborationGateway {
  load(accessToken: string, bookingId: string): Promise<ProposalView>;
  saveTimeline(accessToken: string, input: TimelineInput): Promise<void>;
  approve(accessToken: string, input: Readonly<{ bookingId: string; revisionId: string; expectedRevision: number }>): Promise<void>;
  withdraw(accessToken: string, input: Readonly<{ bookingId: string; revisionId: string; expectedRevision: number; reason: string }>): Promise<void>;
  requestChange(accessToken: string, input: TimelineInput & Readonly<{ reason: string }>): Promise<void>;
  requestCancellation(accessToken: string, input: Readonly<{ bookingId: string; expectedRevision: number; reason: string }>): Promise<void>;
}

function intent(scope: string): string { return `${scope}:${crypto.randomUUID()}`; }
function required<T>(value: T | undefined): T { if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.'); return value; }
function readProposal(value: unknown): ProposalView {
  if (typeof value !== 'object' || value === null || !('bookingId' in value) || !('proposal' in value)) throw new Error('Đề xuất không hợp lệ.');
  return value as ProposalView;
}

export function createCollaborationGateway(client?: ApiClient): CollaborationGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  const commandParams = <T extends Record<string, string>>(scope: string, path: T) => ({
    header: { 'Idempotency-Key': intent(scope) }, path,
  });
  const timelineBody = (input: TimelineInput) => ({
    expectedRevision: input.expectedRevision,
    predecessorRevisionId: input.predecessorRevisionId,
    items: [{ order: 1, startTime: input.startTime, title: input.title, ...(input.description ? { description: input.description } : {}) }],
  });

  return {
    async load(accessToken, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', { params: { path: { bookingId } }, headers: headers(accessToken) });
      return readProposal(required(data).data);
    },
    async saveTimeline(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions', {
        params: commandParams('timeline', { bookingId: input.bookingId }),
        headers: headers(accessToken), body: timelineBody(input),
      });
    },
    async approve(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals', {
        params: commandParams('approval', { bookingId: input.bookingId, revisionId: input.revisionId }),
        headers: headers(accessToken), body: { expectedRevision: input.expectedRevision },
      });
    },
    async withdraw(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/withdrawals', {
        params: commandParams('withdrawal', { bookingId: input.bookingId, revisionId: input.revisionId }),
        headers: headers(accessToken), body: { expectedRevision: input.expectedRevision, reason: input.reason },
      });
    },
    async requestChange(accessToken, input) {
      const body = timelineBody(input);
      await api().POST('/bookings/{bookingId}/change-requests', {
        params: commandParams('change-request', { bookingId: input.bookingId }),
        headers: headers(accessToken),
        body: { expectedRevision: body.expectedRevision, items: body.items, reason: input.reason },
      });
    },
    async requestCancellation(accessToken, input) {
      await api().POST('/bookings/{bookingId}/cancellation-requests', {
        params: commandParams('cancellation-request', { bookingId: input.bookingId }),
        headers: headers(accessToken), body: { expectedRevision: input.expectedRevision, reason: input.reason },
      });
    },
  };
}
