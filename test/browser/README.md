# Focused browser regressions

## Thumbnail queue recovery

`thumbnail-queue.mjs` exports `runThumbnailQueueChecks(page, pluginRoot)`. It holds
real thumbnail HTTP responses open while running the unmodified plugin and OSD.
Use an explicit context and installed Chrome. All requests are intercepted at
`http://digital-viewer.test`; no ASpace, external content or server is required.

Run from the plugin root with Playwright available in the execution environment:

```sh
node --input-type=module <<'NODE'
import { chromium } from 'playwright';
import { runThumbnailQueueChecks } from './test/browser/thumbnail-queue.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(await runThumbnailQueueChecks(page, process.env.PLUGIN_RUNTIME_ROOT || process.cwd()));
} finally {
  await browser.close();
}
NODE
```

Allow about 45 seconds: four scenarios wait the actual 10-second timeout, not an
accelerated browser clock. First/middle stalls and disposal run with native
IntersectionObserver and with it disabled. Assertions cover serial request order,
subsequent decoded images, browser request cancellation, page labels/navigation,
original links and no restart after a late response. Disposal checks are immediate;
the Node suite separately proves timer/listener cleanup and ignores saved callbacks.
The browser fixture has three pages; Node coverage keeps the 77 numbered buttons.

Negative control: extract reviewed candidate
`fb46a57ed8a69ecacd36155fc1e29432c132349b` into a separate directory and set
`PLUGIN_RUNTIME_ROOT` to that absolute root while running the **new** harness above.
It must fail with `thumbnail queue stalled beyond budget ... requested=0`.
Do not change the checked-out runtime to run the control. This is not a complete
ASpace, cross-browser or hosted acceptance test, and does not close Gate A/B.

## Source-request ownership

`source-request-ownership.mjs` exports `runSourceRequestOwnership(page, pluginRoot)`.
Pass a Playwright `Page` and an absolute plugin root. It opens and closes its own
fixture tabs, loading that root's actual JS, CSS and vendored OpenSeadragon.
Every HTTP request is intercepted; no external content or running ASpace is used.

With Playwright and its Chromium browser available in the execution environment,
run from the plugin root:

```sh
node --input-type=module <<'NODE'
import { chromium } from 'playwright';
import { runSourceRequestOwnership } from './test/browser/source-request-ownership.mjs';
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(await runSourceRequestOwnership(page, process.cwd()));
} finally {
  await browser.close();
}
NODE
```

Use an explicit context: the harness opens additional pages in `page.context()`.
The implicit context created by `browser.newPage()` cannot host those pages.
The `finally` block closes the browser and its contexts, including on failure.

The Node DOM suite remains dependency-free (`node --test test/*.mjs`); this
separate check does not install or add Playwright as a plugin dependency.

The fixture delays the first page-B metadata request, navigates B→A→B and fails
the retired request before/after the replacement opens and draws. It asserts no
plugin error and no OSD `open-failed` from that retired request. It then verifies
a genuine current metadata failure, recovery, an unavailable placeholder after
opening/drawing, and leaving that placeholder. The protocol mirror in the Node
suite additionally covers unknown request identities, duplicate URLs on different
pages, saved callbacks after close/destruction, and initial failure rejection.

This is a focused browser regression, **not** ASpace fixture acceptance, a hosted
CORS/CSP check, or approval for Lyrasis deployment. On OSD upgrades, rerun it:
request ownership depends on OSD passing each `addTiledImage` options object back
through its metadata-error callback.

## Local ASpace layout and navigation checks

`local-layout.mjs` is a separate, read-only real-ASpace check. It requires the
local records in the standalone repository's `docs/fixture-ledger.md` (parent
location: `exports/archivespace-plugin-repository/docs/fixture-ledger.md`), working PUI
18081/Staff 18082, and access to the approved pilot manifests/images. It does not
create records or change configuration. Run it once per **actual ASpace** sidebar
configuration (`left`, then `right`); changing only a DOM attribute is not a test
of that setting. Use the parent repository's `docker/aspace/compose.qa.yml` for
the local port/configuration override. Do not use it on hosted ASpace.

```js
import { chromium } from 'playwright';
import { runLocalLayoutChecks, checkAssetDisabledControl } from './test/browser/local-layout.mjs';
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  console.log(await runLocalLayoutChecks(page, { sidebarPosition: 'left' }));
  console.log(await checkAssetDisabledControl(page, 'http://localhost:18081'));
} finally {
  await browser.close();
}
```

The suite asserts public/staff URLs, image completion, record/viewer bounds at
320/390/767/768/1280 pixels, both viewers on AO 4100, visible original links,
note Enter/Space/click behavior and ARIA state, keyboard/mouse resizing followed
by mobile reflow, viewer/popover fit after large desktop resizing, adjustment
panel bounds on both axes, viewer keyboard controls and tree selection/navigation. It
throws on failure. The asset-disabled control **reports**, rather than fixes or
waives, stock overflow and leaf-node 404s. Templates remain installed in that
control; it is not a complete plugin-uninstall test. See the dated layout
validation report for results and remaining acceptance limits.


## Local PDF and scanned-text checks

`local-formats.mjs` is a read-only test of **this local fixture database**, not a
record installer. It requires ASpace PUI 18081 and the loopback fixture server
18090 described in standalone `docs/local-formats-validation-2026-09-16.md`
(parent location: `exports/archivespace-plugin-repository/docs/`). Verify local
IDs/identifiers before running; do not point it at hosted ASpace. PDFs and
screenshots remain parent-only test data, outside the plugin package.

Use installed Chrome: the native-PDF assertions inspect its extension frame,
load progress and page count, then use real wheel scrolling. Other browsers need
separate validation. An iframe load event is not used as PDF success evidence.

```js
import { chromium } from 'playwright';
import {
  runPdfChecks, runBlockedPdfChecks, runScannedTextChecks, runSeparateObjectCheck,
} from './test/browser/local-formats.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  console.log(await runPdfChecks(page));
  console.log(await runBlockedPdfChecks(page));
  console.log(await runScannedTextChecks(page));
  console.log(await runSeparateObjectCheck(page));
} finally {
  await browser.close();
}
```

The first three functions accept optional `{ screenshotDir: '/existing/path' }`.
Assertions cover correct PDF source/pages, first/last scrolling, original and
fallback links, real Compass SAMEORIGIN refusal plus keyboard direct access,
six-page order/viewport image completion, thumbnails, zoom, page-mode download
targeting, desktop/narrow bounds, linked-thumbnail scanning and separate-object
isolation. The blocked case deliberately fails if Compass changes its policy;
reassess the observation instead of forcing the old expectation. Fixture content
can also change upstream; compare the report's dated fingerprints.

No full-resolution download completion, full accessibility/cross-browser audit,
hosted policy, restricted-content boundary or release approval is implied.
