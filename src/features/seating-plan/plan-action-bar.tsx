'use client';

import React from 'react';
import type { SeatingPlan } from './seating-api';
import { statusLabels } from './use-seating-workspace';
import { sx } from './seating-classes';
import { cx } from '../commercial-contract/contract-classes';

export function PlanActionBar({
  plan,
  dirty,
  undoCount,
  pending,
  capacityWarning,
  onUndo,
  onReset,
  onSaveLabels,
  onConfirmPlan,
}: Readonly<{
  plan: SeatingPlan;
  dirty: boolean;
  undoCount: number;
  pending: boolean;
  capacityWarning: string | null;
  onUndo: () => void;
  onReset: () => void;
  onSaveLabels: () => void;
  onConfirmPlan: () => void;
}>) {
  return (
    <div className={sx.stickyActionBar} role="region" aria-label="Thao tác lưu sơ đồ">
      <div className={sx.actionBarStatus}>
        <span className={cx.status}>{statusLabels[plan.status]}</span>
        {dirty ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            Có thay đổi chưa lưu
          </span>
        ) : (
          <span className="text-muted-foreground">
            Đã đồng bộ với hệ thống
          </span>
        )}
      </div>

      <div className={sx.actionBarButtons}>
        <button
          type="button"
          className={cx.buttonOutline}
          disabled={pending || undoCount === 0}
          onClick={onUndo}
          title="Hoàn tác thao tác gán gần nhất"
        >
          Hoàn tác ({undoCount})
        </button>

        <button
          type="button"
          className={cx.buttonOutline}
          disabled={pending || !dirty}
          onClick={onReset}
        >
          Khôi phục bản lưu
        </button>

        <button
          className={cx.buttonOutline}
          type="button"
          disabled={pending || !dirty}
          onClick={onSaveLabels}
        >
          Lưu nhãn bàn
        </button>

        <button
          className={cx.button}
          type="button"
          disabled={pending || dirty || plan.status === 'CONFIRMED' || !!capacityWarning}
          aria-describedby={capacityWarning ? 'seating-capacity-warning' : undefined}
          title={dirty ? 'Lưu nhãn trước khi xác nhận' : (capacityWarning ?? undefined)}
          onClick={onConfirmPlan}
        >
          Xác nhận sơ đồ
        </button>
      </div>
    </div>
  );
}

