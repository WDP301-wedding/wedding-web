'use client';

import { ChevronDown, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { cn } from 'cn';

import { buttonVariants } from '../../components/ui/button';
import { routes } from '../../routes';
import { browserSession } from '../identity-access/browser-session';
import type { WebIdentitySession } from '../identity-access/session';
import { container } from './public-classes';
import { usePublicHeader } from './use-public-header';

// Gạch chân chạy từ trái sang khi rê chuột; đứng yên ở mục ứng với phần trang đang xem (data-active).
const navLink =
  "relative inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-medium text-foreground transition-colors after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-hy-emphasized after:content-[''] hover:text-primary hover:after:scale-x-100 data-active:text-primary data-active:after:scale-x-100 motion-reduce:after:transition-none";
const menuItem =
  'flex h-10 w-full items-center rounded-lg px-3 text-left text-sm text-foreground transition-colors hover:bg-secondary disabled:opacity-50';

/** Trang đã cuộn khỏi mép trên → header trong suốt chuyển sang nền kem. */
function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}
const isScrolled = () => window.scrollY > 16;
/** Chữ trắng khi header nằm trên ảnh hero (chỉ màn rộng; màn hẹp menu xổ xuống có nền kem). */
const onImage = 'lg:text-white lg:hover:text-white';

/**
 * Phần trang đang nằm giữa màn hình (các mục gắn `data-nav` trên trang chủ) → tô mục menu tương ứng.
 * IntersectionObserver với vùng quan sát là dải hẹp giữa màn hình, không cần đo vị trí khi cuộn.
 */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-nav]');
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = (entry.target as HTMLElement).dataset.nav ?? null;
          setActive((current) => (entry.isIntersecting ? name : current === name ? null : current));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);
  return active;
}

export function PublicHeader({
  className,
  overlay = false,
  session = browserSession,
  onLogout,
  pending = false,
  restoreSession = true,
  showOffers = false,
}: {
  className?: string;
  /** Nằm đè lên ảnh hero: trong suốt, chữ trắng cho tới khi người dùng cuộn trang. */
  overlay?: boolean;
  session?: WebIdentitySession;
  onLogout?: () => void;
  pending?: boolean;
  restoreSession?: boolean;
  /** Chỉ hiện mục "Ưu đãi" khi nhà hàng có ưu đãi thật (src/content/public-content.ts). */
  showOffers?: boolean;
}) {
  const { snapshot, error, menuRef, userMenuOpen, setUserMenuOpen, busy, logout } = usePublicHeader(
    { session, onLogout, pending, restoreSession },
  );
  const navId = useId();
  const [navOpen, setNavOpen] = useState(false);
  // Trên điện thoại menu xổ xuống: bấm một liên kết thì thu menu lại.
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) setNavOpen(false);
  };
  const scrolled = useSyncExternalStore(subscribeScroll, isScrolled, () => false);
  const clear = overlay && !scrolled && !navOpen;
  const link = cn(navLink, clear && onImage);
  const active = useActiveSection();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-300 motion-reduce:transition-none',
        clear
          ? 'border-transparent bg-transparent text-white'
          : 'border-border bg-background/90 shadow-[0_4px_20px_rgb(43_29_34/0.06)] backdrop-blur-md',
        className,
      )}
    >
      <div className={cn(container, 'relative flex h-16 items-center gap-2 lg:h-18')}>
        <Link
          className="flex shrink-0 items-center gap-2.5"
          href={routes.home}
          aria-label="Hỷ Yến — Trang chủ"
        >
          <Image
            className={cn('h-10 w-auto', clear && 'brightness-0 invert')}
            src="/images/hy-yen-logo.png"
            alt="Hỷ Yến Wedding"
            width={394}
            height={414}
            loading="eager"
          />
          <span className="text-lg font-bold" aria-hidden="true">
            Hỷ Yến
          </span>
        </Link>

        <nav
          id={navId}
          aria-label="Điều hướng chính"
          onClick={closeOnLink}
          className={cn(
            'items-center gap-1 lg:ml-auto lg:flex',
            navOpen
              ? 'flex animate-in flex-col items-stretch border-b border-border bg-background p-3 shadow-hy-2 duration-200 fade-in slide-in-from-top-1 max-lg:absolute max-lg:inset-x-0 max-lg:top-full lg:flex-row lg:items-center lg:border-0 lg:p-0 lg:shadow-none'
              : 'hidden',
          )}
        >
          <Link className={link} href={routes.halls} data-active={active === 'halls' || undefined}>
            Sảnh tiệc
          </Link>
          <Link className={link} href={routes.menus} data-active={active === 'menus' || undefined}>
            Thực đơn
          </Link>
          {showOffers ? (
            <Link className={link} href="/#uu-dai">
              Ưu đãi
            </Link>
          ) : null}
          <Link className={link} href="/#hoi-dap" data-active={active === 'faq' || undefined}>
            Câu hỏi thường gặp
          </Link>

          {snapshot.status === 'authenticated' ? (
            <>
              <Link className={cn(navLink, 'text-primary', clear && onImage)} href={routes.space}>
                Không gian cưới
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className={cn(link, 'gap-2 pr-2.5 pl-1.5')}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  aria-label={`Tài khoản ${snapshot.actor.displayEmail}`}
                  onClick={() => setUserMenuOpen((open) => !open)}
                >
                  <span
                    className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary"
                    aria-hidden="true"
                  >
                    {snapshot.actor.displayEmail.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-44 truncate">{snapshot.actor.displayEmail}</span>
                  <ChevronDown
                    className={cn(
                      'size-4 opacity-60 transition-transform duration-200',
                      userMenuOpen && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </button>
                {userMenuOpen ? (
                  <div
                    className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right animate-in rounded-xl border border-border bg-popover p-1.5 shadow-hy-2 duration-150 fade-in zoom-in-95"
                    role="menu"
                    aria-label="Menu tài khoản"
                  >
                    <div className="flex flex-col px-3 py-2">
                      <strong className="truncate text-sm">{snapshot.actor.displayEmail}</strong>
                      <span className="text-xs text-muted-foreground">Cặp đôi Hỷ Yến</span>
                    </div>
                    <Link
                      className={menuItem}
                      href="/tiec-da-huy"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Tiệc đã hủy
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <Link
                      className={menuItem}
                      href={routes.space}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Không gian cưới của bạn
                    </Link>
                    <Link
                      className={menuItem}
                      href={routes.profile}
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Hồ sơ & Bảo mật
                    </Link>
                    <div className="my-1 h-px bg-border" />
                    <button
                      className={cn(menuItem, 'text-hy-error hover:bg-hy-error-bg')}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void logout();
                      }}
                      disabled={busy}
                    >
                      {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link className={link} href={routes.login}>
              Đăng nhập
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-2">
          <Link className={buttonVariants({ size: 'sm' })} href={routes.consultation}>
            Nhận tư vấn
          </Link>
          <button
            type="button"
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-lg lg:hidden',
              clear ? 'hover:bg-white/15' : 'text-foreground hover:bg-secondary',
            )}
            aria-expanded={navOpen}
            aria-controls={navId}
            aria-label={navOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            onClick={() => setNavOpen((open) => !open)}
          >
            {navOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {error ? (
        <p className={cn(container, 'pb-3 text-sm text-hy-error')} role="alert">
          {error}
        </p>
      ) : null}
    </header>
  );
}
