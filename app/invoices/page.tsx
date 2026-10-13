import { Suspense } from 'react';

import { InvoicesPage } from '../../src/features/settlement/invoices-page';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở hoá đơn…</p>}>
      <InvoicesPage />
    </Suspense>
  );
}
