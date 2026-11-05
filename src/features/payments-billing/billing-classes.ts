import { buttonVariants } from '../../components/ui/button';

const alertBox =
  '[&_[role=alert]]:rounded-lg [&_[role=alert]]:bg-hy-error-bg [&_[role=alert]]:px-4 [&_[role=alert]]:py-3 [&_[role=alert]]:text-hy-error';
const fieldChildren =
  '[&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-semibold [&_input]:h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:bg-card [&_input]:px-3 [&_input]:text-base [&_input]:font-normal [&_select]:h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-card [&_select]:px-3 [&_select]:text-sm [&_select]:font-normal';

/**
 * Lớp Tailwind cho trang Thanh toán (Hỷ Yến v3), thay `billing.css` và `deposit.module.css`.
 * Tiêu đề, bảng, nhãn và ô nhập bên trong được tạo kiểu qua selector con của `shell`.
 */
export const bx = {
  shell: `flex flex-col gap-5 text-sm [&_h1]:text-xl [&_h1]:font-bold sm:[&_h1]:text-2xl [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_code]:text-xs [&_code]:break-all ${fieldChildren}`,
  header:
    'flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4 [&_nav]:flex [&_nav]:flex-wrap [&_nav]:gap-4 [&_nav_a]:font-semibold [&_nav_a]:text-primary',
  intro: 'flex max-w-3xl flex-col gap-2 [&>p]:text-muted-foreground',
  selectWrapper: 'mt-2 flex max-w-md flex-col gap-1.5',
  lookup: 'flex flex-wrap items-end gap-3 [&_label]:min-w-60 [&_label]:flex-1',
  live: `empty:hidden [&_[role=status]]:text-xs [&_[role=status]]:text-muted-foreground ${alertBox}`,
  sectionHeading: 'flex flex-wrap items-center justify-between gap-3',
  panel: `flex min-w-0 flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs ${alertBox}`,
  balanceCard:
    'flex min-w-0 flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs',
  balanceGateNotice:
    'flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 p-3.5 sm:p-4 text-xs',
  summary:
    'flex flex-col gap-3 [&_dl]:grid [&_dl]:grid-cols-1 [&_dl]:gap-2.5 min-[500px]:[&_dl]:grid-cols-3 [&_dl>div]:rounded-xl [&_dl>div]:border [&_dl>div]:border-border/70 [&_dl>div]:bg-muted/20 [&_dl>div]:p-3 sm:[&_dl>div]:p-3.5 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dt]:font-medium [&_dd]:mt-1 [&_dd]:text-base sm:[&_dd]:text-lg [&_dd]:font-bold [&_dd]:tabular-nums',
  tableScroll:
    'max-w-full overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_caption]:px-3 [&_caption]:py-2 [&_caption]:text-left [&_caption]:text-xs [&_caption]:text-muted-foreground [&_table]:w-full [&_table]:min-w-[560px] [&_table]:border-collapse [&_table]:text-xs sm:[&_table]:text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 sm:[&_td]:py-2.5 [&_td_small]:block [&_td_small]:text-2xs [&_td_small]:text-muted-foreground [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground',
  confirm:
    'flex flex-col gap-3 rounded-xl border border-hy-champagne/60 bg-muted p-5 [&>strong]:text-2xl [&>strong]:font-bold [&>strong]:text-primary [&>strong]:tabular-nums',
  confirmActions: 'flex flex-wrap gap-2',
  attempt: 'flex flex-col gap-2.5 rounded-xl border border-border/80 bg-muted/30 p-3.5 sm:p-4 text-xs',
  attemptNote: 'text-xs text-muted-foreground',
  balanceAction: 'flex flex-col items-start gap-3',
  gate: 'flex flex-col items-start gap-2.5 rounded-lg border border-hy-warning/25 bg-hy-warning-bg px-4 py-3 text-sm text-foreground',
  primaryLink: buttonVariants(),
  button: buttonVariants(),
  buttonOutline: buttonVariants({ variant: 'outline' }),

  // Khoản cọc: chi tiết bên trái, thẻ thanh toán bên phải trên màn rộng.
  depositWorkspace:
    'grid min-w-0 items-start gap-5 rounded-xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px]',
  breakdown: 'grid min-w-0 content-start gap-4',
  venue: 'text-xl font-bold break-words text-primary',
  event:
    'grid grid-cols-2 gap-x-4 gap-y-2.5 [&_dt]:text-2xs [&_dt]:text-muted-foreground [&_dd]:text-sm [&_dd]:font-semibold',
  payment:
    'flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted p-4 lg:sticky lg:top-24 [&>a]:font-semibold [&>a]:text-primary',
  amount: 'text-3xl font-bold text-primary tabular-nums',
  note: 'text-xs leading-relaxed text-muted-foreground',
  conditions:
    'border-t border-border pt-2 text-xs [&>summary]:cursor-pointer [&>summary]:py-2 [&>summary]:font-semibold [&>p]:text-muted-foreground',
  costTable:
    'w-full border-collapse text-xs [&_caption]:pb-2 [&_caption]:text-left [&_caption]:font-semibold [&_caption]:text-muted-foreground [&_td]:border-t [&_td]:border-border [&_td]:px-2 [&_td]:py-2.5 [&_td]:text-right [&_td]:whitespace-nowrap [&_td]:tabular-nums [&_td:first-child]:pl-3 [&_td:first-child]:text-left [&_td:first-child]:font-semibold [&_td:first-child]:whitespace-normal [&_td:last-child]:pr-3 [&_tbody_td:last-child]:font-semibold [&_tbody_td:last-child]:text-primary [&_tfoot_td]:bg-muted [&_tfoot_td]:font-bold [&_tfoot_td]:text-primary [&_th]:bg-muted [&_th]:px-2 [&_th]:py-2.5 [&_th]:text-right [&_th]:font-semibold [&_th:first-child]:pl-3 [&_th:first-child]:text-left [&_th:last-child]:pr-3',
  costScroll:
    'max-w-full min-w-0 overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
} as const;
