'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { WorkspaceShell } from '../couple-workspace/workspace-shell';
import { routes } from '../../routes';
import { Skeleton } from '../../design-system/skeleton';
import { browserSession as session } from '../identity-access/browser-session';
import { ApiClientError } from '../../lib/api/client';
import { describeApiError } from '../../lib/api/api-errors';
import { createInvitationGateway, type DesignView } from './invitation-api';

/**
 * Studio thiệp (~1.500 dòng: trình biên tập, xuất bản, đặt in) được tách thành chunk riêng bằng
 * `next/dynamic` → không làm nặng các trang khác trong Không gian cưới.
 */
const InvitationStudioView = dynamic(
  () => import('./invitation-studio-view').then((mod) => mod.InvitationStudioView),
  { ssr: false, loading: () => <Skeleton label="Đang tải Studio thiệp…" /> },
);
const gateway = createInvitationGateway();

type StudioTab = 'design' | 'media' | 'publish' | 'print';

/**
 * Câu báo lỗi khi tải thiết kế. Hết giờ chờ tách riêng khỏi mất mạng: mạng vẫn ổn, máy chủ chậm,
 * nên không bảo người dùng kiểm tra mạng. Lỗi khác dùng câu chung (không in thông điệp tiếng Anh).
 */
function loadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.kind === 'timeout')
    return 'Máy chủ đang phản hồi chậm nên chưa tải được thiệp cưới. Vui lòng thử lại.';
  return describeApiError(error).message;
}

function parseTab(raw: string | null): StudioTab {
  if (raw === 'media' || raw === 'publish' || raw === 'print' || raw === 'design') {
    return raw;
  }
  return 'design';
}

/** Trang Thiệp & in (đọc `?bookingId` và `?tab` trên URL). Route: app/khong-gian/chuan-bi/thiep. */
export function CoupleInvitationsPage() {
  const searchParams = useSearchParams();
  const rawBookingId = searchParams.get('bookingId');
  const urlTab = searchParams.get('tab');

  const bookingId = rawBookingId;
  const initialTab = parseTab(urlTab);
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [prevUrlTab, setPrevUrlTab] = useState(urlTab);
  if (urlTab !== prevUrlTab) {
    setPrevUrlTab(urlTab);
    setTab(parseTab(urlTab));
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const currentUrlTab = new URLSearchParams(window.location.search).get('tab');
      setTab(parseTab(currentUrlTab));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const [state, setState] = useState<'loading' | 'authenticated' | 'anonymous'>(
    rawBookingId ? 'loading' : 'authenticated',
  );
  const [token, setToken] = useState<string | null>(null);
  const [designs, setDesigns] = useState<readonly DesignView[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Tăng lên khi bấm "Thử lại": chỉ tải lại thiết kế, không tải lại cả trang (đỡ tải cho máy chủ đang chậm).
  const [reloadKey, setReloadKey] = useState(0);

  const [prevBookingId, setPrevBookingId] = useState(rawBookingId);
  if (rawBookingId !== prevBookingId) {
    setPrevBookingId(rawBookingId);
    setState(rawBookingId ? 'loading' : 'authenticated');
    setError(null);
    setDesigns([]);
  }

  // Fetch data only when rawBookingId changes or on initial auth restore
  useEffect(() => {
    let active = true;
    if (!rawBookingId) {
      return;
    }

    void session
      .restore()
      .then(async (snapshot) => {
        if (!active) return;
        if (snapshot.status === 'anonymous' || snapshot.access !== 'full') {
          setState('anonymous');
        } else {
          try {
            const accessToken = await session.authorize((tok) => Promise.resolve(tok));
            if (!active) return;
            // Đơn in tải sau, khi mở tab "Đặt in" lần đầu (InvitationStudioView tự tải).
            const loadedDesigns = await gateway.listDesigns(accessToken, rawBookingId);
            if (!active) return;
            setDesigns(loadedDesigns);
            setToken(accessToken);
            setState('authenticated');
          } catch (err: unknown) {
            if (!active) return;
            setError(loadErrorMessage(err));
            setState('authenticated');
          }
        }
      })
      .catch(() => {
        if (active) {
          setError('Không thể khôi phục phiên đăng nhập.');
          setState('anonymous');
        }
      });
    return () => {
      active = false;
    };
  }, [rawBookingId, reloadKey]);

  const retry = () => {
    setError(null);
    setState('loading');
    setReloadKey((value) => value + 1);
  };

  if (state === 'loading') {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <Skeleton label="Đang chuẩn bị không gian thiết kế thiệp…" />
      </WorkspaceShell>
    );
  }

  if (error)
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <div className="invitation-page">
          <p role="alert">{error}</p>
          <button type="button" onClick={retry}>
            Thử lại
          </button>
        </div>
      </WorkspaceShell>
    );

  if (state === 'anonymous' || !token) {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <section className="cw-card cw-empty">
          <h2>Mở sau khi đặt cọc</h2>
          <p>
            Thiệp cưới dành cho tiệc đã được xác nhận. Sau khi khoản cọc được nhà hàng ghi nhận,
            Studio thiệp sẽ tự mở.
          </p>
          <Link className="button" href={routes.payment}>
            Đi tới Thanh toán
          </Link>
        </section>
      </WorkspaceShell>
    );
  }

  if (!bookingId) {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <Skeleton label="Đang mở tiệc cưới của bạn…" />
      </WorkspaceShell>
    );
  }

  const handleTabChange = (nextTab: 'design' | 'media' | 'publish' | 'print') => {
    setTab(nextTab);
    if (typeof window !== 'undefined' && bookingId) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', nextTab);
      url.searchParams.set('bookingId', bookingId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
      <div className="invitation-page">
        <InvitationStudioView
          bookingId={bookingId}
          accessToken={token}
          gateway={gateway}
          initialDesigns={designs}
          initialTab={tab}
          onTabChange={handleTabChange}
          key={bookingId}
        />
      </div>
    </WorkspaceShell>
  );
}
