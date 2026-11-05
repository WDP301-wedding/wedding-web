# Payment recovery tasks — 2026-10-22

## Independent invitation sharing — 2026-11-05

- [x] SHARE-WEB-01: List every saved design in Sharing with a clear title and independent controls.
- [x] SHARE-BE-01: Preserve legacy links and add per-design publication identities and reads.
- [x] SHARE-APP-01: Show the same designs and publication controls in PRM-app.
- [x] SHARE-LOCAL-01: Verify synthetic desktop/mobile browser behavior and PostgreSQL migration with retained identities.
- [ ] SHARE-HOSTED-01: Deploy compatible backend/migration and clients, then verify the deployed website.

## Read-only preparation — 2026-11-05

- [x] WEB-FE-ARCHIVE-01: Show saved guests, seating, invitations and print history with editing controls hidden.
- [x] WEB-BE-ARCHIVE-01: Allow authorized historical reads and return `PREPARATION_READ_ONLY` for writes after either lock trigger.
- [x] WEB-E2E-ARCHIVE-01: Verify completion at desktop width and settlement at mobile width in a local browser with synthetic API responses.
- [ ] WEB-E2E-ARCHIVE-02: Release compatible backend and web revisions and verify historical views on the deployed site.

## Completed demo follow-up — 2026-11-04

- [x] DEMO-COMPLETE-01: Existing Manager command changes HY-000028 to COMPLETED;
      proposal re-read succeeds and invoice/ledger fingerprints remain identical.
- [x] DEMO-COMPLETE-02: Web overview and invoice screens distinguish completion,
      settlement, debt, credit and unknown evidence; remove future countdown for
      completed events. Full Web suite: 373 tests; static checks and production
      build pass. Isolated desktop/mobile browser verification is recorded.
- [x] DEMO-COMPLETE-03: Manager and PRM-app implement the same display distinction.
      Their implementation and separate verification limitations are documented
      in their completion hand-offs. No hosted deployment is claimed.

- [x] WEB-SANDBOX-ROOT-01: Reproduce Render outbound connection timeouts and
      verify the stuck order's signed FAILED result from an independent connection.
- [ ] WEB-SANDBOX-FIX-01: Ship authenticated web-server query relay, backend proof
      verification, durable five-minute query coordination and passive checkout reads.
- [ ] WEB-SANDBOX-E2E-01: Deploy, recover the old UNKNOWN attempt, then verify the
      authorized NCB sandbox card checkout with persisted settlement/application.

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
