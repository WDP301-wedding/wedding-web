/** Lớp Tailwind cho hộp thoại tự dựng (xác nhận, sửa khách, link cá nhân), thay `hy-dialog-*`. */
export const dialog = {
  backdrop:
    'fixed inset-0 z-[1000] grid place-items-center bg-hy-ink/45 p-4 animate-in duration-150 ease-hy-decelerate fade-in fill-mode-backwards motion-reduce:animate-none',
  panel:
    'max-h-[calc(100dvh-32px)] w-full max-w-[460px] overflow-auto rounded-xl border border-border bg-card p-6 text-foreground shadow-hy-2 animate-in duration-250 ease-hy-decelerate fade-in fill-mode-backwards slide-in-from-bottom-3 motion-reduce:animate-none [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:leading-snug [&_h2]:font-bold',
  danger: '[&_h2]:text-hy-error',
  description: 'mb-4 leading-relaxed text-muted-foreground [&_p]:mb-2',
  field:
    'mb-5 flex flex-col gap-1.5 font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:px-3 [&_input]:font-normal',
  actions: 'flex flex-wrap justify-end gap-3',
} as const;
