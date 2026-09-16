# Local ASpace validation checkpoint — 2026-09-16

Status: local integration progress, **not approval to ship**. Implementer: Codex. Independent review and Rob's acceptance of this new delta are pending. The earlier external review applies to its recorded R03 candidate, not automatically to these later changes.

## Exact candidate and fixes

Starting head: `0e6fd39`. Previously reviewed R03 runtime: `2134fb4`.

| Commit | Change | Before fix | After fix |
| --- | --- | --- | --- |
| `5621241c26e2a5349c07568759dc1ec7f63d9050` | Four runtime lines prefer the owning source-group block for inline insertion. | AO 4100 displayed source A, source B, viewer B, viewer A. Two new external-link/thumbnail tests failed. | Correct source A/viewer A/source B/viewer B order in actual ASpace. Same-URL groups, repeat init and teardown covered. 62 tests passed. |
| `4c609029b112e5d873d77c1e4c79d949860f86dc` | Attach toolbar to `.dv-osd`, not the whole viewer container. | Chrome could not click thumbnail 39: toolbar intercepted the pointer. New containment regression failed. | Normal thumbnail clicks work; controls stay inside image bounds. 63 tests pass. |

No CSS/template/config or request-ownership changes in this delta. Both fixes are mirrored into the parent live mount. A simplify pass kept the changes narrow; no unrelated refactor was performed.

| Final artifact | SHA-256 |
| --- | --- |
| Asset-version digest | `935bc7cf685f6949e2ef9a24f0ac39c6b1b2b04163062ba59836d9b43cf5e601` |
| `public/assets/digital_viewer.js` | `8242508af9f851988cef05badb174f8dd91b6180ed429d7c6ac77ff333e8fecb` |
| `public/assets/digital_viewer.css` | `8fedfe4ca75936a1f53e0b5ab8f87e3a8b68d79d6f313bd9a45b0a0a8a905b28` |
| `public/assets/openseadragon.min.js` | `cd6e48562264cc518224380d745a620bcf7828235c232d94964e3c9d9e7bdb63` |
| `test/digital_viewer.test.mjs` | `c86fae7350adbeda92f24c11fbb107958db20e3815599066ba89f43be7b5b7aa` |

All three served assets returned 200 and exactly matched local candidate bytes with the final digest query string. Earlier `542567…` and intermediate `f05583…` digests are superseded.

## Environment and observations

Actual ArchivesSpace 4.2.0/JRuby Rails rendering in the existing Docker image; not merely ERB parser checks. Image/mounts and record IDs are in the [fixture ledger](fixture-ledger.md). Existing container `preservica-archivesspace-1` was started and is left healthy. PUI/API/Staff ports: 18081/18089/18082. No container recreation, volume deletion, config change, hosted edit or service deployment. The unrelated 8081 listener was preserved.

Retained plugin environment: Compass base `https://compass.fivecolleges.edu`; Cantaloupe `http://localhost:8080/iiif/2`; proxy `http://localhost:8080/compass-resolve`; Preservica API `http://localhost:8080`; loading-timeout env empty. These are local legacy settings, **not Lyrasis configuration recommendations**. Approved direct manifests did not require those local content services.

Browser: Chrome 151.0.0.0 on macOS through Playwright; OSD 5.0.1. Node 26.8.1; Ruby parser/asset test 2.6.10. Reused browser context/cache; recorded timings are not cold-cache benchmarks or capacity evidence.

[Machine-readable observations](evidence/local-aspace-2026-09-16.json) and [executed browser probe functions](evidence/local-aspace-2026-09-16.mjs):

- **18 real record pages**: nine Digital Objects and nine Archival Objects returned 200 after the final fix. Stock panes, original links, viewer counts and first-image completion checked. Resource and child-component pages themselves are not included in that count.
- Four pilots and four AO counterparts loaded first images with 1/77/41/36 pages. AO 4100 loaded two independent viewers in record order.
- Children, representative-with-link, representative-only thumbnail, linked thumbnail-only, unsupported-link, no-content and unpublished-alternatives fixtures now exist. Representative branches retain original content; unpublished sentinels are absent from server HTML. All four pilot File Versions are unchanged.
- DO 863: normal thumbnail clicks reached pages 39/77; pages 1/39/77 fully loaded with correct counters. Object mode hid page-image download. Keyboard Enter on Open page 77 exposed the page-77 image URL; Back to object hid it. Keyboard Zoom in increased OSD zoom. This is not complete accessibility/download acceptance.
- DO 869 and AO 4096: separate contexts with JS disabled, OSD blocked or manifest requests blocked retained visible source links. Failure text was `Digital content unavailable.`, without URLs.
- Unchanged real-OSD R03 harness passed both retired-request scenarios again after the toolbar fix, including genuine current failures, recovery and unavailable placeholders.
- 63 Node tests pass in both copies. Ruby asset-version test, JS/Ruby/ERB syntax, parity and whitespace checks pass. Bounded startup-log scan found no ActionView template error, NameError, NoMethodError, SyntaxError or FATAL matches. This is **not** a clean-console/network claim.

## Failures and unfinished acceptance

1. **Narrow layout NOT accepted.** At 390px, DO 869 scroll width is 521px and AO 4100 is 673px. Separate contexts blocking both plugin JS/CSS reproduce the same widths with zero viewers. Desktop at 1280px has no horizontal overflow; toolbar bounds pass both sizes. The control suggests retained stock layout/configuration contributes, but does not waive acceptance or prove the plugin has no other mobile issues.
2. **Local stock navigation/config follow-up.** Public/staff links and check_session still point at standard ports; check_session on 8080 is refused. New AO tree/node requests returned 404 despite all nine children appearing in the backend tree. Stock jQuery migration warnings occur. No full M04/M18 or clean-console pass.
3. **PDF fixtures missing.** Approved public PDF, associated image/PDF companion and second-object PDF isolation remain pending. Rob was asked; no approval assumed.
4. **Matrix incomplete.** Linked thumbnail-plus-out-link entry branch (not the representative branch); both sidebar positions; resizing and long-note expand/collapse/ARIA; narrow layout; Safari/Firefox; full failures/downloads; performance; local rollback. The synthetic note renders after indexing, but this alone does not pass ReadMoreNotes.
5. **Release/host gates unchanged.** Lyrasis origin/config/CSP/operations, hosted CORS/off-campus checks, restricted-content/cache boundary, notices/licenses, archive/extracted tests, rollback and Rob's approval remain open. Untracked standalone task guide is still omitted by git archive. Parent mirror is uncommitted because this session cannot write its index.

Raw ASpace debug logs contain internal session identifiers and were not copied into this packet. Snapshots/screenshots stay in parent local exports, outside distribution; see the ledger. No credentials or restricted destinations were added to the packet.

## Reproduce/review

From standalone root:

```sh
git diff 0e6fd39..4c609029 -- public/assets/digital_viewer.js test/digital_viewer.test.mjs
node --test test/*.mjs
ruby test/asset_version_test.rb
node --check public/assets/digital_viewer.js
ruby -c plugin_init.rb
ruby -c public/plugin_init.rb
ruby -c public/views/digital_viewer_asset_version.rb
set -o pipefail
erb -x -T - public/views/layout_head.html.erb | ruby -c
erb -x -T - public/views/shared/_digital.html.erb | ruby -c
git show --check 5621241
git show --check 4c60902
```

The read-only browser functions require the ledger's local records, PUI 18081, approved content connectivity and Playwright/Chromium in the execution environment. No Playwright dependency was added to the plugin. Example driver:

```js
import { chromium } from 'playwright';
import * as probes from './docs/evidence/local-aspace-2026-09-16.mjs';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  for (const name of ['pilotPages', 'archivalPages', 'edgePages', 'navigation', 'failureControls']) {
    console.log(name, await probes[name](page));
  }
} finally {
  await browser.close();
}
```

These functions report measurements; compare rows to the ledger instead of treating process exit as full acceptance. `loaded: null` means no viewer expected/tested. Edge probe `pages: null` on a loaded single-image viewer reflects a non-array tile source, not a missing image. CLI setup is environment-specific; these functions were executed through the available Playwright connection. R03 instructions remain in [the browser README](../test/browser/README.md).

Next bounded task: correct local alternate-port application URLs and investigate stock tree/notes/sidebar/narrow-layout findings using plugin-disabled controls; then finish PDF fixtures and the remaining browser matrix. Host/content answers can proceed independently. Neither release gate is closed.
