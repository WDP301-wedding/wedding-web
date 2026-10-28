'use client';

import React from 'react';
import type { GuestGroup } from '../guest-management/guest-api';
import type { SeatingPlan } from './seating-api';
import { SeatingSvg } from './seating-svg';
import styles from './seating.module.css';
import { usePlanEditor } from './use-plan-editor';
import { PlanEditorHeader } from './plan-editor-header';
import { PlanEditorSidebar } from './plan-editor-sidebar';
import { PlanActionBar } from './plan-action-bar';

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
  const {
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
  } = usePlanEditor({
    bookingId,
    plan,
    groups,
    onChanged,
    onStale,
    onDirtyChange,
  });

  return (
    <section className="cw-card" style={{ paddingBottom: 0 }}>
      {exitDialog}
      <PlanEditorHeader plan={plan} capacityWarning={capacityWarning} />

      {/* Bố cục 2 cột Split View trên Desktop */}
      <div className={styles.editorLayout}>
        {/* Cột trái: Bộ chọn nhóm & Chi tiết bàn đang chọn */}
        <PlanEditorSidebar
          groups={groups}
          groupTableCounts={groupTableCounts}
          activeGroup={activeGroup}
          setActiveGroup={setActiveGroup}
          selectedTable={selectedTable}
          labels={labels}
          pending={command.pending}
          onAssignLabel={assignLabel}
        />

        {/* Cột phải: Khung bản vẽ SVG */}
        <div className={styles.editorCanvas}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              backgroundColor: 'var(--hy-surface-warm)',
              fontSize: 13,
              color: 'var(--hy-ink)',
            }}
          >
            {activeGroup === null
              ? '👁 Chế độ xem: Nhấp vào bàn để xem thông tin chi tiết.'
              : activeGroup === ''
                ? '✕ Chế độ gỡ: Nhấp vào các bàn để gỡ nhóm.'
                : `✍ Đang gán nhóm: ${groupById.get(activeGroup)?.name}. Nhấp vào các bàn trên sơ đồ để gán nhóm này.`}
          </div>

          <SeatingSvg
            plan={plan}
            selected={selected}
            onSelectTable={(id) => {
              setSelected(id);
              if (activeGroup === null || command.pending) return;
              assignLabel(id, activeGroup);
            }}
            colorOf={colorOf}
            groupNameOf={groupNameOf}
          />
        </div>
      </div>

      {/* Thanh Action Bar dính cố định ở đáy (Sticky Action Bar) */}
      <PlanActionBar
        plan={plan}
        dirty={dirty}
        undoCount={undoCount}
        pending={command.pending}
        capacityWarning={capacityWarning}
        onUndo={undo}
        onReset={reset}
        onSaveLabels={handleSaveLabels}
        onConfirmPlan={handleConfirmPlan}
      />
    </section>
  );
}
