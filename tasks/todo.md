# Payment recovery tasks — 2026-10-22

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
- [ ] WEB-PROVIDER-PAY-01: Reconcile the existing expired 21,000,000 VND deposit,
      which remains UNKNOWN. Status requests take approximately the gateway's
      five-second timeout; a Render-side connectivity cause is not yet proven.
      Preserve proof and blocking behavior; never force failure to enable a new
      payment. See the final deployed evidence for request IDs and limits.
- [ ] WEB-DEPLOY-HOOK-01: Verify the Render checksPass automatic trigger separately.
      This release used an explicit deployment of the checked main commit after
      no automatic deployment appeared; no CI gate was bypassed.
