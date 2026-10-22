import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { CoupleBillingPage, CoupleBillingWorkspace } from './billing-page';
import { createIdentityApi, WebIdentitySession } from '../identity-access/session';
import type { AttemptView, BillingContext, CoupleBillingGateway } from './billing-api';
import { createBillingIntents } from './billing-intents';
import { createHash } from 'node:crypto';

const context: BillingContext = {
  bookingId: 'booking',
  accessLevel: 'RESTRICTED',
  phase: 'AWAITING_DEPOSIT',
  depositAmountVnd: 1234567,
  timelineRevisionId: 'timeline',
  contract: null,
  contractRequired: false,
};
function gateway(): CoupleBillingGateway {
  return {
    loadContext: vi.fn().mockResolvedValue(context),
    loadActiveAttempts: vi.fn().mockResolvedValue([]),
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
      // Backend (PR #76) cho phép thanh toán số dư ở đúng revision của trang.
      balancePaymentEligibility: {
        canPay: true,
        reasonCode: null,
        nextAction: 'PAY_BALANCE',
        billingRevision: 4,
      },
    }),
    loadAttempt: vi.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      purpose: 'DEPOSIT',
      status: 'UNKNOWN',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2099-10-09T10:00:00Z',
    }),
    startDeposit: vi.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'PENDING',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2099-10-09T10:00:00Z',
    }),
    startBalance: vi.fn(),
  };
}
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
const intents = {
  completeCheckout: () => Promise.resolve(),
  rememberAttempt: () => Promise.resolve(),
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
function mount(
  api: CoupleBillingGateway,
  journal: ReturnType<typeof createBillingIntents> | typeof intents = intents,
) {
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
  it.each(['DEPOSIT', 'BALANCE'] as const)(
    'blocks a fresh %s checkout if server attempt discovery fails after the booking was already loaded',
    async (purpose) => {
      const api = gateway();
      if (purpose === 'BALANCE') await full(api);
      else {
        mount(api);
        await load();
      }
      const buttonName = purpose === 'DEPOSIT' ? 'Đặt cọc qua VNPay' : 'Thanh toán còn lại';
      expect(screen.getByRole('button', { name: buttonName })).toBeEnabled();
      vi.mocked(api.loadActiveAttempts).mockRejectedValueOnce(error('UNAVAILABLE', 503));
      fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
      await screen.findByRole('alert');
      await waitFor(() =>
        expect(screen.queryByText('Đang kiểm tra với máy chủ…')).not.toBeInTheDocument(),
      );
      expect(screen.getByRole('button', { name: buttonName })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(screen.queryByRole('button', { name: 'Xác nhận mở VNPay' })).not.toBeInTheDocument();
      expect(api.startDeposit).not.toHaveBeenCalled();
      expect(api.startBalance).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Làm mới hồ sơ' }));
      await waitFor(() => expect(screen.getByRole('button', { name: buttonName })).toBeEnabled());
    },
  );

  it.each(['DEPOSIT', 'BALANCE'] as const)(
    'restores the server %s checkout in a fresh session and keeps new payments blocked after reload',
    async (purpose) => {
      const api = gateway();
      const existing: AttemptView = {
        paymentAttemptId: 'existing-attempt',
        purpose,
        status: 'PENDING',
        amountVnd: purpose === 'DEPOSIT' ? 1234567 : 7765433,
        applicationStatus: null,
        expiresAt: '2099-10-09T10:00:00Z',
        checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=existing',
      };
      vi.mocked(api.loadActiveAttempts).mockResolvedValue([existing]);
      vi.mocked(api.loadAttempt).mockResolvedValue({ ...existing, status: 'UNKNOWN' });
      if (purpose === 'BALANCE')
        vi.mocked(api.loadContext).mockResolvedValue({
          ...context,
          accessLevel: 'FULL',
          phase: 'CONFIRMED',
        });

      for (let visit = 0; visit < 2; visit++) {
        // A new browser session has neither a checkout journal nor a route attemptId.
        window.history.replaceState({}, '', '/khong-gian/thanh-toan?bookingId=booking');
        const page = mount(api);
        await load();
        expect(await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' })).toHaveAttribute(
          'href',
          existing.checkoutUrl,
        );
        expect(screen.getByLabelText('Mã giao dịch thanh toán')).toHaveValue('existing-attempt');
        expect(screen.getByText('Chưa rõ kết quả · đang kiểm tra')).toBeInTheDocument();
        if (purpose === 'DEPOSIT') {
          expect(
            screen.queryByRole('button', { name: 'Đặt cọc qua VNPay' }),
          ).not.toBeInTheDocument();
          expect(api.load).not.toHaveBeenCalled();
        } else expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
        expect(api.startDeposit).not.toHaveBeenCalled();
        expect(api.startBalance).not.toHaveBeenCalled();
        page.unmount();
      }
      expect(api.loadAttempt).toHaveBeenCalledWith('token', 'booking', 'existing-attempt');
    },
  );

  it.each(['DEPOSIT', 'BALANCE'] as const)(
    'recovers the existing %s checkout when another tab creates it before this tab submits',
    async (purpose) => {
      const api = gateway();
      const existing: AttemptView = {
        paymentAttemptId: 'other-tab-attempt',
        purpose,
        status: 'PENDING',
        amountVnd: purpose === 'DEPOSIT' ? 1234567 : 7765433,
        applicationStatus: null,
        expiresAt: '2099-10-09T10:00:00Z',
        checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=other-tab',
      };
      vi.mocked(api.loadAttempt).mockResolvedValue(existing);
      if (purpose === 'BALANCE') await full(api);
      else {
        mount(api);
        await load();
      }
      vi.mocked(api.loadActiveAttempts).mockResolvedValue([existing]);
      const start = purpose === 'DEPOSIT' ? api.startDeposit : api.startBalance;
      vi.mocked(start).mockRejectedValue(error('PAYMENT_ATTEMPT_ACTIVE'));
      fireEvent.click(
        screen.getByRole('button', {
          name: purpose === 'DEPOSIT' ? 'Đặt cọc qua VNPay' : 'Thanh toán còn lại',
        }),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
      expect(await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' })).toHaveAttribute(
        'href',
        existing.checkoutUrl,
      );
      expect(start).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('button', { name: 'Thử lại cùng yêu cầu' }),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText('Mã giao dịch thanh toán')).toHaveValue('other-tab-attempt');
    },
  );

  it('allows a fresh deposit intent after the recovered transaction is verified FAILED', async () => {
    const api = gateway();
    const existing: AttemptView = {
      paymentAttemptId: 'failed-attempt',
      purpose: 'DEPOSIT',
      status: 'PENDING',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2099-10-09T10:00:00Z',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=failed',
    };
    vi.mocked(api.loadActiveAttempts).mockResolvedValue([existing]);
    vi.mocked(api.loadAttempt).mockResolvedValue({ ...existing, status: 'FAILED' });
    const completeCheckout = vi.fn().mockResolvedValue(undefined);
    mount(api, { ...intents, completeCheckout });
    await load();
    expect(await screen.findByText('Thanh toán không thành công')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tiếp tục trên VNPay' })).not.toBeInTheDocument();
    expect(completeCheckout).toHaveBeenCalledWith('checkout:booking', 'failed-attempt');
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
    expect(api.startDeposit).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Mã giao dịch thanh toán')).toHaveValue('attempt');
  });

  it('releases the old idempotency key after a lost checkout response is recovered as FAILED', async () => {
    const api = gateway();
    const timelineRevisionId = '1ca0f1c7-dcb4-4ef7-bfa7-112377342d15';
    const failedAttemptId = 'aff5dbfe-1344-45c4-b5a9-50a63d4c193d';
    vi.mocked(api.loadContext).mockResolvedValue({ ...context, timelineRevisionId });
    vi.mocked(api.startDeposit).mockResolvedValue({
      paymentAttemptId: '11ab3df2-291b-4aef-91a5-b50cd2d95482',
      status: 'PENDING',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      expiresAt: '2099-10-09T10:00:00Z',
    });
    const records = new Map<string, string>();
    const journal = createBillingIntents(
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
    let oldKey = '';
    await expect(
      journal.run(
        'checkout:booking',
        { timelineRevisionId },
        (key) => {
          oldKey = key;
          return Promise.reject(error('UNAVAILABLE', 503));
        },
        true,
      ),
    ).rejects.toThrow();
    expect(await journal.pending('checkout:booking')).toMatchObject({
      timelineRevisionId,
    });
    expect((await journal.pending('checkout:booking'))?.checkoutAttemptId).toBeUndefined();
    const existing: AttemptView = {
      paymentAttemptId: failedAttemptId,
      purpose: 'DEPOSIT',
      status: 'PENDING',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2099-10-09T10:00:00Z',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=response-lost',
    };
    vi.mocked(api.loadActiveAttempts).mockResolvedValue([existing]);
    vi.mocked(api.loadAttempt).mockResolvedValue({ ...existing, status: 'FAILED' });
    mount(api, journal);
    await load();
    expect(await screen.findByText('Thanh toán không thành công')).toBeInTheDocument();
    expect(await journal.pending('checkout:booking')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
    expect(vi.mocked(api.startDeposit).mock.calls[0]![3]).not.toBe(oldKey);
  });

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
      expiresAt: '2099-10-09T10:00:00Z',
    });
    vi.mocked(api.loadAttempt).mockResolvedValue({
      paymentAttemptId,
      status: 'PENDING',
      purpose: 'DEPOSIT',
      amountVnd: 1234567,
      applicationStatus: null,
      expiresAt: '2099-10-09T10:00:00Z',
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
      expiresAt: '2099-10-09T10:00:00Z',
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
      expiresAt: '2099-10-09T10:00:00Z',
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
      '/khong-gian/thanh-toan?bookingId=booking&attemptId=attempt&vnp_ResponseCode=00',
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
      if (role === 'anonymous')
        expect(screen.getByRole('link', { name: 'Về trang đăng nhập' })).toHaveAttribute(
          'href',
          '/dang-nhap',
        );
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
      expiresAt: '2099-10-09T10:00:00Z',
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
  it('keeps the same VNPay link available after a status check returns UNKNOWN (rescan QR)', async () => {
    const api = gateway();
    mount(api);
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt cọc qua VNPay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    await screen.findByRole('link', { name: 'Tiếp tục trên VNPay' });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
    await screen.findByText('Chưa rõ kết quả · đang kiểm tra');
    expect(screen.getByRole('link', { name: 'Tiếp tục trên VNPay' })).toHaveAttribute(
      'href',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    expect(api.startDeposit).toHaveBeenCalledTimes(1);
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
        expiresAt: '2099-10-09T10:00:00Z',
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
      expiresAt: '2099-10-09T10:00:00Z',
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
        expiresAt: '2099-10-09T10:00:00Z',
      });
    window.history.replaceState({}, '', '/khong-gian/thanh-toan?vnp_ResponseCode=00');
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
  it('switches booking context, updates URL and notifies onBookingChange', async () => {
    const api = gateway();
    vi.mocked(api.loadContext).mockResolvedValue({ ...context, bookingId: 'booking-b' });
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({ ...current, bookingId: 'booking-b' });
    const onBookingChange = vi.fn();
    render(
      <CoupleBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
        onBookingChange={onBookingChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: 'booking-b' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mở thanh toán' }));
    await waitFor(() => expect(api.loadContext).toHaveBeenCalledWith('token', 'booking-b'));
    expect(window.location.search).toContain('bookingId=booking-b');
    expect(onBookingChange).toHaveBeenCalledWith('booking-b');
  });
});

describe('Couple billing inside Không gian cưới (embedded)', () => {
  it('opens the booking from the URL without any booking-code input', async () => {
    window.history.replaceState({}, '', '/khong-gian/thanh-toan?bookingId=booking');
    const api = gateway();
    render(
      <CoupleBillingWorkspace
        accountId="account"
        authorize={authorize}
        gateway={api}
        intents={intents as unknown as ReturnType<typeof createBillingIntents>}
        embedded
      />,
    );
    expect(await screen.findByText('Khoản cọc theo đề xuất')).toBeInTheDocument();
    expect(api.loadContext).toHaveBeenCalledWith('token', 'booking');
    expect(screen.queryByLabelText('Mã hồ sơ đặt tiệc')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('Balance payment eligibility (BE PR #76)', () => {
  const blocked = (
    reasonCode: string,
    nextAction: string,
    billingRevision = 4,
  ): Partial<Awaited<ReturnType<CoupleBillingGateway['load']>>> =>
    ({
      balancePaymentEligibility: { canPay: false, reasonCode, nextAction, billingRevision },
    }) as never;

  it('locks the button and explains when the final invoice is not finalized', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({
      ...current,
      ...blocked('INVOICE_FINALIZATION_REQUIRED', 'WAIT_FOR_FINAL_INVOICE'),
    });
    await full(api);
    const button = screen.getByRole('button', { name: 'Thanh toán còn lại' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/Nhà hàng chưa chốt hoá đơn cuối/)).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole('button', { name: 'Xác nhận mở VNPay' })).not.toBeInTheDocument();
    expect(api.startBalance).not.toHaveBeenCalled();
  });

  it('does not offer a new checkout while a payment attempt is active', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({
      ...current,
      ...blocked('PAYMENT_ATTEMPT_ACTIVE', 'CHECK_EXISTING_PAYMENT'),
    });
    await full(api);
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(screen.getByText(/giao dịch thanh toán chưa hoàn tất/)).toBeInTheDocument();
  });

  it('keeps payment off when the eligibility field is missing and refreshes only once', async () => {
    const api = gateway();
    const current = await api.load('token', 'booking');
    vi.mocked(api.load).mockResolvedValue({ ...current, balancePaymentEligibility: null });
    const before = vi.mocked(api.load).mock.calls.length;
    await full(api);
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(before + 2));
    await waitFor(() =>
      expect(screen.queryByText('Đang kiểm tra với máy chủ…')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled();
    expect(screen.getByText(/Chưa kiểm tra được điều kiện thanh toán/)).toBeInTheDocument();
    // Không tải lại vô hạn: chỉ 1 lần tự động cho mỗi revision.
    expect(api.load).toHaveBeenCalledTimes(before + 2);
  });

  it('refreshes billing once after a definitive 409 and never retries the POST by itself', async () => {
    const api = gateway();
    await full(api);
    const current = await api.load('token', 'booking');
    const loadsBefore = vi.mocked(api.load).mock.calls.length;
    vi.mocked(api.startBalance).mockRejectedValue(error('INVOICE_FINALIZATION_REQUIRED'));
    vi.mocked(api.load).mockResolvedValue({
      ...current,
      ...blocked('INVOICE_FINALIZATION_REQUIRED', 'WAIT_FOR_FINAL_INVOICE'),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán còn lại' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mở VNPay' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa chốt hoá đơn cuối');
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(loadsBefore + 1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Thanh toán còn lại' })).toBeDisabled(),
    );
    expect(api.startBalance).toHaveBeenCalledTimes(1);
  });
});
