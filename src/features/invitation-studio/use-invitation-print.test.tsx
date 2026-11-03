import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  DesignView,
  InvitationGateway,
  PrintRequestQuote,
  PrintRequestView,
} from './invitation-api';
import { useInvitationPrint } from './use-invitation-print';

vi.mock('../realtime/use-live-refresh', () => ({
  useLiveRefresh: () => ({ refresh: vi.fn(), waiting: false }),
}));

const designs = ['a', 'b'].map((id) => ({
  designId: id,
  revisionId: `revision-${id}`,
  revisionNumber: 1,
  title: `Mẫu ${id}`,
  textFields: {},
  sections: [],
  derivedAssetIds: [],
  includesSeating: false,
  updatedAt: '2026-11-04T00:00:00Z',
})) satisfies DesignView[];

function fixture(editingDesign?: { designId: string; dirty: boolean }) {
  const quote: PrintRequestQuote = {
    quoteId: 'quote-1',
    digest: 'a'.repeat(64),
    expiresAt: '2099-11-04T00:00:00Z',
    document: {
      predecessorRevisionId: 'contract-1',
      totalVnd: 750000,
      lines: designs.map((design, index) => ({
        designId: design.designId,
        designRevisionId: design.revisionId,
        title: design.title,
        quantity: index === 0 ? 100 : 50,
        printableRevisionId: `printable-${design.designId}`,
        contentDigest: 'b'.repeat(64),
        line: {
          category: 'PRINT',
          sourceId: design.designId,
          sourceRevisionId: 'quote-1',
          name: design.title,
          description: '',
          unit: 'thiệp',
          quantity: index === 0 ? 100 : 50,
          unitPriceVnd: 5000,
          lineTotalVnd: index === 0 ? 500000 : 250000,
        },
      })),
    },
  };
  const request: PrintRequestView = {
    requestId: 'request-1',
    bookingId: 'booking-1',
    bookingRevision: 7,
    appendixRevisionId: 'appendix-1',
    state: 'AWAITING_APPROVAL',
    orderId: null,
    document: quote.document,
  };
  const gateway = {
    previewPrintRequest: vi.fn().mockResolvedValue(quote),
    confirmPrintRequest: vi.fn().mockResolvedValue(request),
    listPrintRequests: vi.fn().mockResolvedValue([]),
    listPrintOrders: vi.fn().mockResolvedValue([]),
  } as unknown as InvitationGateway;
  const hook = renderHook(() =>
    useInvitationPrint({
      bookingId: 'booking-1',
      accessToken: 'token',
      gateway,
      designs,
      initialOrders: [],
      printVisited: false,
      writing: false,
      confirm: vi.fn().mockResolvedValue(true),
      ...(editingDesign ? { editingDesign } : {}),
    }),
  );
  return { ...hook, gateway, quote };
}

describe('multi-design print appendix consent', () => {
  it('requires saving edits to a selected design before capturing its printable content', async () => {
    const { result, gateway } = fixture({ designId: 'a', dirty: true });
    act(() => result.current.setPrintSelection('a', 50));
    await act(() => result.current.handlePreviewPrint());
    expect(gateway.previewPrintRequest).not.toHaveBeenCalled();
    expect(result.current.printError).toContain('Nội dung thiệp');
    expect(result.current.printQuote).toBeNull();
  });
  it('previews two saved designs and confirms a pending request without creating an order', async () => {
    const { result, gateway, quote } = fixture();
    act(() => {
      result.current.setPrintSelection('a', 100);
      result.current.setPrintSelection('b', 50);
    });
    await act(() => result.current.handlePreviewPrint());
    expect(gateway.previewPrintRequest).toHaveBeenCalledWith(
      'token',
      'booking-1',
      [
        { designId: 'a', designRevisionId: 'revision-a', quantity: 100 },
        { designId: 'b', designRevisionId: 'revision-b', quantity: 50 },
      ],
      expect.any(String),
    );
    expect(result.current.printQuote).toEqual(quote);
    await act(() => result.current.handleConfirmPrint());
    expect(gateway.confirmPrintRequest).toHaveBeenCalledWith(
      'token',
      'booking-1',
      {
        quoteId: quote.quoteId,
        digest: quote.digest,
        consent: true,
      },
      expect.any(String),
    );
    expect(result.current.printRequests?.[0]?.state).toBe('AWAITING_APPROVAL');
    expect(result.current.orders).toEqual([]);
  });

  it('invalidates the preview when quantities change and refuses stale confirmation', async () => {
    const { result, gateway } = fixture();
    act(() => result.current.setPrintSelection('a', 100));
    await act(() => result.current.handlePreviewPrint());
    act(() => result.current.setPrintSelection('a', 101));
    expect(result.current.printQuote).toBeNull();
    await act(() => result.current.handleConfirmPrint());
    expect(gateway.confirmPrintRequest).not.toHaveBeenCalled();
  });

  it('keeps confirmation unavailable after a failed server price preview', async () => {
    const { result, gateway } = fixture();
    vi.mocked(gateway.previewPrintRequest).mockRejectedValue(new Error('Giá chưa tải được'));
    act(() => result.current.setPrintSelection('a', 100));
    await act(() => result.current.handlePreviewPrint());
    expect(result.current.printQuote).toBeNull();
    expect(result.current.printError).toBe('Giá chưa tải được');
    await act(() => result.current.handleConfirmPrint());
    expect(gateway.confirmPrintRequest).not.toHaveBeenCalled();
  });
});
