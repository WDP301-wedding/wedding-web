import type { ApiData } from '../../lib/api/types';
import { bearer, coupleApi, unwrap } from '../couple-workspace/use-couple-workspace';

export type InboxPage = ApiData<'/notifications/inbox', 'get'>;
export type InboxItem = InboxPage['items'][number];
export type Preferences = ApiData<'/notifications/preferences', 'get'>;

export const notificationPageSize = 25;

const idem = (key: string) => ({ 'Idempotency-Key': key });

export const notificationApi = {
  async inbox(token: string, cursor?: string) {
    return unwrap<InboxPage>(
      await coupleApi().GET('/notifications/inbox', {
        headers: bearer(token),
        params: { query: { limit: notificationPageSize, ...(cursor ? { cursor } : {}) } },
        cache: 'no-store',
      }),
    );
  },
  async unreadCount(token: string) {
    return unwrap<ApiData<'/notifications/unread-count', 'get'>>(
      await coupleApi().GET('/notifications/unread-count', {
        headers: bearer(token),
        cache: 'no-store',
      }),
    ).count;
  },
  async markRead(token: string, key: string, id: string, expectedRevision: number) {
    return unwrap<ApiData<'/notifications/inbox/{id}/read', 'post'>>(
      await coupleApi().POST('/notifications/inbox/{id}/read', {
        headers: bearer(token),
        params: { path: { id }, header: idem(key) },
        body: { expectedRevision },
      }),
    );
  },
  /** Chỉ đánh dấu các thông báo tạo trước mốc này; thông báo đến sau vẫn chưa đọc. */
  async markAllRead(token: string, key: string, throughCreatedAt: string) {
    return unwrap<ApiData<'/notifications/inbox/read-all', 'post'>>(
      await coupleApi().POST('/notifications/inbox/read-all', {
        headers: bearer(token),
        params: { header: idem(key) },
        body: { throughCreatedAt },
      }),
    );
  },
  async preferences(token: string) {
    return unwrap<Preferences>(
      await coupleApi().GET('/notifications/preferences', {
        headers: bearer(token),
        cache: 'no-store',
      }),
    );
  },
  async updatePreferences(
    token: string,
    key: string,
    body: { expectedRevision: number; reminderEmail?: boolean; reminderPush?: boolean },
  ) {
    return unwrap<Preferences>(
      await coupleApi().PATCH('/notifications/preferences', {
        headers: bearer(token),
        params: { header: idem(key) },
        body,
      }),
    );
  },
};

/** Điều hướng khi bấm thông báo: dựa vào `purpose` + bookingId (backend chỉ trả tham chiếu tối thiểu). */
export function notificationHref(item: InboxItem): string | null {
  const bookingId = item.resource.bookingId;
  if (!bookingId) return null;
  const q = `?bookingId=${encodeURIComponent(bookingId)}`;
  switch (item.purpose) {
    case 'CONTRACT':
    case 'DEPOSIT_ELIGIBLE':
      return '/khong-gian/thoa-thuan/hop-dong' + q;
    case 'APPENDIX':
      return '/khong-gian/chuan-bi/phu-luc' + q;
    case 'PAYMENT':
    case 'REFUND':
      return '/khong-gian/thanh-toan' + q;
    case 'FINAL_INVOICE':
    case 'COMPLETION_NOTICE':
      return '/khong-gian/quyet-toan' + q;
    case 'PRINT':
      return '/khong-gian/chuan-bi/thiep' + q + '&tab=print';
    case 'PUBLICATION_CHANGED':
    case 'MEDIA_CUTOFF':
      return '/khong-gian/chuan-bi/thiep' + q;
    case 'GUEST_PLAN':
    case 'GUEST_INVITATION':
      return '/khong-gian/chuan-bi/khach' + q;
    case 'TIMELINE_REVIEW':
    case 'TIMELINE_CHANGED':
    case 'CANCELLATION_NOTICE':
      return '/khong-gian/thoa-thuan/kich-ban' + q;
    default:
      return '/khong-gian' + q;
  }
}
