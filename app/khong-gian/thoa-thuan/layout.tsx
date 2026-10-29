import type { ReactNode } from 'react';

import { AgreementSteps } from '../../../src/features/couple-workspace/agreement-steps';

/** Hai bước của Thoả thuận (Kịch bản → Hợp đồng) dùng chung một thanh bước ở trên. */
export default function AgreementLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <AgreementSteps />
      {children}
    </>
  );
}
