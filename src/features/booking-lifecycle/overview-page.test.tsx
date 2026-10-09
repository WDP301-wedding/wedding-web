import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { Overview } from '../identity-access/experience-api';
import type { WebSessionSnapshot } from '../identity-access/session';
import { CoupleOverview } from './overview-page';

const mocks = vi.hoisted(() => ({
  restore: vi.fn(),
  authorize: vi.fn(),
  snapshot: vi.fn(),
  overview: vi.fn(),
}));
vi.mock('../identity-access/identity-page', () => ({ browserSession: mocks }));
vi.mock('../identity-access/experience-api', () => ({
  createExperienceGateway: () => ({ overview: mocks.overview }),
}));
vi.mock('../public-website/public-shell', () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
const anonymous: WebSessionSnapshot = { status: 'anonymous', denial: null };
const authenticated: WebSessionSnapshot = {
  status: 'authenticated',
  access: 'full',
  denial: null,
  actor: {
    accountId: 'couple',
    displayEmail: 'couple@example.com',
    roles: ['COUPLE'],
    sessionId: 'session',
  },
};
function booking(overrides: Partial<Overview['data'][number]> = {}): Overview['data'][number] {
  return {
    accessLevel: 'FULL',
    bookingId: 'booking-1',
    consultationId: 'consultation-1',
    coupleApproved: false,
    managerApproved: false,
    eventDate: '2026-11-15',
    hallName: 'Sảnh Vườn',
    hasTimeline: false,
    phase: 'DRAFT',
    planningHeadcount: 280,
    shiftCode: 'LUNCH',
    ...overrides,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.restore.mockResolvedValue(authenticated);
  mocks.snapshot.mockReturnValue(anonymous);
  mocks.authorize.mockImplementation((operation: (token: string) => Promise<Overview>) =>
    operation('couple-token'),
  );
  mocks.overview.mockResolvedValue({ data: [], nextCursor: null });
});

describe('Couple overview', () => {
  it('asks an anonymous visitor to sign in without fetching private bookings', async () => {
    mocks.restore.mockResolvedValue(anonymous);
    render(<CoupleOverview />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang mở');
    expect(await screen.findByRole('link', { name: 'Đăng nhập →' })).toHaveAttribute(
      'href',
      '/account',
    );
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it('shows loading and the empty state for an authenticated couple', async () => {
    const request = deferred<Overview>();
    mocks.overview.mockReturnValue(request.promise);
    render(<CoupleOverview />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đang tải'));
    await act(async () => {
      request.resolve({ data: [], nextCursor: null });
      await request.promise;
    });
    expect(screen.getByText('Hồ sơ đang được chuẩn bị')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Liên hệ nhà hàng →' })).toHaveAttribute(
      'href',
      '/consultation',
    );
  });

  it('retries after session restoration fails', async () => {
    mocks.restore.mockRejectedValueOnce(new Error('network'));
    render(<CoupleOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được kế hoạch');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Hồ sơ đang được chuẩn bị');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.restore).toHaveBeenCalledTimes(2);
  });

  it('renders phases, review guidance, dates and the matching booking links', async () => {
    mocks.overview.mockResolvedValue({
      data: [
        booking(),
        booking({
          bookingId: 'review',
          phase: 'AWAITING_DEPOSIT',
          shiftCode: 'DINNER',
          hasTimeline: true,
          managerApproved: true,
        }),
        booking({
          bookingId: 'confirmed',
          phase: 'CONFIRMED',
          hasTimeline: true,
          coupleApproved: true,
        }),
        booking({ bookingId: 'cancelled', phase: 'CANCELLED' }),
        booking({ bookingId: 'completed', phase: 'COMPLETED' }),
      ],
      nextCursor: null,
    });
    render(<CoupleOverview />);
    await screen.findByText('Đã thống nhất kịch bản');
    for (const label of ['Đang trao đổi', 'Đã xác nhận tiệc', 'Đã hủy', 'Tiệc đã hoàn tất']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('Sảnh Vườn · Tiệc tối')).toBeInTheDocument();
    expect(screen.getAllByText('Sảnh Vườn · Tiệc trưa')).toHaveLength(4);
    expect(screen.getAllByText('280 khách dự kiến')).toHaveLength(5);
    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent(/15.*11.*2026/);
    expect(
      screen.getByText('Mở kịch bản để xem lại các mốc và gửi phê duyệt.'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Hồ sơ được giữ lại để bạn xem lịch sử.')).toHaveLength(2);
    expect(screen.getAllByText('Đã duyệt phiên bản hiện tại')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Mở đề xuất & kịch bản →' })[1]).toHaveAttribute(
      'href',
      '/workspace?bookingId=review',
    );
  });

  it('appends the next page using its cursor and disables duplicate requests', async () => {
    const request = deferred<Overview>();
    mocks.overview
      .mockResolvedValueOnce({ data: [booking()], nextCursor: 'cursor-2' })
      .mockReturnValueOnce(request.promise);
    render(<CoupleOverview />);
    const more = await screen.findByRole('button', { name: 'Xem thêm hồ sơ' });
    fireEvent.click(more);
    expect(more).toBeDisabled();
    fireEvent.click(more);
    expect(mocks.overview).toHaveBeenCalledTimes(2);
    expect(mocks.overview).toHaveBeenLastCalledWith('couple-token', 'cursor-2');
    await act(async () => {
      request.resolve({
        data: [booking({ bookingId: 'second', hallName: 'Sảnh Biển' })],
        nextCursor: null,
      });
      await request.promise;
    });
    expect(screen.getByText('Sảnh Biển · Tiệc trưa')).toBeInTheDocument();
    expect(screen.getByText('Sảnh Vườn · Tiệc trưa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem thêm hồ sơ' })).not.toBeInTheDocument();
  });

  it.each([401, 403, 404])(
    'removes stale private bookings when pagination is denied with %s',
    async (status) => {
      mocks.overview
        .mockResolvedValueOnce({ data: [booking()], nextCursor: 'next' })
        .mockRejectedValueOnce(
          new ApiClientError({
            kind: 'api',
            code: 'DENIED',
            message: 'Denied',
            requestId: 'request',
            status,
          }),
        );
      render(<CoupleOverview />);
      fireEvent.click(await screen.findByRole('button', { name: 'Xem thêm hồ sơ' }));
      await screen.findByRole('alert');
      expect(screen.queryByText('Sảnh Vườn · Tiệc trưa')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Đăng nhập →' })).toBeInTheDocument();
    },
  );

  it.each([
    new Error('network'),
    new ApiClientError({
      kind: 'network',
      code: 'NETWORK',
      message: 'Network',
      requestId: 'request',
    }),
  ])('retains the loaded page after a recoverable pagination failure', async (failure) => {
    mocks.overview
      .mockResolvedValueOnce({ data: [booking()], nextCursor: 'next' })
      .mockRejectedValueOnce(failure);
    render(<CoupleOverview />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xem thêm hồ sơ' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được các hồ sơ tiếp theo');
    expect(screen.getByText('Sảnh Vườn · Tiệc trưa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem thêm hồ sơ' })).toBeEnabled();
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });

  it('does not fetch bookings when session restoration finishes after unmount', async () => {
    const request = deferred<WebSessionSnapshot>();
    mocks.restore.mockReturnValue(request.promise);
    const view = render(<CoupleOverview />);
    view.unmount();
    await act(async () => {
      request.resolve(authenticated);
      await request.promise;
    });
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a booking request that settles after unmount (%s)',
    async (result) => {
      const request = deferred<Overview>();
      mocks.overview.mockReturnValue(request.promise);
      const view = render(<CoupleOverview />);
      await waitFor(() => expect(mocks.overview).toHaveBeenCalled());
      view.unmount();
      await act(async () => {
        if (result === 'resolve') request.resolve({ data: [booking()], nextCursor: null });
        else request.reject(new Error('network'));
        await request.promise.catch(() => undefined);
      });
      expect(mocks.snapshot).not.toHaveBeenCalled();
    },
  );
});
