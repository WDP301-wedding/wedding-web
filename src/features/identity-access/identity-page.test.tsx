import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IdentityExperience } from './identity-page';
import { WebIdentitySession, type IdentityApi } from './session';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dang-nhap',
}));

function createMockApi(): IdentityApi {
  return {
    acceptInvitation: vi.fn(),
    createSession: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn().mockRejectedValue(new Error('no session')),
  };
}

describe('Identity login password visibility toggle', () => {
  it('toggles password visibility with an accessible eye icon button placed inside the field', async () => {
    const api = createMockApi();
    const session = new WebIdentitySession(api);

    render(
      <IdentityExperience
        session={session}
        initialCredential={null}
        startView="login"
      />,
    );

    const passwordInput = await screen.findByLabelText('Mật khẩu');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Button uses eye icon with accessible label
    const toggleButton = screen.getByRole('button', { name: 'Hiện mật khẩu' });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton.querySelector('svg')).not.toBeNull();

    // Plain text 'Hiện' / 'Ẩn' should not be present as button text
    expect(screen.queryByText('Hiện')).toBeNull();
    expect(screen.queryByText('Ẩn')).toBeNull();

    // Click eye icon to reveal password
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeInTheDocument();

    // Click again to hide password
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toBeInTheDocument();
  });
});
