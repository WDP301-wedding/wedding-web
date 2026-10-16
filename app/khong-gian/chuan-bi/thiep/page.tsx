'use client';

import { Suspense } from 'react';

import { Skeleton } from '../../../../src/design-system/skeleton';
import { SpaceGate } from '../../../../src/features/couple-workspace/space-gate';
import { CoupleInvitationsPage } from '../../../../src/features/invitation-studio/invitations-page';

export default function Page() {
  return (
    <Suspense fallback={<Skeleton label="Đang mở Studio…" />}>
      <SpaceGate label="Đang mở thiệp cưới…">
        <CoupleInvitationsPage />
      </SpaceGate>
    </Suspense>
  );
}
