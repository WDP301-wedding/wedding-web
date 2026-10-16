import { Suspense } from 'react';

import { AppendicesPage } from '../../src/features/commercial-contract/appendices-page';
import { Skeleton } from '../../src/design-system/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở phụ lục…" />}>
      <AppendicesPage />
    </Suspense>
  );
}
