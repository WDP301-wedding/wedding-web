import { buttonVariants } from '../../components/ui/button';
import { cx } from '../commercial-contract/contract-classes';

const chipBase = 'inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold';
const field =
  'w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base focus-visible:border-ring focus-visible:outline-none disabled:opacity-60';

/**
 * Lớp Tailwind cho Studio thiệp (Hỷ Yến v3): khung, nút, form và vùng xem trước.
 * Thay `studio-workspace.module.css` và các lớp `studio-*`, `preview-*` trong CSS cũ.
 * Hình tấm thiệp (khách nhìn thấy) vẫn ở `app/styles/invitation-card.css`.
 */
export const ix = {
  root: 'grid min-w-0 gap-4',
  heading: 'flex flex-col gap-1.5 [&_h1]:text-xl [&_h1]:font-bold sm:[&_h1]:text-2xl',
  lead: 'text-sm text-muted-foreground',
  tabs: 'flex max-w-full gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--hy-outline)]',
  tab: 'flex-[1_0_auto] border-b-2 border-transparent px-3 py-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground aria-pressed:border-primary aria-pressed:font-semibold aria-pressed:text-primary',
  tabPanel:
    'animate-in duration-200 ease-hy-decelerate fade-in fill-mode-backwards slide-in-from-bottom-1 motion-reduce:animate-none',

  // Dùng chung các tab
  card: cx.card,
  stack: 'grid min-w-0 items-start gap-4',
  stackSplit:
    'grid min-w-0 items-start gap-4 min-[1200px]:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]',
  title: 'text-lg leading-snug font-bold',
  subtitle: 'text-base font-bold',
  subtitleSm: 'text-sm font-bold',
  meta: 'text-xs text-muted-foreground',
  metaWarning: 'text-xs text-hy-warning',
  hint: 'text-sm leading-relaxed text-muted-foreground',
  hintWarning:
    'rounded-lg border border-hy-warning/25 bg-hy-warning-bg px-3 py-2.5 text-sm text-foreground',
  label: 'mb-1.5 block text-xs font-semibold',
  input: `h-11 ${field}`,
  textarea: `min-h-28 py-2.5 ${field}`,
  form: 'flex min-w-0 flex-col gap-3 [&>div]:min-w-0',
  fieldRow: 'grid gap-3 sm:grid-cols-2 [&>div]:min-w-0',
  formActions:
    'sticky bottom-3 z-[5] flex flex-wrap items-center gap-2 border-t border-border bg-card py-3',
  unsaved: 'inline-flex items-center gap-1.5 text-xs font-semibold text-primary',
  actions: cx.actions,
  btn: buttonVariants(),
  btnSmall: buttonVariants({ size: 'sm' }),
  btnSmallOutline: buttonVariants({ variant: 'outline', size: 'sm' }),
  btnDanger: `${buttonVariants({ variant: 'outline' })} border-hy-error/50 text-hy-error hover:bg-hy-error-bg`,
  link: 'inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 wrap-anywhere hover:underline',
  linkDanger: 'text-sm font-semibold text-hy-error underline-offset-4 hover:underline',
  empty:
    'rounded-lg border border-dashed border-input bg-muted/60 p-4 text-sm text-muted-foreground',
  callout: 'flex flex-col gap-1 rounded-xl border border-border bg-muted p-4 text-sm',
  calloutWarning:
    'flex flex-col gap-1 rounded-xl border border-hy-warning/25 bg-hy-warning-bg p-4 text-sm',
  calloutTitle: 'font-semibold',
  chip: `${chipBase} bg-accent text-primary`,
  chipSuccess: `${chipBase} bg-hy-success-bg text-hy-success`,
  chipWarning: `${chipBase} bg-hy-warning-bg text-hy-warning`,
  chipInfo: `${chipBase} bg-hy-info-bg text-hy-info`,
  chipMuted: `${chipBase} bg-secondary text-muted-foreground`,
  disclosure:
    'border-t border-border pt-2.5 [&>summary]:min-h-9 [&>summary]:cursor-pointer [&>summary]:py-2 [&>summary]:text-sm [&>summary]:font-semibold [&>summary]:text-primary [&[open]>summary]:mb-2',
  spinner:
    'inline-block size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none',

  // Tab Nội dung: form bên trái, xem trước bên phải từ 1200px; dưới 1200px chuyển qua lại bằng thanh chế độ.
  liveEditor:
    'group/editor grid min-w-0 items-start gap-4 @min-[860px]/studio:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]',
  designMeta:
    'col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 [&>div]:min-w-0 [&>div]:wrap-anywhere',
  modeBar:
    'col-span-full flex rounded-full border border-border bg-card p-0.5 @min-[860px]/studio:hidden',
  modeButton:
    'h-9 flex-1 rounded-full text-sm font-semibold text-muted-foreground transition-colors duration-150 aria-pressed:bg-accent aria-pressed:text-primary',
  inspector:
    'flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 @max-[860px]/studio:group-data-[mode=preview]/editor:hidden',
  formDivider:
    'flex flex-col gap-1 border-t border-border pt-3 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-primary',

  // Xem trước trong khung điện thoại
  preview:
    'flex min-w-0 flex-col items-center gap-2.5 rounded-xl border border-border bg-hy-surface-warm bg-[radial-gradient(circle_at_50%_0%,rgb(244_185_167/24%),transparent_60%)] p-3 @min-[860px]/studio:sticky @min-[860px]/studio:top-4 @max-[860px]/studio:group-data-[mode=editor]/editor:hidden',
  previewToolbar: 'flex w-full flex-wrap items-center justify-between gap-2 text-xs',
  previewMeta: 'flex items-center gap-2',
  previewIndicator: 'text-xs font-bold text-primary',
  previewHint: 'text-2xs text-muted-foreground',
  viewport: 'inline-flex gap-1 rounded-full border border-border bg-card p-0.5',
  scaleButton:
    'min-h-7 rounded-full px-2.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:text-primary aria-pressed:bg-accent aria-pressed:text-primary',
  stepper: 'flex w-full gap-1.5 overflow-x-auto pt-0.5 pb-1 [scrollbar-width:none]',
  stepPill:
    'min-h-[26px] rounded-full border border-border bg-card px-2.5 text-2xs font-semibold whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
  phone: 'flex w-full justify-center',
  bezel:
    'relative flex h-[min(68svh,600px)] w-full max-w-[380px] flex-col transition-[max-width] duration-300 ease-hy-emphasized data-[device=desktop]:max-w-[520px] motion-reduce:transition-none overflow-hidden rounded-2xl border border-border bg-[#fffdfa] shadow-[0_16px_36px_-8px_rgb(43_29_34/20%),0_0_0_1px_rgb(201_164_106/40%)]',
  bezelModal:
    'relative flex h-[min(640px,76vh)] w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-[#fffdfa]',
  speaker: 'z-[5] mx-auto mt-1.5 mb-1 h-3 w-[68px] shrink-0 rounded-md bg-[#282124]',
  screen:
    'flex-1 scroll-smooth overflow-y-auto px-3.5 pt-4 pb-7 [scrollbar-color:rgb(122_31_61/25%)_transparent] [scrollbar-width:thin]',
  // Cỡ chữ thiệp trong CSS tính theo vw của cửa sổ; trong khung điện thoại dùng đúng cỡ khách thấy trên điện thoại.
  paper:
    'grid w-full gap-4 text-foreground [&_.hy-invite-card-canvas]:text-[14px] [&_.hy-invite-couple]:text-[20px] [&_.hy-invite-head_h1]:text-[20px] [&_img]:max-h-[180px] [&_img]:w-full [&_img]:rounded-md [&_img]:object-cover',
  previewNote: 'mt-6 mb-2 text-xs text-muted-foreground',
  modalBackdrop:
    'fixed inset-0 z-[9999] flex items-center justify-center bg-hy-ink/70 p-4 backdrop-blur-sm animate-in duration-150 fade-in motion-reduce:animate-none',
  modalContent:
    'flex max-h-[94vh] w-full max-w-[440px] flex-col gap-3 rounded-xl bg-card px-5 py-4 shadow-hy-2 animate-in duration-200 ease-hy-decelerate fade-in zoom-in-95 motion-reduce:animate-none',
  modalHeader:
    'flex items-center justify-between gap-3 border-b border-border pb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-primary',
  modalBody: 'flex justify-center overflow-hidden',
} as const;
