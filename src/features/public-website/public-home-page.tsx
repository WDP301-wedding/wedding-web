import { ArrowRight, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { cn } from 'cn';

import {
  brandIntro,
  describeShifts,
  faqs,
  moments,
  offers,
  weddingSteps,
} from '../../content/public-content';
import { Badge } from '../../components/ui/badge';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { CredentialForward } from './credential-forward';
import { EstimatorHero } from './estimator';
import { MomentsGallery } from './moments-gallery';
import { HallCard, MenuCard, Unavailable } from './public-cards';
import { arrowLink, band, card, h2, lead, section, sectionHead } from './public-classes';
import { PublicShell } from './public-shell';

/** Cột tiêu đề hẹp bên trái + nội dung bên phải trên màn rộng. */
const split = 'grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-14';

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
              <p className="text-sm text-white/80">
                {restaurant?.displayName ?? 'Nhà hàng tiệc cưới Hỷ Yến'}
                {restaurant?.address ? `, ${restaurant.address}` : ''}
              </p>
              <h1 className="text-2xl font-bold text-balance sm:text-3xl lg:text-[48px] lg:leading-[62px]">
                Biết sảnh nào vừa, tiệc khoảng bao nhiêu – trước khi gọi
              </h1>
              <p className="text-sm text-white/90 sm:text-base sm:leading-7">
                Nhập ngày, ca và số khách. Chúng tôi gợi ý sảnh đủ chỗ và chi phí ước tính theo từng
                thực đơn.
              </p>
            </>
          }
        />
      </div>
      <Unavailable show={catalog.unavailable} />

      <section className={section} aria-labelledby="home-halls">
        <header className={sectionHead}>
          <h2 id="home-halls" className={h2}>
            {halls.length > 0
              ? `${halls.length} sảnh, sức chứa tối đa ${Math.min(...capacities)}–${Math.max(...capacities)} khách`
              : 'Sảnh tiệc'}
          </h2>
          <Link className={arrowLink} href="/sanh">
            So sánh sảnh
            <ArrowRight aria-hidden="true" />
          </Link>
        </header>
        {halls.length === 0 ? (
          <p className={lead}>Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.slice(0, 3).map((hall, index) => (
              <HallCard key={hall.id} hall={hall} priority={index === 0} />
            ))}
          </div>
        )}
      </section>

      <div className={band.warm}>
        <section className={section} aria-labelledby="home-menus">
          <header className={sectionHead}>
            <h2 id="home-menus" className={h2}>
              Giá theo bàn 10 khách
            </h2>
            <Link className={arrowLink} href="/thuc-don">
              Tất cả thực đơn
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {menus.length === 0 ? (
            <p className={lead}>Thực đơn đang được cập nhật.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {menus.slice(0, 3).map((menu) => (
                <MenuCard key={menu.id} menu={menu} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={section} aria-labelledby="home-moments">
        <header className="mb-8 flex max-w-2xl flex-col gap-3">
          <h2 id="home-moments" className={h2}>
            Những cuộc sum họp ấm áp
          </h2>
          <p className={lead}>{brandIntro}</p>
        </header>
        <MomentsGallery moments={moments} />
      </section>

      <div className={band.white}>
        <section className={section} aria-labelledby="home-steps">
          <h2 id="home-steps" className={cn(h2, 'mb-8')}>
            {weddingSteps.length} bước đến ngày cưới
          </h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {weddingSteps.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  'flex flex-col gap-2 border-t-2 pt-5',
                  index === 0 ? 'border-primary' : 'border-border',
                )}
              >
                <span className="text-sm font-semibold text-primary tabular-nums">
                  Bước {index + 1}
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {offers.length > 0 ? (
        <section className={section} id="uu-dai" aria-labelledby="home-offers">
          <h2 id="home-offers" className={cn(h2, 'mb-8')}>
            Ưu đãi đang áp dụng
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <article key={offer.title} className={cn(card, 'flex flex-col gap-2 p-6')}>
                <Badge variant="warning">{offer.tag}</Badge>
                <h3 className="text-lg font-bold">{offer.title}</h3>
                <p className="text-sm">{offer.detail}</p>
                <small className="text-xs text-muted-foreground">{offer.until}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section
        className={cn(section, split, 'scroll-mt-20')}
        id="hoi-dap"
        aria-labelledby="home-faq"
      >
        <div className="flex flex-col gap-3">
          <h2 id="home-faq" className={h2}>
            Trước khi gửi tư vấn
          </h2>
          <p className={lead}>Những câu hỏi các cặp đôi hay hỏi nhất.</p>
        </div>
        {/* <details> có sẵn hành vi mở/đóng và hỗ trợ bàn phím, không cần JavaScript. */}
        <div className="border-t border-border">
          {faqs.map((item, index) => (
            <details
              key={item.question}
              open={index === 0}
              className="group border-b border-border"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-250 group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-3xl pb-5 text-sm text-muted-foreground">
                {item.answer.replace('{ca-tiec}', describeShifts(restaurant?.shifts))}
              </p>
            </details>
          ))}
        </div>
      </section>

      <div className={band.blush}>
        <section
          className={cn(section, split, 'scroll-mt-20')}
          id="tu-van"
          aria-labelledby="home-consult"
        >
          <div className="flex flex-col gap-3">
            <h2 id="home-consult" className={h2}>
              Để lại thông tin, chúng tôi gọi lại
            </h2>
            <p className={lead}>
              Gửi yêu cầu không phải đặt tiệc hay giữ chỗ. Quản lý tiệc gọi lại để kiểm tra lịch
              trống và hẹn xem sảnh.
            </p>
          </div>
          <Suspense fallback={null}>
            <ConsultationEntry halls={halls} menus={menus} />
          </Suspense>
        </section>
      </div>
    </PublicShell>
  );
}
