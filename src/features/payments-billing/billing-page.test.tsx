import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { CoupleBillingPage, CoupleBillingWorkspace } from './billing-page';
import { createIdentityApi, WebIdentitySession } from '../identity-access/session';
import type { BillingContext, CoupleBillingGateway } from './billing-api';
import { createBillingIntents } from './billing-intents';
import { createHash } from 'node:crypto';

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
    load: vi.fn().mockResolvedValue({
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
    loadAttempt: vi.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      purpose: 'DEPOSIT',
      status: 'UNKNOWN',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2026-10-09T10:00:00Z',
    }),
    startDeposit: vi.fn().mockResolvedValue({
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
  completeCheckout: () => Promise.resolve(),
  pending: () => Promise.resolve(null),
  run: <T,>(_scope: string, _body: object, operation: (key: string, body: object) => Promise<T>) =>
    operation('stable-key', _body),
};
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mở thanh toán' }));
  await screen.findByText('Khoản cọc theo đề xuất');
  await waitFor(() =>
    expect(screen.queryByText('Đang kiểm tra với máy chủ…')).not.toBeInTheDocument(),
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});
const error = (code: string, status = 409) =>
  new ApiClientError({
    kind: 'api',
    code,
    status,
    message: 'private provider message',
    requestId: 'request',
  });
function mount(api: CoupleBillingGateway, journal = intents) {
  return render(
    <CoupleBillingWorkspace
      accountId="actor"
      authorize={authorize}
      gateway={api}
      intents={journal}
    />,
  );
}
async function full(api: CoupleBillingGateway) {
  vi.mocked(api.loadContext).mockResolvedValue({
    ...context,
    accessLevel: 'FULL',
    phase: 'CONFIRMED',
  });
  mount(api);
  await load();
}
describe('Couple billing experience', () => {
  it('clears loaded money and checkout actions when editing the booking identifier', async () => {
    const api = gateway();
    await full(api);
    expect(screen.getByText('Còn phải thanh toán')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: 'another-booking' },
    });
    expect(screen.queryByText('Còn phải thanh toán')).not.toBeInTheDocument();
    expect(screen.queryByText('Khoản cọc theo đề xuất')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thanh toán còn lại' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mã giao dịch thanh toán')).not.toBeInTheDocument();
    expect(api.startDeposit).not.toHaveBeenCalled();
    expect(api.startBalance).not.toHaveBeenCalled();
    expect(api.loadContext).toHaveBeenCalledTimes(1);
    vi.mocked(api.loadContext).mockResolvedValue({ ...context, bookingId: 'another-booking' });
    fireEvent.click(screen.getByRole('button', { name: 'Mở thanh toán' }));
    await screen.findByText('Khoản cọc theo đề xuất');
    expect(api.loadContext).toHaveBeenLastCalledWith('token', 'another-booking');
  });
  it('recovers the same checkout after success and reload before opening VNPay', async () => {
    const api = gateway();
    const timelineRevisionId = '1ca0f1c7-dcb4-4ef7-bfa7-112377342d15';
    const paymentAttemptId = 'aff5dbfe-1344-45c4-b5a9-50a63d4c193d';
    vi.mocked(api.loadContext).mockResolvedValue({ ...context, timelineRevisionId });
    vi.mocked(api.startDeposit).mockResolvedValue({
      paymentAttemptId,
      status: 'PENDING',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2026-10-09T10:00:00Z',
    });
    vi.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId,
      status: 'PENDING',
      purpose: 'DEPOSIT',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2026-10-09T10:00:00Z',
    });
    const records = new Map<string, string>();
    const journal = () =>
      createBillingIntents(
        'actor',
        {
          read: (key) => Promise.resolve(records.get(key) ?? null),
          write: (key, value) => {
            records.set(key, value);
            return Promise.resolve();
          },
          remove: (key) => {
            records.delete(key);
            return Promise.resolve();
          },
        },
        (value) => Promise.resolve(createHash('sha256').update(value).digest('hex')),
      );
    const first = render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={journal()}
      />,
    );
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
    const originalKey = vi.mocked(api.startDeposit).mock.calls[0]![3];
    first.unmount();
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={journal()}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveValue('booking'));
    await load();
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
    expect(api.startDeposit).toHaveBeenLastCalledWith(
      'token',
      'booking',
      { timelineRevisionId },
      originalKey,
    );
    vi.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId,
      status: 'SUCCEEDED',
      purpose: 'DEPOSIT',
      amountVnd: 1234567,
      applicationStatus: 'PENDING',
      expiresAt: '2026-10-09T10:00:00Z',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Đã xác minh nhận tiền');
    expect(records.size).toBe(1);
    expect(screen.queryByRole('link', { name: 'Tiếp tục trên VNPay' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đặt cọc qua VNPay' })).not.toBeInTheDocument();
    vi.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId,
      status: 'SUCCEEDED',
      purpose: 'DEPOSIT',
      amountVnd: 1234567,
      applicationStatus: 'SUCCEEDED',
      expiresAt: '2026-10-09T10:00:00Z',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Đã hoàn tất cập nhật hồ sơ.');
    await waitFor(() => expect(records.size).toBe(0));
  });
  it('restores an attempt from safe route IDs and blocks collection until authoritative status can be read', async () => {
    const api = gateway();
    window.history.replaceState(
      {},
      '',
      '/billing?bookingId=booking&attemptId=attempt&vnp_ResponseCode=00',
    );
    vi.mocked(api.loadContext).mockResolvedValue({
      ...context,
      accessLevel: 'FULL',
      phase: 'CONFIRMED',
    });
    vi.mocked(api.loadAttempt).mockRejectedValueOnce(error('UNAVAILABLE', 503));
    mount(api);
    await waitFor(() => expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveValue('booking'));
    await load();
    expect(api.loadAttempt).toHaveBeenCalledWith('token', 'booking', 'attempt');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(screen.queryByText('Đã xác minh nhận tiền')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
  });
  it.each(['anonymous', 'couple'] as const)(
    'restores the %s session and verifies access before reading billing',
    async (role) => {
      const session = new WebIdentitySession(createIdentityApi());
      vi.spyOn(session, 'restore').mockResolvedValue(
        role === 'anonymous'
          ? { status: 'anonymous', denial: null }
          : {
              status: 'authenticated',
              access: 'full',
              denial: null,
              actor: {
                accountId: 'actor',
                sessionId: 'session',
                displayEmail: 'fixture@example.invalid',
                roles: ['COUPLE'],
              },
            },
      );
      const api = gateway();
      render(<CoupleBillingPage session={session} gateway={api} />);
      await screen.findByRole('heading', {
        name: role === 'anonymous' ? 'Cần đăng nhập' : 'Thanh toán cho ngày trọng đại',
      });
      expect(api.load).not.toHaveBeenCalled();
    },
  );
  it('recovers the original balance command even when reloaded outstanding is zero', async () => {
    const api = gateway();
    vi.mocked(api.loadContext).mockResolvedValue({
      ...context,
      accessLevel: 'FULL',
      phase: 'CONFIRMED',
    });
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({
      ...current,
      billingRevision: 5,
      totals: { ...current.totals, outstandingVnd: 0 },
    });
    const journal = { ...intents, pending: () => Promise.resolve({ expectedBillingRevision: 4 }) };
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={journal}
      />,
    );
    await load();
    expect(screen.getByText(/Khôi phục yêu cầu trước/)).toBeInTheDocument();
    vi.mocked(api.startBalance).mockResolvedValue(
      await api.startDeposit('token', 'booking', { timelineRevisionId: 'timeline' }, 'key'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await waitFor(() =>
      expect(api.startBalance).toHaveBeenCalledWith(
        'token',
        'booking',
        { expectedBillingRevision: 4 },
        'stable-key',
      ),
    );
  });
  it('recovers a deposit with its original timeline after the booking has advanced', async () => {
    const api = gateway();
    vi.mocked(api.loadContext).mockResolvedValue({
      ...context,
      phase: 'CONFIRMED',
      timelineRevisionId: 'new-timeline',
    });
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={{
          ...intents,
          pending: () => Promise.resolve({ timelineRevisionId: 'old-timeline' }),
        }}
      />,
    );
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }));
    await waitFor(() =>
      expect(api.startDeposit).toHaveBeenCalledWith(
        'token',
        'booking',
        { timelineRevisionId: 'old-timeline' },
        'stable-key',
      ),
    );
  });
  it('removes balance details and attempt state when the current booking grant downgrades', async () => {
    const api = gateway();
    await full(api);
    vi.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId: 'private-balance',
      purpose: 'BALANCE',
      status: 'UNKNOWN',
      amountVnd: 7765433,
      applicationStatus: null,
      expiresAt: '2026-10-09T10:00:00Z',
    });
    fireEvent.change(screen.getByLabelText('Mã giao dịch thanh toán'), {
      target: { value: 'private-balance' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    vi.mocked(api.loadContext).mockResolvedValue(context);
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
    await waitFor(() => expect(screen.queryByText('Còn phải thanh toán')).not.toBeInTheDocument());
    expect(screen.queryByText('Chưa rõ kết quả · đang kiểm tra')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mã giao dịch thanh toán')).toHaveValue('');
  });
  it('cancels before submission, then permits review again after a definitive stale response', async () => {
    const api = gateway();
    await full(api);
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(api.startBalance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    vi.mocked(api.startBalance).mockRejectedValue(error('STALE_BILLING_REVISION'));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeEnabled();
    expect(screen.queryByText('private provider message')).not.toBeInTheDocument();
  });
  it('loads additional history at its fixed revision and rejects a mismatched page', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({ ...current, nextCursor: 'page2' });
    await full(api);
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith('token', 'booking', {
        cursor: 'page2',
        throughBillingRevision: 4,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Đang kiểm tra với máy chủ…')).not.toBeInTheDocument(),
    );
    vi.mocked(api.load).mockResolvedValueOnce({ ...current, billingRevision: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    await screen.findByRole('alert');
    expect(screen.queryByText(/phiên bản 4/i)).not.toBeInTheDocument();
    const callsBeforeRetry = vi.mocked(api.load).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(callsBeforeRetry + 1));
    expect(api.load).toHaveBeenLastCalledWith('token', 'booking', {
      cursor: 'page2',
      throughBillingRevision: 4,
    });
  });
  it.each(['FAILED', 'SUCCEEDED'] as const)(
    'uses verified %s status and refreshes server state before further checkout',
    async (status) => {
      const api = gateway();
      mount(api);
      await load();
      fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
      await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
      vi.mocked(api.loadAttempt).mockResolvedValue({
        paymentAttemptId: 'attempt',
        purpose: 'DEPOSIT',
        status,
        amountVnd: 1234567,
        applicationStatus: status === 'SUCCEEDED' ? 'PENDING' : null,
        expiresAt: '2026-10-09T10:00:00Z',
      });
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
      await screen.findByText(
        status === 'SUCCEEDED' ? 'Đã xác minh nhận tiền' : 'Thanh toán không thành công',
      );
      expect(screen.queryByRole('link', { name: 'Tiếp tục trên VNPay' })).not.toBeInTheDocument();
      if (status === 'SUCCEEDED')
        expect(screen.getByText(/hồ sơ đang chờ cập nhật/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
      if (status === 'FAILED')
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' })).toBeEnabled(),
        );
      else
        await waitFor(() =>
          expect(
            screen.queryByRole('button', { name: 'Đặt cọc qua VNPay' }),
          ).not.toBeInTheDocument(),
        );
    },
  );
  it('keeps cached totals on background read failure and rejects a mismatched booking', async () => {
    const api = gateway();
    await full(api);
    vi.mocked(api.loadContext).mockRejectedValueOnce(error('UNAVAILABLE', 503));
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Còn phải thanh toán')).toBeInTheDocument();
    vi.mocked(api.loadContext).mockResolvedValueOnce({ ...context, bookingId: 'different' });
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
    await waitFor(() => expect(api.loadContext).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Còn phải thanh toán')).toBeInTheDocument();
  });
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
    expect(screen.queryByText('Còn phải thanh toán')).not.toBeInTheDocument();
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
    expect(screen.getByText('Còn phải thanh toán')).toBeInTheDocument();
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
    const retryButton = await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' });
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: 'another-booking' },
    });
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveValue('booking');
    fireEvent.click(retryButton);
    await waitFor(() => expect(api.startDeposit).toHaveBeenCalledTimes(2));
    expect(api.startDeposit).toHaveBeenLastCalledWith(
      'token',
      'booking',
      { timelineRevisionId: 'timeline' },
      'stable-key',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    expect(await screen.findByText('Chưa rõ kết quả · đang kiểm tra')).toBeInTheDocument();
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
