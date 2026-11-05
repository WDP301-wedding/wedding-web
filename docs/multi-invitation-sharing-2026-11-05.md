# Independent invitation sharing — 5 November 2026

The owner requested all saved designs in Sharing on wedding-web, followed by the
same behavior in PRM-app (Flutter). The owner explicitly selected separate links
and QR codes for simultaneous sharing, rather than replacing a shared booking link.

Sharing renders one named card per saved design. Names use a bold foreground
heading; links, QR, publish/update and unpublish actions belong to that design.
The editor's selection and unsaved content are preserved. Completed/settled
preparation retains historical reads and sharing links without mutation controls.
Both clients follow invitation-list cursors to include every saved design.

Backend prerequisite: apply the forward per-design publication migration and
deploy the new GET publication endpoint before releasing either client. See
`../../wedding-be/docs/multi-invitation-sharing-2026-11-05.md`.

Local browser checks use synthetic design/publication responses. They verify
three designs, independent copy/publish/unpublish behavior, Vietnamese glyphs,
keyboard access and widths 320, 390, 768, 1024 and 1440. Flutter web is a separate
synthetic preview; native Android packaging is not part of verification.

Hosted deployment and a browser check against the deployed compatible backend
remain separate release work. Local fixtures do not establish hosted acceptance.

Verification: 79 focused tests pass with one worker, including the sharing/API/
typography checks and rechecks of collaboration/payment timeouts seen under the
parallel full run. The production build passes using public HTTPS configuration.
The initial full parallel run was not green: the 15 legacy Studio tests also fail
before this change, and four other failures were timing/hook failures. The
invitations-page suite's legacy selectors remain outside the focused acceptance.
No all-suite-green claim is made.
