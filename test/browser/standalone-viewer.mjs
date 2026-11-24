import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const PAGE_PATH = '/digital/viewer/';
const MANIFEST_ORIGIN = 'https://manifest.example.org';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l7sAAAAASUVORK5CYII=', 'base64');
const TILE_ERROR = 'This page is unavailable.';
const LOAD_ERROR = 'The manifest could not be loaded.';

function contentType(path) {
  return ({ '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.map': 'application/json' })[extname(path)] || 'application/octet-stream';
}

async function startPageServer(pageRoot) {
  const root = resolve(pageRoot);
  const server = createServer(async function (request, response) {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (!pathname.startsWith(PAGE_PATH)) return response.writeHead(404).end();
    const relative = decodeURIComponent(pathname.slice(PAGE_PATH.length)) || 'index.html';
    const path = resolve(root, relative);
    if (!path.startsWith(root + sep)) return response.writeHead(404).end();
    const file = await readFile(path).catch(function () { return null; });
    if (!file) return response.writeHead(404).end();
    response.writeHead(200, { 'content-type': contentType(path) }).end(file);
  });
  await new Promise(function (resolveListen) { server.listen(0, '127.0.0.1', resolveListen); });
  return { server, base: 'http://127.0.0.1:' + server.address().port };
}

function closePageServer(server) {
  return new Promise(function (resolveClose, reject) {
    server.close(function (error) { if (error) reject(error); else resolveClose(); });
  });
}

function pageData(prefix, index) {
  const serviceUrl = 'https://info.example.org/iiif/' + prefix + '/page-' + index;
  return {
    '@id': 'https://manifest.example.org/canvases/' + prefix + '-' + index,
    label: 'Page ' + index + ' — ' + 'A very long archival page label '.repeat(4),
    images: [{ resource: {
      '@id': index === 2 ? serviceUrl + '/full/full/0/default.jpg' :
        'https://images.example.org/' + prefix + '/page-' + index + '/download.jpg',
      service: { '@id': serviceUrl },
    } }],
    thumbnail: { '@id': 'https://thumbs.example.org/stored/' + prefix + '/page-' + index + '.png' },
  };
}

function makeManifest(prefix, pageCount = 6, barePdfKey = false) {
  const canvases = Array.from({ length: pageCount }, function (_, index) {
    const canvas = pageData(prefix, index + 1);
    if (barePdfKey && index === 0) canvas.metadata = [{ label: 'Download PDF', value: 's3fs-private/example-book.pdf' }];
    return canvas;
  });
  return { label: 'Viewer fixture — ' + 'Long title '.repeat(24), sequences: [{ canvases }] };
}

function makeUnsafeManifest() {
  const manifest = makeManifest('unsafe', 1);
  const resource = manifest.sequences[0].canvases[0].images[0].resource;
  resource['@id'] = 'javascript:alert(1)';
  resource.service['@id'] = 'http://images.example.org/unsafe';
  manifest.sequences[0].canvases[0].thumbnail['@id'] = '//thumbs.example.org/unsafe.png';
  return manifest;
}

function corsHeaders(enabled) {
  return { 'access-control-allow-origin': enabled ? '*' : 'https://blocked.example.org' };
}

async function fulfill(route, body, type, status = 200, cors = true) {
  await route.fulfill({
    status,
    contentType: type,
    headers: corsHeaders(cors),
    body,
  });
}

async function slowManifestFails(prefix) {
  if (!prefix.startsWith('slow-manifest')) return false;
  await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 40000); });
  return prefix.endsWith('-failure');
}

async function routeManifest(route, url, state) {
  const prefix = url.pathname.split('/')[2];
  state.manifestRequests.push(url.href);
  if (await slowManifestFails(prefix)) return fulfill(route, 'failed', 'text/plain', 503);
  if (prefix === 'redirect') {
    return route.fulfill({ status: 302, headers: { location: 'https://other.example.org/manifest', ...corsHeaders(true) } });
  }
  if (prefix === 'http-failure') return fulfill(route, 'failed', 'text/plain', 503);
  if (prefix === 'malformed') return fulfill(route, '{', 'application/json');
  if (prefix === 'empty') return fulfill(route, JSON.stringify({ sequences: [{ canvases: [] }] }), 'application/json');
  if (prefix === 'unsafe') return fulfill(route, JSON.stringify(makeUnsafeManifest()), 'application/json');
  const pageCount = prefix === 'converted' || prefix === 'bare-key' ? 1 : 6;
  return fulfill(route, JSON.stringify(makeManifest(prefix, pageCount, prefix === 'bare-key')),
    'application/json', 200, prefix !== 'no-cors-manifest');
}

function infoDocument(prefix, page) {
  return {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': 'https://tiles.example.org/iiif/' + prefix + '/page-' + page,
    protocol: 'http://iiif.io/api/image', width: 1200, height: 1600,
    tiles: [{ width: 512, scaleFactors: [1, 2, 4] }], profile: 'http://iiif.io/api/image/2/level2.json',
  };
}

function pageNumber(pathname) {
  const match = pathname.match(/page-(\d+)/);
  return match ? Number(match[1]) : 1;
}

async function routeTiles(route, url, state) {
  const prefix = url.pathname.split('/')[2];
  const page = pageNumber(url.pathname);
  state.tileRequests.push(url.href);
  if (prefix === 'page-failure' && page === 2) return fulfill(route, 'tile failed', 'text/plain', 503);
  return fulfill(route, PNG, 'image/png', 200, prefix !== 'no-cors-images');
}

async function routeContent(route, state) {
  const url = new URL(route.request().url());
  state.contentRequests.push(url.href);
  if (url.hostname === 'manifest.example.org') return routeManifest(route, url, state);
  if (url.hostname === 'info.example.org') {
    if (url.pathname.endsWith('/full/max/0/default.jpg')) return fulfill(route, PNG, 'image/png');
    state.infoRequests.push(url.href);
    if (url.pathname.includes('/slow-info/page-1/')) {
      await new Promise(function (resolveDelay) { setTimeout(resolveDelay, 40000); });
    }
    return fulfill(route, JSON.stringify(infoDocument(url.pathname.split('/')[2], pageNumber(url.pathname))), 'application/json');
  }
  if (url.hostname === 'tiles.example.org') return routeTiles(route, url, state);
  if (url.hostname === 'thumbs.example.org') {
    state.thumbnailRequests.push(url.href);
    return fulfill(route, PNG, 'image/png');
  }
  if (url.hostname === 'images.example.org') return fulfill(route, PNG, 'image/png');
  return route.abort();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createScenarioState(blockOsd) {
  return {
    blockOsd: !!blockOsd,
    contentRequests: [], manifestRequests: [], infoRequests: [], tileRequests: [],
    thumbnailRequests: [], assetRequests: [], pageErrors: [],
  };
}

async function launchScenario(browser, base, options = {}) {
  const state = createScenarioState(options.blockOsd);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: options.reducedMotion || 'no-preference',
  });
  context.setDefaultTimeout(12000);
  await context.route(/^https:\/\//,
    function (route) { return routeContent(route, state); });
  const pagePattern = new RegExp('^' + escapeRegExp(base + PAGE_PATH) + '(?:index\\.html)?(?:\\?.*)?$');
  await context.route(pagePattern, async function (route) {
    const html = (await readFile(resolve(options.pageRoot, 'index.html'), 'utf8'))
      .replace('data-allowed-origins=""', 'data-allowed-origins="' + (options.allowedOrigins || MANIFEST_ORIGIN) + '"');
    state.assetRequests.push(PAGE_PATH + 'index.html');
    return route.fulfill({ status: 200, contentType: 'text/html', body: html });
  });
  const parentUrl = base.replace('127.0.0.1', 'localhost') + '/parent';
  await context.route(new RegExp('^' + escapeRegExp(parentUrl) + '$'), function (route) {
    return route.fulfill({
      status: 200, contentType: 'text/html',
      body: '<!doctype html><title>Test parent</title><iframe title="Viewer" src="' +
        base + PAGE_PATH + '?manifest=' + encodeURIComponent(manifestUrl('book')) + '"></iframe>',
    });
  });
  await context.route(/\/openseadragon\.min\.js$/, function (route) {
    return state.blockOsd ? route.abort() : route.fallback();
  });
  const page = await context.newPage();
  page.on('request', function (request) {
    if (!request.url().startsWith('https://')) state.assetRequests.push(new URL(request.url()).pathname);
  });
  page.on('pageerror', function (error) { state.pageErrors.push(error.message); });
  await page.addInitScript(function () {
    window.addEventListener('digital-viewer:open', function (event) {
      window.__openViewer = event.detail.viewer;
      window.__openEventBubbles = event.bubbles;
    });
  });
  return { context, page, state, parentUrl };
}

function manifestUrl(prefix, query = '') {
  return MANIFEST_ORIGIN + '/iiif/' + prefix + '/manifest' + query;
}

function viewerUrl(base, value) {
  return base + PAGE_PATH + '?manifest=' + encodeURIComponent(value);
}

async function waitForStatus(page, message, timeout = 12000) {
  await page.waitForFunction(function (expected) {
    const status = document.getElementById('viewer-status');
    return status && status.textContent === expected;
  }, message, { timeout });
  assert.equal(await page.locator('#viewer-status').getAttribute('role'), 'status');
  assert.equal(await page.locator('#viewer-status').getAttribute('aria-label'), 'Viewer status');
}

async function waitForViewer(page, count = 6) {
  await page.waitForFunction(function (total) {
    const counter = document.querySelector('.dv-page-counter');
    return counter && counter.textContent === '1 / ' + total;
  }, count);
  await page.waitForFunction(function () {
    const viewer = window.__openViewer;
    const image = viewer && viewer.world && viewer.world.getItemAt(0);
    return image && typeof image.getFullyLoaded === 'function' && image.getFullyLoaded();
  });
}

async function waitForPage(page, index) {
  await page.waitForFunction(function (pageIndex) {
    const viewer = window.__openViewer;
    const image = viewer && viewer.world && viewer.world.getItemAt(0);
    return viewer && viewer.currentPage() === pageIndex && image && image.getFullyLoaded();
  }, index);
}

async function waitForThumbnail(page, index = 0) {
  const image = page.locator('.dv-thumbnail-img').nth(index);
  await page.waitForFunction(function (thumbnailIndex) {
    const image = document.querySelectorAll('.dv-thumbnail-img')[thumbnailIndex];
    return image && image.naturalWidth > 0;
  }, index);
  await image.evaluate(function (element) { return element.decode(); });
}

function recordFocus(active, reached) {
  if (!active || !active.insideViewer) return;
  assert.equal(active.visibleFocus, true, 'Keyboard focus is visible on ' + active.name);
  reached.add(active.name);
}

async function assertPdfUnavailable(page) {
  const pdf = page.locator('[data-action="download-pdf"]');
  assert.equal(await pdf.count(), 0);
}

async function runPrimaryViewerCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot });
  const page = scenario.page;
  const nested = '?id=part%2Fone&edition=1';
  try {
    await page.goto(viewerUrl(base, manifestUrl('book', nested)));
    await waitForViewer(page);
    assert.equal(await page.title(), ('Viewer fixture — ' + 'Long title '.repeat(24)).trim());
    assert.equal(await page.evaluate(function () { return window.__openEventBubbles && !!window.__openViewer; }), true);
    await waitForThumbnail(page);
    assert.ok(scenario.state.manifestRequests[0].endsWith(nested));
    assert.ok(scenario.state.infoRequests.some(function (url) { return url.includes('/book/page-1/info.json'); }));

    await page.locator('.dv-page-nav button').nth(1).click();
    await waitForPage(page, 1);
    assert.ok(scenario.state.tileRequests.some(function (url) { return url.includes('/book/page-2/'); }));
    await page.getByRole('button', { name: 'Open page 2', exact: true }).click();
    const imageLink = page.getByRole('link', { name: 'Download image', exact: true });
    await imageLink.waitFor({ state: 'visible' });
    assert.equal(await imageLink.getAttribute('href'), 'https://info.example.org/iiif/book/page-2/full/max/0/default.jpg');
    await assertPdfUnavailable(page);
    const [popup] = await Promise.all([page.waitForEvent('popup'), imageLink.click()]);
    const downloadUrl = 'https://info.example.org/iiif/book/page-2/full/max/0/default.jpg';
    await popup.waitForURL(downloadUrl);
    assert.equal(popup.url(), downloadUrl);
    await popup.close();

    await checkResponsiveControls(page, scenario.state);
    assert.deepEqual(scenario.state.pageErrors, []);
    assert.ok(scenario.state.contentRequests.some(function (url) { return new URL(url).hostname === 'manifest.example.org'; }));
    assert.ok(scenario.state.infoRequests.some(function (url) { return new URL(url).hostname === 'info.example.org'; }));
    assert.ok(scenario.state.tileRequests.some(function (url) { return new URL(url).hostname === 'tiles.example.org'; }));
    assert.ok(scenario.state.thumbnailRequests.length > 0 &&
      scenario.state.thumbnailRequests.every(function (url) { return url.includes('/stored/book/page-'); }));
    return { case: 'HTTPS manifest, image, stored thumbnails, page download, layout and keyboard', passed: true };
  } finally {
    await scenario.context.close();
  }
}

async function keyboardReachableControls(page) {
  await page.locator('.dv-adjust-popover button').first().waitFor({ state: 'visible' });
  const expected = await page.locator('#viewer button, #viewer a[href], #viewer input, #viewer [tabindex]:not([tabindex="-1"])').evaluateAll(function (elements) {
    return elements.filter(function (element) {
      return !element.disabled && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    }).map(function (element) {
      return element.getAttribute('aria-label') || element.title || element.labels?.[0]?.textContent.trim() ||
        element.textContent.trim().replace(/\s+/g, ' ') || element.className || element.tagName;
    });
  });
  await page.locator('h1').evaluate(function (heading) { heading.tabIndex = -1; heading.focus(); });
  const reached = new Set();
  for (let index = 0; index < expected.length * 2 && expected.some(function (name) { return !reached.has(name); }); index += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(function () {
      const element = document.activeElement;
      const name = [element.getAttribute('aria-label'), element.title, element.labels?.[0]?.textContent.trim(),
        element.textContent.trim().replace(/\s+/g, ' '), element.className, element.tagName].find(Boolean);
      return { name, insideViewer: !!element.closest('#viewer'), visibleFocus: element.matches(':focus-visible') &&
        getComputedStyle(element).outlineStyle !== 'none' };
    });
    recordFocus(active, reached);
  }
  assert.deepEqual(expected.filter(function (name) { return !reached.has(name); }), []);
}

async function lastThumbnailIsReachable(page) {
  const last = page.locator('.dv-thumbnail-btn').last();
  const viewport = page.locator('.dv-thumbnail-viewport');
  const next = page.locator('.dv-thumbnail-carousel-btn').last();
  for (let index = 0; index < 10; index += 1) {
    const boxes = await Promise.all([last.boundingBox(), viewport.boundingBox()]);
    if (boxes[0].x >= boxes[1].x && boxes[0].x + boxes[0].width <= boxes[1].x + boxes[1].width) break;
    assert.equal(await next.isEnabled(), true, 'Thumbnail forward control became disabled early');
    await next.click();
  }
  await waitForThumbnail(page, 5);
  await last.click();
  await page.waitForFunction(function () { return document.querySelector('.dv-page-counter')?.textContent === '6 / 6'; });
}

async function checkResponsiveControls(page, state) {
  for (const width of [320, 390, 767, 768, 1920]) {
    await page.setViewportSize({ width, height: 380 });
    const sizes = await page.evaluate(function () {
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
    });
    assert.ok(sizes.scrollWidth <= sizes.width, 'Horizontal document scroll at ' + width + 'px');
    await page.getByRole('button', { name: 'Adjust image', exact: true }).click();
    assert.equal(await page.locator('.dv-adjust-popover').getAttribute('aria-hidden'), 'false');
    await keyboardReachableControls(page);
    await page.keyboard.press('Escape');
    await lastThumbnailIsReachable(page);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.locator('.dv-mode-actions').evaluate(function (element) {
    return parseFloat(getComputedStyle(element).transitionDuration) <= 0.01;
  }));
  const ratio = await textContrast(page, '.dv-mode-label', '.digital-viewer-container');
  assert.ok(ratio >= 4.5, 'Viewer text contrast was ' + ratio);
  assert.ok(await page.locator('.dv-thumbnail-img').evaluateAll(function (images) {
    return images.every(function (image) { return image.alt.length > 0; });
  }));
  assert.ok(state.thumbnailRequests.some(function (url) { return url.endsWith('/page-6.png'); }));
}

async function textContrast(page, selector, backgroundSelector) {
  return page.locator(selector).evaluate(function (element, backgroundQuery) {
    function luminance(color) {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(function (value) {
        const channel = Number(value) / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }
    const foreground = luminance(getComputedStyle(element).color);
    const background = luminance(getComputedStyle(document.querySelector(backgroundQuery)).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  }, backgroundSelector);
}

async function assertShellAssets(scenario) {
  for (const asset of ['viewer.css', 'openseadragon.min.js', 'viewer.js']) {
    assert.ok(scenario.state.assetRequests.some(function (path) { return path.endsWith('/digital/viewer/' + asset); }),
      'Page asset did not load: ' + asset);
  }
}

async function runRejectedInputChecks(browser, base, pageRoot) {
  const manifest = manifestUrl('book');
  const cases = [
    base + PAGE_PATH + '?manifest=' + encodeURIComponent(manifest) + '&manifest=' + encodeURIComponent(manifest),
    viewerUrl(base, 'https://other.example.org/manifest'),
  ];
  for (const url of cases) {
    const scenario = await launchScenario(browser, base, { pageRoot });
    try {
      await scenario.page.goto(url);
      await waitForStatus(scenario.page, 'A valid, allowed HTTPS manifest URL is required.');
      assert.equal(await scenario.page.title(), 'Digital viewer unavailable');
      assert.deepEqual(scenario.state.contentRequests, []);
      await assertShellAssets(scenario);
      assert.equal(await scenario.page.evaluate(async function () {
        return (await fetch('/assets/viewer.css')).status;
      }), 404);
    } finally {
      await scenario.context.close();
    }
  }
}

async function runStartupFailureChecks(browser, base, pageRoot) {
  const cases = [
    ['http-failure', LOAD_ERROR, false],
    ['malformed', LOAD_ERROR, false],
    ['empty', 'The manifest contains no viewable pages.', false],
    ['no-cors-manifest', LOAD_ERROR, false],
    ['redirect', LOAD_ERROR, false],
    ['book', 'The viewer could not start.', true],
  ];
  for (const [prefix, message, blockOsd] of cases) {
    const scenario = await launchScenario(browser, base, { pageRoot, blockOsd });
    try {
      await scenario.page.goto(viewerUrl(base, manifestUrl(prefix)));
      await waitForStatus(scenario.page, message);
      assert.equal(await scenario.page.title(), 'Digital viewer unavailable');
      await assertShellAssets(scenario);
      if (blockOsd) assert.deepEqual(scenario.state.contentRequests, []);
      if (prefix === 'redirect') {
        assert.equal(scenario.state.contentRequests.length, 1);
        assert.equal(new URL(scenario.state.contentRequests[0]).hostname, 'manifest.example.org');
      }
    } finally {
      await scenario.context.close();
    }
  }
}

async function runUnsafeDestinationCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot });
  try {
    await scenario.page.goto(viewerUrl(base, manifestUrl('unsafe')));
    await waitForStatus(scenario.page, TILE_ERROR);
    assert.ok(scenario.state.manifestRequests.length === 1);
    assert.deepEqual(scenario.state.infoRequests, []);
    assert.deepEqual(scenario.state.tileRequests, []);
    assert.deepEqual(scenario.state.thumbnailRequests, []);
    assert.equal(await scenario.page.locator('#viewer a[href]').count(), 0);
    assert.deepEqual(scenario.state.pageErrors, []);
  } finally {
    await scenario.context.close();
  }
}

async function runImageCorsCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot });
  try {
    await scenario.page.goto(viewerUrl(base, manifestUrl('no-cors-images')));
    await waitForStatus(scenario.page, TILE_ERROR);
    assert.ok(scenario.state.tileRequests.some(function (url) { return url.includes('/no-cors-images/page-1/'); }));
    assert.ok(scenario.state.pageErrors.every(function (message) { return !/security/i.test(message); }));
  } finally {
    await scenario.context.close();
  }
}

async function runPageFailureRecoveryCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot });
  try {
    await scenario.page.goto(viewerUrl(base, manifestUrl('page-failure')));
    await waitForViewer(scenario.page);
    await scenario.page.locator('.dv-page-nav button').nth(1).click();
    await waitForStatus(scenario.page, TILE_ERROR);
    assert.ok(await scenario.page.locator('.dv-tile-error-msg').isVisible());
    await scenario.page.locator('.dv-page-nav button').nth(1).click();
    await waitForPage(scenario.page, 2);
    await waitForStatus(scenario.page, '');
    assert.equal(await scenario.page.locator('.dv-tile-error-msg').count(), 0);
  } finally {
    await scenario.context.close();
  }
}

async function runSlowLoadingCheck(browser, base, pageRoot) {
  const manifestScenario = await launchScenario(browser, base, { pageRoot });
  const failedManifestScenario = await launchScenario(browser, base, { pageRoot });
  const infoScenario = await launchScenario(browser, base, { pageRoot });
  for (const scenario of [manifestScenario, failedManifestScenario, infoScenario]) {
    scenario.page.setDefaultTimeout(50000);
  }
  try {
    await Promise.all([
      (async function () {
        await manifestScenario.page.goto(viewerUrl(base, manifestUrl('slow-manifest')));
        await waitForStatus(manifestScenario.page, 'Still loading.', 35000);
        await waitForStatus(manifestScenario.page, '', 15000);
        await waitForViewer(manifestScenario.page);
      })(),
      (async function () {
        await failedManifestScenario.page.goto(viewerUrl(base, manifestUrl('slow-manifest-failure')));
        await waitForStatus(failedManifestScenario.page, 'Still loading.', 35000);
        await waitForStatus(failedManifestScenario.page, LOAD_ERROR, 15000);
      })(),
      (async function () {
        await infoScenario.page.goto(viewerUrl(base, manifestUrl('slow-info')));
        await waitForStatus(infoScenario.page, 'Still loading.', 35000);
        await waitForStatus(infoScenario.page, '', 15000);
      })(),
    ]);
  } finally {
    await Promise.all([manifestScenario, failedManifestScenario, infoScenario].map(function (scenario) {
      return scenario.context.close();
    }));
  }
}

async function runPdfAbsenceChecks(browser, base, pageRoot) {
  for (const prefix of ['converted', 'bare-key']) {
    const scenario = await launchScenario(browser, base, { pageRoot });
    try {
      await scenario.page.goto(viewerUrl(base, manifestUrl(prefix)));
      await scenario.page.locator('.dv-mode-actions').waitFor();
      await assertPdfUnavailable(scenario.page);
    } finally {
      await scenario.context.close();
    }
  }
}

async function runReducedMotionCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot, reducedMotion: 'reduce' });
  try {
    await scenario.page.goto(viewerUrl(base, manifestUrl('book')));
    await waitForViewer(scenario.page);
    const durations = await scenario.page.evaluate(function () {
      const viewer = window.__openViewer;
      return [viewer.viewport.centerSpringX.animationTime, viewer.viewport.zoomSpring.animationTime];
    });
    assert.deepEqual(durations, [0, 0]);
  } finally {
    await scenario.context.close();
  }
}

async function runCrossOriginFrameCheck(browser, base, pageRoot) {
  const scenario = await launchScenario(browser, base, { pageRoot });
  try {
    await scenario.page.goto(scenario.parentUrl);
    const frame = scenario.page.frameLocator('iframe');
    await frame.locator('.dv-page-counter').waitFor();
    await frame.locator('.dv-page-nav button').nth(1).click();
    const child = scenario.page.frames().find(function (candidate) { return candidate.url().includes(PAGE_PATH); });
    await child.waitForFunction(function () {
      const viewer = window.__openViewer;
      const image = viewer && viewer.world && viewer.world.getItemAt(0);
      return viewer && viewer.currentPage() === 1 && image && image.getFullyLoaded();
    });
    const beforePointer = await child.locator('.dv-zoom-label').textContent();
    await frame.locator('.dv-osd').dblclick({ position: { x: 100, y: 100 } });
    await child.waitForFunction(function (previous) {
      return document.querySelector('.dv-zoom-label').textContent !== previous;
    }, beforePointer);
    const beforeKeyboard = await child.locator('.dv-zoom-label').textContent();
    await frame.getByRole('button', { name: 'Zoom in', exact: true }).focus();
    await scenario.page.keyboard.press('Enter');
    await child.waitForFunction(function (previous) {
      return document.querySelector('.dv-zoom-label').textContent !== previous;
    }, beforeKeyboard);
    assert.equal(scenario.page.url(), scenario.parentUrl);
    assert.deepEqual(scenario.state.pageErrors, []);
  } finally {
    await scenario.context.close();
  }
}

export async function runStandaloneViewerChecks(browser, pluginRoot) {
  const pageRoot = resolve(pluginRoot, 'public/digital-viewer');
  const { server, base } = await startPageServer(pageRoot);
  try {
    const results = [];
    results.push(await runPrimaryViewerCheck(browser, base, pageRoot));
    await runRejectedInputChecks(browser, base, pageRoot);
    await runStartupFailureChecks(browser, base, pageRoot);
    await runUnsafeDestinationCheck(browser, base, pageRoot);
    await runImageCorsCheck(browser, base, pageRoot);
    await runPageFailureRecoveryCheck(browser, base, pageRoot);
    await runPdfAbsenceChecks(browser, base, pageRoot);
    await runReducedMotionCheck(browser, base, pageRoot);
    await runCrossOriginFrameCheck(browser, base, pageRoot);
    results.push({ case: 'invalid input, OSD and manifest failures, image CORS, page recovery, and downloads', passed: true });
    await runSlowLoadingCheck(browser, base, pageRoot);
    results.push({ case: 'announced slow loading and recovery', passed: true });
    return results;
  } finally {
    await closePageServer(server);
  }
}
