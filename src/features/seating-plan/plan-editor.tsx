'use client';

import { useMemo, useState } from 'react';
import { CommandFeedback } from '../couple-workspace/couple-page';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import type { GuestGroup } from '../guest-management/guest-api';
import {
  seatingApi,
  type SeatingPlan,
  type SeatingTable,
} from './seating-api';
import { SeatingSvg } from './seating-svg';
import { layoutWarnings, statusLabels } from './use-seating-workspace';
import styles from './seating.module.css';

export function PlanEditor({
  bookingId,
  plan,
  groups,
  onChanged,
}: Readonly<{
  bookingId: string;
  plan: SeatingPlan;
  groups: GuestGroup[];
  onChanged: (plan: SeatingPlan) => void;
}>) {
  const command = useCommand();
  // Nhãn đang chỉnh: bàn → nhóm. Khởi tạo từ snapshot backend trả về.
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId])),
  );
  const [selected, setSelected] = useState<string | null>(null);

  const groupById = useMemo(
    () => new Map(groups.map((group) => [group.guestGroupId, group])),
    [groups],
  );

  const dirty =
    JSON.stringify(Object.entries(labels).sort()) !==
    JSON.stringify(plan.labels.map((label) => [label.layoutTableId, label.guestGroupId]).sort());

  const selectedTable = plan.renderSnapshot.find((table) => table.layoutTableId === selected);

  const approvedRangeException =
    plan.status === 'CONFIRMED' &&
    plan.managerException?.approvedBookingRevision === plan.currentBookingRevision &&
    plan.managerException.approvedHeadcount === plan.currentPlanningHeadcount;

  const capacityWarning =
    plan.currentPlanningHeadcount > plan.totalSeatCapacity
      ? `Tiệc dự kiến ${plan.currentPlanningHeadcount} khách nhưng sơ đồ chỉ có ${plan.totalSeatCapacity} ghế, thiếu ${plan.currentPlanningHeadcount - plan.totalSeatCapacity} chỗ. Hãy chọn mẫu đủ chỗ ở phía trên trước khi xác nhận.`
      : !approvedRangeException &&
          (plan.currentPlanningHeadcount < plan.minGuests ||
            plan.currentPlanningHeadcount > plan.maxGuests)
        ? `Số khách dự kiến ${plan.currentPlanningHeadcount} nằm ngoài khoảng ${plan.minGuests}–${plan.maxGuests} khách của mẫu. Hãy chọn mẫu phù hợp ở phía trên hoặc nhờ nhà hàng duyệt ngoại lệ.`
        : null;

  const colorOf = (table: SeatingTable) => {
    const groupId = labels[table.layoutTableId];
    return groupId ? (groupById.get(groupId)?.color ?? table.color ?? '#FFFFFF') : '#FFFFFF';
  };

  return (
    <section className="cw-card">
      <div className="cw-card-header">
        <h2>Sơ đồ · bản {plan.revisionNumber}</h2>
        <span className="status status-champagne">{statusLabels[plan.status]}</span>
      </div>
      <dl className="cw-stats">
        <div>
          <dt>Số khách dự kiến hiện tại</dt>
          <dd>{plan.currentPlanningHeadcount}</dd>
        </div>
        <div>
          <dt>Khoảng của mẫu</dt>
          <dd>
            {plan.minGuests}–{plan.maxGuests}
          </dd>
        </div>
        <div>
          <dt>Tổng ghế</dt>
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
          {plan.droppedTableIds.length} nhãn không giữ được khi đổi mẫu; hãy gán lại.
        </p>
      ) : null}
      {plan.managerException ? (
        <p className="cw-note">
          Nhà hàng đã duyệt ngoại lệ sức chứa: {plan.managerException.reason}
        </p>
      ) : null}

      <SeatingSvg
        plan={plan}
        selected={selected}
        onSelectTable={setSelected}
        colorOf={colorOf}
      />

      {selectedTable ? (
        <div className="cw-actions">
          <label>
            Nhóm cho bàn <strong>{selectedTable.tableLabel}</strong>{' '}
            <select
              value={labels[selectedTable.layoutTableId] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setLabels((previous) => {
                  const next = { ...previous };
                  if (value) next[selectedTable.layoutTableId] = value;
                  else delete next[selectedTable.layoutTableId];
                  return next;
                });
              }}
            >
              <option value="">— Để trống —</option>
              {groups.map((group) => (
                <option key={group.guestGroupId} value={group.guestGroupId}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p className="muted">
          Chọn một bàn trên sơ đồ để gắn nhóm. Một nhóm có thể dùng nhiều bàn.
        </p>
      )}

      <ul className={`cw-actions ${styles.legendList}`} aria-label="Chú thích nhóm">
        {groups.map((group) => (
          <li key={group.guestGroupId} className={styles.legendItem}>
            <span className="cw-swatch" style={{ background: group.color }} aria-hidden="true" />
            {group.name} ({Object.values(labels).filter((id) => id === group.guestGroupId).length}{' '}
            bàn)
          </li>
        ))}
      </ul>

      <div className="cw-actions">
        <button
          className="button button-secondary"
          type="button"
          disabled={command.pending || !dirty}
          onClick={() =>
            void command
              .run(
                (token, key) =>
                  seatingApi.revise(token, key, bookingId, plan.seatingPlanId, {
                    expectedRevision: plan.revisionNumber,
                    labels: Object.entries(labels).map(([layoutTableId, guestGroupId]) => ({
                      layoutTableId,
                      guestGroupId,
                    })),
                  }),
                'Đã lưu nhãn bàn (bản nháp mới, cần xác nhận lại).',
              )
              .then((next) => next && onChanged(next))
          }
        >
          Lưu nhãn bàn
        </button>
        <button
          className="button"
          type="button"
          disabled={command.pending || dirty || plan.status === 'CONFIRMED' || !!capacityWarning}
          aria-describedby={capacityWarning ? 'seating-capacity-warning' : undefined}
          title={dirty ? 'Lưu nhãn trước khi xác nhận' : (capacityWarning ?? undefined)}
          onClick={() =>
            void command
              .run(
                (token, key) =>
                  seatingApi.confirm(
                    token,
                    key,
                    bookingId,
                    plan.seatingPlanId,
                    plan.revisionNumber,
                    plan.currentBookingRevision,
                  ),
                'Đã xác nhận sơ đồ bàn. Sơ đồ sẽ được dùng cho file in.',
              )
              .then((next) => next && onChanged(next))
          }
        >
          Xác nhận sơ đồ
        </button>
      </div>
      <p className="muted">
        Mã sơ đồ: <code>{plan.seatingPlanId}</code>
      </p>
      <CommandFeedback error={command.error} notice={command.notice} />
    </section>
  );
}
