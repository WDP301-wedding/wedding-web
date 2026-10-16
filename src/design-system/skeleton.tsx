/**
 * Khung chờ dạng skeleton (design system Hỷ Yến: shimmer 1,2s/chu kỳ, dừng khi có dữ liệu).
 *
 * Vì sao vẫn giữ câu chữ: skeleton chỉ là hình. Người dùng trình đọc màn hình (và test) cần biết
 * trang đang tải, nên câu `label` vẫn nằm trong vùng `role="status"`, chỉ ẩn khỏi mắt.
 * `variant` chọn hình gần giống nội dung thật để khi dữ liệu về, bố cục không bị nhảy.
 */
type Variant = 'page' | 'list' | 'card';

const shapes: Record<Variant, readonly string[]> = {
  page: ['title', 'line', 'card', 'card'],
  list: ['row', 'row', 'row', 'row', 'row'],
  card: ['title', 'line', 'line'],
};

export function Skeleton({ label, variant = 'page' }: { label: string; variant?: Variant }) {
  return (
    <div className={'hy-skeleton hy-skeleton-' + variant} role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {shapes[variant].map((shape, index) => (
        <span key={index} className={'hy-skel hy-skel-' + shape} aria-hidden="true" />
      ))}
    </div>
  );
}
