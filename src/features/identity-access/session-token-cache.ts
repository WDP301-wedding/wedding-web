export const COUPLE_STORAGE_KEY = 'wedding_couple_token_meta';
export const COUPLE_AUTH_CHANNEL = 'wedding_couple_auth_channel';
export const COUPLE_REFRESH_LOCK = 'wedding_couple_refresh_lock';

export interface CachedCoupleToken {
  token: string;
  expiresAt: string;
  savedAt: number;
}

export function readCachedCoupleToken(): CachedCoupleToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(COUPLE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedCoupleToken;
  } catch {
    return null;
  }
}

export function saveCachedCoupleToken(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    const record: CachedCoupleToken = { token, expiresAt, savedAt: Date.now() };
    window.sessionStorage.setItem(COUPLE_STORAGE_KEY, JSON.stringify(record));
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(COUPLE_AUTH_CHANNEL);
      channel.postMessage({ type: 'COUPLE_TOKEN_REFRESHED', token, expiresAt });
      channel.close();
    }
  } catch {
    // Storage or BroadcastChannel may be restricted in private browsing mode
  }
}

export function clearCachedCoupleToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(COUPLE_STORAGE_KEY);
  } catch {
    // Ignore storage clearing error in restricted contexts
  }
}

export function isCoupleTokenFresh(expiresAtStr: string): boolean {
  const expiry = new Date(expiresAtStr).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now() + 30_000;
}

