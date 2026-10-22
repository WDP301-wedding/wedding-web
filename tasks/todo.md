# Payment recovery tasks — 2026-10-22

- [x] WEB-FE-PAY-01: Discover and resume existing deposit/balance attempts without
      browser-stored IDs; recover checkout links, handle conflicting POSTs, preserve
      uncertain intent identity and block fresh payments on failed discovery.
- [x] WEB-BE-PAY-01: Add stored-authority discovery, including unapplied verified
      successes, and retry interrupted downstream application through existing status.
- [x] WEB-CONTRACT-PAY-01: Pin generated frontend types to backend commit
      `4e657b8` (local commit; publish it before remote frontend CI fetches the artifact).
- [ ] WEB-CHECK-PAY-01: Complete static, full-suite and production-build checks.
      Frontend 308 tests/build/typecheck pass; focused backend payment checks pass.
      Full backend retains CI/Guest/media failures and Windows cleanup/worker
      failures. Frontend audit is blocked by existing advisories/expired exception.
- [x] WEB-BROWSER-PAY-01: Inspect local desktop/mobile recovery with synthetic HTTP
      fixtures; both purposes restore without new payment POSTs, verified failure
      permits a fresh payment after eligibility refresh.
- [ ] WEB-E2E-PAY-01: Authorized backend/frontend deployment followed by direct
      deployed browser verification. No new genuine provider settlement is claimed.
