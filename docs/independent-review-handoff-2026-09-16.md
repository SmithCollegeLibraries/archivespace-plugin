# Independent review handoff: digital_viewer staging work

**Subsequent checkpoints:** [local fixture/render validation](local-validation-2026-09-16.md) records the two integration fixes; [local URLs and layout validation](local-layout-validation-2026-09-16.md) records candidate `0c1ca14`, 40 responsive-layout checks, both actual sidebar configurations and focused notes/resize/keyboard checks. There are still 63 Node tests per copy. The exact versions and review claims below are retained for the earlier R03 scope, not silently extended to newer candidates. Neither release gate is closed.

Prepared: 2026-09-16. Product: ArchivesSpace PUI plugin `digital_viewer`; target ASpace 4.2.0.

This is an **implementer-prepared packet, not an independent review or release approval**. Claude or another reviewer should inspect the code and reproduce the claims. Rob remains the approver for code acceptance, exceptions and installation. No hosted deployment is authorized by this document.

Review returned: the external report supplied by Rob found no R03 runtime defects and verified its claims, but did not find the candidate ready for Lyrasis test installation. See the [recorded review and disposition](staging-release-evidence.md#external-review-returned--recorded-2026-09-16). The documentation-only browser-context defect identified in that review is corrected below. Rob's acceptance decision remains separate.

## 1. Review scopes and exact versions

Return a separate conclusion for each scope:

1. **Latest completed fix:** R03 request ownership and its Node/real-browser regressions. Can stale source-open callbacks still corrupt a current viewer? Do legitimate failures and recovery still work?
2. **Lyrasis staging readiness:** cumulative plugin changes and remaining integration/delivery gaps. Passing the focused R03 review does not establish readiness for installation.

| Item | Immutable commit / location |
|---|---|
| Immediately before the latest fix | `a134cc4afd497e87f35c5d1c5d18d00a45263077` (runtime from `998e7bf`) |
| Latest runtime/tests/browser harness | `2134fb4ba784daa3c92beee79976922666b36fa7` |
| Evidence snapshot accompanying that runtime | `355eb7efe6b3d14b8aaf2546f37ef4c43f53662f` |
| Original cumulative-review baseline | `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227` |
| Working branch | `codex/lyr-05-config-assets` |
| Standalone checkout in the parent project | `exports/archivespace-plugin-repository/` |
| Parent Docker-mounted copy | `plugins/digital_viewer/` |

The documentation commit containing this packet does not change runtime bytes. Use the immutable commits, not a moving branch name. They were verified locally; availability on GitHub was not checked and no push was performed for this handoff.

The parent copy is byte-identical but uncommitted; its Git index is read-only in this workspace. Do not reset either worktree or alter permissions. The standalone `docs/lyrasis-staging-launch-task-list.md` is currently **untracked**, so `git archive` does not include it. Do not assume the README's guide reference works in a fresh checkout/package. This packet supplies the focused review criteria without depending on that file.

## 2. Work completed

### Cumulative context, not a claim of full acceptance

Earlier staging work removed the whole `objects/show.html.erb` override and enhanced stock pages through JS/CSS; revised the digital partial and source grouping; introduced event-driven loading/fallback and disposal; made optional-service configuration explicit; disabled unconfigured legacy Cantaloupe requests; and added SHA-256 content-based asset versioning. Later corrections retained unavailable canvases, used renderer-independent `tile-ready`, scoped failures to pages/tiles, and restored stock layout on teardown.

Those changes predate the latest fix. Their history and incomplete integration checks are in [staging-release-evidence.md](staging-release-evidence.md) and [fixture-ledger.md](fixture-ledger.md). Historical counts such as 39/47/50/54 tests are not current results. The current Node count is **60**.

### Latest R03 defect and correction

The prior code associated source-open failures with a URL/page. That cannot distinguish separate requests for the same source:

1. Page A opens successfully.
2. Navigate to B; B request 1 remains pending.
3. Navigate away and back to B; B request 2 starts.
4. B request 1 fails before or after B request 2 opens and draws.
5. The old runtime incorrectly displays “This page is unavailable” on replacement B. Healthy replacement tiles do not clear that source-failure state.

The fix wraps **this viewer instance's** `addTiledImage`, not the global OSD prototype or vendored bundle. Every invocation receives a fresh options object and request record. Success/error callbacks forward only once, and only while that exact request, selected page, viewer and owning attempt remain current. Close, new requests and destruction invalidate ownership.

The guard runs before OSD's callbacks can raise `open`/`open-failed`, protecting its native error display as well as the plugin message. The plugin additionally requires `open-failed` to carry the current options object. Genuine failures use the captured page, not the first matching URL; two pages may legitimately share a URL.

The token is an object identity, not a URL or numeric generation. It introduces no retries, does not change service URLs, and does not promise cancellation of every OSD HTTP request; late results are invalidated. Existing source ordering, manifest fetching, layout/templates and configuration are unchanged by this final commit.

| File in final fix | Purpose / reviewer focus |
|---|---|
| [public/assets/digital_viewer.js](../public/assets/digital_viewer.js) | `mountOsdViewer`, `isCurrentSourceRequest`, instance `addTiledImage` wrapper, `open-failed`, `close`, `before-destroy` |
| [test/digital_viewer.test.mjs](../test/digital_viewer.test.mjs) | `makeSourceOpenHarness`; same-source races, unowned events, identical URLs, disposal, initial failure |
| [test/browser/source-request-ownership.mjs](../test/browser/source-request-ownership.mjs) | Real vendored OSD and normal plugin initialization, with delayed HTTP responses |
| [test/browser/README.md](../test/browser/README.md) | Browser execution instructions and scope limitations |

The final commit changes four files; only the viewer JavaScript changes production behavior. Review the larger cumulative diff separately.

## 3. Evidence and limitations

These results were obtained by the implementing assistant, **not an external reviewer**. Browser results were recorded during implementation; Node, parser, asset-version and parity results were reconfirmed while preparing this packet. Raw browser traces/screenshots were not saved; the persistent browser harness and earlier tool transcript are the reproduction basis.

| Claim | Observed evidence | Does not establish |
|---|---|---|
| New tests detect the bug | Five new Node cases failed against the old runtime before implementation | Exhaustive lifecycle coverage |
| Current suite passes | 60 Node tests in each copy; Node `v26.8.1` | Actual Rails/ASpace integration |
| Asset-version and syntax checks pass | Ruby asset-version test, JS/Ruby/ERB parsing and whitespace checks; Ruby `2.6.10` | JRuby compatibility or every outstanding asset mutation/rollback case |
| Actual OSD event contract works | Chrome `151.0.0.0`, vendored OSD `5.0.1`; both scenarios pass against standalone and parent assets | Safari/Firefox, ASpace pages, public content services or real CORS/CSP |
| Browser regression detects the old bug | Same harness failed on the unfixed parent before mirroring: `retired same-source failure changed the plugin error state` | An archived browser trace; repeat the negative control |
| Genuine failures still work | Browser reports active B failure with an empty world, recovers on A, retains/clears unavailable page-3 message | Every adapter failure/fallback path |
| Copies match | Inventory and bytes match across 51 files in `public/`, `frontend/`, `test/` and root `plugin_init.rb` | Parent commit, archive checksum or hosted installation identity |

The browser harness intercepts all HTTP requests. It supplies synthetic manifests, IIIF metadata and image responses while loading the actual plugin/OSD files. It asserts zero OSD `open-failed` events for retired requests and one for the genuine current failure. An underlying `add-item-failed` and HTTP 500 are expected for injected failures; this is not a claim of zero network/console failures.

### Current fingerprints

| Artifact | SHA-256 |
|---|---|
| Asset-version helper digest, not an archive hash | `542567bd615cb82af236b6e0b99e60926b7cb7b1fedab6deee0dc0e9f91fa240` |
| `public/assets/digital_viewer.js` | `9ea7239d31adfe3b0627cb09b69c4b55e18ff0a995cabd851b13fbcb2343070c` |
| `public/assets/openseadragon.min.js` | `cd6e48562264cc518224380d745a620bcf7828235c232d94964e3c9d9e7bdb63` |
| `test/digital_viewer.test.mjs` | `2817d9ed2633ea24b82a0ff36d148fe66f0cd9d131e538534bf518b6cb949333` |
| `test/browser/source-request-ownership.mjs` | `7d89380dce76f30488d2506aeeed4d970858fe3f5ab0cc6edc0b1591902a5c14` |

## 4. Reproduce the checks

Run from the standalone plugin root. Inspect local changes first; do not reset or overwrite another person's files. Use a separate checkout/extracted candidate for a clean review.

### Diffs and local tests

```sh
set -euo pipefail
git status --short
git diff a134cc4afd497e87f35c5d1c5d18d00a45263077 2134fb4ba784daa3c92beee79976922666b36fa7 -- public/assets/digital_viewer.js test/
git diff --stat 7edccca02af1a74b1ef6b1f5f5b0db9f48af9227 2134fb4ba784daa3c92beee79976922666b36fa7
git diff 7edccca02af1a74b1ef6b1f5f5b0db9f48af9227 2134fb4ba784daa3c92beee79976922666b36fa7 -- public/ frontend/ README.md
node --test test/*.mjs
ruby test/asset_version_test.rb
node --check public/assets/digital_viewer.js
node --check test/browser/source-request-ownership.mjs
ruby -c plugin_init.rb
ruby -c public/plugin_init.rb
ruby -c public/views/digital_viewer_asset_version.rb
erb -x -T - public/views/layout_head.html.erb | ruby -c
erb -x -T - public/views/shared/_digital.html.erb | ruby -c
ruby -r ./public/views/digital_viewer_asset_version -e 'puts DigitalViewerAssetVersion.for_plugin_root(Dir.pwd)'
git show --check 2134fb4ba784daa3c92beee79976922666b36fa7
git diff --check
```

Expected: 60 tests pass, `asset version checks passed`, successful parser exits, the helper digest above, and no whitespace errors. `git diff --check` alone does not check committed changes; retain `git show --check`. Git inspection commands require a checkout; parser/tests can also run from an extracted archive.

### Real-browser positive and negative controls

Prerequisite: a review environment with Playwright and Chromium available. Playwright is not a plugin dependency; do not add it to the release just for this check. The implementing assistant used the available Playwright browser tool. [The browser README](../test/browser/README.md) provides a normal Node/Playwright invocation as well.

To test fixed and old runtimes without modifying either checkout, extract the baseline into a new temporary directory:

```sh
set -euo pipefail
review_baseline_dir="$(mktemp -d)"
git archive a134cc4afd497e87f35c5d1c5d18d00a45263077 | tar -xf - -C "$review_baseline_dir"
REVIEW_BASELINE_ROOT="$review_baseline_dir" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { runSourceRequestOwnership } from './test/browser/source-request-ownership.mjs';
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(await runSourceRequestOwnership(page, process.cwd()));
  await assert.rejects(
    runSourceRequestOwnership(page, process.env.REVIEW_BASELINE_ROOT),
    /retired same-source failure changed the plugin error state/
  );
  console.log('Negative control reproduced the expected old-runtime defect.');
} finally {
  await browser.close();
}
NODE
```

Use an explicit context because the harness creates more pages in `page.context()`; `browser.newPage()` creates an implicit context that cannot host them. The `finally` block closes the browser and its contexts.

Expected: the candidate returns two passing scenarios; the baseline fails with the exact expected defect. A missing browser/file, timeout or unrelated exception is **not** a successful negative control. Retain the temporary directory's explicit path with the review notes; remove only that directory when no longer needed.

### Parent mirror, if that workspace is available

From the parent project root:

```sh
set -euo pipefail
node --test plugins/digital_viewer/test/*.mjs
diff -r plugins/digital_viewer/public exports/archivespace-plugin-repository/public
diff -r plugins/digital_viewer/frontend exports/archivespace-plugin-repository/frontend
diff -r plugins/digital_viewer/test exports/archivespace-plugin-repository/test
cmp plugins/digital_viewer/plugin_init.rb exports/archivespace-plugin-repository/plugin_init.rb
```

Expected: 60 tests and no differences. A reviewer with only the standalone repository must mark parent parity as not independently checked.

## 5. Questions for the independent reviewer

- Does request identity reject an old failure after returning to the same URL/page, before and after replacement success?
- Are stale callbacks stopped before OSD's own `open-failed` processing, rather than merely hiding the plugin message?
- Does vendored OSD preserve options identity on error? Inspect `Viewer.open`, `addTiledImage`, `goToPage`, `close`/`World.removeAll` and `_cancelPendingImages`. Revalidate on upgrades.
- Are callback `this`, arguments, return values and one-shot settlement preserved? Could supported call paths reuse options or deliver callbacks differently?
- Does `currentPage()` identify the requested page before OSD emits `page`, including identical URLs on different pages?
- Do close, destruction and attempt replacement invalidate saved callbacks? Can delayed success bypass ownership or cause an unintended open?
- Are unknown/unowned events rejected without swallowing genuine current failures? Does initial failure still reject into the existing fallback path?
- Do tile-specific recovery, slow-final-candidate behavior, page counts, placeholders, original links and unrelated groups remain intact?
- Is the Node protocol mirror faithful, and does the browser negative control catch the defect? Identify untested interleavings; test count is not proof of completeness.
- Is the cumulative candidate ready for test installation under the agreed scope, or do the following gaps remain blocking?

## 6. Known remaining release work

These are incomplete checks/deliverables, not assertions of additional confirmed runtime bugs:

| Remaining item | Boundary / owner |
|---|---|
| Final candidate on actual ASpace 4.2.0: linked Archival Objects, two-object grouping, representative/thumbnail-only cases, unpublished files, ordinary pages and PDF companions | Local integration/fixtures; implementer with Rob/Special Collections' approved content |
| Remaining agreed timeout/disposal, asset-mutation/cache rollback, browser/keyboard/layout checks | Local evidence; focused R03 coverage is not the full matrix |
| Exact staging PUI URL, ENV vs AppConfig, other plugins/overrides, restart/rollback ownership | Lyrasis facts; current plugin reads ENV only, so AppConfig-only hosting may require a change |
| Approved public fixtures and protection of restricted masters/cached derivatives | Special Collections/ITS evidence and Rob's scope decision |
| Pinned archive/checksum, extracted-package tests, standalone documentation links, dependency notices, installation/rollback packet | Release preparation; this packet is not a release archive |
| Actual hosted CSP/CORS, browser/record validation and rollback rehearsal | After installation under the agreed test plan; not established by intercepted responses |

Gate A is approval to send the installation package; Gate B is acceptance of the installed staging pilot. Both remain open. This document does not change their status or approve production.

## 7. Requested reviewer response

For each finding provide severity, file/function or line, reproduction, expected/observed behavior, and the smallest correction/verification needed. Separate confirmed defects, missing evidence and optional improvements. State commits, environment and commands checked; explicitly mark checks not run.

Conclude separately on:

1. R03 implementation: no findings / changes requested / insufficient evidence, with reasons.
2. Lyrasis test-install readiness: remaining blockers and evidence needed for Rob's decision.

Suggested handoff prompt:

> Independently review the pinned digital_viewer candidate described here. Do not accept implementer conclusions as proof. Inspect the final R03 diff and relevant cumulative changes, reproduce the Node and real-OSD positive/negative controls where your environment permits, and report concrete findings and evidence gaps separately. Do not modify code, publish records, restart shared services, push commits or deploy as part of this review. Rob is the approver; your role is to validate claims and identify what remains before a Lyrasis test install.

Reviewer: external report supplied by Rob, recorded 2026-09-16; reviewer name and execution date were not separately supplied. R03: no runtime findings, claims verified; test-install readiness: not ready. Full cumulative diff review remains outstanding. Rob's decision / date / accepted scope: pending.
