import { describe, it, expect, vi } from 'vitest';
import { createInvitationGateway } from './invitation-api';
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

  it('derives an AI original before offering it for publication', async () => {
    const client = {
      POST: vi
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: { mediaAssetId: 'original', revision: 3, previewPath: '/private-preview' },
          },
        })
        .mockResolvedValueOnce({ data: { data: { derivedAssetId: 'derived' } } }),
      GET: vi
        .fn()
        .mockResolvedValue({ data: { data: { signedUrl: 'https://example.test/private.png' } } }),
    } as unknown as ApiClient;
    const result = await createInvitationGateway(client).generateImage(
      token,
      bookingId,
      'Hoa trắng',
      '1:1',
      'same-intent',
    );
    expect(client.POST).toHaveBeenNthCalledWith(
      2,
      '/bookings/{bookingId}/invitation-derived-assets',
      expect.objectContaining({
        body: { mediaAssetId: 'original', expectedRevision: 3 },
        params: { path: { bookingId }, header: { 'Idempotency-Key': 'same-intent:derive' } },
      }),
    );
    expect(result.derivedAssetId).toBe('derived');
    expect(result.previewUrl).toBe('https://example.test/private.png');
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
