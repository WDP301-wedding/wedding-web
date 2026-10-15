/**
 * "Hành trình cưới" 6 bước (design system Hỷ Yến).
 *
 * Bước hiện tại suy ra từ `phase` của booking do backend trả về – component chỉ hiển thị,
 * không tự quyết định nghiệp vụ. Trạng thái luôn có chữ + icon, không chỉ dựa vào màu.
 */
export type BookingPhase = 'DRAFT' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const journeySteps = [
  'Tư vấn',
  'Hợp đồng',
  'Đặt cọc',
  'Chuẩn bị',
  'Ngày cưới',
  'Quyết toán',
] as const;

/** Vị trí bước hiện tại (0–5), hoặc -1 khi tiệc đã huỷ. */
export function journeyIndex(phase: BookingPhase, eventDate: string, today = new Date()): number {
  if (phase === 'CANCELLED') return -1;
  if (phase === 'DRAFT') return 1;
  if (phase === 'AWAITING_DEPOSIT') return 2;
  if (phase === 'COMPLETED') return 5;
  // CONFIRMED: đúng ngày cưới → "Ngày cưới", còn lại là giai đoạn chuẩn bị.
  const todayKey = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  return todayKey >= eventDate ? 4 : 3;
}

export function JourneyStepper({ current }: { current: number }) {
  const progress = current < 0 ? 0 : (current / (journeySteps.length - 1)) * 100;
  return (
    <div className="hy-journey">
      <div className="hy-journey-track" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <ol>
        {journeySteps.map((label, index) => {
          const state =
            current < 0
              ? 'todo'
              : index < current
                ? 'done'
                : index === current
                  ? 'current'
                  : 'todo';
          return (
            <li
              key={label}
              className={'hy-step hy-step-' + state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className="hy-step-dot" aria-hidden="true">
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span className="hy-step-label">{label}</span>
              <span className="visually-hidden">
                {state === 'done' ? ' – đã xong' : state === 'current' ? ' – đang ở bước này' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
