import type { ApiBody, ApiData } from '../../lib/api/types';
import { fetchPrivateFile } from '../../lib/api/download';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

export type CoupleProfile = ApiData<'/consultations/{consultationId}/couple-profile', 'get'>;
export type ContractList = ApiData<'/bookings/{bookingId}/contracts', 'get'>;
export type ContractRevision = ContractList['revisions'][number];
export type ContractLine = ContractRevision['document']['lines'][number];
export type ContractLineInput = ApiBody<'/bookings/{bookingId}/contracts', 'post'>['lines'][number];
export type ContractCommandResult = ApiData<'/bookings/{bookingId}/contracts', 'post'>;
export type MenuPackage = ApiData<'/catalog/menu-packages', 'get'>['items'][number];
export type ServiceOffering = ApiData<'/catalog/services', 'get'>['items'][number];
export type PrintOffering = ApiData<'/catalog/print-offerings', 'get'>['items'][number];

export type Catalog = Readonly<{
  menus: readonly MenuPackage[];
  services: readonly ServiceOffering[];
  prints: readonly PrintOffering[];
}>;

const idem = (key: string) => ({ 'Idempotency-Key': key });

/**
 * Gateway cho hồ sơ cặp đôi và hợp đồng thương mại.
 * Mọi lệnh ghi nhận `expectedRevision` = revision của **Booking** (không phải số revision hợp đồng).
 */
export const contractApi = {
  async profile(token: string, consultationId: string) {
    return unwrap<CoupleProfile>(
      await coupleApi().GET('/consultations/{consultationId}/couple-profile', {
        headers: bearer(token),
        params: { path: { consultationId } },
        cache: 'no-store',
      }),
    );
  },
  async updateProfile(
    token: string,
    key: string,
    consultationId: string,
    body: ApiBody<'/consultations/{consultationId}/couple-profile', 'patch'>,
  ) {
    return unwrap<CoupleProfile>(
      await coupleApi().PATCH('/consultations/{consultationId}/couple-profile', {
        headers: bearer(token),
        params: { path: { consultationId }, header: idem(key) },
        body,
      }),
    );
  },
  async list(token: string, bookingId: string) {
    return unwrap<ContractList>(
      await coupleApi().GET('/bookings/{bookingId}/contracts', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
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
    return unwrap<ContractCommandResult>(
      await coupleApi().POST('/bookings/{bookingId}/contracts/{revisionId}/approvals', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
  async withdraw(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    reason: string,
  ) {
    return unwrap<ContractCommandResult>(
      await coupleApi().POST('/bookings/{bookingId}/contracts/{revisionId}/withdrawals', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision, reason },
      }),
    );
  },
  async requestChanges(
    token: string,
    key: string,
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    reason: string,
  ) {
    return unwrap<ContractCommandResult>(
      await coupleApi().POST('/bookings/{bookingId}/contracts/{revisionId}/change-requests', {
        headers: bearer(token),
        params: { path: { bookingId, revisionId }, header: idem(key) },
        body: { expectedRevision, reason },
      }),
    );
  },
  pdf(
    token: string,
    bookingId: string,
    revisionId: string,
    layout: 'retained' | 'readable' = 'retained',
  ) {
    return fetchPrivateFile(
      `/bookings/${encodeURIComponent(bookingId)}/contracts/${encodeURIComponent(revisionId)}/pdf?layout=${layout}`,
      token,
    );
  },
  /** Hợp đồng ban đầu chỉ chọn menu và dịch vụ; in thiệp qua phụ lục sau đặt cọc. */
  async catalog(token: string): Promise<Catalog> {
    const [menus, services] = await Promise.all([
      coupleApi()
        .GET('/catalog/menu-packages', { params: { query: { limit: 50 } } })
        .then((response) => unwrap<ApiData<'/catalog/menu-packages', 'get'>>(response).items),
      coupleApi()
        .GET('/catalog/services', { headers: bearer(token), params: { query: { limit: 50 } } })
        .then((response) => unwrap<ApiData<'/catalog/services', 'get'>>(response).items),
    ]);
    return {
      menus,
      services: services.filter((item) => item.active),
      prints: [],
    };
  },
};

/** Revision hợp đồng hiện tại (bản mà hai bên đang làm việc). */
export function currentRevision(list: ContractList): ContractRevision | null {
  return list.revisions.find((revision) => revision.revisionId === list.currentRevisionId) ?? null;
}
