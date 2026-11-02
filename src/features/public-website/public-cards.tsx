import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';

import { CatalogImage } from './catalog-image';
import { consultationHref, formatVnd } from './estimate';
import type { Hall, Menu, Restaurant } from './public-api';
import { arrowLink, card, container, lift, zoom } from './public-classes';

export function Unavailable({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null;
  return (
    <div className={cn(container, 'pt-6')}>
      <p className="rounded-lg bg-hy-warning-bg px-4 py-3 text-sm text-hy-warning" role="status">
        Chưa tải được đầy đủ thông tin nhà hàng. Trang sẽ tự cập nhật sau ít phút — bạn vẫn có thể
        gửi yêu cầu tư vấn.
      </p>
    </div>
  );
}

export function HallCard({ hall, priority = false }: Readonly<{ hall: Hall; priority?: boolean }>) {
  return (
    <article className={cn(card, lift, 'group relative flex h-full flex-col')}>
      <CatalogImage
        media={hall.media[0]}
        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 400px"
        priority={priority}
        placeholder="Ảnh sảnh đang được cập nhật"
        className={cn('aspect-[16/10]', zoom)}
      />
      <div className="flex flex-col gap-1 p-5">
        <h3 className="text-lg font-bold">
          {/* Cả thẻ bấm được nhờ lớp phủ ::after của liên kết tên sảnh. */}
          <Link className="after:absolute after:inset-0" href={`/sanh/${hall.id}`}>
            {hall.name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground tabular-nums">Tối đa {hall.maxGuests} khách</p>
        {hall.description ? <p className="line-clamp-3 text-sm">{hall.description}</p> : null}
      </div>
    </article>
  );
}

export function MenuCard({ menu }: Readonly<{ menu: Menu }>) {
  return (
    <article className={cn(card, lift, 'flex flex-col gap-2 p-6')}>
      <h3 className="text-lg font-bold">{menu.name}</h3>
      <strong className="text-xl font-bold text-primary tabular-nums">
        {formatVnd(menu.priceVndPerTable)}
        <span className="text-sm font-medium text-muted-foreground">/bàn</span>
      </strong>
      {menu.description ? (
        <p className="line-clamp-3 text-sm text-muted-foreground">{menu.description}</p>
      ) : null}
      <Link className={cn(arrowLink, 'mt-auto pt-2')} href={consultationHref({ menuId: menu.id })}>
        Tư vấn với thực đơn này
        <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

export function Contact({ restaurant }: Readonly<{ restaurant: Restaurant | null }>) {
  if (!restaurant) return null;
  return (
    <address className="flex flex-col gap-0.5 rounded-xl bg-muted p-4 text-sm not-italic">
      <strong>{restaurant.displayName}</strong>
      {restaurant.address ? (
        <span className="text-muted-foreground">{restaurant.address}</span>
      ) : null}
      {restaurant.publicPhone ? (
        <a
          className="inline-block py-1 font-semibold text-primary"
          href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}
        >
          Hotline: {restaurant.publicPhone}
        </a>
      ) : null}
      {restaurant.publicEmail ? (
        <a className="inline-block py-1 text-primary" href={`mailto:${restaurant.publicEmail}`}>
          {restaurant.publicEmail}
        </a>
      ) : null}
    </address>
  );
}
