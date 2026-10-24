import styles from './invitation.module.css';
import { InvitationContents, type InvitationContent } from './invitation-content';
export type { InvitationContent } from './invitation-content';

/** Render only server-published data; guests have no RSVP or edit actions. */
export function PublicInvitationView({
  invitation,
  apiBase,
  recipientGreeting,
}: Readonly<{ invitation: InvitationContent; apiBase: string; recipientGreeting?: string }>) {
  return (
    <div className="v0-workspace">
      <main className={styles.shell}>
        <div className="public-invitation-layout" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <article className="hy-invite-card">
            <InvitationContents
              invitation={invitation}
              apiBase={apiBase}
              {...(recipientGreeting ? { recipientGreeting } : {})}
            />
          </article>
        </div>
      </main>
    </div>
  );
}
