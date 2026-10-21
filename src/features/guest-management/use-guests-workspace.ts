'use client';

import { useCallback, useEffect, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { authorizedRead, type Proposal } from '../couple-workspace/use-couple-workspace';
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
  settings: CheckInSettings;
  attendance: AttendanceSummary;
};

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
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      const [groups, plan, guests, settings, attendance] = await Promise.all([
        guestApi.groups(token, bookingId),
        guestApi.plan(token, bookingId),
        loadAllGuests(token, bookingId, status),
        guestApi.checkInSettings(token, bookingId),
        guestApi.attendance(token, bookingId),
      ]);
      return { groups, plan, guests, settings, attendance };
    })
      .then((loaded) => {
        if (!active) return;
        setData(loaded);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(describeApiError(error));
      });
    return () => {
      active = false;
    };
  }, [bookingId, status, reloadKey]);

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

  const onCheckInChanged = useCallback(
    (updatedSettings?: CheckInSettings) => {
      if (updatedSettings) {
        setData((prev) => (prev ? { ...prev, settings: updatedSettings } : prev));
      } else {
        reload();
      }
    },
    [reload],
  );

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

  return {
    bookingId,
    data,
    status,
    setStatus,
    loadError,
    reload,
    onPlanSaved,
    onCheckInChanged,
    onGroupSaved,
    onGuestSaved,
  };
}
