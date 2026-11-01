'use client';

import { useEffect, useState, type FormEvent, type RefObject } from 'react';

import { notify } from '../../design-system/toast';
import { describeApiError, type FriendlyError } from '../../lib/api/api-errors';
import { browserSession } from '../identity-access/browser-session';
import { createExperienceGateway } from '../identity-access/experience-api';
import { notificationApi, type InboxItem } from '../notifications/notification-api';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import type { BookingSummary } from './use-couple-workspace';

/** 3 thông báo mới nhất (tự làm mới theo realtime) cho thẻ "Thông báo mới". */
export function useLatestNotifications(enabled: boolean) {
  const [latest, setLatest] = useState<readonly InboxItem[] | null>(null);
  const [latestError, setLatestError] = useState<FriendlyError | null>(null);
  const live = useLiveRefresh(
    async (isCurrent) => {
      try {
        const page = await browserSession.authorize((token) => notificationApi.inbox(token));
        if (isCurrent()) {
          setLatest(page.items.slice(0, 3));
          setLatestError(null);
        }
      } catch (error) {
        if (isCurrent()) setLatestError(describeApiError(error));
      }
    },
    { scope: 'overview-inbox', enabled, initial: true, types: ['notification.received'] },
  );
  return { latest, latestError, retry: () => void live.refresh() };
}

/**
 * Hộp thoại "Đặt tên gợi nhớ": mở/đóng (trả focus về nút mở) và lưu tên.
 * Ref do component tạo và truyền vào (luật react-hooks/refs: không trả ref ra để đọc lúc render).
 */
export function useAliasDialog(
  bookingId: string | undefined,
  summary: BookingSummary | undefined,
  reload: () => void,
  dialogRef: RefObject<HTMLDialogElement | null>,
  triggerRef: RefObject<HTMLButtonElement | null>,
) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = triggerRef.current;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open, dialogRef, triggerRef]);

  const openDialog = () => {
    setInput(summary?.alias ?? '');
    setError(null);
    setOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !bookingId) return;
    setSaving(true);
    setError(null);
    try {
      await browserSession.authorize((token) =>
        createExperienceGateway().updateBookingAlias(
          token,
          bookingId,
          input.trim() ? input.trim() : null,
          summary?.revision,
        ),
      );
      notify.success('Đã cập nhật tên gợi nhớ tiệc!');
      setOpen(false);
      reload();
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setSaving(false);
    }
  };

  return {
    open,
    input,
    setInput,
    saving,
    error,
    openDialog,
    close: () => setOpen(false),
    save,
  };
}
