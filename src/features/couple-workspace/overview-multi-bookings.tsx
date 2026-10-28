'use client';

import Link from 'next/link';
import React from 'react';
import { routes, withBooking } from '../../routes';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  formatVnd,
  shiftLabel,
  type BookingSummary,
  type Proposal,
} from './use-couple-workspace';
import { daysUntil } from './overview-tasks';

export interface OverviewMultiBookingsProps {
  bookings: readonly BookingSummary[];
  proposal: Proposal;
}

export function OverviewMultiBookings({ bookings, proposal }: OverviewMultiBookingsProps) {
  if (bookings.length <= 1) return null;

  const totalAllVnd = bookings.reduce((sum, b) => sum + (b.totalVnd ?? 0), 0);
  const depositAllVnd = bookings.reduce((sum, b) => sum + (b.depositPaidVnd ?? 0), 0);
  const remainingAllVnd = Math.max(0, totalAllVnd - depositAllVnd);

  return (
    <section className="hy-multi-bookings-section" aria-labelledby="multi-bookings-heading">
      <div className="hy-multi-bookings-head">
        <div>
          <h2 id="multi-bookings-heading">Các sự kiện tiệc của hai bạn</h2>
          <p className="hy-muted">
            Tài khoản đang quản lý {bookings.length} tiệc cưới/báo hỷ. Bấm để chuyển đổi không
            gian.
          </p>
        </div>
      </div>

      <div className="hy-multi-budget-summary">
        <div className="hy-multi-budget-item">
          <span className="hy-multi-budget-label">Tổng ngân sách các tiệc</span>
          <strong className="hy-multi-budget-value">{formatVnd(totalAllVnd)}</strong>
        </div>
        <div className="hy-multi-budget-divider" />
        <div className="hy-multi-budget-item">
          <span className="hy-multi-budget-label">Đã đặt cọc</span>
          <strong className="hy-multi-budget-value is-paid">{formatVnd(depositAllVnd)}</strong>
        </div>
        <div className="hy-multi-budget-divider" />
        <div className="hy-multi-budget-item">
          <span className="hy-multi-budget-label">Còn lại cần thanh toán</span>
          <strong className="hy-multi-budget-value is-remaining">
            {formatVnd(remainingAllVnd)}
          </strong>
        </div>
      </div>

      <div className="hy-multi-grid">
        {bookings.map((b) => {
          const isCurrent = b.bookingId === proposal.bookingId;
          const bDays = daysUntil(b.eventDate);
          const phaseTone =
            b.phase === 'CONFIRMED' || b.phase === 'COMPLETED'
              ? 'done'
              : b.phase === 'CANCELLED'
                ? 'off'
                : 'wait';
          return (
            <article
              key={b.bookingId}
              className={`hy-multi-card ${isCurrent ? 'is-active' : ''}`}
            >
              <div className="hy-multi-card-top">
                <div>
                  <h3 className="hy-multi-card-title">{bookingDisplayName(b)}</h3>
                  <p className="hy-multi-card-hall">
                    {b.hallName} · {shiftLabel(b.shiftCode)}
                  </p>
                </div>
                <span className={`hy-nav-chip is-${phaseTone}`}>
                  {bookingPhaseLabel(b.phase)}
                </span>
              </div>

              <div className="hy-multi-card-meta">
                <div>
                  <span className="hy-muted">Ngày tổ chức:</span>{' '}
                  <strong>{formatEventDate(b.eventDate)}</strong>
                </div>
                <div>
                  <span className="hy-muted">Thời gian:</span>{' '}
                  <span className="hy-multi-countdown-pill">
                    {bDays > 0 ? `Còn ${bDays} ngày` : bDays === 0 ? 'Hôm nay' : 'Đã diễn ra'}
                  </span>
                </div>
                {b.totalVnd !== undefined ? (
                  <div>
                    <span className="hy-muted">Chi phí tiệc:</span>{' '}
                    <strong>{formatVnd(b.totalVnd)}</strong>
                    {b.depositPaidVnd ? (
                      <span className="hy-multi-paid-sub">
                        {' '}
                        (đã cọc {formatVnd(b.depositPaidVnd)})
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="hy-multi-card-actions">
                {isCurrent ? (
                  <span className="hy-multi-current-badge">✓ Đang thao tác tiệc này</span>
                ) : (
                  <Link
                    href={withBooking(routes.space, b.bookingId)}
                    className="button button-secondary hy-multi-switch-link"
                  >
                    Chuyển tới tiệc này →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
