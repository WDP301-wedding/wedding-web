import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { loadCatalog, loadHall } from '../../../src/features/public-website/catalog-server';
import { HallDetailPage } from '../../../src/features/public-website/public-pages';

export const dynamic = 'force-dynamic';

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
