import { describe, it, expect, vi } from 'vitest';
import { createInvitationGateway, previewAssetId } from './invitation-api';
import type { ApiClient } from '../../lib/api/client';

describe('InvitationGateway (IS-W7 Couple Web)', () => {
  const token = 'mock-couple-token';
  const bookingId = '11111111-1111-1111-1111-111111111111';
  const designId = '22222222-2222-2222-2222-222222222222';
  const orderId = '33333333-3333-3333-3333-333333333333';

  it('lists designs and returns items', async () => {
    const mockClient = {
      GET: vi.fn().mockResolvedValue({
        data: { data: { items: [{ designId, revisionNumber: 1, title: 'Thiệp Cưới' }] } },
      }),
    } as unknown as ApiClient;

    const gateway = createInvitationGateway(mockClient);
    const designs = await gateway.listDesigns(token, bookingId);

    expect(designs).toHaveLength(1);
    expect(designs[0]?.title).toBe('Thiệp Cưới');
    expect(mockClient.GET).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitations',
      expect.objectContaining({ params: { path: { bookingId } } }),
    );
  });

  it('creates a new design with idempotent header', async () => {
    const mockClient = {
      POST: vi.fn().mockResolvedValue({
        data: { data: { designId, revisionNumber: 1, title: 'Thiết Kế Mới' } },
      }),
    } as unknown as ApiClient;

    const gateway = createInvitationGateway(mockClient);
    const result = await gateway.createDesign(token, bookingId, {
      title: 'Thiết Kế Mới',
      textFields: {},
      sections: [],
      derivedAssetIds: [],
      includesSeating: false,
    });

    expect(result.designId).toBe(designId);
    expect(mockClient.POST).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(mockClient.POST).mock.calls[0])).toContain('create-design:');
  });

  it('publishes and unpublishes design', async () => {
    const mockClient = {
      POST: vi
        .fn()
        .mockResolvedValue({ data: { data: { publicSlug: 'slug-1', publicationRevision: 1 } } }),
      DELETE: vi.fn().mockResolvedValue({ data: { data: {} } }),
    } as unknown as ApiClient;

    const gateway = createInvitationGateway(mockClient);
    const pub = await gateway.publishDesign(token, bookingId, designId, 'rev-1', 1, 0);
    expect(pub.publicSlug).toBe('slug-1');
    await gateway.unpublishDesign(token, bookingId, designId, 1);

    expect(mockClient.POST).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitations/{designId}/publication',
      expect.objectContaining({
        body: { designRevisionId: 'rev-1', expectedRevision: 1, expectedPublicationRevision: 0 },
      }),
    );
    expect(mockClient.DELETE).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitations/{designId}/publication',
      expect.anything(),
    );
  });

  it('requests, views, approves and cancels print orders', async () => {
    const mockClient = {
      GET: vi.fn().mockResolvedValue({
        data: {
          data: {
            items: [
              {
                id: orderId,
                status: 'QUOTED',
                revision: 1,
                commercialRevision: {
                  id: 'cr-1',
                  orderTotalVnd: 5000000,
                  expiresAt: '2026-10-20T00:00:00.000Z',
                },
              },
            ],
          },
        },
      }),
      POST: vi.fn().mockResolvedValue({
        data: { data: { id: orderId, status: 'APPROVED' } },
      }),
    } as unknown as ApiClient;

    const gateway = createInvitationGateway(mockClient);
    const orders = await gateway.listPrintOrders(token, bookingId);
    expect(orders).toHaveLength(1);

    const approved = await gateway.approvePrintOrder(token, bookingId, orderId, 'cr-1', 1);
    expect(approved.status).toBe('APPROVED');

    await gateway.cancelPrintOrder(token, bookingId, orderId, 2, 'Thay đổi số lượng');
    expect(mockClient.POST).toHaveBeenCalledWith(
      '/bookings/{bookingId}/print-orders/{orderId}/cancellation',
      expect.objectContaining({ body: { expectedRevision: 2, reason: 'Thay đổi số lượng' } }),
    );
  });

  it('enqueues an AI image job with the caller key and fills the null fields of a queued job', async () => {
    const queued = {
      jobId: 'job-1',
      intentDigest: 'a'.repeat(64),
      status: 'QUEUED',
      createdAt: '2026-10-21T00:00:00.000Z',
      updatedAt: '2026-10-21T00:00:00.000Z',
      statusPath: '/api/v1/bookings/b/invitation-image-jobs/job-1',
      retryAfterSeconds: 3,
    };
    const client = {
      POST: vi.fn().mockResolvedValue({ data: { data: queued } }),
    } as unknown as ApiClient;

    const job = await createInvitationGateway(client).enqueueImageJob(
      token,
      bookingId,
      'Hoa trắng',
      '1:1',
      'image-job:same-intent',
    );

    expect(client.POST).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitation-image-jobs',
      expect.objectContaining({
        body: { prompt: 'Hoa trắng', aspectRatio: '1:1' },
        params: { path: { bookingId }, header: { 'Idempotency-Key': 'image-job:same-intent' } },
      }),
    );
    expect(job).toMatchObject({ status: 'QUEUED', result: null, errorCode: null });
  });

  it('reads, lists and recovers image jobs without caching status', async () => {
    const succeeded = {
      jobId: 'job-1',
      intentDigest: 'a'.repeat(64),
      status: 'SUCCEEDED',
      createdAt: '2026-10-21T00:00:00.000Z',
      updatedAt: '2026-10-21T00:01:00.000Z',
      statusPath: '/api/v1/bookings/b/invitation-image-jobs/job-1',
      retryAfterSeconds: null,
      result: { mediaAssetId: 'm', derivedAssetId: 'd', previewPath: '/api/v1/bookings/b/media/m' },
    };
    const client = {
      GET: vi
        .fn()
        .mockResolvedValueOnce({ data: { data: succeeded } })
        .mockResolvedValueOnce({ data: { data: { items: [succeeded], nextCursor: null } } }),
      POST: vi.fn().mockResolvedValue({ data: { data: succeeded } }),
    } as unknown as ApiClient;
    const gateway = createInvitationGateway(client);

    expect(await gateway.getImageJob(token, bookingId, 'job-1')).toMatchObject({
      status: 'SUCCEEDED',
      errorCode: null,
    });
    expect(client.GET).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitation-image-jobs/{jobId}',
      expect.objectContaining({
        cache: 'no-store',
        params: { path: { bookingId, jobId: 'job-1' } },
      }),
    );
    expect(await gateway.listImageJobs(token, bookingId)).toHaveLength(1);
    await gateway.recoverImageJob(token, bookingId, 'job-1', 'image-job-recovery:k');
    expect(client.POST).toHaveBeenCalledWith(
      '/bookings/{bookingId}/invitation-image-jobs/{jobId}/recovery',
      expect.objectContaining({
        body: {},
        params: {
          path: { bookingId, jobId: 'job-1' },
          header: { 'Idempotency-Key': 'image-job-recovery:k' },
        },
      }),
    );
  });

  it('reads the media asset id from an authenticated preview path', () => {
    expect(previewAssetId('/api/v1/bookings/abc-1/media/0f0e-12')).toBe('0f0e-12');
    expect(previewAssetId('/somewhere/else')).toBeNull();
  });

  it('throws clear error when api returns error object', async () => {
    const mockClient = {
      GET: vi.fn().mockResolvedValue({
        error: { message: 'Not found' },
      }),
    } as unknown as ApiClient;

    const gateway = createInvitationGateway(mockClient);
    await expect(gateway.getPublicInvitation('non-existent-slug')).rejects.toThrow(
      'Thiệp cưới không tồn tại hoặc đã bị gỡ bỏ.',
    );
  });
});
