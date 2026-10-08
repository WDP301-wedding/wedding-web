import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebIdentitySession, type IdentityApi } from '../identity-access/session';
import { ApiClientError } from '../../lib/api/client';
import { PublicHeader } from './public-header';

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
afterEach(() => vi.clearAllMocks());

function fixture() {
  const actor = {
    accountId: '11111111-1111-4111-8111-111111111111',
    displayEmail: 'couple@example.com',
    roles: ['COUPLE'] as const,
    sessionId: '22222222-2222-4222-8222-222222222222',
  };
  const issued = {
    accessToken: 'test-access',
    accessExpiresAt: '2026-10-09T10:00:00Z',
    sessionId: actor.sessionId,
    account: actor,
  };
  const api: IdentityApi = {
    createSession: vi.fn().mockResolvedValue(issued),
    getCurrentUser: vi.fn().mockResolvedValue(actor),
    refreshSession: vi.fn().mockResolvedValue(issued),
    logout: vi.fn().mockResolvedValue(undefined),
    acceptInvitation: vi.fn(),
    completePasswordReset: vi.fn(),
    requestPasswordReset: vi.fn(),
  };
  return { api, session: new WebIdentitySession(api) };
}
describe('public navbar authentication', () => {
  it('replaces the account label after login and places logout next to the consultation action', async () => {
    const { session, api } = fixture();
    render(<PublicHeader session={session} restoreSession={false} />);
    expect(screen.getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('href', '/account');
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
    await act(() => session.login('couple@example.com', 'test-password'));
    expect(screen.getByRole('link', { name: 'couple@example.com' })).toHaveAttribute(
      'href',
      '/account',
    );
    const actions = screen.getByRole('button', { name: 'Đăng xuất' }).parentElement!;
    expect(within(actions).getByRole('link', { name: /Hẹn tư vấn/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledWith('test-access'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/account'));
    expect(screen.getByRole('link', { name: 'Tài khoản' })).toBeVisible();
    expect(screen.queryByText('couple@example.com')).not.toBeInTheDocument();
  });
  it('restores the cookie session on public pages and clears navbar identity on session expiry', async () => {
    const { session, api } = fixture();
    render(<PublicHeader session={session} />);
    await screen.findByRole('link', { name: 'couple@example.com' });
    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    await act(async () => {
      await expect(
        session.authorize(() =>
          Promise.reject(
            new ApiClientError({
              kind: 'api',
              code: 'SESSION_EXPIRED',
              status: 401,
              requestId: '11111111-1111-4111-8111-111111111111',
              message: 'Expired',
            }),
          ),
        ),
      ).rejects.toMatchObject({ status: 401 });
    });
    expect(screen.getByRole('link', { name: 'Tài khoản' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });
  it('shows a logout connection failure without an unhandled rejection or success redirect', async () => {
    const { session, api } = fixture();
    await session.login('couple@example.com', 'test-password');
    vi.mocked(api.logout).mockRejectedValue(new Error('offline'));
    render(<PublicHeader session={session} restoreSession={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể kết nối máy chủ');
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.queryByText('couple@example.com')).not.toBeInTheDocument();
  });
});
