'use client';

import { Play, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Nút "Xem video" trên hero: mở video sảnh tiệc trong hộp thoại.
 *
 * Video không còn tự phát làm nền hero: trình duyệt chỉ tải ~1,3–1,8 MB khi người dùng bấm xem,
 * nên ảnh hero tĩnh là phần tử lớn nhất được vẽ (LCP) và trang nhẹ hơn trên mạng di động.
 */
export function HeroVideoButton({ className }: Readonly<{ className?: string }>) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <>
      <button ref={trigger} type="button" className={className} onClick={() => setOpen(true)}>
        <Play aria-hidden="true" />
        Xem video
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-hy-ink/85 p-4 duration-200 fade-in motion-reduce:animate-none"
              role="dialog"
              aria-modal="true"
              aria-label="Video sảnh tiệc Hỷ Yến"
              onMouseDown={close}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close();
              }}
            >
              <div
                className="flex w-full max-w-4xl flex-col items-end gap-3"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  aria-label="Đóng video"
                  autoFocus
                  onClick={close}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
                <video
                  className="w-full rounded-2xl bg-hy-ink"
                  poster="/images/hero-sanh-tiec-poster.webp"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  {/* WebM/VP9 nhẹ hơn và chạy trên Chromium không có H.264; MP4 cho Safari. */}
                  <source src="/videos/hero-sanh-tiec.webm" type="video/webm" />
                  <source src="/videos/hero-sanh-tiec.mp4" type="video/mp4" />
                </video>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
