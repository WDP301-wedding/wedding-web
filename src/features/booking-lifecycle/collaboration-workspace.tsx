'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Skeleton } from '../../design-system/skeleton';
import { useToastFeedback } from '../../design-system/toast';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';
import { ApiClientError } from '../../lib/api/client';
import type {
  CollaborationGateway,
  ProposalView,
} from './collaboration-api';
import {
  type Authorize,
  type BookingChoice,
  type ListBookings,
  listCoupleBookings,
  uuidPattern,
  errorMessage,
} from './collaboration-utils';
import { ProposalWorkspace, EmptyState } from './proposal-workspace';

export interface CollaborationWorkspaceProps {
  access: 'restricted' | 'full';
  authorize: Authorize;
  gateway: CollaborationGateway;
  onBookingChange?: ((bookingId: string) => void) | undefined;
  listBookings?: ListBookings | undefined;
  initialProposal?: ProposalView | undefined;
  onProposalUpdated?: (() => void | Promise<void>) | undefined;
}

export function CollaborationWorkspace({
  access,
  authorize,
  gateway,
  onBookingChange,
  listBookings = listCoupleBookings,
  initialProposal,
  onProposalUpdated,
}: CollaborationWorkspaceProps) {
  const embedded = initialProposal !== undefined;
  const [localProposal, setProposal] = useState<ProposalView | null>(initialProposal ?? null);
  const [deniedProposal, setDeniedProposal] = useState<ProposalView | null>(null);
  const proposal = initialProposal === deniedProposal ? null : (initialProposal ?? localProposal);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(embedded);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useToastFeedback(message, null);
  const [availableBookings, setAvailableBookings] = useState<readonly BookingChoice[] | null>(null);
  const requestedRef = useRef(embedded);
  const activeRequestIdRef = useRef<string | null>(null);

  // Lấy danh sách tiệc của cặp đôi: dùng để tự mở tiệc và hiện ô "Đổi tiệc" khi có nhiều tiệc.
  useEffect(() => {
    if (embedded) return;
    let active = true;
    void listBookings(authorize)
      .then((items) => active && setAvailableBookings(items))
      .catch((caught: unknown) => {
        if (active) {
          setAvailableBookings([]);
          setError(errorMessage(caught));
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [authorize, listBookings, embedded]);

  const load = useCallback(
    async (id: string) => {
      const requestId = id + ':' + Date.now();
      activeRequestIdRef.current = requestId;
      setPending(true);
      setError(null);
      setMessage(null);
      try {
        const loadedProposal = await authorize((token) => gateway.load(token, id));
        if (activeRequestIdRef.current !== requestId) {
          return;
        }
        setProposal(loadedProposal);
        setLoaded(true);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('bookingId', id);
          window.history.replaceState({}, '', url.toString());
        }
        onBookingChange?.(id);
      } catch (caught) {
        if (activeRequestIdRef.current !== requestId) {
          return;
        }
        setProposal(null);
        setLoaded(true);
        setError(errorMessage(caught));
      } finally {
        if (activeRequestIdRef.current === requestId) {
          setPending(false);
        }
      }
    },
    [authorize, gateway, onBookingChange],
  );

  const currentBookingId = proposal?.bookingId;
  const liveRefresh = useRefreshQueue(async () => {
    if (currentBookingId && !embedded) await load(currentBookingId);
  }, currentBookingId);

  useRealtimeSubscription({
    bookingId: currentBookingId,
    enabled: !embedded,
    onEvent: (event) => {
      if (
        currentBookingId &&
        (!event.scope.bookingId || event.scope.bookingId === currentBookingId)
      ) {
        liveRefresh.schedule();
      }
    },
    onResync: () => {
      if (currentBookingId) {
        liveRefresh.schedule();
      }
    },
  });

  useEffect(() => {
    if (requestedRef.current) return;
    const fromUrl = new URLSearchParams(window.location.search).get('bookingId');
    if (fromUrl && uuidPattern.test(fromUrl)) {
      requestedRef.current = true;
      queueMicrotask(() => void load(fromUrl));
      return;
    }
    if (availableBookings === null) return;
    requestedRef.current = true;
    const first = availableBookings[0];
    queueMicrotask(() => (first ? void load(first.bookingId) : setLoaded(true)));
  }, [availableBookings, load]);

  const command = async (operation: (token: string) => Promise<void>, success: string) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await authorize(operation);
      setMessage(success);
      if (proposal && !embedded)
        setProposal(await authorize((token) => gateway.load(token, proposal.bookingId)));
      await onProposalUpdated?.();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setDeniedProposal(initialProposal ?? null);
        setProposal(null);
      }
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="collab-shell">
      <a className="skip-link" href="#proposal-content">
        Đi đến đề xuất
      </a>
      <section className="collab-intro">
        <div>
          <p className="script-heading">Thống nhất</p>
          <h1>Đề xuất & kịch bản</h1>
          <span className="collab-access">
            {access === 'full' ? 'Không gian cặp đôi' : 'Không gian tư vấn'}
          </span>
          <p>Xem lại lựa chọn của tiệc, cùng nhà hàng duyệt kịch bản và gửi yêu cầu khi cần.</p>
        </div>
        {availableBookings && availableBookings.length > 1 ? (
          <label className="collab-switch">
            Đổi tiệc cưới
            <select
              value={proposal?.bookingId ?? ''}
              disabled={pending}
              onChange={(event) => {
                if (event.target.value) void load(event.target.value);
              }}
            >
              {proposal ? null : <option value="">Chọn tiệc…</option>}
              {availableBookings.map((item) => (
                <option key={item.bookingId} value={item.bookingId}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>
      <div className="collab-live" aria-live="polite">
        {pending ? <p role="status">Đang đồng bộ hồ sơ…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <section id="proposal-content">
        {!loaded ? (
          <Skeleton label="Đang mở đề xuất của hai bạn…" />
        ) : proposal === null && availableBookings?.length === 0 && !error ? (
          <EmptyState
            title="Chưa có hồ sơ tiệc cưới"
            body="Nhà hàng sẽ mở đề xuất sau buổi tư vấn và gửi lời mời vào không gian cưới qua email."
          >
            <Link className="button" href="/tu-van">
              Liên hệ tư vấn
            </Link>
          </EmptyState>
        ) : proposal === null ? (
          <EmptyState
            title="Chưa thể mở đề xuất"
            body="Liên kết có thể đã cũ hoặc tài khoản chưa được cấp quyền cho tiệc này. Hãy chọn lại tiệc hoặc liên hệ nhà hàng."
          />
        ) : (
          <ProposalWorkspace
            access={access}
            proposal={proposal}
            pending={pending}
            command={command}
            gateway={gateway}
          />
        )}
      </section>
    </div>
  );
}
