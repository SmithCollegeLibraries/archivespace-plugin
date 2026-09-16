// Real ASpace 4.2.0 checks. Requires the local QA fixtures, not mocked HTML.
function check(condition, message) {
  if (!condition) throw new Error(message);
}

export async function checkPublicUrls(page, publicOrigin, staffOrigin) {
  await page.goto(publicOrigin + '/repositories/2/digital_objects/869');
  const home = await page.getByRole('link', { name: 'ArchivesSpace Public Interface', exact: true }).getAttribute('href');
  const staff = await page.getByRole('link', { name: 'Staff Interface', exact: true }).getAttribute('href');
  check(home.replace(/\/$/, '') === publicOrigin, 'Public home link does not match the mapped PUI origin');
  check(staff.replace(/\/$/, '') === staffOrigin, 'Staff link does not match the mapped Staff origin');
  const response = await page.request.get(staffOrigin + '/check_session', {
    params: { uri: '/repositories/2/digital_objects/869' },
  });
  check(response.ok(), 'Staff session-check endpoint is unavailable');
  return { home, staff, checkSessionStatus: response.status() };
}

export async function checkRecordLayout(page, origin, path, width, sidebarPosition, expectedMounts = 0) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(origin + path);
  await page.locator('[data-dv-page-context]').waitFor({ state: 'attached' });
  if (expectedMounts) {
    await page.waitForFunction(function (count) {
      const mounts = [...document.querySelectorAll('.digital-viewer-container')];
      return mounts.length === count && mounts.every(function (mount) {
        return mount.__dvMountAttempt?.viewer?.world.getItemAt(0)?.getFullyLoaded();
      });
    }, expectedMounts, { timeout: 20000 });
  }
  const result = await page.evaluate(function () {
    const rect = function (selector) {
      const element = document.querySelector(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width };
    };
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sidebarPosition: document.querySelector('#sidebar')?.dataset.sidebarPosition,
      sidebar: rect('#sidebar'),
      pane: rect('#notes_row > .resizable-content-pane'),
      actions: rect('#info_row .page_actions'),
      viewers: [...document.querySelectorAll('.digital-viewer-container')].map(function (element) {
        const box = element.getBoundingClientRect();
        return { x: box.x, right: box.right, width: box.width };
      }),
      sourceLinks: [...document.querySelectorAll('.available-digital-objects a[href]')]
        .filter(function (a) { return !a.closest('.digital-viewer-container'); })
        .map(function (a) { return { href: a.getAttribute('href'), visible: !!a.getClientRects().length }; }),
    };
  });
  check(result.scrollWidth <= width + 1, path + ': document overflows at ' + width + 'px (' + result.scrollWidth + 'px)');
  check(result.actions.right <= width + 1, path + ': page actions extend beyond the viewport');
  check(result.sourceLinks.every(function (a) { return a.visible; }), path + ': original link hidden');
  check(result.viewers.length === expectedMounts, path + ': unexpected viewer count');
  check(result.viewers.every(function (box) { return box.x >= 0 && box.right <= width + 1 && box.width > 0; }),
    path + ': viewer extends beyond the viewport');
  if (result.sidebar) {
    check(result.sidebarPosition === sidebarPosition, 'Wrong configured sidebar position');
    if (width < 768) {
      check(result.sidebar.bottom <= result.pane.y + 1 || result.pane.bottom <= result.sidebar.y + 1,
        path + ': narrow sidebar and content overlap');
    } else if (sidebarPosition === 'left') {
      check(result.sidebar.right <= result.pane.x + 1, path + ': left sidebar overlaps content');
    } else {
      check(result.pane.right <= result.sidebar.x + 1, path + ': right sidebar overlaps content');
    }
  }
  return { path, width, ...result };
}

export async function checkNotesAndResize(page, origin, sidebarPosition) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin + '/repositories/2/archival_objects/4101');
  const label = page.locator('[data-js=readmore] .readmore__label').first();
  const state = page.locator('[data-js=readmore] .readmore__state').first();
  const content = page.locator('[data-js=readmore] .readmore__content').first();
  const collapsedHeight = (await content.boundingBox()).height;
  await label.focus();
  await page.keyboard.press('Enter');
  check(await state.isChecked(), 'Enter did not expand the note');
  check(await state.getAttribute('aria-expanded') === 'true', 'Expanded note ARIA state is stale');
  check((await content.boundingBox()).height > collapsedHeight, 'Expanded note text remained clipped');
  await label.click();
  check(!(await state.isChecked()), 'Mouse click did not collapse the note');
  check(await state.getAttribute('aria-expanded') === 'false', 'Collapsed note ARIA state is stale');
  await label.focus();
  await page.keyboard.press('Space');
  check(await state.isChecked(), 'Space did not expand the note');
  await page.keyboard.press('Space');
  check(!(await state.isChecked()), 'Space did not collapse the note');

  const sidebar = page.locator('#sidebar');
  const slider = page.getByRole('slider', { name: 'resizable sidebar handle' });
  check(await sidebar.getAttribute('data-sidebar-position') === sidebarPosition, 'Wrong sidebar configuration');
  const initial = (await sidebar.boundingBox()).width;
  await slider.focus();
  await page.keyboard.press(sidebarPosition === 'left' ? 'ArrowRight' : 'ArrowLeft');
  const afterKey = (await sidebar.boundingBox()).width;
  check(afterKey > initial, 'Keyboard resize did not enlarge the sidebar');
  await page.keyboard.press(sidebarPosition === 'left' ? 'ArrowLeft' : 'ArrowRight');
  const handle = await slider.boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + (sidebarPosition === 'left' ? 40 : -40), handle.y + handle.height / 2, { steps: 5 });
  await page.mouse.up();
  const afterMouse = (await sidebar.boundingBox()).width;
  check(afterMouse > initial, 'Mouse resize did not enlarge the sidebar');
  // Test responsive rules against the inline widths written by stock resizing.
  await page.setViewportSize({ width: 390, height: 900 });
  const narrow = await page.evaluate(function () {
    const side = document.querySelector('#sidebar').getBoundingClientRect();
    const pane = document.querySelector('.resizable-content-pane').getBoundingClientRect();
    return { scrollWidth: document.documentElement.scrollWidth, stacked: side.bottom <= pane.y + 1 || pane.bottom <= side.y + 1 };
  });
  check(narrow.scrollWidth <= 391 && narrow.stacked, 'Desktop resize breaks narrow layout');
  return { sidebarPosition, collapsedHeight, initial, afterKey, afterMouse, narrow };
}

export async function checkViewerKeyboard(page, origin, width) {
  await checkRecordLayout(page, origin, '/repositories/2/digital_objects/863', width,
    null, 1);
  const root = page.locator('.digital-viewer-container');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  const zoom = await root.evaluate(function (element) { return element.__dvMountAttempt.viewer.viewport.getZoom(); });
  await page.keyboard.press('Enter');
  await page.waitForFunction(function (previous) {
    return document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer.viewport.getZoom() > previous;
  }, zoom);
  await page.getByRole('button', { name: 'Adjust image', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.locator('.dv-adjust-popover.is-open').waitFor();
  const fit = await root.evaluate(function (element) {
    const box = element.getBoundingClientRect();
    const popover = element.querySelector('.dv-adjust-popover').getBoundingClientRect();
    return { viewerLeft: box.left, viewerRight: box.right, popoverLeft: popover.left, popoverRight: popover.right };
  });
  check(fit.popoverLeft >= fit.viewerLeft - 1 && fit.popoverRight <= fit.viewerRight + 1,
    'Image adjustments are clipped at ' + width + 'px');
  // The implicit label wraps both the caption and live percentage value.
  const brightness = page.getByRole('slider', { name: /^Brightness/ });
  const initial = Number(await brightness.inputValue());
  await brightness.focus();
  await page.keyboard.press('ArrowRight');
  check(Number(await brightness.inputValue()) > initial, 'Brightness slider did not respond to keyboard');
  await page.getByRole('button', { name: 'Revert image transforms and adjustments', exact: true }).focus();
  await page.keyboard.press('Enter');
  check(Number(await brightness.inputValue()) === initial, 'Image reset did not restore brightness');
  await page.getByRole('button', { name: 'Hide toolbar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Show toolbar', exact: true }).focus();
  await page.keyboard.press('Enter');
  check(await page.getByRole('button', { name: 'Zoom in', exact: true }).isVisible(), 'Toolbar did not reopen');
  await page.getByRole('button', { name: 'Go to image 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(function () {
    const viewer = document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer;
    return viewer.currentPage() === 1 && viewer.world.getItemAt(0)?.getFullyLoaded();
  }, null, { timeout: 20000 });
  await page.getByRole('button', { name: 'Open page 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  check(await page.locator('[data-action=download-image]').isVisible(), 'Page mode download link is missing');
  await page.getByRole('button', { name: 'Back to object', exact: true }).focus();
  await page.keyboard.press('Enter');
  check(!(await page.locator('[data-action=download-image]').isVisible()), 'Object mode did not return');
  return { width, fit, keyboardControls: 'passed', currentPage: 2 };
}

export async function checkTreeNavigation(page, origin) {
  await page.setViewportSize({ width: 1280, height: 900 });
  const missingNodes = [];
  const onResponse = function (response) {
    if (response.status() === 404 && /\/tree\/node\?/.test(response.url())) {
      // Keep only local paths; never log tokens or source query strings.
      missingNodes.push(response.url().split('?')[0].replace(origin, ''));
    }
  };
  page.on('response', onResponse);
  try {
    await page.goto(origin + '/repositories/2/archival_objects/4101');
    await page.locator('#archival_object_4101.current').waitFor();
    check(await page.locator('#tree-container [id^=archival_object_] .record-title').count() === 9,
      'Fixture collection tree is missing child links');
    await page.locator('#archival_object_4096 .record-title').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/repositories/2/archival_objects/4096');
    await page.locator('#archival_object_4096.current').waitFor();
    await page.locator('#archival_object_4100 .record-title').click();
    await page.waitForURL('**/repositories/2/archival_objects/4100');
    await page.locator('#archival_object_4100.current').waitFor();
    await page.goto(origin + '/repositories/2/digital_objects/870');
    await page.locator('#digital_object_component_1 .record-title').click();
    await page.waitForURL('**/repositories/2/digital_object_components/1');
    await page.locator('#digital_object_component_1.current').waitFor();
    return { archivalChildren: 9, keyboardNavigation: true, mouseNavigation: true, digitalChildNavigation: true, missingNodes };
  } finally {
    page.off('response', onResponse);
  }
}

export async function checkAssetDisabledControl(page, origin) {
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 900 } });
  try {
    await context.route(/\/(digital_viewer\.(js|css)|openseadragon\.min\.js)(\?|$)/, function (route) { return route.abort(); });
    const tab = await context.newPage();
    tab.setDefaultTimeout(5000);
    const layout = [];
    for (const path of ['digital_objects/869', 'archival_objects/4100']) {
      await tab.goto(origin + '/repositories/2/' + path);
      layout.push({ path, ...await tab.evaluate(function () {
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          viewers: document.querySelectorAll('.digital-viewer-container').length };
      }) });
    }
    return { mode: 'plugin browser assets blocked; templates unchanged', layout,
      tree: await checkTreeNavigation(tab, origin) };
  } finally {
    await context.close();
  }
}

export async function runLocalLayoutChecks(page, {
  origin = 'http://localhost:18081',
  staffOrigin = 'http://localhost:18082',
  sidebarPosition = 'left',
} = {}) {
  const publicUrls = await checkPublicUrls(page, origin, staffOrigin);
  const layout = [];
  for (const [path, mounts] of [
    ['digital_objects/869', 1], ['archival_objects/4100', 2],
    ['archival_objects/4101', 0], ['digital_objects/870', 1],
  ]) {
    for (const width of [320, 390, 767, 768, 1280]) {
      layout.push(await checkRecordLayout(page, origin, '/repositories/2/' + path, width, sidebarPosition, mounts));
    }
  }
  const notesAndResize = await checkNotesAndResize(page, origin, sidebarPosition);
  const keyboard = [];
  for (const width of [320, 390, 768, 1280]) {
    keyboard.push(await checkViewerKeyboard(page, origin, width));
  }
  return { sidebarPosition, publicUrls, layout, notesAndResize, keyboard,
    tree: await checkTreeNavigation(page, origin) };
}
