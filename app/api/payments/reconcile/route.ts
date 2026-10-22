import { relayVnpayQuery } from '../../../../src/features/payments-billing/vnpay-relay';

export const runtime = 'nodejs';

export function POST(request: Request): Promise<Response> {
  const origin = process.env.BACKEND_ORIGIN ?? 'https://wedding-be-render-trial.onrender.com';
  return relayVnpayQuery(request, { fetch, backendOrigin: `${origin.replace(/\/+$/, '')}/api/v1` });
}
