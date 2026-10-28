import { routes } from '../../routes';
import type { BookingSummary, Proposal } from './use-couple-workspace';
import type { IconName } from './space-icons';

export type Chip = Readonly<{ label: string; tone: 'wait' | 'lock' | 'done' | 'off' }>;

export type NavItem = Readonly<{
  id: string;
  label: string;
  href: string;
  icon: IconName;
  /** Các đường dẫn con được coi là "đang ở mục này". */
  match: string;
  children?: readonly { label: string; href: string }[];
}>;

export const mainNav: readonly NavItem[] = [
  { id: 'overview', label: 'Tổng quan', href: routes.space, icon: 'home', match: routes.space },
  {
    id: 'agreement',
    label: 'Thoả thuận',
    href: routes.script,
    icon: 'handshake',
    match: '/khong-gian/thoa-thuan',
    children: [
      { label: 'Kịch bản', href: routes.script },
      { label: 'Tên cô dâu chú rể', href: routes.names },
      { label: 'Hợp đồng', href: routes.contract },
    ],
  },
  {
    id: 'payment',
    label: 'Thanh toán',
    href: routes.payment,
    icon: 'wallet',
    match: '/khong-gian/thanh-toan',
  },
  {
    id: 'prepare',
    label: 'Chuẩn bị',
    href: routes.guests,
    icon: 'checklist',
    match: '/khong-gian/chuan-bi',
    children: [
      { label: 'Khách & sơ đồ', href: routes.guests },
      { label: 'Thiệp & in', href: routes.card },
      { label: 'Phụ lục', href: routes.addendum },
    ],
  },
  {
    id: 'settle',
    label: 'Quyết toán',
    href: routes.settle,
    icon: 'receipt',
    match: '/khong-gian/quyet-toan',
  },
];

/**
 * Chip trạng thái của từng mục sidebar, suy ra từ dữ liệu backend (không tự đoán nghiệp vụ):
 * - Thoả thuận "Chờ bạn": có kịch bản, nhà hàng đã duyệt, hai bạn chưa duyệt.
 * - Thanh toán "Cần đặt cọc": phase AWAITING_DEPOSIT.
 * - Chuẩn bị / Quyết toán khoá cho tới khi backend trả quyền FULL (sau cọc).
 */
export function navChips(
  summary: BookingSummary | undefined,
  proposal: Proposal | undefined,
): Record<string, Chip | undefined> {
  const phase = proposal?.phase ?? summary?.phase;
  if (!phase) return {};
  if (phase === 'CANCELLED')
    return {
      prepare: { label: 'Đã huỷ', tone: 'off' },
      settle: { label: 'Đã huỷ', tone: 'off' },
    };
  const full = (proposal?.capabilities.accessLevel ?? summary?.accessLevel) === 'FULL';
  const waitingCouple =
    summary !== undefined &&
    summary.hasTimeline &&
    summary.managerApproved &&
    !summary.coupleApproved &&
    phase === 'DRAFT';
  return {
    agreement: waitingCouple
      ? { label: 'Chờ bạn', tone: 'wait' }
      : phase === 'DRAFT'
        ? undefined
        : { label: 'Đã xong', tone: 'done' },
    payment: phase === 'AWAITING_DEPOSIT' ? { label: 'Cần đặt cọc', tone: 'wait' } : undefined,
    prepare: full ? undefined : { label: 'Mở sau đặt cọc', tone: 'lock' },
    settle: full ? undefined : { label: 'Mở sau đặt cọc', tone: 'lock' },
  };
}

export function isActive(pathname: string, item: NavItem): boolean {
  return item.match === routes.space ? pathname === routes.space : pathname.startsWith(item.match);
}
