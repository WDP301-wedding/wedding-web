# Development-only braces review, 22 October 2026

The project owner explicitly approved renewing this narrow exception in the
deployment conversation on 22 October, until **29 October 2026 at 00:00 UTC**.
This is a fresh review of the expired 16 October exception, not a blanket audit
bypass. The audit policy still rejects every unrelated high/critical advisory,
runtime dependency, changed version/graph and use after the review deadline.

## Reachability and scope

The locked chain remains `@next/eslint-plugin-next@16.3.6` ->
`fast-glob@3.3.1` -> `micromatch@4.0.8` -> `braces@3.0.3`. All four lock entries
are development-only. The Next ESLint plugin's `dist/utils/get-root-dirs.js`
calls glob only for `settings.next.rootDir`, which is repository-controlled ESLint
configuration. It does not process request, payment, account or other browser input.
The application does not import these packages. A production-only dependency audit
and the full guarded audit are recorded with the release checks.

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
describes stack exhaustion from deeply nested brace patterns. The registry still
publishes braces 3.0.3 as latest and the advisory lists no patched release.
Upgrading the Next ESLint plugin to 16.3.8 would retain fast-glob 3.3.1 and would
not remove this chain. Removing the plugin would remove Next-specific lint checks,
so that is not used as a workaround.

Vitest and coverage-v8 have instead been upgraded together to 5.0.5, resolving
Vite to 8.3.5 and applying the available fixes. No runtime dependency changed.

## Follow-up and rollback

Recheck upstream before 29 October. Remove this exception when a compatible patch
is available; any dependency graph change requires a new review. An untrusted
change to repository lint settings is still an untrusted code change and must not
run with deployment credentials. Stop release if the scoped audit guard rejects
the graph or the production-only audit reports high/critical findings.
