# Deployed VNPay sandbox settlement: 23 October 2026

The owner authorized NCB sandbox testing, recovery and deployment. Backend evidence
and bounded database-repair details are recorded in
[the settlement report](../../../wedding-be/tasks/evidence/vnpay-render-settlement-2026-10-23.md).

The merchant portal retained the stopped Railway IPN address. It now retains
`https://wedding-be-render-trial.onrender.com/api/v1/billing/callbacks/vnpay`
after save/reload. Authentic BALANCE IPN success proves the new endpoint works.

For the authorized Lotus booking, the old UNKNOWN deposit was closed only after
valid signed FAILED evidence. After canonical hold recovery, a new 21,000,000 VND
deposit succeeded and was applied by canonical reconciliation using fresh signed
provider evidence. Exactly one deposit payment/application promoted the booking
to CONFIRMED. This recovery was performed by the operator, not the web relay.

The deployed browser then created and paid the 49,000,000 VND balance with NCB.
The correct test OTP is `123456`, per
[VNPay's official documentation](https://sandbox.vnpayment.vn/apis/vnpay-demo/).
The backend automatically accepted authentic IPN evidence and recorded exactly
one balance payment. No operator reconciliation was used for that balance.
The website shows 70,000,000 VND paid, zero outstanding, and completed application.
Reload/status replay did not duplicate either payment. The authenticated relay
terminal-status route returned HTTP 200 with `Cache-Control: no-store`.

Desktop 1440px and mobile 390px Vietnamese text were visually inspected. Mobile
had no horizontal page overflow. A fresh login was required in the return tab;
the application never inferred payment from URL parameters. The other Orchid
test booking correctly rejected deposit creation as ineligible; no payment or
eligibility repair was created for it.

Backend `f068aa8` and frontend `25e72fe` are live.
[Frontend CI/deployment](https://github.com/WDP301-wedding/wedding-web/actions/runs/39838983919)
passed: 46 files / 344 tests, per-file coverage gates, contract verification,
typography, lint/typecheck, dependency audit and production build. The existing
dev-only audit exception remains approved through 29 October; production is clear.

The first cloud query relay timed out. The follow-up `sin1` runtime and safe error
stage diagnostics are deployed, but no nonterminal provider query from this final
runtime has been proven. Automatic QueryDr recovery stays an explicit follow-up.
The corrected IPN path and genuine sandbox settlement are independently proven.
