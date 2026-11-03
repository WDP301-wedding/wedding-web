'use client';
import { HySelect } from '../../components/ui/select-field';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

import { BrandMark } from '../../design-system/brand-mark';
import { routes } from '../../routes';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  shiftLabel,
  type BookingSummary,
  type Proposal,
} from './use-couple-workspace';
import { Icon } from './space-icons';

const phaseTone = (phase: BookingSummary['phase']) =>
  phase === 'CONFIRMED' || phase === 'COMPLETED'
    ? 'bg-hy-success-bg text-hy-success'
    : phase === 'CANCELLED'
      ? 'bg-secondary text-muted-foreground'
      : 'bg-hy-warning-bg text-hy-warning';

/** Thanh trên: tiệc đang xem, đổi tiệc (select trên màn rộng, sheet trên điện thoại) và chuông. */
export function SpaceTopbar({
  summary,
  proposal,
  bookings,
  bookingId,
  unread,
  href,
  switcherOpen,
  onOpenSwitcher,
  onSwitch,
}: Readonly<{
  summary: BookingSummary | undefined;
  proposal: Proposal | undefined;
  bookings: readonly BookingSummary[];
  bookingId: string | null;
  unread: number | null;
  href: (path: string) => string;
  switcherOpen: boolean;
  onOpenSwitcher: () => void;
  onSwitch: (bookingId: string) => void;
}>) {
  return (
    <header className="sticky top-0 z-[100] flex min-h-16 items-center gap-3 border-b border-border bg-card px-4 py-2 sm:px-6 lg:px-10">
      <Link className="lg:hidden" href={href(routes.space)} aria-label="Hỷ Yến — Tổng quan">
        <BrandMark compact />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col max-lg:hidden">
        {summary ? (
          <>
            <strong className="truncate text-sm">{bookingDisplayName(summary)}</strong>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {summary.hallName} · {formatEventDate(summary.eventDate)} ·{' '}
                {shiftLabel(summary.shiftCode)}
                {proposal ? ` · ${proposal.planningHeadcount} khách` : ''}
              </span>
              <span
                className={`rounded-full px-2 text-2xs leading-5 font-semibold ${phaseTone(summary.phase)}`}
              >
                {bookingPhaseLabel(summary.phase)}
              </span>
            </span>
          </>
        ) : proposal ? (
          <>
            <strong className="truncate text-sm">
              {bookingDisplayName({ hallName: proposal.proposal.hall.name })}
            </strong>
            <span className="text-xs text-muted-foreground tabular-nums">
              {proposal.proposal.hall.name} · {formatEventDate(proposal.eventDate)} ·{' '}
              {shiftLabel(proposal.proposal.shift.code)} · {proposal.planningHeadcount} khách
            </span>
          </>
        ) : (
          <strong className="text-sm">Không gian cưới</strong>
        )}
      </div>
      {bookings.length > 1 && bookingId ? (
        <>
          <label className="relative max-lg:hidden">
            <span className="sr-only">Đổi tiệc cưới</span>
            <HySelect
              className="h-10 max-w-[360px] cursor-pointer appearance-none truncate rounded-lg border border-input bg-card pr-9 pl-3 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              value={bookingId}
              onChange={(event) => onSwitch(event.target.value)}
            >
              {bookings.map((booking) => (
                <option key={booking.bookingId} value={booking.bookingId}>
                  {bookingDisplayName(booking)} · {booking.hallName} ·{' '}
                  {formatEventDate(booking.eventDate)} · {shiftLabel(booking.shiftCode)} [
                  {bookingPhaseLabel(booking.phase)}]
                </option>
              ))}
            </HySelect>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </label>
          <button
            type="button"
            className="ml-auto flex h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-left lg:hidden"
            onClick={onOpenSwitcher}
            aria-expanded={switcherOpen}
            aria-controls="booking-switch-sheet"
          >
            <span className="flex min-w-0 flex-col">
              <strong className="truncate text-sm">
                {summary ? bookingDisplayName(summary) : 'Đổi tiệc'}
              </strong>
              <span className="text-2xs text-muted-foreground">{bookings.length} tiệc</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </>
      ) : null}
      <Link
        className={`relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary ${bookings.length > 1 && bookingId ? '' : 'max-lg:ml-auto'}`}
        href={href(routes.notifications)}
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
      >
        <Icon name="bell" />
        {unread ? (
          <span className="absolute top-1.5 right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </Link>
    </header>
  );
}
