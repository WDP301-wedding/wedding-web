'use client';

import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';

import { routes } from '../../../../src/routes';
import { lastCheckoutKey } from '../../../../src/features/payments-billing/billing-page';

/**
 * Trang VNPay chuyển người dùng về sau khi thanh toán (cấu hình `VNPAY_RETURN_URL` ở backend,
 * nên đổi thành `<web>/khong-gian/thanh-toan/ket-qua`; URL cũ `/payment-return` vẫn chuyển hướng 308).
 *
 * Quan trọng: các tham số `vnp_*` trên URL KHÔNG phải bằng chứng đã thanh toán (người dùng có thể
 * tự sửa URL). Kết quả thật do backend nhận qua IPN có chữ ký. Vì vậy trang này không đọc `vnp_*`,
 * chỉ chuyển sang trang Thanh toán để đọc trạng thái giao dịch từ backend.
 */
const noSubscribe = () => () => undefined;

let cachedTarget: string | null | undefined;
function readSavedTarget(): string | null {
  // Trả cùng một giá trị cho mỗi lần gọi (yêu cầu của useSyncExternalStore).
  if (cachedTarget !== undefined) return cachedTarget;
  cachedTarget = computeTarget();
  return cachedTarget;
}

function computeTarget(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const txnRef = searchParams.get('vnp_TxnRef');
    let raw = txnRef ? localStorage.getItem(`${lastCheckoutKey}.${txnRef}`) : null;
    if (!raw) {
      raw = localStorage.getItem(lastCheckoutKey);
    }
    if (!raw) return null;
    let bookingId: string | undefined;
    let attemptId: string | undefined;
    try {
      const parsed = JSON.parse(raw) as { bookingId?: unknown; attemptId?: unknown } | string;
      if (typeof parsed === 'string') {
        bookingId = parsed;
        attemptId = txnRef ?? undefined;
      } else if (parsed && typeof parsed === 'object') {
        if (typeof parsed.bookingId === 'string') bookingId = parsed.bookingId;
        if (typeof parsed.attemptId === 'string') attemptId = parsed.attemptId;
      }
    } catch {
      bookingId = raw;
      attemptId = txnRef ?? undefined;
    }
    if (bookingId && attemptId) {
      if (txnRef) {
        try {
          localStorage.removeItem(`${lastCheckoutKey}.${txnRef}`);
        } catch {
          // Bỏ qua lỗi storage
        }
      }
      return `${routes.payment}?${new URLSearchParams({ bookingId, attemptId }).toString()}`;
    }
  } catch {
    // Storage bị chặn hoặc dữ liệu hỏng.
  }
  return null;
}

export default function PaymentReturnPage() {
  // useSyncExternalStore: phía server trả `undefined` (đang kiểm tra), phía trình duyệt đọc
  // localStorage → tránh lệch nội dung giữa server render và hydration.
  const target = useSyncExternalStore(noSubscribe, readSavedTarget, () => undefined);

  useEffect(() => {
    if (target === undefined) return;
    // Xoá vnp_* khỏi thanh địa chỉ để không bị chia sẻ/ghi lại trong lịch sử.
    window.history.replaceState(null, '', window.location.pathname);
    if (target) window.location.replace(target);
  }, [target]);
  const missing = target === null;

  return (
    <section className="cw-card hy-result">
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
          <Link href={routes.payment}>trang Thanh toán</Link> để xem trạng thái mới nhất.
        </p>
      ) : null}
    </section>
  );
}
