'use client';
import { useRef, useState } from 'react';
import type { ApiData } from '../../lib/api/types';
import {
  authorizedRead,
  bearer,
  coupleApi,
  unwrap,
  formatVnd,
  formatDateTime,
} from '../couple-workspace/use-couple-workspace';
import { describeApiError } from '../../lib/api/api-errors';
import { cx } from '../commercial-contract/contract-classes';

type Expenses = ApiData<'/bookings/{bookingId}/incidental-expenses', 'get'>;
const states = {
  AWAITING_APPROVAL: 'Chờ hai bạn duyệt',
  APPROVED: 'Đã duyệt',
  CHANGES_REQUESTED: 'Đã yêu cầu nhà hàng sửa',
  WITHDRAWN: 'Nhà hàng đang sửa',
};
export function ExpenseDecisionPanel({
  bookingId,
  expenses,
  onSaved,
}: {
  bookingId: string;
  expenses: Expenses;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  if (!expenses.approvalRequired)
    return (
      <p className={cx.note}>Booking này giữ quy trình phát sinh theo thỏa thuận trước đây.</p>
    );
  const review = expenses.currentReview;
  const decide = async (decision: 'APPROVE' | 'REQUEST_CHANGES') => {
    if (!review || lock.current || (decision === 'REQUEST_CHANGES' && !reason.trim())) return;
    const body = {
      expectedRevision: expenses.revision,
      reviewId: review.id,
      documentDigest: review.documentDigest,
      decision,
      ...(decision === 'REQUEST_CHANGES' ? { reason: reason.trim() } : {}),
    };
    const fingerprint = JSON.stringify([bookingId, body]);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await authorizedRead(async (token) =>
        unwrap(
          await coupleApi().POST('/bookings/{bookingId}/incidental-expenses/decisions', {
            params: { path: { bookingId }, header: { 'Idempotency-Key': intent.current!.key } },
            headers: bearer(token),
            body,
          }),
        ),
      );
      intent.current = null;
      setReason('');
      onSaved();
    } catch (cause) {
      setError(describeApiError(cause).message);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const adjustment = review?.type === 'ADJUSTMENT' ? review.document.adjustment : null;
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className={cx.note}>
        {review
          ? review.type === 'NONE' && review.state === 'APPROVED'
            ? 'Nhà hàng xác nhận không có chi phí phát sinh.'
            : `Bản ${review.revisionNumber}: ${states[review.state]}`
          : 'Nhà hàng chưa gửi bảng phát sinh hoặc xác nhận không phát sinh.'}
      </p>
      {review?.decisionReason ? <p>Lý do: {review.decisionReason}</p> : null}
      {adjustment ? (
        <div>
          <h3>Đề xuất điều chỉnh hóa đơn</h3>
          <p>{adjustment.reason}</p>
          <ul>
            {adjustment.lines.map((line, index) => (
              <li key={index}>
                {line.kind === 'DEBIT' ? 'Tăng' : 'Giảm'} · {line.name} · {line.quantity}{' '}
                {line.unit} × {formatVnd(line.unitPriceVnd)} ={' '}
                {formatVnd(line.quantity * line.unitPriceVnd)}
                {line.reason ? ` · ${line.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {review?.state === 'AWAITING_APPROVAL' ? (
        <>
          <p className={cx.note}>
            Hãy kiểm tra toàn bộ số lượng, đơn giá và lý do. Xác nhận áp dụng cho đúng bảng đang
            hiển thị; thay đổi nội dung sẽ cần duyệt lại.
          </p>
          <button className={cx.button} disabled={pending} onClick={() => void decide('APPROVE')}>
            {pending
              ? 'Đang xử lý…'
              : adjustment
                ? 'Duyệt toàn bộ điều chỉnh'
                : 'Duyệt toàn bộ chi phí phát sinh'}
          </button>
          <label>
            Lý do yêu cầu chỉnh sửa
            <textarea
              className="w-full rounded-lg border border-input bg-card p-3"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className={cx.buttonOutline}
            disabled={pending || !reason.trim()}
            onClick={() => void decide('REQUEST_CHANGES')}
          >
            Yêu cầu chỉnh sửa
          </button>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {expenses.reviewHistory.length ? (
        <details>
          <summary>Lịch sử gửi và duyệt</summary>
          <ul>
            {expenses.reviewHistory.map((r) => (
              <li key={r.id}>
                Bản {r.revisionNumber} · {states[r.state]} · Nhà hàng gửi{' '}
                {formatDateTime(r.managerApprovedAt)}
                {r.coupleApprovedAt ? ` · Hai bạn duyệt ${formatDateTime(r.coupleApprovedAt)}` : ''}
                {r.decisionReason ? ` · ${r.decisionReason}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
