import { Suspense } from 'react';

import { AppendicesPage } from '../../src/features/commercial-contract/appendices-page';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở phụ lục…</p>}>
      <AppendicesPage />
    </Suspense>
  );
}
