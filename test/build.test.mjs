import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function builder() {
  const url = new URL('../scripts/build.mjs', import.meta.url);
  assert.ok(existsSync(url), 'Missing reproducible build API');
  return import(url);
}

test('clean copied source produces identical assets and source-only changes invalidate map reference', async function () {
  const { buildAssets } = await builder();
  const root = mkdtempSync(join(tmpdir(), 'dv-build-'));
  try {
    cpSync(new URL('../src', import.meta.url), join(root, 'src'), { recursive: true });
    const first = await buildAssets(root);
    const original = await buildAssets();
    assert.deepEqual(first, original, 'Build contains machine-specific paths');
    const source = join(root, 'src/config.mjs');
    writeFileSync(source, readFileSync(source, 'utf8') + '\n// source-map-only change\n');
    const changed = await buildAssets(root);
    assert.notEqual(changed['digital_viewer.js.map'], first['digital_viewer.js.map']);
    assert.notEqual(changed['digital_viewer.js'], first['digital_viewer.js']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
