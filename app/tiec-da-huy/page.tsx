import Link from 'next/link';
import { Suspense } from 'react';
import { PublicHeader } from '../../src/features/public-website/public-header';
import { BookingArchive } from '../../src/features/booking-archive/booking-archive';
export const metadata = { title: 'Tiệc đã hủy | Hỷ Yến', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8">
        <Link href="/khong-gian" className="text-sm text-primary underline">
          Về không gian cưới
        </Link>
        <Suspense fallback={<p>Đang mở hồ sơ đã hủy…</p>}>
          <BookingArchive />
        </Suspense>
      </main>
    </>
  );
}
