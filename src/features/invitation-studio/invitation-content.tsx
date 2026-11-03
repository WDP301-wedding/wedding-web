import { InteractiveInvitation } from './interactive-invitation';
import { LegacyInvitationContents } from './legacy-invitation-contents';
import type { InvitationPresentation } from './invitation-presentation';
import type { InvitationSeating } from './print-purchase-api';
export type InvitationEvent = Readonly<{
  eventDate: string;
  hallName: string;
  shiftCode: 'LUNCH' | 'DINNER';
  startTime?: string;
}>;
export type InvitationText = Readonly<{
  brideName?: string | null;
  groomName?: string | null;
  greeting?: string | null;
  message?: string | null;
  footer?: string | null;
}>;
export type InvitationSection = Readonly<{
  kind: 'HERO' | 'MESSAGE' | 'EVENT' | 'TIMELINE' | 'SEATING' | 'FOOTER';
  textKey?: keyof InvitationText | null;
  imageUrl?: string | null;
}>;
export type InvitationContent = Readonly<{
  title: string;
  presentation?: InvitationPresentation;
  seating?: InvitationSeating | null;
  textFields: InvitationText;
  event: InvitationEvent | null;
  timeline: readonly Readonly<{
    order: number;
    startTime: string;
    title: string;
    description?: string | null;
  }>[];
  sections?: readonly InvitationSection[];
  assets: readonly Readonly<{ url: string; width: number; height: number }>[];
  theme?: string;
}>;

/** Shared renderer for editable preview and the immutable published response. */
export function InvitationContents(
  props: Readonly<{ invitation: InvitationContent; apiBase: string; recipientGreeting?: string }>,
) {
  return props.invitation.presentation ? (
    <InteractiveInvitation {...props} />
  ) : (
    <LegacyInvitationContents {...props} />
  );
}
