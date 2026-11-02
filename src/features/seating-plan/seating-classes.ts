import { buttonVariants } from '../../components/ui/button';
import { cx } from '../commercial-contract/contract-classes';

/**
 * Lớp Tailwind cho Sơ đồ bàn (Hỷ Yến v3), thay `seating.module.css` và các lớp `cw-seating`, `hy-zoom-bar`.
 * Đặt tên `sx` vì `seating-svg.tsx` đã dùng biến `cx` cho toạ độ tâm bàn.
 */
export const sx = {
  workspace: 'grid min-w-0 gap-4',
  statusActive:
    'inline-flex w-fit shrink-0 items-center rounded-full bg-primary px-2.5 py-0.5 text-2xs font-semibold text-primary-foreground',

  // Chọn mẫu sơ đồ
  layoutGrid: 'grid items-start gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))]',
  layoutCard:
    'flex h-full min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card p-3 transition-[border-color,box-shadow] duration-150 hover:border-hy-champagne hover:shadow-hy-1',
  layoutCardActive: 'border-2 border-primary bg-muted hover:border-primary',
  layoutCardHeader: 'flex items-start justify-between gap-2',
  layoutCardTitle: 'text-base font-bold text-primary',
  layoutThumbnailWrap:
    'flex h-[120px] items-center justify-center rounded-lg border border-border bg-muted p-2 [&_svg]:max-h-full',
  layoutCardSpecs:
    'flex flex-wrap justify-between gap-x-3 gap-y-1.5 border-y border-border py-1.5 text-xs text-muted-foreground',

  // Trình sửa: cột chọn nhóm bên trái, bản vẽ bên phải trên màn rộng
  editorLayout: 'mt-4 grid items-start gap-6 min-[992px]:grid-cols-[minmax(280px,340px)_1fr]',
  editorSidebar:
    'flex flex-col gap-4 min-[992px]:sticky min-[992px]:top-4 min-[992px]:max-h-[calc(100dvh-32px)] min-[992px]:overflow-y-auto min-[992px]:pr-1',
  editorCanvas: 'flex min-w-0 flex-col gap-3',
  modeHint: 'rounded-lg bg-muted px-3 py-1.5 text-xs',
  assignmentToolbar:
    'm-0 rounded-xl border border-border bg-card p-4 [&>legend]:px-2 [&>legend]:text-sm [&>legend]:font-semibold [&>legend]:text-primary',
  groupChipList: 'mt-2 flex flex-col gap-2',
  groupChipButton:
    'group/chip flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:shadow-hy-1',
  groupChipCount:
    'rounded-full bg-black/8 px-1.5 py-0.5 text-xs tabular-nums group-aria-pressed/chip:bg-white/25',
  selectedCard: 'flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5',
  selectedTitle: 'text-sm font-semibold',
  selectedName: 'text-base font-bold text-primary',
  selectedField:
    'flex flex-col gap-1 text-xs [&_select]:h-9 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-card [&_select]:px-2 [&_select]:text-sm',

  // Bản vẽ + thu phóng
  zoomBar:
    'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted px-3 py-2',
  zoomButton: buttonVariants({ variant: 'outline', size: 'icon-sm' }),
  zoomValue: 'min-w-12 text-center text-sm font-semibold tabular-nums',
  zoomHint: 'ml-auto text-xs text-muted-foreground',
  fullscreenButton: buttonVariants({ variant: 'outline', size: 'sm' }),
  textButton: cx.textButton,
  svg: 'block h-[clamp(380px,58vh,680px)] w-full rounded-lg border border-border bg-muted in-data-fullscreen:min-h-[calc(100dvh-120px)] in-data-fullscreen:flex-1',
  // Chỉ chặn cuộn trang khi đang phóng to, để kéo sơ đồ trên điện thoại.
  svgPannable: 'cursor-grab touch-none active:cursor-grabbing',
  table:
    'cursor-pointer outline-none hover:brightness-[.96] [&_ellipse]:transition-[fill] [&_ellipse]:duration-250 [&_rect]:transition-[fill] [&_rect]:duration-250 focus-visible:[&_ellipse]:stroke-hy-wine focus-visible:[&_ellipse]:stroke-4 focus-visible:[&_rect]:stroke-hy-wine focus-visible:[&_rect]:stroke-4',
  fullscreen: 'fixed inset-0 z-[9999] flex flex-col overflow-auto bg-card p-5',

  // Thanh lưu bám đáy thẻ; dưới lg bám trên thanh điều hướng dưới (cao 4rem) thay vì bị nó che.
  stickyActionBar:
    'sticky bottom-16 z-50 -mx-5 mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-hy-champagne bg-card px-5 py-3.5 shadow-[0_-4px_16px_rgb(0_0_0/8%)] sm:-mx-6 sm:px-6 lg:bottom-0',
  actionBarStatus: 'flex flex-wrap items-center gap-2.5 text-xs',
  // Điện thoại: 4 nút xếp 2×2 cho thanh thấp; từ sm trở lên nằm một hàng.
  actionBarButtons:
    'grid w-full grid-cols-2 gap-2 max-sm:[&_button]:px-2 max-sm:[&_button]:text-xs sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2.5',
} as const;
