# digital_viewer: Lyrasis staging launch task list

Date: 2026-09-16\
Status: Scope/evidence update v5; staging candidate remains IN PROGRESS, with no release acceptance.\
Approver for all decisions and gates: Rob O'Connell.\
Reviewer of record: Claude, validating claims and evidence.\
Historical correction assignee: luna-high; subsequent implementation and fixture evidence is recorded in the linked reports.\
Product: ArchivesSpace PUI plugin `digital_viewer`, targeting ArchivesSpace 4.2.0.

Current continuation: runtime `0c1ca14` and the subsequent local PDF/scanned-text evidence supersede the missing-fixture statements in historical checkpoints below. Consult standalone `docs/fixture-ledger.md` and `docs/local-formats-validation-2026-09-16.md`; do not restart completed R01–R06 work. Rob's Special Collections clarification limits pilot object types to an image sequence, a single image, or a PDF, with no mixed-media requirement.

Historical correction handoff: [Correction handoff — resume here](#correction-handoff--resume-here). This revision turns the six findings from the review of `af7b2834b97f5af6eb4e12a24756feeb86c3afab` into implementable corrections; it does not ask the assignee to restart completed work from the original baseline. The parent copy at `docs/lyrasis-staging-launch-task-list.md` is the source guide; keep the same-named standalone copy synchronized for handoff.

## 1. Outcome and scope

Deliver a pinned plugin release that Lyrasis can install on Smith's staging ArchivesSpace, then demonstrate an accepted, reversible public-content pilot there.

Two separate acceptance gates apply:

- **Gate A — ready to send for staging installation:** code corrections, release tests, host configuration agreement, approved content scope, and the installation/rollback packet are complete. Tasks LYR-01 through LYR-08 have evidence.
- **Gate B — staging launch accepted:** Lyrasis has installed that exact release; hosted browser checks and rollback rehearsal pass; Rob accepts the pilot using the recorded technical, Special Collections and operator evidence. LYR-09 has evidence.

This task list does not grant production approval or complete the Islandora migration. Production rollout, migration waves, a Preservica backend deployment, new source types, a complete restricted-content gateway, and general performance tuning are outside this implementation scope. Existing WBL tickets retain their broader acceptance criteria.

The staging demonstration covers three object types: multipage TIFF-backed image sequences (including scanned text, viewed through service images), a single image, or a PDF. Mixed-media/image-plus-PDF objects are not a pilot fixture requirement. Thumbnails are derivatives, not another object type. Two distinct Digital Objects linked from one Archival Object must still remain isolated, including when one is an image sequence and the other a PDF. Existing legacy Compass and Preservica records must retain usable original links when their companion services are unavailable. Full hosted playback for those adapters can remain explicitly outside the approved staging feature set.

### Current architecture

Lyrasis hosts ArchivesSpace and the plugin. The visitor's browser fetches manifests from libtools2, zoomable images from Cantaloupe at `digital.smith.edu`, and stored thumbnails from S3. Converted image fixtures do not require the Compass resolver or Preservica backend at viewing time. Successful requests from an administrator's workstation do not establish browser access from the staging PUI.

### Original pre-implementation review baseline (historical)

- Published repository: <https://github.com/SmithCollegeLibraries/archivespace-plugin>.
- Reviewed `main`: `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227`, confirmed through `git ls-remote` on 2026-09-15.
- The standalone checkout was clean. Its runtime files and tests matched the parent repository's live-mounted plugin; documentation differs intentionally.
- Standalone `node --test test/*.mjs`: 29 passing tests. Both viewer JavaScript files passed syntax checks.
- Targeted in-memory checks using the existing DOM shim confirmed that a partial-provided unsupported external link remains hidden without a replacement viewer, and that OpenSeadragon has no `open-failed` handler to trigger source fallback. Digital Object additional-file-version links from record innards remain visible today; do not describe this as removal of every link on every page type.
- Comparison with upstream 4.2.0 confirmed missing sidebar/content hooks and the note accessibility initializer in the page override.
- Docker was stopped during the review. No fresh browser smoke test, Lyrasis installation, remote configuration change, or record edit occurred.

### Reviewed implementation checkpoint — 2026-09-15

- Reviewed standalone branch: `codex/lyr-05-config-assets`; exact HEAD: `af7b2834b97f5af6eb4e12a24756feeb86c3afab`. Its runtime candidate is `8fb37647a87a34b18c8535dfe563fed4b0584088`; later commits record evidence/metadata. Recheck HEAD and local changes before resuming; do not reset either worktree to these commits.
- Independently verified in the implementation review: 39 passing Node tests, JavaScript/Ruby/ERB parser checks, removal of the full object-page override, and byte identity across 47 runtime/test files in standalone and parent copies. The five recorded candidate hashes matched. These checks do not establish full lifecycle or browser acceptance.
- Implementer-reported evidence in standalone `docs/staging-release-evidence.md` and `docs/fixture-ledger.md`: all four current Digital Objects have empty `linked_instances`; all four PUI pages returned HTTP 200 with stock pane, config/assets and source anchors on temporary PUI/API ports `18081`/`18089`. These are server-render observations, not browser viewing results. Port `18081` was unreachable during the later implementation review, so those renders were not independently repeated.
- The review's in-memory Node/DOM reproductions found missing manifest-fetch timeouts, an unconfigured legacy-manifest rewrite targeting the PUI origin, later-page error-state defects, a post-disposal timer update, duplicate initialization and an uncaught synchronous mount exception. Source inspection also found an mtime-only asset version. LYR-R01–R06 below require persistent regression tests and fixes; the temporary review probes are not additions to the existing 39-test suite.
- Parent runtime/test changes are mirrored but uncommitted; the implementer reported a read-only parent Git index. Preserve those changes and unrelated work. If the index remains unavailable, record the tested bytes and `UNCOMMITTED` rather than inventing a parent commit or changing repository permissions.
- LYR-01–06 remain IN PROGRESS. Missing Archival Object/representative/mixed fixtures, local real-browser evidence, host agreement/CORS/CSP, public-content boundary, packaging and rollback remain open. Neither release gate is approved by this checkpoint.

### Revision decisions and additional evidence

- **Layout recommendation for Rob's sign-off:** remove `public/views/objects/show.html.erb` and have JavaScript/CSS enhance the stock content pane. LYR-02 below specifies this single implementation path. A whole-file view override cannot be made into a partial patch to the same view. The smaller `shared/_digital.html.erb` override still needs its own pinned upstream comparison.
- Saved snapshots for 863, 864, 867 and 869 all have empty `linked_instances`. This is historical evidence, not a current API check. LYR-01 must discover/create the corresponding local Archival Object fixtures.
- The saved 863 snapshot contains six File Versions: four unpublished, plus a published thumbnail and local manifest URL. It is useful for alternatives/publication tests, but contains no explicit PDF File Version and does not establish a working PDF companion. Add a separately verified, approved PDF fixture.
- Upstream 4.2.0 `ResultInfo` provides digital-list keys `out`, `thumb`, `represent`, `caption` and `material` as applicable. It does not attach an object URI or retain a full alternatives list in each entry. LYR-03 uses that verified contract.
- Local image `archivesspace/archivesspace:4.2.0` is present: `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b`. Its presence is not proof of a successful candidate startup/render.
- Follow-up observation reported by Rob on 2026-09-15: probing the public SIA pilot image service with a localhost origin returned HTTP 200 for both `info.json` and a 512-pixel tile. Both responses included `Access-Control-Allow-Origin: *` and `Vary: Origin`. This dated observation supersedes the earlier inconclusive probes. It establishes the observed localhost-origin behavior, not later hosted acceptance; LYR-07 must still check the confirmed staging PUI origin and actual browser tile rendering.

Reviewer references:

- [Reviewed source](https://github.com/SmithCollegeLibraries/archivespace-plugin/tree/7edccca02af1a74b1ef6b1f5f5b0db9f48af9227).
- [ASpace 4.2.0 object page](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/views/objects/show.html.erb).
- [ASpace 4.2.0 digital partial](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/views/shared/_digital.html.erb).
- [ASpace 4.2.0 representative-record partial](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/views/shared/_representative_file_version_record.html.erb).
- [ASpace 4.2.0 sidebar script](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/assets/javascripts/resizable_sidebar.js).
- [ASpace 4.2.0 note accessibility script](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/assets/javascripts/ReadMoreNotes.js).
- [ASpace 4.2.0 digital-list construction](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/controllers/concerns/result_info.rb).
- [ASpace 4.2.0 record innards](https://github.com/archivesspace/archivesspace/blob/v4.2.0/public/app/views/shared/_record_innards.html.erb).
- [Existing pilot evidence and public manifest URLs](https://github.com/SmithCollegeLibraries/archivespace-plugin/blob/7edccca02af1a74b1ef6b1f5f5b0db9f48af9227/docs/workbench-lite/archivesspace-4.2.0-pilot.md) (later follow-up sections supersede earlier temporary URLs).

## 2. Implementation and review workflow

Code paths below are relative to the standalone plugin repository root unless explicitly described as parent-repository paths.

| Location | Purpose |
| --- | --- |
| Parent `exports/archivespace-plugin-repository/` | Existing standalone Git checkout; verify branch, remote and cleanliness before use |
| Parent `plugins/digital_viewer/` | Docker live mount; must contain the same runtime files and tests as the validated release |
| `public/assets/digital_viewer.js` | Authoritative viewer |
| `public/views/layout_head.html.erb` | Configuration and asset injection |
| `public/views/objects/show.html.erb` | Removed in the reviewed candidate; keep absent and verify the packaged installation has no stale copy |
| `public/views/shared/_digital.html.erb` | Digital-link/thumbnail override requiring safe fallback |
| `frontend/` | Legacy copies; verify usage before consolidation |
| `test/digital_viewer.test.mjs` | Existing Node tests and DOM shim |

1. Claude validates this specification's claims, scope, failure semantics and evidence requirements. Rob approves the specification, including the LYR-02 layout recommendation, before implementation. Record unresolved questions with an owner; do not silently relax acceptance criteria.
2. Recheck the shared repository's current commit. Resume from the implementation checkpoint above, not the historical `main` baseline. If it moved, compare its changes with that checkpoint before applying fixes. Preserve unrelated work in both repositories.
3. Implement on a branch of the standalone repository, one task at a time. Mirror relevant changes into the parent live mount with reviewed patches for Docker verification. Do not copy `.git`, credentials or local exports between repositories.
4. Reproduce each corrected bug with a meaningful failing test before fixing it. Keep the Node runner; add only the fixtures/harness support needed to test behavior. Real Rails/browser checks remain required for template and host integration.
5. Commit at each stable task boundary. Record the standalone commit and, where applicable, parent mirror commit. Testing a different copy does not qualify as release evidence.
6. Keep `docs/staging-release-evidence.md` in the standalone repository: task ID, status, commit, commands, observations, artifacts, reviewer and date. Record broader WBL progress in the parent's `docs/workbench-lite/finished.md` without closing unmet whole tickets.
7. Claude is the external reviewer of record and reports whether claims are supported. Rob alone signs off on the specification, code, configuration, content scope, exceptions and release gates. Special Collections, ITS and Lyrasis provide subject-matter review, service facts and operational confirmations for Rob's decision; their work does not replace his approval. Do not invent their evidence or Rob's decision.

Document preparation does not execute publication, installation, restarts or hosted record edits. Carry those out under the authorization for the implementation/deployment session.

## 3. Task sequence

| Task | Deliverable | Existing work mapping | Depends on |
| --- | --- | --- | --- |
| LYR-01 | Baseline and fixture inventory | WBL-0901/0904 | None |
| LYR-02 | Stock object page with JS/CSS viewer layout | WBL-0904/1004 | LYR-01; Rob's layout/specification approval |
| LYR-03 | Accessible original links and independent objects | WBL-0904 | LYR-01/02 |
| LYR-04 | Asynchronous loading, fallback and cleanup | WBL-0903/0904 | LYR-03 |
| LYR-05 | Portable configuration and authoritative assets | WBL-0901/0902 | LYR-01; host answers from LYR-07 |
| LYR-06 | Regression and local browser evidence | WBL-0904 | LYR-02 through LYR-05 |
| LYR-07 | Host agreement and public-content boundary | WBL-1101/1102; WBL-1108/1110/1111 boundary | Start coordination early; finalize against candidate |
| LYR-08 | Pinned installation packet and Gate A review | WBL-0901/1004 preparation | LYR-06/07 |
| LYR-09 | Hosted installation, acceptance and rollback | WBL-1004 staging evidence | Gate A and deployment authorization |

Host coordination can proceed during local implementation. This document does not require spawning additional agents.

### Correction handoff — resume here

All six review findings are priority P2 and remain open. These are corrections within existing LYR tasks, not replacements for their remaining acceptance criteria. Code anchors below refer to the reviewed commit; locate the named functions if line numbers move. A passing regression test closes only that check, not the whole task or a release gate.

Recommended order: **LYR-R04 → LYR-R05 → LYR-R01 → LYR-R03** for the LYR-04 lifecycle work and LYR-03 initialization safeguard, then **LYR-R02 → LYR-R06** for LYR-05. Commit/evidence each correction boundary. Then complete missing LYR-01 fixtures and the LYR-02/03/06 render/browser matrix. Do not wait for hosted answers to implement independent local fixes. Do not recreate the removed whole-page override.

Use the existing Node VM/DOM harness and add only the hooks needed to drive real initialization/mount paths. Add controllable timers, deferred fetch/response-body promises, abort observation and a fake OSD whose `destroy()` emits `before-destroy` and removes handlers. Prefer deterministic clock advancement to real 1 ms sleeps. Explicitly invoke captured stale callbacks where needed to prove guards independently of listener removal. Tests must assert visible state, request/mount counts and cleanup, not merely handler registration.

#### LYR-R01 — Cover the entire pending candidate with the loading threshold

Maps to LYR-04; matrix M08–M10/M12. Review anchor: `public/assets/digital_viewer.js`, `mountCompassManifest` near line 1922; also `mountCompass`, `mountPreservica`, `mountOsdViewer` and the candidate loop.

Reproduced: a manifest fetch that never settles schedules no loading timer or abort signal. Even with another candidate available, fallback never occurs and no loading note appears. A response whose body never finishes is another pre-OSD pending phase.

Required correction:

- Start one initial-attempt threshold before the first fetch and keep its deadline through redirects/proxy resolution, response-body reading and initial OSD `open`. Do not reset the full threshold at each stage or retain competing adapter and OSD timers that can advance twice. After `open`, first-tile monitoring is separate and must not trigger whole-object fallback.
- With another eligible candidate, expiry disposes/aborts only the superseded attempt's owned work and advances once. Guard every continuation, including response parsing, viewer creation and catch/error rendering, against the attempt owner/token established in LYR-R04.
- For a final candidate, expiry displays one `Still loading` note while the pending request/viewer remains alive. Late success remains valid; a definite failure becomes terminal. Navigation/replacement/explicit teardown still cancels it. Do not introduce polling or automatic retry loops.
- Apply the same shared behavior to each existing manifest image adapter without deploying additional services or expanding playback scope.

Required regression evidence:

- [ ] Deferred fetch and deferred `response.json()` each exceed the threshold with an alternative: one cancellation, one fallback mount, no stale content/error when the old promise later resolves or rejects.
- [ ] Repeat both cases as final candidates: one loading note, zero timeout-driven aborts/destructions/retries; late valid manifest plus OSD open clears the note, while a definite later failure preserves links and reports terminal failure.
- [ ] Fetch completes just before the deadline but OSD metadata remains pending: the original deadline still governs the initial attempt; simultaneous timer/error delivery never advances twice.
- [ ] An opened viewer with slow first tiles is retained even when alternatives exist; unrelated groups continue independently.

#### LYR-R02 — Disable legacy key rewriting without a usable Cantaloupe base

Maps to LYR-05; matrix M14/M15 and M11 for mixed sequences. Review anchor: `toLocalCantaloupeInfoUrl` near line 1455 and `extractCompassTileSources` in `public/assets/digital_viewer.js`.

Reproduced: with `cantaloupeBaseUrl: ''`, the existing doubly encoded Compass-service fixture becomes `/2023-08%2Fsmith%3A1358443.tif/info.json`. That is an unintended request to the PUI origin. Guarding only `detectSource` does not fix the manifest path.

Required correction:

- Guard the actual legacy `/system/files/` key-construction path after validating configuration. Missing, empty, whitespace, non-string or invalid bases must not generate a root-relative key URL, an implicit `/iiif/2` endpoint or an accidental localhost request. An explicitly configured valid same-origin path for local development is distinct from an absent base; document/test any supported relative-base form.
- Preserve complete absolute HTTP(S) IIIF service IDs that do not require legacy key construction, including converted `digital.smith.edu` services, when optional backends are unset. Do not disable the entire manifest adapter or rewrite unrelated hosts.
- Represent an unavailable legacy source explicitly and route an entirely unusable candidate through the normal failure/fallback path. For a mixed sequence, preserve canvas positions/count and working-page navigation; do not implement the guard by silently filtering unavailable pages. Keep original published links accessible and avoid invented download URLs.
- Update README configuration claims only after this behavior passes; keep encoded-identifier normalization and source ordering intact.

Required regression evidence:

- [ ] The encoded legacy fixture with each invalid/unset base produces no request to the PUI host, no malformed tile URL and a usable source/fallback outcome. Verify through extraction/mounting as well as the URL helper.
- [ ] The configured fixture still preserves the expected encoded key; a converted absolute service works with all optional adapters unset.
- [ ] A mixed valid/unavailable sequence preserves original indices/count, does not issue a fabricated URL, and never downloads another page under the unavailable page's label.

#### LYR-R03 — Separate initial-open settlement from active-page failure state

Maps to LYR-04; matrix M09/M11. Review anchors: `settleOpenFailure` near line 1338 and `tile-load-failed` near line 1357 in `public/assets/digital_viewer.js`.

Reproduced: after the first successful open, a later page's `open-failed` is ignored by the settled initial promise. A `tile-load-failed` message also remains after navigating to and drawing a working page.

Required correction:

- Keep initial candidate settlement one-shot, but handle later metadata/open failure as a page-state event even after initial success. Keep `tile-load-failed` for tile failures. Neither later failure rejects an already-resolved promise nor restarts whole-object fallback.
- Associate updates with the active viewer and page/request generation. Verify the actual vendored OSD event payloads before choosing identity checks; do not assume every event supplies a page index. Ignore abandoned-viewer and old-page callbacks.
- Reset stale status when leaving a failed page and clear the appropriate failure after that page successfully recovers. An unrelated tile event must not clear the active page's real failure. Keep page order/count, labels, usable navigation and original sources; downloads must describe the selected page, never the prior page's pixels.

Required regression evidence:

- [ ] Open/draw page 1, select page 2, fail its `info.json` via `open-failed`: page 2 is identified as unavailable without replacing the object; page 1 remains accessible.
- [ ] Fail a tile on page 2, return to successfully rendered page 1: no page-2 error remains. Revisit/recover page 2 and verify its status/download state.
- [ ] Rapid A→B→A navigation with delayed errors/successes from older requests cannot change the active page's status, download target or selected index.

#### LYR-R04 — Own and dispose each mount; make initialization idempotent

Maps to LYR-03/04 and LYR-02 layout teardown; matrix M07/M10/M12. Review anchors: `before-destroy` near line 1366 and `init` near line 2185 in `public/assets/digital_viewer.js`.

Reproduced: destroying a viewer before `open` leaves the initial timer alive, which later inserts `Still loading`. Calling initialization twice creates two viewer containers. These require implementation changes, not only extra coverage.

Required correction:

- Establish one active mount owner per verified source group before starting work. Reinitializing an unchanged group reuses/leaves that mount; explicit replacement disposes it before creating a new one. Do not deduplicate distinct objects by URL or caption.
- Make disposal idempotent: mark the attempt inactive, clear initial and first-tile timers, detach/guard handlers, disconnect thumbnail observers, stop owned queued/in-flight thumbnail work, abort owned pending requests, and settle/cancel pending outcomes through a handled internal path. Do not abort shared work another active group still needs or invoke fallback/terminal diagnostics for an intentional replacement.
- Guard callbacks before any DOM, loading/error, download or layout update. Track the viewer/attempt so replacement can actually dispose it, not merely empty `innerHTML`. Late responses cannot create a viewer after disposal. A retained slow final candidate remains active until explicit teardown or definite failure.
- Preserve stock metadata/links/focus when reusing or tearing down plugin wrappers; no duplicate controls, empty reserved column, detached stock content or nested enhancement wrappers.

Required regression evidence:

- [ ] Destroy before `open`, then advance both timer windows and invoke saved callbacks: no loading/error node, remount or fallback appears; repeated disposal is harmless and pending outcomes cause no unhandled rejection.
- [ ] Initialize the same DOM twice: one mount/container/control set per group and no duplicate requests/timers/listeners. Cover leaf Digital Object layout and inline Archival Object layout; two distinct groups sharing a URL still remain distinct.
- [ ] Replace during fetch, source open and thumbnail loading: old observers/queues/requests stop, stale updates are ignored, and the replacement alone owns the visible state. A slow final candidate is not disposed just for exceeding its threshold.

#### LYR-R05 — Route synchronous mount errors through the same fallback boundary

Maps to LYR-04; matrix M08/M09. Review anchor: `tryMount` near line 2208 in `public/assets/digital_viewer.js`.

Reproduced: a throwing OSD constructor escapes `init()` before `.catch()` can run; an available direct-image alternative never mounts.

Required correction:

- Invoke `mountDescriptor` inside a promise boundary, for example `Promise.resolve().then(function () { return mountDescriptor(...); })`, or equivalent guarded control flow. Return/handle the complete chain, including fallback recursion and cancellation. An outer `.catch()` on an already-invoked function is insufficient.
- Normalize supported mount outcomes consistently, dispose partial work safely and preserve single advancement. One group's exception must not stop other groups initializing. Keep diagnostics allowlisted and source links visible.

Required regression evidence:

- [ ] Through `init()`, a primary Cantaloupe/OSD constructor throws synchronously and a valid secondary static image loads: exactly one fallback, no escaped exception and no stale primary UI.
- [ ] A final synchronous failure produces one safe terminal state; a separate group still mounts. Cover `viewer.open()` throwing and an adapter throwing before it returns a promise, with no unhandled rejection or raw error text in diagnostics.

#### LYR-R06 — Version served assets from their content, not modification time

Maps to LYR-05; matrix M15/M18. Review anchor: `public/views/layout_head.html.erb` lines 14–18.

Source finding: the maximum integer mtime of JS/CSS/OSD is not content identity. Preserved timestamps, same-second edits or an unchanged asset with a later mtime can leave changed bytes behind the same cache key.

Required correction:

- Replace the mtime-derived key with a deterministic SHA-256 content version covering a fixed, ordered set of the served viewer JS, CSS and vendored OSD filenames/bytes. The version must work from an extracted archive without `.git`, the parent repository or Mac-specific paths. Do not cache digest results using only the same mtimes that caused the defect.
- Keep prefix-aware asset URLs and existing escaping. If a generated digest manifest is used, provide a repeatable generation/verification command and reject stale metadata during packaging; do not make an undocumented manual version bump the safety mechanism.
- Add `test/asset_version_test.rb`, runnable with `ruby test/asset_version_test.rb` using standard-library facilities, against the actual Ruby helper/template logic, not an independent JavaScript reimplementation. Temporary fixtures must not alter candidate asset bytes. Run on local Ruby and verify the rendered version on the actual ASpace 4.2.0/JRuby stack.
- Document the version mechanism and record deployed URL plus byte hash for update/rollback. Restoring version A may correctly reuse A's original URL; it must never reuse B's cache key for A's different content.

Required regression evidence:

- [ ] With all mtimes held constant, changing JS only, CSS only or OSD only changes the served version. Include same-second changes and an unchanged file with a greater mtime.
- [ ] Unchanged content copied/extracted with different mtimes keeps its version; restoring exact version-A bytes restores A's version after B.
- [ ] Render root and non-root PUI asset references; in a browser with caches retained, perform A→B→A and compare served JS/CSS/OSD bytes to the intended release.

Correction completion gate: add persistent tests and before/after observations for every required check above; update standalone `docs/staging-release-evidence.md` with LYR-R IDs, commits and remaining gaps; mirror runtime/tests and verify identity. R01–R06 completion is necessary but insufficient for LYR-06/Gate A. Complete the original fixture, actual-ASpace/browser, host, content-scope and rollback requirements below, or leave the corresponding task/gate open for Rob's decision.

### LYR-01 — Establish the baseline and fixture inventory

Owner: implementation agent; Rob supplies unavailable fixtures.

Work:

- Record current standalone/parent commits, relevant dirty files, ASpace/Solr versions, enabled plugins and Docker mounts. Inspect configuration without printing secrets.
- Run standalone tests and syntax checks. Identify the templates and assets the PUI actually serves once Docker is running.
- Create a fixture ledger: local URL, record type, linked Digital Object identity, approved source URLs, expected page count/download behavior, and snapshot location for any proposed record changes.
- Current local Digital Objects: 869 (SIA, 1 image), 863 (9 to 5, 77 views), 864 (Fossey, 41 views), 867 (Steinem, 36 views). Resolve staging IDs independently.
- For each pilot, query current local linked instances and record the corresponding Archival Object URL(s), not only the Digital Object URL. If none exist, record that finding and create an identified local archival fixture with a published digital-object instance pointing to that pilot. Include one Archival Object with two distinct linked Digital Objects. Save pre-change records and use current lock versions; no hosted edits belong to fixture setup.
- Reuse parent `exports/archivespace-4.2.0-20260909/record-863.before-local-manifest-test.json` as a read-only seed for a separate local alternatives fixture. Preserve the original snapshot. Its unpublished/protocol-relative versions and visible thumbnail are useful edge cases; do not publish historical versions merely to make a test pass. Test PDFs as separate approved Digital Objects with their source/owner association recorded. Do not add a PDF to an unrelated image object just to satisfy the former mixed-media matrix.
- Locate or create local fixtures for two distinct linked digital objects, a digital object with children, long notes, representative thumbnails, linked thumbnail-plus-out-link, direct PDF (successful embedding and blocked embedding with direct access), unsupported URL, and no digital content.

Acceptance:

- [ ] Baseline results and exact source commits are recorded.
- [ ] Fixture ledger distinguishes historical user confirmation from fresh observations.
- [ ] All four pilots have a current linked-Archival-Object mapping or a documented absence plus created local fixture. Both page types are in the browser ledger, and a two-object Archival Object is available.
- [ ] Existing Docker volumes and record data are preserved; no upgrade or volume deletion is required.
- [ ] Fixture setup is repeatable and contains no credentials or restricted URLs.

Use September pilot evidence for current fixture identities. The older parent `docs/test-instance-validation-checklist.md` contains stale IDs/page counts and a credential-printing example; do not reuse its commands as the release procedure.

### LYR-02 — Use the stock object page with JS/CSS viewer layout

Owner: implementation agent; Rob owns the layout decision. Files: keep `public/views/objects/show.html.erb` absent; update viewer JavaScript/CSS and, if needed, an escaped context datum in the digital partial.

The reviewed candidate already implements the selected path: the full object-page override is removed, JavaScript adds the viewer layout inside the stock content pane, and CSS scopes the two-column presentation to enhanced leaf Digital Object pages. Preserve this implementation while completing its acceptance checks and LYR-R04 teardown/idempotency corrections. Implementation is not a substitute for recording Rob's decision. Retaining a full override pinned to 4.2.0 with a recorded diff is the alternative only if Rob explicitly changes this decision; do not reopen the layout choice inside LYR-03.

Work:

- Keep the plugin's `objects/show.html.erb` absent so ArchivesSpace renders its own 4.2.0 view. Confirm no stale deployed override or overlapping plugin still supplies the old page.
- On a verified leaf Digital Object page, use `#notes_row > .resizable-content-pane` as the outer pane. Preserve this stock element and its classes. Add namespaced metadata/viewer wrappers inside it and enable the layout class only when enhancement has usable content. Move existing DOM nodes without rebuilding their HTML or reexecuting scripts; preserve notes, focus, accordion state and event listeners.
- Verify record type from rendered context; add a safely escaped datum through the retained partial if necessary. Do not infer a leaf Digital Object solely from absence of a sidebar. If type/layout hooks are unavailable, keep an inline viewer after its source block and leave the stock page intact.
- Keep Archival Objects and Digital Objects with children in their stock sidebar/content layout, inserting independent viewers next to the relevant source blocks. Do not nest a competing whole-page column scheme inside their sidebar row.
- Let stock ASpace initialize `ReadMoreNotes`, resizing, sidebar position, breadcrumbs, identifiers, page actions, collection search, tree and modals. Do not add duplicate initialization. Removing the whole-page override restores those hooks; the remaining digital partial is corrected in LYR-03.
- Failed/unsupported enhancement must leave stock links/metadata usable without an empty reserved right column. Responsive rules apply only to the plugin's enhanced pane; teardown restores any plugin-added layout classes/wrappers without removing stock content.

Acceptance and edge cases:

- [ ] Digital Objects with/without children and Archival Object pages render on actual 4.2.0 without template errors.
- [ ] Both configured sidebar positions work; mouse and keyboard resizing work where upstream supports them.
- [ ] Long notes expand/collapse with keyboard and mouse; ARIA state updates correctly.
- [ ] No-content and unsupported-source pages preserve normal navigation and metadata.
- [ ] Desktop/narrow layouts have no overlapping viewer, sidebar or page actions.
- [ ] Evidence includes an ordinary archival page, not just Digital Object fixtures.
- [ ] The candidate package contains no `public/views/objects/show.html.erb`; actual rendered pages retain upstream 4.2.0 hooks. A missing expected pane triggers the documented inline fallback without corrupting the page.

### LYR-03 — Preserve original links and object identity

Owner: implementation agent. Files: digital partial, viewer scan/grouping functions and narrowly scoped CSS.

Verified source/selector contract to preserve:

| Page/source | Existing producer and selector | Required grouping/access behavior |
| --- | --- | --- |
| Digital Object additional File Versions | Stock `shared/_record_innards.html.erb` renders `digital_objects/additional_file_versions`; scan `[data-additional-file-version] a[href]` within the record pane | Links already remain visible. Group published alternatives/companions for this one Digital Object; keep them visible during loading/failure. |
| Digital Object's own digital entry | `ResultInfo#process_digital(record_json)` builds the record's summary from its own identifier/file versions and display metadata; `ObjectsController#show` supplies this list for Digital Objects/components | The digital partial is also used on these pages. In its entry-list branch, scan `.available-digital-objects a.external-digital-object__link[href]` and applicable thumbnail anchors; join only this record's own published alternatives. Verify actual returned fields rather than assuming an identifier always becomes an output link. |
| Archival Object linked digital entries | `ResultInfo#process_digital_instance(instances)` supplies the list to `shared/_digital.html.erb`; in the entry-list branch, scan `.available-digital-objects a.external-digital-object__link[href]` | The original baseline hid these anchors; the reviewed candidate restores them and adds per-entry wrappers. Preserve that correction and prove it on the missing Archival Object fixtures; do not group everything under `#notes_row`. |
| Representative File Version branch, on either applicable page type | Upstream `shared/_digital.html.erb` renders `shared/representative_file_version_record` **instead of the entry list** when `record['json']['representative_file_version']` is present. Scan `[data-rep-file-version-wrapper] > a[href]` inside that partial | There may be no external-link-class anchors at all. Include the direct representative anchor in source detection and deduplicate it within its established record/block. Do not scan the figcaption's collection-browse link as a file source. If `a_uri` is absent, the partial renders only an image; preserve it without inventing a link. |
| Thumbnail links in the entry-list branch | Upstream digital partial can render `a.thumbnail` rather than the external-link class | Preserve the original visible presentation and include the appropriate source anchor within its entry wrapper; do not indiscriminately scan unrelated links on the page. |
| Explicit/legacy compatibility markup | `[data-file-uri]`, and a `dt` labelled File URI followed by its `dd` | Keep existing support, scope deduplication to the verified object/block, and do not treat arbitrary metadata links as file versions. |

Before changing grouping, record rendered examples with and without a representative version on both page types, identify which producer supplied `@dig`, and record actual `dig_objs` key sets. `process_digital` handles a Digital Object's own record; `process_digital_instance` handles linked instances on an Archival Object; both use `process_file_versions`, which collapses File Versions to display fields (`out`, `thumb`, `represent`, `caption`). The callers add material/caption data as applicable. Entries do not expose `uri`, `ref` or all alternatives. Do not invent those keys in the ERB, assume the partial is Archival-Object-only, or assume a populated `@dig` list was rendered when the representative branch took precedence.

Use a per-render group marker on each existing filtered entry, such as a unique `data-dv-source-group`, to isolate that entry's anchors. This marker identifies a rendered block, not a persistent ASpace object ID. Preserve separate blocks even if their source URLs/captions match. Digital Object record-level grouping may join its own record-innards alternatives. Do not infer a cross-entry PDF companion on an Archival Object; a richer per-object mapping would require a separately reviewed server-data change. No mixed-companion fixture is required by the confirmed pilot scope. A two-object archival fixture, linking a separate image Digital Object and PDF Digital Object, proves the PDF is never attached to the image viewer.

Required behavior:

- Render usable original links and representative content in server HTML. JavaScript, OpenSeadragon and external loading must not be prerequisites for following an existing published link.
- Preserve upstream caption/thumbnail behavior, representative `derived_from`/`link_uri`, thumbnail-only cases and collection links to digitized material. Preserve ASpace publication/suppression rules; do not fetch hidden file versions to populate a viewer.
- Prefer leaving a compact original-source link visible after enhancement. If hiding redundant stock presentation after success, hide only the successfully represented block and restore it on failure. Never hide all digital links at startup.
- Associate alternatives/companions only where the source contract establishes the same Digital Object, using the rules above. Two entries under `#notes_row` must not compete for one viewer or acquire each other's downloads. Keep the smaller digital partial pinned to upstream 4.2.0 with a recorded diff; removing the full object-page override does not eliminate this partial's compatibility obligation.
- Deduplicate repeated source renderings within their object while retaining independent objects. Reinitialization must not duplicate viewers or handlers; implement and test the group-owned mount behavior in LYR-R04, not merely duplicate-anchor detection within one scan.
- Preserve destinations with framework escaping and safe URL handling. Do not construct new master/original downloads from service identifiers.

Acceptance and edge cases:

- [ ] Unsupported URL, JavaScript disabled, missing OSD, unavailable config and all-source failure each retain a usable original link.
- [ ] Representative thumbnail only, thumbnail plus link, external link, missing caption and empty digital list render sensibly.
- [ ] Own-record and linked-instance producers, record-innards links, and both digital-partial branches are tested. A fixture with a representative version and zero external-link-class anchors still detects its renderable representative anchor; a thumbnail-only representative remains visible, and figcaption browse links are excluded.
- [ ] Two archival entries remain separately accessible; a separately linked PDF gets its own viewer/direct link and never becomes the image object's download. Existing companion-policy unit tests remain regression coverage, not a mandatory mixed-media pilot fixture.
- [ ] Repeated anchors do not duplicate mounts or remove another object's access links.
- [ ] Unpublished file versions are not introduced; plugin download controls do not substitute for server authorization.
- [ ] Tests assert visible links during initial loading, success and terminal failure.

### LYR-04 — Complete image loading and fallback lifecycle

Owner: implementation agent. Files: viewer JavaScript and test harness.

Required behavior:

1. Construct OpenSeadragon **without `tileSources`**, attach both initial `open` and `open-failed` handlers, then call `viewer.open(...)` with the single source or ordered sequence. Preserve `sequenceMode`, page controls and initial-page behavior. Replace `mountCantaloupe`'s `HEAD` probe with this same path; remove the extra probe rather than replacing it with another metadata fetch. Test that direct Cantaloupe mounting issues no plugin `HEAD` request.
2. Manifest HTTP success is not source-open success. The initial attempt succeeds on OSD `open`; initial `open-failed`, HTTP/network/CORS failure, malformed JSON, unsupported/empty manifest and synchronous exceptions move to the next eligible candidate for that object. If none remains, handle the definite failure with a concise message and source links. Wrap the invocation itself in a handled promise/exception boundary as specified in LYR-R05, so constructor or adapter exceptions cannot escape before `.catch()` is attached.
3. Static images wait for `load`/`error`, including cached `complete`/`naturalWidth` state. Assigning `src` is not success.
4. Use a documented loading threshold, default 30 seconds, configurable for measured slow sources. It starts before any manifest/proxy fetch and covers response-body reading through initial source open, with one deadline rather than a fresh budget at each phase (LYR-R01). If a still-pending attempt reaches it **and another candidate exists**, dispose of that attempt and advance once. If it is the **last candidate**, show a non-blocking `Still loading` note and keep its viewer/request/listeners alive. Do not reject, abort, destroy or start a new attempt solely because that threshold elapsed. Its eventual success clears the note; a definite error enters terminal failure. An indefinitely stalled last attempt remains visibly labelled and retains usable source links, with no repeated timers or retries; navigation/explicit teardown still disposes it.
5. OSD `open` is earlier than first-tile drawing. Track initial image loading separately if needed, using the vendored viewer's renderer-independent `tile-ready` event; `tile-drawn` is not supported by the default WebGL renderer. A slow first tile may show the same loading note but must not tear down an already-open viewer. Do not attempt to reject an already-resolved open promise; later tile failures follow rule 8.
6. Own each mount at the source-group level and dispose of definitely failed or superseded attempts: handlers, thumbnail observers/queue, both initial and first-tile timers, and owned requests (LYR-R04). Ignore late continuations/events only from disposed/superseded attempts, not from the final candidate retained under rule 4. Settle each result once and try each candidate at most once per initialization. Reinitializing unchanged DOM must reuse its active mount rather than append another one; intentional replacement must not trigger error diagnostics or stale fallback.
7. On terminal failure, show a concise message and original source links; keep metadata/navigation usable. Both logs and on-page diagnostic text use an allowlisted stage/reason/status code. Never interpolate raw `err.message`, response/resolved URLs, exception objects, credentials, tokens or query strings. Original source anchors remain intentional destinations with readable labels; this restriction concerns diagnostic text/logs, not removing those links.
8. Handle later metadata/source-open failures through `open-failed` and tile failures through `tile-load-failed`, separately from the settled initial promise (LYR-R03). After initial multipage success, preserve object identity, page order/count, working-page navigation and source access; indicate the unavailable page. Reset old-page messages on navigation and clear the appropriate failure after recovery. Do not skip canvases, download the previous page under a failed page's label or substitute another object. A later failure must not start whole-object fallback. Add viewer/page-generation guards so an abandoned viewer/page cannot corrupt the active page's state or clear its genuine error.
9. Always retain direct PDF access. Cross-origin iframe `load` does not prove PDF rendering, and embedding errors cannot always be inspected. Do not add a misleading PDF-success test or a new PDF rendering library.

Acceptance and edge cases:

- [ ] Valid manifest with failing first image service falls back to a working secondary source.
- [ ] Static-image error, JSON parse error, 404/403/500, empty manifest and thrown exceptions follow definite-failure handling. Timeout with another candidate advances exactly once.
- [ ] A single/final candidate exceeding the threshold is kept alive with `Still loading`; later open/first-tile success clears the note. A definite later error becomes terminal. The single-candidate pilot cannot be destroyed solely for slow initial metadata or tiles.
- [ ] Double errors, late success from a superseded attempt, rapid page changes, reinitialization and replacement cannot mount stale content or duplicate attempts. Late success from the retained final attempt is accepted.
- [ ] Definitely failed/superseded viewers are destroyed; retained slow final viewers are not. Abandoned thumbnail work stops and existing serial loading remains intact.
- [ ] Missing/invalid later canvases and simulated `open-failed`/`tile-load-failed` events preserve accurate page/download state and usable navigation/source links; stale events from disposed viewers/old pages cannot change the active state, and navigating to a working page leaves no old-page error.
- [ ] Single-image and multipage object/page modes survive fallback transitions; PDF-only records retain direct access. Preserve existing companion-policy regression tests without adding mixed-media pilot acceptance.
- [ ] No unhandled promise rejection; tests drive transitions rather than only asserting a handler exists.
- [ ] Tests prove handlers are attached before `open`, no extra `HEAD` probe is made, and a raw error containing a resolved URL/query is absent from both page text and captured logs.

This task fixes image/error lifecycle behavior. It does not require deploying Preservica or redesigning audio/video playback. Preserve existing adapters and usable unavailable-service behavior.

### LYR-05 — Prepare configuration and assets for hosted installation

Owner: implementation agent; Lyrasis confirms the deployed mechanism.

Configuration contract:

| Setting | Required behavior | Proposed staging value |
| --- | --- | --- |
| `CANTALOUPE_PUBLIC_URL` | Optional for complete manifest service URLs; required for legacy key construction. Empty string avoids the historical nil `.replace()` concern but does not currently prevent malformed legacy-manifest URLs; LYR-R02 closes that separate defect. Normalize/validate before either construction path. | `https://digital.smith.edu/iiif/2` |
| `COMPASS_BASE_URL` | Parse the configured base URL and derive `compassHost` from its hostname; no separate host variable. Empty/invalid base disables host matching. | Set only for approved transitional paths |
| `COMPASS_PROXY_URL` | No implicit localhost. Empty means no proxy, not guaranteed legacy Compass viewing. | Empty for converted-manifest pilot |
| `PRESERVICA_API_BASE` | No implicit localhost. Empty means backend viewing unavailable, with original link retained. | Empty for converted-manifest pilot |
| Loading threshold | Positive finite duration, default 30 seconds; obey the final-candidate/slow-tile exception in LYR-04 and document the configuration key. | Default unless measurements justify another value |

Implementation:

- Retain the environment-variable interface with safe absent/empty behavior. If Lyrasis requires AppConfig, implement a documented mapping using supported 4.2.0 registration and test actual startup. Do not claim that mapping exists until implemented.
- If both mechanisms exist: a present environment key, including explicit empty, overrides AppConfig; otherwise use AppConfig; otherwise the safe documented default. An empty value must not fall back to localhost or another service.
- Enforce missing/invalid Cantaloupe behavior in both direct detection and manifest service-ID rewriting (LYR-R02). Complete absolute services remain usable; disabled key construction must never fabricate a PUI-origin request or silently remove canvases.
- Preserve local development through explicit parent Docker configuration, separately from shipped plugin defaults.
- Ask Lyrasis for the actual CSP and inline-script mechanism before changing configuration injection. Stock 4.2.0 object pages already include inline note initialization, and record innards include inline accordion initialization. A policy rejecting all inline execution without an allowance would also affect stock functionality. Retain safely escaped current injection if compatible; adopt nonce/hash support or data-only injection only if the confirmed host policy requires it. Do not redesign injection solely for a hypothetical restriction or request blanket CSP relaxation.
- Derive the JavaScript `compassHost` field from the parsed `COMPASS_BASE_URL`. Do not add a separate environment variable. Validate the scheme/hostname and explicitly handle blank/invalid input; an empty string must never become a match-all host.
- Preserve any needed `window.DigitalViewer` interface deliberately. Initialize config once before mounting. Test quotes, backslashes, ampersands and script-closing text against malformed data/markup injection.
- Use ASpace 4.2.0 PUI prefix-aware asset helpers. Verify root and non-root PUI paths, e.g. an isolated local `/public/` fixture. The supplied `/staff/` URL is not the PUI asset prefix.
- Confirm the active `public/` injection path. Remove demonstrably unused `frontend/` copies or delegate to one authoritative implementation. Check Staff UI behavior. Keep vendored OSD and its notices.
- Implement the deterministic JS/CSS/OSD content version in LYR-R06. The reviewed candidate's maximum asset mtime is insufficient. Verify CSS-only changes with preserved timestamps, unchanged bytes with changed timestamps, and A→B→A rollback against actual served bytes.

Acceptance and edge cases:

- [ ] Missing/empty/whitespace/invalid settings have defined usable behavior without accidental localhost or PUI-origin requests. The env-only template supplies strings and `''.replace()` is safe; the nil `.replace()` case is defensive type coverage, while the empty-base legacy-manifest URL defect in LYR-R02 is reproduced and must be fixed.
- [ ] Empty Compass host does not match every URL; lookalike hosts such as `compass.fivecolleges.edu.example.org` do not enter the Compass adapter. Test parsed host equality, trailing slashes and malformed endpoint values.
- [ ] Complete manifest service URLs work without unrelated backend settings; unavailable adapters preserve access links.
- [ ] Config is safely escaped, parsed once and compatible with the agreed mechanism/CSP.
- [ ] Assets work under both tested path shapes, load each library once and leave Staff UI usable.
- [ ] One authoritative asset set exists; standalone and Docker copies match.
- [ ] CSS-only update, normal update and rollback invalidate caches correctly.
- [ ] README documents exact tested configuration, precedence, empty values, directory name `digital_viewer` and ASpace version.

Keep detector ordering and source conventions intact. If a source classification change is necessary, locate the parent's `ArchivesSpaceService::extractDigitalObjects()` and keep both detectors consistent under AGENTS.md. Configuration cleanup alone does not justify adding a source type.

### LYR-06 — Run release regression checks locally

Owner: implementation agent; Claude reviews evidence; Special Collections reviews download behavior.

Run section 4's matrix. Baseline commands from the standalone root:

```sh
set -euo pipefail
node --test test/*.mjs
node --check public/assets/digital_viewer.js
ruby -c plugin_init.rb
ruby -c public/plugin_init.rb
erb -x -T - public/views/layout_head.html.erb | ruby -c
erb -x -T - public/views/shared/_digital.html.erb | ruby -c
```

Run the same `ruby -c` check for each new/changed `.rb` file and `erb -x -T - <file> | ruby -c` for each retained new/changed ERB. `-x` emits Ruby without executing Rails helpers; do not run plain `erb` and mistake a downstream `Syntax OK` on empty input for a valid template. The four baseline Ruby/ERB checks above passed during the implementation review. They are parser checks, not Rails rendering or JRuby compatibility evidence.

LYR-R06 adds a required behavioral check: `ruby test/asset_version_test.rb`. Record it separately from `ruby -c` and from real Rails rendering. Its absence is an open correction, not a skipped passing test. Persist the LYR-R01–R05 lifecycle/config regression tests in the Node suite and map their names to correction IDs; do not cite the review's temporary probes as committed tests or retain 39 as an acceptance target.

Then perform these named integration checks from the parent repository using the installed 4.2.0 image:

```sh
docker image inspect archivesspace/archivesspace:4.2.0 --format '{{.Id}}'
docker compose up -d mariadb aspace-solr archivesspace
docker compose ps archivesspace
```

If ASpace was already running before the candidate template/config changes, restart that local service with `docker compose restart archivesspace`. Wait for its normal healthy state using short status checks and inspect relevant startup errors without exposing secrets. Do not upgrade the image or recreate/delete database volumes. Start other existing local content services only when a selected fixture needs them.

The prior render session used temporary PUI/API ports `18081`/`18089` because an unrelated listener occupied `8081`. Inspect the current state rather than assuming either mapping remains active. If needed, use a documented local Compose port override that preserves the same image/volumes; do not stop the unrelated application. Record the effective ports, mount/config, startup result and final service state, and substitute those ports in all fixture/API/render commands.

**Actual Rails render check:** fetch all four Digital Object pages and each mapped/created Archival Object page from LYR-01. Example for a known local fixture:

```sh
curl --fail --silent --show-error --output /dev/null \
  --write-out 'Digital Object 869 HTTP %{http_code}\n' \
  http://localhost:8081/repositories/2/digital_objects/869
```

Require HTTP 200 plus inspection of the rendered HTML for stock `.resizable-content-pane`, original source anchors, the intended effective config and asset references; 200 alone is insufficient. Check startup/request logs for template/helper/AppConfig errors. Exercise actual browser behaviors in M01–M18, especially the previously missing Archival Object fixtures. These are named startup, Rails-render and browser checks; Node DOM tests cannot replace them.

Use identical candidate runtime bytes in Docker and the standalone checkout. Compare served JS/CSS to the candidate. Use the existing 4.2.0 stack; preserve volumes and unrelated work.

Acceptance:

- [ ] Node, asset-version behavioral tests, JavaScript syntax, Ruby syntax, ERB compilation, actual 4.2.0 startup, Rails render and browser checks are each recorded separately; LYR-R01–R06 have persistent regression tests and before/after evidence.
- [ ] Browser observations include versions, candidate commit and screenshots or console/network evidence.
- [ ] Primary journey works in Chrome, Firefox and Safari; keyboard/narrow-layout checks cover changed pages/controls. Use actual Safari for Safari sign-off.
- [ ] Fresh navigation and cached repeats cover first image, middle/last page and page-mode download; record timings. Call a run cold only when cache state is known. Do not clear a shared image cache to manufacture a benchmark.
- [ ] No unexplained console errors, accidental local-service requests, metadata loss, inaccessible original links or unexpected request fan-out.
- [ ] Missing checks say NOT RUN. Explicit playback exclusions do not excuse lost original links.

### LYR-07 — Resolve host requirements and public-content boundary

Owners: Rob coordinates and approves all decisions; Lyrasis supplies hosted-ASpace facts/operations, ITS supplies service evidence, and Special Collections supplies content review.

Start early; pending answers must not stop independent local corrections.

- Confirm staging PUI hostname/path, ASpace version, access restrictions and shared-test usage. Supplied staff URL: `https://archivesspace-test.smith.edu/staff/`; do not infer the PUI from it.
- Confirm config mechanism, existing plugins/template overrides and ordering, package delivery method, lead time and restart window. Identify conflicts involving the same page/partial.
- Assign plugin disable/restore authority, expected rollback response time and custom-plugin upgrade testing. Core release testing does not approve this custom plugin.
- Enumerate actual origins and redirects from selected manifests: libtools2, `digital.smith.edu`, S3 thumbnails and any PDF host. Lyrasis owns PUI CSP; Smith/ITS/storage owners provide content-service CORS. These are separate checks.
- Plan browser checks for JSON, `info.json`, tiles/images, thumbnails, HTTPS, `%2F`, redirects and off-campus access. Check PDF frame restrictions while retaining direct access.
- **Concrete Cantaloupe CORS check:** the plugin sets OSD `crossOriginPolicy: 'Anonymous'`. Make a GET to an approved pilot `info.json` and a small actual image tile with an `Origin` header matching the confirmed staging PUI origin. Record request origin, timestamp, final URL/redirect status in private deployment evidence as appropriate, HTTP status, and the actual `Access-Control-Allow-Origin` and `Vary` header values for both responses. The follow-up localhost-origin observation reported on 15 September was HTTP 200 with `Access-Control-Allow-Origin: *` and `Vary: Origin` for both requests. Repeat against the actual staging origin at deployment; that earlier observation does not close this hosted check.
- For anonymous cross-origin image use, allow-origin may be `*` or must equal that request's complete PUI origin (scheme, host and non-default port, without a path/trailing slash). A non-wildcard value is one origin, not a comma-separated list. If the server varies it by approved request origin, verify `Vary: Origin` and a second origin so caches cannot supply a mismatched header. Test real browser tile rendering as well as the header; do not switch OSD to credentialed requests to work around a mismatch.
- Confirm authentication expectations for the PUI and content hosts. Keep AWS, ASpace and Preservica credentials out of the plugin.
- Obtain Special Collections' fixture review and ITS evidence that the public Cantaloupe path cannot expose restricted masters or cached derivatives, then record Rob's content-scope decision. Broad S3 read permission is an existing concern; selecting public fixture records alone does not prove a safe service boundary.
- ITS can demonstrate working restrictions or isolate serving to approved public content, including cache behavior. Use approved identifiers for restriction tests; keep restricted keys/URLs out of public Git. Do not broaden IAM or change a public server as ordinary plugin implementation.
- If restrictions remain unresolved, package/code review can proceed, but Gate A for this public-service pilot remains open. Record exact missing evidence/owner; do not make the plugin implementation depend on building the entire restricted-content platform.

Acceptance:

- [ ] Host answers, PUI/config/prefix, existing-plugin compatibility and operational owners are recorded.
- [ ] Agreement finalizes LYR-05 and the packet without invented support or SLA.
- [ ] Public pilot scope and restricted-content boundary have Rob's decision/date and linked Special Collections/ITS evidence.
- [ ] Actual metadata/tile allow-origin values are recorded and match the confirmed PUI origin or `*`; no timeout or absent response is counted as a CORS pass.
- [ ] Browser/CSP/CORS checks and acceptable pilot response times are agreed; actual hosted observations follow in LYR-09.

### LYR-08 — Package the candidate and obtain Gate A review

Owner: implementation agent prepares; Claude reviews; Rob approves handoff.

Deliver one standalone packet containing:

1. Repository URL, immutable full commit, ASpace version, release identifier and exact archive SHA-256. Archive expands into `digital_viewer` or explicitly documents renaming.
2. Instructions to append to the existing plugin list, preserve other plugins, apply agreed config and restart under Lyrasis's procedure. Include overlapping-template and actual PUI-prefix considerations.
3. Tested configuration examples with approved public endpoints and explicit empty unused services. No secrets, database snapshots, parent application, `.git` or unnecessary exports in the archive.
4. Fixture ledger, local evidence, supported/excluded features, expected downloads and concise hosted checklist.
5. Separate rollback for plugin/config and record File Versions. Preserve prior files/config. Restore recorded record fields using the current record/lock version so unrelated edits survive; verify indexing/PUI afterward.
6. Owners/contact routes for plugin coordination, content acceptance, content services and ASpace restart/rollback. Keep private contact details in the appropriate channel.
7. Dependency/version and license/notice inventory. Preserve OSD notices; resolve distribution questions with the owner rather than inventing a license.

Acceptance:

- [ ] Tests pass from an extracted archive independent of parent/Mac-specific paths.
- [ ] Archive runtime files match reviewed commit and locally served candidate; final checksum is recorded.
- [ ] Local rollback rehearsal restores previous plugin/config/page behavior, including asset caches; record rollback uses a local fixture/snapshot.
- [ ] README/evidence links work without the parent repository; repair broken historical relative links in the packet.
- [ ] Claude reports which claims/findings are verified or unresolved, with evidence; Rob accepts their disposition and records Gate A approval for the exact artifact/scope.
- [ ] No hosted acceptance or whole-WBL completion is implied. Later code/config changes receive targeted revalidation and updated identity/evidence.

### LYR-09 — Install and accept the Lyrasis staging pilot

Owners: Lyrasis installs and confirms operations; Rob verifies and approves; Special Collections supplies acceptance-test observations; ITS supplies content-service evidence.

Procedure:

1. Record prior plugin/config, window, candidate checksum and staging record snapshots. Confirm staging IDs.
2. Lyrasis installs the Gate A package/config. Verify startup, PUI/Staff availability, effective public config and served asset identity.
3. Add approved manifest File Versions under the agreed staging record workflow. Preserve existing published file links and rollback values; verify publication/indexing on Digital Object and linked Archival Object pages.
4. Run hosted matrix rows, including ordinary pages, failures, keyboard controls, downloads, browser security and off-campus access. Inject failures with test fixtures or targeted browser blocking; do not take shared content services offline.
5. Rehearse plugin/config rollback and agreed test-record restoration. Verify normal PUI and restored assets. If the agreed final state is an active demo, reinstall the approved candidate and verify again.
6. Record observations, remaining issues, final installed commit/config and gate decision. Schedule the demo after acceptance.

Acceptance:

- [ ] Installed commit/assets/config match the package.
- [ ] Required hosted matrix passes; missing evidence is not acceptance.
- [ ] Special Collections supplies presentation/download observations and Lyrasis confirms rollback; Rob records the final technical/content/launch sign-off.
- [ ] Final state is explicit: candidate active for demo, or prior state restored with a named blocker.
- [ ] Gate B applies to this staging scope; production remains separate.

## 4. Required regression and acceptance matrix

Each row records fixture, expected/observed result, commit/config, environment, browser/version, date, tester and evidence. Hosted means Lyrasis after installation. Exhaustive failures use deterministic local fixtures; hosted failures use browser blocking or agreed test URLs.

| ID | Scenario and expected behavior | Required evidence |
| --- | --- | --- |
| M01 | Single image: correct image, zoom/pan/toolbar; immediate download targets intended JPG | Node policy tests; local + hosted browser |
| M02 | 77 views: correct count/order, first/middle/last navigation, serial visible thumbnails | Queue tests; local + hosted browser/network |
| M03 | Object mode hides plugin page-image download; Open page enables current page; Back to object hides it | Node policy tests; local + hosted image-sequence fixture |
| M04 | Ordinary Archival Object, Digital Object with children, long notes, left/right sidebar, no content | Local both sidebar configs; hosted actual config; keyboard/ARIA/layout |
| M05 | Own-record vs linked-instance producers; representative branch replaces entry list; direct representative anchor is detected even with zero external-link-class anchors; thumbnail-only and collection browse access remain correct | Template/scan tests for both branches/page types; local browser and hosted representative examples |
| M06 | JS disabled, OSD blocked or config absent leaves published links usable | Local + hosted browser |
| M07 | Digital Object alternatives stay together; two archival entries stay separate, including a separate PDF object; duplicate anchors within one object | Actual selector/key-contract fixtures, Node/markup/local browser; hosted multi-object fixture |
| M08 | Manifest 404/403/500, CORS/network rejection, malformed JSON, empty/unsupported manifest; synchronous constructor/adapter/open exceptions enter fallback without stopping other groups | LYR-R01/R05 persistent tests through real mount/init paths; local fixtures; one hosted blocked-request case |
| M09 | Manifest succeeds but initial OSD source fails; next source works; terminal failure preserves links/message | Event-level Node/local browser; hosted controlled primary failure |
| M10 | Static-image error/cache completion; deferred fetch/body/open share one initial threshold; an alternative advances once, the final candidate stays alive with one loading note, and an opened viewer survives slow first tiles | LYR-R01/R04 controlled-clock tests including late final success/error, deadline races and stale callbacks; local slow/broken-image browser cases |
| M11 | Later `open-failed` and `tile-load-failed` produce page-scoped status; successful navigation/recovery clears stale errors; malformed/unavailable canvases retain count/order and correct downloads | LYR-R02/R03 event tests including rapid A→B→A and mixed sequences; local fixtures/browser; hosted if safely reproducible |
| M12 | Double initialization creates one mount per group; replacement/disposal clears both timers and owned requests/observers/queues without stale UI or fallback; stock layout survives | LYR-R04 lifecycle tests for leaf/inline layouts and distinct groups sharing URLs; local browser |
| M13 | PDF-only: one-page and multipage examples; blocked/unsupported embed retains direct access; no mixed-media requirement | Policy tests; local + hosted browser |
| M14 | Unconfigured Compass/Preservica retains original links; direct-file and legacy-manifest paths generate no accidental localhost/PUI-origin requests; complete absolute services remain usable | LYR-R02 helper plus extraction/mount request assertions; config/local browser; hosted existing record where available |
| M15 | Empty-env string vs future AppConfig nil, precedence, base-derived Compass hostname, unsafe data, root/non-root PUI; content digest changes for each asset independently with fixed mtimes and restores A on rollback | LYR-R02/R06 Node and actual Ruby logic tests, including `ruby test/asset_version_test.rb`; real-ASpace render and cache-retained A→B→A browser checks; hosted actual config/prefix/CSP |
| M16 | Manifest/info/tile/thumbnail/PDF origins work with HTTPS/CSP/CORS and encoded IDs; actual allow-origin values satisfy anonymous OSD requests | Local GET/header probes; hosted browser/network and off-campus |
| M17 | Restricted original/info/tile and cached derivatives respect the approved public boundary | ITS negative-access evidence; identifiers recorded privately |
| M18 | Staff/unrelated PUI coexist with other plugins; rollback restores files/config/record links | Local + hosted smoke/rollback |

Additional policy checks:

- Retain download URL sanitization; no `javascript:`/unsafe URL injection. Render labels as text. On-page diagnostic messages and logs must also omit raw URLs/query strings/error objects, even when text-escaped.
- A thumbnail failure must not invalidate a working viewer or permanently stall the queue. Test both error and stalled thumbnail completion, with bounded recovery.
- Preserve service URLs and encoded identifiers; avoid double-decoding `%2F` or rewriting unrelated hosts.
- Out-of-scope adapter tests establish graceful behavior, not a claim that absent companion services work.

## 5. Evidence and sign-off forms

Use this record in `docs/staging-release-evidence.md`:

For this correction pass, record LYR-R01–R06 individually under their parent LYR tasks. Include regression test names, the failing reviewed-candidate behavior, passing fixed behavior and exact candidate/test commit. Distinguish reproduced behavior from source-inspection findings and implementer-reported observations. Preserve dated historical results; update the current summary/remaining-actions to identify which startup/render work has actually been repeated and which browser/host checks remain NOT RUN. Adding this guide or passing its documentation checks is not evidence that any implementation defect is fixed.

```text
Task / matrix ID:
Correction ID / regression test names (if applicable):
Status: NOT STARTED | IN PROGRESS | PASS | FAIL | NOT RUN | OUT OF STAGING SCOPE
Standalone commit:
Parent mirror commit (if applicable):
Before-fix commit / reproduction / observed failure:
Archive / SHA-256 (release checks):
Environment / ASpace / browser / OS:
Fixture and approved scope:
Commands or interaction steps:
Expected result:
Observed result:
Evidence artifact:
Remaining issue / owner:
Implementer / date:
Claude reviewer / date / claims verified or gaps found / evidence:
Rob approver / date / decision / accepted scope:
```

| Decision | Reviewer / evidence providers | Approver | Required basis | Status |
| --- | --- | --- | --- | --- |
| Specification/layout ready for implementation | Claude validates the plan | Rob | Dependencies, chosen JS/CSS layout, failure semantics and edge cases | OPEN |
| Code accepted | Claude validates implementation claims | Rob | Diff, tests, stock-page/partial comparison and local browser evidence | OPEN |
| Host/config agreement | Lyrasis provides facts; Claude checks supporting evidence | Rob | Exact PUI/config/prefix/CSP/install/rollback answers | OPEN |
| Public-content boundary | Special Collections and ITS provide content/service evidence | Rob | Reviewed fixtures and restricted-access/cache evidence | OPEN |
| Gate A: send installation package | Claude reports verified claims and remaining gaps | Rob | LYR-01–08 evidence and pinned artifact | OPEN |
| Gate B: staging demo accepted | Special Collections reports observations; Lyrasis confirms rollback; Claude validates claims | Rob | Hosted evidence and final installed state | OPEN |

Exclusions apply only to features outside the defined staging scope. Lost original links, ordinary-page regressions, broken supported image paths, and unresolved exposure of restricted content block this pilot. Record proposed scope changes for Rob's decision; do not relabel a required failed test as an exclusion.

## 6. Handoff prompts

### Claude: specification review

Validate this v4 correction handoff against reviewed candidate `af7b2834b97f5af6eb4e12a24756feeb86c3afab` and ASpace 4.2.0; `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227` is the historical pre-implementation baseline. Check LYR-R01–R06 for concrete, bounded fixes and sufficient negative/race tests. Prioritize candidate-wide deadlines with final-candidate retention, group/page ownership, disabled legacy rewriting without canvas loss, and content-based asset versions. Preserve the stock-page layout approach and all original fixture/browser/host acceptance requirements. Return CLAIMS VERIFIED or GAPS FOUND with correction/task IDs, evidence and concrete changes. You are the reviewer of record; Rob signs off on decisions and gates.

### luna-high: resume implementation with corrections

Read Rob's approved revision of this guide, applicable AGENTS.md, `docs/staging-release-evidence.md` and `docs/fixture-ledger.md`. Resume standalone branch `codex/lyr-05-config-assets` after checking its current HEAD against reviewed candidate `af7b2834b97f5af6eb4e12a24756feeb86c3afab`; preserve intervening changes and never reset to the old baseline. Implement LYR-R04, R05, R01, R03, R02 and R06 in that order, with a failing persistent test first, a fix, passing targeted/full tests and commit/evidence at each boundary. Keep the removed object override absent, original links visible and single/final slow candidates alive. Mirror runtime/tests to the parent Docker mount and verify byte identity; if its Git index remains read-only, record uncommitted mirror hashes without changing permissions or claiming a commit.

After the corrections, consult the updated fixture ledger and fill any remaining approved local fixture gaps and finish the remaining LYR-02/03/06 actual-ASpace and local browser checks. Use safe alternate local ports if needed; preserve volumes and unrelated listeners. Prepare LYR-08 only to the extent its dependencies are satisfied; route LYR-07 facts/decisions through Rob. Do not claim completion from 39 unit tests or four HTTP-200 pages. This guide does not authorize publication, hosted record edits, remote restarts or changes to the public-content boundary. Return exact candidate commit, each correction's test/evidence result, mirror identity, completed/open LYR tasks, browser/packet status and remaining owner actions. Rob remains the sole approver.

### Claude: implementation review

Compare the new candidate with reviewed checkpoint `af7b2834b97f5af6eb4e12a24756feeb86c3afab` and Rob's approved guide. Validate every LYR-R01–R06 reproduction and persistent regression test, including never-settling response bodies, preserved final attempts, stale page/viewer callbacks, double initialization, synchronous exceptions and fixed-mtime cache invalidation. Check both page types' grouping/publication behavior, retained partial/config against 4.2.0, local real-browser observations and packaged/runtime identity. Distinguish independently verified results from implementer claims, and do not close original fixture, host/content or rollback gaps merely because the six corrections pass. Return CLAIMS VERIFIED or GAPS FOUND with correction/task IDs, exact evidence and limitations. You do not approve code or release; Rob decides every sign-off, including Gates A and B.
