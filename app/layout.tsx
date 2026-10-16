import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { OfflineBanner } from '../src/design-system/offline-banner';
import './globals.css';
import './public.css';
import './v0-workspace.css';
import './couple.css';
import './hy-yen.css';

export const metadata: Metadata = {
  title: 'Hỷ Yến | Cùng chuẩn bị ngày chung đôi',
  description:
    'Khám phá sảnh tiệc, thực đơn và hẹn tư vấn cùng nhà hàng. Không gian riêng để hai bạn cùng chuẩn bị ngày cưới.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
