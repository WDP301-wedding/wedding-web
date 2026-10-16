'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type { FriendlyError } from '../../lib/api/api-errors';
import { WorkspaceShell, type Section } from './workspace-shell';
import {
  formatEventDate,
  shiftLabel,
  useCoupleWorkspace,
  type Proposal,
} from './use-couple-workspace';
import { Skeleton } from '../../design-system/skeleton';
import { useInSpace } from './space-provider';

const phaseLabels: Record<Proposal['phase'], string> = {
  DRAFT: 'Đang trao đổi',
  AWAITING_DEPOSIT: 'Chờ đặt cọc',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn tất',
  CANCELLED: 'Đã huỷ',
};

type CouplePageProps = Readonly<{
  active: Section;
  eyebrow: string;
  title: string;
  description?: string;
  /** Trang chỉ dùng được khi Couple đã có quyền FULL (sau khi cọc được xác nhận). */
  requireFull?: boolean;
  children: (proposal: Proposal, reload: () => void) => ReactNode;
}>;

/**
 * Khung chung cho các trang Couple: thanh điều hướng, tiêu đề, và đủ các trạng thái
 * (đang tải, chưa đăng nhập, chọn tiệc, lỗi, chưa đủ quyền). Trang con chỉ lo nội dung chính.
 */
export function CouplePage({
  active,
  eyebrow,
  title,
  description,
  requireFull,
  children,
}: CouplePageProps) {
  const { state, reload, bookingId } = useCoupleWorkspace();
  // Trong /khong-gian thanh trên đã hiện sảnh, ngày, ca → không lặp lại dải thông tin tiệc.
  const inSpace = useInSpace();

  return (
    <WorkspaceShell active={active} bookingId={bookingId ?? undefined}>
      <div className="cw-page">
        <header className="cw-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <p className="lead">{description}</p> : null}
          {state.status === 'ready' && !inSpace ? <BookingStrip proposal={state.proposal} /> : null}
        </header>
        {state.status === 'loading' ? <Skeleton label="Đang tải dữ liệu tiệc cưới…" /> : null}
        {state.status === 'anonymous' ? (
          <EmptyPanel title="Cần đăng nhập">
            <p>Đăng nhập bằng tài khoản đã được nhà hàng mời để tiếp tục.</p>
            <Link className="button" href="/dang-nhap">
              Đăng nhập
            </Link>
          </EmptyPanel>
        ) : null}
        {state.status === 'error' ? <ErrorPanel error={state.error} onRetry={reload} /> : null}
        {state.status === 'choose-booking' ? (
          state.bookings.length === 0 ? (
            <EmptyPanel title="Chưa có tiệc cưới">
              <p>Nhà hàng sẽ mở hồ sơ sau buổi tư vấn. Bạn có thể gửi yêu cầu tư vấn mới.</p>
              <Link className="button button-secondary" href="/tu-van">
                Gửi yêu cầu tư vấn
              </Link>
            </EmptyPanel>
          ) : (
            <section className="cw-card">
              <h2>Chọn tiệc cưới</h2>
              <ul className="cw-list">
                {state.bookings.map((booking) => (
                  <li key={booking.bookingId}>
                    <Link href={`?bookingId=${booking.bookingId}`}>
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
          requireFull && state.proposal.capabilities.accessLevel !== 'FULL' ? (
            <EmptyPanel title="Mở sau khi đặt cọc">
              <p>
                Chức năng này dành cho tiệc đã được xác nhận. Sau khi khoản cọc được nhà hàng ghi
                nhận, không gian của hai bạn sẽ tự mở đầy đủ.
              </p>
              <div className="cw-actions">
                <Link
                  className="button"
                  href={`/khong-gian/thoa-thuan/hop-dong?bookingId=${state.proposal.bookingId}`}
                >
                  Xem hợp đồng
                </Link>
                <Link
                  className="button button-secondary"
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
    </WorkspaceShell>
  );
}

function BookingStrip({ proposal }: Readonly<{ proposal: Proposal }>) {
  return (
    <p className="cw-strip">
      <span className="status status-champagne">{phaseLabels[proposal.phase]}</span>
      <span>{proposal.proposal.hall.name}</span>
      <span>{formatEventDate(proposal.eventDate)}</span>
      <span>
        {shiftLabel(proposal.proposal.shift.code)} {proposal.proposal.shift.startTime}–
        {proposal.proposal.shift.endTime}
      </span>
      <span className="status status-muted">
        {proposal.capabilities.accessLevel === 'FULL'
          ? 'Quyền đầy đủ'
          : 'Quyền hạn chế (trước cọc)'}
      </span>
    </p>
  );
}

export function EmptyPanel({ title, children }: Readonly<{ title: string; children?: ReactNode }>) {
  return (
    <section className="cw-card cw-empty">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ErrorPanel({
  error,
  onRetry,
}: Readonly<{ error: FriendlyError; onRetry?: () => void }>) {
  return (
    <div className="cw-alert" role="alert">
      <p>{error.message}</p>
      {error.requestId ? <small>Mã hỗ trợ: {error.requestId}</small> : null}
      {onRetry ? (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

/** Hiển thị kết quả của lệnh ghi gần nhất (thành công hoặc lỗi). */
export function CommandFeedback({
  error,
  notice,
}: Readonly<{ error: FriendlyError | null; notice: string | null }>) {
  if (error) return <ErrorPanel error={error} />;
  if (notice)
    return (
      <p className="cw-success" role="status">
        {notice}
      </p>
    );
  return null;
}
