// Read-only Chrome/ASpace checks for the isolated 2026-09-16 format fixtures.
// Requires loopback PUI 18081 and fixture server 18090; see the dated report.
// Native PDF internals below are Chrome-specific evidence, not portable API contracts.
function check(value, message) {
  if (!value) throw new Error(message);
}

async function nativePdf(page, expectedPages) {
  // Chrome can defer an off-screen embedded PDF until it enters the viewport.
  const embed = page.locator('.dv-pdf iframe');
  if (await embed.count()) await embed.scrollIntoViewIfNeeded();
  let frame;
  for (let attempt = 0; attempt < 100; attempt++) {
    frame = page.frames().find(item => item.url().startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'));
    if (frame) break;
    await page.waitForTimeout(100);
  }
  check(frame, 'Chrome native PDF frame did not appear');
  try {
    await frame.waitForFunction(count => {
      const toolbar = document.querySelector('pdf-viewer')?.shadowRoot?.querySelector('viewer-toolbar');
      return toolbar?.loadProgress === 100 && toolbar.docLength === count;
    }, expectedPages, { timeout: 15000 });
  } catch (error) {
    throw new Error('Native PDF not ready on ' + page.url() + ' at ' + page.viewportSize().width + 'px', { cause: error });
  }
  if (expectedPages > 1) {
    // Chrome hides the page-number input in narrow embeds; exercise actual scrolling.
    await page.locator('.dv-pdf iframe').hover({ position: { x: 100, y: 200 } });
    await page.mouse.wheel(0, 50000);
    await frame.waitForFunction(count =>
      document.querySelector('pdf-viewer')?.shadowRoot?.querySelector('viewer-toolbar')?.pageNo === count,
    expectedPages);
    await page.mouse.wheel(0, -50000);
    await frame.waitForFunction(() =>
      document.querySelector('pdf-viewer')?.shadowRoot?.querySelector('viewer-toolbar')?.pageNo === 1);
  }
  return { pages: expectedPages, loadProgress: 100, firstLastNavigation: expectedPages > 1 };
}

async function layoutAndLinks(page, width, expectedMounts) {
  const result = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    mounts: [...document.querySelectorAll('.digital-viewer-container')].map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
    originalLinks: [...document.querySelectorAll('.available-digital-objects a[href], [data-additional-file-version] a[href]')]
      .filter(a => !a.closest('.digital-viewer-container'))
      .map(a => ({ href: a.href, visible: !!a.getClientRects().length, thumbnail: !!a.querySelector('img') })),
  }));
  check(result.scrollWidth <= width + 1, 'Format record overflows at ' + width + 'px');
  check(result.mounts.length === expectedMounts, 'Unexpected format viewer count');
  check(result.mounts.every(rect => rect.width > 0 && rect.left >= 0 && rect.right <= width + 1),
    'Format viewer extends outside viewport');
  check(result.originalLinks.length && result.originalLinks.every(link => link.visible), 'Original links not visible');
  return result;
}

export async function runPdfChecks(page, { screenshotDir } = {}) {
  const origin = 'http://localhost:18081';
  const rows = [];
  const cases = [
    { doId: 875, aoId: 4105, name: 'having-our-say', pages: 35 },
    { doId: 876, aoId: 4106, name: 'what-it-is-may-1973', pages: 1 },
    { doId: 877, aoId: 4107, name: 'what-it-is-july-1973', pages: 4 },
  ];
  for (const item of cases) {
    const url = 'http://localhost:18090/pdfs/' + item.name + '.pdf';
    for (const path of ['/digital_objects/' + item.doId, '/archival_objects/' + item.aoId]) {
      for (const width of [1280, 390]) {
        // Retire the previous native PDF frame before revisiting the same record.
        await page.goto('about:blank');
        await page.setViewportSize({ width, height: 1000 });
        const response = await page.goto(origin + '/repositories/2' + path);
        check(response.status() === 200, 'PDF PUI page did not render');
        await page.locator('.dv-pdf iframe').waitFor();
        const pdf = await nativePdf(page, item.pages);
        const fallback = page.getByRole('link', { name: 'Open PDF', exact: true });
        check(await fallback.isVisible(), 'PDF direct-access fallback is missing');
        check(await fallback.getAttribute('href') === url, 'PDF fallback belongs to another object');
        const layout = await layoutAndLinks(page, width, 1);
        check(layout.originalLinks.some(link => link.href === url), 'Original PDF link missing');
        check(await page.locator('.dv-osd').count() === 0, 'PDF acquired an image viewer');
        if (screenshotDir && path.startsWith('/digital_objects/')) {
          await page.screenshot({ path: screenshotDir + '/' + item.name + '-' + width + '.png', fullPage: true });
        }
        rows.push({ path, width, pdf, layout });
      }
    }
  }
  return rows;
}

export async function runBlockedPdfChecks(page, { screenshotDir } = {}) {
  const url = 'https://compass.fivecolleges.edu/system/files/2024-11/smith_ssc_ms00730_as506331_001.pdf';
  const rows = [];
  for (const kind of ['digital_objects/878', 'archival_objects/4108']) {
    let frameRefusal = false;
    const onConsole = message => {
      if (/Refused to display/.test(message.text()) && /sameorigin/i.test(message.text())) frameRefusal = true;
    };
    page.on('console', onConsole);
    try {
      await page.setViewportSize({ width: 1280, height: 1000 });
      const response = await page.goto('http://localhost:18081/repositories/2/' + kind);
      check(response.status() === 200, 'Blocked-PDF record did not render');
      const link = page.getByRole('link', { name: 'Open PDF', exact: true });
      await link.waitFor();
      for (let attempt = 0; attempt < 100 && !frameRefusal; attempt++) await page.waitForTimeout(100);
      check(frameRefusal, 'Expected real Compass SAMEORIGIN refusal was not observed; recheck host policy');
      check(await link.getAttribute('href') === url, 'Blocked PDF lost direct-access URL');
      await link.focus();
      const popupPromise = page.waitForEvent('popup');
      await page.keyboard.press('Enter');
      const popup = await popupPromise;
      let direct;
      try {
        await popup.waitForLoadState('domcontentloaded');
        direct = await nativePdf(popup, 1);
      } finally {
        await popup.close();
      }
      const layout = await layoutAndLinks(page, 1280, 1);
      if (screenshotDir) await page.screenshot({
        path: screenshotDir + '/blocked-' + kind.replace('/', '-') + '.png', fullPage: true,
      });
      rows.push({ path: kind, frameRefusal, keyboardDirectAccess: direct, layout });
    } finally {
      page.off('console', onConsole);
    }
  }
  return rows;
}

async function loadedSequence(page, index) {
  await page.waitForFunction(index => {
    const viewer = document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer;
    return viewer?.currentPage() === index && viewer.world.getItemAt(0)?.getFullyLoaded();
  }, index, { timeout: 30000 });
}

export async function runScannedTextChecks(page, { screenshotDir } = {}) {
  const rows = [];
  for (const kind of ['digital_objects/879', 'archival_objects/4109']) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      let compassRequests = 0;
      let tileResponses = 0;
      const onRequest = request => {
        if (request.url().startsWith('https://compass.fivecolleges.edu/')) compassRequests++;
      };
      const onResponse = response => {
        if (response.url().startsWith('https://digital.smith.edu/iiif/2/') &&
            /\/default\.jpg$/.test(response.url()) && response.ok()) tileResponses++;
      };
      page.on('request', onRequest);
      page.on('response', onResponse);
      try {
        const response = await page.goto('http://localhost:18081/repositories/2/' + kind);
        check(response.status() === 200, 'Scanned-text record did not render');
        await loadedSequence(page, 0);
        const root = page.locator('.digital-viewer-container');
        check(await root.evaluate(el => el.__dvMountAttempt.viewer.tileSources.length) === 6, 'Lost scanned-text pages');
        check(!(await root.locator('[data-action=download-image]').isVisible()), 'Object mode offers a page download');
        const pages = [];
        for (let index = 0; index < 6; index++) {
          await root.getByRole('button', { name: 'Go to image ' + (index + 1), exact: true }).focus();
          await page.keyboard.press('Enter');
          await loadedSequence(page, index);
          const source = await root.evaluate(el => el.__dvMountAttempt.viewer.world.getItemAt(0).source['@id']);
          check(source.endsWith('_p' + String(index + 1).padStart(4, '0') + '.tif'), 'Scanned pages reordered');
          pages.push({ page: index + 1, source, fullyLoaded: true });
        }
        await root.getByRole('button', { name: 'Open page 6', exact: true }).click();
        const download = root.locator('[data-action=download-image]');
        check(await download.isVisible(), 'Page mode lost its download');
        check((await download.getAttribute('href')).includes('_p0006.tif/'), 'Wrong scanned-page download');
        await root.getByRole('button', { name: 'Back to object', exact: true }).click();
        check(!(await download.isVisible()), 'Object mode retained page download');
        const beforeZoom = await root.evaluate(el => el.__dvMountAttempt.viewer.viewport.getZoom());
        await root.getByRole('button', { name: 'Zoom in', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(previous =>
          document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer.viewport.getZoom() > previous,
        beforeZoom);
        const layout = await layoutAndLinks(page, width, 1);
        const thumbnails = await root.locator('button[aria-label^="Go to image"] img').evaluateAll(
          images => images.map(img => ({ loaded: img.complete && img.naturalWidth > 0 })));
        check(thumbnails.length === 6 && thumbnails.every(img => img.loaded), 'Scanned-text thumbnails not all loaded');
        if (kind.startsWith('archival_objects/')) {
          check(layout.originalLinks.some(link => link.thumbnail && link.href.endsWith('/20-20-1983.json')),
            'Linked thumbnail-plus-out-link branch was not exercised');
        }
        check(compassRequests === 0, 'Converted sequence still depends on Compass');
        check(tileResponses > 0, 'No successful replacement-service tile responses observed');
        if (screenshotDir) await page.screenshot({
          path: screenshotDir + '/' + kind.replace('/', '-') + '-' + width + '.png', fullPage: true,
        });
        rows.push({ path: kind, width, pages, thumbnails, compassRequests, tileResponses, layout });
      } finally {
        page.off('request', onRequest);
        page.off('response', onResponse);
      }
    }
  }
  return rows;
}

export async function runSeparateObjectCheck(page) {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('http://localhost:18081/repositories/2/archival_objects/4110');
  await loadedSequence(page, 0);
  await nativePdf(page, 4);
  const result = await page.locator('.digital-viewer-container').evaluateAll(roots => roots.map(root => ({
    group: root.previousElementSibling?.dataset.dvSourceGroup || null,
    pages: root.__dvMountAttempt?.viewer?.tileSources.length || null,
    pdf: root.querySelector('.dv-pdf iframe')?.src || null,
    pdfLinks: [...root.querySelectorAll('a[href]')].filter(a => /\.pdf(?:[?#]|$)/i.test(a.href)).map(a => a.href),
  })));
  check(result.length === 2 && result[0].pages === 6 && !result[0].pdf, 'Image object merged with PDF');
  check(result[0].group && result[1].group && result[0].group !== result[1].group, 'Lost distinct source groups');
  check(result[0].pdfLinks.length === 0, 'Other object PDF attached to image viewer');
  check(result[1].pdf === 'http://localhost:18090/pdfs/what-it-is-july-1973.pdf' && !result[1].pages,
    'Separate PDF acquired the wrong source/viewer');
  const layouts = [];
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    layouts.push(await layoutAndLinks(page, width, 2));
  }
  return { result, layouts };
}
