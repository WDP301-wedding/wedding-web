import { Suspense } from 'react';

import { ContractPage } from '../../src/features/commercial-contract/contract-page';
import { Skeleton } from '../../src/design-system/skeleton';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở hợp đồng…" />}>
      <ContractPage />
    </Suspense>
  );
}
