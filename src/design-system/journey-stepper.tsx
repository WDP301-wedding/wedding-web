import { Check } from 'lucide-react';

/**
 * "Hành trình cưới" 6 bước (design system Hỷ Yến).
 *
 * Bước hiện tại suy ra từ `phase` của booking do backend trả về – component chỉ hiển thị,
 * không tự quyết định nghiệp vụ. Trạng thái luôn có chữ + icon, không chỉ dựa vào màu.
 */
export type BookingPhase = 'DRAFT' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const journeySteps = [
  'Tư vấn',
  'Thoả thuận',
  'Đặt cọc',
  'Chuẩn bị',
  'Ngày cưới',
  'Quyết toán',
] as const;

/** Vị trí bước hiện tại (0–5), hoặc -1 khi tiệc đã huỷ hoặc quá hạn tổ chức. */
export function journeyIndex(phase: BookingPhase, eventDate: string, today = new Date()): number {
  if (phase === 'CANCELLED') return -1;
  const todayKey = today.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  if ((phase === 'DRAFT' || phase === 'AWAITING_DEPOSIT') && eventDate < todayKey) return -1;
  if (phase === 'DRAFT') return 1;
  if (phase === 'AWAITING_DEPOSIT') return 2;
  if (phase === 'COMPLETED') return 5;
  // CONFIRMED: đúng ngày cưới → "Ngày cưới", còn lại là giai đoạn chuẩn bị.
  return todayKey >= eventDate ? 4 : 3;
}

const bar = { done: 'bg-hy-success', current: 'bg-primary', todo: 'bg-border' };

export function JourneyStepper({
  current,
  completed = false,
}: {
  current: number;
  completed?: boolean;
}) {
  return (
    <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {journeySteps.map((label, index) => {
        const state =
          current < 0
            ? 'todo'
            : completed || index < current
              ? 'done'
              : index === current
                ? 'current'
                : 'todo';
        return (
          <li
            key={label}
            className="flex min-w-0 flex-col gap-2"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {/* Thanh từng bước lấp đầy lần lượt khi trang mở. */}
            <span
              className={`hy-grow-x h-1 rounded-full ${bar[state]}`}
              style={{ animationDelay: `${index * 60}ms` }}
              aria-hidden="true"
            />
            <span
              className={`flex items-center gap-1 text-xs ${state === 'todo' ? 'text-muted-foreground' : 'text-foreground'} ${state === 'current' ? 'font-bold' : 'font-medium'} ${state === 'current' ? '' : 'max-sm:sr-only'}`}
            >
              {state === 'done' ? (
                <Check className="size-3.5 shrink-0 text-hy-success" aria-hidden="true" />
              ) : null}
              <span className="truncate">{label}</span>
              <span className="sr-only">
                {state === 'done' ? ' – đã xong' : state === 'current' ? ' – đang ở bước này' : ''}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
