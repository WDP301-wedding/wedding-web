'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Button, buttonVariants } from '../../components/ui/button';
import { formatEventDate, shiftLabel } from './use-couple-workspace';

export interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  hallName: string;
  eventDate: string;
  shiftCode: 'LUNCH' | 'DINNER';
  publicPhone?: string | null | undefined;
}

export function CancellationModal({
  isOpen,
  onClose,
  bookingId,
  hallName,
  eventDate,
  shiftCode,
  publicPhone,
}: CancellationModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(540px,calc(100vw-32px))] animate-in rounded-2xl bg-card p-0 text-foreground shadow-[0_32px_64px_rgb(43_29_34/0.32)] duration-300 ease-hy-decelerate fade-in zoom-in-98 backdrop:bg-hy-ink/55 motion-reduce:animate-none"
      aria-labelledby="cancellation-modal-title"
      aria-describedby="cancellation-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex flex-col gap-4 p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <svg
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 id="cancellation-modal-title" className="text-xl font-bold tracking-tight">
              Thông báo huỷ tiệc cưới
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Sảnh {hallName} · {shiftLabel(shiftCode)} · Ngày {formatEventDate(eventDate)}
            </p>
          </div>
        </div>

        <div
          id="cancellation-modal-description"
          className="flex flex-col gap-3 text-sm text-muted-foreground"
        >
          <p>
            Hồ sơ tiệc cưới của hai bạn đã được nhà hàng xác nhận huỷ. Các chức năng chuẩn bị tiệc
            bao gồm: chuẩn bị quy mô và nhóm khách, sắp xếp sơ đồ bàn, thiết kế thiệp và đặt in
            thiệp cưới đã được tạm dừng.
          </p>
          <p>
            Toàn bộ bản hợp đồng đã duyệt và lịch sử giao dịch thanh toán vẫn được lưu trữ nguyên
            vẹn để hai bạn tiện tra cứu, đối chiếu khi cần.
          </p>
          {publicPhone ? (
            <p className="rounded-lg bg-muted/60 p-3 text-xs text-foreground">
              Nếu hai bạn cần hỗ trợ thêm về chính sách hoàn huỷ hoặc muốn hẹn buổi tư vấn mới, vui
              lòng liên hệ hotline nhà hàng:{' '}
              <a
                href={`tel:${publicPhone}`}
                className="font-semibold text-primary underline hover:text-primary/80"
              >
                {publicPhone}
              </a>
              .
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-border">
          <Link
            href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${bookingId}`}
            className={buttonVariants({ variant: 'outline' })}
            onClick={onClose}
          >
            Xem hợp đồng đã lưu
          </Link>
          <Button type="button" onClick={onClose}>
            Tôi đã hiểu
          </Button>
        </div>
      </div>
    </dialog>
  );
}
