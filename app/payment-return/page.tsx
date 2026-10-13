'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { lastCheckoutKey } from '../../src/features/payments-billing/billing-page';

/**
 * Trang VNPay chuyển người dùng về sau khi thanh toán (cấu hình `VNPAY_RETURN_URL` ở backend).
 *
 * Quan trọng: các tham số `vnp_*` trên URL KHÔNG phải bằng chứng đã thanh toán (người dùng có thể
 * tự sửa URL). Kết quả thật do backend nhận qua IPN có chữ ký. Vì vậy trang này không đọc `vnp_*`,
 * chỉ chuyển sang trang Thanh toán để đọc trạng thái giao dịch từ backend.
 */
export default function PaymentReturnPage() {
  const [target, setTarget] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let next: string | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem(lastCheckoutKey) ?? 'null') as {
        bookingId?: unknown;
        attemptId?: unknown;
      } | null;
      if (typeof saved?.bookingId === 'string' && typeof saved.attemptId === 'string') {
        next = `/billing?${new URLSearchParams({ bookingId: saved.bookingId, attemptId: saved.attemptId }).toString()}`;
      }
    } catch {
      next = null;
    }
    // Xoá vnp_* khỏi thanh địa chỉ để không bị chia sẻ/ghi lại trong lịch sử.
    window.history.replaceState(null, '', window.location.pathname);
    if (next) {
      setTarget(next);
      window.location.replace(next);
    } else {
      setMissing(true);
    }
  }, []);

  return (
    <main className="public-section" style={{ maxWidth: 640, margin: '64px auto', padding: '0 16px' }}>
      <h1>Đang kiểm tra kết quả thanh toán</h1>
      <p>
        Kết quả chính thức do nhà hàng nhận trực tiếp từ VNPay và có thể mất vài giây. Trang này
        không tự xác nhận đã thanh toán.
      </p>
      {target ? (
        <p role="status">
          Đang chuyển tới <Link href={target}>trang trạng thái thanh toán</Link>…
        </p>
      ) : null}
      {missing ? (
        <p>
          Không tìm thấy giao dịch vừa tạo trên trình duyệt này. Hãy mở{' '}
          <Link href="/billing">trang Thanh toán</Link> và chọn hồ sơ để kiểm tra trạng thái.
        </p>
      ) : null}
    </main>
  );
}
