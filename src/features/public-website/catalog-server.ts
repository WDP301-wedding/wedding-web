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
export const catalogRevalidateSeconds = 0; // Luôn render động để URL ảnh không bị hết hạn 15 phút

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

let cachedCatalog: { data: Catalog; expiresAt: number } | null = null;
const CATALOG_IN_MEMORY_TTL_MS = 60_000; // 60s: đảm bảo URL ảnh (TTL 15m) luôn còn hạn ≥14 phút

/**
 * Kiểm tra xem signed URL còn hạn ít nhất `minRemainingSeconds` giây nữa không.
 * Nếu còn dưới ngưỡng thì coi như cần làm mới để người dùng không bao giờ gặp link sắp hết hạn.
 */
function isSignedUrlValid(urlStr?: string, minRemainingSeconds = 120): boolean {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    const expiresParam = parsed.searchParams.get('expires');
    if (expiresParam) {
      const expiresAtSec = Number(expiresParam);
      if (!Number.isNaN(expiresAtSec)) {
        const nowSec = Math.floor(Date.now() / 1000);
        return expiresAtSec - nowSec > minRemainingSeconds;
      }
    }
  } catch {
    // URL không hợp lệ thì để hàm gọi tự xử lý
  }
  return true;
}

function areCatalogMediaUrlsValid(catalog: Catalog): boolean {
  for (const hall of catalog.halls) {
    for (const media of hall.media) {
      if (!isSignedUrlValid(media.signedUrl)) return false;
    }
  }
  for (const menu of catalog.menus) {
    for (const media of menu.media) {
      if (!isSignedUrlValid(media.signedUrl)) return false;
    }
  }
  return true;
}

/**
 * Tải catalog công khai cho Server Component.
 *
 * - Giữ bộ nhớ đệm ngắn 60s để tránh gọi liên tục vào backend khi có nhiều lượt truy cập,
 *   đồng thời chủ động kiểm tra thời hạn signed URL để đảm bảo người dùng luôn nhận
 *   link còn hạn dài (không bao giờ bị lỗi 403 ở lần mở đầu tiên).
 */
export const loadCatalog = cache(async (): Promise<Catalog> => {
  const now = Date.now();
  if (
    cachedCatalog &&
    cachedCatalog.expiresAt > now &&
    areCatalogMediaUrlsValid(cachedCatalog.data)
  ) {
    return cachedCatalog.data;
  }

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
  const data: Catalog = {
    restaurant: restaurant.status === 'fulfilled' ? restaurant.value : null,
    halls: halls.status === 'fulfilled' ? halls.value.items : [],
    menus: menus.status === 'fulfilled' ? menus.value.items : [],
    unavailable: [restaurant, halls, menus].some((result) => result.status === 'rejected'),
  };
  if (!data.unavailable) {
    cachedCatalog = { data, expiresAt: now + CATALOG_IN_MEMORY_TTL_MS };
  }
  return data;
});

const hallCache = new Map<string, { data: Hall | null; expiresAt: number }>();

/** Một sảnh theo id; `null` khi không tồn tại (404) hoặc không tải được. */
export const loadHall = cache(async (hallId: string): Promise<Hall | null> => {
  const now = Date.now();
  const existing = hallCache.get(hallId);
  const hallValid = existing?.data
    ? existing.data.media.every((m) => isSignedUrlValid(m.signedUrl))
    : true;
  if (existing && existing.expiresAt > now && hallValid) {
    return existing.data;
  }
  try {
    const hall = await serverGateway().hall(hallId);
    if (hall) {
      hallCache.set(hallId, { data: hall, expiresAt: now + CATALOG_IN_MEMORY_TTL_MS });
    }
    return hall;
  } catch {
    return null;
  }
});
