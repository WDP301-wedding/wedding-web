import type { Metadata } from 'next';

import { loadCatalog } from '../../src/features/public-website/catalog-server';
import { ConsultationPage } from '../../src/features/public-website/public-pages';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Nhận tư vấn | Hỷ Yến',
  description: 'Để lại thông tin, quản lý tiệc sẽ gọi lại để kiểm tra lịch trống và hẹn xem sảnh.',
};

export default async function Consultation() {
  return <ConsultationPage catalog={await loadCatalog()} />;
}
