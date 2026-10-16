import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { WebIdentitySession } from '../identity-access/session';

import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { CollaborationPage, CollaborationWorkspace } from './collaboration-page';

const proposal: ProposalView = {
  bookingId: '00000000-0000-4000-8000-000000000101',
  consultationId: '00000000-0000-4000-8000-000000000102',
  phase: 'DRAFT',
  revision: 4,
  eventDate: '2026-11-15',
  planningHeadcount: 280,
  proposal: {
    hall: { id: 'hall', name: 'Sảnh Ánh Dương', description: 'Sảnh vườn', maxGuests: 320 },
    shift: { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
    menu: {
      versionId: 'menu-version',
      packageId: 'menu-package',
      versionNumber: 1,
      name: 'Thực đơn Mùa Thu',
      description: 'Theo mùa',
      priceVndPerTable: 5_000_000,
    },
    tableCount: 28,
    baseChargeVnd: 140_000_000,
    depositAmountVnd: 42_000_000,
  },
  timeline: {
    revisionId: '00000000-0000-4000-8000-000000000103',
    revisionNumber: 2,
    predecessorRevisionId: null,
    managerApprovedAt: '2026-10-07T10:00:00.000Z',
    coupleApprovedAt: null,
    items: [
      {
        itemId: '00000000-0000-4000-8000-000000000104',
        order: 1,
        startTime: '17:30',
        title: 'Đón khách',
        description: null,
      },
    ],
  },
  effectiveTimeline: null,
  capabilities: {
    accessLevel: 'RESTRICTED',
    canEditTimeline: true,
    canApproveTimeline: true,
    canWithdrawApproval: true,
    canRequestCancellation: false,
  },
};

function fakeGateway(initialProposal: ProposalView = proposal): CollaborationGateway {
  return {
    load: vi.fn().mockResolvedValue(initialProposal),
    saveTimeline: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    withdraw: vi.fn().mockResolvedValue(undefined),
    requestChange: vi.fn().mockResolvedValue(undefined),
    requestCancellation: vi.fn().mockResolvedValue(undefined),
  };
}
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('couple-token');
/** Danh sách tiệc giả: trang tự mở tiệc đầu tiên, không còn ô nhập mã. */
const only =
  (...ids: string[]) =>
  () =>
    Promise.resolve(ids.map((bookingId, index) => ({ bookingId, label: `Tiệc ${index + 1}` })));
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});
async function open(gateway: CollaborationGateway, value: ProposalView = proposal) {
  vi.mocked(gateway.load).mockResolvedValue(value);
  render(
    <CollaborationWorkspace
      access="full"
      authorize={authorize}
      gateway={gateway}
      listBookings={only(proposal.bookingId, '00000000-0000-4000-8000-000000000999')}
    />,
  );
  await screen.findByText('Sảnh Ánh Dương');
}
function failure(code: string, status?: number) {
  return new ApiClientError({
    kind: 'api',
    code,
    message: code,
    requestId: 'request',
    ...(status === undefined ? {} : { status }),
  });
}

describe('Booking collaboration workspace', () => {
  it('keeps timeline edits available after an invalid time and saves a corrected retry', async () => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.saveTimeline).mockRejectedValueOnce(
      failure('TIMELINE_ITEM_TIME_INVALID', 422),
    );
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 1'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Ghi chú mốc 1'), {
      target: { value: 'Giữ ghi chú này' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('17:00');
    expect(screen.getByRole('alert')).toHaveTextContent('trước 22:00');
    expect(screen.getByLabelText('Giờ bắt đầu mốc 1')).toHaveValue('09:00');
    expect(screen.getByLabelText('Ghi chú mốc 1')).toHaveValue('Giữ ghi chú này');
    expect(screen.getByRole('button', { name: 'Lưu kịch bản mới' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Thêm mốc chương trình' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Xóa mốc 1' })).toBeEnabled();
    expect(gateway.saveTimeline).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 1'), { target: { value: '18:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() => expect(gateway.saveTimeline).toHaveBeenCalledTimes(2));
    expect(gateway.saveTimeline).toHaveBeenLastCalledWith(
      'couple-token',
      expect.objectContaining({
        items: [expect.objectContaining({ startTime: '18:00', description: 'Giữ ghi chú này' })],
      }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('Đã lưu revision kịch bản mới.')).toBeVisible();
  });
  it('opens a valid booking link through the authenticated gateway', async () => {
    const id = '20000000-0000-4000-8000-000000000011';
    window.history.replaceState({}, '', `/workspace?bookingId=${id}`);
    const gateway = fakeGateway();
    render(<CollaborationWorkspace access="full" authorize={authorize} gateway={gateway} />);
    await waitFor(() => expect(gateway.load).toHaveBeenCalledWith('couple-token', id));
    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
  });
  it('ignores a malformed booking link and opens nothing when the couple has no booking', async () => {
    window.history.replaceState({}, '', '/workspace?bookingId=from-invitation');
    const gateway = fakeGateway();
    render(
      <CollaborationWorkspace
        access="restricted"
        authorize={authorize}
        gateway={gateway}
        listBookings={only()}
      />,
    );
    expect(await screen.findByText('Chưa có hồ sơ tiệc cưới')).toBeVisible();
    expect(gateway.load).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Mã hồ sơ đặt tiệc')).not.toBeInTheDocument();
  });
  it('opens the first booking automatically when the URL has no booking', async () => {
    const gateway = fakeGateway();
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );
    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(gateway.load).toHaveBeenCalledWith('couple-token', proposal.bookingId);
    // Chỉ một tiệc thì không cần ô đổi tiệc.
    expect(screen.queryByLabelText('Đổi tiệc cưới')).not.toBeInTheDocument();
  });
  it('saves an empty initial timeline using the current booking revision', async () => {
    const gateway = fakeGateway();
    await open(gateway, { ...proposal, timeline: null });
    expect(screen.getByText('Chưa có mốc chương trình')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Phê duyệt revision này' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() =>
      expect(gateway.saveTimeline).toHaveBeenCalledWith('couple-token', {
        bookingId: proposal.bookingId,
        expectedRevision: 4,
        predecessorRevisionId: null,
        items: [],
      }),
    );
  });

  it('submits withdrawal and cancellation reasons while retaining exact revisions', async () => {
    const gateway = fakeGateway();
    await open(gateway, {
      ...proposal,
      capabilities: { ...proposal.capabilities, canRequestCancellation: true },
    });
    fireEvent.change(screen.getByLabelText('Lý do rút phê duyệt'), {
      target: { value: 'Cần chỉnh giờ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Rút phê duyệt' }));
    await waitFor(() =>
      expect(gateway.withdraw).toHaveBeenCalledWith('couple-token', {
        bookingId: proposal.bookingId,
        revisionId: proposal.timeline?.revisionId,
        expectedRevision: 4,
        reason: 'Cần chỉnh giờ',
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Gửi yêu cầu hủy' })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Lý do'), { target: { value: 'Đổi kế hoạch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu hủy' }));
    await waitFor(() =>
      expect(gateway.requestCancellation).toHaveBeenCalledWith('couple-token', {
        bookingId: proposal.bookingId,
        expectedRevision: 4,
        reason: 'Đổi kế hoạch',
      }),
    );
  });

  it('proposes a replacement after confirmation without changing effective content', async () => {
    const gateway = fakeGateway();
    await open(gateway, {
      ...proposal,
      phase: 'CONFIRMED',
      effectiveTimeline: proposal.timeline,
      timeline: {
        ...proposal.timeline!,
        items: [{ ...proposal.timeline!.items[0]!, description: 'Ghi chú' }],
      },
    });
    fireEvent.change(screen.getByLabelText('Lý do thay đổi'), {
      target: { value: 'Chuyển vị trí' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi' }));
    await waitFor(() =>
      expect(gateway.requestChange).toHaveBeenCalledWith(
        'couple-token',
        expect.objectContaining({
          bookingId: proposal.bookingId,
          expectedRevision: 4,
          reason: 'Chuyển vị trí',
          predecessorRevisionId: proposal.timeline?.revisionId,
        }),
      ),
    );
    expect(gateway.saveTimeline).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Ghi chú mốc 1')).toHaveValue('Ghi chú');
  });

  it.each([
    [failure('TIMELINE_APPROVAL_REQUIRES_ITEM', 422), 'Hãy thêm và lưu ít nhất một mốc'],
    [failure('TIMELINE_ITEM_COUNT_INVALID', 422), 'tối đa 100 mốc'],
    [failure('TIMELINE_ITEM_TEXT_INVALID', 422), '1–120 ký tự'],
    [failure('TIMELINE_REVISION_SUPERSEDED', 409), 'Đề xuất vừa được cập nhật'],
    [failure('STALE_BOOKING_REVISION', 409), 'Đề xuất vừa được cập nhật'],
    [failure('DEPOSIT_INTENT_ACTIVE', 409), 'Đang có giao dịch tiền cọc'],
    [failure('FORBIDDEN', 403), 'Không tìm thấy hồ sơ'],
    [failure('BOOKING_NOT_FOUND', 404), 'Không tìm thấy hồ sơ'],
    [failure('SESSION_EXPIRED', 401), 'Yêu cầu chưa hoàn tất'],
    [failure('UNKNOWN'), 'Yêu cầu chưa hoàn tất'],
    [new Error('offline'), 'Không thể đồng bộ hồ sơ'],
  ])(
    'handles command failure and allows recovery with valid access: %s',
    async (error, message) => {
      const gateway = fakeGateway();
      await open(gateway);
      vi.mocked(gateway.approve).mockRejectedValue(error);
      fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt revision này' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      if (error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0)) {
        expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
      } else {
        expect(screen.getByRole('button', { name: 'Phê duyệt revision này' })).toBeEnabled();
      }
    },
  );

  it('clears the old proposal when loading a denied booking', async () => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.load).mockRejectedValue(failure('BOOKING_NOT_FOUND', 404));
    fireEvent.change(screen.getByLabelText('Đổi tiệc cưới'), {
      target: { value: '00000000-0000-4000-8000-000000000999' },
    });
    expect(await screen.findByText('Chưa thể mở đề xuất')).toBeVisible();
    expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
  });

  it('still respects edit and approval permissions supplied by the server', async () => {
    const gateway = fakeGateway();
    await open(gateway, {
      ...proposal,
      capabilities: {
        ...proposal.capabilities,
        canEditTimeline: false,
        canApproveTimeline: false,
        canWithdrawApproval: false,
      },
    });
    expect(screen.getByRole('button', { name: 'Lưu kịch bản mới' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Phê duyệt revision này' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rút phê duyệt' })).toBeDisabled();
  });

  it('shows loading and anonymous access states', async () => {
    let resolve!: (value: { status: 'anonymous'; denial: null }) => void;
    vi.spyOn(WebIdentitySession.prototype, 'restore').mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<CollaborationPage />);
    expect(screen.getByText('Đang mở không gian cộng tác…')).toBeVisible();
    resolve({ status: 'anonymous', denial: null });
    expect(await screen.findByText('Cần đăng nhập')).toBeVisible();
  });

  it('restores an authenticated collaboration workspace', async () => {
    vi.spyOn(WebIdentitySession.prototype, 'restore').mockResolvedValue({
      status: 'authenticated',
      access: 'full',
      denial: null,
      actor: {
        accountId: 'couple',
        displayEmail: 'couple@example.com',
        roles: ['COUPLE'],
        sessionId: 'session',
      },
    });
    render(<CollaborationPage />);
    expect(await screen.findByText('Không gian cặp đôi')).toBeVisible();
  });
  it('renders a restricted proposal and exact timeline from the server', async () => {
    const gateway = fakeGateway();
    render(
      <CollaborationWorkspace
        access="restricted"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText('Đón khách')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Yêu cầu hủy' })).not.toBeInTheDocument();
  });

  it('submits approval against the displayed revision and refreshes it', async () => {
    const gateway = fakeGateway();
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Phê duyệt revision này' }));

    await waitFor(() =>
      expect(gateway.approve).toHaveBeenCalledWith('couple-token', {
        bookingId: proposal.bookingId,
        revisionId: proposal.timeline?.revisionId,
        expectedRevision: proposal.revision,
      }),
    );
  });

  it('displays Vietnamese phase label and deposit link when timeline is mutually approved', async () => {
    const mutuallyApprovedProposal = {
      ...proposal,
      phase: 'AWAITING_DEPOSIT' as const,
      timeline: {
        ...proposal.timeline!,
        managerApprovedAt: '2026-10-10T10:00:00.000Z',
        coupleApprovedAt: '2026-10-10T11:00:00.000Z',
      },
    };
    const gateway = fakeGateway(mutuallyApprovedProposal);
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );
    expect((await screen.findAllByText('Đã thống nhất kịch bản')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kịch bản đã được cả hai bên phê duyệt/)).toBeVisible();
    const depositLink = screen.getByRole('link', { name: 'Chuyển sang đặt cọc →' });
    expect(depositLink).toHaveAttribute('href', `/billing?bookingId=${proposal.bookingId}`);
  });

  it('displays confirmed booking guidance and balance link instead of deposit invite when phase is CONFIRMED', async () => {
    const confirmedProposal = {
      ...proposal,
      phase: 'CONFIRMED' as const,
      timeline: {
        ...proposal.timeline!,
        managerApprovedAt: '2026-10-10T10:00:00.000Z',
        coupleApprovedAt: '2026-10-10T11:00:00.000Z',
      },
    };
    const gateway = fakeGateway(confirmedProposal);
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );

    expect(await screen.findByText('Tiệc cưới đã xác nhận chính thức')).toBeVisible();
    expect(screen.queryByText('Đã thống nhất kịch bản')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chuyển sang đặt cọc →' })).not.toBeInTheDocument();
    const balanceLink = screen.getByRole('link', { name: 'Xem công nợ & thanh toán số dư →' });
    expect(balanceLink).toHaveAttribute('href', `/billing?bookingId=${proposal.bookingId}`);
  });

  it('displays completed booking guidance and settlement link when phase is COMPLETED', async () => {
    const completedProposal = {
      ...proposal,
      phase: 'COMPLETED' as const,
      timeline: {
        ...proposal.timeline!,
        managerApprovedAt: '2026-10-10T10:00:00.000Z',
        coupleApprovedAt: '2026-10-10T11:00:00.000Z',
      },
    };
    const gateway = fakeGateway(completedProposal);
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(proposal.bookingId)}
      />,
    );

    expect(await screen.findByText('Tiệc cưới đã hoàn tất')).toBeVisible();
    expect(screen.queryByText('Đã thống nhất kịch bản')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chuyển sang đặt cọc →' })).not.toBeInTheDocument();
    const settlementLink = screen.getByRole('link', { name: 'Xem quyết toán công nợ →' });
    expect(settlementLink).toHaveAttribute('href', `/billing?bookingId=${proposal.bookingId}`);
  });

  it('switches booking context from A to B cleanly, syncing URL and notifying onBookingChange', async () => {
    const bookingAId = '00000000-0000-4000-8000-000000000101';
    const bookingBId = '00000000-0000-4000-8000-000000000201';
    const proposalB: ProposalView = {
      ...proposal,
      bookingId: bookingBId,
      proposal: {
        ...proposal.proposal,
        hall: { id: 'hall-b', name: 'Sảnh Kim Cương', description: 'Sảnh lớn', maxGuests: 500 },
      },
    };

    const gateway: CollaborationGateway = {
      ...fakeGateway(),
      load: vi.fn().mockImplementation((_token, id) => {
        if (id === bookingAId) return Promise.resolve(proposal);
        if (id === bookingBId) return Promise.resolve(proposalB);
        throw new Error('Not found');
      }),
    };

    const onBookingChange = vi.fn();
    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        onBookingChange={onBookingChange}
        listBookings={only(bookingAId, bookingBId)}
      />,
    );

    // 1. Booking A mở tự động (tiệc đầu tiên trong danh sách)

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(window.location.search).toContain(`bookingId=${bookingAId}`);
    expect(onBookingChange).toHaveBeenCalledWith(bookingAId);

    // 2. Switch to Booking B
    fireEvent.change(screen.getByLabelText('Đổi tiệc cưới'), { target: { value: bookingBId } });

    expect(await screen.findByText('Sảnh Kim Cương')).toBeVisible();
    expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
    expect(window.location.search).toContain(`bookingId=${bookingBId}`);
    expect(onBookingChange).toHaveBeenCalledWith(bookingBId);
  });

  it('isolates state on failure when switching booking without retaining stale data', async () => {
    const bookingAId = '00000000-0000-4000-8000-000000000101';
    const bookingBId = '00000000-0000-4000-8000-000000000201';

    const gateway: CollaborationGateway = {
      ...fakeGateway(),
      load: vi.fn().mockImplementation((_token, id) => {
        if (id === bookingAId) return Promise.resolve(proposal);
        return Promise.reject(new Error('Hồ sơ không tồn tại'));
      }),
    };

    render(
      <CollaborationWorkspace
        access="full"
        authorize={authorize}
        gateway={gateway}
        listBookings={only(bookingAId, bookingBId)}
      />,
    );

    // 1. Booking A mở tự động
    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();

    // 2. Try loading Booking B (fails)
    fireEvent.change(screen.getByLabelText('Đổi tiệc cưới'), { target: { value: bookingBId } });

    // Must show error and empty state; must NOT retain proposal A
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không thể đồng bộ hồ sơ. Nội dung bạn nhập vẫn được giữ lại.',
    );
    expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
  });
});
