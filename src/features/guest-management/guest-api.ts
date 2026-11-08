import type { ApiBody, ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';
import { localizeGroup } from './group-labels';

export type GuestGroup = ApiData<'/bookings/{bookingId}/guest-groups', 'get'>[number];
export type GuestPlan = ApiData<'/bookings/{bookingId}/guest-plan', 'get'>;
const idem = (key: string) => ({ 'Idempotency-Key': key });

export const guestApi = {
  /** Lần đọc đầu tiên backend tự khởi tạo 4 nhóm mặc định. */
  async groups(token: string, bookingId: string) {
    const groups = unwrap<GuestGroup[]>(
      await coupleApi().GET('/bookings/{bookingId}/guest-groups', {
        headers: bearer(token),
        params: { path: { bookingId } },
        cache: 'no-store',
      }),
    );
    return groups.map(localizeGroup);
  },
  async createGroup(
    token: string,
    key: string,
    bookingId: string,
    body: ApiBody<'/bookings/{bookingId}/guest-groups', 'post'>,
  ) {
    return localizeGroup(
      unwrap<GuestGroup>(
        await coupleApi().POST('/bookings/{bookingId}/guest-groups', {
          headers: bearer(token),
          params: { path: { bookingId }, header: idem(key) },
          body,
        }),
      ),
    );
  },
  async updateGroup(
    token: string,
    key: string,
    bookingId: string,
    groupId: string,
    body: ApiBody<'/bookings/{bookingId}/guest-groups/{groupId}', 'patch'>,
  ) {
    return localizeGroup(
      unwrap<GuestGroup>(
        await coupleApi().PATCH('/bookings/{bookingId}/guest-groups/{groupId}', {
          headers: bearer(token),
          params: { path: { bookingId, groupId }, header: idem(key) },
          body,
        }),
      ),
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
};
