'use client';
import { useSyncExternalStore } from 'react';

import { Illustration } from './illustrations';

/**
 * Banner "mất kết nối" dùng chung cho toàn web.
 *
 * Dùng `useSyncExternalStore` thay cho useState + useEffect: trình duyệt là "nguồn dữ liệu ngoài"
 * (navigator.onLine + sự kiện online/offline), React tự đăng ký/huỷ và không render lệch giữa
 * server với client (server luôn coi là đang online).
 */
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="hy-offline" role="status">
      <Illustration name="empty-mat-mang" size={28} className="hy-offline-icon" />
      <strong>Không có kết nối mạng.</strong> Bạn vẫn xem được nội dung đang mở; các thao tác lưu,
      duyệt và thanh toán sẽ cần kết nối lại.
    </div>
  );
}
