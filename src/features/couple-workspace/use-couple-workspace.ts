'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { describeApiError } from '../../lib/api/api-errors';
import { browserSession } from '../identity-access/browser-session';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';
import {
  type BookingSummary,
  type Proposal,
  type WorkspaceState,
  bearer,
  coupleApi,
  pickDefaultBooking,
  unwrap,
} from './workspace-helpers';

export * from './workspace-helpers';

export type CoupleWorkspace = Readonly<{
  state: WorkspaceState;
  reload: () => void;
  refresh?: () => Promise<void>;
  bookingId: string | null;
  /** Danh sách tiệc của cặp đôi (rỗng khi chưa tải hoặc chưa đăng nhập). */
  bookings: readonly BookingSummary[];
}>;

/**
 * Context của "lớp cache dùng chung" cho /khong-gian.
 */
export const CoupleWorkspaceContext = createContext<CoupleWorkspace | null>(null);

/**
 * Hook nạp ngữ cảnh tiệc cho mọi trang Couple.
 */
export function useCoupleWorkspace(): CoupleWorkspace {
  const shared = useContext(CoupleWorkspaceContext);
  const own = useWorkspaceLoader(shared === null);
  return shared ?? own;
}

/** Bộ tải dữ liệu thật; Provider và hook (khi không có Provider) đều dùng hàm này. */
export function useWorkspaceLoader(enabled = true): CoupleWorkspace {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('bookingId');
  const [state, setState] = useState<WorkspaceState>({ status: 'loading' });
  const [bookings, setBookings] = useState<readonly BookingSummary[]>([]);
  const requestSequence = useRef(0);
  const normalizedSelection = useRef<string | null>(null);
  const refresh = useRefreshQueue(async () => {
    if (!enabled) return;
    const sequence = ++requestSequence.current;
    try {
      const snapshot = await browserSession.restore();
      if (sequence !== requestSequence.current) return;
      if (snapshot.status === 'anonymous') {
        setBookings([]);
        setState({ status: 'anonymous' });
        return;
      }
      const list = await browserSession.authorize((token) =>
        coupleApi()
          .GET('/couple/bookings', {
            headers: bearer(token),
            params: { query: { client: 'WEB', limit: 50 } },
          })
          .then((response) => unwrap<readonly BookingSummary[]>(response)),
      );
      if (sequence !== requestSequence.current) return;
      setBookings(list);
      const id = urlBookingId ?? pickDefaultBooking(list)?.bookingId;
      if (!id) {
        setState({ status: 'choose-booking', bookings: list });
        return;
      }
      const proposal = await browserSession.authorize((token) =>
        coupleApi()
          .GET('/bookings/{bookingId}/proposal', {
            headers: bearer(token),
            params: { path: { bookingId: id } },
            cache: 'no-store',
          })
          .then((response) => unwrap<Proposal>(response)),
      );
      if (sequence !== requestSequence.current) return;
      setState({ status: 'ready', proposal });
      if (!urlBookingId) {
        normalizedSelection.current = id;
        const url = new URL(window.location.href);
        url.searchParams.set('bookingId', id);
        window.history.replaceState(window.history.state, '', url.toString());
      }
    } catch (error: unknown) {
      if (sequence !== requestSequence.current) return;
      if (browserSession.snapshot().status === 'anonymous') {
        setBookings([]);
        setState({ status: 'anonymous' });
      } else setState({ status: 'error', error: describeApiError(error) });
    }
  }, urlBookingId ?? 'default');

  const invalidateRead = useCallback(() => {
    requestSequence.current++;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const normalized = normalizedSelection.current;
    normalizedSelection.current = null;
    if (!urlBookingId || normalized !== urlBookingId) void refresh.run();
    return invalidateRead;
  }, [enabled, urlBookingId, refresh, invalidateRead]);

  const reload = useCallback(() => {
    void refresh.refresh();
  }, [refresh]);
  const activeBookingId = state.status === 'ready' ? state.proposal.bookingId : urlBookingId;
  useRealtimeSubscription({
    bookingId: activeBookingId ?? undefined,
    enabled,
    onEvent: (event) => {
      const matches =
        event.type === 'booking.updated' ||
        !event.scope.bookingId ||
        event.scope.bookingId === activeBookingId ||
        bookings.some((booking) => booking.bookingId === event.scope.bookingId);
      if (
        matches &&
        [
          'booking.updated',
          'proposal.updated',
          'timeline.updated',
          'contract.updated',
          'deposit.received',
          'billing.updated',
        ].includes(event.type)
      ) {
        refresh.schedule();
      }
    },
    onResync: refresh.schedule,
  });

  return {
    state,
    reload,
    refresh: refresh.refresh,
    bookings,
    bookingId: state.status === 'ready' ? state.proposal.bookingId : urlBookingId,
  };
}
