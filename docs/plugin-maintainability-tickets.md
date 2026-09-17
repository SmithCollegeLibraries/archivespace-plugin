# digital_viewer maintainability and fallback tickets

Created: 2026-09-17. Product: ArchivesSpace PUI plugin only.
Status: planned; every implementation ticket below is OPEN.

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

Start DV-M01, then DV-M02 and DV-M03. Continue DV-M04 → DV-M05 → DV-M06 → DV-M07 → DV-M08. DV-M02 is independent of the module build and can be prioritized before any extraction. Keep each ticket a separate reviewable commit and record its tests and commit in the completion ledger. All dependencies mean completed, evidenced work, not merely a ticket being created.

Existing WBL-0901 owns authoritative packaging/duplicate copies; WBL-0902 owns environment configuration; WBL-0903 owns diagnostics; WBL-0904 and LYR matrix rows own release verification; WBL-0905 owns legacy Compass retirement. These tickets add bounded implementation work beneath those concerns, without duplicating their completion claims. No new source types or source-priority changes are part of the refactor.

Use exported module APIs and explicit dependencies rather than new shared browser globals. Preserve record grouping, original links, URL handling, download policy, final-attempt timeout behavior, per-viewer request ownership and stale-callback guards. Keep the PHP prototype separate. A future source-type change must also consider the backend detector under repository rules.

## DV-M01 — Record module boundaries and the build decision

Status: OPEN. Dependencies: none. Related: WBL-0901/0902.

Problem: roughly 2,700 lines share closure state, making call flow and ownership difficult to trace.

Scope: inventory functions and mutable state in the current script; document a proposed dependency graph and choose native modules versus a bundled output. Bundled source with source maps is the initial recommendation, not an already selected toolchain. The current `public/assets/digital_viewer.js` remains authoritative until the build transition is implemented.

Acceptance:

- [ ] Map existing functions to proposed modules: config, page sources, source selection, adapters, viewer, controls, thumbnails, layout, lifecycle and startup.
- [ ] Define source descriptor, source group, adapter result, and mount-attempt contracts, including cancellation, cleanup and error ownership.
- [ ] Record the build choice and rationale against ArchivesSpace asset URLs, PUI prefixes, CSP, cache versions, standalone packaging and local Docker mirrors.
- [ ] Specify generated-file policy, source-map delivery, supported syntax, dependency locking and development/release commands. No build tooling is required on the ArchivesSpace host.
- [ ] Diagram one manifest success and one fallback, and record current regression commands/fixtures as the baseline.

## DV-M02 — Provide understandable access when the viewer cannot run

Status: OPEN. Dependencies: none. Related: WBL-0904; M06/M08/M13/M14.

Problem: retained links preserve navigation, but a manifest URL is not a readable substitute for the viewer. Disabled JS and selective blockers behave differently.

Scope: define and implement progressive enhancement for direct image, PDF, manifest-only and thumbnail/link records. Prefer a server-rendered fallback that remains available until the viewer reports successful readiness, plus a useful `noscript` explanation. A `noscript` message alone cannot detect blocked scripts when JavaScript is enabled.

Acceptance:

- [ ] Record a fallback destination policy for each record type using available, approved published URLs. For manifest-only records, decide whether to supply a human-readable alternate page, approved image/PDF link, or an explicit limited-access message/help route. Record unresolved content decisions as blockers; never present raw JSON as equivalent viewing access.
- [ ] Preserve original links, record metadata and keyboard access with JS disabled, the viewer script blocked, OSD blocked, configuration missing, or initialization failing. Do not require the failed viewer bundle itself to create the fallback.
- [ ] Hide any fallback explanation only after the appropriate viewer is ready; preserve useful access during failures after partial setup. Distinguish disabled JS from content/network failure in user wording where knowable.
- [ ] Verify actual clicks/destinations, not merely anchor presence, on Digital Object and linked Archival Object pages. Include a manifest-only sequence and a direct PDF/image.
- [ ] Confirm fallbacks respect publication/access and download policy; do not invent public originals, signed links or bulk sequence downloads.
- [ ] Record fresh deterministic browser evidence for disabled JS, each script blocked separately, and content requests blocked. Reuse prior M06/PDF evidence as baseline and state remaining hosted checks.

## DV-M03 — Make template-to-viewer markup an explicit contract

Status: OPEN. Dependencies: DV-M01. Related: WBL-0904; M04/M05/M07.

Problem: class names and direct-child selectors couple source discovery to ArchivesSpace/theme markup.

Scope: give plugin-owned output explicit source URL/group/context attributes; keep compatibility selectors for stock markup the plugin does not own. Document who produces and consumes each attribute.

Acceptance:

- [ ] Cover representative-file, linked-entry, additional-file-version, thumbnail-only and collection-browse branches without treating browse links as renderable files.
- [ ] Preserve one object's alternatives together and separately linked objects apart, including separate image/PDF objects and leaf versus parent Digital Objects.
- [ ] Tests demonstrate that added wrappers and renamed cosmetic classes do not break plugin-owned source discovery; legacy markup fixtures continue working.
- [ ] Validate ERB escaping, real ArchivesSpace-rendered fixtures and both page types. A hand-written DOM shim alone is insufficient evidence of upgrade compatibility.
- [ ] Document the remaining stock-HTML assumptions and an upgrade smoke check that verifies a viewer and usable original links.

## DV-M04 — Establish modules and extract configuration/source selection

Status: OPEN. Dependencies: DV-M01, DV-M03. Related: WBL-0901/0902.

Scope: implement the selected build/loading approach, extract configuration parsing, URL detection and ranking, and keep the remaining code behind an explicit entry point.

Acceptance:

- [ ] Pure detection/ranking tests import source modules directly; preserve URL classifications, encoded identifiers, priority, companion/download decisions and empty-config behavior.
- [ ] A clean checkout produces the deployable assets with documented, locked tooling. The archive runs without Node or a build step on the host.
- [ ] Keep one source of truth; mark generated assets and document how standalone changes reach the Docker mirror. Reconcile legacy copies through WBL-0901.
- [ ] Test the served artifact in addition to source modules, with Ruby asset-version checks and real-ASpace startup. Asset cache invalidation covers every runtime output.
- [ ] Browser source maps resolve to the maintained modules. Verify PUI prefix/CSP assumptions and release-package contents for the chosen loading strategy.

## DV-M05 — Extract source adapters and manifest parsing

Status: OPEN. Dependencies: DV-M04.

Scope: separate manifest parsing and the manifest, Compass, Preservica, direct-image and PDF adapters. Rename historical Compass-only labels where needed to accurately describe generic manifest handling, preserving behavior.

Acceptance:

- [ ] Adapters receive configuration, request ownership and mount context explicitly; detection and ranking do not depend on viewer UI code.
- [ ] Pure manifest parsing preserves page count/order, unavailable canvases, image-service identifiers and safe download targets.
- [ ] Test each supported adapter's success and failure, missing configuration, synchronous exceptions, rejected fetch/body parsing and cancellation through the real fallback coordinator.
- [ ] Compass-specific rewriting stays within its adapter so WBL-0905 can remove it without rewriting generic manifest rendering.

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
- [ ] Diagnostics identify stage and safe error code without exposing source URLs, query strings or credentials; distinguish absent sources from failure of an expected plugin-owned source contract.
- [ ] Run relevant Node/Ruby suites and actual-ASpace browser coverage for supported formats, startup/partial failure, no-JS and blocked scripts, source grouping and download behavior. State exact environment, artifact commit and remaining hosted checks.
- [ ] Verify the extracted distribution, asset identity/cache invalidation and rollback to the prior artifact; preserve existing staging gates and approval requirements.
- [ ] Update ticket completion evidence and the maintenance guide; future developers can reproduce one successful manifest render and diagnose one controlled failure from the instructions.
