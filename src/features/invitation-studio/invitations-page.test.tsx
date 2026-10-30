import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { CoupleInvitationsPage as Page } from './invitations-page';
import { browserSession as session } from '../identity-access/browser-session';
import { ApiClientError } from '../../lib/api/client';
import type * as CoupleWorkspaceModule from '../couple-workspace/use-couple-workspace';

const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

// Tab synchronization consumes the workspace cache; these isolated tests must not
// start its real HTTP/session loader outside the application provider.
vi.mock('../couple-workspace/use-couple-workspace', async (importOriginal) => ({
  ...(await importOriginal<typeof CoupleWorkspaceModule>()),
  useCoupleWorkspace: () => ({
    state: { status: 'loading' },
    bookingId: null,
    bookings: [],
    reload: () => {},
  }),
}));

vi.mock('../identity-access/browser-session', () => ({
  browserSession: {
    restore: vi.fn(),
    authorize: vi.fn(),
  },
}));

const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    listDesigns: vi.fn(),
    listPrintOrders: vi.fn(),
    listImageJobs: vi.fn(),
    getPublicInvitation: vi.fn(),
  },
}));

vi.mock('./invitation-api', () => ({
  createInvitationGateway: () => mockGateway,
}));

describe('CoupleInvitationsPage URL tab synchronization', () => {
  const bookingId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGateway.listDesigns.mockResolvedValue([
      {
        designId: 'd-1',
        revisionId: 'rev-1',
        revisionNumber: 1,
        title: 'Thiệp Cưới',
        textFields: { brideName: 'Cô Dâu', groomName: 'Chú Rể' },
        sections: [],
        derivedAssetIds: [],
        includesSeating: false,
        updatedAt: '2026-10-10T00:00:00.000Z',
      },
    ]);
    mockGateway.listPrintOrders.mockResolvedValue([]);
    mockGateway.listImageJobs.mockResolvedValue([]);
    mockGateway.getPublicInvitation.mockResolvedValue({});
    (session.restore as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'authenticated',
      access: 'full',
      actor: { accountId: 'acc-1' },
    });
    (session.authorize as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (fn: (token: string) => unknown) => fn('test-token'),
    );
  });

  it('applies initial ?tab=media directly from URL', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'media');

    render(<Page />);

    expect(await screen.findByText('Hình ảnh cho thiệp')).toBeInTheDocument();
    expect(screen.getByText('Chọn ảnh')).toBeInTheDocument();
  });

  it('applies initial ?tab=publish directly from URL', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'publish');

    render(<Page />);

    expect(await screen.findByText('Chia sẻ thiệp')).toBeInTheDocument();
    expect(screen.getByText('Xuất bản thiệp')).toBeInTheDocument();
  });

  it('applies initial ?tab=print directly from URL', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'print');

    render(<Page />);

    expect(await screen.findByText('Yêu cầu in thiệp')).toBeInTheDocument();
    expect(screen.getByText('Gửi yêu cầu in')).toBeInTheDocument();
  });

  it('loads print orders and contracted print sources only after the print tab is opened', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');
    const contractedPrintSources = vi.fn().mockResolvedValue([]);
    Object.assign(mockGateway, { contractedPrintSources });

    render(<Page />);

    expect(await screen.findByRole('heading', { name: 'Nội dung thiệp' })).toBeInTheDocument();
    expect(mockGateway.listPrintOrders).not.toHaveBeenCalled();
    expect(contractedPrintSources).not.toHaveBeenCalled();

    mockGateway.listPrintOrders.mockResolvedValue([
      { orderId: 'order-1', status: 'REQUESTED', lines: [] },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Đặt in' }));

    expect(await screen.findByText('Đặt in (1)')).toBeInTheDocument();
    expect(mockGateway.listPrintOrders).toHaveBeenCalledWith('test-token', bookingId);
    expect(contractedPrintSources).toHaveBeenCalledWith('test-token', bookingId);

    // Quay lại tab thiết kế rồi mở lại tab in: không tải lại.
    fireEvent.click(screen.getByRole('button', { name: 'Nội dung thiệp' }));
    fireEvent.click(screen.getByText('Đặt in (1)'));
    expect(mockGateway.listPrintOrders).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(mockGateway, 'contractedPrintSources');
  });

  it('explains a slow server in Vietnamese and retries only the design request', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');
    const designs: unknown = await mockGateway.listDesigns();
    mockGateway.listDesigns.mockReset();
    mockGateway.listDesigns
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'timeout',
          code: 'REQUEST_TIMEOUT',
          message: 'The API request timed out after 10000 ms.',
          requestId: 'request',
        }),
      )
      .mockResolvedValueOnce(designs);

    render(<Page />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Máy chủ đang phản hồi chậm');
    expect(screen.queryByText(/timed out/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByRole('heading', { name: 'Nội dung thiệp' })).toBeInTheDocument();
    expect(mockGateway.listDesigns).toHaveBeenCalledTimes(2);
  });

  it('falls back to design tab if tab is missing or invalid', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'nonexistent_tab');

    render(<Page />);

    expect(await screen.findByRole('heading', { name: 'Nội dung thiệp' })).toBeInTheDocument();
    expect(screen.getByText('Tên thiệp')).toBeInTheDocument();
  });

  it('updates tab when browser back/forward triggers popstate', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');

    render(<Page />);

    expect(await screen.findByRole('heading', { name: 'Nội dung thiệp' })).toBeInTheDocument();

    // Simulate browser navigation to ?tab=media
    window.history.pushState({}, '', `?bookingId=${bookingId}&tab=media`);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(await screen.findByText('Hình ảnh cho thiệp')).toBeInTheDocument();
  });

  it('preserves draft input when switching tabs on the same booking', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');

    render(<Page />);

    // Type custom text into design input
    const titleInput = await screen.findByLabelText('Tên thiệp');
    fireEvent.change(titleInput, { target: { value: 'Thiệp Cưới Bản Nháp Đặc Biệt' } });
    expect(titleInput).toHaveValue('Thiệp Cưới Bản Nháp Đặc Biệt');

    // Switch to Media tab via Studio Tab navigation
    fireEvent.click(screen.getByRole('button', { name: 'Hình ảnh' }));
    expect(await screen.findByText('Hình ảnh cho thiệp')).toBeInTheDocument();

    // Switch back to Design tab via Studio Tab navigation
    fireEvent.click(screen.getByRole('button', { name: 'Nội dung thiệp' }));
    expect(await screen.findByRole('heading', { name: 'Nội dung thiệp' })).toBeInTheDocument();

    // Value should NOT be wiped or reset
    expect(screen.getByLabelText('Tên thiệp')).toHaveValue('Thiệp Cưới Bản Nháp Đặc Biệt');
  });
});
