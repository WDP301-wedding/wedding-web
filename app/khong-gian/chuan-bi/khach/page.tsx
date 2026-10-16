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
    { label: 'Danh sách khách', href: withBooking(routes.guests, bookingId), current: !seating },
    { label: 'Sơ đồ bàn', href: withBooking(routes.seating, bookingId), current: seating },
  ];
  return (
    <>
      <nav className="hy-tabs" aria-label="Khách & sơ đồ">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={tab.current ? 'is-current' : undefined}
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
