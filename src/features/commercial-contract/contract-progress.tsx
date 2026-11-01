import type { ContractList } from './contract-api';
import { currentRevision } from './contract-api';
import { cx } from './contract-classes';

export function ContractProgress({
  contracts,
  phase,
}: Readonly<{ contracts: ContractList; phase: string }>) {
  if (phase === 'CANCELLED')
    return (
      <p className={cx.note}>Tiệc đã hủy. Hợp đồng và lịch sử chi phí được giữ lại để đối chiếu.</p>
    );
  if (contracts.modelVersion === 'LEGACY_PROPOSAL_V1' && !contracts.selectionAccess?.canEdit)
    return null;
  const current = currentRevision(contracts);
  if (
    !current &&
    !contracts.selectionAccess?.canEdit &&
    contracts.selectionAccess?.blockReason !== 'CUSTOMER_SELECTION_SUBMITTED'
  )
    return null;
  const paid = ['CONFIRMED', 'COMPLETED'].includes(phase);
  const step =
    paid || current?.state === 'APPROVED'
      ? 3
      : current?.state === 'AWAITING_APPROVAL'
        ? 2
        : current || contracts.customerSelection?.status === 'SUBMITTED'
          ? 1
          : 0;
  const labels = [
    'Lựa chọn của bạn',
    'Nhà hàng soạn hợp đồng',
    'Hai bên duyệt',
    paid ? 'Đã xác nhận cọc' : 'Đặt cọc',
  ];
  return (
    <nav aria-label="Tiến trình hợp đồng">
      <ol className={cx.progress}>
        {labels.map((label, index) => {
          const done = index < step || paid;
          const current = index === step;
          return (
            <li
              key={index}
              className="flex min-w-0 flex-col gap-2"
              aria-current={current ? 'step' : undefined}
              data-complete={done}
            >
              <span
                className={`hy-grow-x h-1 rounded-full ${done ? 'bg-hy-success' : current ? 'bg-primary' : 'bg-border'}`}
                style={{ animationDelay: `${index * 60}ms` }}
                aria-hidden="true"
              />
              <strong
                className={`text-xs ${current ? 'font-bold text-foreground' : done ? 'font-medium text-hy-success' : 'font-medium text-muted-foreground'}`}
              >
                <span className="sr-only">Bước {index + 1}: </span>
                {label}
              </strong>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
