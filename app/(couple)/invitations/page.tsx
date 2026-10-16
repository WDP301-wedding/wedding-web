'use client';

import { WorkspaceShell } from '../../../src/features/couple-workspace/workspace-shell';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { browserSession as session } from '../../../src/features/identity-access/browser-session';
import {
  createInvitationGateway,
  type DesignView,
  type PrintOrderView,
} from '../../../src/features/invitation-studio/invitation-api';
import { InvitationStudioView } from '../../../src/features/invitation-studio/invitation-studio-view';
import { Skeleton } from '../../../src/design-system/skeleton';

const gateway = createInvitationGateway();

type StudioTab = 'design' | 'media' | 'publish' | 'print';

function parseTab(raw: string | null): StudioTab {
  if (raw === 'media' || raw === 'publish' || raw === 'print' || raw === 'design') {
    return raw;
  }
  return 'design';
}

function CoupleInvitationsPage() {
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
  const [orders, setOrders] = useState<readonly PrintOrderView[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [prevBookingId, setPrevBookingId] = useState(rawBookingId);
  if (rawBookingId !== prevBookingId) {
    setPrevBookingId(rawBookingId);
    setState(rawBookingId ? 'loading' : 'authenticated');
    setError(null);
    setDesigns([]);
    setOrders([]);
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
            const [loadedDesigns, loadedOrders] = await Promise.all([
              gateway.listDesigns(accessToken, rawBookingId),
              gateway.listPrintOrders(accessToken, rawBookingId),
            ]);
            if (!active) return;
            setDesigns(loadedDesigns);
            setOrders(loadedOrders);
            setToken(accessToken);
            setState('authenticated');
          } catch (err: unknown) {
            if (!active) return;
            setError(err instanceof Error ? err.message : 'Không thể tải thiệp cưới.');
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
  }, [rawBookingId]);

  if (state === 'loading') {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <main className="invitation-page">
          <p className="text-stone-600">Đang chuẩn bị không gian thiết kế thiệp…</p>
        </main>
      </WorkspaceShell>
    );
  }

  if (error)
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <main className="invitation-page">
          <p role="alert">{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Thử lại
          </button>
        </main>
      </WorkspaceShell>
    );

  if (state === 'anonymous' || !token) {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <main className="invitation-page">
          <div className="bg-white p-6 rounded-lg border border-[#D4AF37]/30 shadow-sm max-w-md text-center">
            <h1 className="text-xl  text-[#1E3A2F] mb-2 font-bold">Yêu cầu đăng nhập</h1>
            <p className="text-sm text-stone-600 mb-4">
              Vui lòng đăng nhập với tài khoản dâu rể để xem và chỉnh sửa thiệp cưới.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-[#1E3A2F] text-white rounded text-sm hover:bg-[#152820] transition"
            >
              Đến trang đăng nhập
            </Link>
          </div>
        </main>
      </WorkspaceShell>
    );
  }

  if (!bookingId) {
    return (
      <WorkspaceShell active={tab} bookingId={bookingId ?? undefined}>
        <main className="invitation-page">
          <div className="bg-white p-6 rounded-lg border border-[#D4AF37]/30 shadow-sm max-w-md text-center">
            <h1 className="text-xl  text-[#1E3A2F] mb-2 font-bold">Chưa chọn tiệc cưới</h1>
            <p className="text-sm text-stone-600 mb-4">
              Vui lòng cung cấp mã tiệc cưới (bookingId) trên URL để quản lý thiệp cưới.
            </p>
            <Link
              href="/overview"
              className="inline-block px-4 py-2 bg-[#1E3A2F] text-white rounded text-sm hover:bg-[#152820] transition"
            >
              Về danh sách tiệc cưới
            </Link>
          </div>
        </main>
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
      <main className="invitation-page">
        <InvitationStudioView
          bookingId={bookingId}
          accessToken={token}
          gateway={gateway}
          initialDesigns={designs}
          initialOrders={orders}
          initialTab={tab}
          onTabChange={handleTabChange}
          key={bookingId}
        />
      </main>
    </WorkspaceShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở Studio…" />}>
      <CoupleInvitationsPage />
    </Suspense>
  );
}
