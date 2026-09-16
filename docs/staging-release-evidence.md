# Staging release evidence

Date started: 2026-09-15  
Release scope: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0  
Current branch: `codex/lyr-05-config-assets`

This file records implementation evidence for the Lyrasis staging launch task list. It does not grant Gate A or Gate B approval.

Independent-review entry point: [review handoff, exact commits and reproduction instructions](independent-review-handoff-2026-09-16.md). The implementation observations below are supplemented by the external report recorded here. Rob's acceptance and installation approval remain pending.

## External review returned — recorded 2026-09-16

Source: independent review report supplied by Rob in the conversation. The reviewer name and execution date were not separately supplied. This section records that report; it does not represent another independent review by the implementing assistant.

**Scope 1, R03:** no runtime findings; implementation claims verified. The reviewer considers R03 acceptable on the evidence. **Scope 2, Lyrasis test installation:** not ready; the remaining blockers are integration evidence, fixtures and release/host/content gates, not additional confirmed code defects. Rob's decision remains separate; neither release gate is closed.

### Reviewer-reported checks

- Environment: Node 26.8.1, Ruby 2.6.10, Playwright 1.64 from the npx cache, installed Chrome reported as HeadlessChrome 151, vendored OSD 5.0.1.
- Reviewed commits: runtime `2134fb4`, baseline `a134cc4`, documentation/branch head `ad61e2e`. The runtime at that head matched `2134fb4`.
- Four recorded file fingerprints and the asset-version digest matched. Parser, Ruby and whitespace checks passed, including the fix commit's `git show --check`.
- Both copies passed 60 Node tests. The candidate test file against the extracted baseline runtime failed exactly five tests, confirming the reported negative cases.
- Browser positive controls passed both scenarios on candidate and parent; the baseline reproduced the expected negative control. Parent parity passed the documented `diff`/`cmp` checks.
- The OSD source inspection confirmed that source-open error events retain the options identity, `goToPage` sets the sequence index before `open`, and close clears the pending-image queue. That queue prevents a retired successful request becoming a world item; retired error callbacks can still run, which is the boundary protected by the plugin guard.

### Finding and disposition

**Low severity, documentation only:** both reproduction snippets used `browser.newPage()`, whose implicit context cannot host the additional pages created by the harness. Changed both snippets to `browser.newContext()` followed by `context.newPage()` and mirrored the browser README into the parent plugin. The browser-closing `finally` remains in place. No runtime or test-harness behavior changed. Shell and embedded JavaScript syntax are checked locally; the full standalone CLI launch is not claimed as rerun for this documentation correction.

**Optional coverage improvement:** add a real-OSD delayed HTTP success after the replacement request has failed, to pin OSD's queue behavior across upgrades. Clarification: the existing Node test `same-source retired failures are ignored before replacement opens` already invokes `retired.options.success(...)` after `replacement.fail()` and asserts that the current error remains. That is callback-level coverage, not the proposed real-network/OSD success-path check. This optional improvement is not a reported runtime defect.

### Still open

- Final-candidate ASpace 4.2.0 startup/render and actual record/browser checks. The earlier render used an older candidate and temporary ports; the reviewer reported ASpace stopped and standard port 8081 occupied.
- Missing linked Archival Object/edge-case fixtures, including two-object grouping, children, representative and thumbnail-only cases, PDF, unsupported-link and no-content cases. Earlier Digital Object pilot records do not close those gaps.
- Full browser, keyboard and layout matrix. Safari, Firefox, JRuby, real hosted CORS/CSP and content-boundary validation were not run by this reviewer.
- Full cumulative diff review; earlier changes were checked through correction reproduction/regression tests, not a complete line-by-line cumulative review.
- Parent mirror commit and standalone guide tracking. The reviewer suggested the parent index was writable; this agent session's access policy still marks the parent `.git` read-only. No permission changes or broad parent commit were attempted. The untracked standalone guide is still omitted from `git archive`.
- Lyrasis PUI origin/config/CSP and operating agreement, approved public/restricted-content boundary, final archive/checksum and extracted-package tests, rollback evidence, and dependency/notice inventory.

Next bounded implementation step: prepare the missing approved local fixtures and verify the final candidate on ASpace; coordinate host/content answers in parallel. Do not reopen R03 as a speculative runtime rewrite or treat its acceptance recommendation as permission to deploy.

## Latest R03 correction — 2026-09-16

Status: Request-ownership fix implemented and locally verified. Hosted ASpace, full fixture/browser acceptance, CORS/CSP and rollback gates remain open. The earlier sections below retain their historical test counts and asset hashes; this section identifies the current candidate.

Runtime/test commit: `2134fb4ba784daa3c92beee79976922666b36fa7`

Parent mirror: byte-identical, uncommitted (parent Git index remains read-only)

Approver: Rob; no deployment approval is implied by these checks.

### Correction

Each call to the viewer instance's `addTiledImage` now receives a fresh owned options object and one-shot success/error callbacks. A request is current only while its identity, selected page and live viewer/attempt match. Close, navigation to another request, and destruction invalidate that ownership. Stale callbacks are stopped **before** they can raise OSD `open`/`open-failed` or trigger its native error display. Genuine source failures must carry the active options identity; URL equality alone is no longer used to claim ownership. Initial failure/fallback behavior, empty-world page errors, tile-specific recovery and unavailable placeholders are preserved.

The integration point is checked against the vendored **OSD 5.0.1** build: `goToPage` changes `currentPage` before opening; `open` calls `addTiledImage`; metadata errors return the request options object. Re-run the browser regression when upgrading OSD.

### Implementer-run regression evidence

- Test-first Node run: five new cases failed on the old runtime (same-source failures before/after replacement opening, unowned events, repeated URLs on different pages, and callbacks after close). After the fix, **60 tests passed in each copy**, including the preserved current/initial failure behavior and recovery.
- Real browser: **Chrome 151, vendored OSD 5.0.1**, unmodified plugin loaded through its normal source scan and manifest adapter. The checked-in [browser regression](../test/browser/source-request-ownership.mjs) uses intercepted fixture responses and deferred metadata requests, not fake OSD events. Both before-open and after-draw race scenarios passed against standalone and parent copies.
- Negative browser control: the same regression failed against the still-unfixed parent copy before mirroring, with `retired same-source failure changed the plugin error state`.
- Each browser scenario also verified that a genuine current metadata failure is reported on page 2 with an empty world, navigation to a working page clears it, an unavailable page 3 retains its message after placeholder opening/drawing, and leaving that placeholder clears the message. Retired requests raised **zero** OSD `open-failed` events; genuine current failures still raised one.
- JavaScript (runtime and browser test), Ruby and ERB syntax checks, the Ruby asset-version test and whitespace checks passed. Runtime/frontend/test inventories and bytes match across **51 files** in the two copies.

Reproduce Node/parser checks using the commands in LYR-06 below. Browser execution instructions are in [test/browser/README.md](../test/browser/README.md); no Playwright dependency was added to the plugin or its dependency-free Node suite.

Current hashes:

| Artifact | SHA-256 |
|---|---|
| Asset-version helper digest | `542567bd615cb82af236b6e0b99e60926b7cb7b1fedab6deee0dc0e9f91fa240` |
| `public/assets/digital_viewer.js` | `9ea7239d31adfe3b0627cb09b69c4b55e18ff0a995cabd851b13fbcb2343070c` |
| `test/digital_viewer.test.mjs` | `2817d9ed2633ea24b82a0ff36d148fe66f0cd9d131e538534bf518b6cb949333` |
| `test/browser/source-request-ownership.mjs` | `7d89380dce76f30488d2506aeeed4d970858fe3f5ab0cc6edc0b1591902a5c14` |

Scope limitation: this is a focused real-browser regression using synthetic local HTTP fixtures. It does **not** verify the ASpace-rendered pilot records, hosted configuration, real CORS/CSP, complete fixture matrix or rollback. No hosted service was deployed or restarted. Claude/external review and Rob's approval remain separate.

## LYR-01 — Baseline and fixture inventory

Task / matrix ID: LYR-01  
Status: IN PROGRESS  
Standalone commit: `9bba4a545921cbfa9e9747e4ebd9c884988204af`  
Parent mirror commit: NOT APPLICABLE for documentation-only baseline  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: macOS local workstation; ArchivesSpace 4.2.0 image present; browser checks NOT RUN  
Fixture and approved scope: Four retained local Digital Object pilot snapshots; public converted image manifests only  
Commands or interaction steps:

```sh
git -C exports/archivespace-plugin-repository status --short --branch
git -C exports/archivespace-plugin-repository log -1 --format='%H %s'
node --test test/*.mjs
node --check public/assets/digital_viewer.js
ruby -c plugin_init.rb
ruby -c public/plugin_init.rb
erb -x -T - public/views/layout_head.html.erb | ruby -c
erb -x -T - public/views/shared/_digital.html.erb | ruby -c
docker image inspect archivesspace/archivesspace:4.2.0 --format '{{.Id}}'
docker compose ps archivesspace aspace-solr mariadb
```

Expected result: Clean standalone baseline, passing parser/tests, pinned ASpace image, recorded service/mount configuration, and a fixture ledger that distinguishes historical snapshots from current API observations.  
Observed result: Standalone baseline was clean at `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227`; 29 Node tests passed; JavaScript, Ruby, and ERB checks passed; image digest matched `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b`. Solr and MariaDB were running. ArchivesSpace was stopped with exit 137. A start attempt was blocked because host port 8081 is held by an unrelated Node process.  
Evidence artifact: [fixture-ledger.md](fixture-ledger.md); parent Compose configuration; retained snapshots listed in the ledger  
Remaining issue / owner: Start ArchivesSpace without changing volumes or the unrelated listener; query current linked instances; create missing Archival Object, two-object, PDF, unsupported, no-content, and representative fixtures. Owner: implementation agent, with Rob supplying unavailable approved PDF/content fixtures.  
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending

## Correction handoff — LYR-R01 through LYR-R06

Status: IN PROGRESS; all six correction regression groups pass locally, while hosted and full fixture acceptance remain open.

Correction commits: lifecycle/source corrections `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, stale-callback guards `9fb1e955bec60e75be18bfab9bc8a1f481a1a719`, renderer/page/layout corrections `cf351ef`, sequence ownership and fallback corrections `271b3069f8fbd0be74f259289d0846052da13db0`, rapid-navigation ownership correction `d4d46e62062ce5d78cc88d0d05d1face03f4cf1b`, source-failure and placeholder corrections `998e7bfca8cc92788f1350f4d6f827cbf050cac6`; content-hashed asset version `8f980cebe08468b6fd79b34941b833bdd93ee54d`; documentation/evidence updates follow in later commits.

| Correction | Observed local evidence | Remaining gap |
|---|---|---|
| LYR-R01 | `init()` now starts one attempt threshold before adapter fetch, carries it through response parsing and initial OSD open, aborts and advances once for alternatives, and retains a final slow candidate. Deferred fetch, deferred response body, final late success and no-stale-content tests pass. | Deterministic clock coverage, all adapter variants and local browser timing checks remain. |
| LYR-R02 | Legacy `/system/files/` key rewriting returns no source when Cantaloupe is absent/invalid; extraction preserves every canvas with an explicit unavailable placeholder, original `pageIndex` values and no fabricated network URL. Entirely unavailable manifests are rejected before OSD mounting so working alternatives remain eligible. Configured encoded keys and absolute converted services remain covered. | Browser request inspection and full mixed-sequence navigation remain. |
| LYR-R03 | Initial open settlement is separate from later page failures; `tile-ready` is used instead of renderer-specific `tile-drawn`; the current sequence image is associated with its page after each navigation, while real OSD `{tile, tiledImage}` payloads track tile and image ownership. Source-open failures use active page/source ownership without requiring an image, unavailable canvas messages persist through placeholder opening, and unrelated pages, healthy tiles or retired images during an empty-world A→B→A interval no longer clear or create a genuine failure. | Vendored OSD browser payload coverage and rapid real navigation remain. |
| LYR-R04 | Mount state is owned per source group; unchanged `init()` calls reuse the mount, obsolete zero-candidate mounts are removed, disposal is idempotent, owned timers/abort/viewer cleanup run, supported leaf replacements reuse the existing viewer column and explicit teardown restores stock layout. | Replacement during thumbnail loading, full observer/queue teardown and browser layout checks remain. |
| LYR-R05 | `mountDescriptor()` is invoked inside a promise boundary; a throwing primary OSD constructor falls back once to a working static image, with safe terminal behavior covered. | Separate multi-group final-failure and browser exception checks remain. |
| LYR-R06 | `DigitalViewerAssetVersion.for_plugin_root()` hashes the ordered served filenames and bytes with SHA-256. `test/asset_version_test.rb` proves JS-only changes alter the version despite fixed mtimes and copied bytes retain it across changed mtimes. The corrected candidate helper digest is `904613907a038bf6f5383e30eb5480d92785f6c7585a58192c4c196fbe05dce6`; the earlier PUI render used the pre-correction digest, so no post-correction PUI asset render is claimed. | Root/non-root browser cache update/rollback checks remain. |

Evidence commands: `node --test test/*.mjs`; `ruby test/asset_version_test.rb`; `node --check public/assets/digital_viewer.js`; `ruby -c public/views/digital_viewer_asset_version.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`. Result: 54 Node tests, asset digest test and parser checks pass in standalone and parent copies; runtime/test/helper bytes match.

Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## Open task ledger

| Task | Status | Evidence |
|---|---|---|
| LYR-01 | IN PROGRESS | `docs/fixture-ledger.md`; this record |
| LYR-02 | IN PROGRESS | Stock object override removed; explicit leaf-page layout test passes; Rails/browser render pending |
| LYR-03 | IN PROGRESS | Upstream 4.2.0 digital partial restored; selector/grouping contract test passes; Rails/browser render pending |
| LYR-04 | IN PROGRESS | Event-driven OSD/static-image lifecycle tests pass; correction handoff tests pass; browser and hosted checks pending |
| LYR-05 | IN PROGRESS | Safe env configuration, host-derived Compass matching, content-hashed assets and 54 passing Node tests; hosted configuration/render checks pending |
| LYR-06 | IN PROGRESS | Standalone/parent parser, digest and Node regression checks pass; broader ASpace/browser matrix pending |
| LYR-07 | IN PROGRESS | Host answers pending; local-independent work may proceed |
| LYR-08 | NOT STARTED | Pending candidate and LYR-06/07 |
| LYR-09 | NOT STARTED | Gate A and deployment authorization required |

## LYR-02 — Stock object page with JS/CSS viewer layout

Task / matrix ID: LYR-02  
Status: IN PROGRESS  
Standalone commit: `a0faac7576099efc16aa3e5f0e4140d51d528818`  
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: Node DOM harness on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN  
Fixture and approved scope: Page classification contract; converted image pilot scope  
Commands or interaction steps: `node --test test/digital_viewer.test.mjs`; `node --check public/assets/digital_viewer.js`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`  
Expected result: The package contains no `public/views/objects/show.html.erb`; an explicit leaf Digital Object with the stock content pane is eligible for the scoped layout, while Archival Objects, Digital Objects with children, and missing panes retain stock/inline behavior.  
Observed result: The full object-page override was removed from both standalone and parent runtime copies. The new page-context contract test passes, and the exact JS/CSS/partial/test bytes match between the two copies. All four retained Digital Object pages rendered HTTP 200 on ASpace 4.2.0 via temporary PUI port 18081 with the stock content pane and viewer source markup. Archival Object pages, stock hook behavior beyond these HTML checks, and browser layout remain pending.
Evidence artifact: `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `public/views/shared/_digital.html.erb`, `test/digital_viewer.test.mjs`; `classifyPageContext` test  
Remaining issue / owner: Start ASpace on an available PUI port or release the unrelated listener; exercise Digital Object, Digital Object-with-children, Archival Object, ordinary page, both sidebar positions, keyboard resizing, and long-note behavior. Owner: implementation agent.  
Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## LYR-06 — Run release regression checks locally

Task / matrix ID: LYR-06 / M01-M18 local portion
Status: IN PROGRESS
Standalone commits: `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, `8f980cebe08468b6fd79b34941b833bdd93ee54d`, `9fb1e955bec60e75be18bfab9bc8a1f481a1a719`, `271b3069f8fbd0be74f259289d0846052da13db0`, `d4d46e62062ce5d78cc88d0d05d1face03f4cf1b`, `998e7bfca8cc92788f1350f4d6f827cbf050cac` (runtime corrections); evidence recorded in `0a0de32f7195d91678961b43100f38f639ff183f`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace
Archive / SHA-256: NOT RUN; candidate asset SHA-256 recorded below
Environment / ASpace / browser / OS: macOS local workstation; Node 54-test DOM suite, Ruby asset-version test and Ruby/ERB parser checks completed; browser checks NOT RUN
Fixture and approved scope: Converted image manifest pilot scope plus legacy-link fallback cases
Commands or interaction steps: `node --test test/*.mjs`; `ruby test/asset_version_test.rb`; `node --check public/assets/digital_viewer.js`; `ruby -c plugin_init.rb`; `ruby -c public/plugin_init.rb`; `ruby -c public/views/digital_viewer_asset_version.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`; `docker image inspect archivesspace/archivesspace:4.2.0 --format '{{.Id}}'`; `docker compose ps archivesspace aspace-solr mariadb`; standalone/parent `diff -u` checks for runtime and test files
Expected result: Parser and Node checks pass, ASpace 4.2.0 is pinned, candidate runtime bytes match between standalone and Docker mount, then actual PUI renders and browser matrix provide separate evidence.
Observed result: 54 Node tests passed in both copies, the standard-library asset-version test passed in both copies, JavaScript/Ruby/ERB checks passed, and `git diff --check` passed. ASpace image ID is `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b`; Solr and MariaDB are up. A pre-correction PUI HTML check on temporary port 18081 returned HTTP 200 for the PUI root and four retained Digital Object pages, with the stock `.resizable-content-pane`, escaped `window.DigitalViewer` settings, content-versioned plugin assets and published manifest source anchors. The current browser/PUI attempt on temporary port 18081 was unreachable after container start; no post-correction PUI asset render or browser result is claimed. Candidate standalone hashes: `digital_viewer.js` `07df043b82c80de750892747fea0242b1e4d758845061d4644303d5fe4a82fc6`, `digital_viewer.css` `8fedfe4ca75936a1f53e0b5ab8f87e3a8b68d79d6f313bd9a45b0a0a8a905b28`, `layout_head.html.erb` `324ad46afbccc48d935e170bf5ce842077a6f0249ad3bcaf3ebc7affe45b1392`, `_digital.html.erb` `7d6da1cf85f4971bf4a39bf7bf8fbdf85c30102629946ebeca719bbc8028d854`, `digital_viewer_asset_version.rb` `9b05791a774ce97d28eca582ed47494c9a8decb5cbcc9c8310d69ca558e99bf7`, `digital_viewer.test.mjs` `2de92a3dfb436d3049ee4518aa2bdf32ba311c76209dcfdff85f12c7cd0b7104`, `asset_version_test.rb` `c8caf90631705e01f81a845e42a7c0f15aa59a76fad22505ffeb32f391aafbac`. Candidate standalone helper digest: `904613907a038bf6f5383e30eb5480d92785f6c7585a58192c4c196fbe05dce6`.
Evidence artifact: standalone test output, candidate asset hashes, parent/standalone byte comparisons, Docker image/container inspection
Remaining issue / owner: Create the absent Archival Object mappings and remaining local fixtures, then exercise M01-M18 in a real browser. Hosted browsers, real CORS/CSP, cold/cache timings and rollback remain pending. Owner: implementation agent with Rob/Lyrasis/ITS answers.
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending

## LYR-04 — Complete image loading and fallback lifecycle

Task / matrix ID: LYR-04  
Status: IN PROGRESS  
Standalone commits: `a96eaafdd6694affb302a5096069a0a0d63ea21f`, `271b3069f8fbd0be74f259289d0846052da13db0`, `d4d46e62062ce5d78cc88d0d05d1face03f4cf1b`, `998e7bfca8cc92788f1350f4d6f827cbf050cac`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: Node event/DOM harness on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN  
Fixture and approved scope: OSD open/open-failed, Cantaloupe no-probe, static images, loading threshold, tile events and safe terminal diagnostics  
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`  
Expected result: OSD success is determined by `open`, failures by `open-failed`, Cantaloupe has no plugin `HEAD` request, static images wait for load/error, alternate timeouts advance once, final slow attempts remain alive, later tile failures do not replace the active object, and diagnostic output omits raw errors/URLs/query strings.  
Observed result: The lifecycle implementation constructs OSD without `tileSources`, registers `open`, `open-failed`, renderer-independent `tile-ready`, `tile-load-failed` and disposal guards before calling `open`, returns the open promise through manifest adapters, waits for static image events, retains final slow viewers with `Still loading`, disposes timed-out alternatives, reports later page failure in place, and uses allowlisted failure diagnostics. The later correction work also adds shared pre-OSD deadlines, abort/stale guards, idempotent mount ownership, synchronous fallback handling, current sequence-image ownership mapping with empty-world invalidation, source-open ownership without an image, tile-specific recovery and placeholder error preservation, unavailable-page placeholders, all-unavailable candidate rejection and leaf-layout restoration. 54 Node tests pass, including event transitions, timeout retention, tile failure preservation, static-image fallback propagation, late-response handling, stale-page protection, tile-specific recovery, page-count preservation, all-unavailable fallback, layout replacement/teardown and raw-error absence.
Evidence artifact: `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`  
Remaining issue / owner: Add deterministic clock coverage, replacement during thumbnail loading, full observer/queue teardown, real browser checks and hosted CORS/tile evidence. Owner: implementation agent.
Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## LYR-03 — Preserve original links and object identity

Task / matrix ID: LYR-03  
Status: IN PROGRESS  
Standalone commit: `3667a7e97af44ce6c70806a7a658f221129686ee`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: Node DOM harness on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN  
Fixture and approved scope: Upstream ArchivesSpace 4.2.0 digital partial contract; representative, thumbnail, external-link and per-entry grouping cases  
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`  
Expected result: Published original links and representative content remain in server HTML; direct representative anchors are detected without collecting figcaption browse links; independent Archival Object entries stay isolated; duplicate URLs within one group do not create duplicate mounts.  
Observed result: The retained partial now follows the verified ASpace 4.2.0 representative/entry-list branches, preserves thumbnails, direct links, captions and collection browse links, and emits per-render source-group markers. The scan contract test passes for representative, external and thumbnail anchors while excluding a figcaption browse link. Leaf Digital Object sources share the record pane group; Archival Object blocks use their own marked wrapper or entry block. The four current Digital Object pages render with published manifest anchors; Archival Object producers, publication filtering and browser link visibility remain unverified.
Evidence artifact: `public/views/shared/_digital.html.erb`, `public/assets/digital_viewer.js`, `test/digital_viewer.test.mjs`; upstream 4.2.0 partial comparison retrieved on 2026-09-15  
Remaining issue / owner: Exercise own-record and linked-instance producers, representative-only/thumbnail-only cases, two-object Archival Object, duplicate anchors, and unpublished File Versions against current local records; create approved PDF companion fixture. Owner: implementation agent, with Rob supplying unavailable approved PDF/content fixtures.  
Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## LYR-05 — Prepare configuration and assets for hosted installation

Task / matrix ID: LYR-05 / M14-M16
Status: IN PROGRESS
Standalone commits: `b42ff314f5dc0c7c1a2956f2010ad5b54bfaf522`, `8fb37647a87a34b18c8535dfe563fed4b0584088`, `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, `9fb1e955bec60e75be18bfab9bc8a1f481a1a719`, `271b3069f8fbd0be74f259289d0846052da13db0`, `d4d46e62062ce5d78cc88d0d05d1face03f4cf1b`, `998e7bfca8cc92788f1350f4d6f827cbf050cac`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace
Archive / SHA-256: NOT RUN
Environment / ASpace / browser / OS: Node DOM harness and Ruby/ERB parser checks on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN
Fixture and approved scope: Converted image manifest pilot scope; legacy Compass and Preservica adapters retain original links when their settings are empty
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `ruby -c plugin_init.rb`; `ruby -c public/plugin_init.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`; exact byte comparison against `plugins/digital_viewer/`
Expected result: Empty or invalid optional settings do not create implicit localhost calls; Compass matching uses strict equality against the hostname parsed from `COMPASS_BASE_URL`; complete manifest URLs remain usable; assets use the active PUI prefix and a version that changes for JS, CSS or vendored OSD updates; static-image failures remain eligible for source fallback.
Observed result: The template now emits empty values when environment keys are absent, derives the Compass host from the configured HTTP(S) base URL, passes the loading threshold, uses `app_prefix` when available, and versions all three served assets from an ordered SHA-256 content digest. The viewer defensively normalizes invalid Cantaloupe bases, rejects lookalike/blank Compass hosts, disables legacy key rewriting without a usable base, preserves unavailable canvases, rejects all-unavailable manifests before mounting and propagates static-image load failures. Standalone and parent runtime/test/helper bytes match; 54 Node tests, the asset digest test and all parser checks pass in each copy.
Evidence artifact: `public/views/layout_head.html.erb`, `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`, `README.md`
Remaining issue / owner: Confirm Lyrasis's environment/config mechanism, CSP and non-root PUI prefix; verify hosted CORS/CSP and encoded identifiers; complete browser cache update/rollback checks. Local ASpace rendering used the explicit Docker environment defaults and did not establish hosted configuration acceptance. Owner: implementation agent with Lyrasis/ITS answers through Rob.
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending
