import type { ContractList } from './contract-api';
import { currentRevision } from './contract-api';
import styles from './customer-selections.module.css';

export function ContractProgress({
  contracts,
  phase,
}: Readonly<{ contracts: ContractList; phase: string }>) {
  if (phase === 'CANCELLED')
    return (
      <p className="cw-note">Tiệc đã hủy. Hợp đồng và lịch sử chi phí được giữ lại để đối chiếu.</p>
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
      <ol className={styles.progress}>
        {labels.map((label, index) => (
          <li
            key={index}
            aria-current={index === step ? 'step' : undefined}
            data-complete={index < step || paid}
          >
            <span aria-hidden="true">{index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
    </nav>
  );
}
