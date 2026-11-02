'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { routes, withBooking } from '../../routes';
import { useCoupleWorkspace } from './use-couple-workspace';

const steps = [
  { href: routes.script, label: 'Kịch bản' },
  { href: routes.contract, label: 'Hợp đồng' },
] as const;

/**
 * Thanh 2 bước của "Thoả thuận" (Kịch bản → Hợp đồng). Đây là điều hướng giữa 2 trang con,
 * nên dùng <nav> + `aria-current="step"` thay vì tablist (mỗi bước là một URL riêng,
 * mở tab mới / chia sẻ link được).
 */
export function AgreementSteps() {
  const pathname = usePathname();
  const { bookingId, bookings, state } = useCoupleWorkspace();
  const summary = bookings.find((booking) => booking.bookingId === bookingId);
  const phase = state.status === 'ready' ? state.proposal.phase : summary?.phase;
  // Sau khi kịch bản được hai bên duyệt, phase rời DRAFT → bước 1 coi như xong.
  const scriptDone = phase !== undefined && phase !== 'DRAFT';
  const waitingCouple =
    summary !== undefined && summary.managerApproved && !summary.coupleApproved && !scriptDone;

  return (
    <nav className="mb-6" aria-label="Các bước thoả thuận">
      <ol className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {steps.map((step, index) => {
          const current = pathname === step.href;
          const done = index === 0 && scriptDone;
          const note =
            index === 0 ? (scriptDone ? 'Đã duyệt' : waitingCouple ? 'Chờ bạn duyệt' : null) : null;
          return (
            <li key={step.href}>
              <Link
                href={withBooking(step.href, bookingId)}
                className="flex min-h-12 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=step]:bg-card aria-[current=step]:font-semibold aria-[current=step]:text-foreground aria-[current=step]:shadow-hy-1"
                aria-current={current ? 'step' : undefined}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? 'bg-hy-success-bg text-hy-success'
                      : current
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-input'
                  }`}
                  aria-hidden="true"
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="flex flex-col leading-tight">
                  {step.label}
                  {note ? (
                    <small
                      className={`text-2xs ${waitingCouple && index === 0 ? 'font-semibold text-hy-warning' : 'text-muted-foreground'}`}
                    >
                      {note}
                    </small>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
