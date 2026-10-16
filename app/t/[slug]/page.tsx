import { PublicInvitationView } from '@/src/features/invitation-studio/public-invitation-view';
import { ApiClientError } from '@/src/lib/api/client';
import { readPublicEnv } from '@/src/lib/env';
import { notFound } from 'next/navigation';
import { createInvitationGateway } from '@/src/features/invitation-studio/invitation-api';

/**
 * C1 · Thiệp công khai `/t/[slug]` (trước đây /invitation/[slug]).
 * ISR: trang được dựng sẵn và làm mới tối đa mỗi 5 phút → khách mở thiệp gần như tức thì,
 * backend không bị gọi lại cho từng lượt xem. Thiệp bị gỡ sẽ trả 404 ở lần làm mới kế tiếp.
 */
export const revalidate = 300;
/** Không dựng sẵn thiệp nào lúc build; thiệp được dựng khi có người mở lần đầu rồi cache (ISR). */
export function generateStaticParams() {
  return [];
}

interface PublicInvitationPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PublicInvitationPage({ params }: PublicInvitationPageProps) {
  const { slug } = await params;
  const gateway = createInvitationGateway();

  let invitation;
  try {
    invitation = await gateway.getPublicInvitation(slug);
  } catch (error: unknown) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  return (
    <PublicInvitationView
      invitation={invitation}
      apiBase={readPublicEnv().NEXT_PUBLIC_API_BASE_URL}
    />
  );
}
