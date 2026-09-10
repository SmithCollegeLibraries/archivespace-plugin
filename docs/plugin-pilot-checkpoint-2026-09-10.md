# Viewer pilot checkpoint — 10 September 2026

This is the current pilot status and next-work sequence. It supersedes pre-VM assumptions in the July planning documents, without closing their unfulfilled acceptance criteria. Product: ArchivesSpace `digital_viewer` plugin. The React/Yii discovery prototype is a separate product.

## Verified delivery path

Local ArchivesSpace 4.2.0 PUI → browser fetches converted IIIF manifest from libtools2 → existing thumbnails directly from S3; zoomable images from digital.smith.edu Cantaloupe → cached derivatives or original TIFFs in S3. Converted pilots do not require Compass at viewing time. Compass was used to export the original manifests. Preservica and legacy Compass URLs have separate service dependencies.

| Local record | Fixture | Views | User feedback |
|---|---|---:|---|
| 869 | SIA single image | 1 | Working |
| 863 | 9 to 5, Boston MA, 1983 | 77 | Working; first loads slow |
| 864 | Fossey photographs and captions | 41 | Working; first loads slow |
| 867 | People photo shoot of Steinem | 36 | Working; first loads slow |

PUI links:
- http://localhost:8081/repositories/2/digital_objects/869
- http://localhost:8081/repositories/2/digital_objects/863
- http://localhost:8081/repositories/2/digital_objects/864
- http://localhost:8081/repositories/2/digital_objects/867

Implementation evidence, snapshots, public manifest URLs and rollback paths: `workbench-lite/archivesspace-4.2.0-pilot.md`. HTTP checks cover all 154 views across the three multipage manifests, plus the single-image pilot. These checks and general user confirmation do not establish every browser/download-policy scenario.

## Acceptance ledger

| Work | Disposition | Evidence / remaining approval |
|---|---|---|
| Local ASpace 4.2.0 upgrade | Verified local milestone | Prior volumes retained; migrations and PUI checked |
| Direct hosted manifests | Verified local milestone | Correct libtools2 URLs in local records; public JSON/CORS checked |
| Stored S3 thumbnails | Verified local milestone | Original descriptors retained; user reports better speed |
| Serial visible thumbnail loading | Verified local milestone | Regression tests; 29 plugin tests pass again on 10 September |
| Cantaloupe disk derivative cache | Verified pilot milestone | Cached repeated tile 0.03–0.04 s vs about 1 s generation; preview generation 3–8 s in samples |
| Basic browser rendering of four fixtures | User-confirmed pilot milestone | Feedback in this session; no formal browser matrix sign-off |
| Production readiness | OPEN | No team, ITS, or Lyrasis sign-off implied |
| WBL-0904 full pattern matrix | OPEN | Images demonstrated; PDFs, mixed objects, fallback, no-content and Preservica patterns still need evidence |
| WBL-1002 Cantaloupe | PARTIAL | Public HTTPS, encoded slashes and read-only S3 credential work; IAM role criterion is unmet (current credential is an IAM user key), restricted-content boundary and hardening remain open |
| WBL-1003 backend | OPEN | No verified production Preservica deployment in this pilot |
| WBL-1004 hosted plugin | OPEN | Lyrasis installation/configuration and rollback rehearsal remain |
| WBL-1101 vendor channel | PARTIAL | User reports ASpace 4.2.0 and test-first ticket workflow; supported configuration mechanism and test PUI URL unconfirmed |
| WBL-1102 cross-origin delivery | PARTIAL | Public manifest/image checks work locally; Lyrasis browser/CSP/auth checks remain |
| WBL-0405 generated Workbench fixture | OPEN pending criterion review | Converted Compass exports are not a substitute for the specific generated-package fixture |

## Next work, in order

| Priority / existing ticket | Concrete task | Proposed owner | Completion evidence |
|---|---|---|---|
| 1 — WBL-1108/1110/1111 | Reconcile broadened `s3fs-private/*` read permission with restricted Helle/Plath and Hogarth content; prove public requests cannot bypass intended restrictions, including cached derivatives | Rob + Special Collections + ITS | Approved public/restricted scope, negative access tests, authenticated-path decision; no restricted test URLs published |
| 2 — WBL-0901/0902 + 1101 | Package plugin for shared Git; resolve legacy frontend copies; confirm Lyrasis configuration mechanism, test PUI origin and CSP; review localhost defaults and release licensing | Rob + Lyrasis | Shared repository and pinned commit/package, install/config reference, 29+ tests, clean-environment smoke test |
| 3 — WBL-1002/1006 | Establish performance baseline and tune one variable at a time: CPU/RAM, heap, TIFF layout/processor and S3 reads, browser request counts, source/derivative caching | Rob + ITS | Cold/warm first-image and page-switch timings, p50/p95, CPU/RSS/swap, errors and agreed targets; preserve cache rather than clearing it without approval |
| 4 — WBL-1006 | Set cache disk budget, approved cleanup/retention, disk alerts, logs, restart/patch owners; resolve properties/credential permissions, root-only backup and daemon-reload sudo typo | ITS + Rob | Runbook, monitoring checks and reviewed rollback; current cache worker remains disabled |
| 5 — WBL-0904/1004 | Install pinned plugin on Lyrasis test, use reviewed fixtures, exercise thumbnails/page/zoom/download/failure paths and rollback | Lyrasis + Rob + Special Collections | Versioned browser matrix with actual observations, formal test acceptance before production request |
| 6 — WBL-0802/0803/0502/0601/0602 | Make export/conversion repeatable; inventory records, verify all pages/thumbnails, produce review CSV and rollback CSV; retain PDFs and decide hOCR handling | Rob + Special Collections | Reviewed mapping, stable manifest naming, repeat-run behavior and rollback rehearsal |
| 7 — WBL-1005 | Small reviewed production wave only after preceding gates | Special Collections + Rob + Lyrasis | Explicit approval, before/after snapshots, per-wave acceptance |

Performance load tests should ramp gradually only after memory sizing and public-access scope are resolved. Define expected concurrency and acceptable latency with the team; existing sequential samples do not establish capacity. Proposed rare-books/MARC 856 standalone viewer work remains in `docs/rare-books/`; the ASpace plugin does not provide that standalone page by itself.

## Decisions and sign-offs still needed

- Shared Git destination is confirmed: SmithCollegeLibraries/archivespace-plugin. Maintainers and release policy remain to be assigned. The shared plugin repository is https://github.com/SmithCollegeLibraries/archivespace-plugin. Local commits also track the pilot in the parent development repository. A plugin-only package can be provided without sharing the full development repository.
- Lyrasis configuration: environment variables versus AppConfig; test PUI hostname; installation/restart windows, rollback and custom-plugin upgrade responsibility. User-supplied staff test URL: https://archivesspace-test.smith.edu/staff/ (confirm spelling/origin with Lyrasis).
- ITS resource allocation: observed 3.3 GiB VM RAM versus Java `-Xmx4g`; this mismatch is an open sizing concern, not a proven cause of every delay.
- Special Collections: approved content scope, download behavior, migration reviewer and acceptance targets. Current broad IAM access was authorized for testing; it is not a restricted-content sign-off.
- Record named approver, date, scope and evidence for each formal sign-off. Do not mark whole WBL tickets done on the strength of a partial pilot.

## Staff record workflow

After a manifest is published and verified, edit File Versions on the Digital Object linked to the Archival Object. Add the manifest URL and publish it; verify the viewer before unpublishing superseded Compass viewer links. Preserve intended PDF/download companions. Batch production changes require a reviewed mapping and rollback values. No Lyrasis records have been changed during these pilots.
