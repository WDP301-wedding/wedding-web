'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

type Moment = Readonly<{ src: string; alt: string }>;

// Kích thước gốc của ảnh trong public/images/khoanh-khac (đều 1600×893) — next/image cần để giữ
// đúng tỉ lệ và không làm trang nhảy bố cục khi ảnh tải xong.
const width = 1600;
const height = 893;

/**
 * Lưới "Khoảnh khắc tại Hỷ Yến" + xem ảnh lớn.
 *
 * - Ảnh nhỏ: next/image tự tạo bản vừa ô (sizes) và chỉ tải khi cuộn tới (lazy) → trang chủ không
 *   phải tải 12 ảnh lớn ngay khi mở.
 * - Xem lớn: hộp thoại modal (portal ra <body>), ←/→ chuyển ảnh, Esc hoặc bấm nền để đóng; trả
 *   focus về ảnh vừa bấm để người dùng bàn phím không bị "lạc".
 */
export function MomentsGallery({ moments }: Readonly<{ moments: readonly Moment[] }>) {
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  return (
    <>
      <ul className="hy-moments-grid">
        {moments.map((moment, index) => (
          <li key={moment.src}>
            <button
              type="button"
              ref={(node) => {
                triggers.current[index] = node;
              }}
              onClick={() => setOpen(index)}
              aria-label={`Xem lớn: ${moment.alt}`}
            >
              <Image
                src={moment.src}
                alt={moment.alt}
                width={width}
                height={height}
                sizes="(max-width: 720px) 50vw, 400px"
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? (
        <Lightbox
          moments={moments}
          index={open}
          onChange={setOpen}
          onClose={() => {
            const returnTo = triggers.current[open];
            setOpen(null);
            returnTo?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function Lightbox({
  moments,
  index,
  onChange,
  onClose,
}: Readonly<{
  moments: readonly Moment[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}>) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const moment = moments[index]!;
  const go = (step: number) => onChange((index + step + moments.length) % moments.length);

  useEffect(() => {
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowRight') go(1);
    else if (event.key === 'ArrowLeft') go(-1);
  };

  return createPortal(
    <div className="hy-lightbox" onMouseDown={onClose}>
      <div
        className="hy-lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Ảnh ${index + 1}/${moments.length}: ${moment.alt}`}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <Image
          key={moment.src}
          src={moment.src}
          alt={moment.alt}
          width={width}
          height={height}
          sizes="(max-width: 1200px) 100vw, 1200px"
          priority
        />
        <p className="hy-lightbox-caption">
          {moment.alt}
          <span>
            {index + 1}/{moments.length}
          </span>
        </p>
        <div className="hy-lightbox-actions">
          <button type="button" className="button button-secondary" onClick={() => go(-1)}>
            ← Ảnh trước
          </button>
          <button type="button" className="button button-secondary" onClick={() => go(1)}>
            Ảnh sau →
          </button>
          <button ref={closeButton} type="button" className="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
