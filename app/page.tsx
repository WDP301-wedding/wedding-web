import { loadCatalog } from '../src/features/public-website/catalog-server';
import { HomePage } from '../src/features/public-website/public-pages';

export const dynamic = 'force-dynamic';

export default async function Home() {
  return <HomePage catalog={await loadCatalog()} />;
}
