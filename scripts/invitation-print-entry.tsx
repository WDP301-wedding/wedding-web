import { renderToStaticMarkup } from 'react-dom/server';
import type { InvitationContent } from '../src/features/invitation-studio/invitation-content';
import { InvitationPrintContents } from '../src/features/invitation-studio/invitation-print-contents';
import '../app/styles/invitation-card.css';
import '../app/styles/invitation-card-themes.css';
import '../src/features/invitation-studio/invitation-print.css';

export function renderInvitationMarkup(
  invitation: InvitationContent & { qrDataUrl?: string },
): string {
  return renderToStaticMarkup(
    <InvitationPrintContents
      invitation={invitation}
      {...(invitation.qrDataUrl ? { qrDataUrl: invitation.qrDataUrl } : {})}
    />,
  );
}
