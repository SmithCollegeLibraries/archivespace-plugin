# Source-request ownership browser regression

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
local records in [fixture-ledger.md](../../docs/fixture-ledger.md), working PUI
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
