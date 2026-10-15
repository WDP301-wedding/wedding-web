import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from '../../design-system/brand-mark';
import { PublicHeader } from './public-header';

export { PublicHeader } from './public-header';

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#public-content">
        Đi đến nội dung chính
      </a>
      <PublicHeader />
      <main id="public-content">{children}</main>
      <footer className="public-footer">
        <Link className="estate-brand" href="/" aria-label="Hỷ Yến — Trang chủ">
          <BrandMark />
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
