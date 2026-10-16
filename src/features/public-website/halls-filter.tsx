'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Lọc sảnh theo số khách (`/sanh?khach=280`).
 *
 * Trang /sanh là Server Component + ISR (HTML dựng sẵn cho mọi người). Nếu Server Component đọc
 * `searchParams` thì trang thành động (render lại mỗi request) và mất ISR. Vì vậy server render
 * TẤT CẢ thẻ sảnh, còn phần lọc chạy ở trình duyệt: chỉ hiện sảnh đủ sức chứa.
 */
export function HallsFilter({
  items,
}: Readonly<{ items: readonly { id: string; maxGuests: number; card: ReactNode }[] }>) {
  const router = useRouter();
  const query = useSearchParams();
  const guests = Number(query.get('khach'));
  const active = Number.isInteger(guests) && guests > 0;
  const visible = active ? items.filter((hall) => hall.maxGuests >= guests) : items;
  const shown = visible.length;

  return (
    <>
      <form
        className="hy-filter"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const raw = new FormData(event.currentTarget).get('khach');
          const value = typeof raw === 'string' ? raw.trim() : '';
          router.replace(value ? `/sanh?khach=${encodeURIComponent(value)}` : '/sanh', {
            scroll: false,
          });
        }}
      >
        <label>
          Số khách dự kiến
          <input
            name="khach"
            type="number"
            min={1}
            max={10000}
            inputMode="numeric"
            defaultValue={active ? guests : undefined}
            placeholder="Ví dụ 280"
          />
        </label>
        <button className="button button-secondary" type="submit">
          Lọc sảnh
        </button>
        {active ? (
          <p role="status">
            {shown > 0
              ? `${shown} sảnh đủ chỗ cho ${guests} khách`
              : `Chưa có sảnh nào đủ ${guests} khách — gửi yêu cầu để được tư vấn phương án.`}
          </p>
        ) : null}
      </form>
      {/* Thẻ sảnh (`card`) đã được Server Component render sẵn; ở đây chỉ chọn thẻ nào hiện. */}
      <div className="hy-hall-grid">
        {visible.map((hall) => (
          <div key={hall.id}>{hall.card}</div>
        ))}
      </div>
    </>
  );
}
