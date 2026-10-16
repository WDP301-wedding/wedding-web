import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadCatalog, loadHall } from '../../../src/features/public-website/catalog-server';
import { HallDetailPage } from '../../../src/features/public-website/public-pages';

/**
 * ISR theo từng sảnh: lần đầu có người mở `/sanh/<id>` thì dựng trang rồi cache, 300 giây sau
 * làm mới. Không liệt kê sẵn id lúc build (generateStaticParams rỗng) để build không phụ thuộc
 * backend. Đường dẫn dùng id (UUID) vì API catalog chưa có slug.
 */
export const revalidate = 300;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hall = await loadHall((await params).id);
  return hall
    ? { title: `${hall.name} | Hỷ Yến`, description: hall.description.slice(0, 160) }
    : { title: 'Sảnh tiệc | Hỷ Yến' };
}

export default async function HallDetail({ params }: Props) {
  const { id } = await params;
  const [hall, catalog] = await Promise.all([loadHall(id), loadCatalog()]);
  if (!hall) notFound();
  return <HallDetailPage hall={hall} catalog={catalog} />;
}
