import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IdentityExperience } from './identity-page';
import { WebIdentitySession, type IdentityApi } from './session';
import { ApiClientError } from '../../lib/api/client';

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

  it('displays inline error and friendly message when validation error occurs on password', async () => {
    const api = createMockApi();
    const validationError = new ApiClientError({
      kind: 'api',
      code: 'VALIDATION_ERROR',
      message: 'The request is invalid.',
      requestId: 'test-req-id',
      status: 400,
      details: [
        {
          path: 'password',
          code: 'too_small',
          message: 'Too small: expected string to have >=12 characters',
        },
      ],
    });
    vi.mocked(api.acceptInvitation).mockRejectedValue(validationError);
    const session = new WebIdentitySession(api);

    render(
      <IdentityExperience
        session={session}
        initialCredential={{ kind: 'invitation', token: 'test-token' }}
      />,
    );

    const passwordInput = await screen.findByLabelText(/^Mật khẩu/);
    const confirmInput = screen.getByLabelText(/^Xác nhận mật khẩu/);
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận lời mời' });

    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmInput, { target: { value: '123' } });
    fireEvent.click(submitBtn);

    // Error message should be friendly and NOT "Không thể kết nối máy chủ"
    const formErrors = await screen.findAllByText(/Mật khẩu quá ngắn/i);
    expect(formErrors.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Không thể kết nối máy chủ. Vui lòng thử lại.')).toBeNull();
    // Submit button should NOT remain disabled on error
    expect(submitBtn).not.toBeDisabled();
  });

  it('displays inline error when passwords do not match', async () => {
    const api = createMockApi();
    const session = new WebIdentitySession(api);

    render(
      <IdentityExperience
        session={session}
        initialCredential={{ kind: 'invitation', token: 'test-token' }}
      />,
    );

    const passwordInput = await screen.findByLabelText(/^Mật khẩu/);
    const confirmInput = screen.getByLabelText(/^Xác nhận mật khẩu/);
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận lời mời' });

    fireEvent.change(passwordInput, { target: { value: 'pass1' } });
    fireEvent.change(confirmInput, { target: { value: 'pass2' } });
    fireEvent.click(submitBtn);

    const mismatchErrors = await screen.findAllByText('Hai mật khẩu chưa trùng khớp.');
    expect(mismatchErrors.length).toBe(1);
  });
});
