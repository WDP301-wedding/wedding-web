import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonVariants } from '../src/components/ui/button';
import { BrandMark } from '../src/design-system/brand-mark';
import { routes } from '../src/routes';

export const metadata: Metadata = { title: 'Không tìm thấy trang | Hỷ Yến' };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-[clamp(1rem,4vw,3rem)]">
      <section className="flex w-full max-w-[36rem] flex-col gap-4 leading-relaxed animate-in duration-300 fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
        <Link href={routes.home} className="self-start" aria-label="Hỷ Yến — Trang chủ">
          <BrandMark compact />
        </Link>
        <h1 className="text-2xl leading-snug font-bold sm:text-3xl">Không tìm thấy trang</h1>
        <p className="text-muted-foreground">
          Liên kết có thể đã cũ hoặc gõ sai. Nếu bạn mở từ thiệp mời, hãy kiểm tra lại đường dẫn
          hoặc liên hệ nhà hàng.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link className={buttonVariants()} href={routes.home}>
            Về trang chủ
          </Link>
          <Link className={buttonVariants({ variant: 'outline' })} href={routes.halls}>
            Xem sảnh tiệc
          </Link>
        </div>
      </section>
    </main>
  );
}
