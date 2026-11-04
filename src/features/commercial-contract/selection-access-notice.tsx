'use client';
import Link from 'next/link';
import type { SelectionAccess } from './selection-wire';
import { routes, withBooking } from '../../routes';
import { cx } from './contract-classes';

export const selectionBlockMessages: Record<NonNullable<SelectionAccess['blockReason']>, string> = {
  NOT_CUSTOMER:
    'Lựa chọn ban đầu do khách hàng thực hiện. Nhà hàng cập nhật nội dung tại phần hợp đồng.',
  BOOKING_NOT_EDITABLE:
    'Hồ sơ không còn ở bước chỉnh sửa lựa chọn. Nhà hàng cần kiểm tra tiến trình và thỏa thuận hiện tại trước khi mở lại.',
  BOOKING_CLOSED: 'Tiệc đã kết thúc hoặc bị hủy. Lựa chọn ban đầu được giữ lại để đối chiếu.',
  CUSTOMER_SELECTION_SUBMITTED:
    'Bạn đã gửi lựa chọn. Nhà hàng đang tiếp nhận để soạn hợp đồng; bạn không cần nhập lại. Nếu muốn đổi, hãy liên hệ nhà hàng.',
  CONTRACT_DRAFT_EXISTS:
    'Nhà hàng đã soạn hợp đồng. Xem nội dung và chi phí bên dưới; nhà hàng sẽ cập nhật nếu hai bạn cần thay đổi.',
  CONTRACT_APPROVED:
    'Nội dung đã được chốt theo tiến trình tiệc. Xem hợp đồng hiện tại hoặc liên hệ nhà hàng để xử lí thay đổi đúng phiên bản.',
  DEPOSIT_SETTLED:
    'Tiệc đã có thanh toán được xác nhận. Lựa chọn ban đầu không còn chỉnh sửa; thay đổi tiếp theo phải theo thỏa thuận và chứng từ hiện hành.',
  DEPOSIT_IN_PROGRESS:
    'Đang có giao dịch đặt cọc chưa hoàn tất. Lựa chọn tạm khóa; hãy xem trạng thái trong Thanh toán & công nợ.',
  PAYMENT_OUTCOME_UNKNOWN:
    'Kết quả giao dịch cọc chưa được xác định. Hãy kiểm tra tại Thanh toán & công nợ trước khi thay đổi nội dung hoặc tạo giao dịch khác.',
  LEGACY_COMMERCIAL_CONVERSION_BLOCKED:
    'Tiệc đang dùng thỏa thuận cũ và đã có chứng từ tài chính hoặc giao dịch cọc. Nhà hàng cần đối soát trước; không thể tự chuyển sang hợp đồng mới.',
  FINANCIAL_REVIEW_REQUIRED:
    'Hồ sơ đã có chứng từ tài chính cần được đối soát với nội dung hiện tại. Nhà hàng cần kiểm tra trước khi mở lại lựa chọn.',
};
export function SelectionAccessNotice({
  access,
  bookingId,
  onRefresh,
  hideNavigation = false,
}: Readonly<{
  access?: SelectionAccess | undefined;
  bookingId: string;
  onRefresh: () => void;
  hideNavigation?: boolean;
}>) {
  if (access?.canEdit) return null;
  const links = {
    VIEW_CONTRACT: { href: routes.contract + '#contract-heading', label: 'Xem hợp đồng' },
    VIEW_PAYMENTS: { href: routes.payment, label: 'Xem giao dịch & công nợ' },
    VIEW_APPENDICES: { href: routes.addendum, label: 'Xem phụ lục hợp đồng' },
    CONTACT_RESTAURANT: { href: routes.space, label: 'Xem thông tin liên hệ nhà hàng' },
    VIEW_BOOKING: { href: routes.space, label: 'Xem tổng quan tiệc' },
    EDIT_SELECTIONS: null,
    WAIT_FOR_RESTAURANT: null,
  } as const;
  const link = access ? links[access.nextAction] : null;
  return (
    <aside className={cx.accessNotice} aria-label="Trạng thái chỉnh sửa lựa chọn">
      <p role="status">
        {access?.blockReason
          ? selectionBlockMessages[access.blockReason]
          : 'Chưa nhận đủ trạng thái chỉnh sửa từ máy chủ. Thông tin đang được giữ ở chế độ xem; hãy cập nhật trạng thái hoặc liên hệ nhà hàng.'}
      </p>
      {hideNavigation ? (
        <p>
          Các thay đổi chưa lưu vẫn được giữ trên màn hình. Cập nhật hồ sơ sẽ cần bỏ các thay đổi
          này.
        </p>
      ) : null}
      <div className={cx.actions}>
        {link && !hideNavigation ? (
          <Link
            className={cx.buttonOutline}
            href={withBooking(link.href, bookingId)}
            onClick={(event) => {
              if (link.href.includes('#')) {
                const targetId = link.href.split('#')[1];
                const targetElement = targetId ? document.getElementById(targetId) : null;
                if (targetElement) {
                  event.preventDefault();
                  targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  window.history.replaceState(null, '', withBooking(link.href, bookingId));
                }
              }
            }}
          >
            {link.label}
          </Link>
        ) : null}
        <button className={cx.buttonOutline} type="button" onClick={onRefresh}>
          Cập nhật trạng thái hồ sơ
        </button>
      </div>
    </aside>
  );
}
