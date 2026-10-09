import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { CoupleBillingWorkspace } from './billing-page';
import type { BillingContext, CoupleBillingGateway } from './billing-api';

const context: BillingContext = {
  bookingId: 'booking',
  accessLevel: 'RESTRICTED',
  phase: 'AWAITING_DEPOSIT',
  depositAmountVnd: 1234567,
  timelineRevisionId: 'timeline',
};
function gateway(): CoupleBillingGateway {
  return {
    loadContext: vi.fn().mockResolvedValue(context),
    load: vi
      .fn()
      .mockResolvedValue({
        bookingId: 'booking',
        billingRevision: 4,
        history: [],
        nextCursor: null,
        totals: {
          acceptedChargesVnd: 9000000,
          paidVnd: 1234567,
          refundedVnd: 0,
          netPaidVnd: 1234567,
          outstandingVnd: 7765433,
          creditVnd: 0,
        },
      }),
    loadAttempt: vi
      .fn()
      .mockResolvedValue({
        paymentAttemptId: 'attempt',
        purpose: 'DEPOSIT',
        status: 'UNKNOWN',
        amountVnd: 1234567,
        applicationStatus: null,
        expiresAt: '2026-10-09T10:00:00Z',
      }),
    startDeposit: vi
      .fn()
      .mockResolvedValue({
        paymentAttemptId: 'attempt',
        status: 'PENDING',
        checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        expiresAt: '2026-10-09T10:00:00Z',
      }),
    startBalance: vi.fn(),
  };
}
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
const intents = {
  run: <T,>(_scope: string, _body: object, operation: (key: string) => Promise<T>) =>
    operation('stable-key'),
};
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mở thanh toán' }));
  await screen.findByText('Khoản cọc theo đề xuất');
}
describe('Couple billing experience', () => {
  it('restricts prospect to deposit, confirms server amount and never loads private billing', async () => {
    const api = gateway();
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    expect(api.load).not.toHaveBeenCalled();
    expect(screen.queryByText('Còn phải thu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    expect(api.startDeposit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await waitFor(() =>
      expect(api.startDeposit).toHaveBeenCalledWith(
        'token',
        'booking',
        { timelineRevisionId: 'timeline' },
        'stable-key',
      ),
    );
    expect(await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.queryByRole('button', { name: 'Đặt cọc qua VNPay' })).not.toBeInTheDocument();
  });
  it('uses the FULL booking grant and exact backend balance rather than account role math', async () => {
    const api = gateway();
    vi.mocked(api.loadContext).mockResolvedValue({
      ...context,
      accessLevel: 'FULL',
      phase: 'CONFIRMED',
    });
    vi.mocked(api.startBalance).mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'PENDING',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2026-10-09T10:00:00Z',
    });
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    expect(screen.getByText('Còn phải thu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await waitFor(() =>
      expect(api.startBalance).toHaveBeenCalledWith(
        'token',
        'booking',
        { expectedBillingRevision: 4 },
        'stable-key',
      ),
    );
  });
  it('keeps exact checkout intent on timeout and never interprets ReturnURL as settlement', async () => {
    const api = gateway();
    vi.mocked(api.startDeposit)
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'timeout',
          code: 'REQUEST_TIMEOUT',
          requestId: 'request',
          message: 'timeout',
        }),
      )
      .mockResolvedValueOnce({
        paymentAttemptId: 'attempt',
        status: 'UNKNOWN',
        checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        expiresAt: '2026-10-09T10:00:00Z',
      });
    window.history.replaceState({}, '', '/billing?vnp_ResponseCode=00');
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await waitFor(() => expect(api.startDeposit).toHaveBeenCalledTimes(2));
    expect(api.startDeposit).toHaveBeenLastCalledWith(
      'token',
      'booking',
      { timelineRevisionId: 'timeline' },
      'stable-key',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(await screen.findByText('Chưa rõ kết quả · đang đối soát')).toBeInTheDocument();
    expect(screen.queryByText('Đã hoàn tất cập nhật hồ sơ.')).not.toBeInTheDocument();
    window.history.replaceState({}, '', '/');
  });
  it('clears private data on denial and blocks deposit without a timeline', async () => {
    const api = gateway();
    vi.mocked(api.loadContext).mockResolvedValueOnce({ ...context, timelineRevisionId: null });
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    expect(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' })).toBeDisabled();
    vi.mocked(api.loadContext).mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        code: 'BOOKING_NOT_FOUND',
        status: 404,
        message: 'hidden',
        requestId: 'request',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
    await waitFor(() =>
      expect(screen.queryByText('Khoản cọc theo đề xuất')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('quyền');
  });
});
