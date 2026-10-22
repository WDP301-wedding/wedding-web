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
- Backend unrestricted lint exhausted the default heap while scanning existing
  generated/operator artifacts. The larger-heap retry was stopped after prolonged
  memory pressure. Authored-source lint uses the repository's previously recorded
  invocation excluding `output/**` and `src/generated/**`; no config or rule was
  weakened. The final authored-source lint and backend typecheck passed.

The frontend contract pins backend commit `4e657b8` with OpenAPI SHA-256
`73726205296c4bf2d7c551f50228df7f9fdcd5d9d61e5a97e2e3c005025d6e91`.
The commit is local; publish it before remote frontend CI retrieves the artifact.

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

## Release limits

The frontend's unchanged dependency lock currently fails `npm run audit:ci`:
5 high/3 moderate findings, including Vite GHSA-587h-7wmj-h5pm, and the existing
braces allowlist expired on 2026-10-16. No dependency exception was extended,
dependency downgraded or audit gate bypassed by this payment fix. This is an
existing release blocker, separate from the payment behavior regressions.

No backend/frontend deployment or main-branch merge is included. Direct deployed
browser verification and genuine VNPay sandbox outcomes remain pending authorized
rollout and the release gates. Local/offline checks do not prove live provider
readiness. Backend must deploy before the website because discovery fails closed
when the new API is absent.
