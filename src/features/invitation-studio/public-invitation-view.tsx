import { InvitationContents, type InvitationContent } from './invitation-content';
export type { InvitationContent } from './invitation-content';

/** Render only server-published data; guests have no RSVP or edit actions. */
export function PublicInvitationView({
  invitation,
  apiBase,
  recipientGreeting,
}: Readonly<{ invitation: InvitationContent; apiBase: string; recipientGreeting?: string }>) {
  return (
    <main className="mx-auto my-8 w-[min(100%-2rem,68rem)] max-[600px]:my-4">
      <article className="hy-invite-card overflow-hidden rounded-[var(--hy-radius-lg)] shadow-hy-2 animate-in duration-600 ease-hy-decelerate fade-in fill-mode-backwards slide-in-from-bottom-2 motion-reduce:animate-none">
        <InvitationContents
          invitation={invitation}
          apiBase={apiBase}
          {...(recipientGreeting ? { recipientGreeting } : {})}
        />
      </article>
    </main>
  );
}
