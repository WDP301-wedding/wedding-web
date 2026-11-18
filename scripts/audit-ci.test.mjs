import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateAuditReport } from './audit-ci.mjs';

const beforeReview = new Date('2026-10-28T23:59:59.000Z');

function reviewedLockfile() {
  return {
    lockfileVersion: 3,
    packages: {
      '': { name: 'wedding-web' },
      'node_modules/@next/eslint-plugin-next': {
        dev: true,
        version: '16.3.6',
        dependencies: { 'fast-glob': '3.3.1' },
      },
      'node_modules/fast-glob': {
        dev: true,
        version: '3.3.1',
        dependencies: { micromatch: '^4.0.4' },
      },
      'node_modules/micromatch': {
        dev: true,
        version: '4.0.8',
        dependencies: { braces: '^3.0.3' },
      },
      'node_modules/braces': { dev: true, version: '3.0.3' },
    },
  };
}

function reviewedReport() {
  return {
    vulnerabilities: {
      braces: {
        severity: 'high',
        via: [
          {
            source: 1240992,
            name: 'braces',
            severity: 'high',
            url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
          },
        ],
      },
      micromatch: { severity: 'high', via: ['braces'] },
      'fast-glob': { severity: 'high', via: ['micromatch'] },
      '@next/eslint-plugin-next': { severity: 'high', via: ['fast-glob'] },
    },
  };
}

test('allows only the reviewed dev-only braces advisory before its review date', () => {
  const result = evaluateAuditReport(reviewedReport(), reviewedLockfile(), beforeReview);
  assert.equal(result.ok, true);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed, [
    '@next/eslint-plugin-next',
    'braces',
    'fast-glob',
    'micromatch',
  ]);
});

test('blocks any unrelated high advisory', () => {
  const report = reviewedReport();
  report.vulnerabilities.example = {
    severity: 'high',
    via: [
      {
        source: 1,
        name: 'example',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-example',
      },
    ],
  };
  const result = evaluateAuditReport(report, reviewedLockfile(), beforeReview);
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /example/);
});

test('always blocks critical vulnerabilities', () => {
  const report = reviewedReport();
  report.vulnerabilities.example = { severity: 'critical', via: [] };
  const result = evaluateAuditReport(report, reviewedLockfile(), beforeReview);
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /critical.*example/i);
});

test('blocks the exception at the review date', () => {
  const result = evaluateAuditReport(
    reviewedReport(),
    reviewedLockfile(),
    new Date('2026-10-29T00:00:00.000Z'),
  );
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /expired/i);
});

const picomatchAdvisory = {
  source: 1247710,
  name: 'picomatch',
  severity: 'high',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
};
const beforePicomatchReview = new Date('2026-12-01T23:59:59.000Z');

function picomatchLockfile() {
  const packages = { '': { name: 'wedding-web' } };
  for (const [path, version] of [
    ['node_modules/picomatch', '2.3.2'],
    ['node_modules/@dotenvx/dotenvx/node_modules/picomatch', '4.0.7'],
    ['node_modules/tinyglobby/node_modules/picomatch', '4.0.7'],
    ['node_modules/vite/node_modules/picomatch', '4.0.7'],
    ['node_modules/vitest/node_modules/picomatch', '4.0.7'],
  ]) {
    packages[path] = { version };
  }
  for (const [path, section, range] of [
    ['node_modules/@dotenvx/dotenvx', 'dependencies', '^4.0.4'],
    ['node_modules/@dotenvx/dotenvx/node_modules/fdir', 'peerDependencies', '^3 || ^4'],
    ['node_modules/micromatch', 'dependencies', '^2.3.1'],
    ['node_modules/tinyglobby', 'dependencies', '^4.0.4'],
    ['node_modules/tinyglobby/node_modules/fdir', 'peerDependencies', '^3 || ^4'],
    ['node_modules/vite', 'dependencies', '^4.0.7'],
    ['node_modules/vitest', 'dependencies', '^4.0.7'],
  ]) {
    packages[path] = { ...packages[path], [section]: { picomatch: range } };
  }
  return { lockfileVersion: 3, packages };
}

function picomatchReport() {
  return {
    vulnerabilities: {
      picomatch: { severity: 'high', via: [picomatchAdvisory] },
      micromatch: { severity: 'high', via: ['picomatch'] },
      vitest: { severity: 'high', via: ['picomatch'] },
    },
  };
}

test('allows the reviewed picomatch advisory before 2 December 2026', () => {
  const result = evaluateAuditReport(picomatchReport(), picomatchLockfile(), beforePicomatchReview);
  assert.deepEqual(result.blocking, []);
  assert.deepEqual(result.allowed, ['micromatch', 'picomatch', 'vitest']);
});

test('blocks the picomatch exception at its review date', () => {
  const result = evaluateAuditReport(
    picomatchReport(),
    picomatchLockfile(),
    new Date('2026-12-02T00:00:00.000Z'),
  );
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /picomatch.*expired/i);
});

test('blocks a new picomatch copy or consumer', () => {
  const lockfile = picomatchLockfile();
  lockfile.packages['node_modules/example'] = { dependencies: { picomatch: '^2.3.1' } };
  lockfile.packages['node_modules/example/node_modules/picomatch'] = { version: '4.0.7' };
  const result = evaluateAuditReport(picomatchReport(), lockfile, beforePicomatchReview);
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /picomatch lockfile copies/);
  assert.match(result.blocking.join('\n'), /picomatch dependency scope/);
});

test('blocks a changed package version or dependency graph', () => {
  const lockfile = reviewedLockfile();
  lockfile.packages['node_modules/braces'].version = '3.0.2';
  lockfile.packages['node_modules/example'] = {
    dev: true,
    version: '1.0.0',
    dependencies: { braces: '^3.0.3' },
  };
  const result = evaluateAuditReport(reviewedReport(), lockfile, beforeReview);
  assert.equal(result.ok, false);
  assert.match(result.blocking.join('\n'), /braces@3\.0\.3|dependency scope/i);
});
