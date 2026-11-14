import { ArrowRight, ConciergeBell, Gem, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type CSSProperties } from 'react';
import { cn } from 'cn';

import { buttonVariants } from '../../components/ui/button';
import type { Catalog } from './catalog-server';
import { ConsultationEntry } from './consultation-entry';
import { Contact } from './public-cards';
import { container, eyebrow, lead, reveal, rise } from './public-classes';
import { PublicShell } from './public-shell';
import { ScrollMotion } from './scroll-motion';

/** Trễ cho từng phần chữ của hero để chúng hiện lần lượt khi mở trang. */
const after = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
const promises = [
  { Icon: Gem, label: 'Không gian sang trọng' },
  { Icon: ConciergeBell, label: 'Thực đơn đa dạng' },
  { Icon: Heart, label: 'Dịch vụ chuyên nghiệp' },
];

/** Hero: chữ bên trái trên nền kem, ảnh bàn tiệc bên phải với mép trái cong. */
function ConsultationHero() {
  return (
    <section
      className="relative isolate overflow-hidden bg-linear-to-br from-background via-background to-accent"
      aria-labelledby="consult-title"
    >
      <div
        className={cn(
          container,
          'grid items-center gap-10 py-12 lg:min-h-[520px] lg:grid-cols-2 lg:gap-16 lg:py-20',
        )}
      >
        <div className="flex flex-col gap-5">
          <p className={cn(eyebrow, rise)} lang="en">
            LET&apos;S CREATE YOUR SPECIAL DAY
          </p>
          <h1
            id="consult-title"
            className="text-2xl font-semibold sm:text-3xl lg:text-[44px] lg:leading-[1.25]"
          >
            <span className={cn(rise, 'block')} style={after(120)}>
              Một ngày đặc biệt,
            </span>{' '}
            <span className={cn(rise, 'block')} style={after(240)}>
              bắt đầu từ những
            </span>{' '}
            <span className={cn(rise, 'block')} style={after(360)}>
              điều <em className="text-primary">bạn mơ ước.</em>
            </span>
          </h1>
          <p className={cn(lead, rise, 'max-w-md')} style={after(500)}>
            Mỗi đám cưới đều mang một câu chuyện riêng. Hãy chia sẻ mong muốn của bạn để Hỷ Yến có
            thể cùng bạn tạo nên một ngày thật trọn vẹn.
          </p>
          <div className={cn(rise, 'pt-1')} style={after(640)}>
            <Link
              className={buttonVariants({
                size: 'lg',
                className:
                  '[&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:translate-x-1 motion-reduce:[&_svg]:transition-none',
              })}
              href="#gui-tu-van"
            >
              Khởi đầu câu chuyện
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      {/* Màn rộng: ảnh tràn nửa phải, mép trái bo cong bằng clip-path. Màn hẹp: ảnh nằm dưới chữ. */}
      <div className="relative h-64 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%] lg:[clip-path:ellipse(100%_130%_at_100%_50%)]">
        <div className="hy-wipe-in absolute inset-0 overflow-hidden">
          <Image
            className="hy-hero-image object-cover"
            src="/images/khoanh-khac/chuan-bi-ban-tiec.webp"
            alt="Bàn tiệc cưới được chuẩn bị với hoa tươi và ánh nến"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
          />
        </div>
      </div>
    </section>
  );
}

/** A2 · Gửi yêu cầu tư vấn (nhận lựa chọn qua query). */
export function ConsultationPage({ catalog }: Readonly<{ catalog: Catalog }>) {
  return (
    <PublicShell restaurant={catalog.restaurant}>
      <ScrollMotion />
      <ConsultationHero />

      <section
        className={cn(
          container,
          'grid scroll-mt-20 gap-10 py-12 lg:grid-cols-[minmax(0,32%)_minmax(0,1fr)] lg:gap-16 lg:py-20',
        )}
        id="gui-tu-van"
        aria-labelledby="consult-form-title"
      >
        <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
          {/* Khung ảnh vòm: lớp ngoài mở từ trái sang khi cuộn tới, ảnh bên trong trượt nhẹ (parallax). */}
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-t-[999px] rounded-b-2xl lg:aspect-[4/5]"
            {...reveal('wipe')}
          >
            <Image
              className="hy-parallax object-cover"
              src="/images/khoanh-khac/tiec-tan.webp"
              alt="Sảnh tiệc nhìn qua cửa kính với đèn pha lê và bàn tiệc dài"
              fill
              sizes="(max-width: 1024px) 100vw, 400px"
            />
          </div>
          <div className="flex flex-col gap-3" {...reveal('up', 1)}>
            <p className={eyebrow}>Tư vấn tiệc cưới</p>
            <h2 id="consult-form-title" className="text-xl font-semibold text-balance sm:text-2xl">
              Hãy để Hỷ Yến <em className="text-primary">đồng hành cùng bạn</em>
            </h2>
            <p className="text-sm text-muted-foreground">
              Gửi yêu cầu không phải đặt tiệc hay giữ chỗ. Quản lý tiệc sẽ gọi lại để kiểm tra lịch
              trống và hẹn xem sảnh.
            </p>
          </div>
          <ul
            className="grid grid-cols-3 divide-x divide-border rounded-xl bg-muted py-4 text-center"
            {...reveal('up', 2)}
          >
            {promises.map(({ Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 px-2">
                <Icon className="size-6 text-primary" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-2xs text-muted-foreground">{label}</span>
              </li>
            ))}
          </ul>
          <div {...reveal('up', 3)}>
            <Contact restaurant={catalog.restaurant} />
          </div>
        </div>
        <Suspense fallback={null}>
          <ConsultationEntry halls={catalog.halls} menus={catalog.menus} />
        </Suspense>
      </section>

      <section className="border-t border-border bg-muted">
        <div
          className={cn(container, 'flex flex-col items-center gap-5 py-14 text-center lg:py-20')}
          {...reveal('up')}
        >
          <p className="max-w-xl text-xl font-medium text-balance sm:text-2xl">
            <em>Chúng tôi mong được đồng hành cùng câu chuyện của bạn.</em>
          </p>
          {/* Nét trang trí: hai đường kẻ mảnh tự vẽ ra hai bên một hình thoi nhỏ. */}
          <div className="flex items-center gap-3 text-hy-champagne" aria-hidden="true">
            <span className="h-px w-16 origin-right bg-current" {...reveal('line', 3)} />
            <span className="size-2 rotate-45 bg-primary" />
            <span className="h-px w-16 bg-current" {...reveal('line', 3)} />
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
