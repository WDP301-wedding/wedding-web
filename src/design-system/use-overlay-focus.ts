'use client';

import { useEffect, useRef } from 'react';

const focusable =
  'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Lớp phủ tự dựng (sheet, xem toàn màn hình): khi mở thì đưa focus vào bên trong, Esc để đóng,
 * khi đóng trả focus về nút đã mở. Gắn ref trả về vào khung nội dung của lớp phủ.
 */
export function useOverlayFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const box = ref.current;
    (box?.querySelector<HTMLElement>(focusable) ?? box)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  return ref;
}
