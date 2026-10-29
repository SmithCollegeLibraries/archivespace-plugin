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

const supportedSourceCases = [
    {
      name: 'direct Compass manifest',
      uri: 'https://compass.example.org/node/7/manifest-single?view=full',
      expected: {
        type: 'compass-manifest',
        manifestUrl: 'https://compass.example.org/node/7/manifest-single?view=full',
      },
    },
    {
      name: 'Compass PDF',
      uri: 'https://compass.example.org/system/files/item.pdf',
      expected: { type: 'static-pdf', url: 'https://compass.example.org/system/files/item.pdf' },
    },
    {
      name: 'external PDF',
      uri: 'https://example.org/files/item.pdf',
      expected: { type: 'static-pdf', url: 'https://example.org/files/item.pdf' },
    },
    {
      name: 'Compass TIFF for Cantaloupe',
      uri: 'https://compass.example.org/system/files/2026-01/item.tif',
      expected: { type: 'cantaloupe', infoUrl: '/iiif/2/2026-01%2Fitem.tif/info.json' },
    },
    {
      name: 'Compass-hosted image',
      uri: 'https://compass.example.org/system/files/item.jpg',
      expected: { type: 'static-image', imageUrl: 'https://compass.example.org/system/files/item.jpg' },
    },
    {
      name: 'external image',
      uri: 'https://example.org/images/item.png',
      expected: { type: 'static-image', imageUrl: 'https://example.org/images/item.png' },
    },
    {
      name: 'Compass object alias',
      uri: 'https://compass.example.org/object/item:7',
      expected: { type: 'compass', compassUrl: 'https://compass.example.org/islandora/object/item:7' },
    },
    {
      name: 'Compass Islandora object',
      uri: 'https://compass.example.org/islandora/object/item-7',
      expected: { type: 'compass', compassUrl: 'https://compass.example.org/islandora/object/item-7' },
    },
    {
      name: 'Compass node URL',
      uri: 'https://compass.example.org/node/7',
      expected: { type: 'compass-manifest', manifestUrl: 'https://compass.example.org/node/7/manifest' },
    },
    {
      name: 'hosted manifest JSON',
      uri: 'https://example.org/manifests/item.json',
      expected: { type: 'compass-manifest', manifestUrl: 'https://example.org/manifests/item.json' },
    },
    {
      name: 'Preservica UUID',
      uri: 'https://example.org/assets/12345678-1234-1234-1234-123456789abc',
      expected: { type: 'preservica', uuid: '12345678-1234-1234-1234-123456789abc' },
    },
];

test('source detection classifies every supported source pattern', async function () {
  const { readConfig } = await sourceModule('config');
  const { detectSource } = await sourceModule('source-selection');
  const cfg = readConfig({ cantaloupeBaseUrl: '/iiif/2', compassBaseUrl: 'https://compass.example.org' });

  supportedSourceCases.forEach(function (example) {
    assert.deepEqual(detectSource(example.uri, cfg), example.expected, example.name);
  });
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
