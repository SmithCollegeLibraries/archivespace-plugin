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
