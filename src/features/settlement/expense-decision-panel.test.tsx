import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiData } from '../../lib/api/types';
import { ExpenseDecisionPanel } from './expense-decision-panel';

const post = vi.hoisted(() => vi.fn());
vi.mock('../couple-workspace/use-couple-workspace', () => ({
  authorizedRead: (work: (token: string) => Promise<unknown>) => work('token'),
  bearer: (token: string) => ({ Authorization: `Bearer ${token}` }),
  coupleApi: () => ({ POST: post }),
  unwrap: (value: unknown) => value,
  formatVnd: (value: number) => `${value}đ`,
  formatDateTime: (value: string) => value,
}));
type Expenses = ApiData<'/bookings/{bookingId}/incidental-expenses', 'get'>;
const review: NonNullable<Expenses['currentReview']> = {
  id: 'review-2',
  revisionNumber: 2,
  draftRevision: 4,
  type: 'EXPENSES',
  state: 'AWAITING_APPROVAL',
  documentDigest: 'a'.repeat(64),
  document: { lines: [], totalVnd: 1000 },
  managerAccountId: 'manager',
  managerApprovedAt: '2026-11-08T12:00:00Z',
  coupleAccountId: null,
  coupleApprovedAt: null,
  decisionReason: null,
  createdAt: '2026-11-08T12:00:00Z',
};
const expenses: Expenses = {
  bookingId: 'booking',
  revision: 4,
  finalized: false,
  lines: [],
  totalVnd: 1000,
  approvalRequired: true,
  pricing: [],
  currentReview: review,
  reviewHistory: [review],
  canFinalize: false,
};
describe('whole-table expense approval', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: {} });
  });
  it('sends the exact displayed review/digest and prevents duplicate clicks', async () => {
    let resolve: () => void = () => undefined;
    post.mockReturnValue(
      new Promise((done) => {
        resolve = () => done({ data: {} });
      }),
    );
    const onSaved = vi.fn();
    render(<ExpenseDecisionPanel bookingId="booking" expenses={expenses} onSaved={onSaved} />);
    const button = screen.getByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: {
        expectedRevision: 4,
        reviewId: 'review-2',
        documentDigest: 'a'.repeat(64),
        decision: 'APPROVE',
      },
    });
    resolve();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
  it('requires a reason for change requests and has no attachment input', async () => {
    render(
      <ExpenseDecisionPanel bookingId="booking" expenses={expenses} onSaved={() => undefined} />,
    );
    const request = screen.getByRole('button', { name: 'Yêu cầu chỉnh sửa' });
    expect(request).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Lý do yêu cầu chỉnh sửa'), {
      target: { value: 'Kiểm tra lại số thùng' },
    });
    fireEvent.click(request);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[1]).toMatchObject({
      body: { decision: 'REQUEST_CHANGES', reason: 'Kiểm tra lại số thùng' },
    });
    expect(document.querySelector('input[type=file]')).toBeNull();
  });
  it('shows explicit no-expenses confirmation without a Couple approval button', () => {
    render(
      <ExpenseDecisionPanel
        bookingId="booking"
        expenses={{ ...expenses, currentReview: { ...review, type: 'NONE', state: 'APPROVED' } }}
        onSaved={() => undefined}
      />,
    );
    expect(screen.getByText('Nhà hàng xác nhận không có chi phí phát sinh.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt toàn bộ chi phí phát sinh' })).toBeNull();
  });
});
