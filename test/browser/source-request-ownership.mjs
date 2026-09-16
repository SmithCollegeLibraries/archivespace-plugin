// Pass a Playwright Page and the plugin's absolute root. No ASpace, external
// content, or dependency installation is needed; all HTTP responses are local
// route fixtures. This exercises the unmodified plugin and vendored OSD build.
export async function runSourceRequestOwnership(page, pluginRoot) {
  const results = [];
  const origin = 'http://digital-viewer.test';

  for (const replacementOpened of [false, true]) {
    const tab = await page.context().newPage();
    const heldB = [];
    const canvas = id => ({ images: [{ resource: { service: { '@id': origin + '/' + id } } }] });
    const info = id => ({
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': origin + '/' + id,
      protocol: 'http://iiif.io/api/image',
      width: 256, height: 256,
      tiles: [{ width: 256, scaleFactors: [1] }],
      profile: ['http://iiif.io/api/image/2/level1.json'],
    });
    const assert = (condition, message) => { if (!condition) throw new Error(message); };

    try {
      await tab.route('**/*', async route => {
        const pathname = route.request().url().slice(origin.length).split('?')[0];
        if (pathname === '/') {
          await route.fulfill({ contentType: 'text/html', body: `<!doctype html>
            <div data-dv-source-group="fixture"><div class="available-digital-objects">
              <a class="external-digital-object__link" href="${origin}/manifests/fixture.json">Original source</a>
            </div></div>` });
        } else if (pathname === '/manifests/fixture.json') {
          await route.fulfill({ json: { sequences: [{ canvases: [canvas('a'), canvas('b'), {}] }] } });
        } else if (pathname === '/b/info.json' && route.request().resourceType() === 'xhr') {
          heldB.push(route);
          await tab.evaluate(count => { window.__bRequests = count; }, heldB.length);
        } else if (pathname.endsWith('/info.json')) {
          await route.fulfill({ json: info(pathname.split('/')[1]) });
        } else {
          await route.fulfill({ contentType: 'image/svg+xml', body:
            '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="navy"/></svg>' });
        }
      });
      await tab.goto(origin + '/');
      await tab.addStyleTag({ path: pluginRoot + '/public/assets/digital_viewer.css' });
      await tab.addScriptTag({ path: pluginRoot + '/public/assets/openseadragon.min.js' });
      await tab.evaluate(() => {
        window.DigitalViewer = { cantaloupeBaseUrl: '', compassBaseUrl: '', loadingTimeoutMs: 1000 };
        window.__rawSourceFailures = 0;
        window.__openFailures = 0;
        window.__readyImages = new Set();
        const original = window.OpenSeadragon;
        window.OpenSeadragon = Object.assign(function (options) {
          const viewer = original(options);
          window.__viewer = viewer;
          viewer.addHandler('add-item-failed', () => { window.__rawSourceFailures++; });
          viewer.addHandler('open-failed', () => { window.__openFailures++; });
          viewer.addHandler('tile-ready', event => { window.__readyImages.add(event.tiledImage); });
          return viewer;
        }, original);
      });
      await tab.addScriptTag({ path: pluginRoot + '/public/assets/digital_viewer.js' });
      const waitForDraw = index => tab.waitForFunction(index => {
        const viewer = window.__viewer;
        return viewer && viewer.currentPage() === index && window.__readyImages.has(viewer.world.getItemAt(0));
      }, index, { timeout: 10000 });
      const errorText = () => tab.locator('.dv-tile-error-msg').allTextContents();
      const navigate = index => tab.evaluate(index => window.__viewer.goToPage(index), index);

      await waitForDraw(0);
      await navigate(1);
      await tab.waitForFunction(() => window.__bRequests === 1);
      await navigate(0);
      await navigate(1);
      await tab.waitForFunction(() => window.__bRequests === 2);
      if (replacementOpened) {
        await heldB[1].fulfill({ json: info('b') });
        await waitForDraw(1);
      }
      await heldB[0].fulfill({ status: 500, body: 'Retired metadata request failed' });
      await tab.waitForFunction(() => window.__rawSourceFailures === 1);
      assert((await errorText()).length === 0, 'retired same-source failure changed the plugin error state');
      assert(await tab.evaluate(() => window.__openFailures === 0), 'retired failure reached OSD open-failed');
      if (!replacementOpened) {
        await heldB[1].fulfill({ json: info('b') });
        await waitForDraw(1);
      }

      // A genuine current failure must still be reported with an empty world.
      await navigate(1);
      await tab.waitForFunction(() => window.__bRequests === 3);
      await heldB[2].fulfill({ status: 500, body: 'Current metadata request failed' });
      await tab.waitForFunction(() => window.__openFailures === 1);
      assert((await errorText())[0] === 'This page is unavailable.', 'current failure was not reported');
      assert(await tab.locator('.dv-tile-error-msg').getAttribute('data-page-index') === '1', 'wrong failure page');
      await navigate(0);
      await waitForDraw(0);
      assert((await errorText()).length === 0, 'working-page recovery retained the error');

      await navigate(2);
      await waitForDraw(2);
      assert((await errorText())[0] === 'This page is unavailable.', 'placeholder lost its unavailable message');
      assert(await tab.locator('.dv-tile-error-msg').getAttribute('data-page-index') === '2', 'placeholder index changed');
      await navigate(0);
      await waitForDraw(0);
      assert((await errorText()).length === 0, 'leaving placeholder retained its error');
      results.push({
        scenario: replacementOpened ? 'failure after replacement draw' : 'failure before replacement open',
        passed: true,
        ...(await tab.evaluate(() => ({ osd: window.OpenSeadragon.version.versionStr, userAgent: navigator.userAgent }))),
      });
    } finally {
      await tab.close();
    }
  }
  return results;
}
