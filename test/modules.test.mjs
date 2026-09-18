import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

async function sourceModule(name) {
  const url = new URL('../src/' + name + '.mjs', import.meta.url);
  assert.ok(existsSync(url), 'Missing explicit source module: ' + name);
  return import(url);
}

test('configuration normalizes a copy without browser globals', async function () {
  const { readConfig, getLoadingTimeout } = await sourceModule('config');
  const input = { cantaloupeBaseUrl: '/iiif/2/', compassBaseUrl: 'https://COMPASS.example/', compassHost: 'ignored' };
  const config = readConfig(input);
  assert.equal(config.cantaloupeBaseUrl, '/iiif/2');
  assert.equal(config.compassHost, 'compass.example');
  assert.equal(input.cantaloupeBaseUrl, '/iiif/2/');
  assert.equal(readConfig({ cantaloupeBaseUrl: '', compassBaseUrl: '' }).compassHost, '');
  assert.equal(getLoadingTimeout({ loadingTimeoutMs: '' }), 30000);
});

test('source detection takes explicit configuration and preserves encoded identifiers', async function () {
  const { readConfig } = await sourceModule('config');
  const { detectSource } = await sourceModule('source-selection');
  const cfg = readConfig({ cantaloupeBaseUrl: '/iiif/2', compassBaseUrl: 'https://compass.example' });
  assert.deepEqual(detectSource('https://compass.example/system/files/a/b.tif', cfg), { type: 'cantaloupe', infoUrl: '/iiif/2/a%2Fb.tif/info.json' });
  assert.equal(detectSource('https://compass.example/system/files/a/b.tif', readConfig({ compassBaseUrl: '' })), null);
  assert.equal(detectSource('https://example.test/manifests/book.json', cfg).type, 'compass-manifest');
});

test('selection keeps manifest primary and PDF companion without changing input order', async function () {
  const { buildDescriptorSelection } = await sourceModule('source-selection');
  const pdf = { descriptor: { type: 'static-pdf', url: 'https://example.test/book.pdf' } };
  const manifest = { descriptor: { type: 'compass-manifest', manifestUrl: 'https://example.test/manifests/book.json' } };
  const input = [pdf, manifest];
  const result = buildDescriptorSelection(input);
  assert.equal(result.primaryCandidate, manifest);
  assert.deepEqual(result.companionCandidates, [pdf]);
  assert.deepEqual(input, [pdf, manifest]);
});

test('served bundle references a content-versioned map with maintained source content', function () {
  const script = readFileSync(new URL('../public/assets/digital_viewer.js', import.meta.url), 'utf8');
  assert.ok(script.includes('GENERATED'), 'Served script must be marked as generated');
  const match = script.match(/sourceMappingURL=digital_viewer\.js\.map\?v=([a-f0-9]{64})/);
  assert.ok(match, 'Bundle must link its map by content digest');
  const bytes = readFileSync(new URL('../public/assets/digital_viewer.js.map', import.meta.url));
  assert.equal(match[1], createHash('sha256').update(bytes).digest('hex'));
  const map = JSON.parse(bytes);
  assert.ok(map.sources.some(path => path.endsWith('src/config.mjs')));
  assert.ok(map.sources.some(path => path.endsWith('src/source-selection.mjs')));
  assert.equal(map.sources.length, map.sourcesContent.length);
  assert.ok(map.sources.every(path => !path.startsWith('/') && !path.includes('node_modules')));
});
