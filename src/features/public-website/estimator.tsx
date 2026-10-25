'use client';

import Link from 'next/link';
import { useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';

import { minimumPreferredDate } from './consultation-date';
import { consultationHref, formatVnd, menuEstimates, suitableHalls, tableCount } from './estimate';
import type { Hall, Menu, Restaurant } from './public-api';
import { CatalogImage } from './catalog-image';
import { HeroVideo } from './hero-video';
import { DatePicker } from '../../design-system/date-picker';
import { fallbackShifts } from '../../content/public-content';

type Shift = 'LUNCH' | 'DINNER';
type Estimate = Readonly<{ date: string; guests: number; shift: Shift }>;

const noSubscribe = () => () => undefined;

const formatDate = (iso: string) => iso.split('-').reverse().join('/');
export const shiftName = (code: Shift) => (code === 'LUNCH' ? 'Ca trưa' : 'Ca tối');

/**
 * A2 · Hero + "Ước tính tiệc của bạn" (P2 – plan first).
 *
 * Toàn bộ phép tính chạy trên trình duyệt từ catalog đã có sẵn trong HTML (Server Component
 * truyền xuống) → bấm "Xem ước tính" ra kết quả ngay, không gọi API, không giữ chỗ.
 * `intro` là phần chữ của hero, do Server Component render rồi truyền vào (giữ SEO).
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
  }

  return (
    <>
      <section className="hy-hero" aria-labelledby={`${formId}-title`}>
        <HeroVideo />
        <div className="hy-hero-copy">{intro}</div>
        <form className="hy-estimator" onSubmit={submit} aria-labelledby={`${formId}-title`}>
          <h2 id={`${formId}-title`}>Ước tính tiệc của bạn</h2>
          <div className="hy-estimator-row">
            <label>
              Ngày
              <DatePicker name="date" min={minimumDate} />
            </label>
            <label>
              Số khách
              <input
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
          <fieldset className="hy-shift-picker">
            <legend className="visually-hidden">Ca tiệc</legend>
            {shifts.map((item) => (
              <label key={item.code} className={shift === item.code ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="shift"
                  value={item.code}
                  checked={shift === item.code}
                  onChange={() => setShift(item.code)}
                />
                <strong>{shiftName(item.code)}</strong>
                <small>
                  {item.startTime} – {item.endTime}
                </small>
              </label>
            ))}
          </fieldset>
          {error ? (
            <p className="hy-field-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button" type="submit">
            Xem ước tính
          </button>
        </form>
      </section>
      {estimate ? (
        <EstimateResult
          key={`${estimate.date}|${estimate.guests}|${estimate.shift}`}
          estimate={estimate}
          halls={halls}
          menus={menus}
        />
      ) : null}
    </>
  );
}

function EstimateResult({
  estimate,
  halls,
  menus,
}: Readonly<{ estimate: Estimate; halls: readonly Hall[]; menus: readonly Menu[] }>) {
  const fitting = suitableHalls(halls, estimate.guests);
  const costs = menuEstimates(menus, estimate.guests);
  const tables = tableCount(estimate.guests);
  const [hallId, setHallId] = useState<string | undefined>(fitting[0]?.id);
  // Mặc định chọn thực đơn ở giữa (thường là gói được chọn nhiều) nếu có ≥ 3 gói.
  const [menuId, setMenuId] = useState<string | undefined>(
    costs[Math.min(1, costs.length - 1)]?.menu.id,
  );
  const selectedHall = fitting.find((hall) => hall.id === hallId) ?? fitting[0];
  return (
    <section className="hy-estimate" aria-live="polite" aria-labelledby="estimate-title">
      <header className="hy-estimate-head">
        <h2 id="estimate-title">
          {estimate.guests} khách · {tables} bàn · {shiftName(estimate.shift)}
          {estimate.date ? ` ${formatDate(estimate.date)}` : ''}
        </h2>
        <span className="hy-chip is-info">Ước tính – chưa giữ chỗ</span>
      </header>
      <div className="hy-estimate-grid">
        <fieldset className="hy-estimate-halls">
          <legend>1 · Sảnh vừa sức chứa</legend>
          {fitting.length === 0 ? (
            <p className="hy-muted">
              Chưa có sảnh nào đủ {estimate.guests} khách. Gửi yêu cầu để quản lý tiệc tư vấn phương
              án phù hợp.
            </p>
          ) : (
            <div className="hy-estimate-hall-list">
              {fitting.map((hall, index) => (
                <label
                  key={hall.id}
                  className={
                    'hy-estimate-hall' + (hall.id === selectedHall?.id ? ' is-selected' : '')
                  }
                >
                  <CatalogImage
                    media={hall.media[0]}
                    sizes="(max-width: 720px) 100vw, 240px"
                    placeholder={hall.name}
                  />
                  {index === 0 ? <span className="hy-chip is-success">Vừa nhất</span> : null}
                  <span className="hy-estimate-hall-name">
                    <input
                      type="radio"
                      name="estimate-hall"
                      value={hall.id}
                      checked={hall.id === selectedHall?.id}
                      onChange={() => setHallId(hall.id)}
                    />
                    <strong>{hall.name}</strong>
                  </span>
                  <small>
                    Tối đa {hall.maxGuests} khách · còn {hall.maxGuests - estimate.guests} chỗ
                  </small>
                  <Link href={`/sanh/${hall.id}`}>Xem sảnh →</Link>
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset className="hy-estimate-menus">
          <legend>2 · Chi phí ước tính theo thực đơn · {tables} bàn</legend>
          {costs.length === 0 ? (
            <p className="hy-muted">Thực đơn đang được cập nhật.</p>
          ) : (
            costs.map(({ menu, totalVnd }) => (
              <label
                key={menu.id}
                className={'hy-estimate-menu' + (menu.id === menuId ? ' is-selected' : '')}
              >
                <input
                  type="radio"
                  name="estimate-menu"
                  value={menu.id}
                  checked={menu.id === menuId}
                  onChange={() => setMenuId(menu.id)}
                />
                <span>
                  <strong>{menu.name}</strong>
                  <small>
                    {tables} bàn × {formatVnd(menu.priceVndPerTable)}
                  </small>
                </span>
                <strong className="hy-money">{formatVnd(totalVnd)}</strong>
              </label>
            ))
          )}
          <p className="hy-muted hy-small">
            Số bàn = số khách ÷ 10, làm tròn lên. Chưa gồm dịch vụ (MC, trang trí), đồ in và VAT.
            Giá chốt theo hợp đồng sau buổi tư vấn.
          </p>
          <Link
            className="button"
            href={consultationHref({
              hallId: selectedHall?.id,
              menuId,
              date: estimate.date || undefined,
              guests: estimate.guests,
              shift: estimate.shift,
            })}
          >
            Gửi yêu cầu tư vấn với lựa chọn này →
          </Link>
        </fieldset>
      </div>
    </section>
  );
}
