# Invitation Content is the print source

Owner amendment, 2026-11-04: export the reading pages from Nội dung thiệp rather
than fitting the invitation into two A5 faces. Seating has its own page. New print
snapshots retain the saved design, approved timeline and confirmed Seating; an
unsaved selected design must be saved before preview. Pricing remains server-owned.

The editor and guest renderer use `invitation-pages.tsx` and the existing CSS module.
`InvitationPrintContents` uses those exact pages, cover, photos and Seating SVG.
Only paper pagination and static navigation differ. Legacy Content markup also has
one shared component. Published snapshots keep their generic QR; private drafts do
not print an unusable QR.

`npm run print:generate` builds the offline server artifact from these components
and styles. `npm run print:check` regenerates in memory and rejects stale artifacts.
`artifacts/invitation-print/current.json` records source hashes and identifies the
immutable directory by the combined JavaScript/CSS SHA-256. The backend vendors
that directory and pins this repository's exact source commit. There is no runtime
frontend fetch, guest URL or authentication token in the generated document.

When changing the Content renderer, generate a new hash directory and hand it to
the backend with the source commit. Preserve previously released directories: an
accepted print snapshot uses its captured artifact, never the latest UI version.
Historical snapshots without a content-renderer marker retain their PDFKit path.

Verification: the parity test compares Content-tab reading pages with print markup,
including the exact rotated Seating SVG. Backend acceptance exercises actual PDFs,
native HTTP authorization/download, immutability and the no-extra-charge rules.
Render the PDFs to images and inspect Vietnamese glyphs, table labels and page edges.
