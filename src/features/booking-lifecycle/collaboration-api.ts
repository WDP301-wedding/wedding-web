import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { installCommandRetries } from './command-retries';

export type ProposalView = components['schemas']['BookingProposalResponse']['data'];
export type TimelineItemInput = components['schemas']['TimelineRevisionBody']['items'][number];

type TimelineInput = Readonly<{
  bookingId: string;
  expectedRevision: number;
  predecessorRevisionId: string | null;
  items: readonly TimelineItemInput[];
}>;

export interface CollaborationGateway {
  load(this: void, accessToken: string, bookingId: string): Promise<ProposalView>;
  saveTimeline(this: void, accessToken: string, input: TimelineInput): Promise<void>;
  approve(
    this: void,
    accessToken: string,
    input: Readonly<{ bookingId: string; revisionId: string; expectedRevision: number }>,
  ): Promise<void>;
  withdraw(
    this: void,
    accessToken: string,
    input: Readonly<{
      bookingId: string;
      revisionId: string;
      expectedRevision: number;
      reason: string;
    }>,
  ): Promise<void>;
  requestChange(
    this: void,
    accessToken: string,
    input: TimelineInput & Readonly<{ reason: string }>,
  ): Promise<void>;
  requestCancellation(
    this: void,
    accessToken: string,
    input: Readonly<{ bookingId: string; expectedRevision: number; reason: string }>,
  ): Promise<void>;
}

function intent(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
}

export function createCollaborationGateway(client?: ApiClient): CollaborationGateway {
  let resolved = client === undefined ? undefined : installCommandRetries(client);
  const api = () => (resolved ??= installCommandRetries(createApiClient()));
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  const commandParams = <T extends Record<string, string>>(scope: string, path: T) => ({
    header: { 'Idempotency-Key': intent(scope) },
    path,
  });
  const timelineBody = (input: TimelineInput) => ({
    expectedRevision: input.expectedRevision,
    predecessorRevisionId: input.predecessorRevisionId,
    items: input.items,
  });

  return {
    async load(accessToken, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        params: { path: { bookingId } },
        headers: headers(accessToken),
      });
      const value = required(data).data;
      const { cancellationRequests, ...proposalValue } = value;
      return {
        ...proposalValue,
        proposal: { ...value.proposal, menus: Array.from(value.proposal.menus) },
        ...(cancellationRequests === undefined
          ? {}
          : { cancellationRequests: Array.from(cancellationRequests) }),
        timeline:
          value.timeline === null
            ? null
            : { ...value.timeline, items: Array.from(value.timeline.items) },
        effectiveTimeline:
          value.effectiveTimeline === null
            ? null
            : { ...value.effectiveTimeline, items: Array.from(value.effectiveTimeline.items) },
      };
    },
    async saveTimeline(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions', {
        params: commandParams('timeline', { bookingId: input.bookingId }),
        headers: headers(accessToken),
        body: timelineBody(input),
      });
    },
    async approve(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals', {
        params: commandParams('approval', {
          bookingId: input.bookingId,
          revisionId: input.revisionId,
        }),
        headers: headers(accessToken),
        body: { expectedRevision: input.expectedRevision },
      });
    },
    async withdraw(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/withdrawals', {
        params: commandParams('withdrawal', {
          bookingId: input.bookingId,
          revisionId: input.revisionId,
        }),
        headers: headers(accessToken),
        body: { expectedRevision: input.expectedRevision, reason: input.reason },
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
        headers: headers(accessToken),
        body: { expectedRevision: input.expectedRevision, reason: input.reason },
      });
    },
  };
}
