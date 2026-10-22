import type { ReactNode } from 'react';

/**
 * Bộ hình minh hoạ nét mảnh của Hỷ Yến (nguồn: assets/brand/*.svg).
 *
 * Vì sao chuyển thành component thay vì <img src="*.svg">:
 * - File gốc vẽ màu xanh rêu #334537 (bộ nhận diện cũ). Ở đây nét chính dùng `currentColor` →
 *   tự theo màu chữ của nơi đặt (mặc định đỏ rượu vang), nét điểm xuyết dùng token champagne.
 *   Đổi màu thương hiệu sau này chỉ sửa CSS, không phải vẽ lại file.
 * - Không tốn thêm request tải ảnh, và có <title> tiếng Việt khi cần đọc màn hình.
 */
export type IllustrationName =
  | 'empty-khach'
  | 'empty-loi'
  | 'empty-mat-mang'
  | 'empty-thiep'
  | 'empty-thuc-don'
  | 'empty-tiec'
  | 'buoc-tu-van'
  | 'buoc-hop-dong'
  | 'buoc-chuan-bi'
  | 'buoc-ngay-cuoi'
  | 'divider';

const accent = 'var(--hy-champagne, #c9a46a)';
const base = (accentPath: string, body: ReactNode) => (
  <>
    <path stroke={accent} d={accentPath} />
    {body}
  </>
);
const floor = 'M14 80h68';

const drawings: Record<
  Exclude<IllustrationName, 'divider'>,
  Readonly<{ title: string; body: ReactNode }>
> = {
  'empty-khach': {
    title: 'Chưa có khách',
    body: base(
      floor,
      <>
        <circle cx="48" cy="32" r="10" />
        <path d="M29 70V59a19 19 0 0 1 38 0v11M20 38a7 7 0 0 0-3 13m62-13a7 7 0 0 1 0 13M17 59v8m62-8v8" />
      </>,
    ),
  },
  'empty-loi': {
    title: 'Có lỗi xảy ra',
    body: base(
      floor,
      <>
        <path d="M43 20a6 6 0 0 1 10 0l29 48a5 5 0 0 1-4 7H18a5 5 0 0 1-4-7Z M48 37v17" />
        <circle cx="48" cy="64" r="1.5" />
      </>,
    ),
  },
  'empty-mat-mang': {
    title: 'Mất kết nối mạng',
    body: base(
      floor,
      <>
        <path d="M16 33q32-29 64 0M26 45q22-20 44 0M37 57q11-10 22 0M22 17l53 56" />
        <circle cx="48" cy="69" r="2" />
      </>,
    ),
  },
  'empty-thiep': {
    title: 'Chưa có thiệp',
    body: base(
      floor,
      <>
        <rect x="16" y="30" width="64" height="40" rx="2" />
        <path d="m17 32 31 24 31-24M17 69l22-21m40 21L57 48M36 21q12-16 24 0" />
      </>,
    ),
  },
  'empty-thuc-don': {
    title: 'Chưa có thực đơn',
    body: base(
      floor,
      <path d="M17 22h25a9 9 0 0 1 9 9v43a12 12 0 0 0-10-5H17ZM79 22H60a9 9 0 0 0-9 9v43a12 12 0 0 1 10-5h18ZM26 36h15m-15 9h15m19-9h10m-10 9h10" />,
    ),
  },
  'empty-tiec': {
    title: 'Chưa có tiệc',
    body: base(
      floor,
      <>
        <rect x="19" y="23" width="58" height="50" rx="3" />
        <path d="M19 36h58M32 16v14m32-14v14M38 53l10 9 13-18" />
      </>,
    ),
  },
  // Bốn bước trong "Quy trình" của trang chủ (assets: icon-buoc-1…4, ghép theo đúng nội dung bước).
  'buoc-tu-van': {
    title: 'Tư vấn',
    body: base(floor, <path d="M16 23h64v38H47L31 74V61H16ZM28 36h40m-40 12h25" />),
  },
  'buoc-hop-dong': {
    title: 'Hợp đồng và đặt cọc',
    body: base(
      floor,
      <>
        <rect x="22" y="17" width="52" height="59" rx="3" />
        <path d="M34 17v-5h28v5M34 33h28M34 43h15m-12 14 9 8 16-17" />
      </>,
    ),
  },
  'buoc-chuan-bi': {
    title: 'Chuẩn bị tiệc',
    body: base(
      floor,
      <>
        <circle cx="48" cy="47" r="20" />
        <circle cx="48" cy="47" r="14" />
        <path d="M14 23v18q0 7 7 7V23m-7 10h7m-4 15v27M81 23q-10 6-10 24h10V23Zm0 24v28" />
      </>,
    ),
  },
  'buoc-ngay-cuoi': {
    title: 'Ngày cưới tại sảnh',
    body: (
      <>
        <path stroke={accent} d={floor} />
        <path d="M17 74V36a31 31 0 0 1 62 0v38M31 74V39a17 17 0 0 1 34 0v35M48 22v52M24 74h48" />
        <path stroke={accent} d="M38 49h4m12 0h4" />
      </>
    ),
  },
};

/**
 * @param label Có nhãn → hình mang nghĩa (role="img" + title); không có → trang trí (aria-hidden).
 */
export function Illustration({
  name,
  label,
  className,
  size = 96,
}: Readonly<{ name: IllustrationName; label?: string; className?: string; size?: number }>) {
  const a11y = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true, focusable: false } as const);
  if (name === 'divider')
    return (
      <svg
        className={className ?? 'hy-divider'}
        viewBox="0 0 320 48"
        width={size * 3.33}
        height={size / 2}
        {...a11y}
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke={accent} d="M0 24h118m84 0h118" />
          <path d="M160 34c-16-2-23-12-22-22 12 0 21 7 22 22Zm0 0c16-2 23-12 22-22-12 0-21 7-22 22Zm0-1c-9-10-7-21 0-29 7 8 9 19 0 29Z" />
        </g>
      </svg>
    );
  const drawing = drawings[name];
  return (
    <svg
      className={className ?? 'hy-illustration'}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      {...a11y}
    >
      {label ? <title>{label}</title> : null}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {drawing.body}
      </g>
    </svg>
  );
}
