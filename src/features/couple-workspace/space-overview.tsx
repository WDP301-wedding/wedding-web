'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { cn } from 'cn';

import { Badge } from '../../components/ui/badge';
import { buttonVariants } from '../../components/ui/button';
import { InlineError } from '../../design-system/inline-error';
import { JourneyStepper, journeyIndex, journeySteps } from '../../design-system/journey-stepper';
import { routes, withBooking } from '../../routes';
import { notificationHref } from '../notifications/notification-api';
import { OverviewAliasModal } from './overview-alias-modal';
import { OverviewMultiBookings } from './overview-multi-bookings';
import { daysUntil, nextTasks } from './overview-tasks';
import { menuLines } from './proposal-menus';
import { panel, panelTitle } from './space-classes';
import { SpaceGate } from './space-gate';
import { useSpaceExtras } from './space-provider';
import { useAliasDialog, useLatestNotifications } from './use-overview';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  eventTypeLabel,
  formatDateTime,
  formatEventDate,
  shiftLabel,
  useCoupleWorkspace,
} from './use-couple-workspace';

export { daysUntil, nextTasks, type Task } from './overview-tasks';

const heroChip = 'rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white';

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
  const ready = state.status === 'ready';
  const summary = bookings.find((booking) => booking.bookingId === bookingId);
  const inbox = useLatestNotifications(ready);
  const aliasDialog = useRef<HTMLDialogElement>(null);
  const aliasTrigger = useRef<HTMLButtonElement>(null);
  const alias = useAliasDialog(
    ready ? state.proposal.bookingId : undefined,
    summary,
    reload,
    aliasDialog,
    aliasTrigger,
  );

  if (!ready) return null;
  const proposal = state.proposal;
  const step = journeyIndex(proposal.phase, proposal.eventDate);
  const days = daysUntil(proposal.eventDate);
  const tasks = nextTasks(proposal, summary, days);
  const { proposal: offer } = proposal;

  return (
    <div data-ui-v3 className="flex flex-col gap-6 lg:gap-7">
      <h1 className="sr-only">Tổng quan tiệc cưới</h1>
      {proposal.phase === 'CANCELLED' ? (
        <p className="rounded-lg bg-hy-error-bg px-4 py-3 text-sm text-hy-error" role="status">
          Tiệc đã huỷ. Hồ sơ được giữ lại để hai bạn xem lịch sử.
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold sm:text-2xl">
            {summary ? bookingDisplayName(summary) : offer.hall.name}
          </h2>
          <button
            type="button"
            ref={aliasTrigger}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            aria-haspopup="dialog"
            onClick={alias.openDialog}
            title="Đặt tên gợi nhớ cho tiệc này"
          >
            {summary?.alias ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          </button>
        </div>
        {summary?.alias ? (
          <p className="text-sm text-muted-foreground">
            Sảnh {offer.hall.name} · {shiftLabel(offer.shift.code)}
          </p>
        ) : null}
      </div>

      <header className="relative isolate flex min-h-60 flex-wrap items-end justify-between gap-6 overflow-hidden rounded-2xl bg-hy-ink p-5 text-white sm:p-8">
        <Image
          className="-z-20 object-cover"
          src="/images/hero-sanh-tiec-1080.webp"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1120px"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgb(43_29_34/0.88),rgb(43_29_34/0.35)_75%)]"
          aria-hidden="true"
        />
        <div className="flex items-baseline gap-2.5">
          {days > 0 ? (
            <>
              <span className="text-5xl leading-none font-bold tabular-nums sm:text-6xl">
                {days}
              </span>
              <span className="text-base font-semibold sm:text-lg">ngày nữa tới tiệc</span>
            </>
          ) : days === 0 ? (
            <span className="text-2xl font-bold">Hôm nay là ngày tiệc!</span>
          ) : (
            <span className="text-xl font-semibold">Tiệc đã diễn ra</span>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <p className="text-lg font-bold tabular-nums">{formatEventDate(proposal.eventDate)}</p>
          <p className="text-sm text-white/90">
            {eventTypeLabel(summary?.eventType)} · Sảnh {offer.hall.name} ·{' '}
            {shiftLabel(offer.shift.code)} ({offer.shift.startTime}–{offer.shift.endTime})
          </p>
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            <span className={heroChip}>{bookingPhaseLabel(proposal.phase)}</span>
            <span className={heroChip}>{proposal.planningHeadcount} khách dự kiến</span>
            <span className={heroChip}>{offer.tableCount} bàn</span>
            <span className={heroChip}>{menuLines(offer).length} món</span>
          </div>
        </div>
      </header>

      <section className={cn(panel, 'flex flex-col gap-4')} aria-labelledby="journey-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="journey-title" className={panelTitle}>
            Hành trình cưới
          </h2>
          <span className="text-xs text-muted-foreground">
            {step < 0 ? 'Tiệc đã huỷ' : `Bước ${step + 1}/6 · ${journeySteps[step]}`}
          </span>
        </div>
        <JourneyStepper current={step} />
      </section>

      {tasks.length > 0 ? (
        <section className="flex flex-col gap-4" aria-labelledby="tasks-title">
          <h2 id="tasks-title" className={panelTitle}>
            Việc cần làm ngay
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {tasks.map((task) => (
              <article
                key={task.title}
                className={cn(
                  panel,
                  'flex flex-col gap-2 transition-[translate,box-shadow] duration-250 ease-hy-emphasized hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(43_29_34/0.1)] motion-reduce:hover:translate-y-0',
                  task.status === 'wait' && 'border-hy-warning/40',
                )}
              >
                {task.status === 'wait' ? <Badge variant="warning">Chờ bạn</Badge> : null}
                <h3 className="text-base font-bold">{task.title}</h3>
                <p className="flex-1 text-sm text-muted-foreground">{task.detail}</p>
                {task.href ? (
                  <Link
                    className={buttonVariants({
                      variant: task.status === 'wait' ? 'default' : 'secondary',
                      size: 'sm',
                      className: 'self-start',
                    })}
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

      <OverviewMultiBookings bookings={bookings} proposal={proposal} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className={cn(panel, 'flex flex-col gap-3')} aria-labelledby="latest-title">
          <header className="flex items-baseline justify-between gap-3">
            <h2 id="latest-title" className="text-base font-bold">
              Thông báo mới
            </h2>
            <Link
              className="text-xs font-semibold text-primary hover:underline"
              href={withBooking(routes.notifications, proposal.bookingId)}
            >
              Xem tất cả
            </Link>
          </header>
          <InlineError error={inbox.latestError} onRetry={inbox.retry} />
          {inbox.latest === null && inbox.latestError ? null : inbox.latest === null ? (
            <p className="text-sm text-muted-foreground" role="status">
              Đang tải thông báo…
            </p>
          ) : inbox.latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có thông báo nào.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {inbox.latest.map((item) => {
                const href = notificationHref(item);
                return (
                  <li key={item.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                    <span
                      className={cn('text-sm', item.readAt ? 'text-foreground' : 'font-semibold')}
                    >
                      {href ? (
                        <Link className="hover:text-primary" href={href}>
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </span>
                    <small className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </small>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section
          className="flex flex-col gap-2 rounded-xl bg-accent p-5 sm:p-6"
          aria-labelledby="contact-title"
        >
          <h2 id="contact-title" className="text-base font-bold">
            Liên hệ nhà hàng
          </h2>
          <p className="text-sm">{restaurant?.displayName ?? 'Nhà hàng Hỷ Yến'}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {restaurant?.publicPhone ? (
              <a
                className={buttonVariants({ size: 'sm' })}
                href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}
              >
                Gọi {restaurant.publicPhone}
              </a>
            ) : null}
            {restaurant?.publicEmail ? (
              <a
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                href={`mailto:${restaurant.publicEmail}`}
              >
                Email
              </a>
            ) : null}
          </div>
        </section>
      </div>

      <OverviewAliasModal
        isOpen={alias.open}
        dialogRef={aliasDialog}
        hasExistingAlias={Boolean(summary?.alias)}
        aliasInput={alias.input}
        setAliasInput={alias.setInput}
        savingAlias={alias.saving}
        aliasError={alias.error}
        onClose={alias.close}
        onSave={(event) => void alias.save(event)}
      />
    </div>
  );
}
