import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutView } from './billing-api';
import { CheckoutLinkPanel } from './checkout-link';

const checkout: CheckoutView = {
  paymentAttemptId: 'attempt',
  status: 'PENDING',
  checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=attempt',
  expiresAt: '2026-10-19T10:57:00Z',
};
const link = () => screen.queryByRole('link', { name: 'Tiếp tục trên VNPay' });

describe('CheckoutLinkPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T10:45:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it.each(['CREATED', 'PENDING', 'UNKNOWN'] as const)(
    'reopens the same VNPay link while %s and not expired',
    (status) => {
      render(<CheckoutLinkPanel checkout={checkout} status={status} />);
      expect(link()).toHaveAttribute('href', checkout.checkoutUrl);
      expect(screen.getByText(/Mở lại không tạo giao dịch mới/)).toBeInTheDocument();
    },
  );

  it.each(['SUCCEEDED', 'FAILED'] as const)('never reopens a %s attempt', (status) => {
    render(<CheckoutLinkPanel checkout={checkout} status={status} />);
    expect(link()).not.toBeInTheDocument();
    expect(screen.getByText(/Kiểm tra trạng thái đã xác minh/)).toBeInTheDocument();
  });

  it('hides the link exactly when the link expires, without creating a new attempt', async () => {
    render(<CheckoutLinkPanel checkout={checkout} status="UNKNOWN" />);
    expect(link()).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12 * 60_000);
    });
    expect(link()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đường dẫn đã hết hạn');
  });

  it('treats an already-expired or unreadable expiry as expired', () => {
    const { rerender } = render(
      <CheckoutLinkPanel
        checkout={{ ...checkout, expiresAt: '2026-10-19T10:00:00Z' }}
        status="PENDING"
      />,
    );
    expect(link()).not.toBeInTheDocument();
    rerender(<CheckoutLinkPanel checkout={{ ...checkout, expiresAt: 'bad' }} status="PENDING" />);
    expect(link()).not.toBeInTheDocument();
  });

  it('calls onResetExpired when clicking retry button after expiry', async () => {
    const onResetExpired = vi.fn();
    render(
      <CheckoutLinkPanel
        checkout={checkout}
        status="PENDING"
        onResetExpired={onResetExpired}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12 * 60_000);
    });
    const retryBtn = screen.getByRole('button', { name: /Thanh toán lại/ });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onResetExpired).toHaveBeenCalledTimes(1);
  });
});
