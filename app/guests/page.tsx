import { Suspense } from 'react';

import { GuestsPage } from '../../src/features/guest-management/guests-page';
import { Skeleton } from '../../src/design-system/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở khách mời…" />}>
      <GuestsPage />
    </Suspense>
  );
}
