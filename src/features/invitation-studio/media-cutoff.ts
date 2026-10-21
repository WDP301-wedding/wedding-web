/** Mặc định của backend (MEDIA_LIMITS.cutoffLeadMs): khoá ảnh 72 giờ trước giờ khai tiệc. */
export const mediaCutoffLeadMs = 72 * 60 * 60 * 1000;

/**
 * Ước tính mốc khoá ảnh (ISO, UTC) từ ngày tiệc + giờ bắt đầu ca (giờ Việt Nam, UTC+7).
 *
 * Chỉ là ƯỚC TÍNH: nhà hàng có thể đổi mốc (media-policy, chỉ Manager đọc được). Vì vậy giao diện
 * dùng mốc này để CẢNH BÁO, không khoá cứng nút — backend vẫn là nơi quyết định (409
 * MEDIA_CUTOFF_REACHED). `null` khi dữ liệu không hợp lệ.
 */
export function estimateMediaCutoff(eventDate: string, startTime: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(eventDate) || !/^\d{2}:\d{2}$/u.test(startTime)) return null;
  const start = Date.parse(`${eventDate}T${startTime}:00+07:00`);
  return Number.isNaN(start) ? null : new Date(start - mediaCutoffLeadMs).toISOString();
}
