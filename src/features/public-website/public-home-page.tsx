import React, { Suspense } from 'react';
import Link from 'next/link';

import {
  brandIntro,
  describeShifts,
  faqs,
  moments,
  offers,
  weddingSteps,
} from '../../content/public-content';
import { Illustration } from '../../design-system/illustrations';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { CredentialForward } from './credential-forward';
import { EstimatorHero } from './estimator';
import { MomentsGallery } from './moments-gallery';
import { PublicShell } from './public-shell';
import { HallCard, MenuCard, Unavailable } from './public-cards';

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

      <section className="hy-section hy-band hy-moments" aria-labelledby="home-moments">
        <header className="hy-moments-head">
          <p className="hy-kicker">Khoảnh khắc tại Hỷ Yến</p>
          <h2 id="home-moments">Những cuộc sum họp ấm áp</h2>
          <Illustration name="divider" size={36} />
          <p className="hy-muted">{brandIntro}</p>
        </header>
        <MomentsGallery moments={moments} />
      </section>

      <section className="hy-section hy-band hy-band-champagne" aria-labelledby="home-steps">
        <p className="hy-kicker">Quy trình</p>
        <h2 id="home-steps">{weddingSteps.length} bước đến ngày cưới</h2>
        <ol className="hy-steps-grid">
          {weddingSteps.map((step, index) => (
            <li key={step.title}>
              <div className="hy-step-head">
                <span className="hy-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <Illustration name={step.icon} size={56} className="hy-step-icon" />
              </div>
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
              <p>{item.answer.replace('{ca-tiec}', describeShifts(restaurant?.shifts))}</p>
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
