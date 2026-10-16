import { Suspense } from 'react';

import { InvoicesPage } from '../../src/features/settlement/invoices-page';
import { Skeleton } from '../../src/design-system/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở hoá đơn…" />}>
      <InvoicesPage />
    </Suspense>
  );
}
