import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CollaborationGateway, ProposalView } from './collaboration-api';
import { CollaborationWorkspace } from './collaboration-page';

const proposal: ProposalView = {
  bookingId: '00000000-0000-4000-8000-000000000101',
  consultationId: '00000000-0000-4000-8000-000000000102',
  phase: 'DRAFT', revision: 4, eventDate: '2026-11-15', planningHeadcount: 280,
  proposal: {
    hall: { id: 'hall', name: 'Sảnh Ánh Dương', description: 'Sảnh vườn', maxGuests: 320 },
    shift: { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
    menu: { name: 'Thực đơn Mùa Thu', description: 'Theo mùa', priceVndPerTable: 5_000_000 },
    tableCount: 28, baseChargeVnd: 140_000_000, depositAmountVnd: 42_000_000,
  },
  timeline: {
    revisionId: '00000000-0000-4000-8000-000000000103', revisionNumber: 2,
    predecessorRevisionId: null, managerApprovedAt: '2026-10-07T10:00:00.000Z', coupleApprovedAt: null,
    items: [{ itemId: '00000000-0000-4000-8000-000000000104', order: 1, startTime: '17:30', title: 'Đón khách', description: null }],
  },
  capabilities: { accessLevel: 'RESTRICTED', canEditTimeline: true, canApproveTimeline: true, canRequestCancellation: false },
};

function fakeGateway(): CollaborationGateway {
  return {
    load: vi.fn().mockResolvedValue(proposal), saveTimeline: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined), withdraw: vi.fn().mockResolvedValue(undefined),
    requestChange: vi.fn().mockResolvedValue(undefined), requestCancellation: vi.fn().mockResolvedValue(undefined),
  };
}
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('couple-token');

describe('Booking collaboration workspace', () => {
  it('renders a restricted proposal and exact timeline from the server', async () => {
    const gateway = fakeGateway();
    render(<CollaborationWorkspace access="restricted" authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: proposal.bookingId } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText('Đón khách')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Yêu cầu hủy' })).not.toBeInTheDocument();
  });

  it('submits approval against the displayed revision and refreshes it', async () => {
    const gateway = fakeGateway();
    render(<CollaborationWorkspace access="full" authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: proposal.bookingId } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở đề xuất' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Phê duyệt revision này' }));

    await waitFor(() => expect(gateway.approve).toHaveBeenCalledWith('couple-token', {
      bookingId: proposal.bookingId, revisionId: proposal.timeline?.revisionId,
      expectedRevision: proposal.revision,
    }));
  });
});
