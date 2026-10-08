import { PublicWebsite } from '../../../src/features/public-website/public-pages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <PublicWebsite section="hall" hallId={(await params).id} />;
}
