import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { CurrentActor, IdentityApi, IssuedSession, Role } from './session-types';

function requireData<T>(data: T | undefined): T {
  if (data === undefined) throw new Error('The identity response did not include data.');
  return data;
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
  };
}

