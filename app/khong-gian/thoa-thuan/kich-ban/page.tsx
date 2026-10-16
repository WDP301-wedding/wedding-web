'use client';

import { CollaborationPage } from '../../../../src/features/booking-lifecycle/collaboration-page';
import { SpaceGate } from '../../../../src/features/couple-workspace/space-gate';

export default function ScriptPage() {
  return (
    <SpaceGate label="Đang mở kịch bản…">
      <CollaborationPage />
    </SpaceGate>
  );
}
