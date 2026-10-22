'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

/**
 * Thông báo nổi (toast) dùng chung toàn hệ thống, xây trên thư viện `sonner`.
 *
 * Vì sao gom về một chỗ:
 * - Mọi trang gọi `notify.success/error` thay vì tự dựng khối "Đã lưu…" inline → giao diện thống
 *   nhất, đổi kiểu hiển thị chỉ sửa ở file này.
 * - Thông báo lỗi luôn kèm "Mã hỗ trợ" (requestId của backend) để nhà hàng tra log khi cần.
 * - Toast không đẩy layout: trước đây khối inline chèn vào giữa trang làm nội dung bên dưới nhảy.
 *
 * `<AppToaster />` chỉ gắn MỘT lần ở `app/layout.tsx`; `notify.*` gọi được ở bất cứ đâu
 * (kể cả ngoài component) vì sonner giữ hàng đợi toast ở module dùng chung.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      // Lỗi cần đọc kỹ hơn → hiển thị lâu hơn thành công (xem notify.error).
      duration={4000}
      visibleToasts={4}
      toastOptions={{
        className: 'hy-toast',
        closeButtonAriaLabel: 'Đóng thông báo',
        classNames: {
          success: 'hy-toast-success',
          error: 'hy-toast-error',
          description: 'hy-toast-description',
          closeButton: 'hy-toast-close',
        },
      }}
      // Nhãn đọc màn hình bằng tiếng Việt cho vùng thông báo.
      containerAriaLabel="Thông báo"
    />
  );
}

export const notify = {
  success(message: string) {
    return toast.success(message);
  },
  /**
   * @param requestId mã yêu cầu backend trả về (nếu có) — hiển thị dạng "Mã hỗ trợ: …".
   */
  error(message: string, requestId?: string | null) {
    return toast.error(message, {
      duration: 7000,
      ...(requestId ? { description: `Mã hỗ trợ: ${requestId}` } : {}),
    });
  },
  info(message: string) {
    return toast(message);
  },
};

/**
 * Cho trang tự giữ `notice`/`error` dạng chuỗi: mỗi khi giá trị đổi sang chuỗi mới thì hiện toast.
 * (useEffect ở đây là "đồng bộ state React với hệ thống bên ngoài" = hàng đợi toast của sonner.)
 * Trang nên đặt lại `null` trước mỗi thao tác để cùng một thông báo lặp lại vẫn hiện lần nữa.
 */
export function useToastFeedback(notice: string | null, error: string | null) {
  useEffect(() => {
    if (notice) notify.success(notice);
  }, [notice]);
  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
}
