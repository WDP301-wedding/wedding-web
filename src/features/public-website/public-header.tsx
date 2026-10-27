'use client';
import { describeApiError } from '../../lib/api/api-errors';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { routes } from '../../routes';
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (restoreSession)
      void session.restore().catch((caught: unknown) => setError(describeApiError(caught).message));
  }, [session, restoreSession]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

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
      router.replace(routes.login);
    } catch {
      setError('Không thể kết nối máy chủ để đăng xuất. Hãy kiểm tra kết nối rồi tải lại trang.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className={['public-header', className].filter(Boolean).join(' ')}>
      <Link className="estate-brand" href={routes.home} aria-label="Hỷ Yến — Trang chủ">
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
        <Link href={routes.halls}>Sảnh tiệc</Link>
        <Link href={routes.menus}>Thực đơn</Link>
        {showOffers ? <Link href="/#uu-dai">Ưu đãi</Link> : null}
        <Link href="/#hoi-dap">Câu hỏi thường gặp</Link>

        {snapshot.status === 'authenticated' ? (
          <>
            <Link className="public-nav-space-link" href={routes.space}>
              Không gian cưới
            </Link>
            <div className="public-user-dropdown" ref={menuRef}>
              <button
                type="button"
                className="public-user-trigger"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={`Tài khoản ${snapshot.actor.displayEmail}`}
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <span className="public-user-avatar" aria-hidden="true">
                  {snapshot.actor.displayEmail.charAt(0).toUpperCase()}
                </span>
                <span className="public-account-link">{snapshot.actor.displayEmail}</span>
                <svg
                  className={`public-user-caret ${userMenuOpen ? 'is-open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {userMenuOpen ? (
                <div className="public-user-menu" role="menu" aria-label="Menu tài khoản">
                  <div className="public-user-menu-header">
                    <span className="public-user-menu-avatar" aria-hidden="true">
                      {snapshot.actor.displayEmail.charAt(0).toUpperCase()}
                    </span>
                    <div className="public-user-menu-info">
                      <strong className="public-user-menu-email">
                        {snapshot.actor.displayEmail}
                      </strong>
                      <span className="public-user-menu-role">Cặp đôi Hỷ Yến</span>
                    </div>
                  </div>
                  <div className="public-user-menu-divider" />
                  <Link
                    className="public-user-menu-item"
                    href={routes.space}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>Không gian cưới của bạn</span>
                  </Link>
                  <Link
                    className="public-user-menu-item"
                    href={routes.profile}
                    role="menuitem"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <span>Hồ sơ & Bảo mật</span>
                  </Link>
                  <div className="public-user-menu-divider" />
                  <button
                    className="public-user-menu-item is-logout"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void logout();
                    }}
                    disabled={pending || loggingOut}
                  >
                    <span>{pending || loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <Link className="public-account-link" href={routes.login}>
            Đăng nhập
          </Link>
        )}

        <div className="public-nav-actions">
          <Link className="public-button" href={routes.consultation}>
            Nhận tư vấn
          </Link>
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
