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
  _summary: BookingSummary | undefined,
  /** Số ngày tới tiệc (âm = đã qua). Mặc định coi như chưa tới để giữ hành vi cũ. */
  days = 1,
  financialStatus: SettlementStatus = 'unknown',
): Task[] {
  const id = proposal.bookingId;
  const timeline = proposal.effectiveTimeline;
  if (days < 0 && (proposal.phase === 'DRAFT' || proposal.phase === 'AWAITING_DEPOSIT')) {
    return [
      {
        title: 'Hồ sơ đã quá ngày tổ chức',
        detail:
          'Ngày tổ chức dự kiến đã qua nhưng tiệc chưa hoàn tất đặt cọc. Hai bạn vui lòng liên hệ nhà hàng để cập nhật ngày mới hoặc đóng hồ sơ.',
        href: null,
        action: '',
        status: 'info',
      },
    ];
  }
  switch (proposal.phase) {
    case 'DRAFT': {
      const currentTimeline = proposal.timeline ?? timeline;
      if (!currentTimeline)
        return [
          {
            title: 'Chờ nhà hàng gửi kịch bản',
            detail: 'Nhà hàng đang chuẩn bị kịch bản cho tiệc của hai bạn.',
            href: withBooking(routes.script, id),
            action: 'Xem kịch bản',
            status: 'info',
          },
        ];
      if (!currentTimeline.coupleApprovedAt)
        return [
          {
            title: 'Duyệt kịch bản phiên bản ' + currentTimeline.revisionNumber,
            detail: currentTimeline.managerApprovedAt
              ? 'Nhà hàng đã duyệt. Hai bạn kiểm tra và xác nhận cùng phiên bản.'
              : 'Xem các mốc chương trình và xác nhận kịch bản.',
            href: withBooking(routes.script, id),
            action: 'Xem kịch bản',
            status: 'wait',
          },
        ];
      if (!currentTimeline.managerApprovedAt)
        return [
          {
            title: 'Chờ nhà hàng duyệt kịch bản',
            detail: 'Hai bạn đã duyệt phiên bản hiện tại. Đang chờ nhà hàng xác nhận.',
            href: withBooking(routes.script, id),
            action: 'Xem kịch bản',
            status: 'info',
          },
        ];
      const progress = proposal.commercialProgress;
      if (!progress)
        return [
          {
            title: 'Kiểm tra hợp đồng và thỏa thuận',
            detail: 'Kịch bản đã được hai bên duyệt. Xem trạng thái hợp đồng trước khi đặt cọc.',
            href: withBooking(routes.contract, id),
            action: 'Xem hợp đồng',
            status: 'info',
          },
        ];
      if (progress.modelVersion === 'FULL_CONTRACT_V1') {
        if (progress.contractState === 'APPROVED' && progress.timelineMatchesContract) {
          return [
            {
              title: 'Đặt cọc ' + formatVnd(proposal.proposal.depositAmountVnd),
              detail:
                'Hợp đồng và kịch bản hiện tại đã được hai bên duyệt. Kiểm tra chi tiết trước khi thanh toán.',
              href: withBooking(routes.payment, id),
              action: 'Đi tới Thanh toán',
              status: 'wait',
            },
          ];
        }
        if (progress.contractState === 'AWAITING_APPROVAL')
          return [
            {
              title: progress.coupleApproved
                ? 'Chờ nhà hàng duyệt hợp đồng'
                : 'Xem và duyệt hợp đồng',
              detail: progress.coupleApproved
                ? 'Hai bạn đã duyệt. Đang chờ nhà hàng xác nhận cùng phiên bản.'
                : 'Kiểm tra hạng mục, số lượng, giá và khoản cọc trước khi xác nhận.',
              href: withBooking(routes.contract, id),
              action: 'Xem hợp đồng',
              status: progress.coupleApproved ? 'info' : 'wait',
            },
          ];
        if (progress.contractState || progress.selectionStatus === 'SUBMITTED')
          return [
            {
              title: 'Chờ nhà hàng hoàn thiện hợp đồng',
              detail:
                'Lựa chọn đã gửi. Nhà hàng cần hoàn thiện và gửi đúng phiên bản hợp đồng để hai bên duyệt.',
              href: withBooking(routes.contract, id),
              action: 'Xem hợp đồng',
              status: 'info',
            },
          ];
        return [
          {
            title: 'Chốt lựa chọn hợp đồng',
            detail: 'Chọn thực đơn và dịch vụ, lưu nháp rồi gửi lựa chọn cho nhà hàng.',
            href: withBooking(routes.contract, id),
            action: 'Xem hạng mục',
            status: 'wait',
          },
        ];
      }
      return [
        {
          title: 'Đặt cọc ' + formatVnd(proposal.proposal.depositAmountVnd),
          detail:
            'Kịch bản đã được hai bên duyệt. Xem thỏa thuận và chi tiết khoản cọc trước khi thanh toán.',
          href: withBooking(routes.payment, id),
          action: 'Đi tới Thanh toán',
          status: 'wait',
        },
      ];
    }
    case 'AWAITING_DEPOSIT': {
      const progress = proposal.commercialProgress;
      if (progress && progress.modelVersion === 'FULL_CONTRACT_V1') {
        if (progress.contractState === 'APPROVED' && progress.timelineMatchesContract) {
          return [
            {
              title: 'Đặt cọc ' + formatVnd(proposal.proposal.depositAmountVnd),
              detail:
                'Hợp đồng và kịch bản hiện tại đã được hai bên duyệt. Kiểm tra chi tiết trước khi thanh toán.',
              href: withBooking(routes.payment, id),
              action: 'Đi tới Thanh toán',
              status: 'wait',
            },
          ];
        }
        if (progress.contractState === 'AWAITING_APPROVAL')
          return [
            {
              title: progress.coupleApproved
                ? 'Chờ nhà hàng duyệt hợp đồng'
                : 'Xem và duyệt hợp đồng',
              detail: progress.coupleApproved
                ? 'Hai bạn đã duyệt. Đang chờ nhà hàng xác nhận cùng phiên bản.'
                : 'Kiểm tra hạng mục, số lượng, giá và khoản cọc trước khi xác nhận.',
              href: withBooking(routes.contract, id),
              action: 'Xem hợp đồng',
              status: progress.coupleApproved ? 'info' : 'wait',
            },
          ];
      }
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
          detail: 'Tiền cọc theo tỷ lệ đã chốt trong hợp đồng, thanh toán qua VNPay.',
          href: withBooking(routes.payment, id),
          action: 'Đi tới Thanh toán',
          status: 'wait',
        },
      ];
    }
    case 'CONFIRMED': {
      const settlementTasks = [settlementTask(id, financialStatus)];
      if (days < 0) return settlementTasks;
      return [
        ...settlementTasks,
        {
          title: 'Số khách & nhóm khách',
          detail: 'Chốt số khách dự kiến và chia nhóm để xếp bàn.',
          href: withBooking(routes.guests, id),
          action: 'Mở quy mô & nhóm',
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
