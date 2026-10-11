import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Page from '../../../app/(couple)/invitations/page';
import { browserSession as session } from '../identity-access/browser-session';

const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
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

    expect(await screen.findByText('Bộ Sưu Tập Hình Ảnh Cưới')).toBeInTheDocument();
    expect(screen.getByText('Chọn Tệp Hình Ảnh')).toBeInTheDocument();
  });

  it('applies initial ?tab=publish directly from URL', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'publish');

    render(<Page />);

    expect(await screen.findByText('Xuất Bản Trực Tuyến & Mã QR Chung')).toBeInTheDocument();
    expect(screen.getByText('Xuất Bản Thiệp Ngay')).toBeInTheDocument();
  });

  it('applies initial ?tab=print directly from URL', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'print');

    render(<Page />);

    expect(await screen.findByText('Đặt In Thiệp Giấy Truyền Thống')).toBeInTheDocument();
    expect(screen.getByText('Gửi Yêu Cầu Báo Giá In')).toBeInTheDocument();
  });

  it('falls back to design tab if tab is missing or invalid', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'nonexistent_tab');

    render(<Page />);

    expect(await screen.findByText('Cấu Trúc Nội Dung Thiệp Cưới')).toBeInTheDocument();
    expect(screen.getByText('Tiêu Đề Thiệp Cưới')).toBeInTheDocument();
  });

  it('updates tab when browser back/forward triggers popstate', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');

    render(<Page />);

    expect(await screen.findByText('Cấu Trúc Nội Dung Thiệp Cưới')).toBeInTheDocument();

    // Simulate browser navigation to ?tab=media
    window.history.pushState({}, '', `?bookingId=${bookingId}&tab=media`);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(await screen.findByText('Bộ Sưu Tập Hình Ảnh Cưới')).toBeInTheDocument();
  });

  it('preserves draft input when switching tabs on the same booking', async () => {
    mockSearchParams.set('bookingId', bookingId);
    mockSearchParams.set('tab', 'design');

    render(<Page />);

    // Type custom text into design input
    const titleInput = await screen.findByLabelText('Tiêu Đề Thiệp Cưới');
    fireEvent.change(titleInput, { target: { value: 'Thiệp Cưới Bản Nháp Đặc Biệt' } });
    expect(titleInput).toHaveValue('Thiệp Cưới Bản Nháp Đặc Biệt');

    // Switch to Media tab via Studio Tab navigation
    fireEvent.click(screen.getByText('Bộ Sưu Tập Ảnh'));
    expect(await screen.findByText('Bộ Sưu Tập Hình Ảnh Cưới')).toBeInTheDocument();

    // Switch back to Design tab via Studio Tab navigation
    fireEvent.click(screen.getByText('Thiết Kế & AI'));
    expect(await screen.findByText('Cấu Trúc Nội Dung Thiệp Cưới')).toBeInTheDocument();

    // Value should NOT be wiped or reset
    expect(screen.getByLabelText('Tiêu Đề Thiệp Cưới')).toHaveValue('Thiệp Cưới Bản Nháp Đặc Biệt');
  });
});
