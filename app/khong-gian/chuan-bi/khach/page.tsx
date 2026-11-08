'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Skeleton } from '../../../../src/design-system/skeleton';
import { GuestsPage } from '../../../../src/features/guest-management/guests-page';
import { useCoupleWorkspace } from '../../../../src/features/couple-workspace/use-couple-workspace';
import { routes, withBooking } from '../../../../src/routes';

/**
 * Sơ đồ bàn (SVG kéo thả, thu phóng) nặng hơn danh sách khách nhiều. `next/dynamic` tách nó
 * thành một file JS riêng: chỉ tải khi người dùng mở tab "Sơ đồ bàn" → trang Khách mở nhanh hơn.
 * `ssr: false` vì sơ đồ chỉ chạy được trên trình duyệt (cần phiên đăng nhập, sự kiện chuột).
 */
const SeatingPage = dynamic(
  () => import('../../../../src/features/seating-plan/seating-page').then((mod) => mod.SeatingPage),
  { ssr: false, loading: () => <Skeleton label="Đang tải sơ đồ bàn…" variant="card" /> },
);

export default function GuestsAndSeatingPage() {
  const searchParams = useSearchParams();
  const { bookingId } = useCoupleWorkspace();
  const seating = searchParams.get('xem') === 'so-do';
  const tabs = [
    { label: 'Quy mô & nhóm', href: withBooking(routes.guests, bookingId), current: !seating },
    { label: 'Sơ đồ bàn', href: withBooking(routes.seating, bookingId), current: seating },
  ];
  return (
    <>
      <nav
        className="mb-5 flex max-w-full gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--hy-outline)]"
        aria-label="Nhóm & sơ đồ"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className="border-b-2 border-transparent px-4 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary"
            aria-current={tab.current ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {seating ? <SeatingPage /> : <GuestsPage />}
    </>
  );
}
