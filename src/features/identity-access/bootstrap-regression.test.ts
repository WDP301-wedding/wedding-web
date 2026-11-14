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

it('leaves history alone when the URL carries no credential, so in-flight navigation survives', () => {
  const paths: string[] = [];
  expect(
    consumeCredentialFragment('https://wedding.example/#hoi-dap', (value) => paths.push(value)),
  ).toBeNull();
  expect(
    consumeCredentialFragment('https://wedding.example/', (value) => paths.push(value)),
  ).toBeNull();
  expect(paths).toEqual([]);
});
