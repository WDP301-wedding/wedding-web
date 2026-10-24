import { describe, it, expect, vi } from 'vitest';

describe('WebIdentitySession import boundary', () => {
  it('audit: importing Couple session does not expose circular initialization error', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://127.0.0.1:3000/api/v1');
    const { WebIdentitySession } = await import('./session.js');
    expect(typeof WebIdentitySession).toBe('function');
  });
});
