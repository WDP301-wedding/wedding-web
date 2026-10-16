'use client';

import { SpaceGate } from '../../../src/features/couple-workspace/space-gate';
import { CoupleBillingPage } from '../../../src/features/payments-billing/billing-page';

export default function PaymentPage() {
  return (
    <SpaceGate label="Đang mở ví tiệc…">
      <CoupleBillingPage embedded />
    </SpaceGate>
  );
}
