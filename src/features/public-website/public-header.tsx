'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { browserSession } from '../identity-access/browser-session';
import type { WebIdentitySession, WebSessionSnapshot } from '../identity-access/session';

const anonymous: WebSessionSnapshot = { status: 'anonymous', denial: null };
const serverSnapshot = () => anonymous;

export function PublicHeader({
  className,
  session = browserSession,
  onLogout,
  pending = false,
  restoreSession = true,
  showOffers = false,
}: {
  className?: string;
  session?: WebIdentitySession;
  onLogout?: () => void;
  pending?: boolean;
  restoreSession?: boolean;
  /** Chỉ hiện mục "Ưu đãi" khi nhà hàng có ưu đãi thật (src/content/public-content.ts). */
  showOffers?: boolean;
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
      router.replace('/dang-nhap');
    } catch {
      setError('Không thể kết nối máy chủ để đăng xuất. Hãy kiểm tra kết nối rồi tải lại trang.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className={['public-header', className].filter(Boolean).join(' ')}>
      <Link className="estate-brand" href="/" aria-label="Hỷ Yến — Trang chủ">
        <Image
          className="public-header-logo"
          src="/images/hy-yen-logo.png"
          alt="Hỷ Yến Wedding"
          width={394}
          height={414}
          loading="eager"
        />
      </Link>
      <nav aria-label="Điều hướng chính">
        <Link href="/sanh">Sảnh tiệc</Link>
        <Link href="/thuc-don">Thực đơn</Link>
        {showOffers ? <Link href="/#uu-dai">Ưu đãi</Link> : null}
        <Link href="/#hoi-dap">Câu hỏi thường gặp</Link>
        {snapshot.status === 'authenticated' ? (
          <Link href="/khong-gian">Không gian cưới</Link>
        ) : null}
        <Link
          className="public-account-link"
          href={snapshot.status === 'authenticated' ? '/ho-so' : '/dang-nhap'}
        >
          {snapshot.status === 'authenticated' ? snapshot.actor.displayEmail : 'Đăng nhập'}
        </Link>
        <div className="public-nav-actions">
          <Link className="public-button" href="/tu-van">
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
