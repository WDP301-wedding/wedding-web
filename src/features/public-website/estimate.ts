import type { Hall, Menu } from './public-api';

/** Mỗi bàn 10 khách (quy ước của nhà hàng, cũng là cách backend tính `tableCount`). */
export const guestsPerTable = 10;

/** Số bàn = làm tròn LÊN (281 khách → 29 bàn, không để 1 khách đứng). */
export function tableCount(guests: number): number {
  if (!Number.isFinite(guests) || guests <= 0) return 0;
  return Math.ceil(guests / guestsPerTable);
}

/**
 * Sảnh đủ chỗ cho số khách, xếp sảnh "vừa nhất" lên đầu (sức chứa nhỏ nhất mà vẫn đủ)
 * để tránh gợi ý sảnh quá rộng cho tiệc nhỏ.
 */
export function suitableHalls(halls: readonly Hall[], guests: number): Hall[] {
  return halls
    .filter((hall) => hall.maxGuests >= guests)
    .toSorted((left, right) => left.maxGuests - right.maxGuests);
}

export type MenuEstimate = Readonly<{ menu: Menu; tables: number; totalVnd: number }>;

/** Chi phí ước tính theo từng thực đơn = số bàn × giá/bàn (chưa gồm dịch vụ, VAT). */
export function menuEstimates(menus: readonly Menu[], guests: number): MenuEstimate[] {
  const tables = tableCount(guests);
  return menus.map((menu) => ({ menu, tables, totalVnd: tables * menu.priceVndPerTable }));
}

export const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

/** Link "Gửi yêu cầu tư vấn với lựa chọn này" → form tư vấn tự điền sẵn. */
export function consultationHref(choice: {
  hallId?: string | undefined;
  menuId?: string | undefined;
  date?: string | undefined;
  guests?: number | undefined;
  shift?: 'LUNCH' | 'DINNER' | undefined;
}): string {
  const query = new URLSearchParams();
  if (choice.hallId) query.set('sanh', choice.hallId);
  if (choice.menuId) query.set('thuc-don', choice.menuId);
  if (choice.date) query.set('ngay', choice.date);
  if (choice.guests) query.set('khach', String(choice.guests));
  if (choice.shift) query.set('ca', choice.shift === 'LUNCH' ? 'trua' : 'toi');
  const suffix = query.toString();
  return suffix ? `/tu-van?${suffix}` : '/tu-van';
}
