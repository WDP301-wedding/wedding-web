'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import { InlineError } from '../../design-system/inline-error';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { JourneyStepper, journeyIndex, journeySteps } from '../../design-system/journey-stepper';
import { routes, withBooking } from '../../routes';
import { browserSession } from '../identity-access/browser-session';
import {
  notificationApi,
  notificationHref,
  type InboxItem,
} from '../notifications/notification-api';
import { SpaceGate } from './space-gate';
import { menuLines } from './proposal-menus';
import { useSpaceExtras } from './space-provider';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  eventTypeLabel,
  formatDateTime,
  formatEventDate,
  shiftLabel,
  useCoupleWorkspace,
} from './use-couple-workspace';
import { createExperienceGateway } from '../identity-access/experience-api';
import { notify } from '../../design-system/toast';
import { daysUntil, nextTasks } from './overview-tasks';
import { OverviewMultiBookings } from './overview-multi-bookings';
import { OverviewAliasModal } from './overview-alias-modal';

export { daysUntil, nextTasks, type Task } from './overview-tasks';

export function SpaceOverview() {
  return (
    <SpaceGate label="Đang mở tổng quan…">
      <OverviewContent />
    </SpaceGate>
  );
}

function OverviewContent() {
  const { state, bookings, bookingId, reload } = useCoupleWorkspace();
  const { restaurant } = useSpaceExtras();
  const [latest, setLatest] = useState<readonly InboxItem[] | null>(null);
  const [latestError, setLatestError] = useState<FriendlyError | null>(null);
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [savingAlias, setSavingAlias] = useState(false);
  const [aliasError, setAliasError] = useState<FriendlyError | null>(null);
  const aliasDialog = useRef<HTMLDialogElement>(null);
  const aliasTrigger = useRef<HTMLButtonElement>(null);

  const latestLive = useLiveRefresh(
    async (isCurrent) => {
      try {
        const page = await browserSession.authorize((token) => notificationApi.inbox(token));
        if (isCurrent()) {
          setLatest(page.items.slice(0, 3));
          setLatestError(null);
        }
      } catch (error) {
        if (isCurrent()) setLatestError(describeApiError(error));
      }
    },
    {
      scope: 'overview-inbox',
      enabled: state.status === 'ready',
      initial: true,
      types: ['notification.received'],
    },
  );

  useEffect(() => {
    if (!aliasModalOpen) return;
    const dialog = aliasDialog.current;
    if (!dialog) return;
    const trigger = aliasTrigger.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [aliasModalOpen]);

  if (state.status !== 'ready') return null;
  const proposal = state.proposal;
  const summary = bookings.find((booking) => booking.bookingId === bookingId);
  const step = journeyIndex(proposal.phase, proposal.eventDate);
  const days = daysUntil(proposal.eventDate);
  const tasks = nextTasks(proposal, summary, days);
  const { proposal: offer } = proposal;

  const openAliasModal = () => {
    setAliasInput(summary?.alias ?? '');
    setAliasError(null);
    setAliasModalOpen(true);
  };

  const handleSaveAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingAlias) return;
    setSavingAlias(true);
    setAliasError(null);
    try {
      await browserSession.authorize((token) =>
        createExperienceGateway().updateBookingAlias(
          token,
          proposal.bookingId,
          aliasInput.trim() ? aliasInput.trim() : null,
          summary?.revision,
        ),
      );
      notify.success('Đã cập nhật tên gợi nhớ tiệc!');
      setAliasModalOpen(false);
      reload();
    } catch (error) {
      setAliasError(describeApiError(error));
    } finally {
      setSavingAlias(false);
    }
  };

  return (
    <div className="hy-overview2">
      <h1 className="visually-hidden">Tổng quan tiệc cưới</h1>
      {proposal.phase === 'CANCELLED' ? (
        <p className="hy-banner is-error" role="status">
          Tiệc đã huỷ. Hồ sơ được giữ lại để hai bạn xem lịch sử.
        </p>
      ) : null}

      <div className="hy-overview-booking-header">
        <div className="hy-overview-booking-title-row">
          <h2>{summary ? bookingDisplayName(summary) : offer.hall.name}</h2>
          <button
            type="button"
            ref={aliasTrigger}
            className="hy-alias-edit-btn"
            aria-haspopup="dialog"
            onClick={openAliasModal}
            title="Đặt tên gợi nhớ cho tiệc này"
          >
            {summary?.alias ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          </button>
        </div>
        {summary?.alias ? (
          <p className="hy-overview-booking-hall-sub">
            Sảnh {offer.hall.name} · {shiftLabel(offer.shift.code)}
          </p>
        ) : null}
      </div>

      <header className="hy-hero" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hy-hero-countdown">
          {days > 0 ? (
            <>
              <span className="hy-hero-days">{days}</span>
              <span className="hy-hero-unit">ngày nữa tới tiệc</span>
            </>
          ) : days === 0 ? (
            <span className="hy-hero-unit is-today">Hôm nay là ngày tiệc!</span>
          ) : (
            <span className="hy-hero-unit is-past">Tiệc đã diễn ra</span>
          )}
        </div>
        <div className="hy-hero-details">
          <p className="hy-hero-date">{formatEventDate(proposal.eventDate)}</p>
          <p className="hy-hero-meta">
            {eventTypeLabel(summary?.eventType)} · Sảnh {offer.hall.name} ·{' '}
            {shiftLabel(offer.shift.code)} ({offer.shift.startTime}–{offer.shift.endTime})
          </p>
          <div className="hy-hero-chips">
            <span className="hy-chip is-accent">{bookingPhaseLabel(proposal.phase)}</span>
            <span className="hy-chip">{proposal.planningHeadcount} khách dự kiến</span>
            <span className="hy-chip">{offer.tableCount} bàn</span>
            <span className="hy-chip">{menuLines(offer).length} món</span>
          </div>
        </div>
      </header>

      <OverviewMultiBookings bookings={bookings} proposal={proposal} />

      <section className="hy-journey-card" aria-labelledby="journey-title">
        <div className="hy-journey-head">
          <h2 id="journey-title">Hành trình cưới</h2>
          <span>{step < 0 ? 'Tiệc đã huỷ' : `Bước ${step + 1}/6 · ${journeySteps[step]}`}</span>
        </div>
        <JourneyStepper current={step} />
      </section>

      {tasks.length > 0 ? (
        <section aria-labelledby="tasks-title">
          <h2 id="tasks-title" className="hy-section-title">
            Việc cần làm ngay
          </h2>
          <div className="hy-task-grid">
            {tasks.map((task) => (
              <article key={task.title} className={`hy-task is-${task.status}`}>
                {task.status === 'wait' ? (
                  <span className="hy-chip is-warning">Chờ bạn</span>
                ) : null}
                <h3>{task.title}</h3>
                <p>{task.detail}</p>
                {task.href ? (
                  <Link
                    className={task.status === 'wait' ? 'button' : 'button button-secondary'}
                    href={task.href}
                  >
                    {task.action}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="hy-overview2-bottom">
        <section className="hy-card" aria-labelledby="latest-title">
          <header className="hy-card-head">
            <h2 id="latest-title">Thông báo mới</h2>
            <Link href={withBooking(routes.notifications, proposal.bookingId)}>Xem tất cả</Link>
          </header>
          <InlineError error={latestError} onRetry={() => void latestLive.refresh()} />
          {latest === null && latestError ? null : latest === null ? (
            <p className="hy-muted" role="status">
              Đang tải thông báo…
            </p>
          ) : latest.length === 0 ? (
            <p className="hy-muted">Chưa có thông báo nào.</p>
          ) : (
            <ul className="hy-notice-list">
              {latest.map((item) => {
                const href = notificationHref(item);
                return (
                  <li key={item.id} className={item.readAt ? undefined : 'is-unread'}>
                    {href ? <Link href={href}>{item.title}</Link> : <span>{item.title}</span>}
                    <small>{formatDateTime(item.createdAt)}</small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="hy-card hy-contact-card" aria-labelledby="contact-title">
          <h2 id="contact-title">Liên hệ nhà hàng</h2>
          <p>{restaurant?.displayName ?? 'Nhà hàng Hỷ Yến'}</p>
          <div className="hy-actions">
            {restaurant?.publicPhone ? (
              <a className="button" href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}>
                Gọi {restaurant.publicPhone}
              </a>
            ) : null}
            {restaurant?.publicEmail ? (
              <a className="button button-secondary" href={`mailto:${restaurant.publicEmail}`}>
                Email
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <OverviewAliasModal
        isOpen={aliasModalOpen}
        dialogRef={aliasDialog}
        hasExistingAlias={Boolean(summary?.alias)}
        aliasInput={aliasInput}
        setAliasInput={setAliasInput}
        savingAlias={savingAlias}
        aliasError={aliasError}
        onClose={() => setAliasModalOpen(false)}
        onSave={(e) => {
          void handleSaveAlias(e);
        }}
      />
    </div>
  );
}
