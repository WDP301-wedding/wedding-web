import { cn } from 'cn';

/**
 * Khung chờ dạng skeleton (design system Hỷ Yến: shimmer 1,2s/chu kỳ, dừng khi có dữ liệu).
 *
 * Vì sao vẫn giữ câu chữ: skeleton chỉ là hình. Người dùng trình đọc màn hình (và test) cần biết
 * trang đang tải, nên câu `label` vẫn nằm trong vùng `role="status"`, chỉ ẩn khỏi mắt.
 * `variant` chọn hình gần giống nội dung thật để khi dữ liệu về, bố cục không bị nhảy.
 */
type Variant = 'page' | 'list' | 'card';

const bone =
  'block rounded-lg bg-[linear-gradient(90deg,#f3e8df_0%,#fbf4ee_40%,#f3e8df_80%)] bg-size-[200%_100%] animate-[hy-shimmer_1200ms_linear_infinite] motion-reduce:animate-none';
const sizes: Record<string, string> = {
  title: 'h-[34px] w-[42%]',
  line: 'h-3.5 w-[64%]',
  card: 'h-[150px] rounded-xl',
  row: 'h-[52px]',
};

const shapes: Record<Variant, readonly string[]> = {
  page: ['title', 'line', 'card', 'card'],
  list: ['row', 'row', 'row', 'row', 'row'],
  card: ['title', 'line', 'line'],
};

export function Skeleton({ label, variant = 'page' }: { label: string; variant?: Variant }) {
  return (
    <div className="grid w-full max-w-[1120px] gap-3.5 py-2" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {shapes[variant].map((shape, index) => (
        <span
          key={index}
          className={cn(
            bone,
            variant === 'card' && shape === 'title' ? 'h-5 w-[30%]' : sizes[shape],
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
