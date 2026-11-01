/**
 * Lớp Tailwind cho các khối trong Studio thiệp: trợ lý AI, ảnh, đơn in, chia sẻ.
 * Khung, nút và form dùng chung nằm ở `studio-classes.ts` (`ix`).
 */
export const px = {
  // Trợ lý thiết kế (AI)
  aiCard: 'flex flex-col gap-4 rounded-xl border border-border bg-muted/50 p-4',
  aiForm: 'flex flex-col gap-2',
  promptRow: 'flex flex-wrap gap-2 [&_input]:flex-[1_1_200px]',
  ideasRow: 'flex flex-wrap items-center gap-2',
  chipButton:
    'rounded-full border border-border bg-card px-3 py-1 text-xs font-medium transition-colors duration-150 hover:border-primary hover:text-primary disabled:opacity-50 data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
  presetsSection: 'flex flex-col gap-2',
  presetsLabelRow: 'flex flex-wrap items-baseline justify-between gap-2',
  presetsGrid: 'grid gap-3 sm:grid-cols-2',
  presetCard:
    'flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left outline-none transition-[border-color,box-shadow] duration-150 hover:border-hy-champagne hover:shadow-hy-1 focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-primary data-[active=true]:shadow-[0_0_0_3px_var(--hy-wine-soft)]',
  presetHead: 'flex items-start gap-2',
  presetMeta: 'flex min-w-0 flex-1 flex-col',
  presetName: 'text-sm font-bold',
  presetTagline: 'text-xs text-muted-foreground',
  presetActive: 'inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-primary',
  presetDesc: 'text-xs leading-relaxed text-muted-foreground',
  palette: 'flex items-center gap-1.5',
  paletteDot: 'size-4 rounded-full ring-1 ring-black/10',
  paletteTag: 'ml-auto text-2xs font-semibold text-muted-foreground',
  addonBody: 'mt-3 flex flex-col gap-2 rounded-lg bg-muted p-3',
  aiStatus: 'flex items-center gap-2',
  aiRestored: 'flex flex-wrap items-center gap-2 text-sm',

  // Ảnh gắn trên thiệp (form nội dung)
  attached: 'flex flex-col',
  chipGroup: 'flex flex-wrap gap-2',
  chip: 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-1 pl-1 text-xs',
  chipThumb: 'size-6 rounded-full object-cover',
  chipText: 'max-w-40 truncate',
  chipRemove:
    'grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',

  // Tab Hình ảnh
  upload:
    'rounded-xl border-2 border-dashed border-input p-3 transition-colors duration-150 data-[dragover=true]:border-primary data-[dragover=true]:bg-accent',
  dropzone: 'flex flex-col gap-1.5',
  file: 'block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary',
  dropzoneHint: 'text-xs text-muted-foreground',
  mediaGrid: 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] gap-3',
  mediaItem:
    'group/media flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-shadow duration-200 hover:shadow-hy-1',
  mediaThumb:
    'grid h-[140px] place-items-center overflow-hidden rounded-lg bg-muted text-xs text-muted-foreground [&_img]:size-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-300 group-hover/media:[&_img]:scale-[1.03] motion-reduce:[&_img]:transition-none',
  mediaName: 'text-sm font-semibold wrap-anywhere',
  mediaStatus: 'flex flex-col gap-2',
  mediaState: 'flex flex-wrap items-center gap-2',
  mediaFoot: 'flex items-center justify-between gap-2 border-t border-border pt-2',

  // Tab Đặt in
  quantityHead: 'mb-1.5 flex flex-wrap items-center justify-between gap-2 [&_label]:mb-0',
  quantityPresets: 'flex flex-wrap gap-1.5',
  orders: 'flex flex-col gap-3',
  order: 'flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3',
  orderHead: 'flex flex-wrap items-center justify-between gap-2',
  orderId: 'text-sm font-semibold tabular-nums',
  orderBrief: 'flex flex-wrap justify-between gap-2 text-sm tabular-nums [&_strong]:text-primary',
  orderStepper: 'my-2 grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 md:grid-cols-6',
  orderStep:
    'group/step flex flex-col gap-1.5 text-2xs text-muted-foreground data-[state=current]:font-semibold data-[state=current]:text-primary data-[state=done]:text-foreground',
  orderStepBar:
    'hy-grow-x h-1 rounded-full bg-border group-data-[state=current]/step:bg-primary group-data-[state=done]/step:bg-hy-success',
  orderSummary: 'flex flex-col gap-1.5 rounded-lg bg-muted p-3 text-sm',

  // Tab Chia sẻ
  publicationState: 'rounded-lg bg-muted px-3 py-2.5 text-sm',
  published: 'grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start',
  qrBlock: 'flex flex-col items-center gap-2',
  qr: 'rounded-xl border border-border bg-white p-3 [&_img]:block',
  publishedCopy: 'flex min-w-0 flex-col gap-3',
  publishedStatus: 'flex flex-wrap items-center gap-2',
  shareBar: 'flex flex-wrap gap-2',
  ogCard: 'mt-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-4',
  ogBadge: 'text-2xs font-semibold text-muted-foreground',
  ogTitle: 'text-base font-bold text-primary',
  ogSubtitle: 'text-sm',
  ogMeta: 'text-xs text-muted-foreground',
  ogLink: 'truncate text-xs text-hy-info',
} as const;
