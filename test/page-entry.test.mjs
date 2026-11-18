import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getManifestTitle,
  getManifestUrl,
  validateManifestPages,
} from '../src/page-entry.mjs';
import { UNAVAILABLE_TILE_SOURCE } from '../src/manifest.mjs';

const allowedOrigin = 'https://manifest.example.org';

test('accepts an extensionless allowed manifest and preserves its nested query', function () {
  const manifestUrl = 'https://manifest.example.org/iiif/book/manifest?id=part%2Fone&view=large';
  const search = '?manifest=' + encodeURIComponent(manifestUrl);

  assert.equal(getManifestUrl(search, allowedOrigin), manifestUrl);
  assert.equal(getManifestUrl(search, 'https://unused.example.org ' + allowedOrigin), manifestUrl);
});

test('rejects missing, duplicate, unsafe, or unallowed manifest URLs', function () {
  const cases = [
    { search: '', origins: allowedOrigin },
    { search: '?manifest=https%3A%2F%2Fmanifest.example.org%2Fone&manifest=https%3A%2F%2Fmanifest.example.org%2Ftwo', origins: allowedOrigin },
    { search: '?manifest=' + encodeURIComponent('http://manifest.example.org/manifest'), origins: allowedOrigin },
    { search: '?manifest=book', origins: allowedOrigin },
    { search: '?manifest=' + encodeURIComponent('https://user@manifest.example.org/manifest'), origins: allowedOrigin },
    { search: '?manifest=' + encodeURIComponent('https://other.example.org/manifest'), origins: allowedOrigin },
    { search: '?manifest=' + encodeURIComponent('https://manifest.example.org:444/manifest'), origins: allowedOrigin },
    { search: '?manifest=' + encodeURIComponent('https://manifest.example.org/manifest'), origins: '' },
    { search: '?manifest=' + encodeURIComponent('https://manifest.example.org/manifest'), origins: 'http://manifest.example.org' },
    { search: '?manifest=' + encodeURIComponent('https://manifest.example.org/manifest'), origins: 'https://manifest.example.org/path' },
  ];

  for (const { search, origins } of cases) {
    assert.equal(getManifestUrl(search, origins), null);
  }
});

test('uses Presentation 2 title forms as plain text and falls back when missing', function () {
  const cases = [
    ['string label', 'A printed book', 'A printed book'],
    ['language label', { '@value': 'Livre', '@language': 'fr' }, 'Livre'],
    ['label array', [{ '@value': 'Book', '@language': 'en' }, 'Livre'], 'Book'],
    ['missing label', undefined, ''],
    ['markup label', '<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
  ];

  for (const [name, label, expected] of cases) {
    assert.equal(getManifestTitle(label), expected, name);
  }
});

test('marks pages unavailable for unsafe service, thumbnail, and page image destinations', function () {
  const unsafeUrls = [
    'http://images.example.org/page',
    '//images.example.org/page',
    'javascript:alert(1)',
    'relative/page.jpg',
  ];
  const fields = ['tileSource', 'thumbnailUrl', 'imageUrl'];

  for (const field of fields) {
    for (const value of unsafeUrls) {
      const page = {
        tileSource: 'https://images.example.org/book/info.json',
        thumbnailUrl: 'https://thumbs.example.org/book.jpg',
        imageUrl: 'https://images.example.org/book/full.jpg',
        pageIndex: 0,
        [field]: value,
      };
      const [validated] = validateManifestPages([page]);

      assert.equal(validated.unavailable, true, field + ' ' + value);
      assert.equal(validated.tileSource, UNAVAILABLE_TILE_SOURCE, field + ' ' + value);
      assert.equal(validated.thumbnailUrl, '', field + ' ' + value);
      assert.equal(validated.imageUrl, '', field + ' ' + value);
    }
  }
});
