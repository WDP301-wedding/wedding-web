'use client';

import React from 'react';
import type { Guest, GuestGroup } from './guest-api';
import styles from './guests.module.css';

export interface GuestCardListProps {
  visible: Guest[];
  selectedIds: Set<string>;
  groupMap: Map<string, GuestGroup>;
  pending: boolean;
  onToggleSelectOne: (guestId: string) => void;
  onEdit: (guest: Guest) => void;
  onIssueLink: (guest: Guest) => void;
  onSendEmail: (guest: Guest) => void;
  onToggleStatus: (guest: Guest) => void;
}

export function GuestCardList({
  visible,
  selectedIds,
  groupMap,
  pending,
  onToggleSelectOne,
  onEdit,
  onIssueLink,
  onSendEmail,
  onToggleStatus,
}: GuestCardListProps) {
  return (
    <div className={styles.mobileOnly}>
      {visible.map((guest) => {
        const isSelected = selectedIds.has(guest.guestId);
        const grp = groupMap.get(guest.guestGroupId);
        return (
          <div
            key={guest.guestId}
            className={styles.guestCard}
            style={isSelected ? { borderColor: 'var(--hy-wine)' } : undefined}
          >
            <div className={styles.guestCardHeader}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelectOne(guest.guestId)}
                  style={{ marginRight: 8 }}
                />
                <span className={styles.guestCardName}>{guest.name}</span>
              </label>
              <span className={styles.guestCardGroup}>
                <span
                  className={`cw-swatch ${styles.swatch}`}
                  style={{ background: grp?.color, marginRight: 4 }}
                  aria-hidden="true"
                />
                {grp?.name ?? '—'}
              </span>
            </div>

            <div className={styles.guestCardDetails}>
              {guest.phone ? <div>Điện thoại: {guest.phone}</div> : null}
              {guest.operationalNote ? <div>Ghi chú: {guest.operationalNote}</div> : null}
            </div>

            <div className={styles.guestCardActions}>
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
                    Lấy link thiệp
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
          </div>
        );
      })}
    </div>
  );
}
