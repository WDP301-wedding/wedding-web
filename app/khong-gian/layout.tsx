import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { Skeleton } from '../../src/design-system/skeleton';
import { SpaceProvider } from '../../src/features/couple-workspace/space-provider';
import { SpaceShell } from '../../src/features/couple-workspace/space-shell';
import './thanh-toan/billing.css';

export const metadata: Metadata = {
  title: 'Không gian cưới | Hỷ Yến',
  // Trang riêng tư của cặp đôi: không cho máy tìm kiếm lập chỉ mục.
  robots: { index: false, follow: false },
};

/**
 * Layout của "Không gian cưới". Next.js giữ layout này khi chuyển giữa các trang con nên
 * SpaceProvider (cache dữ liệu tiệc) và sidebar không bị dựng lại → chuyển trang tức thì.
 * Suspense bắt buộc vì Provider đọc `useSearchParams()` (bookingId) ở phía client.
 */
export default function SpaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<Skeleton label="Đang mở không gian cưới…" />}>
      <SpaceProvider>
        <SpaceShell>{children}</SpaceShell>
      </SpaceProvider>
    </Suspense>
  );
}
