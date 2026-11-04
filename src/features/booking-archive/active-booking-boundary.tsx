'use client';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { archiveRead, navigationSchema } from './archive-api';
import { ArchivedBookingError } from '../../lib/api/booking-navigation';
import { useLiveRefresh } from '../realtime/use-live-refresh';
type Selection = { id: string | null; archive: boolean };
// Isolate the search-param observer: public page content retains server rendering.
function BookingSelectionObserver({
  onChange,
}: Readonly<{ onChange: (selection: Selection) => void }>) {
  const pathname = usePathname(),
    params = useSearchParams(),
    id = params.get('bookingId');
  useEffect(() => {
    onChange({ id, archive: pathname === '/tiec-da-huy' });
  }, [id, pathname, onChange]);
  return null;
}
export function ActiveBookingBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const id = selection?.id ?? null,
    enabled = Boolean(id && /^[0-9a-f-]{36}$/i.test(id) && !selection?.archive);
  const [checked, setChecked] = useState<string | null>(null),
    [closed, setClosed] = useState<string | null>(null);
  useLiveRefresh(
    async (isCurrent) => {
      if (!id) return;
      try {
        const state = await archiveRead(`/bookings/${id}/navigation`, navigationSchema);
        if (isCurrent()) {
          if (state.phase === 'CANCELLED') setClosed(id);
          else setChecked(id);
        }
      } catch (error) {
        if (isCurrent()) {
          if (error instanceof ArchivedBookingError) setClosed(id);
          else setChecked(id);
        }
      }
    },
    {
      scope: `navigation:${id}`,
      bookingId: id,
      enabled,
      initial: true,
      types: ['booking.updated'],
    },
  );
  const blocked = enabled && (checked !== id || closed === id);
  return (
    <>
      <Suspense fallback={null}>
        <BookingSelectionObserver onChange={setSelection} />
      </Suspense>
      {blocked ? (
        <p
          role="status"
          className="fixed left-1/2 top-4 z-[150] -translate-x-1/2 rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm"
        >
          Đang mở hồ sơ tiệc…
        </p>
      ) : null}
      <div className="contents" inert={blocked} aria-busy={blocked}>
        {enabled && closed === id ? null : children}
      </div>
    </>
  );
}
