'use client';

import Link from 'next/link';

import { Icon } from './space-icons';
import { isActive, mainNav } from './space-nav-config';

const tab =
  'relative flex flex-col items-center justify-center gap-1 text-2xs font-medium text-muted-foreground transition-colors before:absolute before:top-0 before:h-0.5 before:w-8 before:rounded-full before:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:before:bg-primary';

/** Điện thoại: 4 mục chính + "Thêm" mở sheet (Quyết toán, Thông báo, Hồ sơ, hỗ trợ). */
export function SpaceBottomNav({
  pathname,
  href,
  unread,
  moreOpen,
  onToggleMore,
}: Readonly<{
  pathname: string;
  href: (path: string) => string;
  unread: number | null;
  moreOpen: boolean;
  onToggleMore: () => void;
}>) {
  return (
    <nav
      data-ui-v3
      className="fixed inset-x-0 bottom-0 z-[100] grid h-16 grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Điều hướng nhanh"
    >
      {mainNav.slice(0, 4).map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            prefetch={false}
            key={item.id}
            className={tab}
            data-active={active}
            href={href(item.href)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={tab}
        data-active={moreOpen}
        aria-expanded={moreOpen}
        aria-controls="space-more-sheet"
        onClick={onToggleMore}
      >
        <Icon name="more" />
        <span>Thêm</span>
        {unread ? (
          <span
            className="absolute top-2 right-[calc(50%-14px)] size-2 rounded-full bg-primary"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </nav>
  );
}
