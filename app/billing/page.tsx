'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CoupleBillingPage } from '../../src/features/payments-billing/billing-page';
import './billing.css';
import { WorkspaceShell } from '../../src/features/couple-workspace/workspace-shell';
import { Skeleton } from '../../src/design-system/skeleton';

function BillingView() {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get('bookingId') ?? undefined;
  const [localBookingId, setLocalBookingId] = useState<string | undefined>(undefined);
  const [prevUrlBookingId, setPrevUrlBookingId] = useState(urlBookingId);

  if (urlBookingId !== prevUrlBookingId) {
    setPrevUrlBookingId(urlBookingId);
    setLocalBookingId(undefined);
  }

  const activeBookingId = localBookingId ?? urlBookingId;

  return (
    <WorkspaceShell active="billing" bookingId={activeBookingId}>
      <CoupleBillingPage onBookingChange={setLocalBookingId} />
    </WorkspaceShell>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở trang thanh toán…" />}>
      <BillingView />
    </Suspense>
  );
}
