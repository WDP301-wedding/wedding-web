/**
 * Bảng route của web v2 (một nơi duy nhất). Component dùng `routes.x` thay vì gõ chuỗi
 * '/billing' rải rác → đổi đường dẫn chỉ sửa ở đây, TypeScript báo nếu gõ sai tên.
 *
 * Route cũ (/halls, /billing, …) vẫn hoạt động nhờ redirect 308 trong `next.config.ts`
 * (`legacyRedirects` bên dưới) để link trong email đã gửi không bị hỏng.
 */
export const routes = {
  home: '/',
  halls: '/sanh',
  hall: (hallId: string) => `/sanh/${encodeURIComponent(hallId)}`,
  menus: '/thuc-don',
  consultation: '/tu-van',
  consultationSent: '/tu-van/da-gui',
  login: '/dang-nhap',
  forgotPassword: '/quen-mat-khau',
  invitation: '/loi-moi',
  profile: '/khong-gian/ho-so',
  space: '/khong-gian',
  script: '/khong-gian/thoa-thuan/kich-ban',
  names: '/khong-gian/thoa-thuan/ten',
  contract: '/khong-gian/thoa-thuan/hop-dong',
  payment: '/khong-gian/thanh-toan',
  paymentResult: '/khong-gian/thanh-toan/ket-qua',
  guests: '/khong-gian/chuan-bi/khach',
  seating: '/khong-gian/chuan-bi/khach?xem=so-do',
  card: '/khong-gian/chuan-bi/thiep',
  addendum: '/khong-gian/chuan-bi/phu-luc',
  settle: '/khong-gian/quyet-toan',
  notifications: '/khong-gian/thong-bao',
  publicCard: (slug: string) => `/t/${encodeURIComponent(slug)}`,
  personalCard: '/t/ca-nhan',
} as const;

/** Gắn `bookingId` vào một đường dẫn (giữ query sẵn có). */
export function withBooking(path: string, bookingId: string | null | undefined): string {
  if (!bookingId) return path;
  const [base, hash] = path.split('#', 2) as [string, string | undefined];
  const joined = `${base}${base.includes('?') ? '&' : '?'}bookingId=${encodeURIComponent(bookingId)}`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}

/**
 * Route cũ → route mới. `permanent: true` = HTTP 308: trình duyệt và máy tìm kiếm nhớ địa chỉ
 * mới, đồng thời GIỮ phương thức và query (?bookingId=…, ?attemptId=…). Phần #fragment
 * (#invitationToken, #credential) do trình duyệt tự giữ khi chuyển hướng.
 */
export const legacyRedirects: readonly { source: string; destination: string }[] = [
  { source: '/halls', destination: routes.halls },
  { source: '/halls/:id', destination: '/sanh/:id' },
  { source: '/menus', destination: routes.menus },
  { source: '/consultation', destination: routes.consultation },
  { source: '/account', destination: routes.profile },
  { source: '/ho-so', destination: routes.profile },
  { source: '/password-reset', destination: routes.forgotPassword },
  { source: '/reset-password', destination: routes.forgotPassword },
  { source: '/workspace-invitation', destination: routes.invitation },
  { source: '/overview', destination: routes.space },
  { source: '/workspace', destination: routes.script },
  { source: '/contract', destination: routes.contract },
  { source: '/billing', destination: routes.payment },
  { source: '/payment-return', destination: routes.paymentResult },
  { source: '/guests', destination: routes.guests },
  { source: '/seating', destination: routes.seating },
  { source: '/invitations', destination: routes.card },
  { source: '/appendices', destination: routes.addendum },
  { source: '/invoices', destination: routes.settle },
  { source: '/notifications', destination: routes.notifications },
  { source: '/invitation/personal', destination: routes.personalCard },
  { source: '/invitation/:slug', destination: '/t/:slug' },
];
