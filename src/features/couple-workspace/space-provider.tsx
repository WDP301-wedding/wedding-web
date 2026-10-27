'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useLiveRefresh } from '../realtime/use-live-refresh';
import { browserSession } from '../identity-access/browser-session';
import { notificationApi } from '../notifications/notification-api';
import { createPublicGateway, type Restaurant } from '../public-website/public-api';
import { CoupleWorkspaceContext, useWorkspaceLoader } from './use-couple-workspace';

type SpaceExtras = Readonly<{
  /** Số thông báo chưa đọc (null = chưa biết / chưa đăng nhập). */
  unread: number | null;
  refreshUnread: () => void;
  /** Hồ sơ nhà hàng (hotline, email) cho thẻ "Cần hỗ trợ?". */
  restaurant: Restaurant | null;
}>;

const SpaceExtrasContext = createContext<SpaceExtras | null>(null);

/** true khi component đang nằm trong khung /khong-gian (dùng để bỏ khung cũ WorkspaceShell). */
export function useInSpace(): boolean {
  return useContext(SpaceExtrasContext) !== null;
}

export function useSpaceExtras(): SpaceExtras {
  return (
    useContext(SpaceExtrasContext) ?? { unread: null, refreshUnread: () => {}, restaurant: null }
  );
}

const publicGateway = createPublicGateway();

/**
 * Lớp cache dữ liệu dùng chung cho toàn bộ /khong-gian (đặt trong `app/khong-gian/layout.tsx`).
 *
 * - Ngữ cảnh tiệc (phiên, danh sách tiệc, proposal) tải một lần, các trang con đọc qua
 *   `useCoupleWorkspace()` → chuyển trang không gọi lại API.
 * - Trang con sau khi ghi dữ liệu gọi `reload()` để làm mới đúng một chỗ.
 * - Không thêm thư viện (SWR/React Query): nhu cầu hiện chỉ là "tải 1 lần + làm mới khi cần",
 *   React context là đủ và không tăng bundle.
 */
export function SpaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const workspace = useWorkspaceLoader(true);
  const [unread, setUnread] = useState<number | null>(null);
  const [unreadKey, setUnreadKey] = useState(0);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const authenticated =
    workspace.state.status !== 'anonymous' && workspace.state.status !== 'loading';

  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    browserSession
      .authorize((token) => notificationApi.unreadCount(token))
      .then((count) => active && setUnread(count))
      .catch(() => {
        // Chuông chỉ là thông tin phụ: lỗi thì ẩn số, không chặn trang.
      });
    return () => {
      active = false;
    };
  }, [authenticated, unreadKey]);

  useEffect(() => {
    let active = true;
    publicGateway
      .restaurant()
      .then((value) => active && setRestaurant(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useLiveRefresh(
    async (isCurrent) => {
      try {
        const count = await browserSession.authorize((token) => notificationApi.unreadCount(token));
        if (isCurrent()) setUnread(count);
      } catch {
        /* Badge failure does not block the workspace. */
      }
    },
    { scope: 'unread-count', enabled: authenticated, types: ['notification.received'] },
  );
  useLiveRefresh(
    async (isCurrent) => {
      try {
        const next = await publicGateway.restaurant();
        if (isCurrent()) setRestaurant(next);
      } catch {
        /* Retain the previous contact details if the refresh fails. */
      }
    },
    { scope: 'restaurant-contact', enabled: authenticated, types: ['catalog.updated'] },
  );

  const refreshUnread = useCallback(() => setUnreadKey((value) => value + 1), []);

  return (
    <CoupleWorkspaceContext.Provider value={workspace}>
      <SpaceExtrasContext.Provider value={{ unread, refreshUnread, restaurant }}>
        {children}
      </SpaceExtrasContext.Provider>
    </CoupleWorkspaceContext.Provider>
  );
}
