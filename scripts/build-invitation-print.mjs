import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const check = process.argv.includes('--check');
const root = resolve(import.meta.dirname, '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const result = await build({
  absWorkingDir: root,
  entryPoints: ['scripts/invitation-print-entry.tsx'],
  outfile: 'artifacts/invitation-print/renderer.cjs',
  bundle: true,
  write: false,
  metafile: true,
  minify: true,
  format: 'cjs',
  platform: 'node',
  target: 'node24',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'next/image': './scripts/invitation-print-image.ts' },
  legalComments: 'eof',
});
const js = result.outputFiles.find((file) => file.path.endsWith('.cjs')).contents;
const css = result.outputFiles.find((file) => file.path.endsWith('.css')).contents;
const digest = createHash('sha256').update(js).update(css).digest('hex');
const files = { 'renderer.cjs': hash(js), 'renderer.css': hash(css) };
const sourceFiles = Object.fromEntries(
  await Promise.all(
    Object.keys(result.metafile.inputs)
      .sort()
      .filter((path) => !path.startsWith('node_modules/'))
      .map(async (path) => [path.replaceAll('\\', '/'), hash(await readFile(resolve(root, path)))]),
  ),
);
const manifest = JSON.stringify({ version: 1, digest, files, sourceFiles }, null, 2) + '\n';
const output = resolve(root, 'artifacts/invitation-print', digest);
const entries = [
  [resolve(output, 'renderer.cjs'), js],
  [resolve(output, 'renderer.css'), css],
  [resolve(root, 'artifacts/invitation-print/current.json'), manifest],
];
for (const [path, bytes] of entries) {
  if (check) {
    if (!(await readFile(path)).equals(Buffer.from(bytes)))
      throw Error(`Invitation content renderer is stale: ${path}`);
  } else {
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, bytes);
  }
}
console.log(`Invitation Content renderer ${check ? 'verified' : 'generated'}: ${digest}`);
