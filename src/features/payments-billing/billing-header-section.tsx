'use client';

import Link from 'next/link';
import React from 'react';
import { BrandMark } from '../../design-system/brand-mark';

export function BillingHeaderNav() {
  return (
    <header className="billing-header">
      <Link className="billing-wordmark" href="/" aria-label="Hỷ Yến — Trang chủ">
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
    <section className="billing-intro">
      <h1>Thanh toán cho ngày trọng đại</h1>
      <p>Xem khoản cọc, số dư và trạng thái đã được nhà hàng xác minh.</p>

      {!embedded && availableBookings.length > 0 && (
        <div className="billing-booking-select-wrapper mb-3 text-left">
          <label htmlFor="billing-booking-select" className="block text-sm font-medium mb-1">
            Chọn hồ sơ tiệc cưới của bạn:
          </label>
          <select
            id="billing-booking-select"
            value={currentBookingId}
            disabled={blocked}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId) onSelectBooking(selectedId);
            }}
            className="w-full min-h-[44px] px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#879883] bg-white text-sm"
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
      className="billing-lookup"
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
      <button disabled={blocked}>Mở thanh toán</button>
    </form>
  );
}

