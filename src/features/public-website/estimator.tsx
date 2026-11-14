'use client';

import { ArrowRight, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import { useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { cn } from 'cn';

import { Button } from '../../components/ui/button';
import { fallbackShifts } from '../../content/public-content';
import { DatePicker } from '../../design-system/date-picker';
import { minimumPreferredDate } from './consultation-date';
import { EstimateModal } from './estimate-modal';
import { formatDate, shiftName, tableCount, type Estimate, type Shift } from './estimate';
import type { Hall, Menu, Restaurant } from './public-api';
import { choice, container, control, field } from './public-classes';

const noSubscribe = () => () => undefined;

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
      {/* -mt: ảnh hero tràn lên dưới header trong suốt (PublicHeader overlay). */}
      <section
        className="relative isolate -mt-16 overflow-hidden bg-hy-ink text-white lg:-mt-18"
        aria-labelledby={`${formId}-title`}
      >
        <Image
          className="hy-hero-image -z-20 object-cover"
          src="/images/khoanh-khac/khach-du-tiec.webp"
          alt=""
          fill
          priority
          sizes="100vw"
        />
        {/* Lớp phủ: tối bên trái cho chữ, sáng dần sang phải để vẫn thấy không gian sảnh. */}
        <div
          className="absolute inset-0 -z-10 bg-hy-ink/65 lg:bg-[linear-gradient(90deg,rgb(43_29_34/0.74),rgb(43_29_34/0.38)_50%,rgb(43_29_34/0.12))]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b from-hy-ink/60 to-transparent"
          aria-hidden="true"
        />
        <div
          className={cn(
            container,
            'grid items-center gap-10 pt-28 pb-14 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pt-36 lg:pb-24',
          )}
        >
          <div className="flex max-w-3xl flex-col gap-5 lg:gap-6">{intro}</div>
          {/* id: đích của nút "Tìm sảnh phù hợp". Bảng hiện sau phần chữ: mờ dần + nở nhẹ. */}
          <form
            id="tim-sanh"
            className="flex animate-in scroll-mt-24 flex-col gap-4 rounded-2xl bg-background p-5 text-foreground shadow-[0_24px_48px_rgb(43_29_34/0.28)] duration-700 ease-hy-decelerate fill-mode-backwards fade-in zoom-in-95 sm:p-7 motion-reduce:animate-none"
            style={{ animationDelay: '450ms' }}
            onSubmit={submit}
            aria-labelledby={`${formId}-title`}
          >
            <h2 id={`${formId}-title`} className="text-lg font-semibold">
              Ước tính tiệc của bạn
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <label className={field}>
                Ngày tổ chức
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
              {shifts.map((item) => {
                const Icon = item.code === 'LUNCH' ? Sun : Moon;
                return (
                  <label key={item.code} className={cn(choice, 'flex-row items-center gap-2.5')}>
                    <input
                      className="sr-only"
                      type="radio"
                      name="shift"
                      value={item.code}
                      checked={shift === item.code}
                      onChange={() => setShift(item.code)}
                    />
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground group-has-checked:text-primary"
                      aria-hidden="true"
                    />
                    <span className="flex flex-col">
                      <strong className="text-sm group-has-checked:text-primary">
                        {shiftName(item.code)}
                      </strong>
                      <small className="text-xs text-muted-foreground tabular-nums">
                        {item.startTime} – {item.endTime}
                      </small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg">
              Xem ước tính
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        </div>
        {/* Mép dưới hero cong nhẹ, chuyển sang nền kem của mục kế tiếp thay vì cắt ngang. */}
        <svg
          className="absolute inset-x-0 -bottom-px h-5 w-full text-background lg:h-9"
          viewBox="0 0 1440 36"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="currentColor" d="M0 36V30Q720-18 1440 30V36Z" />
        </svg>
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
