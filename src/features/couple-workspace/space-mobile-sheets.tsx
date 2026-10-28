import React from 'react';
import Link from 'next/link';
import { routes } from '../../routes';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  shiftLabel,
  type BookingSummary,
} from './use-couple-workspace';
import { Icon, SupportCard } from './space-icons';
import type { Chip } from './space-nav-config';

export function SpaceMoreSheet({
  chips,
  href,
  moreOpen,
  onClose,
  phone,
  unread,
}: Readonly<{
  chips: Record<string, Chip | undefined>;
  href: (path: string) => string;
  moreOpen: boolean;
  onClose: () => void;
  phone: string | null;
  unread: number | null;
}>) {
  if (!moreOpen) return null;

  return (
    <div className="hy-space-sheet-backdrop" onClick={onClose}>
      <div
        id="space-more-sheet"
        className="hy-space-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Thêm"
        onClick={(event) => event.stopPropagation()}
      >
        <Link prefetch={false} href={href(routes.settle)} onClick={onClose}>
          <Icon name="receipt" /> Quyết toán
          {chips.settle ? (
            <span className={`hy-nav-chip is-${chips.settle.tone}`}>{chips.settle.label}</span>
          ) : null}
        </Link>
        <Link prefetch={false} href={href(routes.notifications)} onClick={onClose}>
          <Icon name="bell" /> Thông báo
          {unread ? <span className="hy-nav-count">{unread}</span> : null}
        </Link>
        <Link href={routes.profile} onClick={onClose}>
          <Icon name="person" /> Hồ sơ
        </Link>
        <Link href={routes.home} onClick={onClose}>
          <Icon name="back" /> Trang chủ
        </Link>
        <SupportCard phone={phone} />
      </div>
    </div>
  );
}

export function SpaceBookingSwitcherSheet({
  bookingId,
  bookings,
  onClose,
  onSelectBooking,
  switcherOpen,
}: Readonly<{
  bookingId: string | null;
  bookings: readonly BookingSummary[];
  onClose: () => void;
  onSelectBooking: (bookingId: string) => void;
  switcherOpen: boolean;
}>) {
  if (!switcherOpen) return null;

  return (
    <div className="hy-space-sheet-backdrop" onClick={onClose}>
      <div
        id="booking-switch-sheet"
        className="hy-space-sheet hy-booking-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách tiệc cưới"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hy-booking-sheet-header">
          <div>
            <h3>Danh sách tiệc của bạn</h3>
            <p>
              Bạn có {bookings.length} tiệc đang được quản lý. Chạm vào tiệc để chuyển không gian
              làm việc.
            </p>
          </div>
          <button
            type="button"
            className="hy-sheet-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="hy-booking-sheet-list">
          {bookings.map((b) => {
            const isCurrent = b.bookingId === bookingId;
            return (
              <button
                key={b.bookingId}
                type="button"
                className={`hy-booking-sheet-item ${isCurrent ? 'is-selected' : ''}`}
                onClick={() => {
                  onSelectBooking(b.bookingId);
                  onClose();
                }}
              >
                <div className="hy-booking-sheet-item-header">
                  <strong className="hy-booking-sheet-title">{bookingDisplayName(b)}</strong>
                  <span
                    className={`hy-nav-chip is-${
                      b.phase === 'CONFIRMED' || b.phase === 'COMPLETED'
                        ? 'done'
                        : b.phase === 'CANCELLED'
                          ? 'off'
                          : 'wait'
                    }`}
                  >
                    {bookingPhaseLabel(b.phase)}
                  </span>
                </div>
                <div className="hy-booking-sheet-details">
                  <span>{b.hallName}</span>
                  <span>
                    {formatEventDate(b.eventDate)} ({shiftLabel(b.shiftCode)})
                  </span>
                </div>
                {isCurrent ? (
                  <span className="hy-booking-sheet-current-tag">✓ Đang hiển thị tiệc này</span>
                ) : (
                  <span className="hy-booking-sheet-switch-tag">Chuyển sang tiệc này →</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="hy-booking-sheet-footer">
          <Link
            href={routes.consultation}
            className="hy-booking-sheet-add-btn"
            onClick={onClose}
          >
            + Đăng ký đặt thêm tiệc mới
          </Link>
        </div>
      </div>
    </div>
  );
}
