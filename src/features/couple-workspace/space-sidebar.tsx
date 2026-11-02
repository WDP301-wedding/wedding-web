'use client';

import Link from 'next/link';

import { BrandMark } from '../../design-system/brand-mark';
import { routes } from '../../routes';
import { chipClass, countBadge, navLink, subNavLink } from './space-classes';
import { Icon, SupportCard } from './space-icons';
import { isActive, mainNav, type Chip } from './space-nav-config';

/** Thanh bên màn rộng: 5 mục theo hành trình (kèm chip trạng thái), thông báo, hồ sơ, hỗ trợ. */
export function SpaceSidebar({
  pathname,
  href,
  chips,
  unread,
  phone,
}: Readonly<{
  pathname: string;
  href: (path: string) => string;
  chips: Record<string, Chip | undefined>;
  unread: number | null;
  phone: string | null;
}>) {
  const inNotifications = pathname.startsWith(routes.notifications);
  const inProfile = pathname.startsWith(routes.profile);
  return (
    <aside
      className="sticky top-0 z-[100] hidden h-dvh flex-col gap-5 overflow-x-hidden overflow-y-auto border-r border-border bg-card px-3 py-5 lg:flex"
      aria-label="Không gian cưới"
    >
      <Link className="px-2" href={href(routes.space)} aria-label="Hỷ Yến — Tổng quan">
        <BrandMark compact />
      </Link>
      <nav aria-label="Các bước chuẩn bị" className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-0.5">
          {mainNav.map((item) => {
            const active = isActive(pathname, item);
            const chip = chips[item.id];
            return (
              <li key={item.id}>
                <Link
                  prefetch={false}
                  className={navLink}
                  data-active={active}
                  href={href(item.href)}
                  aria-current={active && !item.children ? 'page' : undefined}
                >
                  <Icon name={chip?.tone === 'lock' ? 'lock' : item.icon} />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {chip ? <span className={chipClass(chip.tone)}>{chip.label}</span> : null}
                </Link>
                {active && item.children ? (
                  <ul className="my-1 ml-5 flex animate-in flex-col border-l border-border pl-2 duration-200 fade-in slide-in-from-top-1 motion-reduce:animate-none">
                    {item.children.map((child) => {
                      const current = pathname === child.href.split('?')[0];
                      return (
                        <li key={child.href}>
                          <Link
                            prefetch={false}
                            className={subNavLink}
                            href={href(child.href)}
                            aria-current={current ? 'page' : undefined}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        <ul className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          <li>
            <Link
              className={navLink}
              data-active={inNotifications}
              href={href(routes.notifications)}
              aria-current={inNotifications ? 'page' : undefined}
            >
              <Icon name="bell" />
              <span>Thông báo</span>
              {unread ? (
                <span className={countBadge} aria-label={`${unread} chưa đọc`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </Link>
          </li>
          <li>
            <Link
              className={navLink}
              data-active={inProfile}
              href={routes.profile}
              aria-current={inProfile ? 'page' : undefined}
            >
              <Icon name="person" />
              <span>Hồ sơ</span>
            </Link>
          </li>
          <li>
            <Link className={navLink} href={routes.home}>
              <Icon name="back" />
              <span>Trang chủ</span>
            </Link>
          </li>
        </ul>
      </nav>
      <SupportCard phone={phone} />
    </aside>
  );
}
