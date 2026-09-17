// Real images, IntersectionObserver and vendored OSD; no ASpace or live content.
// The supplied Page must belong to an explicit browser.newContext().
export async function runThumbnailQueueChecks(page, pluginRoot) {
  const results = [];
  const origin = 'http://digital-viewer.test';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="navy"/></svg>';
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  for (const withObserver of [true, false]) {
    for (const scenario of ['first stall', 'middle stall', 'dispose while stalled']) {
      const stalledIndex = scenario === 'middle stall' ? 1 : 0;
      const tab = await page.context().newPage();
      const requests = [];
      let heldRoute;
      let heldAt;
      let cancelled = false;
      try {
        await tab.setViewportSize({ width: 1280, height: 900 });
        tab.on('requestfailed', request => {
          if (request.url() === origin + '/thumb/' + stalledIndex + '.svg') cancelled = true;
        });
        await tab.route('**/*', async route => {
          const path = route.request().url().slice(origin.length).split('?')[0];
          if (path === '/') {
            await route.fulfill({ contentType: 'text/html', body: `<!doctype html>
              <div data-dv-source-group="fixture"><div class="available-digital-objects">
                <a class="external-digital-object__link" href="${origin}/manifests/fixture.json">Original source</a>
              </div></div>` });
          } else if (path === '/manifests/fixture.json') {
            await route.fulfill({ json: { sequences: [{ canvases: [0, 1, 2].map(index => ({
              thumbnail: { '@id': origin + '/thumb/' + index + '.svg' },
              images: [{ resource: { service: { '@id': origin + '/image/' + index } } }],
            })) }] } });
          } else if (path.startsWith('/thumb/')) {
            const index = Number(path.split('/')[2].split('.')[0]);
            requests.push(index);
            if (index === stalledIndex) {
              heldRoute = route;
              heldAt = Date.now();
            }
            await tab.evaluate(indices => { window.__thumbnailRequests = indices; }, requests);
            if (index !== stalledIndex) await route.fulfill({ contentType: 'image/svg+xml', body: svg });
          } else if (path.endsWith('/info.json')) {
            await route.fulfill({ json: {
              '@context': 'http://iiif.io/api/image/2/context.json',
              '@id': origin + path.replace('/info.json', ''),
              protocol: 'http://iiif.io/api/image', width: 256, height: 256,
              tiles: [{ width: 256, scaleFactors: [1] }],
              profile: ['http://iiif.io/api/image/2/level1.json'],
            } });
          } else {
            await route.fulfill({ contentType: 'image/svg+xml', body: svg });
          }
        });
        await tab.goto(origin + '/');
        await tab.addStyleTag({ path: pluginRoot + '/public/assets/digital_viewer.css' });
        await tab.addScriptTag({ path: pluginRoot + '/public/assets/openseadragon.min.js' });
        await tab.evaluate(withObserver => {
          if (!withObserver) window.IntersectionObserver = undefined;
          window.DigitalViewer = { cantaloupeBaseUrl: '', compassBaseUrl: '' };
          window.__readyImages = new Set();
          const original = window.OpenSeadragon;
          window.OpenSeadragon = Object.assign(function (options) {
            const viewer = original(options);
            window.__viewer = viewer;
            viewer.addHandler('tile-ready', event => window.__readyImages.add(event.tiledImage));
            return viewer;
          }, original);
        }, withObserver);
        await tab.addScriptTag({ path: pluginRoot + '/public/assets/digital_viewer.js' });
        await tab.waitForFunction(index => window.__thumbnailRequests?.includes(index), stalledIndex, { timeout: 5000 });
        assert(requests.length === stalledIndex + 1, 'queue was not serial while request was held');

        if (scenario === 'dispose while stalled') {
          // Save DOM nodes because real OSD destruction removes their container.
          await tab.evaluate(() => {
            window.__retiredThumbnails = Array.from(document.querySelectorAll('.dv-thumbnail-img'));
            window.__viewer.destroy();
          });
          assert(await tab.evaluate(() => window.__retiredThumbnails.every(img => !img.hasAttribute('src'))),
            'destroy left an active thumbnail request');
        } else {
          try {
            await tab.waitForFunction(index => {
              const images = Array.from(document.querySelectorAll('.dv-thumbnail-img'));
              return images.length === 3 && images.every((img, i) => i === index || img.naturalWidth > 0);
            }, stalledIndex, { timeout: 12500 });
          } catch (error) {
            throw new Error(`thumbnail queue stalled beyond budget (${scenario}, observer=${withObserver}); requested=${requests.join(',')}`, { cause: error });
          }
          assert(await tab.locator('.dv-thumbnail-img').nth(stalledIndex).getAttribute('src') === null,
            'timed-out image still owns its request URL');
          assert(requests.join(',') === '0,1,2', 'timeout skipped, reordered or duplicated a thumbnail');
          assert((await tab.locator('.dv-thumbnail-label').allTextContents()).join(',') === '1,2,3', 'page labels changed');
          await tab.locator('.dv-thumbnail-btn').nth(stalledIndex).click();
          await tab.waitForFunction(index => window.__viewer.currentPage() === index &&
            window.__readyImages.has(window.__viewer.world.getItemAt(0)), stalledIndex, { timeout: 5000 });
          assert(await tab.locator('.external-digital-object__link').count() === 1, 'original source link lost');
        }

        // A late network response must not resurrect the retired thumbnail.
        await heldRoute.fulfill({ contentType: 'image/svg+xml', body: svg });
        await tab.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert(await tab.evaluate(index => {
          const images = window.__retiredThumbnails || document.querySelectorAll('.dv-thumbnail-img');
          return !images[index].hasAttribute('src');
        }, stalledIndex), 'late response resurrected a retired thumbnail');
        assert(requests.length === (scenario === 'dispose while stalled' ? 1 : 3), 'late response restarted the queue');
        assert(cancelled, 'browser did not report cancellation of the retired thumbnail request');
        results.push({ scenario, withObserver, requested: requests.slice(), cancelled,
          elapsedMs: Date.now() - heldAt, passed: true,
          ...(await tab.evaluate(() => ({ osd: window.OpenSeadragon.version.versionStr, userAgent: navigator.userAgent }))),
        });
      } finally {
        await tab.close();
      }
    }
  }
  return results;
}
