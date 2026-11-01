'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';

import { routes, withBooking } from '../../routes';
import { daysUntil } from './overview-tasks';
import { chipClass, panel, panelTitle } from './space-classes';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  formatVnd,
  shiftLabel,
  type BookingSummary,
  type Proposal,
} from './use-couple-workspace';

export interface OverviewMultiBookingsProps {
  bookings: readonly BookingSummary[];
  proposal: Proposal;
}

export function OverviewMultiBookings({ bookings, proposal }: OverviewMultiBookingsProps) {
  if (bookings.length <= 1) return null;

  const totalAllVnd = bookings.reduce((sum, b) => sum + (b.totalVnd ?? 0), 0);
  const depositAllVnd = bookings.reduce((sum, b) => sum + (b.depositPaidVnd ?? 0), 0);
  const remainingAllVnd = Math.max(0, totalAllVnd - depositAllVnd);
  const totals = [
    { label: 'Tổng ngân sách các tiệc', value: totalAllVnd, tone: '' },
    { label: 'Đã đặt cọc', value: depositAllVnd, tone: 'text-hy-success' },
    { label: 'Còn lại cần thanh toán', value: remainingAllVnd, tone: 'text-primary' },
  ];

  return (
    <section className={cn(panel, 'flex flex-col gap-4')} aria-labelledby="multi-bookings-heading">
      <div className="flex flex-col gap-1">
        <h2 id="multi-bookings-heading" className={panelTitle}>
          Các sự kiện tiệc của hai bạn
        </h2>
        <p className="text-xs text-muted-foreground">
          Tài khoản đang quản lý {bookings.length} tiệc cưới/báo hỷ. Bấm để chuyển đổi không gian.
        </p>
      </div>
      <dl className="grid divide-border rounded-lg bg-muted max-sm:divide-y sm:grid-cols-3 sm:divide-x">
        {totals.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className={cn('text-base font-bold tabular-nums', item.tone)}>
              {formatVnd(item.value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 md:grid-cols-2">
        {bookings.map((b) => {
          const isCurrent = b.bookingId === proposal.bookingId;
          const bDays = daysUntil(b.eventDate);
          const tone =
            b.phase === 'CONFIRMED' || b.phase === 'COMPLETED'
              ? 'done'
              : b.phase === 'CANCELLED'
                ? 'off'
                : 'wait';
          return (
            <article
              key={b.bookingId}
              className={cn(
                'flex flex-col gap-3 rounded-lg border p-4',
                isCurrent ? 'border-primary bg-accent/40' : 'border-border',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <h3 className="truncate text-sm font-bold">{bookingDisplayName(b)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {b.hallName} · {shiftLabel(b.shiftCode)}
                  </p>
                </div>
                <span className={chipClass(tone)}>{bookingPhaseLabel(b.phase)}</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs tabular-nums">
                <dt className="text-muted-foreground">Ngày tổ chức:</dt>
                <dd className="font-semibold">{formatEventDate(b.eventDate)}</dd>
                <dt className="text-muted-foreground">Thời gian:</dt>
                <dd>{bDays > 0 ? `Còn ${bDays} ngày` : bDays === 0 ? 'Hôm nay' : 'Đã diễn ra'}</dd>
                {b.totalVnd !== undefined ? (
                  <>
                    <dt className="text-muted-foreground">Chi phí tiệc:</dt>
                    <dd>
                      <strong>{formatVnd(b.totalVnd)}</strong>
                      {b.depositPaidVnd ? (
                        <span className="text-muted-foreground">
                          {' '}
                          (đã cọc {formatVnd(b.depositPaidVnd)})
                        </span>
                      ) : null}
                    </dd>
                  </>
                ) : null}
              </dl>
              {isCurrent ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-hy-success">
                  <Check className="size-3.5" aria-hidden="true" />
                  Đang thao tác tiệc này
                </span>
              ) : (
                <Link
                  href={withBooking(routes.space, b.bookingId)}
                  className="self-start text-xs font-semibold text-primary hover:underline"
                >
                  Chuyển tới tiệc này
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
