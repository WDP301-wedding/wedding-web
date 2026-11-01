'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { zoom } from './public-classes';

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
      {/* Ảnh 1 chiếm ô lớn, ảnh 10 trải hai cột để lưới 12 ảnh kín ô ở cả 2 và 4 cột. */}
      <ul className="grid auto-rows-[140px] grid-cols-2 gap-2 sm:auto-rows-[180px] sm:gap-3 lg:grid-cols-4 [&>li:first-child]:col-span-2 lg:[&>li:first-child]:row-span-2 [&>li:nth-child(10)]:col-span-2">
        {moments.map((moment, index) => (
          <li key={moment.src} className="min-h-0">
            <button
              type="button"
              className={cn(
                zoom,
                'group size-full overflow-hidden rounded-xl bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
              )}
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
                className="size-full object-cover"
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
    <div
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-hy-ink/85 p-4 duration-200 fade-in motion-reduce:animate-none"
      onMouseDown={onClose}
    >
      <div
        className="flex w-full max-w-5xl animate-in flex-col gap-3 duration-300 ease-hy-decelerate fade-in zoom-in-98 motion-reduce:animate-none"
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
          className="max-h-[75dvh] w-full rounded-xl object-contain"
        />
        <p className="flex items-baseline justify-between gap-4 text-sm text-white">
          {moment.alt}
          <span className="shrink-0 text-white/70 tabular-nums">
            {index + 1}/{moments.length}
          </span>
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => go(-1)}>
            <ChevronLeft aria-hidden="true" />
            Ảnh trước
          </Button>
          <Button type="button" variant="secondary" onClick={() => go(1)}>
            Ảnh sau
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button ref={closeButton} type="button" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
