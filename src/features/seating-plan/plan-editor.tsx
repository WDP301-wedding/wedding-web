'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSeatingLabels } from './use-seating-labels';
import { useUnsavedSeating } from './use-unsaved-seating';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import type { GuestGroup } from '../guest-management/guest-api';
import { seatingApi, type SeatingPlan, type SeatingTable } from './seating-api';
import { SeatingSvg } from './seating-svg';
import { layoutWarnings, statusLabels } from './use-seating-workspace';
import styles from './seating.module.css';

export function PlanEditor({
  bookingId,
  plan,
  groups,
  onChanged,
  onStale,
  onDirtyChange,
}: Readonly<{
  bookingId: string;
  plan: SeatingPlan;
  groups: GuestGroup[];
  onChanged: (plan: SeatingPlan) => void;
  /** Backend báo sơ đồ/tiệc đã đổi (409 SEATING_REVISION_STALE) → trang tải lại sơ đồ mới nhất. */
  onStale: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}>) {
  const command = useCommand();
  // Lỗi "revision cũ": tiệc vừa đổi số khách/thông tin (ở tab khác, máy khác hoặc nhà hàng sửa)
  // sau khi trang tải sơ đồ. Trước đây chỉ báo "Hãy tải lại" mà không tải → bấm lại vẫn lỗi mãi.
  const staleMessage = {
    SEATING_REVISION_STALE:
      'Thông tin tiệc hoặc sơ đồ vừa thay đổi. Giữ lại nhãn đang chỉnh để đối chiếu, hoặc chọn Xem bản mới trước khi thao tác tiếp.',
  };
  const reloadIfStale = (error: { code: string | null }) => {
    if (error.code === 'SEATING_REVISION_STALE') onStale();
  };
  // Nhãn đang chỉnh: bàn → nhóm. Khởi tạo từ snapshot backend trả về.
  const { labels, dirty, undoCount, assignLabel, acceptPlan, undo, reset } = useSeatingLabels(
    bookingId,
    plan,
    groups,
    onChanged,
  );
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const groupById = useMemo(
    () => new Map(groups.map((group) => [group.guestGroupId, group])),
    [groups],
  );

  const exitDialog = useUnsavedSeating(dirty);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  const groupTableCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const groupId of Object.values(labels))
      counts.set(groupId, (counts.get(groupId) ?? 0) + 1);
    return counts;
  }, [labels]);
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
      {exitDialog}
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

      <fieldset className={styles.assignmentToolbar + ' cw-card'} disabled={command.pending}>
        <legend>1. Chọn nhóm hoặc màu · 2. Chọn các bàn trên sơ đồ</legend>
        <div className="cw-actions">
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={activeGroup === null}
            onClick={() => setActiveGroup(null)}
          >
            Chỉ xem bàn
          </button>
          {groups.map((group) => (
            <button
              key={group.guestGroupId}
              type="button"
              className="button button-secondary"
              aria-pressed={activeGroup === group.guestGroupId}
              onClick={() => setActiveGroup(group.guestGroupId)}
            >
              <span className="cw-swatch" style={{ background: group.color }} aria-hidden="true" />{' '}
              {group.name}
            </button>
          ))}
          <button
            type="button"
            className="button button-secondary"
            aria-pressed={activeGroup === ''}
            onClick={() => setActiveGroup('')}
          >
            Gỡ nhóm khỏi bàn
          </button>
        </div>
        <p className="muted">
          Thay đổi chỉ được lưu khi bấm Lưu nhãn bàn. Một nhóm có thể dùng nhiều bàn.
        </p>
      </fieldset>
      <SeatingSvg
        plan={plan}
        selected={selected}
        onSelectTable={(id) => {
          setSelected(id);
          if (activeGroup === null || command.pending) return;
          assignLabel(id, activeGroup);
        }}
        colorOf={colorOf}
      />

      <p role="status" className="muted">
        {activeGroup === null
          ? 'Chế độ xem: chọn bàn để xem và chỉnh nhóm.'
          : activeGroup === ''
            ? 'Chế độ gỡ nhóm: chọn bàn cần gỡ.'
            : 'Đang gán nhóm: ' + (groupById.get(activeGroup)?.name ?? '')}
      </p>
      {selectedTable ? (
        <div className="cw-actions">
          <label>
            Nhóm cho bàn <strong>{selectedTable.tableLabel}</strong>{' '}
            <select
              disabled={command.pending}
              value={labels[selectedTable.layoutTableId] ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                assignLabel(selectedTable.layoutTableId, value);
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
            {group.name} ({groupTableCounts.get(group.guestGroupId) ?? 0} bàn)
          </li>
        ))}
      </ul>

      <div className="cw-actions">
        <button
          type="button"
          className="button button-secondary"
          disabled={command.pending || undoCount === 0}
          onClick={undo}
        >
          Hoàn tác ({undoCount})
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={command.pending || !dirty}
          onClick={reset}
        >
          Khôi phục nhãn đã lưu
        </button>
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
                staleMessage,
                reloadIfStale,
              )
              .then(acceptPlan)
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
                staleMessage,
                reloadIfStale,
              )
              .then(acceptPlan)
          }
        >
          Xác nhận sơ đồ
        </button>
      </div>
      <p className="muted">
        Mã sơ đồ: <code>{plan.seatingPlanId}</code>
      </p>
    </section>
  );
}
