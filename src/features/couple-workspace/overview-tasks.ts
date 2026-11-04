import { routes, withBooking } from '../../routes';
import { settlementLabels, type SettlementStatus } from '../settlement/settlement-status';
import { formatVnd, type BookingSummary, type Proposal } from './use-couple-workspace';

/** Số ngày còn lại tới ngày cưới, tính theo lịch Việt Nam (không phụ thuộc múi giờ máy). */
export function daysUntil(eventDate: string, now = new Date()): number {
  const today = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const diff = Date.parse(`${eventDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(diff / 86_400_000);
}

export type Task = Readonly<{
  title: string;
  detail: string;
  href: string | null;
  action: string;
  status: 'wait' | 'info' | 'done';
}>;

/**
 * "Việc cần làm ngay" suy ra từ phase + cờ duyệt do backend trả về. Đặt thành hàm thuần
 * (không gọi API, không đọc state) để dễ test và để mọi logic nghiệp vụ nằm một chỗ.
 */
export function nextTasks(
  proposal: Proposal,
  summary: BookingSummary | undefined,
  /** Số ngày tới tiệc (âm = đã qua). Mặc định coi như chưa tới để giữ hành vi cũ. */
  days = 1,
  financialStatus: SettlementStatus = 'unknown',
): Task[] {
  const id = proposal.bookingId;
  const timeline = proposal.effectiveTimeline;
  switch (proposal.phase) {
    case 'DRAFT': {
      if (!summary?.hasTimeline && !timeline)
        return [
          {
            title: 'Chờ nhà hàng gửi kịch bản',
            detail: 'Quản lý tiệc đang soạn kịch bản đầu tiên cho tiệc của hai bạn.',
            href: withBooking(routes.script, id),
            action: 'Xem đề xuất',
            status: 'info',
          },
        ];
      const version = timeline ? ` phiên bản ${timeline.revisionNumber}` : '';
      if (summary && !summary.coupleApproved)
        return [
          {
            title: `Duyệt kịch bản${version}`,
            detail: summary.managerApproved
              ? 'Nhà hàng đã duyệt. Hai bạn xem lại các mốc rồi xác nhận.'
              : 'Xem lại các mốc, có thể đề xuất chỉnh sửa trước khi duyệt.',
            href: withBooking(routes.script, id),
            action: 'Xem kịch bản',
            status: 'wait',
          },
          {
            title: 'Điền tên cô dâu chú rể',
            detail: 'Tên dùng cho hợp đồng và thiệp cưới.',
            href: withBooking(routes.contract, id),
            action: 'Nhập tên',
            status: 'info',
          },
        ];
      return [
        {
          title: 'Chờ nhà hàng duyệt kịch bản',
          detail: 'Hai bạn đã duyệt. Khi nhà hàng duyệt, bước Hợp đồng sẽ mở.',
          href: withBooking(routes.script, id),
          action: 'Xem kịch bản',
          status: 'info',
        },
      ];
    }
    case 'AWAITING_DEPOSIT':
      return [
        {
          title: 'Duyệt hợp đồng',
          detail: 'Cần hai bên duyệt cùng một phiên bản trước khi đặt cọc.',
          href: withBooking(routes.contract, id),
          action: 'Xem hợp đồng',
          status: 'wait',
        },
        {
          title: `Đặt cọc ${formatVnd(proposal.proposal.depositAmountVnd)}`,
          detail: '30% tổng theo đề xuất, thanh toán qua VNPay.',
          href: withBooking(routes.payment, id),
          action: 'Đi tới Thanh toán',
          status: 'wait',
        },
      ];
    case 'CONFIRMED': {
      const settlementTasks = [settlementTask(id, financialStatus)];
      if (days < 0) return settlementTasks;
      return [
        ...settlementTasks,
        {
          title: 'Số khách & nhóm khách',
          detail: 'Chốt số khách dự kiến và chia nhóm để xếp bàn.',
          href: withBooking(routes.guests, id),
          action: 'Mở danh sách khách',
          status: 'info',
        },
        {
          title: 'Sơ đồ bàn',
          detail: 'Chọn mẫu sơ đồ và xếp nhóm khách vào bàn.',
          href: withBooking(routes.seating, id),
          action: 'Xếp sơ đồ',
          status: 'info',
        },
        {
          title: 'Thiệp cưới',
          detail: 'Chọn mẫu, xuất bản thiệp online và đặt in.',
          href: withBooking(routes.card, id),
          action: 'Mở Studio thiệp',
          status: 'info',
        },
      ];
    }
    case 'COMPLETED':
      return [settlementTask(id, financialStatus)];
    default:
      return [];
  }
}

function settlementTask(id: string, status: SettlementStatus): Task {
  return {
    title: settlementLabels[status],
    detail:
      status === 'settled'
        ? 'Hoá đơn cuối đã chốt và đã thanh toán đủ. Hai bạn có thể xem lại hoá đơn và giao dịch.'
        : status === 'outstanding'
          ? 'Hoá đơn cuối đã chốt. Xem công nợ và điều kiện thanh toán phần còn lại.'
          : status === 'credit'
            ? 'Liên hệ nhà hàng để xử lý khoản thanh toán thừa theo chứng từ.'
            : 'Xem hoá đơn cuối và công nợ mới nhất của tiệc.',
    href: withBooking(status === 'outstanding' ? routes.payment : routes.settle, id),
    action: status === 'settled' ? 'Xem hoá đơn & giao dịch' : 'Xem quyết toán',
    status: status === 'settled' ? 'done' : status === 'awaiting-invoice' ? 'wait' : 'info',
  };
}
