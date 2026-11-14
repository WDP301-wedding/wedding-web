import {
  ArrowRight,
  ClipboardList,
  ConciergeBell,
  FileSignature,
  Heart,
  MessagesSquare,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
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
import { buttonVariants } from '../../components/ui/button';
import { routes } from '../../routes';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { CredentialForward } from './credential-forward';
import { EstimatorHero } from './estimator';
import { HeroVideoButton } from './hero-video';
import { MomentsGallery } from './moments-gallery';
import { Contact, HallCard, MenuCard, Unavailable } from './public-cards';
import { arrowLink, band, card, display, eyebrow, lead, section } from './public-classes';
import { PublicShell } from './public-shell';

/** Cột tiêu đề hẹp bên trái + nội dung bên phải trên màn rộng. */
const split = 'grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-14';
/** Icon cho 4 bước hành trình, theo đúng thứ tự `weddingSteps`. */
const stepIcons = [MessagesSquare, FileSignature, ClipboardList, Heart];

/** Đầu mục: nhãn nhỏ + tiêu đề, kèm liên kết "xem tất cả" ở bên phải nếu có. */
function SectionHead({
  id,
  label,
  title,
  action,
}: Readonly<{ id: string; label: string; title: string; action?: ReactNode }>) {
  return (
    <header className="hy-reveal mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        <p className={eyebrow}>{label}</p>
        <h2 id={id} className={display}>
          {title}
        </h2>
      </div>
      {action}
    </header>
  );
}

/** A2 · Trang chủ + Ước tính tiệc. */
export function HomePage({ catalog }: Readonly<{ catalog: Catalog }>) {
  const { restaurant, halls, menus } = catalog;
  const sorted = halls.toSorted((left, right) => right.maxGuests - left.maxGuests);
  return (
    <PublicShell restaurant={restaurant} showOffers={offers.length > 0} overlayHeader>
      <CredentialForward />
      <div id="uoc-tinh">
        <EstimatorHero
          halls={halls}
          menus={menus}
          restaurant={restaurant}
          intro={
            <>
              <p className="flex items-center gap-3 text-sm font-medium text-white/90 after:h-px after:w-12 after:bg-hy-champagne after:content-['']">
                Hỷ Yến Wedding Venue
              </p>
              <h1 className="text-2xl font-semibold text-balance sm:text-3xl lg:text-[36px] lg:leading-[1.3] xl:text-[50px]">
                Trọn vẹn khoảnh khắc, <br className="max-sm:hidden lg:max-xl:hidden" />
                Vẹn nguyên ngày hạnh phúc
              </h1>
              <p className="max-w-lg text-sm text-white/90 sm:text-base sm:leading-7">
                Không gian tiệc cưới tinh tế, thực đơn chỉn chu và hành trình chuẩn bị được đồng
                hành tận tâm.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link className={buttonVariants({ size: 'lg' })} href={routes.halls}>
                  Khám phá sảnh tiệc
                  <ArrowRight aria-hidden="true" />
                </Link>
                <HeroVideoButton
                  className={buttonVariants({
                    size: 'lg',
                    variant: 'outline',
                    className: 'border-white/70 bg-transparent text-white hover:bg-white/15',
                  })}
                />
              </div>
            </>
          }
        />
      </div>
      <Unavailable show={catalog.unavailable} />

      <section className={section} aria-labelledby="home-halls">
        <SectionHead
          id="home-halls"
          label="Sảnh tiệc"
          title="Khám phá không gian tiệc cưới"
          action={
            <Link className={arrowLink} href={routes.halls}>
              Xem tất cả sảnh
              <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
        {halls.length === 0 ? (
          <p className={lead}>Nhà hàng đang cập nhật các sảnh tiệc. Hãy liên hệ để được tư vấn.</p>
        ) : (
          // Màn vừa (2 cột): thẻ thứ ba trải hết hàng thay vì đứng lẻ một nửa.
          <div className="hy-reveal grid gap-5 sm:grid-cols-2 sm:max-lg:[&>*:nth-child(3)]:col-span-2 sm:max-lg:[&>*:nth-child(3)]:aspect-[8/3] lg:grid-cols-3">
            {sorted.slice(0, 3).map((hall, index) => (
              <HallCard key={hall.id} hall={hall} priority={index === 0} />
            ))}
          </div>
        )}
      </section>

      <div className={band.white}>
        <section className="grid lg:grid-cols-2" aria-labelledby="home-story">
          <div className="relative min-h-64 sm:min-h-80 lg:min-h-[460px]">
            <Image
              className="object-cover"
              src="/images/khoanh-khac/co-dau-chu-re.webp"
              alt="Cô dâu chú rể tươi cười giữa sảnh tiệc"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="hy-reveal flex max-w-2xl flex-col justify-center gap-4 px-4 py-12 sm:px-8 lg:px-16 lg:py-20">
            <p className={eyebrow}>Hỷ Yến</p>
            <h2 id="home-story" className={cn(display, 'text-primary')}>
              Không chỉ là một buổi tiệc, mà là một kỷ niệm
            </h2>
            <p className={lead}>{brandIntro}</p>
            <Link className={buttonVariants({ className: 'mt-2 self-start' })} href="#hanh-trinh">
              Tìm hiểu thêm
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className={section} aria-labelledby="home-menus">
        <SectionHead
          id="home-menus"
          label="Thực đơn"
          title="Thực đơn dành cho ngày trọng đại"
          action={
            <Link className={arrowLink} href={routes.menus}>
              Xem tất cả thực đơn
              <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
        <div className="hy-reveal grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {menus.length === 0 ? (
            <p className={cn(lead, 'sm:col-span-2 lg:col-span-3')}>Thực đơn đang được cập nhật.</p>
          ) : (
            menus.slice(0, 3).map((menu) => <MenuCard key={menu.id} menu={menu} />)
          )}
          <aside className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted p-8 text-center">
            <ConciergeBell className="size-9 text-primary" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="text-base font-semibold">Tư vấn thực đơn phù hợp</h3>
            <p className="text-sm text-muted-foreground">
              Quản lý tiệc cùng bạn chọn thực đơn hợp khẩu vị và số khách.
            </p>
            <Link className={buttonVariants({ className: 'mt-1' })} href={routes.consultation}>
              Liên hệ ngay
              <ArrowRight aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>

      <div className={band.white}>
        <section className={section} aria-labelledby="home-moments">
          <SectionHead id="home-moments" label="Thư viện ảnh" title="Những khoảnh khắc đáng nhớ" />
          <MomentsGallery moments={moments} />
        </section>
      </div>

      <section className={cn(section, 'scroll-mt-20')} id="hanh-trinh" aria-labelledby="home-steps">
        <SectionHead
          id="home-steps"
          label="Quy trình"
          title={`${weddingSteps.length} bước chuẩn bị ngày cưới`}
        />
        <ol className="hy-reveal grid gap-8 lg:grid-cols-4 lg:gap-6">
          {weddingSteps.map((step, index) => {
            const Icon = stepIcons[index] ?? Heart;
            return (
              <li
                key={step.title}
                className="relative flex gap-4 lg:flex-col lg:items-center lg:text-center"
              >
                {/* Đường nối tới bước kế tiếp: dọc trên điện thoại, ngang trên màn rộng. */}
                {index < weddingSteps.length - 1 ? (
                  <span
                    className="absolute top-12 -bottom-8 left-6 w-px bg-hy-champagne/70 lg:top-6 lg:bottom-auto lg:left-1/2 lg:h-px lg:w-[calc(100%+1.5rem)]"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-hy-champagne bg-background text-primary">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground lg:max-w-60">{step.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {offers.length > 0 ? (
        <section className={section} id="uu-dai" aria-labelledby="home-offers">
          <h2 id="home-offers" className={cn(display, 'mb-8')}>
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

      <div className={band.white}>
        <section
          className={cn(section, split, 'scroll-mt-20')}
          id="hoi-dap"
          aria-labelledby="home-faq"
        >
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <p className={eyebrow}>Câu hỏi thường gặp</p>
            <h2 id="home-faq" className={display}>
              Giải đáp thắc mắc và nhận tư vấn
            </h2>
            <p className={lead}>Những câu hỏi các cặp đôi hay hỏi nhất trước khi gửi tư vấn.</p>
            <Link className={cn(arrowLink, 'mt-1 self-start')} href="#tu-van">
              Nhận tư vấn
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {/* <details> có sẵn hành vi mở/đóng và hỗ trợ bàn phím, không cần JavaScript. */}
          <div className="divide-y divide-border rounded-2xl border border-border bg-background px-5 sm:px-7">
            {faqs.map((item, index) => (
              <details key={item.question} open={index === 0} className="hy-faq group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold transition-colors hover:text-primary sm:text-base [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <Plus
                    className="size-5 shrink-0 text-primary transition-transform duration-250 group-open:rotate-45 motion-reduce:transition-none"
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
      </div>

      <div className={band.blush}>
        <section
          className={cn(section, split, 'scroll-mt-20')}
          id="tu-van"
          aria-labelledby="home-consult"
        >
          <div className="flex flex-col gap-3">
            <p className={eyebrow}>Nhận tư vấn</p>
            <h2 id="home-consult" className={display}>
              Để lại thông tin, chúng tôi sẽ liên hệ bạn sớm nhất
            </h2>
            <p className={lead}>
              Gửi yêu cầu không phải đặt tiệc hay giữ chỗ. Quản lý tiệc gọi lại để kiểm tra lịch
              trống và hẹn xem sảnh.
            </p>
            <Contact restaurant={restaurant} />
          </div>
          <Suspense fallback={null}>
            <ConsultationEntry halls={halls} menus={menus} />
          </Suspense>
        </section>
      </div>
    </PublicShell>
  );
}
