'use client';
import { useState } from 'react';
import { notify } from './toast';

export function CopyButton({ text, className }: Readonly<{ text: string; className?: string }>) {
  const [pending, setPending] = useState(false);
  const copy = async () => {
    if (pending) return;
    if (!navigator.clipboard?.writeText) {
      notify.error(
        'Trình duyệt chưa hỗ trợ sao chép tự động. Hãy chọn liên kết và sao chép thủ công.',
      );
      return;
    }
    setPending(true);
    try {
      await navigator.clipboard.writeText(text);
      notify.success('Đã sao chép liên kết.');
    } catch {
      notify.error(
        'Chưa sao chép được liên kết. Hãy cấp quyền sao chép hoặc chọn liên kết và sao chép thủ công.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={() => void copy()}
    >
      {pending ? 'Đang sao chép…' : 'Sao chép'}
    </button>
  );
}
