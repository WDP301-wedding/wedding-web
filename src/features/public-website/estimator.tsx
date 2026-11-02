'use client';

import Image from 'next/image';
import { useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { fallbackShifts } from '../../content/public-content';
import { DatePicker } from '../../design-system/date-picker';
import { minimumPreferredDate } from './consultation-date';
import { EstimateModal } from './estimate-modal';
import { formatDate, shiftName, tableCount, type Estimate, type Shift } from './estimate';
import { HeroVideo } from './hero-video';
import type { Hall, Menu, Restaurant } from './public-api';
import { choice, container, control, field } from './public-classes';

const noSubscribe = () => () => undefined;
/** Chữ và form hero hiện dần một lần khi mở trang. */
const rise =
  'animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards duration-700 ease-hy-decelerate motion-reduce:animate-none';

/**
 * A2 · Hero + "Ước tính tiệc của bạn" (P2 – plan first).
 *
 * Toàn bộ phép tính chạy trên trình duyệt từ catalog đã có sẵn trong HTML (Server Component
 * truyền xuống) → bấm "Xem ước tính" mở hộp thoại Modal/Bottom-Sheet ngay giữa màn hình,
 * không bị che khuất dưới nếp gấp trên màn hình nhỏ/laptop.
 */
export function EstimatorHero({
  intro,
  halls,
  menus,
  restaurant,
}: Readonly<{
  intro: ReactNode;
  halls: readonly Hall[];
  menus: readonly Menu[];
  restaurant: Restaurant | null;
}>) {
  const formId = useId();
  // Ngày tối thiểu theo giờ Việt Nam phụ thuộc "hôm nay" → chỉ tính trên trình duyệt.
  const minimumDate = useSyncExternalStore(noSubscribe, minimumPreferredDate, () => '');
  const [shift, setShift] = useState<Shift>('LUNCH');
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chưa tải được catalog → dùng giờ ca nhà hàng công bố (content.md), không tự bịa giờ.
  const shifts = restaurant?.shifts.length ? restaurant.shifts : fallbackShifts;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawDate = form.get('date');
    const date = typeof rawDate === 'string' ? rawDate : '';
    const guests = Number(form.get('guests'));
    if (!Number.isInteger(guests) || guests < 1 || guests > 10_000) {
      setError('Nhập số khách từ 1 đến 10.000.');
      return;
    }
    if (date && date < minimumPreferredDate()) {
      setError('Chọn ngày từ ngày mốt trở đi (theo giờ Việt Nam).');
      return;
    }
    setError(null);
    setEstimate({ date, guests, shift });
    setIsModalOpen(true);
  }

  return (
    <>
      <section
        className="relative isolate overflow-hidden bg-hy-ink text-white"
        aria-labelledby={`${formId}-title`}
      >
        <Image
          className="-z-20 object-cover"
          src="/images/hero-sanh-tiec.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        <HeroVideo />
        <div
          className="absolute inset-0 -z-10 bg-hy-ink/75 lg:bg-[linear-gradient(90deg,rgb(43_29_34/0.85),rgb(43_29_34/0.62)_55%,rgb(43_29_34/0.4))]"
          aria-hidden="true"
        />
        <div
          className={cn(
            container,
            'grid items-center gap-8 pt-10 pb-12 lg:min-h-[600px] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:py-20',
          )}
        >
          <div className={cn(rise, 'flex max-w-2xl flex-col gap-4 lg:gap-5')}>{intro}</div>
          <form
            className={cn(
              rise,
              'flex flex-col gap-4 rounded-2xl bg-card p-5 text-foreground shadow-[0_24px_48px_rgb(43_29_34/0.24)] sm:p-7',
            )}
            style={{ animationDelay: '120ms' }}
            onSubmit={submit}
            aria-labelledby={`${formId}-title`}
          >
            <h2 id={`${formId}-title`} className="text-lg font-bold">
              Ước tính tiệc của bạn
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={field}>
                Ngày
                <DatePicker name="date" min={minimumDate} />
              </label>
              <label className={field}>
                Số khách
                <input
                  className={cn(control, 'tabular-nums')}
                  name="guests"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10000}
                  required
                  defaultValue={280}
                />
              </label>
            </div>
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="mb-1.5 text-xs font-semibold">Ca tiệc</legend>
              {shifts.map((item) => (
                <label key={item.code} className={choice}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="shift"
                    value={item.code}
                    checked={shift === item.code}
                    onChange={() => setShift(item.code)}
                  />
                  <strong className="text-sm group-has-checked:text-primary">
                    {shiftName(item.code)}
                  </strong>
                  <small className="text-xs text-muted-foreground tabular-nums">
                    {item.startTime} – {item.endTime}
                  </small>
                </label>
              ))}
            </fieldset>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg">
              Xem ước tính
            </Button>
          </form>
        </div>
      </section>

      {estimate ? (
        <aside
          data-estimate-banner
          className="fixed inset-x-0 bottom-0 z-30 animate-in border-t border-border bg-card/95 shadow-hy-2 duration-300 fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
          aria-label="Ước tính tiệc của bạn"
        >
          <div className={cn(container, 'flex flex-wrap items-center justify-between gap-3 py-3')}>
            <p className="text-sm">
              <strong>Ước tính tiệc của bạn:</strong>{' '}
              <span className="text-muted-foreground tabular-nums">
                {estimate.guests} khách · {tableCount(estimate.guests)} bàn ·{' '}
                {shiftName(estimate.shift)}
                {estimate.date ? ` (${formatDate(estimate.date)})` : ''}
              </span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
              Mở lại bảng ước tính
            </Button>
          </div>
        </aside>
      ) : null}

      {estimate && isModalOpen ? (
        <EstimateModal
          key={`${estimate.date}|${estimate.guests}|${estimate.shift}`}
          estimate={estimate}
          halls={halls}
          menus={menus}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  );
}
