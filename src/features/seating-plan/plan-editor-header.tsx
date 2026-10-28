'use client';

import React from 'react';
import type { SeatingPlan } from './seating-api';
import { layoutWarnings, statusLabels } from './use-seating-workspace';

export function PlanEditorHeader({
  plan,
  capacityWarning,
}: Readonly<{
  plan: SeatingPlan;
  capacityWarning: string | null;
}>) {
  return (
    <>
      <div className="cw-card-header">
        <div>
          <h2>Sơ đồ không gian · Bản {plan.revisionNumber}</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Mã sơ đồ: <code>{plan.seatingPlanId}</code>
          </span>
        </div>
        <span className="status status-champagne">{statusLabels[plan.status]}</span>
      </div>

      <dl className="cw-stats">
        <div>
          <dt>Số khách dự kiến</dt>
          <dd>{plan.currentPlanningHeadcount}</dd>
        </div>
        <div>
          <dt>Khoảng khách của mẫu</dt>
          <dd>
            {plan.minGuests}–{plan.maxGuests}
          </dd>
        </div>
        <div>
          <dt>Tổng số ghế</dt>
          <dd>{plan.totalSeatCapacity}</dd>
        </div>
      </dl>

      {capacityWarning ? (
        <p className="cw-alert" role="status" id="seating-capacity-warning">
          {capacityWarning}
        </p>
      ) : null}

      {plan.warnings.length > 0 ? (
        <ul className="cw-alert">
          {plan.warnings.map((warning) => (
            <li key={warning}>
              {layoutWarnings[warning] ?? 'Sơ đồ cần được nhà hàng kiểm tra lại.'}
            </li>
          ))}
        </ul>
      ) : null}

      {plan.droppedTableIds.length > 0 ? (
        <p className="cw-note">
          {plan.droppedTableIds.length} nhãn không giữ được khi đổi mẫu; hãy gán lại cho các bàn mới.
        </p>
      ) : null}

      {plan.managerException ? (
        <p className="cw-note">
          Nhà hàng đã duyệt ngoại lệ sức chứa: {plan.managerException.reason}
        </p>
      ) : null}
    </>
  );
}

