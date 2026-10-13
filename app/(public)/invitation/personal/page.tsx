'use client';

import { useEffect, useState } from 'react';

import { ApiClientError, createApiClient } from '@/src/lib/api/client';
import { readPublicEnv } from '@/src/lib/env';
import type { ApiData } from '@/src/lib/api/types';
import { PublicInvitationView } from '@/src/features/invitation-studio/public-invitation-view';

type GuestView = ApiData<'/guest/invitation', 'get'>;
type State =
  | { status: 'loading' }
  | { status: 'ready'; view: GuestView }
  | { status: 'unavailable' }
  | { status: 'rate-limited'; retryAfter: number | null }
  | { status: 'error' };

/**
 * Thiệp cá nhân của khách mời: `/invitation/personal#credential=wgc_...`
 *
 * Bảo mật (theo hand-off backend):
 * - Mã nằm trong `#fragment` nên KHÔNG được gửi lên server, không lọt vào log hay analytics.
 *   Ta đọc xong là xoá khỏi thanh địa chỉ ngay.
 * - Đổi mã lấy "capability" `wgs_...` sống tối đa 15 phút, rồi dùng nó làm Bearer để đọc thiệp.
 * - Mọi lỗi (sai, hết hạn, bị thu hồi) đều hiển thị chung "liên kết không khả dụng", không tiết lộ lý do.
 * - Trang chỉ đọc: không có xác nhận tham dự (RSVP) và không có check-in.
 */
export default function PersonalInvitationPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const credential = new URLSearchParams(window.location.hash.slice(1)).get('credential');
    window.history.replaceState(null, '', window.location.pathname);
    if (!credential || !/^wgc_[A-Za-z0-9_-]+$/.test(credential)) {
      queueMicrotask(() => setState({ status: 'unavailable' }));
      return;
    }
    let active = true;
    const api = createApiClient();
    (async () => {
      const session = await api.POST('/guest/invitation-sessions', { body: { credential } });
      const capability = (session.data as { data?: { capability?: string } } | undefined)?.data
        ?.capability;
      if (!capability) throw new Error('missing capability');
      const response = await api.GET('/guest/invitation', {
        headers: { Authorization: `Bearer ${capability}` },
        cache: 'no-store',
      });
      const view = (response.data as { data?: GuestView } | undefined)?.data;
      if (!view) throw new Error('missing invitation');
      return view;
    })()
      .then((view) => {
        if (active) setState({ status: 'ready', view });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 429)
          setState({ status: 'rate-limited', retryAfter: error.retryAfterSeconds ?? null });
        else if (
          error instanceof ApiClientError &&
          (error.status === 404 || error.status === 401 || error.status === 422)
        )
          setState({ status: 'unavailable' });
        else setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'ready') {
    return (
      <PublicInvitationView
        invitation={state.view.invitation}
        apiBase={readPublicEnv().NEXT_PUBLIC_API_BASE_URL}
        recipientGreeting={state.view.recipientGreeting}
      />
    );
  }

  const messages: Record<Exclude<State['status'], 'ready'>, string> = {
    loading: 'Đang mở thiệp mời…',
    unavailable:
      'Liên kết thiệp không khả dụng. Liên kết có thể đã hết hạn hoặc đã được thay bằng liên kết mới — hãy liên hệ cô dâu chú rể.',
    'rate-limited': 'Bạn mở liên kết quá nhiều lần. Vui lòng thử lại sau ít phút.',
    error: 'Chưa mở được thiệp do lỗi kết nối. Vui lòng tải lại trang.',
  };
  return (
    <main
      className="public-section"
      style={{ maxWidth: 560, margin: '80px auto', padding: '0 16px', textAlign: 'center' }}
    >
      <h1>Thiệp mời</h1>
      <p role={state.status === 'loading' ? 'status' : 'alert'}>{messages[state.status]}</p>
    </main>
  );
}
