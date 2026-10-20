import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type * as CouplePageModule from '../couple-workspace/couple-page';
import { SeatingPage } from './seating-page';
import { seatingApi, type SeatingPlan } from './seating-api';
import { guestApi } from '../guest-management/guest-api';
import { browserSession } from '../identity-access/browser-session';
import type { Proposal } from '../couple-workspace/use-couple-workspace';
import { ApiClientError } from '../../lib/api/client';

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('../identity-access/browser-session', () => ({
  browserSession: { authorize: vi.fn() },
}));
vi.mock('../couple-workspace/couple-page', async (importOriginal) => ({
  ...(await importOriginal<typeof CouplePageModule>()),
  CouplePage: ({ children }: { children: (proposal: Proposal, reload: () => void) => ReactNode }) =>
    children({ bookingId: 'booking', revision: 13 } as Proposal, () => {}),
}));

const plan: SeatingPlan = {
  seatingPlanId: 'plan',
  bookingId: 'booking',
  revisionId: 'revision',
  revisionNumber: 4,
  status: 'DRAFT',
  layoutTemplateVersionId: 'layout-50',
  layoutName: 'PERF-TEST Orchid 50',
  bookingRevision: 13,
  currentBookingRevision: 13,
  expectedAttendees: 70,
  currentPlanningHeadcount: 70,
  minGuests: 50,
  maxGuests: 50,
  totalSeatCapacity: 50,
  labels: [],
  renderSnapshot: [],
  droppedTableIds: [],
  warnings: [],
  managerException: null,
  snapshotDigest: 'digest',
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(browserSession, 'authorize').mockImplementation((operation) => operation('token'));
  localStorage.setItem('wedding.seatingPlan.booking', 'plan');
  vi.spyOn(guestApi, 'groups').mockResolvedValue([]);
  vi.spyOn(seatingApi, 'plan').mockResolvedValue(plan);
  vi.spyOn(seatingApi, 'options').mockResolvedValue({
    planningHeadcount: 70,
    bookingRevision: 13,
    items: [
      {
        layoutTemplateVersionId: 'layout-50',
        name: plan.layoutName,
        minGuests: 50,
        maxGuests: 50,
        totalSeatCapacity: 50,
        compatible: false,
        warning: 'EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY',
      },
    ],
  });
  vi.spyOn(seatingApi, 'confirm').mockResolvedValue({ ...plan, status: 'CONFIRMED' });
});

describe('seating confirmation capacity', () => {
  it('blocks the reported 70-person / 50-seat draft before submitting a confirmation', async () => {
    render(<SeatingPage />);
    const button = await screen.findByRole('button', { name: 'Xác nhận sơ đồ' });
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('70 khách');
    expect(screen.getByRole('status')).toHaveTextContent('50 ghế');
    expect(screen.getByRole('status')).toHaveTextContent('thiếu 20 chỗ');
    expect(screen.getByText('Không đủ chỗ')).toBeInTheDocument();
    expect(
      screen.getByText(/Sảnh hiện chưa có mẫu phù hợp với 70 khách dự kiến/),
    ).toBeInTheDocument();
    expect(screen.queryByText('EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY')).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(vi.spyOn(seatingApi, 'confirm')).not.toHaveBeenCalled();
  });

  it('blocks standard confirmation outside the layout range even with enough physical seats', async () => {
    vi.spyOn(seatingApi, 'plan').mockResolvedValue({ ...plan, totalSeatCapacity: 100 });
    render(<SeatingPage />);
    expect(await screen.findByRole('button', { name: 'Xác nhận sơ đồ' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('ngoài khoảng 50–50 khách');
  });

  it('keeps a current manager-approved range exception valid within physical capacity', async () => {
    vi.spyOn(seatingApi, 'plan').mockResolvedValue({
      ...plan,
      status: 'CONFIRMED',
      totalSeatCapacity: 80,
      managerException: {
        approvalId: 'approval',
        actorAccountId: 'manager',
        approvedAt: '2026-10-20T00:00:00Z',
        approvedBookingRevision: 13,
        approvedHeadcount: 70,
        reason: 'Ngoại lệ đã được duyệt',
      },
    });
    render(<SeatingPage />);
    expect(await screen.findByRole('button', { name: 'Xác nhận sơ đồ' })).toBeDisabled();
    expect(
      screen.queryByText(/thiếu \d+ chỗ|nằm ngoài khoảng 50–50 khách/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Nhà hàng đã duyệt ngoại lệ sức chứa/)).toBeInTheDocument();
  });

  it('allows recovery by choosing a compatible layout before confirming', async () => {
    vi.spyOn(seatingApi, 'options').mockResolvedValue({
      planningHeadcount: 70,
      bookingRevision: 13,
      items: [
        {
          layoutTemplateVersionId: 'layout-80',
          name: 'Mẫu đủ chỗ',
          minGuests: 50,
          maxGuests: 80,
          totalSeatCapacity: 80,
          compatible: true,
          warning: null,
        },
      ],
    });
    const next = {
      ...plan,
      layoutTemplateVersionId: 'layout-80',
      layoutName: 'Mẫu đủ chỗ',
      maxGuests: 80,
      totalSeatCapacity: 80,
      revisionNumber: 5,
    };
    vi.spyOn(seatingApi, 'revise').mockResolvedValue(next);
    vi.spyOn(seatingApi, 'confirm').mockResolvedValue({
      ...next,
      status: 'CONFIRMED',
      revisionNumber: 6,
    });
    render(<SeatingPage />);
    expect(await screen.findByRole('button', { name: 'Xác nhận sơ đồ' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi sang mẫu này' }));
    await screen.findByText('Mẫu đang dùng: Mẫu đủ chỗ');
    expect(screen.queryByText(/thiếu 20 chỗ/)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Xác nhận sơ đồ' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByText('Đã xác nhận sơ đồ bàn. Sơ đồ sẽ được dùng cho file in.');
    expect(vi.spyOn(seatingApi, 'confirm')).toHaveBeenLastCalledWith(
      'token',
      expect.any(String),
      'booking',
      'plan',
      5,
      13,
    );
  });

  it('allows a compatible layout with no named guests and sends both server revisions', async () => {
    vi.spyOn(seatingApi, 'plan').mockResolvedValue({
      ...plan,
      minGuests: 50,
      maxGuests: 80,
      totalSeatCapacity: 80,
      currentBookingRevision: 14,
    });
    render(<SeatingPage />);
    const button = await screen.findByRole('button', { name: 'Xác nhận sơ đồ' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() =>
      expect(vi.spyOn(seatingApi, 'confirm')).toHaveBeenCalledWith(
        'token',
        expect.any(String),
        'booking',
        'plan',
        4,
        14,
      ),
    );
    expect(
      await screen.findByText('Đã xác nhận sơ đồ bàn. Sơ đồ sẽ được dùng cho file in.'),
    ).toBeInTheDocument();
  });

  it('explains a server capacity rejection when the hall constraint changes after loading', async () => {
    vi.spyOn(seatingApi, 'plan').mockResolvedValue({
      ...plan,
      maxGuests: 80,
      totalSeatCapacity: 80,
    });
    vi.spyOn(seatingApi, 'confirm').mockRejectedValue(
      new ApiClientError({
        kind: 'api',
        code: 'EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY',
        status: 409,
        message: 'owner facts conflict',
        requestId: 'support-id',
      }),
    );
    render(<SeatingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận sơ đồ' }));
    expect(
      await screen.findByText(/Số khách dự kiến vượt số ghế của sơ đồ hoặc sức chứa của sảnh/),
    ).toBeInTheDocument();
    expect(screen.getByText(/support-id/)).toBeInTheDocument();
    expect(
      screen.queryByText('Dữ liệu vừa thay đổi. Hãy tải lại rồi thử lại.'),
    ).not.toBeInTheDocument();
  });
});
