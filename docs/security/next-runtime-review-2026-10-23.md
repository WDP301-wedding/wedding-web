# Next.js runtime patch during the payment rollout

The final production audit blocked payment rollout commit `ba74b5a` before Vercel
deployment. The same locked dependencies had passed the earlier PR audit; the
advisory database subsequently reported Next.js 16.3.8 as affected. Backend commit
`5a102e4` is already live and its additive payment discovery API is healthy.

Upgrade the runtime from Next.js 16.3.8 to 16.4.2. The upstream advisories identify
16.4.1 as the patched 16.x release; 16.4.2 includes that fix and subsequent fixes.
No critical/runtime advisory is exempted, and the existing scoped development-only
braces exception is unchanged.

- [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw):
  critical Image Optimization vulnerability affecting 16.0.0 through 16.4.0;
  upstream was published on 14 October and added/reviewed in the GitHub advisory
  database on 22 October. The patch ensures a fixed sharp dependency.
- [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r):
  high App Router Server Actions denial of service, with the same affected 16.x
  range and patched release.
- [Next.js 16.4.2 release](https://github.com/vercel/next.js/releases/tag/v16.4.2).

Release requires guarded full and production-only audit, typecheck, lint,
formatting, locked API verification, full coverage and production build on the new
lockfile. Deployed browser checks remain required after Vercel readiness. No
payment state, provider evidence, migration or amount is changed by this patch.
