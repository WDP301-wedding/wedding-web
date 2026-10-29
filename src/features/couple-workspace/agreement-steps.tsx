'use client';

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
    <nav className="hy-steps" aria-label="Các bước thoả thuận">
      <ol>
        {steps.map((step, index) => {
          const current = pathname === step.href;
          const note =
            index === 0 ? (scriptDone ? 'Đã duyệt' : waitingCouple ? 'Chờ bạn duyệt' : null) : null;
          return (
            <li key={step.href}>
              <Link
                href={withBooking(step.href, bookingId)}
                className={current ? 'is-current' : undefined}
                aria-current={current ? 'step' : undefined}
              >
                <span className="hy-steps-index" aria-hidden="true">
                  {index === 0 && scriptDone ? '✓' : index + 1}
                </span>
                <span>
                  {step.label}
                  {note ? <small>{note}</small> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
