# Payment recovery revision — 2026-10-22

## Independent invitation sharing — 2026-11-05

Owner-approved scope: wedding-web, supporting wedding-be, then PRM-app (Flutter).
Show every saved design with a clear title and an independent stable link/QR.
Keep existing links and immutable invitation/print history. Verify isolated
multi-design behavior and migration before releasing backend ahead of clients.
See [the hand-off](../docs/multi-invitation-sharing-2026-11-05.md).

## Read-only preparation — 2026-11-05

Switch guest, seating and invitation preparation to read-only after event
completion or verified final settlement. Preserve booking access checks, saved
data and existing file downloads. Keep arrangement and invitation design on
wedding-web. PRM-app shows saved data and links to the corresponding web page.
Verify both triggers in an isolated browser fixture before hosted acceptance.

## Owner-requested completed demo follow-up — 2026-11-04

The owner explicitly requested completing the existing demo booking and fixing
its display across wedding-web, wedding-manage-web and PRM-app (Flutter).
Use the existing audited Manager completion command, preserve all financial
history, and show completion separately from invoice/payment evidence. Verify
paid, unpaid, overpaid, stale and unavailable states. The implementation details
and verification scope are recorded in
[the completion hand-off](../docs/completed-settlement-2026-11-04.md).
Hosted client deployment is separate from local implementation.

The current checkout did not contain the earlier canonical plan/todo documents.
This scoped continuation records only the owner-requested payment recovery work;
historical backend SPEC/RV evidence remains unchanged.

## Sandbox connectivity recovery — 23 October

The owner authorized NCB sandbox checkout and bounded database recovery. Render
querydr connection timeouts are now reproduced; a workstation receives valid
signed FAILED evidence for the stuck order. Implement the web-server query relay,
retain backend signature/amount/authorization/idempotency checks, and coordinate
the provider's five-minute query limit. Then deploy backend before frontend and
verify UNKNOWN recovery plus the NCB sandbox journey on the deployed website.
See [API and diagnosis](../../wedding-be/docs/vnpay-query-relay.md).

Follow-up: the first Vercel query also timed out. Pin its server runtime to
Singapore (`sin1`) near the API/provider and expose only the failed transport
stage in an error header for diagnosis. Verify connectivity on the deployed
runtime before claiming automatic recovery is operational.

1. Update the shared deposit/balance frontend recovery flow and regression tests.
2. Add authorized backend discovery for unresolved attempts and interrupted payment
   applications; preserve settlement, expiry and idempotency safeguards.
3. Regenerate the exact OpenAPI client, run static/contract/unit/PostgreSQL checks,
   and inspect desktop/mobile browser behavior with controlled synthetic responses.
4. Deploy backend before frontend once authorized, then directly verify the deployed
   website using the owner's account. Keep real-money operations outside testing.

API hand-off: [payment attempt discovery](../../wedding-be/docs/payment-attempt-discovery.md).
Task status: [todo](./todo.md).

The authorized rollout completed on 23 October (Asia/Ho_Chi_Minh). See the
[deployed evidence](./evidence/payment-recovery-2026-10-22.md). Provider resolution
of the existing UNKNOWN payment remains a separate follow-up; deployment/read
verification does not establish a new VNPay settlement.
