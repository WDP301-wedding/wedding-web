'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { browserSession } from '../identity-access/browser-session';
import { notificationApi } from '../notifications/notification-api';
export type Section =
  | 'overview'
  | 'timeline'
  | 'contract'
  | 'billing'
  | 'guests'
  | 'seating'
  | 'appendices'
  | 'media'
  | 'design'
  | 'publish'
  | 'print'
  | 'invoices'
  | 'notifications'
  | 'account';
// Thứ tự menu đi theo luồng nghiệp vụ: trước cọc → sau cọc → thiệp → quyết toán.
const nav: readonly { id: Section; label: string; href: string; group?: string; icon: number }[] = [
  { id: 'overview', label: 'Tổng quan', href: '/overview', icon: 0 },
  { id: 'timeline', label: 'Đề xuất & kịch bản', href: '/workspace', group: 'Thống nhất', icon: 1 },
  { id: 'contract', label: 'Hợp đồng', href: '/contract', icon: 5 },
  { id: 'billing', label: 'Thanh toán & công nợ', href: '/billing', icon: 8 },
  { id: 'guests', label: 'Khách mời', href: '/guests', group: 'Sau đặt cọc', icon: 6 },
  { id: 'seating', label: 'Sơ đồ bàn', href: '/seating', icon: 7 },
  { id: 'appendices', label: 'Phụ lục hợp đồng', href: '/appendices', icon: 5 },
  {
    id: 'media',
    label: 'Thư viện ảnh',
    href: '/invitations?tab=media',
    group: 'Thiệp cưới',
    icon: 2,
  },
  { id: 'design', label: 'Mẫu & biên tập', href: '/invitations?tab=design', icon: 3 },
  { id: 'publish', label: 'Xuất bản', href: '/invitations?tab=publish', icon: 4 },
  { id: 'print', label: 'Đặt in', href: '/invitations?tab=print', icon: 5 },
  { id: 'invoices', label: 'Phát sinh & hoá đơn', href: '/invoices', group: 'Quyết toán', icon: 8 },
  { id: 'notifications', label: 'Thông báo', href: '/notifications', icon: 4 },
];
function Icon({ index = 0 }: { index?: number }) {
  const shapes = [
    <path key="calendar" d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />,
    <path key="clock" d="M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
    <path key="image" d="M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M16 7h.01" />,
    <path key="layout" d="M3 3h18v18H3ZM8 3v18M8 9h13" />,
    <path key="send" d="m3 3 18 9-18 9 3-9-3-9Zm3 9h15" />,
    <path key="file" d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8m-8 4h8" />,
    <path
      key="users"
      d="M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 2a4 4 0 0 1 0 7m3 9v-3a4 4 0 0 0-3-4"
    />,
    <path key="map" d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15" />,
    <path key="card" d="M3 5h18v14H3Zm0 5h18" />,
  ];
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[index % shapes.length]}
    </svg>
  );
}
/**
 * Chuông thông báo: chỉ hiện số khi đã đăng nhập. Không làm phiền người chưa đăng nhập
 * (không gọi API nếu phiên chưa có) và bỏ qua lỗi vì đây chỉ là thông tin phụ.
 */
function UnreadBell() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void browserSession.restore().then(async (snapshot) => {
      if (snapshot.status !== 'authenticated') return;
      try {
        const value = await browserSession.authorize((token) => notificationApi.unreadCount(token));
        if (active) setCount(value);
      } catch {
        // Bỏ qua: chuông chỉ là thông tin phụ.
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Link href="/notifications" aria-label={count ? `${count} thông báo chưa đọc` : 'Thông báo'}>
      <span aria-hidden="true">🔔</span>
      {count ? <span className="cw-badge">{count > 99 ? '99+' : count}</span> : null}
    </Link>
  );
}

export function WorkspaceShell({
  children,
  active = 'overview',
  bookingId,
}: {
  children: ReactNode;
  active?: Section;
  bookingId?: string | undefined;
}) {
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('bookingId');
    if (id) queueMicrotask(() => setQuery(id));
  }, []);
  const selected = bookingId ?? query;
  const href = (path: string) =>
    path +
    (selected
      ? (path.includes('?') ? '&' : '?') + 'bookingId=' + encodeURIComponent(selected)
      : '');
  return (
    <div className="v0-workspace">
      <div className="app-shell">
        <a className="skip-link" href="#couple-workspace-content">
          Đi đến nội dung chính
        </a>
        <header className="topbar">
          <button
            className="mobile-menu"
            type="button"
            aria-label={menu ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menu}
            aria-controls="couple-workspace-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? '×' : '☰'}
          </button>
          <Link className="brand" href="/overview">
            <span>ngày chung đôi</span>
            <strong>WEDDING</strong>
          </Link>
          <div className="booking-context">
            <span>Không gian chuẩn bị tiệc cưới</span>
            {selected ? (
              <>
                <i aria-hidden="true" />
                <span>
                  Hồ sơ: <strong>{selected.slice(0, 8)}</strong>
                </span>
              </>
            ) : null}
          </div>
          <div className="top-actions">
            <UnreadBell />
            <Link href="/account" aria-label="Hồ sơ và bảo mật">
              <span className="avatar">T</span>
            </Link>
          </div>
        </header>
        <div className={'app-body' + (menu ? ' menu-open' : '')}>
          <aside className="sidebar" id="couple-workspace-navigation">
            <div className="workspace-label">Không gian chuẩn bị</div>
            <nav aria-label="Điều hướng không gian cặp đôi">
              {nav.map((item) => (
                <div key={item.id}>
                  {item.group && <div className="nav-section">{item.group}</div>}
                  <Link
                    className={'nav-item' + (active === item.id ? ' active' : '')}
                    aria-current={active === item.id ? 'page' : undefined}
                    href={href(item.href)}
                    onClick={() => setMenu(false)}
                  >
                    <Icon index={item.icon} />
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <Link className="help-link" href="/consultation">
                Cần hỗ trợ?
              </Link>
            </div>
          </aside>
          <div className="content" id="couple-workspace-content">
            <div className="content-inner">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
