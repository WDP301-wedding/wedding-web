'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Skeleton } from '../../design-system/skeleton';
import { routes } from '../../routes';
import { ErrorPanel } from './couple-page';
import { useCoupleWorkspace } from './use-couple-workspace';
import { cx } from '../commercial-contract/contract-classes';

/**
 * Cổng cho các trang /khong-gian dùng component cũ tự đọc `?bookingId` trên URL
 * (Kịch bản, Thanh toán, Thiệp…). Chờ lớp cache chọn xong tiệc (và ghi bookingId vào URL)
 * rồi mới render → component con luôn mở đúng tiệc, không bao giờ hỏi mã hồ sơ.
 * `key={bookingId}`: đổi tiệc thì React dựng lại component con với trạng thái sạch.
 */
export function SpaceGate({
  children,
  label = 'Đang mở tiệc cưới của bạn…',
}: Readonly<{ children: ReactNode; label?: string }>) {
  const { state, reload, bookingId, switching } = useCoupleWorkspace();
  if (state.status === 'loading') return <Skeleton variant="page" label={label} />;
  if (state.status === 'error') return <ErrorPanel error={state.error} onRetry={reload} />;
  if (state.status === 'anonymous')
    return (
      <section className={cx.empty}>
        <h1>Cần đăng nhập</h1>
        <p>Đăng nhập bằng tài khoản đã được nhà hàng mời để tiếp tục.</p>
        <Link className={cx.button} href={routes.login}>
          Đăng nhập
        </Link>
      </section>
    );
  if (state.status === 'choose-booking')
    return (
      <section className={cx.empty}>
        <h1>Chưa có tiệc cưới</h1>
        <p>Nhà hàng sẽ mở hồ sơ sau buổi tư vấn. Bạn có thể gửi yêu cầu tư vấn mới.</p>
        <Link className={cx.buttonOutline} href={routes.consultation}>
          Gửi yêu cầu tư vấn
        </Link>
      </section>
    );
  return (
    <div key={bookingId ?? 'none'} inert={switching} aria-busy={switching}>
      {children}
    </div>
  );
}
