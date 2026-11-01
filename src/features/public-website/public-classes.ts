/** Lớp Tailwind dùng chung cho các trang công khai (Hỷ Yến v3). */

export const container = 'mx-auto w-full max-w-7xl px-4 sm:px-8';
export const section = `${container} py-12 lg:py-20`;
/** Dải nền ngang toàn màn hình; nội dung bên trong dùng `section`. */
export const band = {
  warm: 'border-y border-border bg-muted',
  white: 'border-y border-border bg-card',
  blush: 'bg-accent',
};
export const sectionHead = 'mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-3';

export const h1 = 'text-2xl font-bold text-balance sm:text-3xl';
export const h2 = 'text-xl font-bold text-balance sm:text-2xl';
export const h3 = 'text-base font-bold sm:text-lg';
export const lead = 'text-sm text-muted-foreground sm:text-base sm:leading-7';
export const muted = 'text-sm text-muted-foreground';

export const card = 'overflow-hidden rounded-xl border border-border bg-card';
/** Thẻ nhấc nhẹ khi rê chuột; tắt khi người dùng chọn giảm chuyển động. */
export const lift =
  'transition-[translate,box-shadow] duration-250 ease-hy-emphasized hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(43_29_34/0.1)] motion-reduce:transition-none motion-reduce:hover:translate-y-0';
/** Ảnh bên trong khung `group` phóng nhẹ khi rê chuột. */
export const zoom =
  '[&_img]:transition-transform [&_img]:duration-400 [&_img]:ease-hy-emphasized group-hover:[&_img]:scale-[1.03] motion-reduce:[&_img]:transition-none motion-reduce:group-hover:[&_img]:scale-100';

export const arrowLink =
  'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-hy-wine-pressed [&_svg]:size-4 [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5';

export const field = 'flex flex-col gap-1.5 text-xs font-semibold';
export const control =
  'h-12 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base font-normal text-foreground transition-colors outline-none placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive';
export const fieldHint = 'text-xs font-normal text-muted-foreground';
export const fieldError = 'text-xs font-normal text-destructive';
export const alert = 'rounded-lg bg-hy-error-bg px-4 py-3 text-sm text-hy-error';

/** Ô chọn dạng thẻ (ca tiệc, sảnh, thực đơn) bọc quanh input radio ẩn. */
export const choice =
  'group relative flex cursor-pointer flex-col rounded-lg border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-muted-foreground has-checked:border-primary has-checked:bg-accent has-checked:ring-1 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring/30';
