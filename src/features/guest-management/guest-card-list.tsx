'use client';

import React from 'react';
import type { Guest, GuestGroup } from './guest-api';
import { cx } from '../commercial-contract/contract-classes';
import { gx } from './guest-classes';

export interface GuestCardListProps {
  visible: Guest[];
  readOnly?: boolean;
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
  readOnly = false,
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
    <div className={gx.mobileOnly}>
      {visible.map((guest) => {
        const isSelected = !readOnly && selectedIds.has(guest.guestId);
        const grp = groupMap.get(guest.guestGroupId);
        return (
          <div key={guest.guestId} className={gx.guestCard} data-selected={isSelected}>
            <div className={gx.guestCardHeader}>
              {readOnly ? (
                <span className={gx.guestCardName}>{guest.name}</span>
              ) : (
                <label className={gx.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectOne(guest.guestId)}
                    className="mr-2"
                  />
                  <span className={gx.guestCardName}>{guest.name}</span>
                </label>
              )}
              <span className={gx.guestCardGroup}>
                <span className={gx.swatch} style={{ background: grp?.color }} aria-hidden="true" />
                {grp?.name ?? '—'}
              </span>
            </div>

            <div className={gx.guestCardDetails}>
              {guest.phone ? <div>Điện thoại: {guest.phone}</div> : null}
              {guest.operationalNote ? <div>Ghi chú: {guest.operationalNote}</div> : null}
            </div>

            {!readOnly && (
              <div className={gx.guestCardActions}>
                {guest.status === 'ACTIVE' ? (
                  <>
                    <button
                      className={cx.textButton}
                      type="button"
                      disabled={pending}
                      onClick={() => onEdit(guest)}
                    >
                      Sửa
                    </button>
                    <button
                      className={cx.textButton}
                      type="button"
                      disabled={pending}
                      onClick={() => onIssueLink(guest)}
                    >
                      Lấy link thiệp
                    </button>
                    <button
                      className={cx.textButton}
                      type="button"
                      disabled={pending}
                      onClick={() => onSendEmail(guest)}
                    >
                      Gửi email
                    </button>
                  </>
                ) : null}
                <button
                  className={cx.textButton}
                  type="button"
                  disabled={pending}
                  onClick={() => onToggleStatus(guest)}
                >
                  {guest.status === 'ACTIVE' ? 'Lưu trữ' : 'Khôi phục'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
