# Prospective deposit policy — 2026-11-08

Branch: `codex/tasks-8-10-dashboard-deposit`. Owner-approved Task 10 displays the
server-frozen percentage on the contract and proposal, instead of fixed 30% copy.
Public FAQs describe the agreed contract policy. Historical responses without a
percentage retain 30%; invalid values are rejected rather than inferred from money.

Payment amounts remain server-owned. Manager configuration applies only to bookings
created after the change, not later event dates or new drafts of existing bookings.
Released generated API pins remain unchanged pending an actual coordinated backend
release; added percentage values are runtime-validated locally.

See `../wedding-be/docs/tasks-8-10-api-handoff.md` for migrations and release caveats.
