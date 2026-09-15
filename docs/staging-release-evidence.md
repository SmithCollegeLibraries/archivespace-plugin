# Staging release evidence

Date started: 2026-09-15  
Release scope: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0  
Current branch: `codex/lyr-01-baseline`

This file records implementation evidence for the Lyrasis staging launch task list. It does not grant Gate A or Gate B approval.

## LYR-01 — Baseline and fixture inventory

Task / matrix ID: LYR-01  
Status: IN PROGRESS  
Standalone commit: pending  
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
| LYR-03 | NOT STARTED | Pending LYR-02 |
| LYR-04 | NOT STARTED | Pending LYR-03 |
| LYR-05 | NOT STARTED | Pending baseline/host answers |
| LYR-06 | NOT STARTED | Pending candidate |
| LYR-07 | IN PROGRESS | Host answers pending; local-independent work may proceed |
| LYR-08 | NOT STARTED | Pending candidate and LYR-06/07 |
| LYR-09 | NOT STARTED | Gate A and deployment authorization required |

## LYR-02 — Stock object page with JS/CSS viewer layout

Task / matrix ID: LYR-02  
Status: IN PROGRESS  
Standalone commit: pending  
Parent mirror commit: pending  
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
