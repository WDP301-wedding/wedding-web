'use client';

import React from 'react';
import type { SeatingPlan } from './seating-api';
import { statusLabels } from './use-seating-workspace';
import styles from './seating.module.css';

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
    <div className={styles.stickyActionBar} role="region" aria-label="Thao tác lưu sơ đồ">
      <div className={styles.actionBarStatus}>
        <span className="status status-champagne">{statusLabels[plan.status]}</span>
        {dirty ? (
          <span style={{ fontSize: 13, color: 'var(--hy-wine)', fontWeight: 600 }}>
            ● Có thay đổi chưa lưu
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--hy-ink-muted)' }}>
            Đã đồng bộ với hệ thống
          </span>
        )}
      </div>

      <div className={styles.actionBarButtons}>
        <button
          type="button"
          className="button button-secondary"
          disabled={pending || undoCount === 0}
          onClick={onUndo}
          title="Hoàn tác thao tác gán gần nhất"
        >
          Hoàn tác ({undoCount})
        </button>

        <button
          type="button"
          className="button button-secondary"
          disabled={pending || !dirty}
          onClick={onReset}
        >
          Khôi phục bản lưu
        </button>

        <button
          className="button button-secondary"
          type="button"
          disabled={pending || !dirty}
          onClick={onSaveLabels}
        >
          Lưu nhãn bàn
        </button>

        <button
          className="button"
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

