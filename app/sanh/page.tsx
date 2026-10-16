import type { Metadata } from 'next';

import { loadCatalog } from '../../src/features/public-website/catalog-server';
import { HallsPage } from '../../src/features/public-website/public-pages';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Sảnh tiệc | Hỷ Yến',
  description: 'Các sảnh tiệc cưới, sức chứa và hình ảnh. Lọc theo số khách dự kiến.',
};

export default async function Halls() {
  return <HallsPage catalog={await loadCatalog()} />;
}
