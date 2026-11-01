'use client';

import type { FormEvent, RefObject } from 'react';

import { Button } from '../../components/ui/button';
import { InlineError } from '../../design-system/inline-error';
import type { FriendlyError } from '../../lib/api/api-errors';
import { control, field, fieldHint } from '../public-website/public-classes';

export interface OverviewAliasModalProps {
  isOpen: boolean;
  dialogRef: RefObject<HTMLDialogElement | null>;
  hasExistingAlias: boolean;
  aliasInput: string;
  setAliasInput: (val: string) => void;
  savingAlias: boolean;
  aliasError: FriendlyError | null;
  onClose: () => void;
  onSave: (e: FormEvent) => void;
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
      className="m-auto w-[min(480px,calc(100vw-32px))] animate-in rounded-2xl bg-card p-0 text-foreground shadow-[0_32px_64px_rgb(43_29_34/0.32)] duration-300 ease-hy-decelerate fade-in zoom-in-98 backdrop:bg-hy-ink/55 motion-reduce:animate-none"
      aria-labelledby="alias-modal-title"
      aria-describedby="alias-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!savingAlias) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div className="flex flex-col gap-1">
          <h3 id="alias-modal-title" className="text-lg font-bold">
            {hasExistingAlias ? 'Đổi tên gợi nhớ' : 'Đặt tên gợi nhớ'}
          </h3>
          <p id="alias-modal-description" className="text-xs text-muted-foreground">
            Giúp hai bạn phân biệt các tiệc trong danh sách. Tên này không thay đổi thông tin sảnh
            hay hợp đồng.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={savingAlias}
          aria-label="Đóng hộp thoại đặt tên"
        >
          Đóng
        </Button>
      </div>
      <form onSubmit={onSave} className="flex flex-col gap-3 p-5">
        <label htmlFor="booking-alias-input" className={field}>
          Tên gợi nhớ (tối đa 120 ký tự)
        </label>
        <input
          id="booking-alias-input"
          type="text"
          maxLength={120}
          className={control}
          placeholder="VD: Lễ thành hôn (Nhà gái), Tiệc báo hỷ..."
          value={aliasInput}
          disabled={savingAlias}
          aria-describedby={aliasError ? 'alias-input-hint alias-save-error' : 'alias-input-hint'}
          onChange={(e) => setAliasInput(e.target.value)}
          autoFocus
        />
        <p id="alias-input-hint" className={fieldHint}>
          Để trống và lưu để dùng lại tên mặc định.
        </p>
        <InlineError id="alias-save-error" error={aliasError} />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={savingAlias}>
            Hủy
          </Button>
          <Button type="submit" disabled={savingAlias}>
            {savingAlias ? 'Đang lưu…' : 'Lưu tên gợi nhớ'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
