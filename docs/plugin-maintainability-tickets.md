# digital_viewer maintainability and fallback tickets

Created: 2026-09-17. Product: ArchivesSpace PUI plugin only.
Status: DV-M01–DV-M05 complete locally (2026-09-18); DV-M06–DV-M08 OPEN.

This queue follows the [maintenance guide](plugin-maintenance-guide.md). It maps the large viewer script into smaller responsibilities and addresses access when enhancement cannot run. Creating these tickets does not complete implementation or change the [staging checkpoint](staging-signoff-2026-09-16.md). Existing release checks and evidence remain authoritative; reuse them rather than restarting accepted work.

## Current behavior and gaps

Source inspection of `public/views/shared/_digital.html.erb` shows server-rendered links and thumbnails. `public/views/layout_head.html.erb` supplies configuration and loads OpenSeadragon, the viewer script and CSS. Browser JavaScript supplies the interactive viewer; splitting its source does not remove that dependency.

| Failure | Current behavior / limit |
| --- | --- |
| JavaScript disabled or viewer script blocked before execution | Ruby-rendered links and thumbnails remain; no interactive viewer. There is no plugin-specific `noscript` explanation in the current templates. |
| OpenSeadragon blocked | `init()` logs a console warning and returns before creating any viewer, including the PDF path. Original links remain; no user-facing startup explanation is created. |
| Manifest or content request blocked after startup | Mount failures can try a ranked alternative and report a terminal error. Some slow final attempts remain alive with a loading note by design. Original links remain. A blocker can also block the destination of those links. |
| Only published link is a manifest | A preserved link opens machine-readable JSON. It does not provide equivalent access to the images or a sequence without JavaScript. |
| ArchivesSpace changes its markup | Selectors may find no sources; initialization can return with no viewer and no visible explanation. |

These are code findings, not fresh browser results. The [existing release evidence](staging-release-evidence.md) records local no-JavaScript PDF-link checks. Existing matrix M06 covers disabled JS, blocked OSD and absent configuration; it does not establish readable fallback access for every manifest-only record or every blocker. Do not describe the whole ArchivesSpace interface as usable without JS solely from these plugin checks.

## Work order and shared requirements

Start DV-M01, then DV-M02 and DV-M03. Continue DV-M04 → DV-M05 → DV-M06 → DV-M07 → DV-M08. DV-M02 is independent of the module build and can be prioritized before any extraction. Keep each ticket a separate reviewable commit. All dependencies mean completed, evidenced work, not merely a ticket being created.

The completion ledger for DV tickets is `docs/workbench-lite/finished.md` in the **parent `preservica` repository**, not in this standalone plugin repository. Record the DV ticket ID, tests/evidence, exact standalone implementation commit and any parent mirror commit (or explicitly uncommitted mirror state) there. This checkout lives at `preservica/exports/archivespace-plugin-repository`; a plugin-only checkout needs the parent repository to update that ledger. Keep acceptance checkboxes and evidence references in this standalone ticket document synchronized with the parent entry; do not mark a ticket complete until its ledger entry exists. The standalone `docs/workbench-lite/` directory is not a completion ledger.

Existing WBL-0901 owns authoritative packaging/duplicate copies; WBL-0902 owns environment configuration; WBL-0903 owns diagnostics; WBL-0904 and LYR matrix rows own release verification; WBL-0905 owns legacy Compass retirement. These tickets add bounded implementation work beneath those concerns, without duplicating their completion claims. No new source types or source-priority changes are part of the refactor.

Use exported module APIs and explicit dependencies rather than new shared browser globals. Preserve record grouping, original links, URL handling, download policy, final-attempt timeout behavior, per-viewer request ownership and stale-callback guards. Keep the PHP prototype separate. A future source-type change must also consider the backend detector under repository rules.

## DV-M01 — Record module boundaries and the build decision

Status: COMPLETE (2026-09-18). Dependencies: none. Related: WBL-0901/0902.

Deliverable: [module boundaries and build decision](plugin-module-design.md). Maps all 93 top-level functions, mutable state and ownership; defines module contracts, success/fallback flows, a classic esbuild bundle with source maps, packaging/transition requirements and the regression baseline. Fresh checks: 70 Node tests and Ruby asset-version checks pass. Completion evidence is in parent `preservica/docs/workbench-lite/finished.md` under DV-M01. This completes the design ticket only; build/extraction and browser compatibility remain future work.

Problem: roughly 2,700 lines share closure state, making call flow and ownership difficult to trace.

Scope: inventory functions and mutable state in the current script; document a proposed dependency graph and choose native modules versus a bundled output. Bundled source with source maps is the initial recommendation, not an already selected toolchain. The current `public/assets/digital_viewer.js` remains authoritative until the build transition is implemented.

The maintenance guide's current “no JavaScript build step” description and the parent repository's `CLAUDE.md` test instructions describe today's implementation. DV-M01 must identify their required revisions; DV-M04 must update build/test instructions when the transition lands, with DV-M08 completing the architecture guide. Update the equivalent parent `AGENTS.md` instructions at the same boundary.

Acceptance:

- [x] Map existing functions to proposed modules: config, page sources, source selection, adapters, viewer, controls, thumbnails, layout, lifecycle and startup.
- [x] Define source descriptor, source group, adapter result, and mount-attempt contracts, including cancellation, cleanup and error ownership.
- [x] Record the build choice and rationale against ArchivesSpace asset URLs, PUI prefixes, CSP, cache versions, standalone packaging and local Docker mirrors.
- [x] Specify generated-file policy, source-map delivery, supported syntax, dependency locking and development/release commands. No build tooling is required on the ArchivesSpace host.
- [x] Diagram one manifest success and one fallback, and record current regression commands/fixtures as the baseline.

## DV-M02 — Provide understandable access when the viewer cannot run

Status: COMPLETE (2026-09-18). Dependencies: none. Related: WBL-0904; M06/M08/M13/M14.

Completion evidence: [fallback access report](fallback-access-2026-09-18.md) and [recorded results](evidence/dv-m02-2026-09-18.json). Rob approved the enable-JavaScript message; 42 deterministic browser cases, 27 real-ASpace cases, four exclusion checks, 11 Ruby tests and 70 Node tests pass. Parent `preservica/docs/workbench-lite/finished.md` records the completion commit. Hosted checks remain release gates.

Problem: retained links preserve navigation, but a manifest URL is not a readable substitute for the viewer. Disabled JS and selective blockers behave differently.

Scope: define and implement progressive enhancement for direct image, PDF, manifest-only and thumbnail/link records. Prefer a server-rendered fallback that remains available until the viewer reports successful readiness, plus a useful `noscript` explanation. A `noscript` message alone cannot detect blocked scripts when JavaScript is enabled.

Decision owner: Rob O'Connell approves the manifest-only fallback content/access policy, with Special Collections supplying suitable published destinations and ITS confirming any access-control implications. The implementer supplies technical options and records the decision and evidence; engineering must not select a new public-content or download policy implicitly. Track any outstanding decision under Rob with the specific missing destination/policy, while continuing independent fallback work.

Acceptance:

- [x] Record a fallback destination policy for each record type using available, approved published URLs. For manifest-only records, decide whether to supply a human-readable alternate page, approved image/PDF link, or an explicit limited-access message/help route. Record unresolved content decisions as blockers; never present raw JSON as equivalent viewing access.
- [x] Preserve original links, record metadata and keyboard access with JS disabled, the viewer script blocked, OSD blocked, configuration missing, or initialization failing. Do not require the failed viewer bundle itself to create the fallback.
- [x] Hide any fallback explanation only after the appropriate viewer is ready; preserve useful access during failures after partial setup. Distinguish disabled JS from content/network failure in user wording where knowable.
- [x] Verify actual clicks/destinations, not merely anchor presence, on Digital Object and linked Archival Object pages. Include a manifest-only sequence and a direct PDF/image.
- [x] Confirm fallbacks respect publication/access and download policy; do not invent public originals, signed links or bulk sequence downloads.
- [x] Record fresh deterministic browser evidence for disabled JS, each script blocked separately, and content requests blocked. Reuse prior M06/PDF evidence as baseline and state remaining hosted checks.

## DV-M03 — Make template-to-viewer markup an explicit contract

Status: COMPLETE (2026-09-18). Dependencies: DV-M01. Related: WBL-0904; M04/M05/M07.

Deliverable: [attribute contract and upgrade checks](plugin-source-contract.md); [recorded evidence](evidence/dv-m03-2026-09-18.json). 15 Ruby tests, 71 Node tests, 20 mutation cases, seven actual-ASpace source-contract rows and 27 fallback regression rows pass. Completion commit is recorded in the parent ledger.

Problem: class names and direct-child selectors couple source discovery to ArchivesSpace/theme markup.

Scope: extend and document the existing attribute contract, adding explicit source URLs where needed; keep compatibility selectors for stock markup the plugin does not own. Document who produces and consumes each attribute.

Existing baseline: `public/views/shared/_digital.html.erb` emits `data-dv-page-context`, `data-record-type`, `data-has-children` and `data-dv-source-group`. In the script, `getPageContext()` reads the page-context attributes, and `findGroupRoot()` / `findInsertAfter()` consume source groups. `findGroupRoot()` assigns a synthesized `render-N` source group when its selected root has none. `collectSourceAnchors()` / `collectFileUris()` already support `data-file-uri`, but this partial does not currently emit it. Preserve and extend these behaviors rather than replacing them as if no contract exists.

Acceptance:

- [x] Cover representative-file, linked-entry, additional-file-version, thumbnail-only and collection-browse branches without treating browse links as renderable files.
- [x] Preserve one object's alternatives together and separately linked objects apart, including separate image/PDF objects and leaf versus parent Digital Objects.
- [x] Tests demonstrate that added wrappers and renamed cosmetic classes do not break plugin-owned source discovery; legacy markup fixtures continue working.
- [x] Validate ERB escaping, real ArchivesSpace-rendered fixtures and both page types. A hand-written DOM shim alone is insufficient evidence of upgrade compatibility.
- [x] Document the remaining stock-HTML assumptions and an upgrade smoke check that verifies a viewer and usable original links.

## DV-M04 — Establish modules and extract configuration/source selection

Status: COMPLETE locally (2026-09-18). Dependencies: DV-M01, DV-M03. Related: WBL-0901/0902.

Scope: implement the selected build/loading approach, extract configuration parsing, URL detection and ranking, and keep the remaining code behind an explicit entry point.

Test migration deliverable: `test/digital_viewer.test.mjs` currently reads `public/assets/digital_viewer.js` as text, injects hooks by replacing the closing IIFE, and executes it with `vm.runInNewContext`. Module extraction or bundling can invalidate both that text pattern and its closure-local function references. Rewrite the harness around module exports and/or retarget integration coverage at the served artifact; merely changing the input filename is insufficient if instrumentation assumptions no longer hold.

Acceptance:

- [x] Pure detection/ranking tests import source modules directly; preserve URL classifications, encoded identifiers, priority, companion/download decisions and empty-config behavior.
- [x] Migrate the existing text/VM harness explicitly, mapping its regressions to module tests or artifact integration tests without losing lifecycle, fallback or DOM coverage. Assert that intended hooks/tests actually execute; a failed text replacement must not silently reduce coverage. Document and verify the new build-before-test commands in the guide and parent `CLAUDE.md`/`AGENTS.md`.
- [x] A clean checkout produces the deployable assets with documented, locked tooling. The archive runs without Node or a build step on the host.
- [x] Keep one source of truth; mark generated assets and document how standalone changes reach the Docker mirror. Reconcile legacy copies through WBL-0901.
- [x] Test the served artifact in addition to source modules, with Ruby asset-version checks and real-ASpace startup. Asset cache invalidation covers every runtime output.
- [x] Browser source maps resolve to the maintained modules. Verify PUI prefix/CSP assumptions and release-package contents for the chosen loading strategy.

Implementation and harness mapping: [build guide](plugin-build.md). [Local evidence](evidence/dv-m04-2026-09-18.json): 79 Node tests, 15 Ruby template tests/72 assertions, asset-version checks, clean-package build, watch/stale checks, browser regressions and live ASpace startup pass. Legacy copies are explicitly marked pending WBL-0901; hosted deployment and remote CI remain separate gates. Completion commit is recorded in the parent ledger.

## DV-M05 — Extract source adapters and manifest parsing

Status: COMPLETE locally (2026-09-18). Dependencies: DV-M04.

Scope: separate manifest parsing and the manifest, Compass, Preservica, direct-image and PDF adapters. Rename historical Compass-only labels where needed to accurately describe generic manifest handling, preserving behavior.

Acceptance:

- [x] Adapters receive configuration, request ownership and mount context explicitly; detection and ranking do not depend on viewer UI code.
- [x] Pure manifest parsing preserves page count/order, unavailable canvases, image-service identifiers and safe download targets.
- [x] Test each supported adapter's success and failure, missing configuration, synchronous exceptions, rejected fetch/body parsing and cancellation through the real fallback coordinator.
- [x] Compass-specific rewriting stays within its adapter so WBL-0905 can remove it without rewriting generic manifest rendering.

Implementation: [adapter trace and contracts](plugin-adapters.md). [Local evidence](evidence/dv-m05-2026-09-18.json): 121 Node tests, Ruby checks, 20 source-contract and 42 fallback browser rows, two request-ownership cases, live ASpace startup and source maps pass. Native media playback/iframe detection remains unchanged; hosted release gates remain separate. Completion commit is recorded in the parent ledger.

## DV-M06 — Separate viewer lifecycle, controls and thumbnail loading

Status: OPEN. Dependencies: DV-M05.

Scope: extract OpenSeadragon construction, navigation/download/adjustment controls, thumbnail queues and mount-attempt ownership into cohesive modules.

Acceptance:

- [ ] Define one owner for each request, timer, observer and document/viewer event listener, with explicit disposal. Resolve or document the existing document-listener cleanup follow-up.
- [ ] Preserve per-group cancellation, bounded thumbnail loading, final slow-attempt retention, deadline races and stale callbacks across rapid navigation and fallback.
- [ ] Controls consume a documented viewer interface; thumbnail errors cannot invalidate a working main viewer.
- [ ] Existing request-ownership, thumbnail, download-policy and failure regressions pass; browser evidence covers navigation, keyboard controls and replacement/disposal.

## DV-M07 — Reduce startup to readable orchestration

Status: OPEN. Dependencies: DV-M03, DV-M06.

Scope: finish extraction of page discovery/grouping, layout and startup. Keep `init` focused on collecting groups, selecting sources, creating containers and coordinating mount attempts.

Acceptance:

- [ ] The startup module exposes an understandable call sequence with explicit configuration/context dependencies and no hidden cross-module mutable globals.
- [ ] Stock, leaf and inline layouts preserve record information, separate linked objects and original links. Reinitialization creates no duplicate viewers.
- [ ] One group's error cannot prevent other groups from mounting; synchronous and asynchronous failures follow the same ownership rules.
- [ ] Existing layout, source-group, replacement, fallback and DOM-readiness checks run against the assembled artifact; DV-M02 fallback remains usable after partial initialization failure.

## DV-M08 — Publish the developer map and validate the assembled plugin

Status: OPEN. Dependencies: DV-M02, DV-M07. Related: WBL-0903/0904.

Scope: update the maintenance guide and release workflow around the completed architecture, with symptom-to-module navigation and concrete verification evidence.

Acceptance:

- [ ] Document Ruby template → configuration/markup → startup → adapter → viewer → content-service flow, including fallback and disposal paths, using final filenames and APIs.
- [ ] Map missing viewer, wrong grouping, manifest failures, stalled tiles, thumbnail errors and incorrect downloads to the responsible modules/tests.
- [ ] Replace current troubleshooting/review navigation based on absolute line numbers with module paths and function names. Audit the Lyrasis task list's review anchors (including the historical `init` near line 2185); retain dated candidate references as history and distinguish them from navigation for the current source.
- [ ] Diagnostics identify stage and safe error code without exposing source URLs, query strings or credentials; distinguish absent sources from failure of an expected plugin-owned source contract.
- [ ] Run relevant Node/Ruby suites and actual-ASpace browser coverage for supported formats, startup/partial failure, no-JS and blocked scripts, source grouping and download behavior. State exact environment, artifact commit and remaining hosted checks.
- [ ] Verify the extracted distribution, asset identity/cache invalidation and rollback to the prior artifact; preserve existing staging gates and approval requirements.
- [ ] Update ticket completion evidence and the maintenance guide; future developers can reproduce one successful manifest render and diagnose one controlled failure from the instructions.
