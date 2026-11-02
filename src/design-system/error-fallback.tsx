'use client';
import Link from 'next/link';
import { buttonVariants } from '../components/ui/button';

const panel =
  'mx-auto flex w-full max-w-[44rem] flex-col gap-3 leading-relaxed [&_code]:text-xs [&_h1]:text-xl [&_h1]:leading-snug [&_h1]:font-bold sm:[&_h1]:text-2xl [&_p]:text-muted-foreground';

export function ErrorFallback({
  error,
  retry,
  embedded = false,
}: Readonly<{
  error: unknown;
  retry: () => void;
  embedded?: boolean;
}>) {
  const digest =
    error instanceof Error && 'digest' in error && typeof error.digest === 'string'
      ? error.digest
      : null;
  return (
    <section
      className={
        embedded
          ? panel
          : 'grid min-h-[70dvh] place-items-center p-[clamp(1rem,4vw,3rem)] animate-in duration-300 fade-in motion-reduce:animate-none'
      }
      role="alert"
    >
      <div className={panel}>
        <h1>Chưa thể hiển thị trang này</h1>
        <p>
          Đã có sự cố khi tải nội dung. Hãy thử tải lại phần này. Nếu lỗi tiếp diễn, bạn có thể liên
          hệ nhà hàng để được hỗ trợ.
        </p>
        {digest ? (
          <p>
            Mã sự cố: <code>{digest}</code>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={buttonVariants()} onClick={retry}>
            Thử tải lại
          </button>
          <Link className={buttonVariants({ variant: 'outline' })} href="/" prefetch={false}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}
