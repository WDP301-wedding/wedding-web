import type { InvitationContent } from './invitation-content';
import { LegacyInvitationContents } from './legacy-invitation-contents';
import { buildInvitationPages, InvitationCoverContent } from './invitation-pages';
import styles from './interactive-invitation.module.css';
import ornamentStyles from './invitation-ornament.module.css';
import { InvitationOrnament } from './invitation-ornament';
import Image from 'next/image';

/** Static reading pages from the Content tab; no separate PDF layout or text copy. */
export function InvitationPrintContents({
  invitation,
  qrDataUrl,
}: Readonly<{ invitation: InvitationContent; qrDataUrl?: string }>) {
  const apiBase = 'https://invitation.invalid';
  const qr = qrDataUrl ? (
    <footer data-print-qr>
      <Image src={qrDataUrl} alt="Mã QR mở thiệp trực tuyến" width={120} height={120} unoptimized />
      <p>Mở thiệp trực tuyến</p>
    </footer>
  ) : null;
  if (!invitation.presentation)
    return (
      <main data-invitation-print>
        <LegacyInvitationContents invitation={invitation} apiBase={apiBase} />
        {qr}
      </main>
    );
  const { theme, layout, decoration } = invitation.presentation;
  const pages = buildInvitationPages(invitation, apiBase);
  return (
    <main data-invitation-print>
      <div className={styles.invitation} data-theme={theme} data-layout={layout} data-print>
        <div className={styles.readAll}>
          <section className={styles.cover} data-print-page="Bìa thiệp">
            {layout === 'gatefold' ? (
              <>
                <span className={styles.leftDoor} aria-hidden="true" />
                <span className={styles.rightDoor} aria-hidden="true" />
              </>
            ) : layout !== 'album' || !decoration ? (
              <div className={styles.envelopeFlap} aria-hidden="true" />
            ) : null}
            {decoration ? <InvitationOrnament decoration={decoration} face="cover" /> : null}
            <InvitationCoverContent invitation={invitation} apiBase={apiBase} />
          </section>
          {pages.map((page, index) => (
            <section
              key={page.title}
              className={
                decoration && index < 2
                  ? `${styles.paper} ${ornamentStyles.printInterior}`
                  : styles.paper
              }
              data-print-page={page.title}
            >
              {decoration && index < 2 ? (
                <InvitationOrnament decoration={decoration} face="inside" />
              ) : null}
              {page.content}
              {index === pages.length - 1 ? qr : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
