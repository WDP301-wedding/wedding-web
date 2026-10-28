'use client';

import React from 'react';
import type { Guest, GuestGroup } from './guest-api';
import styles from './guests.module.css';

export interface GuestTableViewProps {
  visible: Guest[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  groupMap: Map<string, GuestGroup>;
  pending: boolean;
  onToggleSelectAll: () => void;
  onToggleSelectOne: (guestId: string) => void;
  onEdit: (guest: Guest) => void;
  onIssueLink: (guest: Guest) => void;
  onSendEmail: (guest: Guest) => void;
  onToggleStatus: (guest: Guest) => void;
}

export function GuestTableView({
  visible,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  groupMap,
  pending,
  onToggleSelectAll,
  onToggleSelectOne,
  onEdit,
  onIssueLink,
  onSendEmail,
  onToggleStatus,
}: GuestTableViewProps) {
  return (
    <div className="cw-table-wrap">
      <table className={`cw-table ${styles.desktopOnly}`}>
        <thead>
          <tr>
            <th scope="col" style={{ width: 40, textAlign: 'center' }}>
              <input
                type="checkbox"
                aria-label="Chọn tất cả khách hiển thị"
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                }}
                onChange={onToggleSelectAll}
              />
            </th>
            <th scope="col">Họ tên</th>
            <th scope="col">Nhóm</th>
            <th scope="col">Điện thoại</th>
            <th scope="col">Ghi chú</th>
            <th scope="col" style={{ textAlign: 'right' }}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((guest) => {
            const isSelected = selectedIds.has(guest.guestId);
            const grp = groupMap.get(guest.guestGroupId);
            return (
              <tr
                key={guest.guestId}
                style={isSelected ? { backgroundColor: 'var(--hy-surface-warm)' } : undefined}
              >
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    aria-label={`Chọn khách ${guest.name}`}
                    checked={isSelected}
                    onChange={() => onToggleSelectOne(guest.guestId)}
                  />
                </td>
                <td>
                  <strong>{guest.name}</strong>
                </td>
                <td>
                  <span
                    className={`cw-swatch ${styles.swatch}`}
                    style={{ background: grp?.color }}
                    aria-hidden="true"
                  />
                  {grp?.name ?? '—'}
                </td>
                <td>{guest.phone ?? '—'}</td>
                <td>{guest.operationalNote ?? '—'}</td>
                <td>
                  <div className="cw-actions" style={{ justifyContent: 'flex-end' }}>
                    {guest.status === 'ACTIVE' ? (
                      <>
                        <button
                          className="cw-text-button"
                          type="button"
                          disabled={pending}
                          onClick={() => onEdit(guest)}
                        >
                          Sửa
                        </button>
                        <button
                          className="cw-text-button"
                          type="button"
                          disabled={pending}
                          onClick={() => onIssueLink(guest)}
                        >
                          Lấy liên kết
                        </button>
                        <button
                          className="cw-text-button"
                          type="button"
                          disabled={pending}
                          onClick={() => onSendEmail(guest)}
                        >
                          Gửi email
                        </button>
                      </>
                    ) : null}
                    <button
                      className="cw-text-button"
                      type="button"
                      disabled={pending}
                      onClick={() => onToggleStatus(guest)}
                    >
                      {guest.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
