import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Restaurant } from './public-api';
import { PublicHeader } from './public-header';

export { PublicHeader } from './public-header';

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
    <>
      <a className="skip-link" href="#public-content">
        Đi đến nội dung chính
      </a>
      <PublicHeader showOffers={showOffers} />
      <main id="public-content">{children}</main>
      <footer className="hy-footer">
        <div className="hy-footer-inner">
          <div className="hy-footer-brand">
            <Link className="estate-brand" href="/" aria-label="Hỷ Yến — Trang chủ">
              <Image
                className="hy-footer-logo"
                src="/images/hy-yen-logo.png"
                alt="Hỷ Yến Wedding"
                width={394}
                height={414}
              />
            </Link>
            <p>Nhà hàng tiệc cưới Hỷ Yến – đồng hành cùng hai bạn từ buổi tư vấn đến ngày cưới.</p>
          </div>
          <nav aria-label="Điều hướng cuối trang">
            <h2>Khám phá</h2>
            <Link href="/sanh">Sảnh tiệc</Link>
            <Link href="/thuc-don">Thực đơn</Link>
            <Link href="/tu-van">Nhận tư vấn</Link>
            <Link href="/dang-nhap">Đăng nhập Không gian cưới</Link>
          </nav>
          <div className="hy-footer-contact">
            <h2>Liên hệ</h2>
            {restaurant?.address ? <p>{restaurant.address}</p> : null}
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
            {!restaurant?.address && !restaurant?.publicPhone && !restaurant?.publicEmail ? (
              <p>
                <Link href="/tu-van">Gửi yêu cầu, nhà hàng sẽ liên hệ lại với hai bạn →</Link>
              </p>
            ) : null}
          </div>
        </div>
        <p className="hy-footer-bottom">
          © {new Date().getFullYear()} Hỷ Yến. Trân trọng từng khoảnh khắc.
        </p>
      </footer>
    </>
  );
}
