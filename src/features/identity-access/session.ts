import type { components } from '../../lib/api/generated/schema';
import { ApiClientError, createApiClient, type ApiClient } from '../../lib/api/client';

type Role = components['schemas']['AccountSummary']['roles'][number];

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

type SessionCredential = Readonly<{
  accessToken: string;
  accessExpiresAt: string;
  sessionId: string;
}>;

type IssuedSession = SessionCredential &
  Readonly<{
    account: Omit<CurrentActor, 'sessionId'>;
  }>;

export interface IdentityApi {
  acceptInvitation(this: void, token: string, password: string): Promise<IssuedSession>;
  completePasswordReset(this: void, token: string, newPassword: string): Promise<void>;
  createSession(this: void, email: string, password: string): Promise<IssuedSession>;
  getCurrentUser(this: void, accessToken: string): Promise<CurrentActor>;
  logout(this: void, accessToken: string): Promise<void>;
  refreshSession(this: void): Promise<SessionCredential>;
  requestPasswordReset(this: void, email: string): Promise<void>;
}

export type WebSessionSnapshot =
  | Readonly<{ status: 'anonymous'; denial: null }>
  | Readonly<{
      status: 'authenticated';
      access: 'restricted' | 'full';
      actor: CurrentActor;
      denial: 'forbidden' | 'not-found' | null;
    }>;

const anonymousSnapshot = { status: 'anonymous', denial: null } as const;
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
  replaceHistory(`${url.pathname}${url.search}`);

  if (invitationToken !== null && invitationPattern.test(invitationToken)) {
    return { kind: 'invitation', token: invitationToken };
  }
  if (resetToken !== null && resetPattern.test(resetToken)) {
    return { kind: 'reset', token: resetToken };
  }
  return null;
}

export class WebIdentitySession {
  private accessToken: string | null = null;
  private restoreOperation: Promise<WebSessionSnapshot> | null = null;
  private state: WebSessionSnapshot = anonymousSnapshot;

  constructor(private readonly api: IdentityApi) {}

  snapshot(): WebSessionSnapshot {
    return this.state;
  }

  discardRevokedSession(): void {
    this.clear();
  }

  async login(email: string, password: string): Promise<WebSessionSnapshot> {
    return this.finishSignIn(await this.api.createSession(email, password));
  }

  async acceptInvitation(token: string, password: string): Promise<WebSessionSnapshot> {
    return this.finishSignIn(await this.api.acceptInvitation(token, password));
  }

  restore(): Promise<WebSessionSnapshot> {
    this.restoreOperation ??= this.restoreFromCookie().finally(() => {
      this.restoreOperation = null;
    });
    return this.restoreOperation;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.api.requestPasswordReset(email);
  }

  async completePasswordReset(token: string, password: string): Promise<void> {
    try {
      await this.api.completePasswordReset(token, password);
    } finally {
      this.clear();
    }
  }

  async logout(): Promise<void> {
    const token = this.accessToken;
    try {
      if (token !== null) await this.api.logout(token);
    } finally {
      this.clear();
    }
  }

  async authorize<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    if (this.accessToken === null) throw new Error('Authentication is required.');

    try {
      return await operation(this.accessToken);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        this.clear();
      } else if (
        this.state.status === 'authenticated' &&
        error instanceof ApiClientError &&
        (error.status === 403 || error.status === 404)
      ) {
        this.state = {
          ...this.state,
          denial: error.status === 403 ? 'forbidden' : 'not-found',
        };
      }
      throw error;
    }
  }

  private async restoreFromCookie(): Promise<WebSessionSnapshot> {
    try {
      const refreshed = await this.api.refreshSession();
      return await this.finishSignIn(refreshed);
    } catch {
      this.clear();
      return this.state;
    }
  }

  private async finishSignIn(credential: SessionCredential): Promise<WebSessionSnapshot> {
    this.accessToken = credential.accessToken;
    try {
      const actor = await this.api.getCurrentUser(credential.accessToken);
      this.state = {
        status: 'authenticated',
        access: actor.roles.includes('COUPLE') ? 'full' : 'restricted',
        actor,
        denial: null,
      };
      return this.state;
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  private clear(): void {
    this.accessToken = null;
    this.state = anonymousSnapshot;
  }
}

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('The identity response did not include data.');
  return data;
}

export function createIdentityApi(client?: ApiClient): IdentityApi {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());

  return {
    async acceptInvitation(token, password) {
      const { data } = await api().POST('/workspace-invitation-acceptances', {
        body: { invitationToken: token, password },
        credentials: 'include',
      });
      return normalizeIssuedSession(requireData(data).data);
    },
    async completePasswordReset(token, newPassword) {
      await api().POST('/auth/password-reset-completions', {
        body: { resetToken: token, newPassword },
      });
    },
    async createSession(email, password) {
      const { data } = await api().POST('/auth/web-sessions', {
        body: { email, password },
        credentials: 'include',
      });
      return normalizeIssuedSession(requireData(data).data);
    },
    async getCurrentUser(accessToken) {
      const { data } = await api().GET('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return normalizeActor(requireData(data).data);
    },
    async logout(accessToken) {
      await api().DELETE('/auth/sessions/current', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    async refreshSession() {
      const { data } = await api().POST('/auth/web-session-refreshes', {
        body: {},
        credentials: 'include',
        params: { cookie: { '__Host-wedding-refresh': '' } },
      });
      return requireData(data).data;
    },
    async requestPasswordReset(email) {
      await api().POST('/auth/password-reset-requests', { body: { email } });
    },
  };
}

function normalizeActor(
  actor: Readonly<{
    accountId: string;
    displayEmail: string;
    roles: ArrayLike<Role>;
    sessionId: string;
  }>,
): CurrentActor {
  return { ...actor, roles: Array.from(actor.roles) };
}

function normalizeIssuedSession(
  session: Readonly<{
    accessExpiresAt: string;
    accessToken: string;
    account: Readonly<{ accountId: string; displayEmail: string; roles: ArrayLike<Role> }>;
    sessionId: string;
  }>,
): IssuedSession {
  return {
    accessExpiresAt: session.accessExpiresAt,
    accessToken: session.accessToken,
    account: {
      ...session.account,
      roles: Array.from(session.account.roles),
    },
    sessionId: session.sessionId,
  };
}
