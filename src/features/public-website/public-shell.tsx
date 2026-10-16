import Link from 'next/link';
import type { ReactNode } from 'react';

import { BrandMark } from '../../design-system/brand-mark';
import type { Restaurant } from './public-api';
import { PublicHeader } from './public-header';

export { PublicHeader } from './public-header';

/**
 * Khung trang công khai: header (client, biết trạng thái đăng nhập) + footer tối có hotline.
 * Footer render ở server từ hồ sơ nhà hàng (catalog) nên không cần JS.
 */
export function PublicShell({
  children,
  restaurant = null,
  showOffers = false,
}: Readonly<{ children: ReactNode; restaurant?: Restaurant | null; showOffers?: boolean }>) {
  return (
    <>
      <a className="skip-link" href="#public-content">
        Đi đến nội dung chính
      </a>
      <PublicHeader showOffers={showOffers} />
      <main id="public-content">{children}</main>
      <footer className="hy-footer">
        <div>
          <Link className="estate-brand" href="/" aria-label="Hỷ Yến — Trang chủ">
            <BrandMark />
          </Link>
          {restaurant?.address ? <p>{restaurant.address}</p> : null}
        </div>
        <nav aria-label="Điều hướng cuối trang">
          <Link href="/sanh">Sảnh tiệc</Link>
          <Link href="/thuc-don">Thực đơn</Link>
          <Link href="/tu-van">Nhận tư vấn</Link>
          <Link href="/dang-nhap">Đăng nhập Không gian cưới</Link>
        </nav>
        <div className="hy-footer-contact">
          {restaurant?.publicPhone ? (
            <p>
              Hotline:{' '}
              <a href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}>
                <strong>{restaurant.publicPhone}</strong>
              </a>
            </p>
          ) : null}
          {restaurant?.publicEmail ? (
            <p>
              <a href={`mailto:${restaurant.publicEmail}`}>{restaurant.publicEmail}</a>
            </p>
          ) : null}
        </div>
      </footer>
    </>
  );
}
