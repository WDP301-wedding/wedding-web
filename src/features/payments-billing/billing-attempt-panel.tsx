'use client';

import { Celebrate } from '../../design-system/celebrate';
import type { AttemptView } from './billing-api';
import { AttemptStatus } from './billing-display';

export function BillingAttemptPanel({
  embedded,
  attemptId,
  setAttemptId,
  pending,
  intentActive,
  checkoutActive,
  attempt,
  onCheckStatus,
}: {
  embedded: boolean;
  attemptId: string;
  setAttemptId: (value: string) => void;
  pending: boolean;
  intentActive: boolean;
  checkoutActive: boolean;
  attempt: AttemptView | null;
  onCheckStatus: () => void;
}) {
  if (embedded && attemptId === '') return null;

  return (
    <section className="billing-panel" id="billing-attempt-status">
      <h2>Trạng thái thanh toán</h2>
      <form
        className="billing-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          onCheckStatus();
        }}
      >
        {embedded ? (
          <p className="billing-attempt-note">
            Giao dịch gần nhất của hai bạn. Bấm để hỏi lại trạng thái mới nhất từ nhà hàng. VNPay
            giới hạn mỗi lần kiểm tra cách nhau khoảng 5 phút. Nếu kết quả chưa rõ, hãy chờ rồi kiểm
            tra lại giao dịch này.
          </p>
        ) : (
          <label>
            Mã giao dịch thanh toán
            <input
              required
              value={attemptId}
              disabled={pending || intentActive}
              readOnly={checkoutActive || (intentActive && attemptId !== '')}
              onChange={(event) => setAttemptId(event.target.value)}
            />
          </label>
        )}
        <button disabled={pending || intentActive}>Kiểm tra trạng thái</button>
      </form>
      {attempt !== null && <AttemptStatus attempt={attempt} />}
      {attempt?.status === 'SUCCEEDED' && attempt.applicationStatus === 'SUCCEEDED' ? (
        <Celebrate onceKey={'payment-' + attempt.paymentAttemptId} />
      ) : null}
    </section>
  );
}
