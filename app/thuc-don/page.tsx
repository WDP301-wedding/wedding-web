import type { Metadata } from 'next';

import { loadCatalog } from '../../src/features/public-website/catalog-server';
import { MenusPage } from '../../src/features/public-website/public-pages';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Thực đơn | Hỷ Yến',
  description: 'Thực đơn tiệc cưới, giá theo bàn 10 khách và danh sách món.',
};

export default async function Menus() {
  return <MenusPage catalog={await loadCatalog()} />;
}
