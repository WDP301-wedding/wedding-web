import type { IllustrationName } from '../design-system/illustrations';

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

/**
 * Câu hỏi thường gặp = câu đã khớp nghiệp vụ backend (cọc 30%, không cần xác nhận tham dự…) +
 * câu bổ sung từ nội dung nhà hàng cung cấp (assets/content.md, 22/10/2026).
 *
 * Quy tắc gộp: câu nào mâu thuẫn backend thì theo backend (vd. content.md ghi tiền cọc "theo báo
 * giá", backend cố định 30%). Số liệu do catalog quản lý (sức chứa sảnh, giá thực đơn) KHÔNG ghi
 * cứng ở đây mà trỏ tới trang Sảnh/Thực đơn — tránh lệch khi nhà hàng đổi giá trên catalog.
 */
export const faqs: readonly Readonly<{ question: string; answer: string }>[] = [
  {
    question: 'Tôi có thể xem sảnh trước khi đặt tiệc không?',
    answer:
      'Có. Bạn gửi yêu cầu tư vấn và chọn ngày mong muốn; quản lý tiệc sẽ liên hệ để hẹn lịch xem sảnh.',
  },
  {
    question: 'Gửi yêu cầu tư vấn có giữ chỗ không?',
    answer:
      'Không. Yêu cầu tư vấn chỉ giúp quản lý tiệc liên hệ bạn. Ngày và sảnh chỉ được giữ khi nhà hàng tạo hồ sơ tiệc và bạn đặt cọc.',
  },
  {
    question: 'Sảnh nào phù hợp với số lượng khách của tôi?',
    answer:
      'Mỗi sảnh có sức chứa tối đa riêng (xem trang Sảnh tiệc). Nhập số khách ở mục Ước tính trên trang chủ để được gợi ý sảnh đủ chỗ; quản lý tiệc sẽ tư vấn cách bố trí bàn phù hợp.',
  },
  {
    question: 'Nhà hàng có những khung giờ tổ chức nào?',
    // {ca-tiec} được thay bằng giờ ca thật từ catalog khi hiển thị (xem describeShifts).
    answer: 'Có {ca-tiec}. Lịch trống của từng ngày cụ thể được kiểm tra khi tư vấn.',
  },
  {
    question: 'Có yêu cầu số bàn tối thiểu không?',
    answer:
      'Hãy trao đổi số khách và số bàn dự kiến khi tư vấn để nhà hàng xác nhận điều kiện của sảnh và ca tiệc bạn chọn.',
  },
  {
    question: 'Các gói thực đơn khác nhau như thế nào?',
    answer:
      'Mỗi gói khác nhau ở số món và giá theo bàn 10 khách. Xem danh sách món và giá đang áp dụng ở trang Thực đơn; giá chốt cho tiệc của bạn ghi trong hợp đồng.',
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
    question: 'Nếu cần đổi ngày hoặc huỷ tiệc thì xử lý thế nào?',
    answer:
      'Hãy liên hệ nhà hàng hoặc gửi yêu cầu trong Không gian cưới. Nhà hàng kiểm tra lịch và điều kiện đổi/huỷ theo hợp đồng đã ký; chi phí phát sinh (nếu có) được xác nhận theo từng trường hợp.',
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
  {
    question: 'Tôi nên chuẩn bị gì trước buổi tư vấn?',
    answer:
      'Ngày dự kiến, ca tiệc, số khách, ngân sách và các mong muốn về thực đơn hoặc trang trí. Thời điểm và thời lượng tư vấn được hai bên thống nhất khi xác nhận lịch hẹn.',
  },
];

/** Giờ ca mặc định (assets/content.md) — chỉ dùng khi chưa tải được catalog nhà hàng. */
export const fallbackShifts = [
  { code: 'LUNCH', startTime: '10:00', endTime: '14:00' },
  { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
] as const;

type ShiftTime = Readonly<{ code: 'LUNCH' | 'DINNER'; startTime: string; endTime: string }>;

/** "ca trưa (10:00–14:00) và ca tối (17:00–22:00)" — nguồn: catalog, dự phòng: content.md. */
export function describeShifts(shifts: readonly ShiftTime[] | undefined): string {
  const list = shifts?.length ? shifts : fallbackShifts;
  return list
    .map(
      (shift) =>
        `${shift.code === 'LUNCH' ? 'ca trưa' : 'ca tối'} (${shift.startTime}–${shift.endTime})`,
    )
    .join(' và ');
}

/**
 * Lời giới thiệu ngắn cho mục "Khoảnh khắc" trên trang chủ (assets/content.md, phần Giới thiệu).
 * Chỉ giữ phần không phụ thuộc catalog; tên sảnh/sức chứa/thực đơn lấy từ backend.
 */
export const brandIntro =
  'Hỷ Yến là không gian tiệc cưới dành cho những cuộc sum họp ấm áp của gia đình và bạn bè. Không gian màu kem, ánh đèn pha lê và các chi tiết champagne tạo nên phông nền trang nhã cho ngày chung đôi.';

/** Ảnh "Khoảnh khắc tại Hỷ Yến" (public/images/khoanh-khac, 1600×893 WebP). */
export const moments: readonly Readonly<{ src: string; alt: string }>[] = [
  { src: '/images/khoanh-khac/co-dau-chu-re.webp', alt: 'Cô dâu chú rể tươi cười giữa sảnh tiệc' },
  { src: '/images/khoanh-khac/cha-dat-co-dau.webp', alt: 'Người cha dắt cô dâu vào lễ đường' },
  { src: '/images/khoanh-khac/tay-trong-tay.webp', alt: 'Bàn tay cô dâu chú rể đeo nhẫn cưới' },
  { src: '/images/khoanh-khac/cat-banh-cuoi.webp', alt: 'Cô dâu chú rể cắt bánh cưới' },
  { src: '/images/khoanh-khac/chu-re-phat-bieu.webp', alt: 'Chú rể phát biểu trên sân khấu' },
  { src: '/images/khoanh-khac/nang-ly-chuc-mung.webp', alt: 'Bạn bè nâng ly chúc mừng' },
  { src: '/images/khoanh-khac/gia-dinh-sum-hop.webp', alt: 'Gia đình sum họp quanh bàn tiệc' },
  { src: '/images/khoanh-khac/ba-cu-mim-cuoi.webp', alt: 'Bà cụ mỉm cười bên bàn tiệc' },
  { src: '/images/khoanh-khac/tre-em-vui-choi.webp', alt: 'Trẻ em vui chơi gần bàn tiệc' },
  { src: '/images/khoanh-khac/khach-du-tiec.webp', alt: 'Khách mời dùng tiệc trong sảnh' },
  {
    src: '/images/khoanh-khac/chuan-bi-ban-tiec.webp',
    alt: 'Người tổ chức kiểm tra bàn tiệc trước giờ đón khách',
  },
  { src: '/images/khoanh-khac/tiec-tan.webp', alt: 'Khách rời sảnh khi tiệc tàn' },
];

export const weddingSteps: readonly Readonly<{
  title: string;
  detail: string;
  /** Icon nét mảnh (assets/brand/icon-buoc-*), ghép theo nội dung từng bước. */
  icon: IllustrationName;
}>[] = [
  {
    icon: 'buoc-tu-van',
    title: 'Tư vấn',
    detail: 'Gửi yêu cầu, quản lý tiệc gọi lại và hẹn bạn xem sảnh.',
  },
  {
    icon: 'buoc-hop-dong',
    title: 'Hợp đồng & cọc',
    detail:
      'Nhà hàng mở hồ sơ, mời bạn vào Không gian cưới để duyệt kịch bản, hợp đồng và đặt cọc 30% qua VNPay.',
  },
  {
    icon: 'buoc-chuan-bi',
    title: 'Chuẩn bị',
    detail: 'Nhập số khách theo nhóm, xếp sơ đồ bàn, thiết kế thiệp và đặt in.',
  },
  {
    icon: 'buoc-ngay-cuoi',
    title: 'Ngày cưới',
    detail: 'Nhà hàng vận hành tiệc theo kịch bản hai bên đã duyệt; quyết toán sau tiệc.',
  },
];
