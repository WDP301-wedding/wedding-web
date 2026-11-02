import { buttonVariants } from '../components/ui/button';

/** Lớp Tailwind cho DatePicker (Hỷ Yến v3), thay `date-picker.module.css`. */
export const dp = {
  container: 'relative w-full',
  trigger: 'relative flex w-full items-center',
  input:
    'h-12 w-full min-w-0 rounded-lg border border-input bg-card pr-11 pl-4 text-base text-foreground tabular-nums outline-none transition-[border-color,box-shadow] duration-150 ease-hy-emphasized hover:enabled:border-muted-foreground focus:border-primary focus:shadow-[0_0_0_1px_var(--hy-wine)] disabled:cursor-not-allowed disabled:border-border disabled:bg-hy-surface-warm disabled:text-[#a39797] data-[open=true]:border-primary data-[open=true]:shadow-[0_0_0_1px_var(--hy-wine)] data-[error=true]:border-hy-error data-[error=true]:shadow-[0_0_0_1px_var(--hy-error)]',
  iconButton:
    'absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-primary transition-colors duration-150 hover:enabled:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
  popover:
    'absolute top-[calc(100%+6px)] left-0 z-100 flex w-80 max-w-[calc(100vw-32px)] flex-col gap-3 rounded-[var(--hy-radius-lg)] border border-border bg-card p-4 shadow-hy-2 animate-in duration-150 ease-hy-decelerate fade-in zoom-in-95 slide-in-from-top-1 motion-reduce:animate-none',
  header: 'flex items-center justify-between px-1',
  monthTitle: 'text-base font-semibold',
  navGroup: 'flex items-center gap-1',
  navButton:
    'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors duration-150 hover:enabled:bg-hy-surface-warm disabled:cursor-not-allowed disabled:opacity-30',
  weekdays: 'grid grid-cols-7 gap-0.5 text-center',
  weekday: 'py-1.5 text-2xs font-semibold text-muted-foreground',
  days: 'grid grid-cols-7 gap-0.5 text-center',
  dayEmpty: 'size-9',
  day: 'mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-colors duration-150 hover:enabled:bg-hy-surface-warm hover:enabled:text-primary data-[today=true]:border-[1.5px] data-[today=true]:border-hy-champagne disabled:cursor-not-allowed disabled:text-[#a39797] disabled:line-through disabled:opacity-50 data-[selected=true]:border-0 data-[selected=true]:bg-primary data-[selected=true]:font-semibold data-[selected=true]:text-primary-foreground data-[selected=true]:hover:bg-primary data-[selected=true]:hover:text-primary-foreground',
  legend: 'flex flex-wrap gap-4 border-t border-border px-1 pt-2 text-2xs text-muted-foreground',
  legendItem: 'flex items-center gap-1.5',
  selectedDot: 'size-2.5 rounded-full bg-primary',
  disabledText: 'text-[#a39797] line-through',
  footer: 'flex justify-end gap-2 pt-1',
  cancel: buttonVariants({ variant: 'ghost', size: 'sm' }),
  confirm: buttonVariants({ size: 'sm' }),
} as const;
