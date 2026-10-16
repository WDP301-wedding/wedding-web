import { Suspense } from 'react';

import { ContractPage } from '../../src/features/commercial-contract/contract-page';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Đang mở hợp đồng…</p>}>
      <ContractPage />
    </Suspense>
  );
}
