import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import './public.css';

export const metadata: Metadata = {
  title: 'Wedding Estate | Cùng chuẩn bị ngày chung đôi',
  description:
    'Khám phá sảnh tiệc, thực đơn và hẹn tư vấn cùng nhà hàng. Không gian riêng để hai bạn cùng chuẩn bị ngày cưới.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
