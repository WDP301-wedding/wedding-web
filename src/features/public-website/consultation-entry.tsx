'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { ConsultationForm } from './consultation-form';
import type { Hall, Menu } from './public-api';

const isoDate = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * Form tư vấn đọc lựa chọn trên URL (?sanh=&thuc-don=&ngay=&khach=&ca=) do công cụ ước tính
 * hoặc trang sảnh/thực đơn gửi sang. Đổi id → tên bằng catalog Server Component truyền xuống;
 * id lạ (link cũ, sảnh đã ẩn) thì bỏ qua thay vì báo lỗi.
 */
export function ConsultationEntry({
  halls,
  menus,
}: Readonly<{ halls: readonly Hall[]; menus: readonly Menu[] }>) {
  const router = useRouter();
  const query = useSearchParams();
  const date = query.get('ngay');
  const guests = Number(query.get('khach'));
  const shift = query.get('ca');
  return (
    <ConsultationForm
      halls={halls}
      menus={menus}
      prefill={{
        date: date && isoDate.test(date) ? date : undefined,
        guests: Number.isInteger(guests) && guests > 0 && guests <= 10_000 ? guests : undefined,
        shift: shift === 'trua' ? 'LUNCH' : shift === 'toi' ? 'DINNER' : undefined,
        hallId: halls.find((hall) => hall.id === query.get('sanh'))?.id,
        menuVersionId: menus.find((menu) => menu.id === query.get('thuc-don'))?.versionId,
        hallName: halls.find((hall) => hall.id === query.get('sanh'))?.name,
        menuName: menus.find((menu) => menu.id === query.get('thuc-don'))?.name,
      }}
      onSent={() => router.push('/tu-van/da-gui')}
    />
  );
}
