import React from 'react';
import Link from 'next/link';
import { CatalogImage } from './catalog-image';
import { consultationHref, formatVnd } from './estimate';
import type { Hall, Menu, Restaurant } from './public-api';

export function Unavailable({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null;
  return (
    <p className="hy-notice" role="status">
      Chưa tải được đầy đủ thông tin nhà hàng. Trang sẽ tự cập nhật sau ít phút — bạn vẫn có thể gửi
      yêu cầu tư vấn.
    </p>
  );
}

export function HallCard({ hall, priority = false }: Readonly<{ hall: Hall; priority?: boolean }>) {
  return (
    <article className="hy-hall-card">
      <Link href={`/sanh/${hall.id}`} tabIndex={-1} aria-hidden="true">
        <CatalogImage
          media={hall.media[0]}
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 380px"
          priority={priority}
          placeholder="Ảnh sảnh đang được cập nhật"
        />
      </Link>
      <div className="hy-hall-card-copy">
        <h3>
          <Link href={`/sanh/${hall.id}`}>{hall.name}</Link>
        </h3>
        <p className="hy-muted">Tối đa {hall.maxGuests} khách</p>
        {hall.description ? <p className="hy-clamp">{hall.description}</p> : null}
      </div>
    </article>
  );
}

export function MenuCard({ menu }: Readonly<{ menu: Menu }>) {
  return (
    <article className="hy-menu-card">
      <h3>{menu.name}</h3>
      <strong className="hy-money">{formatVnd(menu.priceVndPerTable)}/bàn</strong>
      {menu.description ? <p className="hy-clamp">{menu.description}</p> : null}
      <Link href={consultationHref({ menuId: menu.id })}>Tư vấn với thực đơn này →</Link>
    </article>
  );
}

export function Contact({ restaurant }: Readonly<{ restaurant: Restaurant | null }>) {
  if (!restaurant) return null;
  return (
    <address className="hy-contact">
      <strong>{restaurant.displayName}</strong>
      {restaurant.address ? <span>{restaurant.address}</span> : null}
      {restaurant.publicPhone ? (
        <a href={`tel:${restaurant.publicPhone.replace(/[^+\d]/gu, '')}`}>
          Hotline: {restaurant.publicPhone}
        </a>
      ) : null}
      {restaurant.publicEmail ? (
        <a href={`mailto:${restaurant.publicEmail}`}>{restaurant.publicEmail}</a>
      ) : null}
    </address>
  );
}
