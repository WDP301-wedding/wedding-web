# Completed events and settlement display

The owner requested a complete demo journey on 4 November 2026 across wedding-web,
wedding-manage-web and PRM-app (Flutter), including marking the existing demo
booking complete. wedding-app (Expo) is outside this request.

Event completion and financial settlement remain separate facts. A completed
event no longer displays a countdown, even when its scheduled date is in the future.
The overview reads the current final invoice and current billing totals before
showing “Đã tất toán”. Confirmed events paid early retain their preparation tasks;
completed events retain only the relevant invoice/payment follow-up.

Settlement requires a current final invoice matching accepted charges, zero debt,
zero credit, and net receipts matching charges. Missing evidence, historical billing
pages, mismatched totals, active payment attempts and financial conflicts cannot
certify settlement. A zero balance without an invoice remains awaiting finalization.
Outstanding debt and excess receipts remain visible after event completion. The
existing backend eligibility controls payment admission.

Regression coverage includes the paid demo, unpaid completed events, overpayment,
invoice absence/mismatch, stale ledger pages, failed refresh, booking switching and
pre-deposit access. Browser verification uses isolated read-only API snapshots;
it does not create or verify a new provider payment.

The existing backend completion command changed demo HY-000028 from CONFIRMED
revision 19 to COMPLETED revision 20. Invoice and ledger fingerprints matched
before/after; outstanding remained 0 VND. See the backend's
[completion evidence](../../wedding-be/tasks/evidence/demo-completion-2026-11-04.md).

Implementation and local verification are separate from publication: these client
changes require deployment before appearing on the hosted websites. No release,
merge, provider test or mobile installation is implied by this document.

Local verification: 56 files / 373 tests pass; lint, typecheck and production build
pass. The first build correctly rejected the developer's HTTP API URL under
production mode; rebuilding with the existing public HTTPS configuration passed
without changing env files or weakening validation. A deliberate mutation removing
the invoice requirement was caught by the regression suite and restored.

Real browser checks at 1440px and 390px show completed/settled status, no future
countdown or payment reminder and no horizontal page overflow. Financial responses
are isolated snapshots of authorized API reads, not a new live payment. Browser
captures are kept outside Git under wedding-be/output/playwright/.
