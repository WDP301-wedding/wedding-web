'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Hộp thoại xác nhận / nhập liệu thay cho `window.confirm` và `window.prompt` của trình duyệt.
 *
 * Vì sao không dùng hộp thoại mặc định:
 * - Không đổi được giao diện, chữ nút ("OK/Cancel" tiếng Anh), không nói rõ hậu quả.
 * - Chặn toàn bộ luồng JavaScript của trang (kể cả timer làm mới phiên) cho tới khi đóng.
 *
 * Cách dùng (API dạng Promise nên thay thế gần như 1-1 cho window.confirm):
 * ```tsx
 * const { confirm, prompt, dialog } = useConfirmDialog();
 * if (!(await confirm({ title: 'Lưu trữ nhóm?', tone: 'danger' }))) return;
 * const name = await prompt({ title: 'Đổi tên nhóm', defaultValue: group.name });
 * return <>{...}{dialog}</>;  // nhớ render `dialog` trong component
 * ```
 * Hook giữ state riêng trong component (không cần Provider) → test từng component vẫn chạy.
 */
export type ConfirmOptions = Readonly<{
  title: string;
  /** Giải thích hậu quả của thao tác — nên có với thao tác xoá/huỷ. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` cho thao tác xoá/huỷ/lưu trữ: nút xác nhận màu đỏ. */
  tone?: 'default' | 'danger';
}>;

export type PromptOptions = ConfirmOptions &
  Readonly<{
    label: string;
    defaultValue?: string;
    type?: 'text' | 'email';
    maxLength?: number;
    placeholder?: string;
  }>;

type Pending =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

export function useConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ kind: 'confirm', options, resolve })),
    [],
  );
  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => setPending({ kind: 'prompt', options, resolve })),
    [],
  );

  const close = (value: boolean | string | null) => {
    if (!pending) return;
    if (pending.kind === 'confirm') pending.resolve(value === true || typeof value === 'string');
    else pending.resolve(typeof value === 'string' ? value : null);
    setPending(null);
  };

  const dialog = pending ? (
    <ConfirmDialogView
      key={pending.options.title}
      pending={pending}
      onCancel={() => close(pending.kind === 'confirm' ? false : null)}
      onConfirm={(value) => close(pending.kind === 'confirm' ? true : value)}
    />
  ) : null;

  return { confirm, prompt, dialog };
}

function ConfirmDialogView({
  pending,
  onCancel,
  onConfirm,
}: Readonly<{
  pending: Pending;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}>) {
  const { options } = pending;
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(
    pending.kind === 'prompt' ? (pending.options.defaultValue ?? '') : '',
  );
  const danger = options.tone === 'danger';

  useEffect(() => {
    // Ghi nhớ nơi đang focus để trả lại sau khi đóng (người dùng bàn phím không bị "lạc").
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(
      pending.kind === 'prompt' ? 'input' : danger ? '[data-cancel]' : '[data-confirm]',
    );
    first?.focus();
    // Khoá cuộn nền khi modal mở.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [pending.kind, danger]);

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      onCancel();
      return;
    }
    // Giữ Tab vòng trong hộp thoại (focus trap tối giản).
    if (event.key !== 'Tab' || !panel.current) return;
    const focusable = panel.current.querySelectorAll<HTMLElement>('button, input');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const trimmed = value.trim();
  const canSubmit = pending.kind === 'confirm' || trimmed !== '';

  // Portal ra <body>: tránh bị cắt/đè bởi phần tử cha có overflow/transform/z-index.
  return createPortal(
    <div
      className="hy-dialog-backdrop"
      onMouseDown={onCancel}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        ref={panel}
        className={`hy-dialog${danger ? ' is-danger' : ''}`}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        // Portal chỉ đổi vị trí DOM; sự kiện React vẫn nổi bọt theo CÂY COMPONENT. Chặn lại để
        // click/submit trong hộp thoại không kích hoạt nhầm handler của phần tử cha (vd. form
        // lịch trình chứa nút "Xoá mốc" sẽ bị submit theo).
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canSubmit) onConfirm(trimmed);
          }}
        >
          <h2 id={titleId}>{options.title}</h2>
          {options.description ? (
            <div id={descriptionId} className="hy-dialog-description">
              {options.description}
            </div>
          ) : null}
          {pending.kind === 'prompt' ? (
            <label htmlFor={inputId} className="hy-dialog-field">
              {pending.options.label}
              <input
                id={inputId}
                type={pending.options.type ?? 'text'}
                value={value}
                maxLength={pending.options.maxLength}
                placeholder={pending.options.placeholder}
                required
                onChange={(event) => setValue(event.target.value)}
              />
            </label>
          ) : null}
          <div className="hy-dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              data-cancel
              onClick={onCancel}
            >
              {options.cancelLabel ?? 'Huỷ'}
            </button>
            <button
              type="submit"
              className={`button${danger ? ' button-danger' : ''}`}
              data-confirm
              disabled={!canSubmit}
            >
              {options.confirmLabel ?? 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
