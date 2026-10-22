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

Exact-head Linux checks and deployed read verification are now complete, as detailed
below. Genuine VNPay settlement remains separate. No real-money payment was performed.

Implementation commits on `codex/payment-recovery-20261022`:
backend `4e657b8`, frontend `9202359`. Both implementations are published and merged.

## Final rollout — 23 October, Asia/Ho_Chi_Minh

- Backend main `5a102e4814be3399cdf8031bfce62f3c57e6e0e8` is live on
  <https://wedding-be-render-trial.onrender.com>, deployment
  `dep-dbd4hlfavr4c73ccbr70`.
  [Main CI](https://github.com/WDP301-wedding/wedding-be/actions/runs/39822199304)
  passed 311 files / 2,318 tests, including 708 PostgreSQL integration tests;
  full coverage is 97.37% lines and 92.88% branches. Five additional meaningful
  catalog-media cache/cursor/ownership tests fixed the remaining existing per-file
  branch gap. All original thresholds and assertions remain enforced.
- Health, catalog and OpenAPI return 200; unauthenticated discovery returns 401.
  The deployed OpenAPI digest exactly matches the pinned digest above. All 87
  environment variables match their pre-deployment snapshot; no migration was added.
- Render did not create an automatic deployment within more than two minutes after
  green main CI. The same checked main commit was explicitly deployed with Render
  CLI. This proves this deployment, not the future checksPass trigger.
- Frontend [PR #26](https://github.com/WDP301-wedding/wedding-web/pull/26) merged
  the payment implementation. Its main deployment correctly stopped when a newly
  reported critical Next.js advisory became visible to audit.
  [PR #27](https://github.com/WDP301-wedding/wedding-web/pull/27) upgraded Next.js
  to 16.4.2; see the [runtime review](../../docs/security/next-runtime-review-2026-10-23.md).
  No runtime/critical exception was added.
- Frontend main `9b914972d4fc9506b055f7662d71f0fb8a1c5562` is live at
  <https://wedding-web-silk.vercel.app>, deployment
  <https://wedding-jxbawhvji-bach-le-ba-s-projects.vercel.app>.
  [Main CI and deployment](https://github.com/WDP301-wedding/wedding-web/actions/runs/39825215261)
  are green. The upgraded runtime passes 43 files / 308 tests, 95.94% lines and
  91.25% branches; typecheck, build, guarded audit and production-only audit pass.

## Direct deployed browser evidence

Playwright used a new isolated context and the owner-supplied login through the
website UI. No HTTP response was mocked and no browser payment journal/attempt ID
was seeded. The first payment navigation contained only the original booking ID.

- Discovery and status return 200 with `Cache-Control: no-store`, automatically
  finding attempt `2ea46496-04a9-4da8-b8a6-51cccf76e6dd`, DEPOSIT, 21,000,000 VND.
- Reload keeps that same attempt ID and amount; payment creation POST count is zero.
- Desktop 1440px, mobile 390px and a scrolled mobile viewport were visually
  inspected. Vietnamese text, controls and the retained UNKNOWN explanation render
  correctly. The authenticated payment phase has zero HTTP/console errors.
- The initial anonymous login bootstrap returns the expected 401 from
  `/api/v1/auth/web-session-refreshes`; a separate phase-aware check confirms it
  precedes authentication and is not a payment request failure.
- `/`, `/sanh`, `/thuc-don`, `/dang-nhap` and the proxied catalog API return 200.
- The supplied account is RESTRICTED, so genuine FULL-balance payment cannot be
  tested on this booking. Balance behavior is covered by the controlled browser
  fixtures and automated tests above; no new provider settlement is claimed.

Sanitized receipts are in the backend's ignored `output/payment-release-*.json`;
screenshots are `output/playwright/payment-live-desktop.png`,
`payment-live-mobile.png` and `payment-live-mobile-viewport.png`. They contain no
login password, access token or signed checkout URL.

## Remaining provider uncertainty

The retained attempt remains UNKNOWN; its original link expired at
`2026-10-22T14:45:34.671Z`. Expiry alone does not prove nonpayment. The website
correctly prevents a new deposit and displays the existing transaction.

Render status reads with request IDs `34460bf5-ccdd-47e3-badc-1ca727bd0e0b` and
`1c58a303-322a-4e37-8e3a-9c5d10713fa1` took 5,048ms and 5,044ms. This is consistent
with the existing gateway's 5,000ms timeout, but the caught provider cause is not
exposed, so a network/signature/provider root cause is not established by timing.
A local unsigned HEAD probe reached the fixed VNPay query endpoint in 261ms (405).
A read-only Render-side probe could not run because the operator has no accepted
SSH public key. No SSH key was registered, no provider secret was changed and no
payment row was forced terminal. Authenticated VNPay reconciliation/operator proof
is still required to resolve this payment safely.
