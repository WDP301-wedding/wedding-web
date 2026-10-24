'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '../../design-system/confirm-dialog';
export function useUnsavedSeating(dirty: boolean) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  useEffect(() => {
    if (!dirty) return;
    const exit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    let asking = false;
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.download || link.target === '_blank') return;
      const url = new URL(link.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      event.preventDefault();
      event.stopPropagation();
      if (asking) return;
      asking = true;
      void confirm({
        title: 'Rời sơ đồ khi chưa lưu?',
        description:
          'Các nhãn bàn đang chỉnh chưa được lưu lên hệ thống. Bản nháp được giữ trong tab này theo đúng phiên bản để phục hồi khi quay lại. Bạn có thể ở lại để lưu hoặc tiếp tục rời trang.',
        confirmLabel: 'Rời trang',
        cancelLabel: 'Ở lại để lưu',
        tone: 'danger',
      })
        .then((allowed) => {
          if (allowed) {
            window.removeEventListener('beforeunload', exit);
            if (url.origin === location.origin) router.push(url.pathname + url.search + url.hash);
            else location.assign(url.href);
          }
        })
        .finally(() => {
          asking = false;
        });
    };
    window.addEventListener('beforeunload', exit);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', exit);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty, confirm, router]);
  return dialog;
}
