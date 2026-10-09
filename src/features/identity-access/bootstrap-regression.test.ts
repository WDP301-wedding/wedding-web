import { expect, it } from 'vitest';
import { consumeCredentialFragment } from './session';
it('accepts the raw fragments issued by the existing backend email adapter and removes them', () => {
  const paths: string[] = [];
  const token = `wip_${'A'.repeat(43)}`;
  expect(
    consumeCredentialFragment(`https://wedding.example/reset-password#${token}`, (value) =>
      paths.push(value),
    ),
  ).toEqual({ kind: 'reset', token });
  expect(paths).toEqual(['/reset-password']);
});
