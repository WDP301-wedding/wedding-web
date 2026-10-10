'use client';

import styles from '@/src/features/invitation-studio/invitation.module.css';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserSession as session } from '@/src/features/identity-access/browser-session';
import {
  createInvitationGateway,
  type DesignView,
  type PrintOrderView,
} from '@/src/features/invitation-studio/invitation-api';
import { InvitationStudioView } from '@/src/features/invitation-studio/invitation-studio-view';

const gateway = createInvitationGateway();

export default function CoupleInvitationsPage() {
  const [state, setState] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [designs, setDesigns] = useState<readonly DesignView[]>([]);
  const [orders, setOrders] = useState<readonly PrintOrderView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const urlParams = new URLSearchParams(window.location.search);
    const bid = urlParams.get('bookingId');
    if (bid) queueMicrotask(() => setBookingId(bid));

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
            if (bid) {
              const [loadedDesigns, loadedOrders] = await Promise.all([
                gateway.listDesigns(accessToken, bid),
                gateway.listPrintOrders(accessToken, bid),
              ]);
              if (!active) return;
              setDesigns(loadedDesigns);
              setOrders(loadedOrders);
            }
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
  }, []);

  if (state === 'loading') {
    return (
      <main className={styles.shell}>
        <p className="text-stone-600">Đang chuẩn bị không gian thiết kế thiệp…</p>
      </main>
    );
  }

  if (error)
    return (
      <main className={styles.shell}>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Thử lại
        </button>
      </main>
    );

  if (state === 'anonymous' || !token) {
    return (
      <main className={styles.shell}>
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
    );
  }

  if (!bookingId) {
    return (
      <main className={styles.shell}>
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
    );
  }

  return (
    <main className={styles.shell}>
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={token}
        gateway={gateway}
        initialDesigns={designs}
        initialOrders={orders}
      />
    </main>
  );
}
