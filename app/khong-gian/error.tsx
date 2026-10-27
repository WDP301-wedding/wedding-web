'use client';
import { ErrorFallback } from '../../src/design-system/error-fallback';
export default function WorkspaceError({
  error,
  retry,
}: Readonly<{ error: unknown; retry: () => void }>) {
  return <ErrorFallback error={error} retry={retry} embedded />;
}
