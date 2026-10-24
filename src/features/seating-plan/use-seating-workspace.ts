'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { authorizedRead, type Proposal } from '../couple-workspace/use-couple-workspace';
import { guestApi, type GuestGroup } from '../guest-management/guest-api';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { seatingApi, type LayoutOptions, type SeatingPlan } from './seating-api';

export const statusLabels: Record<SeatingPlan['status'], string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  REQUIRES_REVIEW: 'Cần xác nhận lại',
};

export const layoutWarnings: Record<string, string> = {
  EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY:
    'Số khách dự kiến vượt số ghế của mẫu hoặc sức chứa của sảnh. Hãy chọn mẫu đủ chỗ hoặc liên hệ nhà hàng.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số khách dự kiến nằm ngoài khoảng của mẫu. Hãy chọn mẫu phù hợp hoặc nhờ nhà hàng duyệt ngoại lệ.',
  SEATING_REQUIRES_REVIEW: 'Sơ đồ cần được kiểm tra và xác nhận lại theo thông tin tiệc hiện tại.',
};

export function useSeatingWorkspace(proposal: Proposal) {
  const dirty = useRef(false);
  const fetchGeneration = useRef(0);
  const [refreshAvailable, setRefreshAvailable] = useState(false);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);
  const bookingId = proposal.bookingId;
  const [options, setOptions] = useState<LayoutOptions | null>(null);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setRefreshAvailable(false);
    setReloadKey((value) => value + 1);
  }, []);
  const backgroundReload = useCallback(() => {
    if (dirty.current) setRefreshAvailable(true);
    else reload();
  }, [reload]);

  useEffect(() => {
    let active = true;
    const generation = ++fetchGeneration.current;
    authorizedRead(async (token) => {
      const [layoutOptions, guestGroups, current] = await Promise.all([
        seatingApi.options(token, bookingId),
        guestApi.groups(token, bookingId),
        seatingApi.current(token, bookingId),
      ]);
      return { layoutOptions, guestGroups, current };
    })
      .then(({ layoutOptions, guestGroups, current }) => {
        if (!active || generation !== fetchGeneration.current) return;
        if (dirty.current) {
          setRefreshAvailable(true);
          return;
        }
        setOptions(layoutOptions);
        setGroups(guestGroups.filter((group) => group.status === 'ACTIVE'));
        setPlan(current);
        setPlanId(current ? current.seatingPlanId : null);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active && generation === fetchGeneration.current) {
          if (dirty.current) setRefreshAvailable(true);
          else setLoadError(describeApiError(error));
        }
      });
    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);

  const accept = useCallback((next: SeatingPlan | undefined) => {
    if (!next) return;
    fetchGeneration.current++;
    setPlanId(next.seatingPlanId);
    setPlan(next);
  }, []);

  useRealtimeSubscription({
    bookingId,
    onEvent: (event) => {
      if (!event.scope.bookingId || event.scope.bookingId === bookingId) {
        if (
          event.type === 'seating.updated' ||
          event.type === 'guest.updated' ||
          event.type === 'booking.updated'
        ) {
          backgroundReload();
        }
      }
    },
    onResync: () => {
      backgroundReload();
    },
  });

  return {
    bookingId,
    options,
    groups,
    plan,
    planId,
    loadError,
    reload,
    setDirty,
    requestRefresh: backgroundReload,
    refreshAvailable,
    accept,
  };
}
