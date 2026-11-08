'use client';
import { useCallback, useEffect, useState } from 'react';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { authorizedRead, type Proposal } from '../couple-workspace/use-couple-workspace';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';
import { guestApi, type GuestGroup, type GuestPlan } from './guest-api';

export type GuestsData = { groups: GuestGroup[]; plan: GuestPlan };
export function useGuestsWorkspace(proposal: Proposal) {
  const bookingId = proposal.bookingId;
  const [snapshot, setSnapshot] = useState<{ bookingId: string; data: GuestsData } | null>(null);
  const [failure, setFailure] = useState<{ bookingId: string; error: FriendlyError } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    authorizedRead(async (token) => {
      const [groups, plan] = await Promise.all([
        guestApi.groups(token, bookingId),
        guestApi.plan(token, bookingId),
      ]);
      return { groups, plan };
    })
      .then((data) => {
        if (active) {
          setSnapshot({ bookingId, data });
          setFailure(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setFailure({ bookingId, error: describeApiError(error) });
      });
    return () => {
      active = false;
    };
  }, [bookingId, reloadKey]);
  const onPlanSaved = (plan?: GuestPlan) => {
    if (!plan) {
      reload();
      return;
    }
    setSnapshot((previous) =>
      previous?.bookingId === bookingId
        ? { ...previous, data: { ...previous.data, plan } }
        : previous,
    );
  };
  const onGroupSaved = (group?: GuestGroup, action?: 'create' | 'update') => {
    if (!group) {
      reload();
      return;
    }
    setSnapshot((previous) =>
      previous?.bookingId === bookingId
        ? {
            ...previous,
            data: {
              ...previous.data,
              groups:
                action === 'create'
                  ? [...previous.data.groups, group]
                  : previous.data.groups.map((item) =>
                      item.guestGroupId === group.guestGroupId ? group : item,
                    ),
            },
          }
        : previous,
    );
  };
  const realtimeRefresh = useRefreshQueue(() => {
    reload();
    return Promise.resolve();
  }, bookingId);
  useRealtimeSubscription({
    bookingId,
    onEvent: (event) => {
      if (
        (!event.scope.bookingId || event.scope.bookingId === bookingId) &&
        (event.type === 'guest.updated' || event.type === 'booking.updated')
      )
        realtimeRefresh.schedule();
    },
    onResync: realtimeRefresh.schedule,
  });
  return {
    bookingId,
    data: snapshot?.bookingId === bookingId ? snapshot.data : null,
    loadError: failure?.bookingId === bookingId ? failure.error : null,
    reload,
    onPlanSaved,
    onGroupSaved,
  };
}
