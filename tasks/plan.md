# Payment recovery revision — 2026-10-22

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
runtime before claiming automatic recovery is operational. The corrected Render
merchant IPN now has authentic successful NCB balance evidence, and the original
UNKNOWN deposit was recovered using signed operator-query evidence. See
[the live settlement report](./evidence/vnpay-ipn-settlement-2026-10-23.md).

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
