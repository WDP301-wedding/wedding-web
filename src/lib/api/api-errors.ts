import { ApiClientError } from './client';

/**
 * Chuyển lỗi API thành câu tiếng Việt cho người dùng.
 *
 * Nguyên tắc (theo hand-off backend): xử lý theo `error.code`, KHÔNG dựa vào `message`
 * (message của backend chỉ để minh hoạ, có thể đổi bất kỳ lúc nào). Luôn kèm `requestId`
 * để khi báo lỗi cho nhóm backend, họ tra log được ngay.
 */
const codeMessages: Record<string, string> = {
  // Chung
  AUTHENTICATION_REQUIRED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu bị trùng với một thao tác trước có nội dung khác. Hãy tải lại trang.',
  REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý. Hãy đợi vài giây rồi thử lại.',
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại các trường.',
  // Hợp đồng & cọc
  COUPLE_NAMES_INCOMPLETE: 'Cần nhập đủ tên cô dâu và chú rể trước khi gửi duyệt hợp đồng.',
  COMMERCIAL_PRICE_REVISION_STALE:
    'Giá trong danh mục vừa thay đổi. Hãy tải lại và chọn lại món, dịch vụ hoặc mẫu in.',
  OFFERING_NOT_SELECTABLE: 'Một lựa chọn không còn được bán. Hãy chọn lại.',
  CONTRACT_REVISION_STALE: 'Hợp đồng vừa được cập nhật ở nơi khác. Hãy tải lại để xem bản mới nhất.',
  COMMERCIAL_PREDECESSOR_STALE: 'Thoả thuận đã có bản mới hơn. Hãy tải lại trước khi tiếp tục.',
  CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng cần được cả hai bên duyệt trước.',
  CONTRACT_DISTINCT_APPROVERS_REQUIRED: 'Mỗi bên chỉ duyệt một lần; cần bên còn lại duyệt.',
  CONTRACT_NOT_EDITABLE: 'Hợp đồng không còn sửa được ở trạng thái hiện tại.',
  CONTRACT_CAPACITY_EXCEEDED: 'Số bàn hoặc số khách vượt sức chứa của sảnh.',
  COMMERCIAL_AMOUNT_OVERFLOW: 'Tổng tiền vượt giới hạn cho phép. Hãy giảm số lượng.',
  DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch đặt cọc chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  PAYMENT_ATTEMPT_ACTIVE: 'Đang có giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  CONTRACT_PRINT_SOURCE_ALLOCATED: 'Mẫu in này đã được đưa vào sản xuất nên không thể bỏ hoặc đổi.',
  CONTRACT_PRINT_QUANTITY_ALLOCATED: 'Không thể giảm số lượng in đã đưa vào sản xuất.',
  // Hoá đơn
  EVENT_NOT_ENDED: 'Tiệc chưa kết thúc.',
  INVOICE_FINALIZED: 'Hoá đơn đã được chốt.',
  STALE_BILLING_REVISION: 'Số dư vừa thay đổi. Hãy tải lại trước khi thanh toán.',
  // Khách & sơ đồ
  GUEST_GROUP_IN_USE: 'Nhóm còn khách đang hoạt động. Hãy chuyển hoặc lưu trữ các khách đó trước.',
  GUEST_LIST_CURSOR_STALE: 'Danh sách vừa thay đổi. Đang tải lại từ đầu.',
  INVITATION_CREDENTIAL_ALREADY_ISSUED:
    'Liên kết đã được cấp trong yêu cầu trước. Hãy dùng “Cấp lại liên kết” để tạo liên kết mới.',
  SEATING_PLAN_EXISTS: 'Tiệc đã có sơ đồ bàn.',
  SEATING_REVISION_STALE: 'Sơ đồ vừa được cập nhật. Hãy tải lại.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số khách dự kiến nằm ngoài khoảng của mẫu sơ đồ. Chọn mẫu khác hoặc nhờ nhà hàng duyệt ngoại lệ.',
  LAYOUT_RETIRED: 'Mẫu sơ đồ đã ngừng sử dụng. Hãy chọn mẫu khác.',
  TABLE_NOT_IN_LAYOUT: 'Bàn không thuộc mẫu sơ đồ hiện tại.',
  GUEST_GROUP_UNAVAILABLE: 'Nhóm khách đã bị lưu trữ hoặc không còn tồn tại.',
  // Check-in
  NAMED_GUEST_LIST_REQUIRED: 'Cần ít nhất một khách có tên trước khi bật check-in theo tên.',
  CHECK_IN_CONFIGURATION_STALE: 'Cấu hình check-in vừa thay đổi. Hãy tải lại.',
  CHECK_IN_MODE_LOCKED: 'Đã có bản ghi check-in nên không thể tắt chế độ này.',
  // Ảnh
  MEDIA_CUTOFF_REACHED: 'Đã quá hạn chỉnh sửa ảnh.',
  // Thông báo
  NOTIFICATION_REVISION_STALE: 'Thông báo vừa thay đổi. Hãy tải lại.',
};

const statusMessages: Record<number, string> = {
  401: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  403: 'Bạn chưa có quyền thực hiện thao tác này ở giai đoạn hiện tại.',
  404: 'Không tìm thấy dữ liệu, hoặc dữ liệu không thuộc tiệc của bạn.',
  409: 'Dữ liệu vừa thay đổi. Hãy tải lại rồi thử lại.',
  422: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại các trường.',
  429: 'Bạn thao tác quá nhanh. Hãy đợi một lát rồi thử lại.',
  503: 'Chức năng tạm thời chưa sẵn sàng. Hãy thử lại sau.',
};

export type FriendlyError = Readonly<{ message: string; requestId: string | null; code: string | null }>;

export function describeApiError(error: unknown, overrides: Record<string, string> = {}): FriendlyError {
  if (!(error instanceof ApiClientError)) {
    return {
      message: error instanceof Error && error.message ? error.message : 'Đã có lỗi không mong muốn.',
      requestId: null,
      code: null,
    };
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return {
      message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại (thao tác sẽ không bị lặp).',
      requestId: error.requestId,
      code: error.code,
    };
  }
  const message =
    overrides[error.code] ??
    codeMessages[error.code] ??
    (error.status !== undefined ? statusMessages[error.status] : undefined) ??
    'Máy chủ từ chối yêu cầu.';
  // Lỗi 422 có danh sách lỗi theo trường: nối vào để người dùng biết sửa ở đâu.
  const fieldHints =
    error.status === 422 && error.details?.length
      ? ' (' + error.details.map((detail) => detail.path || detail.code).join(', ') + ')'
      : '';
  return { message: message + fieldHints, requestId: error.requestId, code: error.code };
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 409;
}
