'use client';

import Link from 'next/link';
import React from 'react';
import { BrandMark } from '../../design-system/brand-mark';
import { bx } from './billing-classes';

export function BillingHeaderNav() {
  return (
    <header className={bx.header}>
      <Link href="/" aria-label="Hỷ Yến — Trang chủ">
        <BrandMark compact />
      </Link>
      <nav aria-label="Không gian cặp đôi">
        <Link href="/khong-gian/thoa-thuan/kich-ban">Đề xuất và kịch bản</Link>
        <Link href="/khong-gian/thanh-toan" aria-current="page">
          Thanh toán
        </Link>
      </nav>
    </header>
  );
}

export function BillingIntroSection({
  embedded,
  availableBookings,
  currentBookingId,
  blocked,
  onSelectBooking,
}: Readonly<{
  embedded: boolean;
  availableBookings: readonly { bookingId: string; label: string }[];
  currentBookingId: string;
  blocked: boolean;
  onSelectBooking: (bookingId: string) => void;
}>) {
  return (
    <section className={bx.intro}>
      <h1>Thanh toán cho ngày trọng đại</h1>
      <p>Xem khoản cọc, số dư và trạng thái đã được nhà hàng xác minh.</p>

      {!embedded && availableBookings.length > 0 && (
        <div className={bx.selectWrapper}>
          <label htmlFor="billing-booking-select">Chọn hồ sơ tiệc cưới của bạn:</label>
          <select
            id="billing-booking-select"
            value={currentBookingId}
            disabled={blocked}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) onSelectBooking(selectedId);
            }}
          >
            <option value="">-- Danh sách tiệc cưới đã lưu --</option>
            {availableBookings.map((b) => (
              <option key={b.bookingId} value={b.bookingId}>
                {b.label} (#{b.bookingId.slice(0, 8)})
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}

export function BillingLookupForm({
  bookingId,
  blocked,
  onBookingIdChange,
  onSubmit,
}: Readonly<{
  bookingId: string;
  blocked: boolean;
  onBookingIdChange: (value: string) => void;
  onSubmit: (bookingId: string) => void;
}>) {
  return (
    <form
      className={bx.lookup}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(bookingId.trim());
      }}
    >
      <label>
        Mã hồ sơ đặt tiệc
        <input
          required
          value={bookingId}
          disabled={blocked}
          onChange={(event) => {
            if (blocked) return;
            onBookingIdChange(event.target.value);
          }}
        />
      </label>
      <button className={bx.button} disabled={blocked}>
        Mở thanh toán
      </button>
    </form>
  );
}
