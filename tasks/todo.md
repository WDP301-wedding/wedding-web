# Payment recovery tasks — 2026-10-22

- [x] WEB-SANDBOX-ROOT-01: Reproduce Render outbound connection timeouts and
      verify the stuck order's signed FAILED result from an independent connection.
- [x] WEB-SANDBOX-FIX-01: Ship authenticated web-server query relay, backend proof
      verification, durable five-minute query coordination and passive checkout reads.
- [x] WEB-SANDBOX-E2E-01: Deploy, recover the old UNKNOWN attempt, then verify the
      authorized NCB sandbox card checkout with persisted settlement/application.
      Old UNKNOWN recovery used verified operator QueryDr; balance settlement was
      automatic authentic IPN after correcting the merchant URL. See
      [live evidence](./evidence/vnpay-ipn-settlement-2026-10-23.md).
- [ ] WEB-SANDBOX-QUERY-01: Prove a nonterminal QueryDr provider round trip from
      the final deployed Vercel `sin1` runtime. Terminal-status reads pass; do not
      claim cloud query recovery based on an operator query or IPN settlement.

- [x] WEB-FE-PAY-01: Discover and resume existing deposit/balance attempts without
      browser-stored IDs; recover checkout links, handle conflicting POSTs, preserve
      uncertain intent identity and block fresh payments on failed discovery.
- [x] WEB-BE-PAY-01: Add stored-authority discovery, including unapplied verified
      successes, and retry interrupted downstream application through existing status.
- [x] WEB-CONTRACT-PAY-01: Pin generated frontend types to backend commit
      `4e657b8` (published on the backend recovery branch).
- [x] WEB-CHECK-PAY-01: Static, full-suite, coverage, audit and production build gates
      pass. Backend: 311 files / 2,318 tests; frontend: 43 files / 308 tests,
      including Next.js 16.4.2. Production-only audit is clear; only the reviewed
      dev-only exception is owner-approved through 29 October.
- [x] WEB-BROWSER-PAY-01: Inspect local desktop/mobile recovery with synthetic HTTP
      fixtures; both purposes restore without new payment POSTs, verified failure
      permits a fresh payment after eligibility refresh.
- [x] WEB-E2E-PAY-01: Backend `5a102e4` and frontend `9b91497` are deployed.
      Fresh isolated browser login, deposit recovery/reload, desktop/mobile and
      public smoke reads pass with zero new payment POSTs. No genuine settlement
      or live FULL-balance payment is claimed.
- [x] WEB-PROVIDER-PAY-01: Reconcile the existing expired 21,000,000 VND deposit.
      Verified signed FAILED evidence released the original attempt. New deposit
      and balance succeeded; exactly two payment entries total 70,000,000 VND.
      Render outbound timeouts and the retired Railway merchant IPN were proven.
      See [live evidence](./evidence/vnpay-ipn-settlement-2026-10-23.md).
- [ ] WEB-DEPLOY-HOOK-01: Verify the Render checksPass automatic trigger separately.
      This release used an explicit deployment of the checked main commit after
      no automatic deployment appeared; no CI gate was bypassed.
