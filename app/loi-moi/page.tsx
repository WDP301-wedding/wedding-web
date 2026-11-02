'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { PublicIdentityPage } from '../../src/features/identity-access/identity-page';
import { routes } from '../../src/routes';

/**
 * T3 · Nhận lời mời vào không gian cưới: `/loi-moi#invitationToken=…`.
 * Sau khi khách xác nhận lời mời thành công, tự động chuyển thẳng vào Không gian cưới.
 */
export default function InvitationPage() {
  const router = useRouter();
  const openSpace = useCallback(() => router.replace(routes.space), [router]);
  return (
    <PublicIdentityPage
      onAuthenticated={openSpace}
      loginHint="Liên kết này thiếu mã lời mời. Hãy mở lại đúng liên kết trong email nhà hàng gửi, hoặc đăng nhập nếu bạn đã nhận lời mời trước đó."
    />
  );
}
