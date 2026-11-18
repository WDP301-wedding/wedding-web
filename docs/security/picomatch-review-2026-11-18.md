# Picomatch ReDoS review, 18 November 2026

The project owner approved this narrow exception on 18 November 2026, until
**2 December 2026 at 00:00 UTC** (same deadline as the backend exception in
`wedding-be/docs/dependency-audit-exceptions.json`). It is not a blanket audit
bypass: the policy still rejects every other high/critical advisory, any new
picomatch copy or consumer, and any use after the deadline.

## Advisory

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf):
picomatch `<= 4.0.7` can spend excessive CPU on a glob pattern with repeated
single-branch extglobs. Exploiting it requires the attacker to supply the
pattern. The registry's latest release is 4.0.7, so no patched version exists;
`npm audit` only proposes an unrelated major downgrade of Vitest.

## Reachability and scope

Locked copies: `picomatch@2.3.2` (via `@next/eslint-plugin-next` -> `fast-glob`
-> `micromatch`) and `picomatch@4.0.7` under `@dotenvx/dotenvx`, `tinyglobby`,
`vite` and `vitest`. All consumers are developer tooling: lint, tests/build
tooling and the shadcn CLI (`shadcn` -> `@shadcn/registry` -> `@dotenvx/dotenvx`).

`shadcn` is listed under `dependencies`, so `npm audit --omit=dev` also reports
this chain. The application only imports `shadcn/tailwind.css`, a stylesheet
bundled at build time; no shadcn, dotenvx or glob code runs in the Next.js
server or browser bundle. Glob patterns used by these tools come from
repository configuration, never from request, payment, account or browser input.

`scripts/audit-ci.mjs` pins the exact lockfile copies and every package that
declares picomatch. A changed version, new copy or new consumer fails CI and
needs a fresh review.

## Follow-up and rollback

Recheck upstream before 2 December. Remove the exception once a patched
picomatch is available and the lockfile resolves it. Moving `shadcn` to
`devDependencies` is a separate clean-up that would take this chain out of the
production-only audit. An untrusted change to lint/test configuration is still
an untrusted code change and must not run with deployment credentials.
