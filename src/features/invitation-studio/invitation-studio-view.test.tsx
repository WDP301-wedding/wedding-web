import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { InvitationStudioView } from './invitation-studio-view';
import type { InvitationGateway, DesignView, ImageJobView, PrintOrderView } from './invitation-api';
import { ApiClientError } from '../../lib/api/client';

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
    unpublishDesign: vi.fn().mockResolvedValue({
      publicationRevision: 2,
      publicInvitationId: 'pub-1',
      published: false,
    }),
    enqueueImageJob: vi.fn(),
    getImageJob: vi.fn(),
    listImageJobs: vi.fn().mockResolvedValue([]),
    recoverImageJob: vi.fn(),
    listTemplates: vi.fn().mockResolvedValue([]),
    listPrintOrders: vi.fn().mockResolvedValue([initialOrder]),
    getPrintOrder: vi.fn().mockResolvedValue(initialOrder),
    requestPrintOrder: vi
      .fn()
      .mockResolvedValue({ ...initialOrder, orderId: 'o-2', status: 'REQUESTED' }),
    approvePrintOrder: vi.fn().mockResolvedValue({ ...initialOrder, status: 'APPROVED' }),
    cancelPrintOrder: vi.fn().mockResolvedValue(undefined),
    uploadMedia: vi.fn().mockResolvedValue({
      mediaAssetId: 'm-1',
      revision: 1,
      detachedAt: null,
      previewPath: '/api/v1/bookings/00000000-0000-4000-8000-000000000001/media/m-1',
    }),
    detachMedia: vi.fn().mockResolvedValue({
      mediaAssetId: 'm-1',
      revision: 2,
      detachedAt: new Date().toISOString(),
      previewPath: '/api/v1/bookings/00000000-0000-4000-8000-000000000001/media/m-1',
    }),
    getMediaPreview: vi.fn().mockResolvedValue({
      asset: {
        mediaAssetId: 'm-1',
        revision: 1,
        detachedAt: null,
        previewPath: '/api/v1/bookings/00000000-0000-4000-8000-000000000001/media/m-1',
      },
      altText: 'Ảnh cưới mẫu',
      signedUrl: 'https://example.test/media/m-1.jpg',
      expiresInSeconds: 900,
    }),
    deriveAsset: vi.fn().mockResolvedValue({
      derivedAssetId: 'da-1',
      width: 1200,
      height: 800,
      publicSlug: 'da-slug-1',
    }),
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
        expect.any(String),
      );
      const call = vi.mocked(mockGateway.reviseDesign).mock.calls[0];
      expect(call?.[3]?.content?.title).toBe('Tiêu đề mới');
    });

    expect(await screen.findByText('Đã lưu bản thiết kế thiệp thành công!')).toBeInTheDocument();
  });

  const jobBase = {
    jobId: 'job-1',
    intentDigest: 'a'.repeat(64),
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    statusPath: `/api/v1/bookings/${bookingId}/invitation-image-jobs/job-1`,
  };
  const queuedJob: ImageJobView = {
    ...jobBase,
    status: 'QUEUED',
    retryAfterSeconds: 3,
    result: null,
    errorCode: null,
  };
  const succeededJob = (derivedAssetId = 'derived-png'): ImageJobView => ({
    ...jobBase,
    status: 'SUCCEEDED',
    retryAfterSeconds: null,
    errorCode: null,
    result: {
      mediaAssetId: 'private-original',
      derivedAssetId,
      previewPath: `/api/v1/bookings/${bookingId}/media/private-original`,
    },
  });
  const recoveryJob: ImageJobView = {
    ...jobBase,
    status: 'RECOVERY_REQUIRED',
    retryAfterSeconds: null,
    result: null,
    errorCode: 'AI_JOB_INTERRUPTED',
  };
  const renderStudio = (gateway: Partial<InvitationGateway>) =>
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={{ ...mockGateway, ...gateway }}
        initialDesigns={[initialDesign]}
      />,
    );
  const requestImage = (prompt = 'Hoa trắng') => {
    fireEvent.change(screen.getByLabelText('Mô tả ảnh AI'), { target: { value: prompt } });
    fireEvent.click(screen.getByText('Tạo Ảnh AI'));
  };

  it('queues an AI image, polls until it succeeds and saves the derived asset', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const enqueueImageJob = vi.fn().mockResolvedValue(queuedJob);
    const getImageJob = vi
      .fn()
      .mockResolvedValueOnce({ ...queuedJob, status: 'RUNNING' })
      .mockResolvedValueOnce(succeededJob());
    const reviseDesign = vi
      .fn<InvitationGateway['reviseDesign']>()
      .mockResolvedValue(initialDesign);
    renderStudio({ enqueueImageJob, getImageJob, reviseDesign });

    requestImage();
    expect(await screen.findByText('Đang xếp hàng chờ tạo ảnh…')).toBeInTheDocument();
    expect(enqueueImageJob).toHaveBeenCalledWith(
      accessToken,
      bookingId,
      'Hoa trắng',
      '1:1',
      expect.stringMatching(/^image-job:/),
    );
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(await screen.findByText('Đang tạo ảnh…')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(3000));
    await screen.findByText('Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.');
    expect(mockGateway.getMediaPreview).toHaveBeenCalledWith(
      accessToken,
      bookingId,
      'private-original',
    );
    vi.useRealTimers();

    fireEvent.click(screen.getByText('Lưu Bản Thiết Kế'));
    await waitFor(() => {
      const content = reviseDesign.mock.calls[0]?.[3]?.content;
      expect(content?.derivedAssetIds).toEqual(['derived-png']);
      expect(content?.sections).toEqual([
        { kind: 'HERO', textKey: null, derivedAssetId: 'derived-png' },
      ]);
    });
  });

  it('retries a failed request with the same key and starts a new key for a new prompt', async () => {
    const enqueueImageJob = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'network',
          code: 'NETWORK_ERROR',
          message: 'offline',
          requestId: 'request',
        }),
      )
      .mockResolvedValue(succeededJob());
    renderStudio({ enqueueImageJob });

    requestImage();
    expect(await screen.findByText(/sẽ không bị tạo trùng/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tạo Ảnh AI'));
    await screen.findByText('Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.');
    requestImage('Hoa hồng');
    await waitFor(() => expect(enqueueImageJob).toHaveBeenCalledTimes(3));

    const keys = enqueueImageJob.mock.calls.map((call) => call[4] as string);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('explains the booking limit and a disabled provider in Vietnamese', async () => {
    const enqueueImageJob = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many',
          requestId: 'request',
          status: 429,
        }),
      )
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'AI_IMAGE_PROVIDER_DISABLED',
          message: 'Disabled',
          requestId: 'request',
          status: 503,
        }),
      );
    renderStudio({ enqueueImageJob });

    requestImage();
    expect(await screen.findByText(/giới hạn tạo ảnh AI/)).toBeInTheDocument();
    requestImage('Hoa hồng');
    expect(await screen.findByText(/đang tạm tắt/)).toBeInTheDocument();
  });

  it('offers a deliberate recovery for an unknown outcome without creating a new job', async () => {
    const enqueueImageJob = vi.fn().mockResolvedValue(recoveryJob);
    const recoverImageJob = vi.fn().mockResolvedValue(succeededJob());
    renderStudio({ enqueueImageJob, recoverImageJob });

    requestImage();
    expect(await screen.findByText(/Chưa xác định được kết quả tạo ảnh/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử khôi phục' }));

    await screen.findByText('Ảnh đã sẵn sàng. Lưu thiết kế để sử dụng ảnh trên thiệp.');
    expect(recoverImageJob).toHaveBeenCalledWith(
      accessToken,
      bookingId,
      'job-1',
      expect.stringMatching(/^image-job-recovery:/),
    );
    expect(enqueueImageJob).toHaveBeenCalledTimes(1);
  });

  it('resumes a running job after reload instead of creating a new one', async () => {
    const listImageJobs = vi.fn().mockResolvedValue([{ ...queuedJob, status: 'RUNNING' }]);
    const enqueueImageJob = vi.fn();
    renderStudio({ listImageJobs, enqueueImageJob });

    expect(await screen.findByText('Đang tạo ảnh…')).toBeInTheDocument();
    expect(screen.getByText('Đang tạo ảnh...')).toBeDisabled();
    expect(enqueueImageJob).not.toHaveBeenCalled();
  });

  it('suggests an earlier finished image that is not in the design yet', async () => {
    const listImageJobs = vi.fn().mockResolvedValue([succeededJob('derived-earlier')]);
    const reviseDesign = vi
      .fn<InvitationGateway['reviseDesign']>()
      .mockResolvedValue(initialDesign);
    renderStudio({ listImageJobs, reviseDesign });

    fireEvent.click(await screen.findByRole('button', { name: 'Dùng ảnh này' }));
    fireEvent.click(screen.getByText('Lưu Bản Thiết Kế'));

    await waitFor(() =>
      expect(reviseDesign.mock.calls[0]?.[3]?.content?.derivedAssetIds).toEqual([
        'derived-earlier',
      ]),
    );
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
        expect.any(String),
      );
    });

    expect(
      await screen.findByText('Đã duyệt báo giá in thiệp thành công! Đơn hàng bắt đầu sản xuất.'),
    ).toBeInTheDocument();
  });

  it('notifies onTabChange when navigating across tabs', () => {
    const onTabChange = vi.fn();
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
        initialOrders={[initialOrder]}
        onTabChange={onTabChange}
      />,
    );

    fireEvent.click(screen.getByText('Bộ Sưu Tập Ảnh'));
    expect(onTabChange).toHaveBeenCalledWith('media');

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    expect(onTabChange).toHaveBeenCalledWith('publish');

    fireEvent.click(screen.getByText('Đặt In Thiệp Giấy (1)'));
    expect(onTabChange).toHaveBeenCalledWith('print');
  });

  it('publishes and unpublishes design with public slug and QR preview', async () => {
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    expect(screen.getByText('Xuất Bản Trực Tuyến & Mã QR Chung')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Xuất Bản Thiệp Ngay'));

    await waitFor(() => {
      expect(mockGateway.publishDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        'rev-1',
        1,
        0,
        expect.any(String),
      );
    });

    expect(await screen.findByText('Thiệp cưới đã được xuất bản trực tuyến!')).toBeInTheDocument();
    expect(screen.getByText('/t/cuoi-lan-tung')).toBeInTheDocument();

    // Unpublish
    fireEvent.click(screen.getByText('Hủy Xuất Bản'));
    await waitFor(() => {
      expect(mockGateway.unpublishDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        1,
        expect.any(String),
      );
    });
    expect(await screen.findByText('Đã hủy xuất bản thiệp cưới.')).toBeInTheDocument();
  });

  it('restores publication state after reload from localStorage and unmount', async () => {
    const storageKey = `wedding_invitation_pub_${bookingId}_d-1`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ publicSlug: 'cuoi-lan-tung', publicationRevision: 1 }),
    );

    const { unmount } = render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    expect(await screen.findByText('Hủy Xuất Bản')).toBeInTheDocument();
    expect(screen.getByText('/t/cuoi-lan-tung')).toBeInTheDocument();

    unmount();
    localStorage.removeItem(storageKey);
  });

  it('uploads media file and allows detaching in media tab', async () => {
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Bộ Sưu Tập Ảnh'));
    expect(screen.getByText('Bộ Sưu Tập Hình Ảnh Cưới')).toBeInTheDocument();

    const fileInput = screen.getByLabelText('Chọn Tệp Hình Ảnh');
    const altInput = screen.getByLabelText(/Mô Tả Hình Ảnh/);

    const dummyFile = new File(['dummy-content'], 'wedding-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });
    fireEvent.change(altInput, { target: { value: 'Ảnh cưới chụp sân vườn' } });

    fireEvent.submit(screen.getByText('Tải Lên Hình Ảnh').closest('form')!);

    await waitFor(() => {
      expect(mockGateway.uploadMedia).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        dummyFile,
        'Ảnh cưới chụp sân vườn',
        undefined,
        expect.any(String),
      );
    });

    expect(await screen.findByText(/Đã tải lên tệp ảnh thành công!/)).toBeInTheDocument();
    expect(screen.getByText('Ảnh cưới chụp sân vườn')).toBeInTheDocument();

    // Detach image
    fireEvent.click(screen.getByText('Gỡ ảnh gốc khỏi hồ sơ'));
    await waitFor(() => {
      expect(mockGateway.detachMedia).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'm-1',
        1,
        expect.any(String),
      );
    });
    expect(
      await screen.findByText('Đã gỡ bỏ hình ảnh gốc và làm sạch tham chiếu trong bản thảo thiệp.'),
    ).toBeInTheDocument();
  });

  it('handles full publish -> reload -> unpublish -> reload -> republish cycle preserving revision', async () => {
    const storageKey = `wedding_invitation_pub_${bookingId}_d-1`;
    localStorage.removeItem(storageKey);

    // 1. Initial Publish
    const { unmount: unmount1 } = render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    fireEvent.click(screen.getByText('Xuất Bản Thiệp Ngay'));

    await waitFor(() => {
      expect(mockGateway.publishDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        'rev-1',
        1,
        0, // Initial publication revision is 0
        expect.any(String),
      );
    });
    expect(await screen.findByText('Thiệp Cưới Đã Xuất Bản')).toBeInTheDocument();
    unmount1();

    // 2. Reload: component remounts with cached published state
    const { unmount: unmount2 } = render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    expect(await screen.findByText('Hủy Xuất Bản')).toBeInTheDocument();

    // 3. Unpublish: calls unpublish with revision 1, gets next publicationRevision: 2
    fireEvent.click(screen.getByText('Hủy Xuất Bản'));
    await waitFor(() => {
      expect(mockGateway.unpublishDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        1,
        expect.any(String),
      );
    });
    expect(await screen.findByText('Đã hủy xuất bản thiệp cưới.')).toBeInTheDocument();
    expect(screen.getByText(/Trạng Thái: Đã Hủy Xuất Bản/)).toBeInTheDocument();
    unmount2();

    // 4. Reload after unpublish: remounts, reads localStorage with published: false, next revision: 2
    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Xuất Bản & Mã QR'));
    expect(await screen.findByText(/Trạng Thái: Đã Hủy Xuất Bản/)).toBeInTheDocument();
    expect(screen.getByText(/Phiên bản xuất bản tiếp theo sẵn sàng: #2/)).toBeInTheDocument();

    // 5. Republish: must send publicationRevision: 2, not 0!
    fireEvent.click(screen.getByText('Xuất Bản Thiệp Ngay'));
    await waitFor(() => {
      expect(mockGateway.publishDesign).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'd-1',
        'rev-1',
        1,
        2, // Preserved next revision 2 from unpublish response!
        expect.any(String),
      );
    });

    localStorage.removeItem(storageKey);
  });

  it('allows retrying failed image derivation without re-uploading file', async () => {
    const failingGateway = {
      ...mockGateway,
      deriveAsset: vi
        .fn()
        .mockRejectedValueOnce(new Error('Derive service busy'))
        .mockResolvedValueOnce({
          derivedAssetId: 'da-retry-1',
          width: 800,
          height: 600,
          publicSlug: 'retry-slug',
        }),
    };

    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={failingGateway}
        initialDesigns={[initialDesign]}
      />,
    );

    fireEvent.click(screen.getByText('Bộ Sưu Tập Ảnh'));
    const fileInput = screen.getByLabelText('Chọn Tệp Hình Ảnh');
    const altInput = screen.getByLabelText(/Mô Tả Hình Ảnh/);
    const dummyFile = new File(['content'], 'retry-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });
    fireEvent.change(altInput, { target: { value: 'Ảnh cần thử lại' } });
    fireEvent.submit(screen.getByText('Tải Lên Hình Ảnh').closest('form')!);

    expect(await screen.findByText('⚠ Chưa sẵn sàng cho thiệp')).toBeInTheDocument();
    const retryBtn = screen.getByText('Thử lại tạo ảnh cho thiệp');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(failingGateway.deriveAsset).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('✓ Đã chuẩn bị cho thiệp')).toBeInTheDocument();
    expect(screen.getByText('✕ Bỏ ảnh khỏi thiệp')).toBeInTheDocument();
  });

  it('removes image from design draft and sanitizes design sections on save', async () => {
    const designWithImage: DesignView = {
      ...initialDesign,
      derivedAssetIds: ['img-1'],
      sections: [{ kind: 'HERO', textKey: null, derivedAssetId: 'img-1' }],
    };

    render(
      <InvitationStudioView
        bookingId={bookingId}
        accessToken={accessToken}
        gateway={mockGateway}
        initialDesigns={[designWithImage]}
      />,
    );

    // Initial state has active image in design tab
    expect(screen.getByText(/Hình ảnh đang dùng trong thiệp/)).toBeInTheDocument();
    const removeBtn = screen.getByText('Bỏ khỏi thiệp');
    fireEvent.click(removeBtn);

    expect(
      await screen.findByText(
        'Đã bỏ ảnh khỏi bản thảo thiệp. Hãy lưu thiết kế để ghi nhận thay đổi.',
      ),
    ).toBeInTheDocument();

    // Now save design: reviseDesign should be called with empty derivedAssetIds and empty sections!
    fireEvent.click(screen.getByText('Lưu Bản Thiết Kế'));
    await waitFor(() => {
      expect(mockGateway.reviseDesign).toHaveBeenCalled();
    });
    const calls = vi.mocked(mockGateway.reviseDesign).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall).toBeDefined();
    expect(lastCall?.[0]).toBe(accessToken);
    expect(lastCall?.[1]).toBe(bookingId);
    expect(lastCall?.[2]).toBe('d-1');
    expect(lastCall?.[3]?.content?.derivedAssetIds).toEqual([]);
    expect(lastCall?.[3]?.content?.sections).toEqual([]);
  });

  it('cancels print order with reason and reloads order list', async () => {
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
    const cancelBtn = screen.getByText('Hủy Đơn');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockGateway.cancelPrintOrder).toHaveBeenCalledWith(
        accessToken,
        bookingId,
        'o-1',
        1,
        'Khách hàng yêu cầu hủy đơn in',
        expect.any(String),
      );
    });

    expect(await screen.findByText('Đã hủy đơn in thiệp thành công.')).toBeInTheDocument();
  });
});
