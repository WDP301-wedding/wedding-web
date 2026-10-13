import type { ApiBody, ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';
import type { ImportRow } from './guest-csv';

export type GuestGroup = ApiData<'/bookings/{bookingId}/guest-groups', 'get'>[number];
export type GuestPlan = ApiData<'/bookings/{bookingId}/guest-plan', 'get'>;
export type GuestPage = ApiData<'/bookings/{bookingId}/guests', 'get'>;
export type Guest = GuestPage['items'][number];
export type ImportPreview = ApiData<'/bookings/{bookingId}/guests/import-previews', 'post'>;
export type PersonalLink = ApiData<
  '/bookings/{bookingId}/guests/{guestId}/personalized-invitations',
  'post'
>;
export type CheckInSettings = ApiData<'/bookings/{bookingId}/check-in-settings', 'get'>;
export type AttendanceSummary = ApiData<'/bookings/{bookingId}/attendance-summary', 'get'>;

const idem = (key: string) => ({ 'Idempotency-Key': key });

export const guestApi = {
  /** Lần đọc đầu tiên backend tự khởi tạo 4 nhóm mặc định. */
  async groups(token: string, bookingId: string) {
    return unwrap<GuestGroup[]>(
      await coupleApi().GET('/bookings/{bookingId}/guest-groups', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async createGroup(
    token: string,
    key: string,
    bookingId: string,
    body: ApiBody<'/bookings/{bookingId}/guest-groups', 'post'>,
  ) {
    return unwrap<GuestGroup>(
      await coupleApi().POST('/bookings/{bookingId}/guest-groups', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body,
      }),
    );
  },
  async updateGroup(
    token: string,
    key: string,
    bookingId: string,
    groupId: string,
    body: ApiBody<'/bookings/{bookingId}/guest-groups/{groupId}', 'patch'>,
  ) {
    return unwrap<GuestGroup>(
      await coupleApi().PATCH('/bookings/{bookingId}/guest-groups/{groupId}', {
        headers: bearer(token),
        params: { path: { bookingId, groupId }, header: idem(key) },
        body,
      }),
    );
  },
  async plan(token: string, bookingId: string) {
    return unwrap<GuestPlan>(
      await coupleApi().GET('/bookings/{bookingId}/guest-plan', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async updatePlan(
    token: string,
    key: string,
    bookingId: string,
    expectedRevision: number,
    planningHeadcount: number,
  ) {
    return unwrap<GuestPlan>(
      await coupleApi().PATCH('/bookings/{bookingId}/guest-plan', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body: { expectedRevision, planningHeadcount },
      }),
    );
  },
  async guests(
    token: string,
    bookingId: string,
    query: { cursor?: string; guestGroupId?: string; status?: 'ACTIVE' | 'ARCHIVED' },
  ) {
    return unwrap<GuestPage>(
      await coupleApi().GET('/bookings/{bookingId}/guests', {
        headers: bearer(token),
        params: { path: { bookingId }, query: { limit: 50, ...query } },
        cache: 'no-store',
      }),
    );
  },
  async createGuest(
    token: string,
    key: string,
    bookingId: string,
    body: ApiBody<'/bookings/{bookingId}/guests', 'post'>,
  ) {
    return unwrap<Guest>(
      await coupleApi().POST('/bookings/{bookingId}/guests', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body,
      }),
    );
  },
  async updateGuest(
    token: string,
    key: string,
    bookingId: string,
    guestId: string,
    body: ApiBody<'/bookings/{bookingId}/guests/{guestId}', 'patch'>,
  ) {
    return unwrap<Guest>(
      await coupleApi().PATCH('/bookings/{bookingId}/guests/{guestId}', {
        headers: bearer(token),
        params: { path: { bookingId, guestId }, header: idem(key) },
        body,
      }),
    );
  },
  async previewImport(
    token: string,
    key: string,
    bookingId: string,
    rows: ImportRow[],
    allowUpdates: boolean,
  ) {
    return unwrap<ImportPreview>(
      await coupleApi().POST('/bookings/{bookingId}/guests/import-previews', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body: { rows, allowUpdates },
      }),
    );
  },
  async commitImport(
    token: string,
    key: string,
    bookingId: string,
    previewId: string,
    digest: string,
  ) {
    return unwrap<ApiData<'/bookings/{bookingId}/guests/imports', 'post'>>(
      await coupleApi().POST('/bookings/{bookingId}/guests/imports', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body: { previewId, digest },
      }),
    );
  },
  async issueLink(
    token: string,
    key: string,
    bookingId: string,
    guestId: string,
    expectedRevision: number,
  ) {
    return unwrap<PersonalLink>(
      await coupleApi().POST('/bookings/{bookingId}/guests/{guestId}/personalized-invitations', {
        headers: bearer(token),
        params: { path: { bookingId, guestId }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
  async deliverLink(
    token: string,
    key: string,
    bookingId: string,
    guestId: string,
    expectedRevision: number,
    intendedEmail: string,
  ) {
    return unwrap<ApiData<'/bookings/{bookingId}/guests/{guestId}/delivery', 'post'>>(
      await coupleApi().POST('/bookings/{bookingId}/guests/{guestId}/delivery', {
        headers: bearer(token),
        params: { path: { bookingId, guestId }, header: idem(key) },
        body: { expectedRevision, intendedEmail },
      }),
    );
  },
  async checkInSettings(token: string, bookingId: string) {
    return unwrap<CheckInSettings>(
      await coupleApi().GET('/bookings/{bookingId}/check-in-settings', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
  async updateCheckInSettings(
    token: string,
    key: string,
    bookingId: string,
    checkInMode: CheckInSettings['checkInMode'],
    expectedRevision: number,
  ) {
    return unwrap<CheckInSettings>(
      await coupleApi().PATCH('/bookings/{bookingId}/check-in-settings', {
        headers: bearer(token),
        params: { path: { bookingId }, header: idem(key) },
        body: { checkInMode, expectedRevision },
      }),
    );
  },
  async attendance(token: string, bookingId: string) {
    return unwrap<AttendanceSummary>(
      await coupleApi().GET('/bookings/{bookingId}/attendance-summary', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
  },
};

/**
 * Revision của link thiệp cá nhân không đọc được qua API (chỉ trả về khi cấp). Ta lưu tạm ở
 * trình duyệt; nếu sai, backend trả GUEST_INVITATION_REVISION_STALE (không thay đổi dữ liệu)
 * và ta thử revision tiếp theo.
 */
const linkRevisionKey = (bookingId: string) => `wedding.guestLinkRevisions.${bookingId}`;
export function readLinkRevision(bookingId: string, guestId: string): number {
  try {
    const map = JSON.parse(localStorage.getItem(linkRevisionKey(bookingId)) ?? '{}') as Record<
      string,
      number
    >;
    return Number.isSafeInteger(map[guestId]) ? map[guestId]! : 0;
  } catch {
    return 0;
  }
}
export function rememberLinkRevision(bookingId: string, guestId: string, revision: number): void {
  try {
    const map = JSON.parse(localStorage.getItem(linkRevisionKey(bookingId)) ?? '{}') as Record<
      string,
      number
    >;
    map[guestId] = revision;
    localStorage.setItem(linkRevisionKey(bookingId), JSON.stringify(map));
  } catch {
    // Không lưu được: lần sau sẽ dò lại từ 0.
  }
}
