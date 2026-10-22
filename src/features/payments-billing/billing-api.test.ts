import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createCoupleBillingGateway } from './billing-api';

describe('generated Couple billing HTTP adapter', () => {
  it('discovers active payment attempts with booking authorization and no browser cache', async () => {
    const requests: Request[] = [];
    const attempt = {
      paymentAttemptId: 'existing-attempt',
      purpose: 'BALANCE',
      status: 'UNKNOWN',
      amountVnd: 7765433,
      applicationStatus: null,
      expiresAt: '2099-10-09T10:00:00Z',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=existing',
    };
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: (request) => {
        requests.push(request.clone());
        return Promise.resolve(Response.json({ data: { attempts: [attempt] } }));
      },
    });
    expect(await createCoupleBillingGateway(client).loadActiveAttempts('token', 'booking')).toEqual(
      [attempt],
    );
    expect(requests[0]!.url).toBe('http://localhost:4000/api/v1/bookings/booking/payments/active');
    expect(requests[0]!.method).toBe('GET');
    expect(requests[0]!.headers.get('Authorization')).toBe('Bearer token');
    expect(requests[0]!.cache).toBe('no-store');
  });

  it('distinguishes no active attempts from a missing active-payment response', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () => Promise.resolve(Response.json({ data: { attempts: [] } })),
    });
    expect(await createCoupleBillingGateway(client).loadActiveAttempts('token', 'booking')).toEqual(
      [],
    );
    const unavailable = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () => Promise.resolve(Response.json({})),
    });
    await expect(
      createCoupleBillingGateway(unavailable).loadActiveAttempts('token', 'booking'),
    ).rejects.toThrow('dữ liệu');
  });

  it('rejects unsafe checkout URLs returned by active discovery or status recovery', async () => {
    for (const checkoutUrl of [
      'javascript:alert(1)',
      'http://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      'https://evil.example/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn.evil.example/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn/other-path',
    ]) {
      const attempt = {
        paymentAttemptId: 'existing-attempt',
        purpose: 'DEPOSIT',
        status: 'PENDING',
        amountVnd: 1234567,
        applicationStatus: null,
        expiresAt: '2099-10-09T10:00:00Z',
        checkoutUrl,
      };
      const client = createApiClient({
        baseUrl: 'http://localhost:4000/api/v1',
        fetch: (request) =>
          Promise.resolve(
            Response.json({
              data: request.url.endsWith('/active') ? { attempts: [attempt] } : attempt,
            }),
          ),
      });
      const gateway = createCoupleBillingGateway(client);
      await expect(gateway.loadActiveAttempts('token', 'booking')).rejects.toThrow('VNPay');
      await expect(gateway.loadAttempt('token', 'booking', 'existing-attempt')).rejects.toThrow(
        'VNPay',
      );
    }
  });

  it('uses the booking grant and server deposit snapshot, never a client deposit formula', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () =>
        Promise.resolve(
          Response.json({
            data: {
              bookingId: 'booking',
              phase: 'AWAITING_DEPOSIT',
              capabilities: { accessLevel: 'RESTRICTED' },
              proposal: { depositAmountVnd: 1234567 },
              timeline: { revisionId: 'timeline' },
            },
          }),
        ),
    });
    expect(await createCoupleBillingGateway(client).loadContext('token', 'booking')).toEqual({
      bookingId: 'booking',
      accessLevel: 'RESTRICTED',
      phase: 'AWAITING_DEPOSIT',
      depositAmountVnd: 1234567,
      timelineRevisionId: 'timeline',
      contract: null,
      contractRequired: false,
    });
  });
  it('binds the deposit to the mutually approved FULL_CONTRACT_V1 revision', async () => {
    const digest = 'a'.repeat(64);
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: (request) =>
        Promise.resolve(
          Response.json({
            data: request.url.endsWith('/contracts')
              ? {
                  modelVersion: 'FULL_CONTRACT_V1',
                  currentRevisionId: 'contract-2',
                  eligibleForDeposit: true,
                  revisions: [
                    {
                      revisionId: 'contract-2',
                      state: 'APPROVED',
                      documentDigest: digest,
                      document: { depositAmountVnd: 30000000, timelineRevisionId: 'timeline-3' },
                    },
                  ],
                }
              : {
                  bookingId: 'booking',
                  phase: 'AWAITING_DEPOSIT',
                  capabilities: { accessLevel: 'RESTRICTED' },
                  proposal: { depositAmountVnd: 1 },
                  timeline: { revisionId: 'timeline-old' },
                },
          }),
        ),
    });
    expect(await createCoupleBillingGateway(client).loadContext('token', 'booking')).toMatchObject({
      depositAmountVnd: 30000000,
      timelineRevisionId: 'timeline-3',
      contract: { revisionId: 'contract-2', documentDigest: digest, eligibleForDeposit: true },
      contractRequired: false,
    });
  });
  it('sends exact public checkout bodies and explicit keys; preserves billing pagination fence', async () => {
    const requests: Request[] = [];
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: (request) => {
        requests.push(request.clone());
        return Promise.resolve(
          Response.json({
            data: {
              history: [],
              balancePaymentEligibility: {
                billingRevision: 7,
                canPay: true,
                nextAction: 'PAY_BALANCE',
                reasonCode: null,
              },
              checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
              paymentAttemptId: 'attempt',
              status: 'PENDING',
              expiresAt: '2026-10-09T10:00:00Z',
            },
          }),
        );
      },
    });
    const gateway = createCoupleBillingGateway(client);
    await gateway.startDeposit(
      'token',
      'booking',
      { timelineRevisionId: 'timeline' },
      'deposit-key',
    );
    await gateway.startBalance('token', 'booking', { expectedBillingRevision: 7 }, 'balance-key');
    await gateway.load('token', 'booking', { cursor: 'next', throughBillingRevision: 7 });
    await gateway.loadAttempt('token', 'booking', 'attempt');
    expect(await requests[0]!.json()).toEqual({ timelineRevisionId: 'timeline' });
    expect(await requests[1]!.json()).toEqual({ expectedBillingRevision: 7 });
    expect(requests[0]!.headers.get('Idempotency-Key')).toBe('deposit-key');
    expect(requests[1]!.headers.get('Idempotency-Key')).toBe('balance-key');
    expect(new URL(requests[2]!.url).searchParams.get('throughBillingRevision')).toBe('7');
    expect(requests[3]!.url).toContain('/payments/attempt');
    expect(
      requests.every(
        (request) =>
          request.headers.get('Authorization') === 'Bearer token' && request.cache === 'no-store',
      ),
    ).toBe(true);
  });
  it('rejects unsafe checkout destinations and missing responses as unresolved, not success', async () => {
    for (const checkoutUrl of [
      'javascript:alert(1)',
      'http://sandbox.vnpayment.vn/',
      'https://evil.example/',
      'https://sandbox.vnpayment.vn.evil.example/',
    ]) {
      const client = createApiClient({
        baseUrl: 'http://localhost:4000/api/v1',
        fetch: () => Promise.resolve(Response.json({ data: { checkoutUrl } })),
      });
      await expect(
        createCoupleBillingGateway(client).startDeposit(
          'token',
          'booking',
          { timelineRevisionId: 'timeline' },
          'key',
        ),
      ).rejects.toThrow('VNPay');
    }
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () => Promise.resolve(Response.json({})),
    });
    await expect(
      createCoupleBillingGateway(client).loadContext('token', 'booking'),
    ).rejects.toThrow('dữ liệu');
    await expect(createCoupleBillingGateway(client).load('token', 'booking')).rejects.toThrow(
      'dữ liệu',
    );
    await expect(
      createCoupleBillingGateway(client).loadAttempt('token', 'booking', 'attempt'),
    ).rejects.toThrow('dữ liệu');
  });
  it('allows absent timeline but never fabricates an approved revision', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () =>
        Promise.resolve(
          Response.json({
            data: {
              bookingId: 'booking',
              phase: 'DRAFT',
              capabilities: { accessLevel: 'FULL' },
              proposal: { depositAmountVnd: 11 },
              timeline: null,
            },
          }),
        ),
    });
    expect(
      (await createCoupleBillingGateway(client).loadContext('token', 'booking')).timelineRevisionId,
    ).toBeNull();
  });
});
