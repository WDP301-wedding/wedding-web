import { Suspense } from 'react';

import { SeatingPage } from '../../src/features/seating-plan/seating-page';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở sơ đồ bàn…</p>}>
      <SeatingPage />
    </Suspense>
  );
}
