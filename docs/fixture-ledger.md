# Lyrasis staging fixture ledger

Updated: 2026-09-16. Local fixture/render subtask completed with limitations below; full LYR-01/06 acceptance and both release gates remain OPEN.

Current candidate: `0c1ca140a51a28b93b8895b19b5b869ce0c9a5d5`. [Latest local URL/layout evidence and reproduction](local-layout-validation-2026-09-16.md); [latest machine-readable observations](evidence/local-layout-2026-09-16.json). [Earlier fixture-creation evidence](local-validation-2026-09-16.md) is retained as a historical checkpoint. No fixture records changed during the URL/layout follow-up.

## Environment and scope

ArchivesSpace 4.2.0 image `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b`; existing Solr 4.2.0 and MariaDB 10.3.39. The fixture-creation checkpoint started the existing stopped container. The later URL/layout follow-up recreated only ASpace with corrected browser-facing proxy URLs, tested left/right sidebar configurations, then restored left. Existing database, volumes and plugin mount were preserved. PUI `http://localhost:18081`, API 18089, Staff 18082. The unrelated 8081 listener remains untouched.

Parent `plugins/` is the live mount; `docker/aspace/config.rb` enables `digital_viewer`. Parent plugin bytes match the standalone copy, but the parent Git index is read-only for this session. The current suite has 63 passing Node tests in each copy, not the historical 39/60 counts.

All records below are in LOCAL repository 2. No hosted record IDs are inferred. Sixteen labeled QA records were created: one resource, nine Archival Objects, five Digital Objects and one component. The four original pilots' File Versions were verified byte-equivalent to their pre-fixture JSON values. Only new AO backlinks were added through the new instances. No existing pilot was posted/updated.

## Pilot mapping — fresh API and browser observations

PUI paths below are relative to `http://localhost:18081/repositories/2/`.

| Digital Object | Manifest under `https://libtools2.smith.edu/digital/manifests/` | Pages observed | Created Archival Object | Other new backlink |
| --- | --- | ---: | --- | --- |
| `digital_objects/869` — SIA | `sia-pilot.json` | 1 | `archival_objects/4096` | 4100 |
| `digital_objects/863` — 9 to 5 | `smith_ssc_ms00237_as541926.json` | 77 | `archival_objects/4097` | 4100 |
| `digital_objects/864` — Fossey | `smith_ssc_ms00386_as412062_001.json` | 41 | `archival_objects/4098` | — |
| `digital_objects/867` — Steinem | `smith_ssc_ms00237_b216_f10.json` | 36 | `archival_objects/4099` | — |

All four had `linked_instances: []` immediately before creation. All eight pages subsequently returned HTTP 200, retained their visible original manifest link, and loaded a first image in real OSD/Chrome 151. Counts above were freshly observed, not copied from historical manifests. These are local browser results, not Lyrasis acceptance.

## Edge-case fixtures

| Fixture / PUI path | Source contract and observed behavior | Remaining qualification |
| --- | --- | --- |
| `archival_objects/4100` | Two linked objects: 869 and 863. Two distinct `digital-0/1` groups, viewers with 1/77 pages; original links visible. Correct link/viewer/link/viewer order after fix `5621241`. | Second object's PDF isolation still needs an approved PDF fixture. |
| `archival_objects/4101` | No digital instances; no viewer/leaf column. Published synthetic long scope/content note. Enter/Space/click and ARIA state pass, as do mouse/keyboard resizing and subsequent mobile reflow, on both actual sidebar configurations. | Focused Chrome checks, not full accessibility acceptance. |
| `digital_objects/870` | Published child component `digital_object_components/1`; rendered context reports children=true; inline viewer, no leaf column. Parent-to-child navigation and child current-node highlight pass on both sidebar sides. | Full tree accessibility/cross-browser audit not run; stock leaf 404 remains. |
| `digital_objects/871` | Representative thumbnail followed by SIA manifest. Zero external-link-class anchors. Representative anchor and additional File Version point to manifest; one viewer, thumbnail retained. | Confirms own-record representative branch. |
| `digital_objects/872` | Representative thumbnail only; loaded image, no invented anchor or viewer/empty column. | No direct downloadable original is invented. |
| `archival_objects/4102` | Representative instance links DO 871. ASpace's derived_from yields a link to DO 871, **not** the manifest. Thumbnail and record link retained; no viewer expected here. | Do not misreport this as a failed manifest scan. |
| `archival_objects/4103` | Non-representative instance of thumbnail-only DO 872. Entry-list branch preserves unlinked thumbnail; no viewer. | Confirms linked-instance thumb-only branch. |
| `digital_objects/873`, `archival_objects/4104` | Published unsupported `https://example.invalid/digital-viewer-qa/not-an-image` link preserved; no viewer or empty leaf column. | Reserved invalid host deliberately not fetched. |
| `digital_objects/874` | Six-version alternatives fixture: four unpublished sentinels, published thumbnail, published 77-view manifest. One viewer; unpublished sentinels absent from server HTML. | Preserves the historical 863 snapshot's order/publication/protocol shape; not its private URLs. No companion PDF yet. |
| `resources/2` | Isolated QA collection owning the nine new Archival Objects. | Resource PUI page itself NOT included in the 18-page smoke result. |

Image/thumbnail fixture source: approved SIA image service, `https://digital.smith.edu/iiif/2/2023-01%2FSIA-SIA_000095_B41_F19_001r01.tif/full/512,/0/default.jpg`. It loaded in Chrome. This does not prove the restricted-content boundary.

The read-only alternatives seed is parent `exports/archivespace-4.2.0-20260909/record-863.before-local-manifest-test.json`. Its four unpublished entries remain unpublished in the synthetic copy and use reserved `example.invalid` sentinels instead of private destinations. The published image and manifest use existing approved pilot content. The original seed was not changed.

## Producers and representative behavior

Source inspected directly in the installed 4.2.0 WAR: `ObjectsController#show`, `ResultInfo#process_digital`, `process_digital_instance`, `process_file_versions`, and backend `RepresentativeFileVersion`.

- Digital Objects/components use `process_digital`; linked AO entries use `process_digital_instance`. Both derive display values via `process_file_versions`: `out`, `thumb`, optional `represent`/`caption`, with caller-added `material`/caption. These are source-inspected contracts, not runtime instrumentation of private Rails variables.
- Digital Object additional published versions are also emitted by stock record innards. Representatives replace the partial's entry list; DO 871 verifies this branch with zero external-link-class anchors.
- AO representative `derived_from` is a local record URI. Preserving that link is correct; the plugin must not fabricate a file URL.
- Group markers are rendered-block identities, not ASpace IDs. Viewers sit beside their own groups, not after the shared list.

## Reproduction, snapshots and rollback boundaries

Local-only artifacts (outside the distributable plugin) are under parent `exports/lyr-local-20260916/`:

- `pilots.before.json`: all four complete pre-fixture local records and lock versions.
- `fixture-plan.json`: ordered creation payloads; `$key` references resolve to the preceding creation result URI.
- `created.json`: exact 16 creation responses/IDs. Re-read these before any repeat run; **do not blindly repost the plan**.
- `records.after.json`: initial readbacks of all fixtures and pilots.
- `4101.before-note-publish.json` and `4101.after-note-publish.json`: synthetic note correction (ASpace defaults note_text.publish to false); later snapshot supersedes 4101 in the initial readback.
- Four `single-image/two-objects-desktop/narrow.png` screenshots of the final runtime.

To reproduce on this stack, start only `preservica-archivesspace-1` if stopped, verify its existing ports/mounts and health, then use the checked-in browser probes linked above. On a fresh local database, inspect schemas and create only missing labeled QA records in plan order, recording each returned URI. Do not assume the recorded IDs are free, copy local IDs to staging, or publish historical hidden versions. Session credentials must remain in memory, not reports.

Nothing was deleted or rolled back in this session. To retire fixtures, identify them by both recorded URI and `dv-qa-20260916` identifier/title, and obtain cleanup approval. Never restore the four full pilot snapshots over newer records: their File Versions were not changed. Removing only the new fixture instances would remove the newly introduced backlinks. Any future record restoration must use a fresh lock version and scoped fields.

## Gaps still open

- Approved public PDF and its owner/object association: direct PDF, image-plus-PDF, second-object PDF isolation. Rob was asked; no new content approval assumed.
- Local origins and focused narrow/sidebar/notes/resize checks now pass as documented above. Stock leaf tree 404s remain and are explained by installed 4.2.0 code; tree selection/navigation work. This does not close the full M04/M18 or clean-console gates.
- Linked thumbnail-plus-out-link entry branch (distinct from representative and thumbnail-only branches), complete accessibility/Tab-order, Safari/Firefox, full download/failure matrix, rollback and archive acceptance remain pending.
- Lyrasis origin/config/CSP/operations, hosted CORS, restricted-content evidence, content review and Rob's release approval remain open.
