'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { authorizedRead, type Proposal } from '../couple-workspace/use-couple-workspace';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import {
  guestApi,
  type AttendanceSummary,
  type CheckInSettings,
  type Guest,
  type GuestGroup,
  type GuestPlan,
} from './guest-api';

export type GuestsData = {
  groups: GuestGroup[];
  plan: GuestPlan;
  guests: Guest[];
  /** `null` khi phần check-in chưa tải được (không chặn cả trang, xem `extrasError`). */
  settings: CheckInSettings | null;
  attendance: AttendanceSummary | null;
};

/** Giống hệt kết quả backend trả khi check-in đang tắt — không cần gọi API cho trường hợp này. */
function notRecorded(bookingId: string): AttendanceSummary {
  return {
    bookingId,
    checkInMode: 'NONE',
    measurementStatus: 'NOT_RECORDED',
    checkedInGuestCount: null,
    ledgerRevision: 0,
    byGuestGroup: [],
  };
}

/**
 * Phần check-in (cài đặt + thống kê) là phần PHỤ của trang: tải riêng để nếu chậm/lỗi thì chỉ
 * thẻ check-in báo lỗi, danh sách khách vẫn dùng được (trước đây một API phụ timeout → cả trang lỗi).
 * Thống kê chỉ có ý nghĩa khi check-in đang bật → tắt thì không gọi API.
 */
async function loadCheckIn(token: string, bookingId: string) {
  const settings = await guestApi.checkInSettings(token, bookingId);
  const attendance =
    settings.checkInMode === 'BY_GUEST_NAME'
      ? await guestApi.attendance(token, bookingId)
      : notRecorded(bookingId);
  return { settings, attendance };
}

export type GuestStatusFilter = 'ACTIVE' | 'ARCHIVED';

/** Đọc toàn bộ khách theo trạng thái (mỗi trang tối đa 50; dừng ở 2.000 để tránh treo trình duyệt). */
async function loadAllGuests(token: string, bookingId: string, status: GuestStatusFilter) {
  const all: Guest[] = [];
  let cursor: string | undefined;
  do {
    const page = await guestApi.guests(token, bookingId, { status, ...(cursor ? { cursor } : {}) });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && all.length < 2000);
  return all;
}

export function useGuestsWorkspace(proposal: Proposal) {
  const bookingId = proposal.bookingId;
  const [data, setData] = useState<GuestsData | null>(null);
  const [status, setStatus] = useState<GuestStatusFilter>('ACTIVE');
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [extrasError, setExtrasError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [extrasKey, setExtrasKey] = useState(0);
  // Hai phần tải song song, về theo thứ tự bất kỳ: giữ kết quả check-in mới nhất để ghép vào
  // khi phần chính về sau (state `data` còn null thì chưa ghép được).
  const extrasRef = useRef<Pick<GuestsData, 'settings' | 'attendance'>>({
    settings: null,
    attendance: null,
  });

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  /** Chỉ tải lại phần check-in (sau khi bật/tắt, hoặc bấm "Thử lại" ở thẻ check-in). */
  const reloadExtras = useCallback(() => setExtrasKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      const [groups, plan, guests] = await Promise.all([
        guestApi.groups(token, bookingId),
        guestApi.plan(token, bookingId),
        loadAllGuests(token, bookingId, status),
      ]);
      return { groups, plan, guests };
    })
      .then((core) => {
        if (!active) return;
        // Chỉ ghép phần check-in của đúng tiệc này (đổi tiệc thì phần cũ không còn hợp lệ).
        const extras =
          extrasRef.current.settings?.bookingId === bookingId
            ? extrasRef.current
            : { settings: null, attendance: null };
        setData({ ...core, ...extras });
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, status, reloadKey]);

  // Không phụ thuộc bộ lọc trạng thái khách: đổi "Đang mời/Đã lưu trữ" không tải lại check-in.
  useEffect(() => {
    let active = true;
    authorizedRead((token) => loadCheckIn(token, bookingId))
      .then((extras) => {
        if (!active) return;
        extrasRef.current = extras;
        setData((previous) => (previous ? { ...previous, ...extras } : previous));
        setExtrasError(null);
      })
      .catch((error: unknown) => {
        if (active) setExtrasError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, extrasKey, reloadKey]);

  const onPlanSaved = useCallback(
    (updatedPlan?: GuestPlan) => {
      if (updatedPlan) {
        setData((prev) => (prev ? { ...prev, plan: updatedPlan } : prev));
      } else {
        reload();
      }
    },
    [reload],
  );

  // Bật/tắt check-in đổi luôn ý nghĩa của thống kê điểm danh → tải lại riêng phần check-in.
  const onCheckInChanged = useCallback(() => reloadExtras(), [reloadExtras]);

  const onGroupSaved = useCallback(
    (group?: GuestGroup, action?: 'create' | 'update') => {
      if (!group) {
        reload();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        if (action === 'create') {
          return { ...prev, groups: [...prev.groups, group] };
        }
        return {
          ...prev,
          groups: prev.groups.map((g) => (g.guestGroupId === group.guestGroupId ? group : g)),
        };
      });
    },
    [reload],
  );

  const onGuestSaved = useCallback(
    (guest?: Guest, action?: 'create' | 'update') => {
      if (!guest) {
        reload();
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        if (action === 'create') {
          if (guest.status !== status) return prev;
          return { ...prev, guests: [guest, ...prev.guests] };
        }
        if (guest.status !== status) {
          return {
            ...prev,
            guests: prev.guests.filter((g) => g.guestId !== guest.guestId),
          };
        }
        return {
          ...prev,
          guests: prev.guests.map((g) => (g.guestId === guest.guestId ? guest : g)),
        };
      });
    },
    [reload, status],
  );

  useRealtimeSubscription({
    bookingId,
    onEvent: (event) => {
      if (!event.scope.bookingId || event.scope.bookingId === bookingId) {
        if (event.type === 'guest.updated' || event.type === 'booking.updated') {
          reload();
          reloadExtras();
        }
      }
    },
    onResync: () => {
      reload();
      reloadExtras();
    },
  });

  return {
    bookingId,
    data,
    status,
    setStatus,
    loadError,
    extrasError,
    reload,
    reloadExtras,
    onPlanSaved,
    onCheckInChanged,
    onGroupSaved,
    onGuestSaved,
  };
}
