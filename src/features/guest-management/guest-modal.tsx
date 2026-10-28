'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Guest, GuestGroup } from './guest-api';
import { GuestFields } from './guest-fields';
import { normalizePhone } from './guest-csv';

function formField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

export function GuestModal({
  isOpen,
  guest,
  groups,
  pending = false,
  onClose,
  onSubmit,
}: Readonly<{
  isOpen: boolean;
  guest?: Guest | null | undefined;
  groups: GuestGroup[];
  pending?: boolean | undefined;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    guestGroupId: string;
    phone: string | null;
    note: string | null;
  }) => Promise<void> | void;
}>) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setError(null);
  }
  const isEdit = Boolean(guest);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const firstInput = panelRef.current?.querySelector<HTMLInputElement>('input[name="name"]');
    firstInput?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = formField(data, 'name');
    const guestGroupId = formField(data, 'guestGroupId');
    const rawPhone = formField(data, 'phone');
    const rawNote = formField(data, 'note');

    if (!name) {
      setError('Vui lòng nhập họ tên khách mời.');
      return;
    }
    if (!guestGroupId) {
      setError('Vui lòng chọn nhóm cho khách.');
      return;
    }

    let phone: string | null = null;
    if (rawPhone) {
      try {
        phone = normalizePhone(rawPhone);
      } catch {
        setError('Số điện thoại không hợp lệ (ví dụ: 0901234567 hoặc +84901234567).');
        const phoneInput = panelRef.current?.querySelector<HTMLInputElement>('input[name="phone"]');
        phoneInput?.focus();
        return;
      }
    }
    const note = rawNote || null;

    void onSubmit({ name, guestGroupId, phone, note });
  };

  return createPortal(
    <div
      className="hy-dialog-backdrop"
      onMouseDown={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={panelRef}
        className="hy-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !pending) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <form key={guest?.guestId ?? 'new'} onSubmit={handleSubmit}>
          <h2 id={titleId}>
            {isEdit ? `Chỉnh sửa thông tin khách “${guest?.name}”` : 'Thêm khách mời mới'}
          </h2>
          <p className="hy-dialog-description">
            {isEdit
              ? 'Cập nhật họ tên, nhóm khách hoặc ghi chú. Mã khách và liên kết riêng (nếu có) được giữ nguyên.'
              : 'Điền thông tin khách mời để gán vào nhóm. Bạn có thể cấp liên kết thiệp riêng sau khi thêm.'}
          </p>

          {error ? (
            <div className="cw-alert" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </div>
          ) : null}

          <GuestFields groups={groups} {...(guest ? { guest } : {})} />

          <div className="hy-dialog-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={onClose}
            >
              Hủy
            </button>
            <button type="submit" className="button" disabled={pending || groups.length === 0}>
              {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm khách'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
