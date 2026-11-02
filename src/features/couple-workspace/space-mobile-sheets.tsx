import { Check, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';

import { routes } from '../../routes';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  shiftLabel,
  type BookingSummary,
} from './use-couple-workspace';
import { chipClass, countBadge, navLink, sheetBackdrop, sheetPanel } from './space-classes';
import { useOverlayFocus } from '../../design-system/use-overlay-focus';
import { Icon, SupportCard } from './space-icons';
import type { Chip } from './space-nav-config';

export function SpaceMoreSheet({
  chips,
  href,
  moreOpen,
  onClose,
  phone,
  unread,
}: Readonly<{
  chips: Record<string, Chip | undefined>;
  href: (path: string) => string;
  moreOpen: boolean;
  onClose: () => void;
  phone: string | null;
  unread: number | null;
}>) {
  const sheetRef = useOverlayFocus<HTMLDivElement>(moreOpen, onClose);
  if (!moreOpen) return null;

  return (
    <div className={sheetBackdrop} onClick={onClose}>
      <div
        id="space-more-sheet"
        ref={sheetRef}
        className={cn(sheetPanel, 'flex flex-col gap-1')}
        role="dialog"
        aria-modal="true"
        aria-label="Thêm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <Link prefetch={false} className={navLink} href={href(routes.settle)} onClick={onClose}>
          <Icon name="receipt" /> Quyết toán
          {chips.settle ? (
            <span className={chipClass(chips.settle.tone)}>{chips.settle.label}</span>
          ) : null}
        </Link>
        <Link
          prefetch={false}
          className={navLink}
          href={href(routes.notifications)}
          onClick={onClose}
        >
          <Icon name="bell" /> Thông báo
          {unread ? <span className={countBadge}>{unread}</span> : null}
        </Link>
        <Link className={navLink} href={routes.profile} onClick={onClose}>
          <Icon name="person" /> Hồ sơ
        </Link>
        <Link className={navLink} href={routes.home} onClick={onClose}>
          <Icon name="back" /> Trang chủ
        </Link>
        <div className="mt-2">
          <SupportCard phone={phone} />
        </div>
      </div>
    </div>
  );
}

const phaseTone = (phase: BookingSummary['phase']): Chip['tone'] =>
  phase === 'CONFIRMED' || phase === 'COMPLETED' ? 'done' : phase === 'CANCELLED' ? 'off' : 'wait';

export function SpaceBookingSwitcherSheet({
  bookingId,
  bookings,
  onClose,
  onSelectBooking,
  switcherOpen,
}: Readonly<{
  bookingId: string | null;
  bookings: readonly BookingSummary[];
  onClose: () => void;
  onSelectBooking: (bookingId: string) => void;
  switcherOpen: boolean;
}>) {
  const sheetRef = useOverlayFocus<HTMLDivElement>(switcherOpen, onClose);
  if (!switcherOpen) return null;

  return (
    <div className={sheetBackdrop} onClick={onClose}>
      <div
        id="booking-switch-sheet"
        ref={sheetRef}
        className={cn(sheetPanel, 'flex flex-col gap-4')}
        role="dialog"
        aria-modal="true"
        aria-label="Danh sách tiệc cưới"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold">Danh sách tiệc của bạn</h3>
            <p className="text-xs text-muted-foreground">
              Bạn có {bookings.length} tiệc đang được quản lý. Chạm vào tiệc để chuyển không gian
              làm việc.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {bookings.map((b) => {
            const isCurrent = b.bookingId === bookingId;
            return (
              <button
                key={b.bookingId}
                type="button"
                className={cn(
                  'flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors',
                  isCurrent
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-muted-foreground',
                )}
                onClick={() => {
                  onSelectBooking(b.bookingId);
                  onClose();
                }}
              >
                <span className="flex items-center gap-2">
                  <strong className="truncate text-sm">{bookingDisplayName(b)}</strong>
                  <span className={chipClass(phaseTone(b.phase))}>
                    {bookingPhaseLabel(b.phase)}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {b.hallName} · {formatEventDate(b.eventDate)} ({shiftLabel(b.shiftCode)})
                </span>
                {isCurrent ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-hy-success">
                    <Check className="size-3.5" aria-hidden="true" />
                    Đang hiển thị tiệc này
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-primary">Chuyển sang tiệc này</span>
                )}
              </button>
            );
          })}
        </div>
        <Link
          href={routes.consultation}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-input text-sm font-semibold text-primary"
          onClick={onClose}
        >
          <Plus className="size-4" aria-hidden="true" />
          Đăng ký đặt thêm tiệc mới
        </Link>
      </div>
    </div>
  );
}
