'use client';
import { HySelect } from '../../components/ui/select-field';

import React from 'react';
import type { GuestGroup } from '../guest-management/guest-api';
import type { SeatingTable } from './seating-api';
import { sx } from './seating-classes';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from '../guest-management/guest-classes';

export function PlanEditorSidebar({
  groups,
  groupTableCounts,
  activeGroup,
  setActiveGroup,
  selectedTable,
  labels,
  pending,
  onAssignLabel,
}: Readonly<{
  groups: GuestGroup[];
  groupTableCounts: Map<string, number>;
  activeGroup: string | null;
  setActiveGroup: (groupId: string | null) => void;
  selectedTable: SeatingTable | undefined;
  labels: Record<string, string>;
  pending: boolean;
  onAssignLabel: (layoutTableId: string, guestGroupId: string) => void;
}>) {
  return (
    <aside className={sx.editorSidebar}>
      <fieldset className={sx.assignmentToolbar} disabled={pending}>
        <legend>1. Chọn nhóm khách</legend>
        <div className={sx.groupChipList}>
          <button
            type="button"
            className={sx.groupChipButton}
            aria-pressed={activeGroup === null}
            onClick={() => setActiveGroup(null)}
          >
            <span>Chế độ chỉ xem bàn</span>
          </button>

          {groups.map((group) => {
            const isPressed = activeGroup === group.guestGroupId;
            const count = groupTableCounts.get(group.guestGroupId) ?? 0;
            return (
              <button
                key={group.guestGroupId}
                type="button"
                className={sx.groupChipButton}
                aria-pressed={isPressed}
                onClick={() => setActiveGroup(group.guestGroupId)}
              >
                <span className="inline-flex items-center">
                  <span
                    className={gx.swatch}
                    style={{ background: group.color }}
                    aria-hidden="true"
                  />
                  {group.name}
                </span>
                <span className={sx.groupChipCount}>{count} bàn</span>
              </button>
            );
          })}

          <button
            type="button"
            className={sx.groupChipButton}
            aria-pressed={activeGroup === ''}
            onClick={() => setActiveGroup('')}
          >
            <span>Gỡ nhóm khỏi bàn</span>
          </button>
        </div>
      </fieldset>

      {/* Chi tiết bàn đang chọn */}
      <div className={sx.selectedCard}>
        <h3 className={sx.selectedTitle}>2. Bàn đang chọn</h3>
        {selectedTable ? (
          <div className="grid gap-2.5">
            <div className={sx.selectedName}>
              {/^bàn\s/iu.test(selectedTable.tableLabel)
                ? selectedTable.tableLabel
                : `Bàn ${selectedTable.tableLabel}`}
            </div>
            <label className={sx.selectedField}>
              Nhóm khách cho bàn này:
              <HySelect
                disabled={pending}
                value={labels[selectedTable.layoutTableId] ?? ''}
                onChange={(event) => {
                  onAssignLabel(selectedTable.layoutTableId, event.target.value);
                }}
              >
                <option value="">— Để trống (chưa gán) —</option>
                {groups.map((group) => (
                  <option key={group.guestGroupId} value={group.guestGroupId}>
                    {group.name}
                  </option>
                ))}
              </HySelect>
            </label>
          </div>
        ) : (
          <p className={cx.muted}>
            Nhấp vào một bàn trên sơ đồ bên cạnh để kiểm tra hoặc gán nhóm nhanh.
          </p>
        )}
      </div>
    </aside>
  );
}
