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

function fakeGateway(): CollaborationGateway {
  return {
    load: vi.fn().mockResolvedValue(proposal),
    saveTimeline: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    withdraw: vi.fn().mockResolvedValue(undefined),
    requestChange: vi.fn().mockResolvedValue(undefined),
    requestCancellation: vi.fn().mockResolvedValue(undefined),
  };
}
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('couple-token');
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});
async function open(gateway: CollaborationGateway, value: ProposalView = proposal) {
  vi.mocked(gateway.load).mockResolvedValue(value);
  render(<CollaborationWorkspace access="full" authorize={authorize} gateway={gateway} />);
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
    target: { value: proposal.bookingId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));
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
  it('reads the invitation booking ID from the URL without loading unauthorized data', async () => {
    window.history.replaceState({}, '', '/workspace?bookingId=from-invitation');
    const gateway = fakeGateway();
    render(<CollaborationWorkspace access="restricted" authorize={authorize} gateway={gateway} />);
    await waitFor(() =>
      expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveValue('from-invitation'),
    );
    expect(gateway.load).not.toHaveBeenCalled();
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
    [failure('STALE_BOOKING_REVISION', 409), 'Đề xuất vừa được cập nhật'],
    [failure('DEPOSIT_INTENT_ACTIVE', 409), 'Đang có giao dịch tiền cọc'],
    [failure('FORBIDDEN', 403), 'Không tìm thấy hồ sơ'],
    [failure('BOOKING_NOT_FOUND', 404), 'Không tìm thấy hồ sơ'],
    [failure('SESSION_EXPIRED', 401), 'Yêu cầu chưa hoàn tất'],
    [failure('UNKNOWN'), 'Yêu cầu chưa hoàn tất'],
    [new Error('offline'), 'Không thể đồng bộ hồ sơ'],
  ])('handles command failure and prevents repeated stale edits: %s', async (error, message) => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.approve).mockRejectedValue(error);
    fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt revision này' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    if (error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0)) {
      expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: 'Phê duyệt revision này' })).toBeDisabled();
    }
  });

  it('clears the old proposal when loading a denied booking', async () => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.load).mockRejectedValue(failure('BOOKING_NOT_FOUND', 404));
    fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));
    expect(await screen.findByText('Chưa thể mở đề xuất')).toBeVisible();
    expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
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
    render(<CollaborationWorkspace access="restricted" authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText('Đón khách')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Yêu cầu hủy' })).not.toBeInTheDocument();
  });

  it('submits approval against the displayed revision and refreshes it', async () => {
    const gateway = fakeGateway();
    render(<CollaborationWorkspace access="full" authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Phê duyệt revision này' }));

    await waitFor(() =>
      expect(gateway.approve).toHaveBeenCalledWith('couple-token', {
        bookingId: proposal.bookingId,
        revisionId: proposal.timeline?.revisionId,
        expectedRevision: proposal.revision,
      }),
    );
  });
});
