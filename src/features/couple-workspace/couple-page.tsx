'use client';
import { InlineError } from '../../design-system/inline-error';
import { Illustration, type IllustrationName } from '../../design-system/illustrations';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from 'cn';

import { Badge } from '../../components/ui/badge';
import { buttonVariants } from '../../components/ui/button';
import type { FriendlyError } from '../../lib/api/api-errors';
import {
  formatEventDate,
  shiftLabel,
  useCoupleWorkspace,
  type Proposal,
} from './use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import { panel } from './space-classes';
import { useInSpace } from './space-provider';

const phaseLabels: Record<Proposal['phase'], string> = {
  DRAFT: 'Đang trao đổi',
  AWAITING_DEPOSIT: 'Chờ đặt cọc',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã huỷ',
};

type CouplePageProps = Readonly<{
  title: string;
  description?: string;
  /** Trang chỉ dùng được khi Couple đã có quyền FULL (sau khi cọc được xác nhận). */
  requireFull?: boolean;
  children: (proposal: Proposal, reload: () => void) => ReactNode;
}>;

/**
 * Khung chung cho các trang Couple: tiêu đề và đủ các trạng thái (đang tải, chưa đăng nhập,
 * chọn tiệc, lỗi, chưa đủ quyền). Trang con chỉ lo nội dung chính.
 */
export function CouplePage({ title, description, requireFull, children }: CouplePageProps) {
  const { state, reload } = useCoupleWorkspace();
  // Trong /khong-gian thanh trên đã hiện sảnh, ngày, ca → không lặp lại dải thông tin tiệc.
  const inSpace = useInSpace();
  return (
    <>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-balance sm:text-2xl">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          ) : null}
          {state.status === 'ready' && !inSpace ? <BookingStrip proposal={state.proposal} /> : null}
        </header>
        {state.status === 'loading' ? <Skeleton label="Đang tải dữ liệu tiệc cưới…" /> : null}
        {state.status === 'anonymous' ? (
          <EmptyPanel title="Cần đăng nhập">
            <p>Đăng nhập bằng tài khoản đã được nhà hàng mời để tiếp tục.</p>
            <Link className={buttonVariants({ className: 'self-start' })} href="/dang-nhap">
              Đăng nhập
            </Link>
          </EmptyPanel>
        ) : null}
        {state.status === 'error' ? <ErrorPanel error={state.error} onRetry={reload} /> : null}
        {state.status === 'choose-booking' ? (
          state.bookings.length === 0 ? (
            <EmptyPanel title="Chưa có tiệc cưới" illustration="empty-tiec">
              <p>Nhà hàng sẽ mở hồ sơ sau buổi tư vấn. Bạn có thể gửi yêu cầu tư vấn mới.</p>
              <Link
                className={buttonVariants({ variant: 'outline', className: 'self-start' })}
                href="/tu-van"
              >
                Gửi yêu cầu tư vấn
              </Link>
            </EmptyPanel>
          ) : (
            <section className={cn(panel, 'flex flex-col gap-3')}>
              <h2 className="text-lg font-bold">Chọn tiệc cưới</h2>
              <ul className="flex flex-col divide-y divide-border">
                {state.bookings.map((booking) => (
                  <li key={booking.bookingId}>
                    <Link
                      className="block py-3 text-sm hover:text-primary"
                      href={`?bookingId=${booking.bookingId}`}
                    >
                      <strong>{booking.hallName}</strong> · {formatEventDate(booking.eventDate)} ·{' '}
                      {shiftLabel(booking.shiftCode)} · {phaseLabels[booking.phase]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        ) : null}
        {state.status === 'ready' ? (
          state.proposal.phase === 'CANCELLED' && requireFull ? (
            <EmptyPanel title="Tiệc cưới đã huỷ" illustration="empty-tiec">
              <p>
                Hồ sơ tiệc cưới này đã được xác nhận huỷ. Các hoạt động chuẩn bị tiệc (lập danh sách
                khách mời, sơ đồ sắp xếp bàn và phụ lục) đã ngừng hoạt động.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  className={buttonVariants()}
                  href={`/khong-gian?bookingId=${state.proposal.bookingId}`}
                >
                  Về trang Tổng quan
                </Link>
                <Link
                  className={buttonVariants({ variant: 'outline' })}
                  href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${state.proposal.bookingId}`}
                >
                  Xem hồ sơ hợp đồng
                </Link>
              </div>
            </EmptyPanel>
          ) : requireFull && state.proposal.capabilities.accessLevel !== 'FULL' ? (
            <EmptyPanel title="Mở sau khi đặt cọc">
              <p>
                Chức năng này dành cho tiệc đã được xác nhận. Sau khi khoản cọc được nhà hàng ghi
                nhận, không gian của hai bạn sẽ tự mở đầy đủ.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  className={buttonVariants()}
                  href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${state.proposal.bookingId}`}
                >
                  Xem hợp đồng
                </Link>
                <Link
                  className={buttonVariants({ variant: 'outline' })}
                  href={`/khong-gian/thanh-toan?bookingId=${state.proposal.bookingId}`}
                >
                  Thanh toán cọc
                </Link>
              </div>
            </EmptyPanel>
          ) : (
            children(state.proposal, reload)
          )
        ) : null}
      </div>
    </>
  );
}

function BookingStrip({ proposal }: Readonly<{ proposal: Proposal }>) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <Badge variant="brand">{phaseLabels[proposal.phase]}</Badge>
      <span>{proposal.proposal.hall.name}</span>
      <span>{formatEventDate(proposal.eventDate)}</span>
      <span>
        {shiftLabel(proposal.proposal.shift.code)} {proposal.proposal.shift.startTime}–
        {proposal.proposal.shift.endTime}
      </span>
      <Badge>
        {proposal.capabilities.accessLevel === 'FULL'
          ? 'Quyền đầy đủ'
          : 'Quyền hạn chế (trước cọc)'}
      </Badge>
    </p>
  );
}

export function EmptyPanel({
  title,
  children,
  illustration,
}: Readonly<{ title: string; children?: ReactNode; illustration?: IllustrationName }>) {
  return (
    <section className={cn(panel, 'flex flex-col items-start gap-3 text-sm text-muted-foreground')}>
      {illustration ? <Illustration name={illustration} /> : null}
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function ErrorPanel({
  error,
  onRetry,
}: Readonly<{ error: FriendlyError; onRetry?: () => void }>) {
  return <InlineError error={error} onRetry={onRetry} />;
}
