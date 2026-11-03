import { describeApiError } from '../../lib/api/api-errors';

export type IdentityView = 'invitation' | 'login' | 'reset-request' | 'restoring';

export function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function identityErrorMessage(error: unknown, view?: IdentityView): string {
  const parsed = describeApiError(error);
  if (parsed.code || error instanceof Error) return parsed.message;
  return view === 'login' ? 'Không thể hoàn tất đăng nhập. Vui lòng thử lại.' : parsed.message;
}
