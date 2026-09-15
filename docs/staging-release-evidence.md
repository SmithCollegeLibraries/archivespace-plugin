# Staging release evidence

Date started: 2026-09-15  
Release scope: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0  
Current branch: `codex/lyr-01-baseline` (task-boundary commits through LYR-05)

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

## Open task ledger

| Task | Status | Evidence |
|---|---|---|
| LYR-01 | IN PROGRESS | `docs/fixture-ledger.md`; this record |
| LYR-02 | IN PROGRESS | Stock object override removed; explicit leaf-page layout test passes; Rails/browser render pending |
| LYR-03 | IN PROGRESS | Upstream 4.2.0 digital partial restored; selector/grouping contract test passes; Rails/browser render pending |
| LYR-04 | IN PROGRESS | Event-driven OSD/static-image lifecycle tests pass; browser and hosted checks pending |
| LYR-05 | IN PROGRESS | Safe env configuration, host-derived Compass matching, prefix-aware assets and 39 passing Node tests; hosted configuration/render checks pending |
| LYR-06 | NOT STARTED | Pending candidate |
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
Observed result: The full object-page override was removed from both standalone and parent runtime copies. The new page-context contract test passes, and the exact JS/CSS/partial/test bytes match between the two copies. Actual 4.2.0 rendering, stock hook preservation, and browser layout remain unverified because ArchivesSpace cannot start while host port 8081 is occupied.  
Evidence artifact: `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `public/views/shared/_digital.html.erb`, `test/digital_viewer.test.mjs`; `classifyPageContext` test  
Remaining issue / owner: Start ASpace on an available PUI port or release the unrelated listener; exercise Digital Object, Digital Object-with-children, Archival Object, ordinary page, both sidebar positions, keyboard resizing, and long-note behavior. Owner: implementation agent.  
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
Observed result: The lifecycle implementation constructs OSD without `tileSources`, registers `open`, `open-failed`, `tile-drawn`, `tile-load-failed` and disposal guards before calling `open`, returns the open promise through manifest adapters, waits for static image events, retains final slow viewers with `Still loading`, disposes timed-out alternatives, reports later page failure in place, and uses allowlisted failure diagnostics. The later LYR-05 boundary fix also propagates static-image promises through `mountDescriptor`, so broken direct images can advance to an alternative. 39 Node tests pass, including event transitions, timeout retention, tile failure preservation, static-image fallback propagation and raw-error absence.
Evidence artifact: `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`  
Remaining issue / owner: Add first-tile/thumbnail cleanup coverage, reinitialization and stale-event coverage, real 4.2.0 render/browser checks, and hosted CORS/tile evidence. Owner: implementation agent.  
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
Observed result: The retained partial now follows the verified ASpace 4.2.0 representative/entry-list branches, preserves thumbnails, direct links, captions and collection browse links, and emits per-render source-group markers. The scan contract test passes for representative, external and thumbnail anchors while excluding a figcaption browse link. Leaf Digital Object sources share the record pane group; Archival Object blocks use their own marked wrapper or entry block. Actual Rails rendering, publication filtering and browser link visibility remain unverified while ArchivesSpace is stopped.  
Evidence artifact: `public/views/shared/_digital.html.erb`, `public/assets/digital_viewer.js`, `test/digital_viewer.test.mjs`; upstream 4.2.0 partial comparison retrieved on 2026-09-15  
Remaining issue / owner: Exercise own-record and linked-instance producers, representative-only/thumbnail-only cases, two-object Archival Object, duplicate anchors, and unpublished File Versions against current local records; create approved PDF companion fixture. Owner: implementation agent, with Rob supplying unavailable approved PDF/content fixtures.  
Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## LYR-05 — Prepare configuration and assets for hosted installation

Task / matrix ID: LYR-05 / M14-M16
Status: IN PROGRESS
Standalone commit: pending (working tree at task boundary)
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace
Archive / SHA-256: NOT RUN
Environment / ASpace / browser / OS: Node DOM harness and Ruby/ERB parser checks on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN
Fixture and approved scope: Converted image manifest pilot scope; legacy Compass and Preservica adapters retain original links when their settings are empty
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `ruby -c plugin_init.rb`; `ruby -c public/plugin_init.rb`; `erb -x -T - public/views/layout_head.html.erb | ruby -c`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`; exact byte comparison against `plugins/digital_viewer/`
Expected result: Empty or invalid optional settings do not create implicit localhost calls; Compass matching uses strict equality against the hostname parsed from `COMPASS_BASE_URL`; complete manifest URLs remain usable; assets use the active PUI prefix and a version that changes for JS, CSS or vendored OSD updates; static-image failures remain eligible for source fallback.
Observed result: The template now emits empty values when environment keys are absent, derives the Compass host from the configured HTTP(S) base URL, passes the loading threshold, uses `app_prefix` when available, and versions all three served assets from the newest asset mtime. The viewer defensively normalizes a non-string Cantaloupe base, rejects lookalike/blank Compass hosts, and propagates static-image load failures. Standalone and parent runtime/test bytes match; 39 Node tests pass in each copy and all parser checks pass.
Evidence artifact: `public/views/layout_head.html.erb`, `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`, `README.md`
Remaining issue / owner: Confirm Lyrasis's environment/config mechanism, CSP and non-root PUI prefix; render the generated config on actual ASpace 4.2.0; verify hosted CORS/CSP and encoded identifiers; complete CSS-only cache and rollback checks. Owner: implementation agent with Lyrasis/ITS answers through Rob.
Implementer / date: Codex / 2026-09-15
Claude reviewer / date / claims verified or gaps found / evidence: Pending review
Rob approver / date / decision / accepted scope: Pending
