'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CollaborationPage } from '../../src/features/booking-lifecycle/collaboration-page';
import { WorkspaceShell } from '../../src/features/couple-workspace/workspace-shell';
import { Skeleton } from '../../src/design-system/skeleton';

function WorkspaceView() {
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
    <WorkspaceShell active="timeline" bookingId={activeBookingId}>
      <CollaborationPage onBookingChange={setLocalBookingId} />
    </WorkspaceShell>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở không gian làm việc…" />}>
      <WorkspaceView />
    </Suspense>
  );
}
