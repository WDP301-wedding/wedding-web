'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { notify } from '../../design-system/toast';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { routes } from '../../routes';
import { browserSession } from './browser-session';
import type { WebSessionSnapshot } from './session';

/** Khôi phục phiên cho trang hồ sơ (kèm thử lại) và đăng xuất về trang đăng nhập. */
export function useProfileSession() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<WebSessionSnapshot>(() => browserSession.snapshot());
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<FriendlyError | null>(null);
  const [restoreKey, setRestoreKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    void browserSession
      .restore()
      .then((nextSnapshot) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setRestoring(false);
        setRestoreError(null);
      })
      .catch((error: unknown) => {
        if (active) {
          setRestoreError(describeApiError(error));
          setRestoring(false);
        }
      });
    return () => {
      active = false;
    };
  }, [restoreKey]);

  const retry = () => {
    setRestoreError(null);
    setRestoring(true);
    setRestoreKey((value) => value + 1);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await browserSession.logout();
    } catch {
      notify.info('Đã xóa phiên trên thiết bị này; chưa xác nhận được đăng xuất với máy chủ.');
    } finally {
      setSnapshot(browserSession.snapshot());
      setLoggingOut(false);
      router.replace(routes.login);
    }
  };

  const signedOut = () => {
    setSnapshot(browserSession.snapshot());
    router.replace(routes.login);
  };

  const refresh = () => setSnapshot(browserSession.snapshot());

  return { snapshot, restoring, restoreError, loggingOut, retry, logout, signedOut, refresh };
}
