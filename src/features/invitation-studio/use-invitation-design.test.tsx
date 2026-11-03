import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DesignView, InvitationGateway } from './invitation-api';
import { useInvitationDesign } from './use-invitation-design';

vi.mock('./use-image-job', () => ({ useImageJob: () => ({ busy: false }) }));

const first: DesignView = {
  designId: 'first',
  revisionId: 'r1',
  revisionNumber: 1,
  title: 'Mẫu thứ nhất',
  presentation: { version: 1, theme: 'blush-floral', layout: 'album' },
  textFields: { brideName: 'Lan', groomName: 'Tùng' },
  sections: [],
  derivedAssetIds: [],
  includesSeating: false,
  updatedAt: '2026-11-04T00:00:00Z',
};
const second: DesignView = { ...first, designId: 'second', revisionId: 'r2', title: 'Mẫu thứ hai' };

describe('multiple invitation designs', () => {
  it('creates another design without replacing saved designs, then edits the selected design', async () => {
    const gateway = {
      createDesign: vi.fn().mockResolvedValue(second),
      reviseDesign: vi.fn().mockResolvedValue({ ...first, revisionNumber: 2 }),
    } as unknown as InvitationGateway;
    const { result } = renderHook(() =>
      useInvitationDesign({
        bookingId: 'booking',
        accessToken: 'token',
        gateway,
        initialDesigns: [first],
      }),
    );
    act(() => result.current.startNewDesign());
    act(() => result.current.refreshDesigns([first]));
    expect(result.current.currentDesign).toBeUndefined();
    expect(result.current.title).toBe('Thiệp cưới mới');
    act(() => result.current.setCardTheme('sage-minimalist'));
    await act(() =>
      result.current.handleSaveDesign({ preventDefault: vi.fn() } as unknown as React.FormEvent),
    );
    expect(result.current.designs.map((design) => design.designId)).toEqual(['second', 'first']);
    expect(gateway.createDesign).toHaveBeenCalledWith(
      'token',
      'booking',
      expect.objectContaining({
        presentation: { version: 1, theme: 'sage-minimalist', layout: 'envelope' },
      }),
      expect.any(String),
    );
    act(() => result.current.selectDesign('first'));
    expect(result.current.title).toBe('Mẫu thứ nhất');
    expect(result.current.presentation).toEqual(first.presentation);
    await act(() =>
      result.current.handleSaveDesign({ preventDefault: vi.fn() } as unknown as React.FormEvent),
    );
    expect(gateway.reviseDesign).toHaveBeenCalledWith(
      'token',
      'booking',
      'first',
      expect.anything(),
      expect.any(String),
    );
    expect(vi.mocked(gateway.reviseDesign).mock.calls[0]?.[3]?.content?.presentation).toEqual(
      first.presentation,
    );
    expect(result.current.designs.map((design) => design.designId)).toEqual(['second', 'first']);
  });
});
