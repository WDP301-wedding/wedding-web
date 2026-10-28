'use client';

import React from 'react';
import type { GuestGroup } from '../guest-management/guest-api';
import type { SeatingTable } from './seating-api';
import styles from './seating.module.css';

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
    <aside className={styles.editorSidebar}>
      <fieldset className={styles.assignmentToolbar} disabled={pending}>
        <legend>1. Chọn nhóm khách</legend>
        <div className={styles.groupChipList}>
          <button
            type="button"
            className={styles.groupChipButton}
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
                className={styles.groupChipButton}
                aria-pressed={isPressed}
                onClick={() => setActiveGroup(group.guestGroupId)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span
                    className="cw-swatch"
                    style={{ background: group.color, marginRight: 8 }}
                    aria-hidden="true"
                  />
                  {group.name}
                </span>
                <span className={styles.groupChipCount}>{count} bàn</span>
              </button>
            );
          })}

          <button
            type="button"
            className={styles.groupChipButton}
            aria-pressed={activeGroup === ''}
            onClick={() => setActiveGroup('')}
          >
            <span>Gỡ nhóm khỏi bàn</span>
          </button>
        </div>
      </fieldset>

      {/* Chi tiết bàn đang chọn */}
      <div className="cw-card" style={{ padding: 14 }}>
        <h3 style={{ fontSize: 14, margin: '0 0 8px', fontWeight: 600 }}>2. Bàn đang chọn</h3>
        {selectedTable ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--hy-wine)' }}>
              Bàn {selectedTable.tableLabel}
            </div>
            <label style={{ fontSize: 13 }}>
              Nhóm khách cho bàn này:
              <select
                disabled={pending}
                value={labels[selectedTable.layoutTableId] ?? ''}
                style={{
                  width: '100%',
                  marginTop: 4,
                  height: 36,
                  borderRadius: 4,
                  borderColor: 'var(--hy-outline-strong)',
                }}
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
              </select>
            </label>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Nhấp vào một bàn trên sơ đồ bên cạnh để kiểm tra hoặc gán nhóm nhanh.
          </p>
        )}
      </div>
    </aside>
  );
}

