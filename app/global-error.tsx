'use client';
import { ErrorFallback } from '../src/design-system/error-fallback';
export default function GlobalError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: () => void }>) {
  return (
    <html lang="vi">
      <body>
        <title>Chưa thể hiển thị trang | Hỷ Yến</title>
        <ErrorFallback error={error} retry={retry} />
      </body>
    </html>
  );
}
