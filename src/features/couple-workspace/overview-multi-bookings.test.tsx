import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OverviewMultiBookings } from './overview-multi-bookings';
import type { BookingSummary, Proposal } from './use-couple-workspace';

const makeSummary = (overrides: Partial<BookingSummary> = {}): BookingSummary => ({
  eventType: 'WEDDING',
  bookingId: 'b1',
  consultationId: 'c1',
  accessLevel: 'RESTRICTED',
  coupleApproved: false,
  managerApproved: true,
  hasTimeline: true,
  eventDate: '2026-11-01',
  hallName: 'Lotus Hall',
  phase: 'DRAFT',
  planningHeadcount: 200,
  shiftCode: 'LUNCH',
  totalVnd: 70_000_000,
  depositPaidVnd: 0,
  groomName: 'Huy',
  brideName: 'Gia',
  ...overrides,
});

const makeProposal = (bookingId = 'b1'): Proposal =>
  ({
    bookingId,
    phase: 'DRAFT',
    eventDate: '2026-11-01',
    capabilities: { accessLevel: 'RESTRICTED' },
    proposal: {
      hall: { id: 'h1', name: 'Lotus Hall' },
      shift: { code: 'LUNCH', startTime: '11:00', endTime: '14:00' },
    },
  }) as unknown as Proposal;

describe('OverviewMultiBookings (Các sự kiện tiệc của hai bạn)', () => {
  it('hides the section when there is only one booking', () => {
    const { container } = render(
      <OverviewMultiBookings bookings={[makeSummary()]} proposal={makeProposal('b1')} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders both cards as clickable when multiple bookings exist', () => {
    const bookings = [
      makeSummary({ bookingId: 'b1', hallName: 'Lotus Hall' }),
      makeSummary({
        bookingId: 'b2',
        hallName: 'Orchid Hall',
        groomName: 'Gia',
        brideName: 'Huy',
        totalVnd: 35_000_000,
        depositPaidVnd: 28_504_500,
        phase: 'COMPLETED',
      }),
    ];

    render(<OverviewMultiBookings bookings={bookings} proposal={makeProposal('b1')} />);

    expect(
      screen.getByRole('heading', { name: 'Các sự kiện tiệc của hai bạn' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tài khoản đang quản lý 2 tiệc cưới\/báo hỷ/)).toBeInTheDocument();

    // Thẻ hiện tại (b1) có trạng thái đang thao tác
    const currentCard = screen.getByText('Đang thao tác tiệc này').closest('article');
    expect(currentCard).toHaveAttribute('aria-current', 'true');
    expect(currentCard).toHaveTextContent('Lotus Hall');

    // Thẻ còn lại (b2) là một thẻ Link có thể click trực tiếp
    const switchLink = screen.getByRole('link', {
      name: /Chuyển tới không gian tiệc/,
    });
    expect(switchLink).toBeInTheDocument();
    expect(switchLink).toHaveAttribute('href', '/khong-gian?bookingId=b2');
    expect(switchLink).toHaveTextContent('Orchid Hall');
    expect(switchLink).toHaveTextContent('Chuyển tới tiệc này');
  });
});
