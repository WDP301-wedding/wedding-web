import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from 'cn';

import { CatalogImage } from './catalog-image';
import { formatVnd } from './estimate';
import type { Hall, Menu, Restaurant } from './public-api';
import { arrowLink, container, lift, zoom } from './public-classes';

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

/** Thẻ sảnh: ảnh lớn phủ kín, tên và sức chứa nằm trên dải tối phía dưới. Cả thẻ bấm được. */
export function HallCard({
  hall,
  priority = false,
  ...rest
}: Readonly<{ hall: Hall; priority?: boolean }> & ComponentProps<'article'>) {
  return (
    <article
      {...rest}
      className={cn(
        lift,
        'group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl bg-hy-ink text-white ring-1 ring-transparent hover:ring-hy-champagne/70',
      )}
    >
      <CatalogImage
        media={hall.media[0]}
        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 420px"
        priority={priority}
        placeholder="Ảnh sảnh đang được cập nhật"
        className={cn('absolute inset-0 -z-20', zoom)}
      />
      <div
        className="absolute inset-0 -z-10 bg-linear-to-t from-hy-ink/90 via-hy-ink/30 to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-end justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-col gap-1 transition-transform duration-300 ease-hy-emphasized group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
          <h3 className="text-lg font-semibold">
            {/* Cả thẻ bấm được nhờ lớp phủ ::after của liên kết tên sảnh. */}
            <Link className="after:absolute after:inset-0" href={`/sanh/${hall.id}`}>
              {hall.name}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-white/90 tabular-nums">
            <Users className="size-3.5" aria-hidden="true" />
            Tối đa {hall.maxGuests} khách
          </p>
          {hall.description ? (
            <p className="line-clamp-2 text-xs text-white/80">{hall.description}</p>
          ) : null}
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-primary transition-transform duration-250 ease-hy-emphasized group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <ArrowRight className="size-4" />
        </span>
      </div>
    </article>
  );
}

/** Thẻ thực đơn: ảnh món ăn là chính; bấm vào để xem danh sách món ở trang Thực đơn. */
export function MenuCard({ menu, ...rest }: Readonly<{ menu: Menu }> & ComponentProps<'article'>) {
  return (
    <article {...rest} className="group relative flex flex-col gap-3">
      <CatalogImage
        media={menu.media[0]}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
        placeholder="Ảnh thực đơn đang được cập nhật"
        className={cn(
          'aspect-[4/3] rounded-xl transition-shadow duration-300 group-hover:shadow-[0_12px_32px_rgb(43_29_34/0.14)] motion-reduce:transition-none',
          zoom,
        )}
      />
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">
          <Link className="after:absolute after:inset-0" href={`/thuc-don#${menu.id}`}>
            {menu.name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          <strong className="font-semibold text-primary">{formatVnd(menu.priceVndPerTable)}</strong>{' '}
          / bàn 10 khách
        </p>
        {menu.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{menu.description}</p>
        ) : null}
        <span className={cn(arrowLink, 'pt-1')} aria-hidden="true">
          Xem chi tiết
          <ArrowRight />
        </span>
      </div>
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
