# Prospective deposit policy — 2026-11-08

Branch: `codex/tasks-8-10-dashboard-deposit`. Owner-approved Task 10 displays the
server-frozen percentage on the contract and proposal, instead of fixed 30% copy.
Public FAQs describe the agreed contract policy. Historical responses without a
percentage retain 30%; invalid values are rejected rather than inferred from money.

Payment amounts remain server-owned. Manager configuration applies only to bookings
created after the change, not later event dates or new drafts of existing bookings.
The generated API client is pinned to the live backend release
`56372ce9f683735d9dfea87016cd2b898f0225fd`, SHA-256
`42f27e6c510b26b384d4b9e86b171be14a85da08110e7ef97be445d36f7fea27`.
Its deployed schema digest was verified before regeneration; percentage values
remain runtime-validated locally.

See `../wedding-be/docs/tasks-8-10-api-handoff.md` for migrations and release caveats.
