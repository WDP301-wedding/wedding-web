'use client';
import { ConnectionFeedback } from '../realtime/connection-feedback';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { withBooking } from '../../routes';
import { useSpaceExtras } from './space-provider';
import { useCoupleWorkspace } from './use-couple-workspace';
import { navChips } from './space-nav-config';
import { SpaceBottomNav } from './space-bottom-nav';
import { SpaceBookingSwitcherSheet, SpaceMoreSheet } from './space-mobile-sheets';
import { SpaceSidebar } from './space-sidebar';
import { SpaceTopbar } from './space-topbar';

export { navChips } from './space-nav-config';

/**
 * Khung "Không gian cưới": sidebar 5 mục theo hành trình + chip trạng thái,
 * thanh trên có thông tin tiệc và chuông, điện thoại có bottom nav + "Thêm".
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

  const proposal = state.status === 'ready' ? state.proposal : undefined;
  const summary = bookings.find((booking) => booking.bookingId === effectiveBookingId);
  const chips = navChips(summary, proposal);
  const href = (path: string) => withBooking(path, effectiveBookingId);
  const phone = restaurant?.publicPhone ?? null;
  const switchBooking = (id: string) => router.push(withBooking(pathname, id));

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        className="sr-only z-[130] rounded-lg bg-card px-4 py-2 text-sm font-semibold text-primary shadow-hy-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#space-content"
      >
        Đi đến nội dung chính
      </a>
      <SpaceSidebar pathname={pathname} href={href} chips={chips} unread={unread} phone={phone} />

      <div className="relative flex min-w-0 flex-col">
        <SpaceTopbar
          summary={summary}
          proposal={proposal}
          bookings={bookings}
          bookingId={bookingId}
          unread={unread}
          href={href}
          switcherOpen={switcherOpen}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onSwitch={switchBooking}
        />
        <main
          id="space-content"
          className="mx-auto w-full max-w-[1240px] min-w-0 px-4 pt-4 pb-24 sm:px-6 lg:px-10 lg:pt-6 lg:pb-12 has-data-wide:max-w-[1560px]"
        >
          {state.status !== 'loading' && state.status !== 'anonymous' ? (
            <ConnectionFeedback />
          ) : null}
          {/* Hiệu ứng vào bằng CSS, key theo đường dẫn. Không dùng <ViewTransition> ở layout này:
              Suspense của loading.tsx bên trong sẽ chỉ hiện nội dung khi view transition chạy xong. */}
          <div
            key={pathname}
            className="animate-in duration-300 ease-hy-decelerate fade-in fill-mode-backwards slide-in-from-bottom-2 motion-reduce:animate-none"
          >
            {children}
          </div>
        </main>
      </div>

      <SpaceBottomNav
        pathname={pathname}
        href={href}
        unread={unread}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((value) => !value)}
      />

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
        onSelectBooking={switchBooking}
        switcherOpen={switcherOpen}
      />
    </div>
  );
}
