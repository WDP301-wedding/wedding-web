'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { describeApiError } from '../../lib/api/api-errors';
import { routes } from '../../routes';
import type { WebIdentitySession, WebSessionSnapshot } from '../identity-access/session';

const anonymous: WebSessionSnapshot = { status: 'anonymous', denial: null };
const serverSnapshot = () => anonymous;

/** Trạng thái đăng nhập, menu tài khoản và đăng xuất của thanh điều hướng công khai. */
export function usePublicHeader({
  session,
  onLogout,
  pending,
  restoreSession,
}: Readonly<{
  session: WebIdentitySession;
  onLogout: (() => void) | undefined;
  pending: boolean;
  restoreSession: boolean;
}>) {
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
      if (event.key === 'Escape') setUserMenuOpen(false);
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

  return {
    snapshot,
    error,
    menuRef,
    userMenuOpen,
    setUserMenuOpen,
    busy: pending || loggingOut,
    logout,
  };
}
