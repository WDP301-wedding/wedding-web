import { Suspense } from 'react';

import { SeatingPage } from '../../src/features/seating-plan/seating-page';
import { Skeleton } from '../../src/design-system/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở sơ đồ bàn…" />}>
      <SeatingPage />
    </Suspense>
  );
}
