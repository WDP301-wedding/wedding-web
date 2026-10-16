import { cache } from 'react';

import { createApiClient } from '../../lib/api/client';
import { readPublicEnv } from '../../lib/env';
import { createPublicGateway, type Hall, type Menu, type Restaurant } from './public-api';

/**
 * Thời gian làm mới ISR cho các trang công khai (giây).
 *
 * Vì sao 300s: ảnh catalog là signed URL hết hạn sau 15 phút (CATALOG signedReadTtlSeconds = 900
 * ở backend). Trang phải được dựng lại trước khi URL ảnh hết hạn, nên chọn 5 phút — đủ để gần như
 * mọi lượt xem nhận HTML có sẵn (nhanh), nhưng URL ảnh không bao giờ quá ~10 phút tuổi.
 */
export const catalogRevalidateSeconds = 300; // các app/**/page.tsx ghi lại số này dạng literal

/**
 * Base URL khi gọi API từ SERVER (lúc build và khi ISR làm mới).
 *
 * NEXT_PUBLIC_API_BASE_URL thường trỏ về chính web (`/api/v1`, đi qua rewrite để giữ cookie) —
 * lúc `next build` web chưa chạy nên server không tự gọi chính mình được. Vì vậy ưu tiên
 * BACKEND_ORIGIN (biến server, không lộ ra trình duyệt) để gọi thẳng backend.
 */
function serverBaseUrl(): string {
  const origin = process.env.BACKEND_ORIGIN?.replace(/\/+$/u, '');
  return origin ? `${origin}/api/v1` : readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
}

function serverGateway() {
  return createPublicGateway(createApiClient({ baseUrl: serverBaseUrl(), timeoutMs: 8_000 }));
}

export type Catalog = Readonly<{
  restaurant: Restaurant | null;
  halls: readonly Hall[];
  menus: readonly Menu[];
  /** true khi không gọi được backend → trang vẫn hiển thị, kèm lời nhắn và form tư vấn. */
  unavailable: boolean;
}>;

/**
 * Tải catalog công khai cho Server Component.
 *
 * - `cache()` của React: trong một lần render, nhiều component cùng gọi `loadCatalog()` chỉ
 *   tạo một lượt gọi API.
 * - Lỗi mạng KHÔNG làm hỏng build/trang: trả về danh sách rỗng + `unavailable`, lần ISR sau
 *   (≤ 5 phút) sẽ thử lại.
 */
export const loadCatalog = cache(async (): Promise<Catalog> => {
  let gateway: ReturnType<typeof createPublicGateway>;
  try {
    gateway = serverGateway();
  } catch {
    // Thiếu/sai biến môi trường API: vẫn render trang (rỗng) thay vì làm hỏng build.
    return { restaurant: null, halls: [], menus: [], unavailable: true };
  }
  const [restaurant, halls, menus] = await Promise.allSettled([
    gateway.restaurant(),
    gateway.halls(),
    gateway.menus(),
  ]);
  return {
    restaurant: restaurant.status === 'fulfilled' ? restaurant.value : null,
    halls: halls.status === 'fulfilled' ? halls.value.items : [],
    menus: menus.status === 'fulfilled' ? menus.value.items : [],
    unavailable: [restaurant, halls, menus].some((result) => result.status === 'rejected'),
  };
});

/** Một sảnh theo id; `null` khi không tồn tại (404) hoặc không tải được. */
export const loadHall = cache(async (hallId: string): Promise<Hall | null> => {
  try {
    return await serverGateway().hall(hallId);
  } catch {
    return null;
  }
});
