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
  IDEMPOTENCY_KEY_REUSED:
    'Yêu cầu bị trùng với một thao tác trước có nội dung khác. Hãy tải lại trang.',
  REQUEST_IN_PROGRESS: 'Yêu cầu trước đang được xử lý. Hãy đợi vài giây rồi thử lại.',
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Hãy kiểm tra lại các trường.',
  // Hợp đồng & cọc
  COUPLE_NAMES_INCOMPLETE: 'Cần nhập đủ tên cô dâu và chú rể trước khi gửi duyệt hợp đồng.',
  COMMERCIAL_PRICE_REVISION_STALE:
    'Giá trong danh mục vừa thay đổi. Hãy tải lại và chọn lại món, dịch vụ hoặc mẫu in.',
  OFFERING_NOT_SELECTABLE: 'Một lựa chọn không còn được bán. Hãy chọn lại.',
  CONTRACT_REVISION_STALE:
    'Hợp đồng vừa được cập nhật ở nơi khác. Hãy tải lại để xem bản mới nhất.',
  COMMERCIAL_PREDECESSOR_STALE: 'Thoả thuận đã có bản mới hơn. Hãy tải lại trước khi tiếp tục.',
  CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng cần được cả hai bên duyệt trước.',
  CONTRACT_DISTINCT_APPROVERS_REQUIRED: 'Mỗi bên chỉ duyệt một lần; cần bên còn lại duyệt.',
  CONTRACT_NOT_EDITABLE: 'Hợp đồng không còn sửa được ở trạng thái hiện tại.',
  CONTRACT_CAPACITY_EXCEEDED: 'Số bàn hoặc số khách vượt sức chứa của sảnh.',
  COMMERCIAL_AMOUNT_OVERFLOW: 'Tổng tiền vượt giới hạn cho phép. Hãy giảm số lượng.',
  DEPOSIT_INTENT_ACTIVE:
    'Đang có giao dịch đặt cọc chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  PAYMENT_ATTEMPT_ACTIVE: 'Đang có giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái thanh toán.',
  CONTRACT_PRINT_SOURCE_ALLOCATED: 'Mẫu in này đã được đưa vào sản xuất nên không thể bỏ hoặc đổi.',
  CONTRACT_PRINT_QUANTITY_ALLOCATED: 'Không thể giảm số lượng in đã đưa vào sản xuất.',
  // Hoá đơn
  EVENT_NOT_ENDED: 'Tiệc chưa kết thúc.',
  INVOICE_FINALIZED: 'Hoá đơn đã được chốt.',
  STALE_BILLING_REVISION: 'Số dư vừa thay đổi. Hãy tải lại trước khi thanh toán.',
  // Khách & sơ đồ
  GUEST_GROUP_IN_USE: 'Nhóm còn khách đang hoạt động. Hãy chuyển hoặc lưu trữ các khách đó trước.',
  // Các mã dưới đây trước đây rơi về câu chung "Dữ liệu vừa thay đổi. Hãy tải lại" — sai hướng
  // dẫn: vd. trùng tên nhóm thì tải lại cũng không hết lỗi.
  GUEST_GROUP_NAME_CONFLICT: 'Đã có nhóm khác cùng tên. Hãy đặt tên khác.',
  GUEST_GROUP_QUOTA_EXCEEDED: 'Tiệc đã có tối đa 100 nhóm đang dùng. Hãy lưu trữ bớt nhóm trước.',
  GUEST_LIST_QUOTA_EXCEEDED: 'Danh sách đã đạt giới hạn 10.000 khách đang mời.',
  GUEST_NOT_FOUND: 'Không tìm thấy khách này — có thể đã được lưu trữ ở nơi khác. Hãy tải lại.',
  GUEST_REVISION_STALE:
    'Thông tin khách vừa được sửa ở nơi khác. Hãy tải lại để xem bản mới rồi sửa lại.',
  GUEST_GROUP_REVISION_STALE:
    'Nhóm vừa được sửa ở nơi khác. Hãy tải lại để xem bản mới rồi thao tác lại.',
  GUEST_PLAN_REVISION_STALE: 'Số khách dự kiến vừa được cập nhật ở nơi khác. Hãy tải lại.',
  HEADCOUNT_SOURCE_CONFLICT:
    'Số khách dự kiến đang lệch giữa các bộ phận. Hãy liên hệ nhà hàng để kiểm tra.',
  GUEST_IMPORT_PREVIEW_STALE:
    'Bản xem trước file đã cũ (danh sách vừa đổi hoặc quá hạn). Hãy chọn lại file để xem trước.',
  GUEST_IMPORT_ROW_CONFLICT:
    'Có dòng trong file trùng mã với khách đã nhập trước. Bật “Cho phép cập nhật khách đã nhập” hoặc đổi mã.',
  GUEST_LIST_CURSOR_STALE: 'Danh sách vừa thay đổi. Đang tải lại từ đầu.',
  INVITATION_CREDENTIAL_ALREADY_ISSUED:
    'Liên kết đã được cấp trong yêu cầu trước. Hãy dùng “Cấp lại liên kết” để tạo liên kết mới.',
  SEATING_PLAN_EXISTS: 'Tiệc đã có sơ đồ bàn.',
  SEATING_REVISION_STALE: 'Sơ đồ vừa được cập nhật. Hãy tải lại.',
  EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY:
    'Số khách dự kiến vượt số ghế của sơ đồ hoặc sức chứa của sảnh. Hãy chọn mẫu đủ chỗ hoặc liên hệ nhà hàng; không thể duyệt ngoại lệ vượt sức chứa thực tế.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE:
    'Số khách dự kiến nằm ngoài khoảng của mẫu sơ đồ. Chọn mẫu khác hoặc nhờ nhà hàng duyệt ngoại lệ.',
  LAYOUT_RETIRED: 'Mẫu sơ đồ đã ngừng sử dụng. Hãy chọn mẫu khác.',
  TABLE_NOT_IN_LAYOUT: 'Bàn không thuộc mẫu sơ đồ hiện tại.',
  GUEST_GROUP_UNAVAILABLE: 'Nhóm khách đã bị lưu trữ hoặc không còn tồn tại.',
  // Check-in
  NAMED_GUEST_LIST_REQUIRED: 'Cần ít nhất một khách có tên trước khi bật check-in theo tên.',
  CHECK_IN_CONFIGURATION_STALE: 'Cấu hình check-in vừa thay đổi. Hãy tải lại.',
  CHECK_IN_MODE_LOCKED: 'Đã có bản ghi check-in nên không thể tắt chế độ này.',
  // Ảnh, thiệp & in
  MEDIA_CUTOFF_REACHED:
    'Đã qua hạn chỉnh sửa ảnh của tiệc (72 giờ trước giờ tiệc, hoặc mốc nhà hàng đặt). Liên hệ nhà hàng nếu cần thay đổi.',
  MEDIA_DECODER_BUSY: 'Máy chủ đang xử lý nhiều ảnh. Hãy đợi vài giây rồi tải lên lại.',
  AI_GENERATION_PENDING: 'Ảnh AI trước vẫn đang được tạo. Hãy đợi xong rồi thử lại.',
  PRINT_ASSET_LIMIT:
    'Tổng dung lượng ảnh trên thiệp vượt giới hạn in. Hãy bớt ảnh hoặc dùng ảnh nhẹ hơn.',
  PRINT_CONTENT_OVERFLOW: 'Nội dung quá dài so với khổ in. Hãy rút gọn chữ trên thiệp/sơ đồ.',
  PRINTABLE_DIGEST_CONFLICT:
    'Bản thiết kế vừa thay đổi trong lúc tạo file in. Hãy tạo lại file in.',
  PRINTABLE_SEATING_DIGEST_CONFLICT:
    'Sơ đồ bàn đã có bản xác nhận mới hơn. Hãy tải lại rồi tạo file in theo bản mới.',
  CONTRACT_PRINT_SOURCE_CONFLICT:
    'Mẫu/giá in không còn khớp với hợp đồng. Hãy tải lại và chọn đúng mẫu in trong hợp đồng.',
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

export type FriendlyError = Readonly<{
  message: string;
  requestId: string | null;
  code: string | null;
}>;

export function describeApiError(
  error: unknown,
  overrides: Record<string, string> = {},
): FriendlyError {
  if (!(error instanceof ApiClientError)) {
    return {
      message:
        error instanceof Error && error.message ? error.message : 'Đã có lỗi không mong muốn.',
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
