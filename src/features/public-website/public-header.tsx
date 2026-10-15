'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { BrandMark } from '../../design-system/brand-mark';
import { browserSession } from '../identity-access/browser-session';
import type { WebIdentitySession, WebSessionSnapshot } from '../identity-access/session';

const anonymous: WebSessionSnapshot = { status: 'anonymous', denial: null };
const serverSnapshot = () => anonymous;

export function PublicHeader({
  session = browserSession,
  onLogout,
  pending = false,
  restoreSession = true,
}: {
  session?: WebIdentitySession;
  onLogout?: () => void;
  pending?: boolean;
  restoreSession?: boolean;
}) {
  const router = useRouter();
  const subscribe = useCallback((listener: () => void) => session.subscribe(listener), [session]);
  const getSnapshot = useCallback(() => session.snapshot(), [session]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (restoreSession) void session.restore();
  }, [session, restoreSession]);

  async function logout() {
    if (pending || loggingOut) return;
    if (onLogout) {
      onLogout();
      return;
    }
    setLoggingOut(true);
    setError(null);
    try {
      await session.logout();
      router.replace('/account');
    } catch {
      setError('Không thể kết nối máy chủ để đăng xuất. Hãy kiểm tra kết nối rồi tải lại trang.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="public-header">
      <Link className="estate-brand" href="/" aria-label="Hỷ Yến — Trang chủ">
        <BrandMark />
      </Link>
      <nav aria-label="Điều hướng chính">
        <Link href="/halls">Sảnh tiệc</Link>
        <Link href="/menus">Thực đơn</Link>
        <Link href="/overview">Kế hoạch của bạn</Link>
        <Link className="public-account-link" href="/account">
          {snapshot.status === 'authenticated' ? snapshot.actor.displayEmail : 'Tài khoản'}
        </Link>
        <div className="public-nav-actions">
          <Link className="public-button" href="/consultation">
            Nhận tư vấn
          </Link>
          {snapshot.status === 'authenticated' ? (
            <button
              className="public-button public-nav-logout"
              type="button"
              onClick={() => void logout()}
              disabled={pending || loggingOut}
            >
              {pending || loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          ) : null}
        </div>
      </nav>
      {error ? (
        <p className="public-nav-error" role="alert">
          {error}
        </p>
      ) : null}
    </header>
  );
}
