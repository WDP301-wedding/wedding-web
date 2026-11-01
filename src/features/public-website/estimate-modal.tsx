'use client';

import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cn } from 'cn';

import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { CatalogImage } from './catalog-image';
import {
  consultationHref,
  formatDate,
  formatVnd,
  menuEstimates,
  shiftName,
  suitableHalls,
  tableCount,
  type Estimate,
} from './estimate';
import type { Hall, Menu } from './public-api';
import { arrowLink } from './public-classes';

const option =
  'cursor-pointer rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground has-checked:border-primary has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring/30';
/** Từng dòng trong bảng hiện lần lượt cách nhau 50ms. */
const stagger =
  'animate-in fade-in slide-in-from-bottom-1 fill-mode-backwards duration-300 motion-reduce:animate-none';

export function EstimateModal({
  estimate,
  halls,
  menus,
  onClose = () => undefined,
}: Readonly<{
  estimate: Estimate;
  halls: readonly Hall[];
  menus: readonly Menu[];
  onClose?: () => void;
}>) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fitting = suitableHalls(halls, estimate.guests);
  const costs = menuEstimates(menus, estimate.guests);
  const tables = tableCount(estimate.guests);
  const [hallId, setHallId] = useState<string | undefined>(fitting[0]?.id);
  // Mặc định chọn thực đơn ở giữa (thường là gói được chọn nhiều) nếu có ≥ 3 gói.
  const [menuId, setMenuId] = useState<string | undefined>(
    costs[Math.min(1, costs.length - 1)]?.menu.id,
  );
  const selectedHall = fitting.find((hall) => hall.id === hallId) ?? fitting[0];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-ui-v3
      className="fixed inset-0 z-50 flex animate-in items-end justify-center bg-hy-ink/60 duration-200 fade-in sm:items-center sm:p-6 motion-reduce:animate-none"
      onMouseDown={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl animate-in flex-col overflow-hidden rounded-t-2xl bg-card shadow-[0_32px_64px_rgb(43_29_34/0.32)] duration-400 ease-hy-decelerate fade-in slide-in-from-bottom-8 sm:rounded-2xl sm:slide-in-from-bottom-2 sm:zoom-in-98 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estimate-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden"
          aria-hidden="true"
        />
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-7 sm:py-6">
          <div className="flex flex-col items-start gap-2">
            <h2 id="estimate-title" className="text-lg font-bold tabular-nums sm:text-xl">
              {estimate.guests} khách · {tables} bàn · {shiftName(estimate.shift)}
              {estimate.date ? ` ${formatDate(estimate.date)}` : ''}
            </h2>
            <Badge variant="info">Ước tính – chưa giữ chỗ</Badge>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-hy-outline"
            onClick={onClose}
            aria-label="Đóng bảng ước tính"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-8 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="mb-3 text-sm font-semibold">1 · Sảnh vừa sức chứa</legend>
            {fitting.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có sảnh nào đủ {estimate.guests} khách. Gửi yêu cầu để quản lý tiệc tư vấn
                phương án phù hợp.
              </p>
            ) : (
              fitting.map((hall, index) => (
                <label
                  key={hall.id}
                  className={cn(option, stagger, 'flex flex-col overflow-hidden')}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="relative block">
                    <CatalogImage
                      media={hall.media[0]}
                      sizes="(max-width: 720px) 100vw, 340px"
                      placeholder={hall.name}
                      className="h-36"
                    />
                    {index === 0 ? (
                      <Badge variant="success" className="absolute top-3 left-3">
                        Vừa nhất
                      </Badge>
                    ) : null}
                  </span>
                  <span className="flex flex-col gap-0.5 px-4 py-3">
                    <span className="flex items-center gap-2">
                      <input
                        className="size-4 accent-primary"
                        type="radio"
                        name="estimate-hall"
                        value={hall.id}
                        checked={hall.id === selectedHall?.id}
                        onChange={() => setHallId(hall.id)}
                      />
                      <strong className="text-base">{hall.name}</strong>
                    </span>
                    <small className="text-xs text-muted-foreground">
                      Tối đa {hall.maxGuests} khách · còn {hall.maxGuests - estimate.guests} chỗ
                    </small>
                    <Link className={cn(arrowLink, 'text-xs')} href={`/sanh/${hall.id}`}>
                      Xem sảnh
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </span>
                </label>
              ))
            )}
          </fieldset>

          <fieldset className="flex min-w-0 flex-col gap-2.5">
            <legend className="mb-3 text-sm font-semibold">
              2 · Chi phí ước tính theo thực đơn · {tables} bàn
            </legend>
            {costs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Thực đơn đang được cập nhật.</p>
            ) : (
              costs.map(({ menu, totalVnd }, index) => (
                <label
                  key={menu.id}
                  className={cn(
                    option,
                    stagger,
                    'flex items-center gap-3 px-4 py-3.5 has-checked:bg-accent',
                  )}
                  style={{ animationDelay: `${(index + 1) * 50}ms` }}
                >
                  <input
                    className="size-4 shrink-0 accent-primary"
                    type="radio"
                    name="estimate-menu"
                    value={menu.id}
                    checked={menu.id === menuId}
                    onChange={() => setMenuId(menu.id)}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-sm">{menu.name}</strong>
                    <small className="text-xs text-muted-foreground tabular-nums">
                      {tables} bàn × {formatVnd(menu.priceVndPerTable)}
                    </small>
                  </span>
                  <strong className="text-base font-bold text-primary tabular-nums sm:text-lg">
                    {formatVnd(totalVnd)}
                  </strong>
                </label>
              ))
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Số bàn = số khách ÷ 10, làm tròn lên. Chưa gồm dịch vụ (MC, trang trí), đồ in và VAT.
              Giá chốt theo hợp đồng sau buổi tư vấn.
            </p>
          </fieldset>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border bg-muted px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-7">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng / Chỉnh sửa lại
          </Button>
          <Link
            className={buttonVariants()}
            href={consultationHref({
              hallId: selectedHall?.id,
              menuId,
              date: estimate.date || undefined,
              guests: estimate.guests,
              shift: estimate.shift,
            })}
          >
            Gửi yêu cầu tư vấn với lựa chọn này
            <ArrowRight aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
