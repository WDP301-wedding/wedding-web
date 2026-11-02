import { buttonVariants } from '../../components/ui/button';

/**
 * Lớp Tailwind cho trang Hợp đồng và Phụ lục (Hỷ Yến v3), thay bộ class cũ `cw-*`.
 * Ô nhập trong `form` được tạo kiểu qua selector con để không phải gắn class cho từng nhãn.
 */
export const cx = {
  card: 'flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6 [&>h2]:text-lg [&>h2]:font-bold [&>h3]:text-base [&>h3]:font-bold',
  cardHeader:
    'flex flex-wrap items-center justify-between gap-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold',
  note: 'text-sm text-muted-foreground',
  muted: 'text-xs text-muted-foreground',
  actions: 'flex flex-wrap items-center gap-2',
  alert: 'rounded-lg bg-hy-warning-bg px-4 py-3 text-sm text-hy-warning',
  status:
    'inline-flex w-fit items-center rounded-full bg-accent px-2.5 py-0.5 text-2xs font-semibold text-primary',
  chipWarning:
    'inline-flex w-fit items-center rounded-full bg-hy-warning-bg px-2.5 py-0.5 text-2xs font-semibold text-hy-warning',
  tableWrap:
    'overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
  table:
    'w-full min-w-[560px] border-collapse text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&_tfoot_td]:font-bold [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-start [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_small]:block [&_small]:text-xs [&_small]:text-muted-foreground',
  num: 'text-right! tabular-nums',
  form: 'flex flex-col gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-semibold [&_label>input:not([type=checkbox]):not([type=radio])]:h-12 [&_label>input:not([type=checkbox]):not([type=radio])]:rounded-lg [&_label>input:not([type=checkbox]):not([type=radio])]:border [&_label>input:not([type=checkbox]):not([type=radio])]:border-input [&_label>input:not([type=checkbox]):not([type=radio])]:bg-card [&_label>input:not([type=checkbox]):not([type=radio])]:px-3 [&_label>input:not([type=checkbox]):not([type=radio])]:text-base [&_label>input:not([type=checkbox]):not([type=radio])]:font-normal [&_label>textarea]:rounded-lg [&_label>textarea]:border [&_label>textarea]:border-input [&_label>textarea]:bg-card [&_label>textarea]:px-3 [&_label>textarea]:py-2.5 [&_label>textarea]:text-base [&_label>textarea]:font-normal [&_label>select]:h-12 [&_label>select]:rounded-lg [&_label>select]:border [&_label>select]:border-input [&_label>select]:bg-card [&_label>select]:px-3 [&_label>select]:text-base [&_label>select]:font-normal',
  formRow: 'grid gap-4 sm:grid-cols-2',
  grid: 'grid gap-4 md:grid-cols-2',
  stats:
    'grid gap-x-6 gap-y-3 rounded-lg bg-muted p-4 sm:grid-cols-3 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:tabular-nums',
  list: 'flex flex-col divide-y divide-border text-sm [&>li]:py-2.5',
  nextStep: 'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4 text-sm',
  textButton: 'text-sm font-semibold text-primary hover:underline disabled:opacity-50',
  inlineInput:
    'h-10 w-24 rounded-lg border border-input bg-card px-2 text-sm tabular-nums focus-visible:border-ring focus-visible:outline-none',
  accessNotice:
    'flex flex-col gap-3 rounded-xl border border-border bg-muted p-4 text-sm leading-relaxed',
  changes:
    'flex flex-col gap-2 rounded-lg border border-border p-4 text-sm [&_h3]:font-bold [&_li]:leading-normal',
  catalog:
    'max-h-[420px] overflow-auto rounded-lg border border-border [&_button]:mt-2 [&_input]:h-10 [&_input]:w-24 [&_input]:min-w-16 [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:bg-card [&_input]:px-2 [&_input]:tabular-nums',
  selectorFieldset: 'min-w-0',
  /** Thanh tiến trình hợp đồng: thanh màu từng bước + nhãn. */
  progress: 'grid grid-cols-2 gap-2 sm:grid-cols-4',
  empty:
    'flex flex-col items-start gap-2 rounded-xl border border-dashed border-input bg-muted/60 p-6 text-sm text-muted-foreground [&_:is(h1,h2)]:text-base [&_:is(h1,h2)]:font-bold [&_:is(h1,h2)]:text-foreground',
  statusMuted:
    'inline-flex w-fit items-center rounded-full bg-secondary px-2.5 py-0.5 text-2xs font-semibold text-muted-foreground',
  page: 'flex flex-col gap-6',
  heading: 'flex flex-col gap-2 [&_h1]:text-xl [&_h1]:font-bold sm:[&_h1]:text-2xl',
  group: 'flex flex-col gap-1 [&>h3]:text-xs [&>h3]:font-semibold [&>h3]:text-muted-foreground',
  button: buttonVariants(),
  buttonOutline: buttonVariants({ variant: 'outline' }),
} as const;
