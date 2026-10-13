import { Suspense } from 'react';

import { GuestsPage } from '../../src/features/guest-management/guests-page';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở khách mời…</p>}>
      <GuestsPage />
    </Suspense>
  );
}
