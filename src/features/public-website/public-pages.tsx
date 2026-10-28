import Link from 'next/link';
import { Suspense } from 'react';

import { Illustration } from '../../design-system/illustrations';
import { CatalogImage } from './catalog-image';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { consultationHref, formatVnd } from './estimate';
import { HallsFilter } from './halls-filter';
import type { Hall, Restaurant } from './public-api';
import { PublicShell } from './public-shell';
import { Contact, HallCard, Unavailable } from './public-cards';

export { HomePage } from './public-home-page';

/** A3 · Danh sách sảnh (lọc theo ?khach=). */
export function HallsPage({ catalog }: Readonly<{ catalog: Catalog }>) {
  const halls = catalog.halls.toSorted((left, right) => left.maxGuests - right.maxGuests);
  const cards = halls.map((hall, index) => ({
    id: hall.id,
    maxGuests: hall.maxGuests,
    card: <HallCard hall={hall} priority={index === 0} />,
  }));
  return (
    <PublicShell restaurant={catalog.restaurant}>
      <section className="hy-section hy-page-head">
        <p className="hy-kicker">Sảnh tiệc</p>
        <h1>Chọn nơi câu chuyện bắt đầu</h1>
        <p className="hy-muted">
          Nhập số khách để xem sảnh đủ chỗ. Ảnh và sức chứa do nhà hàng cập nhật.
        </p>
      </section>
      <Unavailable show={catalog.unavailable} />
      <section className="hy-section">
        {halls.length === 0 ? (
          <p className="hy-muted">
            Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.
          </p>
        ) : (
          // Fallback (trước khi JS chạy) vẫn hiện đủ sảnh → trang có nội dung ngay từ HTML.
          <Suspense
            fallback={
              <div className="hy-hall-grid">
                {cards.map((item) => (
                  <div key={item.id}>{item.card}</div>
                ))}
              </div>
            }
          >
            <HallsFilter items={cards} />
          </Suspense>
        )}
      </section>
    </PublicShell>
  );
}

/** A3 · Chi tiết sảnh. */
export function HallDetailPage({ hall, catalog }: Readonly<{ hall: Hall; catalog: Catalog }>) {
  const [cover, ...gallery] = hall.media;
  return (
    <PublicShell restaurant={catalog.restaurant}>
      <article className="hy-section hy-hall-detail">
        <nav aria-label="Đường dẫn" className="hy-breadcrumb">
          <Link href="/sanh">← Các sảnh tiệc</Link>
        </nav>
        <div className="hy-hall-detail-grid">
          <div className="hy-gallery">
            <CatalogImage
              media={cover}
              sizes="(max-width: 900px) 100vw, 720px"
              priority
              placeholder="Ảnh sảnh đang được cập nhật"
              className="hy-media hy-media-hero"
            />
            {gallery.length > 0 ? (
              <div className="hy-gallery-thumbs">
                {gallery.slice(0, 4).map((media) => (
                  <CatalogImage
                    key={media.id}
                    media={media}
                    sizes="180px"
                    placeholder={hall.name}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="hy-hall-detail-copy">
            <h1>{hall.name}</h1>
            <dl className="hy-stats">
              <div>
                <dt>Sức chứa tối đa</dt>
                <dd>{hall.maxGuests} khách</dd>
              </div>
              <div>
                <dt>Tương đương</dt>
                <dd>{Math.floor(hall.maxGuests / 10)} bàn</dd>
              </div>
            </dl>
            {hall.description ? <p>{hall.description}</p> : null}
            {catalog.menus.length > 0 ? (
              <>
                <h2>Thực đơn tham khảo</h2>
                <ul className="hy-detail-menus">
                  {catalog.menus.slice(0, 3).map((menu) => (
                    <li key={menu.id}>
                      <strong>{menu.name}</strong>
                      <span>{formatVnd(menu.priceVndPerTable)} / bàn</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="hy-sticky-cta">
              <Link className="button" href={consultationHref({ hallId: hall.id })}>
                Tư vấn sảnh này →
              </Link>
            </div>
          </div>
        </div>
      </article>
    </PublicShell>
  );
}

/** A4 · Thực đơn. */
export function MenusPage({ catalog }: Readonly<{ catalog: Catalog }>) {
  return (
    <PublicShell restaurant={catalog.restaurant}>
      <section className="hy-section hy-page-head">
        <p className="hy-kicker">Thực đơn tiệc</p>
        <h1>Hương vị cho ngày sum vầy</h1>
        <p className="hy-muted">
          Giá theo bàn 10 khách đang được nhà hàng công bố. Thực đơn và giá cho tiệc của bạn được
          thống nhất trong hợp đồng.
        </p>
      </section>
      <Unavailable show={catalog.unavailable} />
      <section className="hy-section">
        {catalog.menus.length === 0 ? (
          <div className="hy-empty-state">
            <Illustration name="empty-thuc-don" />
            <p className="hy-muted">
              Thực đơn đang được cập nhật. Nhà hàng sẵn sàng trao đổi về mong muốn của bạn.
            </p>
          </div>
        ) : (
          <div className="hy-menu-list">
            {catalog.menus.map((menu) => (
              <article key={menu.id} className="hy-menu-detail">
                <header>
                  <h2>{menu.name}</h2>
                  <strong className="hy-money">
                    {formatVnd(menu.priceVndPerTable)} <small>/ bàn</small>
                  </strong>
                  {menu.description ? <p>{menu.description}</p> : null}
                </header>
                <ol>
                  {menu.items.map((dish) => (
                    <li key={dish.dishVersionId}>
                      <span className="hy-muted hy-small">{dish.categoryLabel}</span>
                      <strong>{dish.name}</strong>
                      {dish.description ? <p>{dish.description}</p> : null}
                    </li>
                  ))}
                </ol>
                <Link className="button" href={consultationHref({ menuId: menu.id })}>
                  Tư vấn thực đơn này
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}

/** A2 · Gửi yêu cầu tư vấn (nhận lựa chọn qua query). */
export function ConsultationPage({ catalog }: Readonly<{ catalog: Catalog }>) {
  return (
    <PublicShell restaurant={catalog.restaurant}>
      <section className="hy-section hy-consult">
        <div>
          <p className="hy-kicker">Bắt đầu từ một cuộc trò chuyện</p>
          <h1>Kể chúng tôi nghe ngày bạn mong muốn</h1>
          <p className="hy-muted">
            Gửi yêu cầu không phải đặt tiệc hay giữ chỗ. Quản lý tiệc sẽ gọi lại để kiểm tra lịch
            trống và hẹn xem sảnh.
          </p>
          <Contact restaurant={catalog.restaurant} />
        </div>
        <Suspense fallback={null}>
          <ConsultationEntry halls={catalog.halls} menus={catalog.menus} />
        </Suspense>
      </section>
    </PublicShell>
  );
}

/** A5 · Gửi thành công. */
export function ConsultationSentPage({ restaurant }: Readonly<{ restaurant: Restaurant | null }>) {
  return (
    <PublicShell restaurant={restaurant}>
      <section className="hy-section hy-sent" aria-labelledby="sent-title">
        <span className="hy-sent-mark" aria-hidden="true">
          ✓
        </span>
        <h1 id="sent-title">Cảm ơn bạn đã gửi yêu cầu</h1>
        <p>
          Quản lý tiệc sẽ liên hệ qua số điện thoại hoặc email bạn để lại. Yêu cầu này chưa giữ chỗ;
          ngày và sảnh chỉ được giữ khi nhà hàng mở hồ sơ tiệc và bạn đặt cọc.
        </p>
        <ol className="hy-sent-next">
          <li>Nhà hàng gọi lại, hẹn xem sảnh.</li>
          <li>Bạn nhận email mời vào Không gian cưới.</li>
          <li>Hai bên duyệt kịch bản, hợp đồng và đặt cọc.</li>
        </ol>
        <div className="hy-actions">
          <Link className="button" href="/sanh">
            Xem các sảnh tiệc
          </Link>
          <Link className="button button-secondary" href="/">
            Về trang chủ
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
