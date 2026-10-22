# Payment recovery revision — 2026-10-22

The current checkout did not contain the earlier canonical plan/todo documents.
This scoped continuation records only the owner-requested payment recovery work;
historical backend SPEC/RV evidence remains unchanged.

1. Update the shared deposit/balance frontend recovery flow and regression tests.
2. Add authorized backend discovery for unresolved attempts and interrupted payment
   applications; preserve settlement, expiry and idempotency safeguards.
3. Regenerate the exact OpenAPI client, run static/contract/unit/PostgreSQL checks,
   and inspect desktop/mobile browser behavior with controlled synthetic responses.
4. Deploy backend before frontend once authorized, then directly verify the deployed
   website using the owner's account. Keep real-money operations outside testing.

API hand-off: [payment attempt discovery](../../wedding-be/docs/payment-attempt-discovery.md).
Task status: [todo](./todo.md).
