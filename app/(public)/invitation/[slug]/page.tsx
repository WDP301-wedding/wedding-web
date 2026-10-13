import { PublicInvitationView } from '@/src/features/invitation-studio/public-invitation-view';
import { ApiClientError } from '@/src/lib/api/client';
import { readPublicEnv } from '@/src/lib/env';
import { notFound } from 'next/navigation';
import { createInvitationGateway } from '@/src/features/invitation-studio/invitation-api';

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
