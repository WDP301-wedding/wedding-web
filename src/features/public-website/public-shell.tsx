import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from 'cn';

import { PageTransition } from '../../design-system/page-transition';
import type { Restaurant } from './public-api';
import { container } from './public-classes';
import { PublicHeader } from './public-header';

export { PublicHeader } from './public-header';

const footerLink = 'text-white/80 transition-colors hover:text-white';
const footerHeading = 'mb-1 text-sm font-semibold text-white';

/**
 * Khung trang công khai: header (client, biết trạng thái đăng nhập) + footer có hotline.
 * Footer render ở server từ hồ sơ nhà hàng (catalog) nên không cần JS.
 */
export function PublicShell({
  children,
  restaurant = null,
  showOffers = false,
}: Readonly<{ children: ReactNode; restaurant?: Restaurant | null; showOffers?: boolean }>) {
  return (
    <div data-ui-v3 className="flex min-h-dvh flex-col bg-background">
      <a
        className="sr-only z-50 rounded-lg bg-card px-4 py-2 text-sm font-semibold text-primary shadow-hy-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#public-content"
      >
        Đi đến nội dung chính
      </a>
      <PublicHeader showOffers={showOffers} />
      <main id="public-content" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      {/* Chừa chỗ cho thanh "Mở lại bảng ước tính" cố định ở đáy khi nó đang hiện. */}
      <footer className="bg-hy-ink text-sm text-white/80 [body:has([data-estimate-banner])_&]:pb-16">
        <div className={cn(container, 'grid gap-10 py-14 md:grid-cols-[2fr_1fr_1fr]')}>
          <div className="flex flex-col gap-3">
            <Link
              className="flex items-center gap-2.5 text-white"
              href="/"
              aria-label="Hỷ Yến — Trang chủ"
            >
              <Image
                className="h-11 w-auto rounded-lg bg-background p-1"
                src="/images/hy-yen-logo.png"
                alt="Hỷ Yến Wedding"
                width={394}
                height={414}
              />
              <span className="text-lg font-bold" aria-hidden="true">
                Hỷ Yến
              </span>
            </Link>
            <p className="max-w-sm">
              Nhà hàng tiệc cưới Hỷ Yến – đồng hành cùng hai bạn từ buổi tư vấn đến ngày cưới.
            </p>
          </div>
          <nav aria-label="Điều hướng cuối trang" className="flex flex-col gap-2">
            <h2 className={footerHeading}>Khám phá</h2>
            <Link className={footerLink} href="/sanh">
              Sảnh tiệc
            </Link>
            <Link className={footerLink} href="/thuc-don">
              Thực đơn
            </Link>
            <Link className={footerLink} href="/tu-van">
              Nhận tư vấn
            </Link>
            <Link className={footerLink} href="/dang-nhap">
              Đăng nhập Không gian cưới
            </Link>
          </nav>
          <div className="flex flex-col gap-2">
            <h2 className={footerHeading}>Liên hệ</h2>
            {restaurant?.address ? <p>{restaurant.address}</p> : null}
            {restaurant?.publicPhone ? (
              <p>
                Hotline:{' '}
                <a
                  className={footerLink}
                  href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}
                >
                  <strong>{restaurant.publicPhone}</strong>
                </a>
              </p>
            ) : null}
            {restaurant?.publicEmail ? (
              <p>
                <a className={footerLink} href={`mailto:${restaurant.publicEmail}`}>
                  {restaurant.publicEmail}
                </a>
              </p>
            ) : null}
            {!restaurant?.address && !restaurant?.publicPhone && !restaurant?.publicEmail ? (
              <p>
                <Link className={footerLink} href="/tu-van">
                  Gửi yêu cầu, nhà hàng sẽ liên hệ lại với hai bạn
                </Link>
              </p>
            ) : null}
          </div>
        </div>
        <p className={cn(container, 'border-t border-white/15 py-6 text-xs text-white/65')}>
          © {new Date().getFullYear()} Hỷ Yến. Trân trọng từng khoảnh khắc.
        </p>
      </footer>
    </div>
  );
}
