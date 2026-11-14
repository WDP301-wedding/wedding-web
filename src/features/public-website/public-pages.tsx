import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { cn } from 'cn';

import { buttonVariants } from '../../components/ui/button';
import { CatalogImage } from './catalog-image';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { consultationHref, dishCategory, formatVnd } from './estimate';
import { HallsFilter } from './halls-filter';
import type { Hall, Restaurant } from './public-api';
import { arrowLink, card, h1, lead, section } from './public-classes';
import { PublicShell } from './public-shell';
import { Contact, HallCard, Unavailable } from './public-cards';

export { HomePage } from './public-home-page';

const pageHead = 'flex max-w-3xl flex-col gap-3 pb-8';

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
      <Unavailable show={catalog.unavailable} />
      <section className={section}>
        <header className={pageHead}>
          <h1 className={h1}>Chọn nơi câu chuyện bắt đầu</h1>
          <p className={lead}>
            Nhập số khách để xem sảnh đủ chỗ. Ảnh và sức chứa do nhà hàng cập nhật.
          </p>
        </header>
        {halls.length === 0 ? (
          <p className={lead}>Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.</p>
        ) : (
          // Fallback (trước khi JS chạy) vẫn hiện đủ sảnh → trang có nội dung ngay từ HTML.
          <Suspense
            fallback={
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      <article className={section}>
        <nav aria-label="Đường dẫn" className="mb-6">
          <Link className={arrowLink} href="/sanh">
            <ArrowLeft aria-hidden="true" />
            Các sảnh tiệc
          </Link>
        </nav>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-3">
            <CatalogImage
              media={cover}
              sizes="(max-width: 900px) 100vw, 720px"
              priority
              placeholder="Ảnh sảnh đang được cập nhật"
              className="aspect-[16/10] rounded-2xl"
            />
            {gallery.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((media) => (
                  <CatalogImage
                    key={media.id}
                    media={media}
                    sizes="180px"
                    placeholder={hall.name}
                    className="aspect-[4/3] rounded-xl"
                  />
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            <h1 className={h1}>{hall.name}</h1>
            <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-col gap-0.5 p-4">
                <dt className="text-xs text-muted-foreground">Sức chứa tối đa</dt>
                <dd className="text-xl font-bold tabular-nums">{hall.maxGuests} khách</dd>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-border p-4">
                <dt className="text-xs text-muted-foreground">Tương đương</dt>
                <dd className="text-xl font-bold tabular-nums">
                  {Math.floor(hall.maxGuests / 10)} bàn
                </dd>
              </div>
            </dl>
            {hall.description ? <p className="text-base">{hall.description}</p> : null}
            {catalog.menus.length > 0 ? (
              <div className="flex flex-col gap-3">
                <h2 className="text-lg font-bold">Thực đơn tham khảo</h2>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {catalog.menus.slice(0, 3).map((menu) => (
                    <li key={menu.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <strong className="text-sm">{menu.name}</strong>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatVnd(menu.priceVndPerTable)} / bàn
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="sticky bottom-4 mt-2 lg:static">
              <Link
                className={buttonVariants({
                  size: 'lg',
                  className: 'w-full shadow-hy-2 lg:w-auto lg:shadow-none',
                })}
                href={consultationHref({ hallId: hall.id })}
              >
                Tư vấn sảnh này
                <ArrowRight aria-hidden="true" />
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
      <Unavailable show={catalog.unavailable} />
      <section className={section}>
        <header className={pageHead}>
          <h1 className={h1}>Hương vị cho ngày sum vầy</h1>
          <p className={lead}>
            Giá theo bàn 10 khách đang được nhà hàng công bố. Thực đơn và giá cho tiệc của bạn được
            thống nhất trong hợp đồng.
          </p>
        </header>
        {catalog.menus.length === 0 ? (
          <p className={cn(lead, 'rounded-xl bg-muted p-6')}>
            Thực đơn đang được cập nhật. Nhà hàng sẵn sàng trao đổi về mong muốn của bạn.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {catalog.menus.map((menu) => (
              <article
                key={menu.id}
                id={menu.id}
                className={cn(card, 'flex scroll-mt-24 flex-col gap-4 rounded-2xl p-6 sm:p-7')}
              >
                <header className="flex flex-col gap-1 border-b border-border pb-4">
                  <h2 className="text-xl font-bold">{menu.name}</h2>
                  <strong className="text-xl font-bold text-primary tabular-nums">
                    {formatVnd(menu.priceVndPerTable)}{' '}
                    <small className="text-sm font-medium text-muted-foreground">/ bàn</small>
                  </strong>
                  {menu.description ? (
                    <p className="text-sm text-muted-foreground">{menu.description}</p>
                  ) : null}
                </header>
                <ol className="flex flex-col gap-3">
                  {menu.items.map((dish) => (
                    <li key={dish.dishVersionId} className="grid gap-x-4 sm:grid-cols-[120px_1fr]">
                      <span className="text-xs text-muted-foreground sm:pt-0.5">
                        {dishCategory(dish.categoryLabel)}
                      </span>
                      <span className="flex flex-col">
                        <strong className="text-sm font-semibold">{dish.name}</strong>
                        {dish.description ? (
                          <span className="text-xs text-muted-foreground">{dish.description}</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link
                  className={buttonVariants({ className: 'mt-auto self-start' })}
                  href={consultationHref({ menuId: menu.id })}
                >
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
      <section
        className={cn(section, 'grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-14')}
      >
        <div className="flex flex-col gap-4">
          <h1 className={h1}>Kể chúng tôi nghe ngày bạn mong muốn</h1>
          <p className={lead}>
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

const nextSteps = [
  'Nhà hàng gọi lại, hẹn xem sảnh.',
  'Bạn nhận email mời vào Không gian cưới.',
  'Hai bên duyệt kịch bản, hợp đồng và đặt cọc.',
];

/** A5 · Gửi thành công. */
export function ConsultationSentPage({ restaurant }: Readonly<{ restaurant: Restaurant | null }>) {
  return (
    <PublicShell restaurant={restaurant}>
      <section
        className={cn(section, 'flex flex-col items-center gap-4 text-center')}
        aria-labelledby="sent-title"
      >
        <span
          className="flex size-16 items-center justify-center rounded-full bg-hy-success-bg text-hy-success"
          aria-hidden="true"
        >
          <svg
            className="hy-draw-check size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 id="sent-title" className={h1}>
          Cảm ơn bạn đã gửi yêu cầu
        </h1>
        <p className={cn(lead, 'max-w-2xl')}>
          Quản lý tiệc sẽ liên hệ qua số điện thoại hoặc email bạn để lại. Yêu cầu này chưa giữ chỗ;
          ngày và sảnh chỉ được giữ khi nhà hàng mở hồ sơ tiệc và bạn đặt cọc.
        </p>
        <ol className="my-2 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
          {nextSteps.map((step, index) => (
            <li key={step} className={cn(card, 'flex flex-col gap-1 p-4 text-sm')}>
              <span className="text-xs font-semibold text-primary">Bước {index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap justify-center gap-3">
          <Link className={buttonVariants()} href="/sanh">
            Xem các sảnh tiệc
          </Link>
          <Link className={buttonVariants({ variant: 'outline' })} href="/">
            Về trang chủ
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
