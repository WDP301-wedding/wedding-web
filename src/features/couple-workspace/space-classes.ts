import type { Chip } from './space-nav-config';

/** Lớp Tailwind dùng chung cho khung Không gian cưới (Hỷ Yến v3). */

export const panel = 'rounded-xl border border-border bg-card p-5 sm:p-6';
export const panelTitle = 'text-lg font-bold';

export const navLink =
  'flex h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary data-[active=true]:bg-accent data-[active=true]:font-semibold data-[active=true]:text-primary';
export const subNavLink =
  'flex h-9 items-center rounded-md px-3 text-xs text-muted-foreground transition-colors hover:text-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary';
export const countBadge =
  'ml-auto min-w-5 rounded-full bg-primary px-1.5 text-center text-2xs leading-5 font-semibold text-primary-foreground';

const chipTones: Record<Chip['tone'], string> = {
  wait: 'bg-hy-warning-bg text-hy-warning',
  lock: 'bg-secondary text-muted-foreground',
  done: 'bg-hy-success-bg text-hy-success',
  off: 'bg-secondary text-muted-foreground',
};
export const chipClass = (tone: Chip['tone']) =>
  `ml-auto shrink-0 rounded-full px-2 text-2xs leading-[18px] font-semibold ${chipTones[tone]}`;

/** Sheet trượt từ dưới lên trên điện thoại. */
export const sheetBackdrop =
  'fixed inset-0 z-[120] flex animate-in items-end bg-hy-ink/50 duration-200 fade-in motion-reduce:animate-none lg:hidden';
export const sheetPanel =
  'max-h-[85dvh] w-full animate-in overflow-y-auto rounded-t-2xl bg-card p-4 pb-6 shadow-hy-2 duration-300 ease-hy-decelerate slide-in-from-bottom-8 motion-reduce:animate-none';
