import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '../../app/page';
import { IdentityExperience, PublicIdentityPage } from '../features/identity-access/identity-page';
import {
  consumeCredentialFragment,
  WebIdentitySession,
  type IdentityApi,
} from '../features/identity-access/session';
import { ApiClientError } from '../lib/api/client';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const accountId = '24dcfaac-4408-4d42-8d66-456ed6ee7ea4';
const sessionId = '3bd38130-13f4-4c14-8c93-cf0c20781d7e';

function createApi(roles: readonly ('MANAGER' | 'STAFF' | 'COUPLE')[] = []): IdentityApi {
  const account = { accountId, displayEmail: 'minhanh@example.com', roles };
  const issued = {
    account,
    accessToken: 'wia_access',
    accessExpiresAt: '2026-10-04T10:10:00.000Z',
    sessionId,
  };

  return {
    acceptInvitation: vi.fn().mockResolvedValue(issued),
    createSession: vi.fn().mockResolvedValue(issued),
    getCurrentUser: vi.fn().mockResolvedValue({ ...account, sessionId }),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn().mockResolvedValue({
      accessToken: 'wia_rotated',
      accessExpiresAt: '2026-10-04T10:20:00.000Z',
      sessionId,
    }),
  };
}

describe('Public identity session', () => {
  it('removes an invitation credential from browser history without using Web Storage', () => {
    const replace = vi.fn();
    const localWrite = vi.spyOn(Storage.prototype, 'setItem');

    const invitationToken = `wii_${'a'.repeat(43)}`;
    const credential = consumeCredentialFragment(
      `https://wedding.example/thu-moi#invitationToken=${invitationToken}`,
      replace,
    );

    expect(credential).toEqual({
      kind: 'invitation',
      token: invitationToken,
    });
    expect(replace).toHaveBeenCalledWith('/thu-moi');
    expect(localWrite).not.toHaveBeenCalled();
  });

  it('restores once through the refresh cookie and derives restricted presentation from /auth/me', async () => {
    const api = createApi();
    const session = new WebIdentitySession(api);

    const [first, second] = await Promise.all([session.restore(), session.restore()]);

    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(api.getCurrentUser).toHaveBeenCalledWith('wia_rotated');
    expect(first).toEqual(second);
    expect(first).toMatchObject({ status: 'authenticated', access: 'restricted' });
    expect(JSON.stringify(first)).not.toContain('wia_rotated');
  });

  it('clears memory state after logout', async () => {
    const api = createApi(['COUPLE']);
    const session = new WebIdentitySession(api);

    await session.login('minhanh@example.com', 'a-safe-password');
    expect(session.snapshot()).toMatchObject({ status: 'authenticated', access: 'full' });

    await session.logout();
    expect(api.logout).toHaveBeenCalledWith('wia_access');
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });

  it('keeps 403 presentation-only and clears stale state after a backend 401', async () => {
    const api = createApi(['COUPLE']);
    const session = new WebIdentitySession(api);
    await session.login('minhanh@example.com', 'a-safe-password');

    await expect(
      session.authorize(() =>
        Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'FORBIDDEN',
            message: 'Forbidden.',
            requestId: accountId,
            status: 403,
          }),
        ),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(session.snapshot()).toMatchObject({ denial: 'forbidden', status: 'authenticated' });

    await expect(
      session.authorize(() =>
        Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'SESSION_REVOKED',
            message: 'Authentication is required.',
            requestId: accountId,
            status: 401,
          }),
        ),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });

  it('refreshes an expired access token once and retries the operation', async () => {
    const api = createApi(['COUPLE']);
    const session = new WebIdentitySession(api);
    await session.login('minhanh@example.com', 'a-safe-password');
    const operation = vi
      .fn<(token: string) => Promise<string>>()
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Expired.',
          requestId: accountId,
          status: 401,
        }),
      )
      .mockResolvedValueOnce('ok');

    await expect(session.authorize(operation)).resolves.toBe('ok');
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenLastCalledWith('wia_rotated');
    expect(session.snapshot()).toMatchObject({ status: 'authenticated' });
  });
});

describe('Public identity experience', () => {
  it('keeps the route component thin and connected to the identity experience', () => {
    expect(HomePage()).toBeTruthy();
  });

  it('removes a credential fragment again during hydration', () => {
    window.history.replaceState(null, '', `/#resetToken=wip_${'a'.repeat(43)}`);

    render(<PublicIdentityPage />);

    expect(window.location.hash).toBe('');
  });

  it('accepts an invitation at most once and renders restricted workspace state', async () => {
    const api = createApi();
    const session = new WebIdentitySession(api);

    render(
      <IdentityExperience
        session={session}
        initialCredential={{ kind: 'invitation', token: 'wii_invitation' }}
      />,
    );

    fireEvent.change(await screen.findByLabelText('Mật khẩu'), {
      target: { value: 'sample-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: 'sample-password-123' },
    });
    const invitationForm = screen.getByRole('button', { name: 'Xác nhận lời mời' }).closest('form');
    expect(invitationForm).not.toBeNull();
    fireEvent.submit(invitationForm!);
    fireEvent.submit(invitationForm!);

    await waitFor(() => expect(api.acceptInvitation).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Không gian tư vấn')).toBeVisible();
    expect(screen.getByText(/quyền truy cập giới hạn/i)).toBeVisible();
  });
});
