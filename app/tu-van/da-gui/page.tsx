import type { Metadata } from 'next';

import { loadCatalog } from '../../../src/features/public-website/catalog-server';
import { ConsultationSentPage } from '../../../src/features/public-website/public-pages';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Đã gửi yêu cầu | Hỷ Yến',
  robots: { index: false },
};

export default async function ConsultationSent() {
  return <ConsultationSentPage restaurant={(await loadCatalog()).restaurant} />;
}
