import { ActiveBookingBoundary } from '../src/features/booking-archive/active-booking-boundary';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { OfflineBanner } from '../src/design-system/offline-banner';
import { AppToaster } from '../src/design-system/toast';
import './globals.css';
import './styles/select-field.css';
import './fonts.css';
import { beVietnamPro, playfairWordmark } from './fonts';

export const metadata: Metadata = {
  title: 'Hỷ Yến | Cùng chuẩn bị ngày chung đôi',
  description:
    'Khám phá sảnh tiệc, thực đơn và hẹn tư vấn cùng nhà hàng. Không gian riêng để hai bạn cùng chuẩn bị ngày cưới.',
  // Ảnh xem trước khi chia sẻ liên kết (Zalo, Facebook…).
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Hỷ Yến',
    images: ['/images/khoanh-khac/khach-du-tiec.webp'],
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      className={`${beVietnamPro.variable} ${playfairWordmark.variable}`}
    >
      <body>
        <OfflineBanner />
        <ActiveBookingBoundary>{children}</ActiveBookingBoundary>
        <AppToaster />
      </body>
    </html>
  );
}
