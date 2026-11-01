'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CopyButton } from '../../design-system/copy-button';
import { formatDateTime } from '../couple-workspace/use-couple-workspace';
import type { IssuedPersonalLink } from './use-personal-invitation-link';
import { cx } from '../commercial-contract/contract-classes';
import { dialog } from '../../design-system/dialog-classes';
import { gx } from './guest-classes';

export function GuestLinkModal({
  link,
  onClose,
  onSendEmail,
}: Readonly<{
  link: IssuedPersonalLink | null;
  onClose: () => void;
  onSendEmail?: (() => void) | undefined;
}>) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!link) return;
    const previous = document.activeElement as HTMLElement | null;
    const copyBtn = panelRef.current?.querySelector<HTMLButtonElement>('button');
    copyBtn?.focus();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      previous?.focus?.();
    };
  }, [link]);

  if (!link) return null;

  return createPortal(
    <div className={dialog.backdrop} onMouseDown={onClose} onClick={(e) => e.stopPropagation()}>
      <div
        ref={panelRef}
        className={dialog.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <h2 id={titleId}>Liên kết thiệp riêng · {link.guestName}</h2>
        <div className={dialog.description}>
          <p>
            Liên kết chỉ hiển thị <strong>một lần</strong> để bảo mật. Hãy sao chép và gửi trực tiếp
            cho khách qua Zalo, Messenger hoặc Email. Cấp lại liên kết mới sẽ vô hiệu hoá liên kết
            cũ.
          </p>
          <p className="text-xs">
            Thời hạn sử dụng: <strong>{formatDateTime(link.expiresAt)}</strong>
          </p>
        </div>

        <div className={gx.copyRow}>
          <code className={gx.copyCode}>{link.url}</code>
          <CopyButton className={cx.buttonOutline} text={link.url} />
        </div>

        <div className={`${dialog.actions} mt-6`}>
          {onSendEmail ? (
            <button
              type="button"
              className={cx.buttonOutline}
              onClick={() => {
                onClose();
                onSendEmail();
              }}
            >
              Gửi qua Email
            </button>
          ) : null}
          <button type="button" className={cx.button} onClick={onClose}>
            Đã sao chép, đóng hộp thoại
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
