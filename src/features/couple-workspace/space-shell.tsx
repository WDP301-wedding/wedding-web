'use client';

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
  type BookingSummary,
  type Proposal,
} from './use-couple-workspace';

type Chip = Readonly<{ label: string; tone: 'wait' | 'lock' | 'done' | 'off' }>;
type NavItem = Readonly<{
  id: string;
  label: string;
  href: string;
  icon: IconName;
  /** Các đường dẫn con được coi là "đang ở mục này". */
  match: string;
  children?: readonly { label: string; href: string }[];
}>;

const mainNav: readonly NavItem[] = [
  { id: 'overview', label: 'Tổng quan', href: routes.space, icon: 'home', match: routes.space },
  {
    id: 'agreement',
    label: 'Thoả thuận',
    href: routes.script,
    icon: 'handshake',
    match: '/khong-gian/thoa-thuan',
    children: [
      { label: 'Kịch bản', href: routes.script },
      { label: 'Tên cô dâu chú rể', href: routes.names },
      { label: 'Hợp đồng', href: routes.contract },
    ],
  },
  {
    id: 'payment',
    label: 'Thanh toán',
    href: routes.payment,
    icon: 'wallet',
    match: '/khong-gian/thanh-toan',
  },
  {
    id: 'prepare',
    label: 'Chuẩn bị',
    href: routes.guests,
    icon: 'checklist',
    match: '/khong-gian/chuan-bi',
    children: [
      { label: 'Khách & sơ đồ', href: routes.guests },
      { label: 'Thiệp & in', href: routes.card },
      { label: 'Phụ lục', href: routes.addendum },
    ],
  },
  {
    id: 'settle',
    label: 'Quyết toán',
    href: routes.settle,
    icon: 'receipt',
    match: '/khong-gian/quyet-toan',
  },
];

/**
 * Chip trạng thái của từng mục sidebar, suy ra từ dữ liệu backend (không tự đoán nghiệp vụ):
 * - Thoả thuận "Chờ bạn": có kịch bản, nhà hàng đã duyệt, hai bạn chưa duyệt.
 * - Thanh toán "Cần đặt cọc": phase AWAITING_DEPOSIT.
 * - Chuẩn bị / Quyết toán khoá cho tới khi backend trả quyền FULL (sau cọc).
 */
export function navChips(
  summary: BookingSummary | undefined,
  proposal: Proposal | undefined,
): Record<string, Chip | undefined> {
  const phase = proposal?.phase ?? summary?.phase;
  if (!phase) return {};
  if (phase === 'CANCELLED')
    return {
      prepare: { label: 'Đã huỷ', tone: 'off' },
      settle: { label: 'Đã huỷ', tone: 'off' },
    };
  const full = (proposal?.capabilities.accessLevel ?? summary?.accessLevel) === 'FULL';
  const waitingCouple =
    summary !== undefined &&
    summary.hasTimeline &&
    summary.managerApproved &&
    !summary.coupleApproved &&
    phase === 'DRAFT';
  return {
    agreement: waitingCouple
      ? { label: 'Chờ bạn', tone: 'wait' }
      : phase === 'DRAFT'
        ? undefined
        : { label: 'Đã xong', tone: 'done' },
    payment: phase === 'AWAITING_DEPOSIT' ? { label: 'Cần đặt cọc', tone: 'wait' } : undefined,
    prepare: full ? undefined : { label: 'Mở sau đặt cọc', tone: 'lock' },
    settle: full ? undefined : { label: 'Mở sau đặt cọc', tone: 'lock' },
  };
}

function isActive(pathname: string, item: NavItem): boolean {
  return item.match === routes.space ? pathname === routes.space : pathname.startsWith(item.match);
}

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
              <Link className="hy-space-link" href={routes.profile}>
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
                  {summary.hallName} · {formatEventDate(summary.eventDate)} · {shiftLabel(summary.shiftCode)}{' '}
                  {proposal ? `· ${proposal.planningHeadcount} khách` : ''} ·{' '}
                  <span className="hy-space-phase-pill">{bookingPhaseLabel(summary.phase)}</span>
                </span>
              </>
            ) : proposal ? (
              <>
                <strong>{bookingDisplayName({ hallName: proposal.proposal.hall.name })}</strong>
                <span>
                  {proposal.proposal.hall.name} · {formatEventDate(proposal.eventDate)} · {shiftLabel(proposal.proposal.shift.code)}{' '}
                  · {proposal.planningHeadcount} khách
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
                      {bookingDisplayName(booking)} · {booking.hallName} · {formatEventDate(booking.eventDate)} · {shiftLabel(booking.shiftCode)} [{bookingPhaseLabel(booking.phase)}]
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
      {moreOpen ? (
        <div className="hy-space-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div
            id="space-more-sheet"
            className="hy-space-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Thêm"
            onClick={(event) => event.stopPropagation()}
          >
            <Link prefetch={false} href={href(routes.settle)} onClick={() => setMoreOpen(false)}>
              <Icon name="receipt" /> Quyết toán
              {chips.settle ? (
                <span className={`hy-nav-chip is-${chips.settle.tone}`}>{chips.settle.label}</span>
              ) : null}
            </Link>
            <Link
              prefetch={false}
              href={href(routes.notifications)}
              onClick={() => setMoreOpen(false)}
            >
              <Icon name="bell" /> Thông báo
              {unread ? <span className="hy-nav-count">{unread}</span> : null}
            </Link>
            <Link href={routes.profile} onClick={() => setMoreOpen(false)}>
              <Icon name="person" /> Hồ sơ
            </Link>
            <Link href={routes.home} onClick={() => setMoreOpen(false)}>
              <Icon name="back" /> Trang chủ
            </Link>
            <SupportCard phone={phone} />
          </div>
        </div>
      ) : null}
      {switcherOpen ? (
        <div className="hy-space-sheet-backdrop" onClick={() => setSwitcherOpen(false)}>
          <div
            id="booking-switch-sheet"
            className="hy-space-sheet hy-booking-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Danh sách tiệc cưới"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="hy-booking-sheet-header">
              <div>
                <h3>Danh sách tiệc của bạn</h3>
                <p>Bạn có {bookings.length} tiệc đang được quản lý. Chạm vào tiệc để chuyển không gian làm việc.</p>
              </div>
              <button
                type="button"
                className="hy-sheet-close-btn"
                onClick={() => setSwitcherOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="hy-booking-sheet-list">
              {bookings.map((b) => {
                const isCurrent = b.bookingId === bookingId;
                return (
                  <button
                    key={b.bookingId}
                    type="button"
                    className={`hy-booking-sheet-item ${isCurrent ? 'is-selected' : ''}`}
                    onClick={() => {
                      router.push(withBooking(pathname, b.bookingId));
                      setSwitcherOpen(false);
                    }}
                  >
                    <div className="hy-booking-sheet-item-header">
                      <strong className="hy-booking-sheet-title">{bookingDisplayName(b)}</strong>
                      <span
                        className={`hy-nav-chip is-${
                          b.phase === 'CONFIRMED' || b.phase === 'COMPLETED'
                            ? 'done'
                            : b.phase === 'CANCELLED'
                              ? 'off'
                              : 'wait'
                        }`}
                      >
                        {bookingPhaseLabel(b.phase)}
                      </span>
                    </div>
                    <div className="hy-booking-sheet-details">
                      <span>🏛️ {b.hallName}</span>
                      <span>📅 {formatEventDate(b.eventDate)} ({shiftLabel(b.shiftCode)})</span>
                    </div>
                    {isCurrent ? (
                      <span className="hy-booking-sheet-current-tag">✓ Đang hiển thị tiệc này</span>
                    ) : (
                      <span className="hy-booking-sheet-switch-tag">Chuyển sang tiệc này →</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="hy-booking-sheet-footer">
              <Link
                href={routes.consultation}
                className="hy-booking-sheet-add-btn"
                onClick={() => setSwitcherOpen(false)}
              >
                + Đăng ký đặt thêm tiệc mới
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SupportCard({ phone }: Readonly<{ phone: string | null }>) {
  return (
    <div className="hy-support">
      <Icon name="call" />
      <div>
        <strong>Cần hỗ trợ? Gọi nhà hàng</strong>
        {phone ? (
          <a href={`tel:${phone.replace(/[^+\d]/gu, '')}`}>{phone}</a>
        ) : (
          <Link href={routes.consultation}>Gửi lời nhắn</Link>
        )}
      </div>
    </div>
  );
}

type IconName =
  | 'home'
  | 'handshake'
  | 'wallet'
  | 'checklist'
  | 'receipt'
  | 'bell'
  | 'person'
  | 'lock'
  | 'call'
  | 'back'
  | 'more';

const iconPaths: Record<IconName, string> = {
  home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z',
  handshake: 'M5 4h10l4 4v12H5ZM14 4v5h5M8 13h8m-8 4h5',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3ZM3 7V6a2 2 0 0 1 2-2h11M16 13.5h.01',
  checklist: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6m-6 4h6m-6 4h3',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4ZM10 20a2 2 0 0 0 4 0',
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  lock: 'M6 11h12v10H6ZM8 11V8a4 4 0 1 1 8 0v3',
  call: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  back: 'M10 6 4 12l6 6M4 12h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

function Icon({ name }: Readonly<{ name: IconName }>) {
  return (
    <svg
      className="hy-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
