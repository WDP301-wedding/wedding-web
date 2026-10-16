'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { PublicIdentityPage } from '../../src/features/identity-access/identity-page';
import { routes } from '../../src/routes';

/** T1 · Đăng nhập. Đã có phiên (hoặc vừa đăng nhập xong) → vào thẳng Không gian cưới. */
export default function LoginPage() {
  const router = useRouter();
  const openSpace = useCallback(() => router.replace(routes.space), [router]);
  return <PublicIdentityPage onAuthenticated={openSpace} />;
}
