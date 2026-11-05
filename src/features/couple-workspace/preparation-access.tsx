'use client';

import { cx } from '../commercial-contract/contract-classes';
import { useOverviewSettlement } from './use-overview-settlement';
import type { Proposal } from './use-couple-workspace';

export function usePreparationLock(proposal: Proposal | null) {
  const { status } = useOverviewSettlement(proposal?.phase === 'CONFIRMED' ? proposal : null);
  if (proposal?.phase === 'COMPLETED') return 'Tiệc đã được xác nhận tổ chức xong.';
  if (status === 'settled') return 'Tiệc đã tất toán.';
  return null;
}

export function PreparationReadOnlyNotice({ reason }: Readonly<{ reason: string }>) {
  return (
    <p className={cx.note} role="status">
      {reason} Bạn có thể xem lại thông tin đã lưu.
    </p>
  );
}
