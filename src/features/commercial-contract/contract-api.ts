import { z } from 'zod';
import { customerSelectionSchema, selectionLineSchema } from './selection-wire';
import type { ApiBody, ApiData } from '../../lib/api/types';
import { fetchPrivateFile } from '../../lib/api/download';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

export type CoupleProfile = ApiData<'/consultations/{consultationId}/couple-profile', 'get'>;
const capabilityEnvelope = z.object({
  customerSelection: customerSelectionSchema.optional(),
  draftSeed: z.array(selectionLineSchema).optional(),
  capabilities: z
    .object({
      canManageDraft: z.boolean(),
      canEditSelections: z.boolean().optional(),
      canApprove: z.boolean(),
      canWithdrawApproval: z.boolean(),
    })
    .optional(),
});
export type ContractList = ApiData<'/bookings/{bookingId}/contracts', 'get'> &
  z.infer<typeof capabilityEnvelope>;
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
    const data = unwrap<ContractList>(
      await coupleApi().GET('/bookings/{bookingId}/contracts', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
    return { ...data, ...capabilityEnvelope.parse(data) };
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
  pdf(token: string, bookingId: string, revisionId: string) {
    return fetchPrivateFile(
      `/bookings/${encodeURIComponent(bookingId)}/contracts/${encodeURIComponent(revisionId)}/pdf`,
      token,
    );
  },
  /** Danh mục đang bán để chọn vào hợp đồng (menu công khai; dịch vụ và mẫu in cần đăng nhập). */
  async catalog(token: string): Promise<Catalog> {
    const [menus, services, prints] = await Promise.all([
      coupleApi()
        .GET('/catalog/menu-packages', { params: { query: { limit: 50 } } })
        .then((response) => unwrap<ApiData<'/catalog/menu-packages', 'get'>>(response).items),
      coupleApi()
        .GET('/catalog/services', { headers: bearer(token), params: { query: { limit: 50 } } })
        .then((response) => unwrap<ApiData<'/catalog/services', 'get'>>(response).items),
      coupleApi()
        .GET('/catalog/print-offerings', {
          headers: bearer(token),
          params: { query: { limit: 50 } },
        })
        .then((response) => unwrap<ApiData<'/catalog/print-offerings', 'get'>>(response).items),
    ]);
    return {
      menus,
      services: services.filter((item) => item.active),
      prints: prints.filter((item) => item.active),
    };
  },
};

/** Revision hợp đồng hiện tại (bản mà hai bên đang làm việc). */
export function currentRevision(list: ContractList): ContractRevision | null {
  return list.revisions.find((revision) => revision.revisionId === list.currentRevisionId) ?? null;
}
