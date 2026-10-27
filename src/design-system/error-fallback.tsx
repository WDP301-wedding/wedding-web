'use client';
import Link from 'next/link';
import styles from './error-fallback.module.css';

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
    <section className={embedded ? styles.panel : styles.page} role="alert">
      <div className={styles.panel}>
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
        <div className={styles.actions}>
          <button type="button" onClick={retry}>
            Thử tải lại
          </button>
          <Link href="/" prefetch={false}>
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}
