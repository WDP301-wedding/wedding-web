'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSeatingLabels } from './use-seating-labels';
import { useUnsavedSeating } from './use-unsaved-seating';
import { useCommand } from '../couple-workspace/use-couple-workspace';
import type { GuestGroup } from '../guest-management/guest-api';
import { seatingApi, type SeatingPlan, type SeatingTable } from './seating-api';

export function usePlanEditor({
  bookingId,
  plan,
  groups,
  onChanged,
  onStale,
  onDirtyChange,
}: {
  bookingId: string;
  plan: SeatingPlan;
  groups: GuestGroup[];
  onChanged: (plan: SeatingPlan) => void;
  onStale: () => void;
  onDirtyChange?: ((dirty: boolean) => void) | undefined;
}) {
  const command = useCommand();
  const staleMessage = {
    SEATING_REVISION_STALE:
      'Thông tin tiệc hoặc sơ đồ vừa thay đổi. Giữ lại nhãn đang chỉnh để đối chiếu, hoặc chọn Xem bản mới trước khi thao tác tiếp.',
  };
  const reloadIfStale = (error: { code: string | null }) => {
    if (error.code === 'SEATING_REVISION_STALE') onStale();
  };

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

  const groupNameOf = (table: SeatingTable) => {
    const groupId = labels[table.layoutTableId];
    return groupId ? groupById.get(groupId)?.name : undefined;
  };

  const handleSaveLabels = () => {
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
      .then(acceptPlan);
  };

  const handleConfirmPlan = () => {
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
      .then(acceptPlan);
  };

  return {
    command,
    labels,
    dirty,
    undoCount,
    assignLabel,
    undo,
    reset,
    activeGroup,
    setActiveGroup,
    selected,
    setSelected,
    groupById,
    exitDialog,
    groupTableCounts,
    selectedTable,
    capacityWarning,
    colorOf,
    groupNameOf,
    handleSaveLabels,
    handleConfirmPlan,
  };
}
