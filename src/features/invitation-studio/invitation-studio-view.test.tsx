import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { InvitationStudioView } from './invitation-studio-view';
import type { InvitationGateway, DesignView, PrintOrderView } from './invitation-api';

describe('InvitationStudioView (IS-W7 Couple Web Component)', () => {
  const bookingId = '11111111-1111-1111-1111-111111111111';
  const accessToken = 'mock-token';

  const initialDesign: DesignView = {
    designId: 'd-1',
    revisionId: 'rev-1',
    revisionNumber: 1,
    title: 'Thiệp Mừng Hạnh Phúc',
    textFields: { brideName: 'Lan', groomName: 'Tùng' },
    sections: [],
    derivedAssetIds: [],
    includesSeating: false,
    updatedAt: '2026-10-09T00:00:00.000Z',
  };

  const initialOrder: PrintOrderView = {
    orderId: 'o-1',
    bookingId,
    status: 'QUOTED',
    revision: 1,
    currentCommercialRevisionId: 'cr-1',
    receivableChargeId: null,
    pendingReplacementProposal: null,
    currentCommercialRevision: {
      commercialRevisionId: 'cr-1',
      revisionNumber: 1,
      orderTotalVnd: 4500000,
      lines: [],
      estimatedHandoverAt: '2026-10-25T00:00:00.000Z',
      expiresAt: '2026-10-16T00:00:00.000Z',
      createdAt: '2026-10-09T00:00:00.000Z',
    },
    lines: [],
    readyAt: null,
    handedOverAt: null,
    evidenceReference: null,
    createdAt: '2026-10-09T00:00:00.000Z',
    updatedAt: '2026-10-09T00:00:00.000Z',
  };

  const mockGateway: InvitationGateway = {
    listDesigns: vi.fn().mockResolvedValue([initialDesign]),
    getDesign: vi.fn().mockResolvedValue(initialDesign),
    createDesign: vi.fn().mockResolvedValue(initialDesign),
    reviseDesign: vi
      .fn()
      .mockResolvedValue({ ...initialDesign, revisionNumber: 2, title: 'Tiêu đề mới' }),
    publishDesign: vi
      .fn()
      .mockResolvedValue({ publicSlug: 'cuoi-lan-tung', publicationRevision: 1 }),
    unpublishDesign: vi.fn().mockResolvedValue(undefined),
    generateImage: vi.fn().mockResolvedValue({ mediaAssetId: 'ai-1', previewPath: '/preview' }),
    listTemplates: vi.fn().mockResolvedValue([]),
    listPrintOrders: vi.fn().mockResolvedValue([initialOrder]),
    getPrintOrder: vi.fn().mockResolvedValue(initialOrder),
    requestPrintOrder: vi
      .fn()
      .mockResolvedValue({ ...initialOrder, orderId: 'o-2', status: 'REQUESTED' }),
    approvePrintOrder: vi.fn().mockResolvedValue({ ...initialOrder, status: 'APPROVED' }),
    cancelPrintOrder: vi.fn().mockResolvedValue(undefined),
    getPublicInvitation: vi.fn().mockResolvedValue({
      publicInvitationId: 'pub-1',
      publishedRevisionId: 'pr-1',
      title: 'Thiệp Cưới',
      textFields: { greeting: 'Mời bạn' },
      event: {
        eventDate: '2026-12-25',
        hallNameSnapshot: 'Sảnh Hoa',
        shiftCode: 'DINNER',
        startTime: '18:00',
        endTime: '21:00',
      },
      timeline: [],
      sections: [],
      assets: [],
      genericQrPayload: 'https://example.test/invitation/slug',
    }),
  };

  it('renders header and navigates across tabs', () => {
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
        initialOrders={[initialOrder]}
      />,
    );

    expect(screen.getByText('Studio Thiệp Cưới & In Ấn')).toBeInTheDocument();
    expect(screen.getByText('Cấu Trúc Nội Dung Thiệp Cưới')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Đặt In Thiệp Giấy (1)'));
    expect(screen.getByText('Đặt In Thiệp Giấy Truyền Thống')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng #o-1')).toBeInTheDocument();
  });

  it('saves design revision on form submit', async () => {
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    const input = screen.getByLabelText('Tiêu Đề Thiệp Cưới');
    fireEvent.change(input, { target: { value: 'Tiêu đề mới' } });
    fireEvent.click(screen.getByText('Lưu Bản Thiết Kế'));

    await waitFor(() => {
      expect(mockGateway.reviseDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        expect.objectContaining({
          expectedRevision: 1,
        }),
      );
      const call = vi.mocked(mockGateway.reviseDesign).mock.calls[0];
      expect(call?.[3]?.content?.title).toBe('Tiêu đề mới');
    });

    expect(await screen.findByText('Đã lưu bản thiết kế thiệp thành công!')).toBeInTheDocument();
  });

  it('saves the derived AI asset in the design rather than the private original', async () => {
    const generateImage = vi.fn().mockResolvedValue({
      mediaAssetId: 'private-original',
      previewPath: '/private',
      derivedAssetId: 'derived-png',
      previewUrl: 'https://example.test/preview.png',
    });
    const reviseDesign = vi
      .fn<InvitationGateway['reviseDesign']>()
      .mockResolvedValue(initialDesign);
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={{ ...mockGateway, generateImage, reviseDesign }}
        initialDesigns={[initialDesign]}
      />,
    );
    fireEvent.change(screen.getByLabelText('Mô tả ảnh AI'), { target: { value: 'Hoa trắng' } });
    fireEvent.click(screen.getByText('Tạo Ảnh AI'));
    await screen.findByText('Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.');
    fireEvent.click(screen.getByText('Lưu Bản Thiết Kế'));
    await waitFor(() => {
      const content = reviseDesign.mock.calls[0]?.[3]?.content;
      expect(content?.derivedAssetIds).toEqual(['derived-png']);
      expect(content?.sections).toEqual([
        { kind: 'HERO', textKey: null, derivedAssetId: 'derived-png' },
      ]);
    });
  });

  it('approves print order quotation', async () => {
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
        initialOrders={[initialOrder]}
      />,
    );

    fireEvent.click(screen.getByText('Đặt In Thiệp Giấy (1)'));
    const approveBtn = screen.getByText('Duyệt Báo Giá');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(mockGateway.approvePrintOrder).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'o-1',
        'cr-1',
        1,
      );
    });

    expect(
      await screen.findByText('Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.'),
    ).toBeInTheDocument();
  });
});
