'use client';

import React from 'react';
import { InlineError } from '../../design-system/inline-error';
import type { FriendlyError } from '../../lib/api/api-errors';

export interface OverviewAliasModalProps {
  isOpen: boolean;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  hasExistingAlias: boolean;
  aliasInput: string;
  setAliasInput: (val: string) => void;
  savingAlias: boolean;
  aliasError: FriendlyError | null;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export function OverviewAliasModal({
  isOpen,
  dialogRef,
  hasExistingAlias,
  aliasInput,
  setAliasInput,
  savingAlias,
  aliasError,
  onClose,
  onSave,
}: OverviewAliasModalProps) {
  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="hy-alias-dialog"
      aria-labelledby="alias-modal-title"
      aria-describedby="alias-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!savingAlias) onClose();
      }}
    >
      <div className="hy-alias-dialog-header">
        <div>
          <h3 id="alias-modal-title">
            {hasExistingAlias ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          </h3>
          <p id="alias-modal-description">
            Giúp hai bạn phân biệt các tiệc trong danh sách. Tên này không thay đổi thông tin
            sảnh hay hợp đồng.
          </p>
        </div>
        <button
          type="button"
          className="hy-alias-close"
          onClick={onClose}
          disabled={savingAlias}
          aria-label="Đóng hộp thoại đặt tên"
        >
          Đóng
        </button>
      </div>
      <form onSubmit={onSave} className="hy-alias-form">
        <label htmlFor="booking-alias-input" className="form-label">
          Tên gợi nhớ (tối đa 120 ký tự)
        </label>
        <input
          id="booking-alias-input"
          type="text"
          maxLength={120}
          className="form-input"
          placeholder="VD: Lễ thành hôn (Nhà gái), Tiệc báo hỷ..."
          value={aliasInput}
          disabled={savingAlias}
          aria-describedby={
            aliasError ? 'alias-input-hint alias-save-error' : 'alias-input-hint'
          }
          onChange={(e) => setAliasInput(e.target.value)}
          autoFocus
        />
        <p id="alias-input-hint" className="hy-alias-hint">
          Để trống và lưu để dùng lại tên mặc định.
        </p>
        <InlineError id="alias-save-error" error={aliasError} />
        <div className="hy-alias-form-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={onClose}
            disabled={savingAlias}
          >
            Hủy
          </button>
          <button type="submit" className="button" disabled={savingAlias}>
            {savingAlias ? 'Đang lưu…' : 'Lưu tên gợi nhớ'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
