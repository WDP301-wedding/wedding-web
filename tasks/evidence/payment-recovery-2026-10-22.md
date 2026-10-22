# Payment recovery verification — 2026-10-22

Owner authorized fixes in wedding-web and wedding-be for all existing VNPay
payment purposes (DEPOSIT and BALANCE). Wedding-manage-web and wedding-app were
not changed. No real-money payment, provider generation, refund, live data reset
or manual settlement was executed.

## Reproduction and correction

The deployed website returned HTTP 409 `PAYMENT_ATTEMPT_ACTIVE` from deposit
creation in a fresh authorized session. It displayed an instruction to inspect
the prior attempt without showing that attempt. Browser session metadata/URL
was the only recovery source. The status recovery code also did not reconstruct
the optional checkout URL.

The website now discovers server attempts before enabling a fresh payment,
reconciles the chosen attempt by its existing authorized status endpoint, and
reconstructs a validated original checkout link. The same logic handles deposits,
balances and a cross-tab conflict. Uncertain POST identity remains stable; a
verified failure or fully applied success completes the matching journal. A lost
POST response can be associated with its server-discovered attempt before journal
completion. Discovery failures block fresh payment actions. Old status responses
without checkout URLs retain a matching known link/saved-command fallback.

Backend hand-off: [payment attempt discovery](../../../wedding-be/docs/payment-attempt-discovery.md).
The new discovery API also surfaces verified successes awaiting application, so
the existing status endpoint can finish interrupted ledger/Booking work once.
No migration or monetary policy change is included.

## Automated evidence

- Frontend payment/typography checks: 7 files, 90 tests passed.
- Full frontend suite: 43 files, 308 tests passed, no unhandled errors in the final
  run. The initial run had 308 assertions pass but 8 unhandled rejections from the
  pre-existing invitation-tab test's incomplete workspace/session mock. That test
  now supplies an isolated cached workspace instead of starting a real loader;
  its assertions and production invitation code are unchanged.
- Frontend typecheck, lint, production build and generated API digest check passed.
- Backend focused disposable-PostgreSQL payment suites: 5 files, 53 tests passed
  serially. A prior two-worker run passed all assertions but timed out in two
  10-second database cleanup hooks; it is not recorded as a passing run.
- A new HTTP-service regression first failed because verified SUCCEEDED payments
  stayed `applicationStatus=PENDING`. After the fix, DEPOSIT/BALANCE application
  retry tests pass; fully applied payments skip reconciliation.
- Backend OpenAPI contract suite: 5 tests passed. Backend typecheck, production
  build, deterministic OpenAPI check and dependency audit passed.
- The complete backend run finished **NOT_GREEN**: 304 files passed, 6 failed,
  one worker exited before completing; 2,275 assertions passed and 26 failed.
  Failures include the unchanged CI-workflow contract expecting a removed
  format-check step, a Guest-import fault-injection expectation, media tests and
  two 10-second database cleanup hooks. The Windows worker exit affected the
  existing billing HTTP test file. This is not a passing whole-repository gate.
- Isolated manual-payment rerun passed all 4 tests. The isolated media persistence
  rerun reproduced 11 failures at the unchanged repository cutoff check:
  the fixture injects 2026-10-09 into the service while `acceptUpload` uses actual
  `Date.now()` and its cutoff is already past on 2026-10-22. No media rule, test
  timeout or unrelated business behavior was changed by this payment fix.
- A billing-HTTP/runtime follow-up also remained NOT_GREEN: all 12 billing HTTP
  assertions passed but its database cleanup exceeded 10 seconds; the runtime
  worker exited with Windows code 3221226505 (15 assertions completed across the
  two files). No timeout, worker-failure treatment or quality threshold was changed.
- Backend unrestricted lint exhausted the default heap while scanning existing
  generated/operator artifacts. The larger-heap retry was stopped after prolonged
  memory pressure. Authored-source lint uses the repository's previously recorded
  invocation excluding `output/**` and `src/generated/**`; no config or rule was
  weakened. The final authored-source lint and backend typecheck passed.

The frontend contract pins backend commit `4e657b8` with OpenAPI SHA-256
`73726205296c4bf2d7c551f50228df7f9fdcd5d9d61e5a97e2e3c005025d6e91`.
The commit has been published on the backend recovery branch for remote CI retrieval.

## Browser evidence: controlled local HTTP fixtures

Playwright drove the actual Next.js website at localhost:3100 with synthetic
booking/account identifiers. All `/api/v1` calls in the test tab were intercepted;
the tests did not call a live payment provider or settle the owner's booking.

- Fresh DEPOSIT session and reload rediscovered the same attempt, displayed its
  UNKNOWN state and original VNPay link, and issued zero payment POSTs.
- Fresh FULL BALANCE session and reload restored the same attempt/link, kept the
  fresh-balance action disabled while UNKNOWN, and issued zero payment POSTs.
- A controlled verified FAILED balance response removed the link and re-enabled
  a fresh balance payment after context/billing refresh completed. The observation
  waits for the button to become actionable; the intermediate refresh correctly
  keeps it disabled.
- Desktop and 390-pixel mobile screenshots were inspected; Vietnamese text and
  recovery/status controls render correctly. Browser console had zero errors and
  zero warnings for the checked flow.

Local screenshots are in the backend's ignored `output/playwright/` directory:
`payment-recovery-deposit-desktop.png`, `payment-recovery-deposit-mobile.png`,
`payment-recovery-balance-mobile.png`, and
`payment-recovery-balance-failed-desktop.png`.

## Deployment follow-up

The owner explicitly requested push/deploy and approved renewing only the reviewed
development-only braces graph until 29 October 2026. See
[the dated security review](../../docs/security/braces-review-2026-10-22.md).
Vitest/coverage-v8 were upgraded to 5.0.5 (Vite 8.3.5); production-only audit has
zero vulnerabilities and the guarded full audit passes with only that scoped
exception. CI now requires formatting, coverage and audit instead of optional tests.
The updated full frontend coverage passes 43 files / 308 tests: 95.94% lines,
91.25% branches; every changed payment file meets the existing per-file 80% gate.

Backend PR [#90](https://github.com/WDP301-wedding/wedding-be/pull/90) restores
mandatory format/unit/contract/integration/coverage gates. Stale media clock,
acceptance-boundary and Guest batch rollback fixtures were repaired without changing
production business rules (43 tests plus one fresh repository-cutoff regression
passed). Only generated Prisma/operator artifacts are excluded from authored-source
format/lint; five existing formatting violations were corrected. No timeout,
assertion or coverage threshold was reduced.

Exact-head Linux checks and deployment remain in progress. Direct deployed browser
verification and genuine VNPay sandbox outcomes remain separate from offline checks.
Backend must deploy before the website because discovery fails closed when the new
API is absent. No real-money payment is authorized or performed by this rollout.

Implementation commits on `codex/payment-recovery-20261022`:
backend `4e657b8`, frontend `9202359`. The backend implementation is published;
frontend push and both production deployments follow the required checks.
