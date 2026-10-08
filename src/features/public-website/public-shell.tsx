import Link from 'next/link';
import type { ReactNode } from 'react';

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#public-content">
        Đi đến nội dung chính
      </a>
      <header className="public-header">
        <Link className="estate-brand" href="/" aria-label="Wedding Estate — Trang chủ">
          <small>THE</small>
          <strong>WEDDING ESTATE</strong>
          <span>Nơi ngày chung đôi bắt đầu</span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <Link href="/halls">Không gian tiệc</Link>
          <Link href="/menus">Thực đơn</Link>
          <Link href="/overview">Kế hoạch của bạn</Link>
          <Link href="/account">Tài khoản</Link>
          <Link className="public-button" href="/consultation">
            Hẹn tư vấn <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>
      <main id="public-content">{children}</main>
      <footer className="public-footer">
        <Link className="estate-brand" href="/">
          WEDDING ESTATE
        </Link>
        <p>Cùng bạn chuẩn bị từng quyết định cho ngày chung đôi.</p>
        <nav aria-label="Điều hướng cuối trang">
          <Link href="/consultation">Liên hệ tư vấn</Link>
          <Link href="/account">Đăng nhập</Link>
          <Link href="/halls">Khám phá sảnh tiệc</Link>
        </nav>
      </footer>
    </>
  );
}
