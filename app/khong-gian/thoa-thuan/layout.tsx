import type { ReactNode } from 'react';

import { AgreementSteps } from '../../../src/features/couple-workspace/agreement-steps';

/** Ba bước của Thoả thuận (Kịch bản → Tên → Hợp đồng) dùng chung một thanh bước ở trên. */
export default function AgreementLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <AgreementSteps />
      {children}
    </>
  );
}
