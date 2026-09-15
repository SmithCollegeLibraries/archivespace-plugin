# Staging release evidence

Date started: 2026-09-15  
Release scope: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0  
Current branch: `codex/lyr-05-config-assets`

This file records implementation evidence for the Lyrasis staging launch task list. It does not grant Gate A or Gate B approval.

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

Correction commits: lifecycle/source corrections `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, stale-callback guards `9fb1e955bec60e75be18bfab9bc8a1f481a1a719`, renderer/page/layout corrections `cf351ef`; content-hashed asset version `8f980cebe08468b6fd79b34941b833bdd93ee54d`; documentation/evidence updates follow in later commits.

| Correction | Observed local evidence | Remaining gap |
|---|---|---|
| LYR-R01 | `init()` now starts one attempt threshold before adapter fetch, carries it through response parsing and initial OSD open, aborts and advances once for alternatives, and retains a final slow candidate. Deferred fetch, deferred response body, final late success and no-stale-content tests pass. | Deterministic clock coverage, all adapter variants and local browser timing checks remain. |
| LYR-R02 | Legacy `/system/files/` key rewriting returns no source when Cantaloupe is absent/invalid; extraction preserves every canvas with an explicit unavailable placeholder, original `pageIndex` values and no fabricated network URL. Configured encoded keys and absolute converted services remain covered. | Browser request inspection and full mixed-sequence navigation remain. |
| LYR-R03 | Initial open settlement is separate from later page failures; `tile-ready` is used instead of renderer-specific `tile-drawn`; real OSD `{tile, tiledImage}` payloads map errors/recovery to the owning page, so stale healthy/failed pages do not alter the active page. | Vendored OSD browser payload coverage and rapid real navigation remain. |
| LYR-R04 | Mount state is owned per source group; unchanged `init()` calls reuse the mount, obsolete zero-candidate mounts are removed, disposal is idempotent, owned timers/abort/viewer cleanup run, supported leaf replacements reuse the existing viewer column and explicit teardown restores stock layout. | Replacement during thumbnail loading, full observer/queue teardown and browser layout checks remain. |
| LYR-R05 | `mountDescriptor()` is invoked inside a promise boundary; a throwing primary OSD constructor falls back once to a working static image, with safe terminal behavior covered. | Separate multi-group final-failure and browser exception checks remain. |
| LYR-R06 | `DigitalViewerAssetVersion.for_plugin_root()` hashes the ordered served filenames and bytes with SHA-256. `test/asset_version_test.rb` proves JS-only changes alter the version despite fixed mtimes and copied bytes retain it across changed mtimes. The corrected standalone helper digest is `ff4678cb1292ea53f619ed932113c882b3ad37259cb10577d77b40526d0dfffa`; the earlier ASpace render used the pre-correction digest and must be rerun before claiming a served final version. | Root/non-root browser cache update/rollback checks and post-correction ASpace render remain. |

Evidence commands: `node --test test/*.mjs`; `ruby test/asset_version_test.rb`; `node --check public/assets/digital_viewer.js`; `ruby -c public/views/digital_viewer_asset_version.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`. Result: 50 Node tests, asset digest test and parser checks pass in standalone and parent copies; runtime/test/helper bytes match.

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
| LYR-05 | IN PROGRESS | Safe env configuration, host-derived Compass matching, content-hashed assets and 47 passing Node tests; hosted configuration/render checks pending |
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
Standalone commits: `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, `8f980cebe08468b6fd79b34941b833bdd93ee54d`, `9fb1e955bec60e75be18bfab9bc8a1f481a1a719` (runtime corrections); evidence recorded in `0a0de32f7195d91678961b43100f38f639ff183f`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace
Archive / SHA-256: NOT RUN; candidate asset SHA-256 recorded below
Environment / ASpace / browser / OS: macOS local workstation; Node 47-test DOM suite, Ruby asset-version test and Ruby/ERB parser checks completed; browser checks NOT RUN
Fixture and approved scope: Converted image manifest pilot scope plus legacy-link fallback cases
Commands or interaction steps: `node --test test/*.mjs`; `ruby test/asset_version_test.rb`; `node --check public/assets/digital_viewer.js`; `ruby -c plugin_init.rb`; `ruby -c public/plugin_init.rb`; `ruby -c public/views/digital_viewer_asset_version.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`; `docker image inspect archivesspace/archivesspace:4.2.0 --format '{{.Id}}'`; `docker compose ps archivesspace aspace-solr mariadb`; standalone/parent `diff -u` checks for runtime and test files
Expected result: Parser and Node checks pass, ASpace 4.2.0 is pinned, candidate runtime bytes match between standalone and Docker mount, then actual PUI renders and browser matrix provide separate evidence.
Observed result: 50 Node tests passed in both copies, the standard-library asset-version test passed in both copies, JavaScript/Ruby/ERB checks passed, and `git diff --check` passed. ASpace image ID is `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b`; Solr and MariaDB are up. The standard PUI port 8081 was occupied by an unrelated Node process, so a temporary port override started the same ASpace 4.2.0 image with PUI 18081 and API 18089, preserving existing volumes. The PUI root and all four retained Digital Object pages returned HTTP 200. Each page contained the stock `.resizable-content-pane`, escaped `window.DigitalViewer` settings, content-versioned plugin assets and a published manifest source anchor. No browser result is claimed. Candidate standalone hashes: `digital_viewer.js` `f9509ee3222d0ac6555510e86dc0981a5ce269f921636a99c34ca3bd5a24bee3`, `digital_viewer.css` `8fedfe4ca75936a1f53e0b5ab8f87e3a8b68d79d6f313bd9a45b0a0a8a905b28`, `layout_head.html.erb` `324ad46afbccc48d935e170bf5ce842077a6f0249ad3bcaf3ebc7affe45b1392`, `_digital.html.erb` `7d6da1cf85f4971bf4a39bf7bf8fbdf85c30102629946ebeca719bbc8028d854`, `digital_viewer_asset_version.rb` `9b05791a774ce97d28eca582ed47494c9a8decb5cbcc9c8310d69ca558e99bf7`, `digital_viewer.test.mjs` `3948ee02c02418d3373646302154b6792ba9dd4f97b42e8f1af366febafc6e59`, `asset_version_test.rb` `c8caf90631705e01f81a845e42a7c0f15aa59a76fad22505ffeb32f391aafbac`. The corrected standalone helper digest is `ff4678cb1292ea53f619ed932113c882b3ad37259cb10577d77b40526d0dfffa`.
Evidence artifact: standalone test output, candidate asset hashes, parent/standalone byte comparisons, Docker image/container inspection
Remaining issue / owner: Create the absent Archival Object mappings and remaining local fixtures, then exercise M01-M18 in a real browser. Hosted browsers, real CORS/CSP, cold/cache timings and rollback remain pending. Owner: implementation agent with Rob/Lyrasis/ITS answers.
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending

## LYR-04 — Complete image loading and fallback lifecycle

Task / matrix ID: LYR-04  
Status: IN PROGRESS  
Standalone commit: `a96eaafdd6694affb302a5096069a0a0d63ea21f`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: Node event/DOM harness on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN  
Fixture and approved scope: OSD open/open-failed, Cantaloupe no-probe, static images, loading threshold, tile events and safe terminal diagnostics  
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`  
Expected result: OSD success is determined by `open`, failures by `open-failed`, Cantaloupe has no plugin `HEAD` request, static images wait for load/error, alternate timeouts advance once, final slow attempts remain alive, later tile failures do not replace the active object, and diagnostic output omits raw errors/URLs/query strings.  
Observed result: The lifecycle implementation constructs OSD without `tileSources`, registers `open`, `open-failed`, renderer-independent `tile-ready`, `tile-load-failed` and disposal guards before calling `open`, returns the open promise through manifest adapters, waits for static image events, retains final slow viewers with `Still loading`, disposes timed-out alternatives, reports later page failure in place, and uses allowlisted failure diagnostics. The later correction work also adds shared pre-OSD deadlines, abort/stale guards, idempotent mount ownership, synchronous fallback handling, real tiled-image ownership mapping, unavailable-page placeholders and leaf-layout restoration. 50 Node tests pass, including event transitions, timeout retention, tile failure preservation, static-image fallback propagation, late-response handling, stale-page protection, page-count preservation, layout replacement/teardown and raw-error absence.
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
Standalone commits: `b42ff314f5dc0c7c1a2956f2010ad5b54bfaf522`, `8fb37647a87a34b18c8535dfe563fed4b0584088`, `cb1df3cf46cfe463b23fa782544a07d0c46f9421`, `9fb1e955bec60e75be18bfab9bc8a1f481a1a719`
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace
Archive / SHA-256: NOT RUN
Environment / ASpace / browser / OS: Node DOM harness and Ruby/ERB parser checks on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN
Fixture and approved scope: Converted image manifest pilot scope; legacy Compass and Preservica adapters retain original links when their settings are empty
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `ruby -c plugin_init.rb`; `ruby -c public/plugin_init.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`; exact byte comparison against `plugins/digital_viewer/`
Expected result: Empty or invalid optional settings do not create implicit localhost calls; Compass matching uses strict equality against the hostname parsed from `COMPASS_BASE_URL`; complete manifest URLs remain usable; assets use the active PUI prefix and a version that changes for JS, CSS or vendored OSD updates; static-image failures remain eligible for source fallback.
Observed result: The template now emits empty values when environment keys are absent, derives the Compass host from the configured HTTP(S) base URL, passes the loading threshold, uses `app_prefix` when available, and versions all three served assets from an ordered SHA-256 content digest. The viewer defensively normalizes invalid Cantaloupe bases, rejects lookalike/blank Compass hosts, disables legacy key rewriting without a usable base, preserves unavailable canvases, and propagates static-image load failures. Standalone and parent runtime/test/helper bytes match; 50 Node tests, the asset digest test and all parser checks pass in each copy.
Evidence artifact: `public/views/layout_head.html.erb`, `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`, `README.md`
Remaining issue / owner: Confirm Lyrasis's environment/config mechanism, CSP and non-root PUI prefix; verify hosted CORS/CSP and encoded identifiers; complete browser cache update/rollback checks. Local ASpace rendering used the explicit Docker environment defaults and did not establish hosted configuration acceptance. Owner: implementation agent with Lyrasis/ITS answers through Rob.
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending
