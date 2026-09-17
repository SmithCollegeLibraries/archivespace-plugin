# Thumbnail queue correction — independent-review handoff

Date: 2026-09-17. Product: ArchivesSpace PUI plugin `digital_viewer`.
Status: implemented and verified within the scope below; **independent corrective review and Rob's merge decision are pending. Lyrasis installation is NOT READY.**

## 1. Pinned scope and decisions

- Previously reviewed candidate: `fb46a57ed8a69ecacd36155fc1e29432c132349b`.
- Previous documentation-only head: `3a4e5ab742c7098704d81bf3b67cb65a0ac8e57e`.
- Corrective runtime/tests/install instructions: **`2b863370bed0f57db3069a071b641dae0cf13754`**.
- Branch: `codex/lyr-05-config-assets`. A branch name is not an install pin.
- Main baseline for any cumulative review: `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227`.

Review the corrective commit, not a moving branch. This report is a subsequent documentation-only addition; the exact handoff/merge-candidate commit is supplied with the handoff and recorded in the parent completion log. That follow-up also makes the README snippet fail-stop with `&&` and checks the supplied ID's length before cloning, so a failed clone cannot lead to checkout in an existing installation. Verify that the descendant used for merging changes only README/review/status documentation and retains the runtime/tests from the pinned correction. If runtime/test bytes change, rerun checks and issue a new review target.

No merge, push, vendor ticket, installation, configuration/record change, ASpace restart or release approval was performed. The parent mirror is byte-identical but uncommitted under this session's read-only parent Git-index policy. The standalone repository is the committed review source.

| Review finding | Disposition | Remaining decision |
| --- | --- | --- |
| A thumbnail with neither load nor error stalls later previews | Fixed with owned timeout and once-only completion; seven new Node regressions and six Chrome scenarios | Reviewer validates correction; Rob decides merge |
| Per-viewer document click/keydown listeners survive disposal | Unchanged; optional separate lifecycle follow-up, not the thumbnail listeners fixed here | Track separately; not represented as fixed |
| README clones a moving default branch | Now clones with `--no-checkout`, requires an approved full commit ID, checks out detached HEAD and verifies equality | Actual commit/package approval and publication remain open |
| Gate A preparation incomplete | Unchanged | Host/content, remaining local matrix, package/notices/checksum and rollback remain open |

The external reviewer recommended HOLD / NOT READY for the previous candidate. This implementation report does not replace that review with approval.

## 2. Runtime change and limits

Only the thumbnail timeout constant and queue ownership/cleanup change in `public/assets/digital_viewer.js`:

1. One active thumbnail request per viewer, with existing visibility filtering when IntersectionObserver is available; the fallback remains serial too.
2. Each request gets **10,000 ms**, starting when its `src` is assigned. This fixed preview budget is independent of the main viewer's configurable loading timeout. Inactive-tab scheduling can delay callbacks.
3. Load/error clears the owned timer and both listeners, then advances once.
4. Timeout first marks the request finished, clears timer/listeners and removes its `src`, then releases the queue slot. The browser is asked to cancel before the next image is assigned. Chrome cancellation is asserted; other engines are not claimed.
5. Saved late load/error/timeout callbacks are inert. A later network response cannot restore the removed `src` or release a newer request's slot.
6. Destroy marks the carousel disposed, drops queued work, disconnects the observer and retires its active image. Completion cannot restart a disposed queue.
7. A failed preview does not remove/renumber/disable its page button, mark the full-size page unavailable, remove an original link, or trigger viewer fallback. No automatic thumbnail retry is added; reloading creates a new mount.

No new request types, credentials, URL logging, CORS mode, source detection, manifest selection, OSD source-error handling, grouping or CSS changes were introduced. Optional global document listeners remain outside this correction.

## 3. Test-first and automated evidence

Before editing the runtime, all seven new tests failed for the expected reasons: four first/middle timeout cases never advanced; normal completion retained listeners; an all-stalled queue never drained; and disposal retained the active request. Existing thumbnail checks passed.

After correction, **70 Node tests pass in each copy**. New coverage includes:

- First/middle stalls with and without IntersectionObserver; the 9,999/10,000 ms boundary; one active timer; saved late callbacks; duplicate observer entries; all 77 numbered buttons and navigation to the failed preview's page and page 77.
- Successful/error completion, both listener removals and a full independent budget for the next request.
- All three requests timing out, including the last, with no leftover timer.
- Disposal with queued work, repeated disposal, saved events/timer callback and late observer delivery; no restart or active request remains.

The test-only DOM shim now supports removing a listener and removes a duplicate `removeAttribute` implementation that failed to clear reflected values. A controlled clock is injected into the thumbnail fixture; no production test hook or timeout override was added. Three existing viewer tests now run teardown so owned thumbnail timers do not linger after assertions.

Environment: Node **26.8.2**, Ruby **2.6.10**, Playwright **1.63.0**, installed headless Chrome **151.0.7922.174**, vendored OpenSeadragon **5.0.1**. The browser tests use isolated explicit contexts and intercepted HTTP fixtures, without ASpace or production content.

### Real-browser results

The persistent [thumbnail harness](../test/browser/thumbnail-queue.mjs) holds actual image responses open and waits real elapsed time without modifying the runtime or accelerating its clock. The browser fixture has three pages; 77-button preservation is Node coverage, not a full 77-page browser audit.

| Scenario | Native observer | No observer | Final standalone result |
| --- | --- | --- | --- |
| First thumbnail held open | 10,183 ms | 10,136 ms | Requests 0,1,2; later images decoded; held request cancelled |
| Middle thumbnail held open | 10,140 ms | 10,159 ms | Requests 0,1,2; later image decoded; held request cancelled |
| Destroy while first request held | 48 ms | 35 ms | Only request 0; cancelled; no queued request started |

Times are from interception through completed assertions, not isolated timer latency. All six scenarios also pass against the parent mirror; its stall cases finished in 10,133–10,223 ms. Assertions cover cancellation, numbering, original links, navigation/drawing on the timed-out preview's page and no resurrection after releasing the late response. Browser disposal checks are immediate; Node tests prove timer/listener cleanup and late-callback safety.

Negative control: before mirroring, compared the parent JS with `git show fb46a57:public/assets/digital_viewer.js` using `cmp` (identical), then ran the new browser harness against those bytes. Expected failure:

```text
thumbnail queue stalled beyond budget (first stall, observer=true); requested=0
```

The existing [real-OSD request-ownership harness](../test/browser/source-request-ownership.mjs) also passes both before-open/after-draw cases in both copies. That guards R03; it is not a new cumulative review of all earlier changes.

## 4. Local PUI smoke and fingerprints

The existing local ArchivesSpace 4.2.0 PUI was reachable on **18081** through the browser. A sandboxed terminal probe could not connect; the browser check establishes reachability. No service restart was needed, and the unrelated port 8081 listener was not modified.

Fresh navigation returned HTTP 200 and one `.dv-osd` mount for each:

- http://localhost:18081/repositories/2/digital_objects/863 — 77 thumbnail buttons.
- http://localhost:18081/repositories/2/digital_objects/864 — 41 thumbnail buttons.
- http://localhost:18081/repositories/2/digital_objects/867 — 36 thumbnail buttons.
- http://localhost:18081/repositories/2/digital_objects/869 — single image, no carousel.

All four pages referenced the new digest for all three assets. Fresh `cache: no-store` fetches returned HTTP 200 and matched disk hashes. This is page/render/mount and served-byte smoke evidence, **not** full image-completion, 77-page navigation, layout, download, PDF, AO or cross-browser acceptance.

Asset-version helper output (not an archive checksum):

```text
d7f8a3b09a215c196f269cf2dcba592ca4a351dda340a93b693604e2b98c1868
```

| File | SHA-256 |
| --- | --- |
| `public/assets/digital_viewer.js` | `adb2c3e0773ffe7f7f698dc8edf50a62b3c2df35ea275423596b4a8ce6c10712` |
| `public/assets/digital_viewer.css` | `9ea4fd5dd578f2eb634d4a9fd35da58ccfb0ad3fa19a1bde45304aa08ede9cf7` |
| `public/assets/openseadragon.min.js` | `cd6e48562264cc518224380d745a620bcf7828235c232d94964e3c9d9e7bdb63` |
| `test/digital_viewer.test.mjs` | `4826253ea08be2c7608610634dd79445251b99b33b75f72612da5b34a6077ca1` |
| `test/browser/thumbnail-queue.mjs` | `eba0014504672fbb513ab059f156d953b29643c7385c54f9181ef0d59630b9aa` |

## 5. Reproduce and review

From the standalone root:

```sh
git show --stat 2b863370bed0f57db3069a071b641dae0cf13754
git diff fb46a57ed8a69ecacd36155fc1e29432c132349b 2b863370bed0f57db3069a071b641dae0cf13754 -- public/assets/digital_viewer.js test README.md
git show --check 2b863370bed0f57db3069a071b641dae0cf13754
node --test test/*.mjs
ruby test/asset_version_test.rb
node --check public/assets/digital_viewer.js
ruby -c public/views/digital_viewer_asset_version.rb
erb -P -x -T - public/views/layout_head.html.erb | ruby -c
erb -P -x -T - public/views/shared/_digital.html.erb | ruby -c
ruby -r ./public/views/digital_viewer_asset_version -e 'puts DigitalViewerAssetVersion.for_plugin_root(Dir.pwd)'
```

These checks pass. Syntax was also checked for every test/browser JS module and Ruby `plugin_init.rb` and asset test. Use the explicit-context commands in the [browser README](../test/browser/README.md) for both browser suites and the extracted old-runtime negative control. Playwright/Chrome must already be available; neither is a new plugin dependency. The implementer used the existing npx-cached Playwright with `channel: 'chrome'`.

Whitespace for the corrective commit passes. The cumulative main-to-candidate diff still has pre-existing trailing-space diagnostics in historical `staging-release-evidence.md`; no cumulative-clean claim is made.

Reviewer checklist:

- Independently verify fingerprints, exact diff and both passing and negative-control claims.
- Inspect once-only completion, cleanup before slot release, no retries/renumbering, stale callbacks, terminal timeout and disposal.
- Verify README requires an approved immutable revision and preserves existing installations/configuration pending the agreed host procedure.
- Report **corrective-code/merge recommendation separately from install readiness**. Rob, not an agent, remains approver. Record new findings with reproduction.

## 6. Still open / next steps

1. Independent corrective review, then Rob's decision on the exact frozen merge candidate. Optional document-listener cleanup stays separately tracked.
2. Remaining local matrix: actual Safari/Firefox, full keyboard/focus, completed downloads, other failure/timing cases and local rollback. Only the demonstrated thumbnail-stall subtask is closed by this implementation.
3. Lyrasis PUI/config/CSP/operations answers, approved PDF behavior and public/restricted-content boundary; local results do not prove hosted policy.
4. Approved extracted package, notices/license inventory, checksum and rollback evidence under Gate A. No approved archive was produced here.
5. After Gate A, Lyrasis installs; hosted CORS/CSP, off-campus and installed rollback checks precede Rob's Gate B decision.

Continue from [checkpoint NEXT-01–06](staging-signoff-2026-09-16.md), retaining accepted local fixture work. Do not recreate fixtures or reopen R03 speculatively.
