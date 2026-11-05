/**
 * Lớp Tailwind cho trang Khách mời (Hỷ Yến v3), thay `guests.module.css` và `guests-layout.module.css`.
 * Thẻ, bảng, form dùng chung map `cx` của trang Hợp đồng.
 */
export const gx = {
  // Bố cục theo bề rộng vùng nội dung (container query), không theo màn hình.
  // grid-cols-1 = minmax(0,1fr): cột không nở theo bảng rộng bên trong (bảng tự cuộn ngang).
  workspace: '@container grid min-w-0 grid-cols-1 gap-4',
  settings: 'grid min-w-0 grid-cols-1 items-start gap-4 @min-[640px]:grid-cols-2',
  card: 'flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 [&>h2]:text-base [&>h2]:font-bold',
  cardHeader: 'flex flex-wrap items-center justify-between gap-3 [&_h2]:text-base [&_h2]:font-bold',
  compactForm:
    'flex flex-col gap-3 [&_label]:flex [&_label]:min-w-0 [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-xs [&_label]:font-semibold [&_label>input:not([type=color])]:h-10 [&_label>input:not([type=color])]:w-full [&_label>input:not([type=color])]:rounded-lg [&_label>input:not([type=color])]:border [&_label>input:not([type=color])]:border-input [&_label>input:not([type=color])]:bg-card [&_label>input:not([type=color])]:px-3 [&_label>input:not([type=color])]:text-sm [&_label>input:not([type=color])]:font-normal',
  groupTable:
    'w-full min-w-[480px] border-collapse text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-middle [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-start [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground',
  stats:
    'grid grid-cols-2 gap-2 @min-[640px]:grid-cols-4 [&>div]:min-w-0 [&>div]:rounded-lg [&>div]:bg-muted [&>div]:px-3 [&>div]:py-2.5 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:mt-1 [&_dd]:text-xl [&_dd]:font-bold [&_dd]:text-primary [&_dd]:tabular-nums [&_dd]:wrap-anywhere',
  swatch: 'mr-1.5 inline-block size-3.5 shrink-0 rounded-full align-middle ring-1 ring-black/10',
  copyRow: 'my-2 flex flex-wrap items-center gap-2',
  copyCode: 'max-w-full rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs break-all',
  colorPicker: 'h-8 w-9 cursor-pointer rounded-lg border border-input bg-transparent p-0.5',
  noteIllustrated: 'flex items-center gap-3 text-sm text-muted-foreground [&_svg]:flex-none',
  toolbar: 'flex flex-wrap items-center justify-between gap-3',
  searchWrap: 'relative max-w-[360px] flex-[1_1_240px] max-md:max-w-full',
  searchInput:
    'h-10 w-full rounded-lg border border-input bg-card py-2 pr-8 pl-3 text-sm focus-visible:border-ring focus-visible:outline-none',
  clearSearch:
    'absolute top-1/2 right-2 -translate-y-1/2 p-1 text-lg leading-none text-muted-foreground hover:text-foreground',
  filterRow: 'flex flex-wrap items-center gap-2.5',
  filterSelect: 'h-10 rounded-lg border border-input bg-card px-2.5 text-sm',
  guestCountBadge: 'ml-1 text-xs text-muted-foreground',
  bulkBar:
    'sticky bottom-4 z-40 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary bg-card px-4 py-3 shadow-hy-2 animate-in duration-200 fade-in slide-in-from-bottom-2 motion-reduce:animate-none',
  bulkInfo: 'text-sm font-semibold text-primary',
  bulkActions: 'flex flex-wrap items-center gap-2',
  mobileOnly: 'mt-2 flex flex-col gap-3 md:hidden',
  guestCard:
    'flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors duration-150 data-[selected=true]:border-primary',
  guestCardHeader: 'flex items-start justify-between gap-2',
  guestCardName: 'text-base font-semibold',
  guestCardGroup: 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs',
  guestCardDetails: 'grid gap-1 text-xs text-muted-foreground',
  guestCardActions: 'flex flex-wrap gap-2 border-t border-border pt-2',
  checkboxLabel: 'inline-flex cursor-pointer items-center',
} as const;
