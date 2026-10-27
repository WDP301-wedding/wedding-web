import { redirect } from 'next/navigation';
import { routes } from '../../src/routes';

/** T4 · Điều hướng /ho-so cũ sang /khong-gian/ho-so để hiển thị đầy đủ sidebar. */
export default function Page() {
  redirect(routes.profile);
}
