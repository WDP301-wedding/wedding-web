import type { ApiBody, ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';
import type { ContractLine, ContractList } from './contract-api';

export type AppendixList = ApiData<'/bookings/{bookingId}/contract-appendices', 'get'>;
export type Appendix = AppendixList['revisions'][number];
export type AppendixResult = ApiData<'/bookings/{bookingId}/contract-appendices', 'post'>;

const idem = (key: string) => ({ 'Idempotency-Key': key });

export const appendixApi = {
  async list(token: string, bookingId: string) {
    return unwrap<AppendixList>(
      await coupleApi().GET('/bookings/{bookingId}/contract-appendices', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async create(
    token: string,
    key: string,
    bookingId: string,
    body: ApiBody<'/bookings/{bookingId}/contract-appendices', 'post'>,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body,
      }),
    );
  },
  async submit(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices/{revisionId}/submissions', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
  async approve(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
  ) {
    return unwrap<AppendixResult>(
      await coupleApi().POST('/bookings/{bookingId}/contract-appendices/{revisionId}/approvals', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
};

export const appendixStateLabels: Record<Appendix['state'], string> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Chờ hai bên duyệt',
  APPROVED: 'Đã duyệt',
  SUPERSEDED: 'Đã được thay thế',
};

/** Các dòng của thoả thuận đang hiệu lực: phụ lục đã duyệt gần nhất, hoặc hợp đồng gốc. */
export function effectiveLines(
  appendices: AppendixList,
  contracts: ContractList,
): readonly ContractLine[] {
  const appendix = appendices.revisions.find(
    (revision) => revision.revisionId === appendices.effectiveRevisionId,
  );
  if (appendix) return appendix.document.afterLines;
  const contract = contracts.revisions.find(
    (revision) => revision.revisionId === appendices.effectiveRevisionId,
  );
  return contract?.document.lines ?? [];
}
