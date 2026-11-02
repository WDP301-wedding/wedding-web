import { buttonVariants } from '../components/ui/button';
import type { FriendlyError } from '../lib/api/api-errors';

/** Persistent feedback belongs beside the field, form or resource that can be corrected. */
export function InlineError({
  error,
  onRetry,
  id,
}: Readonly<{
  error: FriendlyError | string | null | undefined;
  onRetry?: (() => void) | undefined;
  id?: string | undefined;
}>) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  const requestId = typeof error === 'string' ? null : error.requestId;
  return (
    <div
      id={id}
      className="flex flex-col items-start gap-2 rounded-lg bg-hy-warning-bg px-4 py-3 text-sm text-hy-warning [&_small]:text-xs"
      role="alert"
    >
      <p>{message}</p>
      {requestId ? <small>Mã hỗ trợ: {requestId}</small> : null}
      {onRetry ? (
        <button
          type="button"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          onClick={onRetry}
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}
