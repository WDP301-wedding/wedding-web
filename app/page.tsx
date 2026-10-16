import { loadCatalog } from '../src/features/public-website/catalog-server';
import { HomePage } from '../src/features/public-website/public-pages';

/**
 * ISR: Next dựng sẵn HTML trang chủ và làm mới tối đa mỗi 300 giây (phải là số literal để
 * Next đọc được lúc build — giá trị khớp `catalogRevalidateSeconds`).
 */
export const revalidate = 300;

export default async function Home() {
  return <HomePage catalog={await loadCatalog()} />;
}
