# Local URLs and layout follow-up — 2026-09-16

Status: the two authorized local follow-ups are implemented and checked. This is
implementer evidence, **not independent review or approval for Lyrasis**. Rob
remains the approver. The earlier external R03 review does not automatically
cover this delta.

Candidate: `0c1ca140a51a28b93b8895b19b5b869ce0c9a5d5`, based on `dd72ac7`.
Commits: `fe02937` (origins/layout checks and first CSS correction), then
`0c1ca14` (screenshot-discovered vertical clipping and narrow-pane correction).
The plugin runtime change is CSS only; viewer JS, templates and OSD are unchanged.
The standalone commit also adds real-ASpace browser assertions and instructions.
Parent plugin files are mirrored byte-for-byte. Local Compose changes are in the
parent worktree only; its Git index remains read-only to this session. No push,
hosted edit, record edit, fixture deletion or deployment occurred.

## 1. Local public/staff origins and tree diagnosis

ASpace's listening URLs and browser-facing URLs serve different purposes. Docker
maps the stock internal ports to different host ports; changing the listening
ports would break that mapping. The parent Compose configuration now explicitly
sets `APPCONFIG_FRONTEND_PROXY_URL=http://localhost:8082` and
`APPCONFIG_PUBLIC_PROXY_URL=http://localhost:8081` for the normal local stack.

The new parent `docker/aspace/compose.qa.yml` replaces only ASpace's host-port
list with Staff/PUI/API **18082/18081/18089** and sets matching frontend/public
proxy URLs. It exposes the existing ASpace sidebar setting via
`ASPACE_QA_SIDEBAR_POSITION` (default `left`). This is a local QA override, not a
Lyrasis configuration recommendation. The normal-port configuration was checked
in Compose, not started on occupied 8081.

The local ASpace container alone was recreated for the origin correction,
right-sidebar test, and restoration to left. Existing 4.2.0 image, database,
`preservica_aspace_data_420` volume and plugin mount were reused. No `down -v`,
unrelated-container restart or action on the unrelated 8081 listener. Final
state: running/healthy, left sidebar. Public home and Staff Interface links use
18081/18082; the Staff `check_session` endpoint returns HTTP 200 in both sidebar
configurations. This verifies endpoint availability, not authenticated staff SSO.

### Tree 404 finding: stock leaf expansion, not missing plugin fixtures

Inspected the exact installed 4.2.0 WAR sources:

- Indexer `LargeTreeDocIndexer#add_nodes` emits `/tree/node_<uri>` documents only
  for nodes with children; leaf documents are removed/not indexed.
- Public `ResourcesController#tree_node` and the digital-object counterpart use
  `ArchivesSpaceClient#get_raw_record`, which retrieves the indexed tree document.
- `_children_tree.html.erb` calls `tree.expandNode(current_node)`; bundled
  `largetree.js.erb#expandNode` fetches the node even when it is a leaf whose
  expansion button is hidden.

That explains the leaf `/tree/node` 404 while the root/waypoint data still lists
all nine AO fixtures. Keyboard Enter to AO 4096, mouse navigation to AO 4100,
current-node highlighting, and DO 870 → component 1 navigation pass on both
sidebar sides. The same leaf 404s and successful navigation occur in an isolated
browser context with plugin JS/CSS/OSD blocked. Templates remain installed in
that control: it is **not a full plugin-uninstall test**. The bundled-source
inspection is the additional evidence attributing the request to stock ASpace.

No tree monkeypatch, index rebuild or new fixture was needed. The stock 404s and
jQuery migration warnings remain; this is not a clean-console claim or a full
tree-widget accessibility audit. Report this upstream if a clean network log is
required; do not hide failed requests to claim acceptance.

## 2. Responsive layout and interaction correction

Before the CSS fix, the actual browser assertions failed:

- At 390px, DO 869 document width was 521px; AO 4100 was 673px. The asset-disabled
  control reproduces those same values with zero viewers.
- After desktop sidebar resizing, the narrow-layout assertion failed because
  the stock resizer's inline widths prevented reflow.
- At 768px, the image-adjustment popover began 16px to the left of its viewer and
  was clipped by the viewer container. The focused browser assertion failed.
- Final screenshot inspection after the initial horizontal correction exposed
  vertical clipping too: the tablet popover began about 56px above the viewer.
  The regression was extended to both axes and failed before the follow-up fix.
  A separate test now exercises viewers after narrowing the desktop content pane.

Changes are scoped to `#main-content.objects` and existing viewer classes:

- Allow the record heading/actions to wrap and long identifiers/content to
  shrink and break within the available width.
- Below 768px, stack sidebar/content at full width, override the stock resizer's
  leftover inline widths, hide the now-inapplicable horizontal resize handle,
  and make the original digital-object block full width without a float.
- Let viewer toolbar buttons wrap without shrinking, and size the adjustment
  popover to account for its inset on both sides. Bound its height with internal
  scrolling so all adjustments remain reachable inside the image area.
- Let the leaf metadata/viewer columns wrap when either would become narrower
  than 300px; give stock digital-object floats a usable minimum width constrained
  by their pane. This responds to actual available width, including desktop
  sidebar resizing, without container-query dependencies. Preserve the viewer's
  own word wrapping and prevent its zoom percentage from breaking into digits.

No full object-view override was reintroduced. Existing ASpace appearance,
source links, desktop left/right ordering and viewer grouping are retained. A
frontend-design skill pass guided the responsive/accessibility checks; a simplify
pass kept the CSS bounded and introduced no unrelated runtime refactor. Tests
were written/run red before the corresponding CSS fixes (test-driven-development
skill); browser-use guided the browser work, with Playwright used because its CLI
was unavailable.

### Final-candidate results

Environment: real ASpace **4.2.0/JRuby** in Docker, Chrome 151 through Playwright,
vendored OSD 5.0.1, Node 26.8.1 and Ruby parser/asset test 2.6.10. Actual ASpace
configuration was changed and restarted between sidebar tests, not simulated by
editing DOM attributes. Browser/cache reuse means this is not a cold-load benchmark.

| Check | Result |
| --- | --- |
| DO 869, AO 4100, AO 4101, DO 870 at 320/390/767/768/1280px | 20 rows per sidebar side; 40 pass. No document overflow, off-screen viewers/actions or overlapping sidebar/content; original links remain visible. Expected images fully load. |
| Two-object AO 4100 | Both viewers retained, including 77-page sequence; source links visible. |
| AO 4101 long note | Enter/Space expand/collapse; click collapse; checkbox and `aria-expanded` agree; expanded height exceeds collapsed 112px. Both sides pass. |
| Stock sidebar resizing | Arrow key increases measured width from 307.5 to 317px; drag increases to 342px; subsequent 390px viewport stacks without overflow. Both sides pass. |
| Viewer after large sidebar resize | Narrow desktop content pane retains usable viewer width and adjustment panel within both axes; both sidebar sides tested separately. |
| Viewer keyboard at 320/390/768/1280px | Zoom, adjustment toggle, brightness slider/reset, hide/show toolbar, thumbnail page 2, Open page 2 and Back to object pass; adjustment panel fits. Repeated for each configuration. |
| Tree | Nine AO links and current selection present; keyboard/mouse sibling and digital-child navigation pass; stock leaf 404 remains as described above. |
| Final 18-page DO/AO render rerun | All HTTP 200; expected viewer counts and first images; four pilots still 1/77/41/36 pages. Unpublished sentinels remain absent. |
| Node tests | 63 pass in each copy. Browser cases are separate from this count. |
| R03 real-OSD harness | Both retired-request scenarios pass against standalone and parent, including genuine failure/recovery/placeholders. |
| Syntax, asset-version behavior, parity, whitespace | Pass. All three served assets return 200 and match candidate hashes and digest. |

These are focused keyboard checks using native key events and targeted focus,
not complete Tab-order, focus-management, screen-reader or WCAG acceptance.
Safari/Firefox, PDFs/download acceptance, full failure matrix and performance
remain unverified. No new source/content was approved by these checks.

## Fingerprints and reproduction

[Raw browser observations](evidence/local-layout-2026-09-16.json) include both
complete configuration runs, the asset-disabled control, 18-page rerun, R03 and
served assets. The assertions live in [local-layout.mjs](../test/browser/local-layout.mjs);
use the explicit-context runner in [the browser README](../test/browser/README.md).
The previously committed observation probes generated the 18-page rerun.

| Artifact | SHA-256 |
| --- | --- |
| Asset-version digest | `26102a571fd06034f4d7e68aa902535a34ff1def31a8ba8f0e82536914a947ec` |
| `public/assets/digital_viewer.css` | `9ea4fd5dd578f2eb634d4a9fd35da58ccfb0ad3fa19a1bde45304aa08ede9cf7` |
| Unchanged `public/assets/digital_viewer.js` | `8242508af9f851988cef05badb174f8dd91b6180ed429d7c6ac77ff333e8fecb` |
| `test/browser/local-layout.mjs` | `11e62b76802de5ff855989f2721ceb7f2f591be5b3aeb97cf13d5ea0faa46d7e` |
| Parent `docker-compose.yml` | `75f1f486ffb0386aea88d12bdaffac85e3d4af58780e3d4ca1b8173b68a039f0` |
| Parent `docker/aspace/compose.qa.yml` | `deda6317c7beee01c71e99df77fc6a128a2639b6dbb7af57d4f42ec735d85b17` |

From the parent repository, using Compose with `!override` support (tested with
5.5.0), start **only the existing local ASpace**; do not recreate dependencies:

```sh
ASPACE_QA_SIDEBAR_POSITION=left docker compose -f docker-compose.yml -f docker/aspace/compose.qa.yml up -d --no-deps archivesspace
docker inspect --format '{{.State.Status}} {{.State.Health.Status}}' preservica-archivesspace-1
```

Wait for healthy and a working PUI. Run `runLocalLayoutChecks` with `left`.
Repeat the scoped Compose command with `right`, wait for startup, run with
`right`, then restore `left`. The assertions require the existing ledger IDs;
do not recreate fixtures blindly. The override file is in the parent worktree,
not the distributable plugin. Do not use these localhost origins on staging.

From standalone root:

```sh
git show --check fe02937
git show --check 0c1ca14
git diff dd72ac7..0c1ca14 -- public/assets/digital_viewer.css test/browser
node --test test/*.mjs
node --check test/browser/local-layout.mjs
ruby test/asset_version_test.rb
```

The [prior checkpoint](local-validation-2026-09-16.md#reproducereview) has the
unchanged JS/Ruby/ERB parser commands. Compare parent `public`, `frontend`, `test`
directories and `plugin_init.rb` to standalone with `diff -qr`/`cmp`. Local
screenshots remain outside distribution in `exports/lyr-local-20260916/`.

### Negative controls for the screenshot-discovered defects

In a **separate explicit Playwright context**, intercept only the stylesheet and
serve the intermediate `fe02937` CSS. The final test module against that CSS
fails at tablet vertical fit and at narrow desktop viewer width; both pass with
the final CSS. No ASpace record/config change is needed for this control:

```js
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { checkViewerKeyboard, checkViewerAfterResize } from './test/browser/local-layout.mjs';
const oldCss = execFileSync('git', ['show', 'fe02937:public/assets/digital_viewer.css'], { encoding: 'utf8' });
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  await context.route('**/digital_viewer.css?*', route => route.fulfill({ contentType: 'text/css', body: oldCss }));
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await assert.rejects(() => checkViewerKeyboard(page, 'http://localhost:18081', 768),
    /Image adjustments are vertically clipped at 768px/);
  // Supply 'right' instead if that is the actual ASpace configuration.
  await assert.rejects(() => checkViewerAfterResize(page, 'http://localhost:18081', 'left'),
    /Resized viewer became too narrow/);
  console.log('Both negative controls detected the expected defects');
} finally {
  await browser.close();
}
```

Both negatives were executed against the actual right-sidebar configuration.
The snippet above assumes the restored left configuration. Never install the
baseline CSS into the live mount to run this control.

## What remains before a Lyrasis handoff

Independent review of this and the cumulative delta; Rob's acceptance; approved
PDF/companion/isolation fixtures; linked thumbnail-plus-out-link branch;
cross-browser and remaining accessibility/failure/download checks; notices,
archive/extracted-package tests, parent commit and guide tracking; deployment
rollback evidence; Lyrasis public origin/config/CSP/operations and hosted CORS;
restricted-content/cache boundary and content-owner sign-off. Neither release
gate is closed. Restoring a sidebar setting is not a plugin rollback rehearsal.
