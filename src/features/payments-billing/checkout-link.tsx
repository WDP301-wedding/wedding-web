'use client';

import { useEffect, useState } from 'react';
import type { AttemptView, CheckoutView } from './billing-api';

type AttemptStatusCode = AttemptView['status'];

/**
 * Trạng thái mà đường dẫn VNPay cũ VẪN được mở lại.
 *
 * Vì sao có UNKNOWN: khi người dùng bấm "Kiểm tra trạng thái" trước khi trả tiền, backend hỏi VNPay
 * (querydr), chưa có kết quả nên chuyển giao dịch sang UNKNOWN. UNKNOWN KHÔNG phải trạng thái cuối
 * (backend vẫn cho đi tiếp sang SUCCEEDED/FAILED), và đường dẫn vẫn hợp lệ tới `expiresAt`.
 * Trước đây chỉ CREATED/PENDING được mở lại → người dùng mất cách quay lại quét QR.
 *
 * Mở lại an toàn: backend lưu tham số checkout và trả lại ĐÚNG đường dẫn cũ, không tạo giao dịch mới.
 */
export const reopenableStatuses: ReadonlySet<AttemptStatusCode> = new Set([
  'CREATED',
  'PENDING',
  'UNKNOWN',
]);

// setTimeout chỉ nhận tối đa ~24,8 ngày; quá mức này trình duyệt chạy ngay lập tức.
const maxTimerMs = 2 ** 31 - 1;

/**
 * `true` khi đã qua `expiresAt`. Tự cập nhật đúng lúc hết hạn mà không cần người dùng tải lại.
 *
 * Không gọi `Date.now()` trong lúc render (render phải "thuần"); thay vào đó giữ mốc thời gian
 * trong state và hẹn một timer để cập nhật state khi tới hạn.
 */
function useExpired(expiresAt: string): boolean {
  const [now, setNow] = useState(() => Date.now());
  const expiry = Date.parse(expiresAt);
  useEffect(() => {
    // delay = 0 khi đã quá hạn → cập nhật ngay ở lượt kế tiếp (vd. giao dịch được khôi phục khi đã cũ).
    const delay = Math.min(Math.max(0, expiry - Date.now()), maxTimerMs);
    const timer = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [expiry]);
  return Number.isNaN(expiry) || now >= expiry;
}

function useCountdown(expiresAt: string): string | null {
  const expiry = Date.parse(expiresAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Number.isNaN(expiry) || expiry <= Date.now()) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiry]);
  if (Number.isNaN(expiry) || now >= expiry) return null;
  const remainingSec = Math.max(0, Math.floor((expiry - now) / 1000));
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const timeFormat = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function CheckoutLinkPanel({
  checkout,
  status,
  onResetExpired,
}: Readonly<{
  checkout: CheckoutView;
  status: AttemptStatusCode;
  onResetExpired?: () => void;
}>) {
  const expired = useExpired(checkout.expiresAt);
  const countdown = useCountdown(checkout.expiresAt);
  const canReopen = reopenableStatuses.has(status) && !expired;
  return (
    <section className="billing-panel">
      <h2>Đường dẫn thanh toán đã được tạo</h2>
      <p>
        Mã giao dịch thanh toán: <code>{checkout.paymentAttemptId}</code>
      </p>
      {canReopen ? (
        <>
          <p>
            Chưa trả tiền hoặc lỡ đóng trang VNPay? Mở lại để quét mã QR — đường dẫn còn hiệu lực
            đến <strong>{timeFormat(checkout.expiresAt)}</strong>
            {countdown ? (
              <span> (còn <strong>{countdown}</strong>)</span>
            ) : null}
            . Mở lại không tạo giao dịch mới.
          </p>
          <a
            className="billing-primary-link"
            href={checkout.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Tiếp tục trên VNPay
          </a>
        </>
      ) : expired && reopenableStatuses.has(status) ? (
        <div role="status">
          <p>
            Đường dẫn đã hết hạn lúc {timeFormat(checkout.expiresAt)}. Nếu bạn đã trả tiền, hãy bấm
            “Kiểm tra trạng thái” bên dưới. Nếu chưa trả, bạn có thể bấm nút bên dưới để tạo phiên
            thanh toán mới (15 phút) hoặc liên hệ nhà hàng để được hỗ trợ.
          </p>
          {onResetExpired && (
            <button
              type="button"
              className="billing-secondary"
              onClick={onResetExpired}
              style={{ marginTop: '0.5rem' }}
            >
              Thanh toán lại (phiên 15 phút mới)
            </button>
          )}
        </div>
      ) : (
        <p>Kiểm tra trạng thái đã xác minh trước khi tiếp tục thanh toán.</p>
      )}
      <p>
        Sau khi quay lại, kiểm tra trạng thái bên dưới. Trang trả về từ VNPay không xác nhận đã nhận
        tiền.
      </p>
    </section>
  );
}
