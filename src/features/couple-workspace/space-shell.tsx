'use client';
import { ConnectionFeedback } from '../realtime/connection-feedback';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { BrandMark } from '../../design-system/brand-mark';
import { routes, withBooking } from '../../routes';
import { useSpaceExtras } from './space-provider';
import {
  bookingDisplayName,
  bookingPhaseLabel,
  formatEventDate,
  shiftLabel,
  useCoupleWorkspace,
} from './use-couple-workspace';
import { Icon, SupportCard } from './space-icons';
import { isActive, mainNav, navChips } from './space-nav-config';
import { SpaceBookingSwitcherSheet, SpaceMoreSheet } from './space-mobile-sheets';

export { navChips } from './space-nav-config';

/**
 * Khung "Không gian cưới" v2 (C1): sidebar 5 mục theo hành trình + chip trạng thái,
 * thanh trên có thông tin tiệc và chuông, mobile có bottom nav + "Thêm".
 */
export function SpaceShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, bookings, bookingId } = useCoupleWorkspace();
  const effectiveBookingId = bookingId ?? searchParams.get('bookingId');
  const { unread, restaurant } = useSpaceExtras();
  const [moreOpen, setMoreOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen && !switcherOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moreOpen, switcherOpen]);

  const proposal = state.status === 'ready' ? state.proposal : undefined;
  const summary = bookings.find((booking) => booking.bookingId === effectiveBookingId);
  const chips = navChips(summary, proposal);
  const href = (path: string) => withBooking(path, effectiveBookingId);
  const phone = restaurant?.publicPhone ?? null;

  return (
    // `v0-workspace`: các trang tính năng cũ (hợp đồng, khách, sơ đồ…) có CSS gắn dưới class này.
    <div className="v0-workspace hy-space">
      <a className="skip-link" href="#space-content">
        Đi đến nội dung chính
      </a>
      <aside className="hy-space-side" aria-label="Không gian cưới">
        <Link className="hy-space-brand" href={href(routes.space)} aria-label="Hỷ Yến — Tổng quan">
          <BrandMark compact />
        </Link>
        <nav aria-label="Các bước chuẩn bị">
          <ul className="hy-space-nav">
            {mainNav.map((item) => {
              const active = isActive(pathname, item);
              const chip = chips[item.id];
              return (
                <li key={item.id}>
                  <Link
                    prefetch={false}
                    className={'hy-space-link' + (active ? ' is-active' : '')}
                    href={href(item.href)}
                    aria-current={active && !item.children ? 'page' : undefined}
                  >
                    <Icon name={chip?.tone === 'lock' ? 'lock' : item.icon} />
                    <span>{item.label}</span>
                    {chip ? (
                      <span className={`hy-nav-chip is-${chip.tone}`}>{chip.label}</span>
                    ) : null}
                  </Link>
                  {active && item.children ? (
                    <ul className="hy-space-subnav">
                      {item.children.map((child) => {
                        const childPath = child.href.split('?')[0]!;
                        const current = pathname === childPath;
                        return (
                          <li key={child.href}>
                            <Link
                              prefetch={false}
                              href={href(child.href)}
                              className={current ? 'is-active' : undefined}
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
          <ul className="hy-space-nav hy-space-nav-bottom">
            <li>
              <Link
                className={
                  'hy-space-link' + (pathname.startsWith(routes.notifications) ? ' is-active' : '')
                }
                href={href(routes.notifications)}
                aria-current={pathname.startsWith(routes.notifications) ? 'page' : undefined}
              >
                <Icon name="bell" />
                <span>Thông báo</span>
                {unread ? (
                  <span className="hy-nav-count" aria-label={`${unread} chưa đọc`}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </Link>
            </li>
            <li>
              <Link
                className={
                  'hy-space-link' + (pathname.startsWith(routes.profile) ? ' is-active' : '')
                }
                href={routes.profile}
                aria-current={pathname.startsWith(routes.profile) ? 'page' : undefined}
              >
                <Icon name="person" />
                <span>Hồ sơ</span>
              </Link>
            </li>
            <li>
              <Link className="hy-space-link" href={routes.home}>
                <Icon name="back" />
                <span>Trang chủ</span>
              </Link>
            </li>
          </ul>
        </nav>
        <SupportCard phone={phone} />
      </aside>

      <div className="hy-space-main">
        <header className="hy-space-top">
          <div className="hy-space-context">
            {summary ? (
              <>
                <strong>{bookingDisplayName(summary)}</strong>
                <span>
                  {summary.hallName} · {formatEventDate(summary.eventDate)} ·{' '}
                  {shiftLabel(summary.shiftCode)}{' '}
                  {proposal ? `· ${proposal.planningHeadcount} khách` : ''} ·{' '}
                  <span className="hy-space-phase-pill">{bookingPhaseLabel(summary.phase)}</span>
                </span>
              </>
            ) : proposal ? (
              <>
                <strong>{bookingDisplayName({ hallName: proposal.proposal.hall.name })}</strong>
                <span>
                  {proposal.proposal.hall.name} · {formatEventDate(proposal.eventDate)} ·{' '}
                  {shiftLabel(proposal.proposal.shift.code)} · {proposal.planningHeadcount} khách
                </span>
              </>
            ) : (
              <strong>Không gian cưới</strong>
            )}
          </div>
          {bookings.length > 1 && bookingId ? (
            <>
              <label className="hy-space-switch hy-space-switch-desktop">
                <span className="visually-hidden">Đổi tiệc cưới</span>
                <select
                  value={bookingId}
                  onChange={(event) => router.push(withBooking(pathname, event.target.value))}
                >
                  {bookings.map((booking) => (
                    <option key={booking.bookingId} value={booking.bookingId}>
                      {bookingDisplayName(booking)} · {booking.hallName} ·{' '}
                      {formatEventDate(booking.eventDate)} · {shiftLabel(booking.shiftCode)} [
                      {bookingPhaseLabel(booking.phase)}]
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="hy-space-switch-mobile-btn"
                onClick={() => setSwitcherOpen(true)}
                aria-expanded={switcherOpen}
                aria-controls="booking-switch-sheet"
              >
                <Icon name="checklist" />
                <span className="hy-space-switch-mobile-text">
                  {summary ? bookingDisplayName(summary) : 'Đổi tiệc'}
                </span>
                <span className="hy-space-switch-mobile-badge">{bookings.length} tiệc</span>
              </button>
            </>
          ) : null}
          <Link
            className="hy-space-bell"
            href={href(routes.notifications)}
            aria-label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
          >
            <Icon name="bell" />
            {unread ? <span className="hy-nav-count">{unread > 99 ? '99+' : unread}</span> : null}
          </Link>
        </header>
        <main id="space-content" className="hy-space-content">
          {state.status !== 'loading' && state.status !== 'anonymous' ? (
            <ConnectionFeedback />
          ) : null}
          {/* key theo đường dẫn → mỗi lần đổi trang, nội dung chạy lại hiệu ứng vào (hy-enter). */}
          <div className="content-inner" key={pathname}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: 4 mục chính + "Thêm" mở sheet (Quyết toán, Thông báo, Hồ sơ, hỗ trợ). */}
      <nav className="hy-space-bottom" aria-label="Điều hướng nhanh">
        {mainNav.slice(0, 4).map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              prefetch={false}
              key={item.id}
              href={href(item.href)}
              className={active ? 'is-active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="space-more-sheet"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <Icon name="more" />
          <span>Thêm</span>
          {unread ? <span className="hy-nav-dot" aria-hidden="true" /> : null}
        </button>
      </nav>

      <SpaceMoreSheet
        chips={chips}
        href={href}
        moreOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        phone={phone}
        unread={unread}
      />

      <SpaceBookingSwitcherSheet
        bookingId={bookingId}
        bookings={bookings}
        onClose={() => setSwitcherOpen(false)}
        onSelectBooking={(bId) => router.push(withBooking(pathname, bId))}
        switcherOpen={switcherOpen}
      />
    </div>
  );
}
