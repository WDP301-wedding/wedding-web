/** Lớp Tailwind dùng chung cho trang Đề xuất & kịch bản (Hỷ Yến v3). */

export const card = 'rounded-xl border border-border bg-card p-5 sm:p-6';
export const cardTitle = 'text-lg font-bold';
/** Dòng phụ nhỏ phía trên tiêu đề thẻ (phiên bản, trạng thái), không phải chữ trang trí. */
export const meta = 'text-xs text-muted-foreground';
export const hint = 'text-xs text-muted-foreground';
/** <summary> mở/đóng một phần phụ (chỉnh sửa, rút phê duyệt, huỷ tiệc). */
export const summary =
  'flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden [&>svg]:size-4 [&>svg]:transition-transform group-open:[&>svg]:rotate-90';
