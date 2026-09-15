# Staging release evidence

Date started: 2026-09-15  
Release scope: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0  
Current branch: `codex/lyr-01-baseline`

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
| LYR-05 | NOT STARTED | Pending baseline/host answers |
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
Standalone commit: pending  
Parent mirror commit: uncommitted; parent `.git` index is read-only in this workspace  
Archive / SHA-256: NOT RUN  
Environment / ASpace / browser / OS: Node event/DOM harness on macOS; actual ArchivesSpace/PUI/browser checks NOT RUN  
Fixture and approved scope: OSD open/open-failed, Cantaloupe no-probe, static images, loading threshold, tile events and safe terminal diagnostics  
Commands or interaction steps: `node --test test/*.mjs`; `node --check public/assets/digital_viewer.js`; `erb -x -T - public/views/shared/_digital.html.erb | ruby -c`  
Expected result: OSD success is determined by `open`, failures by `open-failed`, Cantaloupe has no plugin `HEAD` request, static images wait for load/error, alternate timeouts advance once, final slow attempts remain alive, later tile failures do not replace the active object, and diagnostic output omits raw errors/URLs/query strings.  
Observed result: The lifecycle implementation constructs OSD without `tileSources`, registers `open`, `open-failed`, `tile-drawn`, `tile-load-failed` and disposal guards before calling `open`, returns the open promise through manifest adapters, waits for static image events, retains final slow viewers with `Still loading`, disposes timed-out alternatives, reports later page failure in place, and uses allowlisted failure diagnostics. 36 Node tests pass, including event transitions, timeout retention/disposal, tile failure preservation and raw-error absence.  
Evidence artifact: `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `test/digital_viewer.test.mjs`  
Remaining issue / owner: Add first-tile/thumbnail cleanup coverage, reinitialization and stale-event coverage, real 4.2.0 render/browser checks, and hosted CORS/tile evidence. Owner: implementation agent.  
Implementer / date: Codex / 2026-09-15  
Claude reviewer / date / claims verified or gaps found / evidence: Pending review  
Rob approver / date / decision / accepted scope: Pending

## LYR-03 — Preserve original links and object identity

Task / matrix ID: LYR-03  
Status: IN PROGRESS  
Standalone commit: pending  
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
