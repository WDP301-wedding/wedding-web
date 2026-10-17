import Link from 'next/link';
import { Suspense } from 'react';

import { faqs, offers, weddingSteps } from '../../content/public-content';
import { CatalogImage } from './catalog-image';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { CredentialForward } from './credential-forward';
import { consultationHref, formatVnd } from './estimate';
import { EstimatorHero } from './estimator';
import { HallsFilter } from './halls-filter';
import type { Hall, Menu, Restaurant } from './public-api';
import { PublicShell } from './public-shell';

/*
 * Các trang công khai v2 (A2–A5) là SERVER COMPONENT: HTML được dựng sẵn từ catalog (ISR),
 * trình duyệt nhận trang có nội dung ngay, không phải chờ JS gọi API như bản cũ.
 * Chỉ những phần cần tương tác (ước tính, lọc, form, header) là client component nhỏ.
 */

function Unavailable({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null;
  return (
    <p className="hy-notice" role="status">
      Chưa tải được đầy đủ thông tin nhà hàng. Trang sẽ tự cập nhật sau ít phút — bạn vẫn có thể gửi
      yêu cầu tư vấn.
    </p>
  );
}

/** A2 · Trang chủ + Ước tính tiệc. */
export function HomePage({ catalog }: Readonly<{ catalog: Catalog }>) {
  const { restaurant, halls, menus } = catalog;
  const sorted = halls.toSorted((left, right) => right.maxGuests - left.maxGuests);
  const capacities = halls.map((hall) => hall.maxGuests);
  return (
    <PublicShell restaurant={restaurant} showOffers={offers.length > 0}>
      <CredentialForward />
      <div id="uoc-tinh">
        <EstimatorHero
          halls={halls}
          menus={menus}
          restaurant={restaurant}
          intro={
            <>
              <p className="hy-kicker">
                {restaurant?.displayName ?? 'Nhà hàng tiệc cưới Hỷ Yến'}
                {restaurant?.address ? ` · ${restaurant.address}` : ''}
              </p>
              <h1>Biết sảnh nào vừa, tiệc khoảng bao nhiêu – trước khi gọi</h1>
              <p>
                Nhập ngày, ca và số khách. Chúng tôi gợi ý sảnh đủ chỗ và chi phí ước tính theo từng
                thực đơn.
              </p>
            </>
          }
        />
      </div>
      <Unavailable show={catalog.unavailable} />

      <section className="hy-section hy-band" aria-labelledby="home-halls">
        <header className="hy-section-head">
          <div>
            <p className="hy-kicker">Sảnh tiệc</p>
            <h2 id="home-halls">
              {halls.length > 0
                ? `${halls.length} sảnh, sức chứa tối đa ${Math.min(...capacities)}–${Math.max(...capacities)} khách`
                : 'Sảnh tiệc'}
            </h2>
          </div>
          <Link href="/sanh">So sánh sảnh →</Link>
        </header>
        {halls.length === 0 ? (
          <p className="hy-muted">
            Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.
          </p>
        ) : (
          <div className="hy-hall-grid">
            {sorted.slice(0, 3).map((hall, index) => (
              <HallCard key={hall.id} hall={hall} priority={index === 0} />
            ))}
          </div>
        )}
      </section>

      <section className="hy-section hy-band hy-band-light" aria-labelledby="home-menus">
        <header className="hy-section-head">
          <div>
            <p className="hy-kicker">Thực đơn nổi bật</p>
            <h2 id="home-menus">Giá theo bàn 10 khách</h2>
          </div>
          <Link href="/thuc-don">Tất cả thực đơn →</Link>
        </header>
        {menus.length === 0 ? (
          <p className="hy-muted">Thực đơn đang được cập nhật.</p>
        ) : (
          <div className="hy-menu-grid">
            {menus.slice(0, 3).map((menu) => (
              <MenuCard key={menu.id} menu={menu} />
            ))}
          </div>
        )}
      </section>

      <section className="hy-section hy-band hy-band-champagne" aria-labelledby="home-steps">
        <p className="hy-kicker">Quy trình</p>
        <h2 id="home-steps">{weddingSteps.length} bước đến ngày cưới</h2>
        <ol className="hy-steps-grid">
          {weddingSteps.map((step, index) => (
            <li key={step.title}>
              <span className="hy-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {offers.length > 0 ? (
        <section className="hy-section hy-band" id="uu-dai" aria-labelledby="home-offers">
          <p className="hy-kicker">Ưu đãi</p>
          <h2 id="home-offers">Đang áp dụng</h2>
          <div className="hy-offer-grid">
            {offers.map((offer) => (
              <article key={offer.title} className="hy-offer">
                <span className="hy-chip is-warning">{offer.tag}</span>
                <h3>{offer.title}</h3>
                <p>{offer.detail}</p>
                <small>{offer.until}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="hy-section hy-band hy-faq" id="hoi-dap" aria-labelledby="home-faq">
        <p className="hy-kicker">Câu hỏi thường gặp</p>
        <h2 id="home-faq">Trước khi gửi tư vấn</h2>
        {/* <details> có sẵn hành vi mở/đóng và hỗ trợ bàn phím, không cần JavaScript. */}
        <div className="hy-faq-list">
          {faqs.map((item, index) => (
            <details key={item.question} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        className="hy-section hy-band hy-band-blush hy-consult"
        id="tu-van"
        aria-labelledby="home-consult"
      >
        <div>
          <p className="hy-kicker">Nhận tư vấn</p>
          <h2 id="home-consult">Để lại thông tin, chúng tôi gọi lại</h2>
          <p className="hy-muted">
            Gửi yêu cầu không phải đặt tiệc hay giữ chỗ. Quản lý tiệc gọi lại để kiểm tra lịch trống
            và hẹn xem sảnh.
          </p>
        </div>
        <Suspense fallback={null}>
          <ConsultationEntry halls={halls} menus={menus} />
        </Suspense>
      </section>
    </PublicShell>
  );
}

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
          <p className="hy-muted">
            Thực đơn đang được cập nhật. Nhà hàng sẵn sàng trao đổi về mong muốn của bạn.
          </p>
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

function HallCard({ hall, priority = false }: Readonly<{ hall: Hall; priority?: boolean }>) {
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

function MenuCard({ menu }: Readonly<{ menu: Menu }>) {
  return (
    <article className="hy-menu-card">
      <h3>{menu.name}</h3>
      <strong className="hy-money">{formatVnd(menu.priceVndPerTable)}/bàn</strong>
      {menu.description ? <p className="hy-clamp">{menu.description}</p> : null}
      <Link href={consultationHref({ menuId: menu.id })}>Tư vấn với thực đơn này →</Link>
    </article>
  );
}

function Contact({ restaurant }: Readonly<{ restaurant: Restaurant | null }>) {
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
