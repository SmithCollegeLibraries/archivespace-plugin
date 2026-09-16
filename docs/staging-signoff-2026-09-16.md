# Staging checkpoint: acceptance and next steps

Recorded: 2026-09-16. Product: ArchivesSpace PUI plugin `digital_viewer`, not the discovery prototype. Approver: Rob O'Connell. This is a documentation reconciliation; no runtime, record, server or policy changes, and no new execution of the previously recorded tests.

## 1. Decision recorded

After receiving the local test URLs, Rob responded: **“Great. This looks good.”** Record this as acceptance of the demonstrated local examples/presentation and completion of that local review subtask. The message does not specify which individual URLs, controls or browsers Rob exercised; do not attribute the implementer's automated test matrix to Rob.

The accepted demonstration includes the supplied PDFs and scanned-text example within the confirmed three-type pilot: a single image, an image sequence, or a PDF. Mixed-media objects are not required. An Archival Object linking distinct image and PDF objects still needs grouping isolation; that local check now exists and passes.

This is **not** approval of untested work, acceptance of a production PDF host, a waiver of outstanding failures, cumulative code-review sign-off, or authorization to send/install a release. Rob remains the approver for those decisions. Special Collections' format clarification is not a signed restricted-content/security assessment.

| Sign-off / completion | Current disposition | Basis |
| --- | --- | --- |
| Demonstrated local examples/presentation | ACCEPTED by Rob, 2026-09-16 | Conversation response above, following local DO/AO test links |
| Baseline and local fixture inventory, LYR-01 | PASS — local subtask complete | Exact candidate/ports, four pilot AO mappings, isolated edge/PDF fixtures, safe creation plans and readbacks in the fixture ledger |
| Automated and focused Chrome checks | PASS within recorded scope | Implementer-run evidence; not a new independent review or full browser acceptance |
| Earlier R03 external review | Claims verified by supplied reviewer report | Applies to that R03 checkpoint; later layout/fixture changes require their own review |
| Cumulative code acceptance | OPEN | Independent reviewer validates current diff/evidence; Rob accepts disposition |
| Host/config and public-content boundary | OPEN | Lyrasis, ITS and content-owner answers/evidence still needed |
| Gate A — send exact staging-install package | OPEN | No approved final archive/checksum, complete local release checks or host/content agreement |
| Gate B — accept installed staging demo | NOT RUN / OPEN | No Lyrasis installation or hosted acceptance recorded |
| Production rollout | OUTSIDE this sign-off | Separate production, migration and operational acceptance remains required |

## 2. Exact evidence baseline

- Latest fixture/test/documentation checkpoint reviewed for this reconciliation: `a338829239258117bc557bbda626b8b130e9c677` on `codex/lyr-05-config-assets`.
- Runtime: `0c1ca140a51a28b93b8895b19b5b869ce0c9a5d5`. Subsequent format work did not change production code. Asset digest: `26102a571fd06034f4d7e68aa902535a34ff1def31a8ba8f0e82536914a947ec`.
- [Fixture ledger](fixture-ledger.md): original four image pilots and their linked AOs; children, representative/thumbnail branches, alternatives, unsupported/no-content records; three PDFs with 1/4/35 pages; six scanned-text pages; blocked PDF embedding and separate-object isolation. Local IDs are not staging IDs.
- [Layout evidence](local-layout-validation-2026-09-16.md): 40 layout rows across five widths and both real sidebar configurations; focused notes/ARIA, resize, keyboard and navigation checks; final 18-page render; 63 Node tests per copy and real-OSD R03 regressions.
- [Format evidence](local-formats-validation-2026-09-16.md): 12 PDF DO/AO/viewport rows, four scanned-text rows, two blocked-embed/direct-open cases, separate-object isolation and no-JavaScript PDF links. Actual source/PDF hashes and reproduction are recorded there.
- [Release evidence](staging-release-evidence.md) and [independent-review packet](independent-review-handoff-2026-09-16.md) distinguish earlier reviewer findings from later implementer checks.

Parent plugin/test/guide copies were verified identical at the format checkpoint, but remain uncommitted because this session's parent Git index is read-only. The standalone checkpoint is the immutable review source. Preserve unrelated parent edits; do not change permissions to force a commit. The standalone guide is now tracked and appears in `git archive`; that listing is not extracted-package validation.

## 3. Task disposition — do not restart completed fixes

Guide checkboxes record the specific evidenced criterion, not blanket task or release approval. `PASS (local)` below never substitutes for hosted checks.

| Task | Current status | Remaining work needed to close |
| --- | --- | --- |
| LYR-01 Baseline/fixtures | PASS (local) | Maintain ledger if candidate/content changes; resolve staging IDs during installation preparation |
| LYR-02 Stock layout | Implemented; listed local render/layout checks PASS | Verify extracted package contains no stale full override, actual configured plugins do not conflict, and remaining browser coverage passes |
| LYR-03 Links/grouping | Implemented; mapped producers, representative/thumbnail branches, publication and separate-PDF isolation locally evidenced | Complete remaining loading/failure/caption/keyboard cases where no browser evidence is recorded; reviewer confirms coverage rather than assuming Node tests prove every matrix row |
| LYR-04 Loading/fallback | Implemented; persistent regressions and focused real-OSD checks PASS | Audit/reproduce the remaining controlled failure, slow-source, thumbnail-stall and download matrix; retain original links and final-candidate behavior |
| LYR-05 Config/assets | Environment configuration, strict hosts and content hashing implemented | Confirm host mechanism/CSP/prefix; real prefixed deployment and cache-retained rollback checks; resolve legacy `frontend/` asset duplication; AppConfig mapping only if host requires it |
| LYR-06 Local release tests | PARTIAL | Firefox and actual Safari; full Tab/focus/accessibility journey; completed downloads; remaining failure cases and measured fresh/cached journeys with declared cache state |
| LYR-07 Host/content agreement | OPEN | Exact PUI origin, config/CSP, operational answers, approved hosted PDF endpoint/policy, restricted-content/cache boundary and staging-origin service probes |
| LYR-08 Package/Gate A | PARTIAL — documentation and tracked guide available | Authoritative asset/package audit, notices/license, independent extraction tests, checksum, local rollback rehearsal, cumulative independent review and Rob's exact-artifact approval |
| LYR-09 Hosted installation/Gate B | NOT STARTED | After Gate A, Lyrasis installs; run hosted/off-campus checks and rollback; record final installed state and Rob's acceptance |

LYR-R01–R06 are implemented with the recorded corrections/regressions; they are not new implementation tickets. Any remaining verification gap belongs to the mapped LYR task. Reopen code only for a reproduced defect or a confirmed host requirement.

WBL tickets have broader scope: WBL-0901 duplication is still open; WBL-0902 is implemented for the current environment contract but host close-out is pending; WBL-0904 has a defined matrix and local pilot evidence but broader release coverage remains partial; WBL-1004 production configuration is not completed by local examples. Preservica playback, audio/video, production migration waves and the complete restricted-content platform are not new requirements for this converted-manifest/PDF staging pilot. Safe original-link behavior and a proven public-service boundary remain mandatory.

## 4. Next work, owners and completion evidence

Owners below describe responsibilities, not evidence that an external person has accepted an assignment. Rob coordinates requests. This document does not send a ticket or authorize hosted changes.

### NEXT-01 — Confirm hosting and content decisions (start coordination now)

Owner: Rob with Lyrasis; ITS and Special Collections for content services. Maps to LYR-07 / WBL-1101/1102 and the PDF/content portions of WBL-1004.

- Record exact staging **PUI** origin/path and current target version. Michelle reported 4.2.0 and the staging **Staff** URL `https://archivesspace-test.smith.edu/staff/`; neither establishes the PUI origin or prefix.
- Preserve what is already known: custom plugins go to test by ticket, then production only after Smith testing; restarts are coordinated; Smith can request a wait while it tests upgrades. The relay does not establish lead time, rollback SLA or who regression-tests this custom plugin.
- Obtain configuration mechanism (environment versus AppConfig), active plugins/overlapping overrides, actual CSP/inline allowances, package delivery, restart window, disable/restore owner and custom-plugin upgrade responsibilities. Do not invent a second config mechanism or relax CSP before those answers.
- Choose an approved durable HTTPS PDF endpoint that permits embedding, **or** have Rob explicitly accept direct-link fallback for the hosted scope. The loopback PDF server is not deployable; the original Compass PDF's SAMEORIGIN refusal is not fixed by CORS. Local approval did not decide this hosting tradeoff.
- Obtain content-owner fixture approval and ITS proof that restricted originals, metadata, tiles and cached derivatives are denied or excluded from the public serving path. Selecting only public demo records does not establish that boundary.
- With the confirmed PUI origin, record dated actual metadata/tile allow-origin responses and service/redirect inventory. Plan real hosted CSP/CORS/off-campus verification after installation; localhost wildcard observations do not close that stage.

Done when: written answers and owners, approved content/PDF scope, supported configuration, restriction evidence and a hosted verification plan are linked for Rob's decision. Local QA/packet preparation may continue while replies are pending.

### NEXT-02 — Finish the local release matrix

Owner: implementation/test assignee; Rob/Special Collections confirm expected downloads. Maps to LYR-02–06 / WBL-0904.

- Use the current fixture ledger and candidate; do not recreate the accepted examples or republish hidden versions. Audit M01–M18 row-by-row for local evidence, missing evidence and hosted-only checks.
- Run supported primary journeys in Firefox and **actual Safari**, not a substitute WebKit claim. Verify keyboard Tab order/focus, notes/tree/toolbar usability and narrow layout. Record browser/OS/commit and the outcome separately.
- Verify completed image/PDF downloads and expected asset class, not just a correct link. Finish controlled primary/secondary/terminal failure, slow-final-candidate, cached/static-image and thumbnail error/stall checks with real browser evidence where required.
- Record fresh/cached timings without calling an unknown/shared cache cold. Retain and explain stock leaf-tree 404s; obtain a specific disposition if they prevent an acceptance criterion. Do not suppress console evidence or treat general visual approval as a waiver.

Done when: each required local row has PASS/FAIL/NOT RUN with evidence; any required failures are fixed and rechecked or explicitly returned to Rob for a scope decision. Hosted-only rows remain NOT RUN until NEXT-06.

### NEXT-03 — Finish package/configuration/notice preparation

Owner: implementation assignee, with host and rights owners supplying facts. Maps to LYR-05/08 / WBL-0901/0902.

- Reconcile the retained legacy `frontend/` copies only after verifying PUI and Staff loading. Do not remove files merely because the tested PUI uses `public/`; any code change needs targeted regressions, mirror parity and updated candidate identity.
- Confirm root/non-root asset loading and the host's actual config path. Keep unused adapters explicitly disabled; no localhost service defaults or credentials in the delivered runtime/config.
- Resolve dependency/version and license/notice inventory with the appropriate owner. Preserve OSD notices; do not invent a repository license.
- Build a pinned standalone archive rooted at `digital_viewer`; exclude secrets, parent code, database snapshots, local PDF binaries and screenshots. Clearly label any localhost examples as nondeployable test evidence. Verify documentation links without the parent checkout, no stale object override, byte identity and tests from an independent extracted directory. Record the full commit and archive SHA-256.

Done when: independently extracted packet passes the applicable tests and has complete installation/config/notice/evidence instructions. Finalize against NEXT-01 answers and any code changes from NEXT-02; a preparation archive is not yet approved for sending.

### NEXT-04 — Rehearse local rollback

Owner: implementation assignee; Rob authorizes any additional fixture/config mutation. Maps to LYR-08 / M15/M18.

Rehearse plugin/config A→B→A with browser caches retained, verify restored served bytes/version and ordinary PUI/Staff behavior, and separately restore only a labeled local test record's intended File Version fields using a fresh lock version. Verify indexing/PUI afterward. Preserve unrelated records, plugin settings, volumes and the unrelated 8081 listener. Record the exact prior/final state; this documentation request itself performs or authorizes no destructive rollback.

Done when: commands, snapshots, outcome and final state are reviewable; Lyrasis's corresponding hosted procedure/owner is agreed. Documenting instructions is not a rehearsal pass.

### NEXT-05 — Independent review and Gate A decision

Owner: Claude or another reviewer validates claims; Rob is the sole approver. Maps to LYR-08.

Review the cumulative current candidate, including post-R03 layout/fixture work, together with NEXT-01–04 evidence. Identify precisely which claims were reproduced and which were only inspected. Resolve findings, freeze the actual deliverable and record Rob's approval for its **full commit, archive checksum, configuration, scope and remaining explicitly accepted limitations**. No open restricted-exposure finding or silently waived broken supported journey can be relabeled ready.

Done when: Gate A is explicitly signed for that artifact. Only then is the installation package ready to send through the agreed channel. Host questions can be discussed earlier without representing a release as approved.

### NEXT-06 — Lyrasis test installation and hosted acceptance

Owner: Lyrasis installs/operates; Rob and Special Collections test; ITS supplies content-service evidence. Maps to LYR-09 / Gate B.

After Gate A, verify installed bytes/config, resolve actual staging IDs, and run PUI/Staff, image/PDF, failures, keyboard, downloads, HTTPS/CSP/CORS and off-campus checks. Rehearse the agreed hosted plugin/config and test-record rollback. Record whether the approved candidate is active for a demo or the previous state was restored. Rob then decides Gate B. Production remains a separate approval.

## 5. Immediate handoff

We have an accepted **local demonstration**, not an approved installation package. The next implementation work is NEXT-02 and NEXT-03; Rob can initiate NEXT-01 coordination in parallel. Then complete local rollback, independent review and the Gate A decision before installation. Keep this checkpoint and the guide current instead of treating older missing-fixture statements as new work.
