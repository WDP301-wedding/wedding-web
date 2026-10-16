/**
 * Nội dung tĩnh của trang công khai mà backend CHƯA có API (Ưu đãi, Câu hỏi thường gặp).
 * Sửa trực tiếp file này; khi backend có API thì thay bằng dữ liệu thật.
 *
 * Ưu đãi để trống mặc định: prototype có 3 ưu đãi mẫu, nhưng đăng khuyến mãi không có thật lên
 * web là sai sự thật với khách. Khi nhà hàng xác nhận ưu đãi, thêm vào mảng `offers` — mục
 * "Ưu đãi" trên trang chủ và menu sẽ tự hiện.
 */
export type Offer = Readonly<{ tag: string; title: string; detail: string; until: string }>;

export const offers: readonly Offer[] = [];

/** Câu trả lời khớp nghiệp vụ hiện tại của backend (cọc 30%, khách không cần xác nhận tham dự). */
export const faqs: readonly Readonly<{ question: string; answer: string }>[] = [
  {
    question: 'Gửi yêu cầu tư vấn có giữ chỗ không?',
    answer:
      'Không. Yêu cầu tư vấn chỉ giúp quản lý tiệc liên hệ bạn. Ngày và sảnh chỉ được giữ khi nhà hàng tạo hồ sơ tiệc và bạn đặt cọc.',
  },
  {
    question: 'Ước tính chi phí có chính xác không?',
    answer:
      'Ước tính tính theo số bàn (số khách ÷ 10, làm tròn lên) nhân giá thực đơn. Chưa gồm dịch vụ, đồ in và VAT; giá chốt theo hợp đồng.',
  },
  {
    question: 'Đặt cọc bao nhiêu và trả thế nào?',
    answer:
      'Tiền cọc là 30% tổng hợp đồng, thanh toán qua VNPay trong Không gian cưới sau khi hai bên duyệt hợp đồng.',
  },
  {
    question: 'Có cần nhập danh sách tên khách không?',
    answer:
      'Không bắt buộc. Bạn chỉ cần số khách dự kiến và các nhóm khách; danh sách tên là tuỳ chọn.',
  },
  {
    question: 'Khách mời có cần xác nhận tham dự không?',
    answer:
      'Không. Thiệp online chỉ để khách xem thông tin tiệc (ngày, giờ, sảnh), không có bước xác nhận tham dự.',
  },
];

export const weddingSteps: readonly Readonly<{ title: string; detail: string }>[] = [
  {
    title: 'Tư vấn',
    detail: 'Gửi yêu cầu, quản lý tiệc gọi lại và hẹn bạn xem sảnh.',
  },
  {
    title: 'Hợp đồng & cọc',
    detail:
      'Nhà hàng mở hồ sơ, mời bạn vào Không gian cưới để duyệt kịch bản, hợp đồng và đặt cọc 30% qua VNPay.',
  },
  {
    title: 'Chuẩn bị',
    detail: 'Nhập số khách theo nhóm, xếp sơ đồ bàn, thiết kế thiệp và đặt in.',
  },
  {
    title: 'Ngày cưới',
    detail: 'Nhà hàng vận hành tiệc theo kịch bản hai bên đã duyệt; quyết toán sau tiệc.',
  },
];
