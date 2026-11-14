import type { components } from '../../lib/api/generated/schema';

export type Role = components['schemas']['AccountSummary']['roles'][number];

export type BootstrapCredential = Readonly<{
  kind: 'invitation' | 'reset';
  token: string;
}>;

export type CurrentActor = Readonly<{
  accountId: string;
  displayEmail: string;
  roles: readonly Role[];
  sessionId: string;
}>;

export type SessionCredential = Readonly<{
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}>;

export type IssuedSession = SessionCredential &
  Readonly<{
    account: Omit<CurrentActor, 'sessionId'>;
  }>;

export interface IdentityApi {
  acceptInvitation(this: void, token: string, password: string): Promise<IssuedSession>;
  createSession(this: void, email: string, password: string): Promise<IssuedSession>;
  getCurrentUser(this: void, accessToken: string): Promise<CurrentActor>;
  getInvitationDetails?(this: void, token: string): Promise<{ maskedEmail: string } | null>;
  logout(this: void, accessToken: string): Promise<void>;
  refreshSession(this: void): Promise<SessionCredential>;
}

export type WebSessionSnapshot =
  | Readonly<{ status: 'anonymous'; denial: null }>
  | Readonly<{
      status: 'authenticated';
      access: 'restricted' | 'full';
      actor: CurrentActor;
      denial: 'forbidden' | 'not-found' | null;
    }>;

export const anonymousSnapshot = { status: 'anonymous', denial: null } as const;
const invitationPattern = /^wii_[A-Za-z0-9_-]{43}$/u;
const resetPattern = /^wip_[A-Za-z0-9_-]{43}$/u;

export function consumeCredentialFragment(
  href: string,
  replaceHistory: (safePath: string) => void,
): BootstrapCredential | null {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const raw = url.hash.slice(1);
  const invitationToken =
    fragment.get('invitationToken') ?? (invitationPattern.test(raw) ? raw : null);
  const resetToken = fragment.get('resetToken') ?? (resetPattern.test(raw) ? raw : null);
  // Chỉ dọn URL khi fragment thật sự mang mã. Module trang đăng nhập được tải lần đầu ngay giữa
  // lúc Next.js đang chuyển trang; ghi đè history lúc đó làm lần điều hướng ấy bị huỷ.
  if (invitationToken !== null || resetToken !== null) {
    replaceHistory(`${url.pathname}${url.search}`);
  }

  if (invitationToken !== null && invitationPattern.test(invitationToken)) {
    return { kind: 'invitation', token: invitationToken };
  }
  if (resetToken !== null && resetPattern.test(resetToken)) {
    return { kind: 'reset', token: resetToken };
  }
  return null;
}
