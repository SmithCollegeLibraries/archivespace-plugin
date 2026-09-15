# Lyrasis staging fixture ledger

Date: 2026-09-15  
Status: LYR-01 in progress; current local ArchivesSpace API/PUI checks completed, fixture creation remains open.

This ledger contains public test URLs and local record identifiers only. It does not contain credentials, restricted identifiers, or record-edit payloads. Historical snapshot findings are separated from observations made against the current local stack.

## Baseline and source identity

| Item | Value | Evidence/status |
|---|---|---|
| Standalone plugin | `7edccca02af1a74b1ef6b1f5f5b0db9f48af9227` baseline; candidate through `8fb37647a87a34b18c8535dfe563fed4b0584088` | Candidate branch `codex/lyr-05-config-assets`; baseline checkout was clean |
| Parent live mount | `f6d5f2f37394ee1e3933f478e0239991685de07e` | Parent worktree has pre-existing user edits; runtime plugin files match standalone |
| ArchivesSpace | `archivesspace/archivesspace:4.2.0`, `sha256:7bd8aa78412715044df84450bf3925b4e8a36a55fe5a11c4710e26978f82c73b` | Image inspection passed |
| Solr | `archivesspace/solr:4.2.0` | Compose configuration and running container inspected |
| MariaDB | `mariadb:10.3.39` | Compose configuration inspected; running container |
| Enabled plugin | `digital_viewer` | `docker/aspace/config.rb` |
| Live mount | Parent `plugins/` → `/archivesspace/plugins` | Compose configuration inspected |
| Config mount | Parent `docker/aspace/config.rb` → `/archivesspace/config/config.rb` | Compose configuration inspected |
| PUI/API ports | Standard PUI `8081`, API `8089`, Staff `8082`; temporary render PUI `18081`, API `18089` | Standard PUI listener was occupied by an unrelated process; temporary override preserved volumes and used alternate host ports |
| Standalone tests | 39 passing | `node --test test/*.mjs` |
| Syntax checks | Passing | Node, Ruby, and ERB parser checks recorded in `staging-release-evidence.md` |

## Pilot fixtures

| Local Digital Object | Title | Approved public manifest | Expected pages | Digital Object snapshot | Archival Object mapping |
|---:|---|---|---:|---|---|
| 869 | Cantaloupe HTTPS pilot — SIA-SIA_000095_B41_F19_001r01 (TEST) | `https://libtools2.smith.edu/digital/manifests/sia-pilot.json` | 1 | `exports/libtools2-manifest-pilot/record-updates/20260909T193656Z/869.before.json` | Current API checked 2026-09-15: `linked_instances: []`, `file_versions: 1`, published manifest; local Archival Object fixture required. PUI `/repositories/2/digital_objects/869` returned 200 on temporary port 18081. |
| 863 | 9 to 5, Boston MA, 1983 | `https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00237_as541926.json` | 77 | `exports/libtools2-manifest-pilot/record-updates/20260909T193656Z/863.before.json`; alternatives seed `exports/archivespace-4.2.0-20260909/record-863.before-local-manifest-test.json` | Current API checked 2026-09-15: `linked_instances: []`, `file_versions: 1`, published manifest; local Archival Object fixture required. PUI `/repositories/2/digital_objects/863` returned 200 on temporary port 18081. |
| 864 | 19 color photographs, most of gorillas, some including Fossey, with Fossey's captions on the back, 1969 and undated | `https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00386_as412062_001.json` | 41 | `exports/additional-manifest-pilot/record-updates/20260909T201033Z/864.before.json` | Current API checked 2026-09-15: `linked_instances: []`, `file_versions: 1`, published manifest; local Archival Object fixture required. PUI `/repositories/2/digital_objects/864` returned 200 on temporary port 18081. |
| 867 | People photo shoot of Steinem, 1980 | `https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00237_b216_f10.json` | 36 | `exports/additional-manifest-pilot/record-updates/20260909T201033Z/867.before.json` | Current API checked 2026-09-15: `linked_instances: []`, `file_versions: 1`, published manifest; local Archival Object fixture required. PUI `/repositories/2/digital_objects/867` returned 200 on temporary port 18081. |

The manifest page counts above were read from the retained local manifest artifacts. They describe the proposed public-content pilot fixtures, not a hosted staging acceptance result.

## Required fixture gaps

| Fixture | Current status | Required next action | Owner |
|---|---|---|---|
| Four Digital Object → Archival Object mappings | ABSENT IN CURRENT API | Query completed 2026-09-15; all four returned `linked_instances: []`; create published local Archival Object fixture for each absent mapping | Implementation agent |
| Archival Object with two distinct linked Digital Objects | NOT FOUND | Create an isolated local record fixture and save its pre-change record/lock version | Implementation agent |
| Digital Object with children | NOT VERIFIED | Identify from local API or create isolated fixture | Implementation agent |
| Representative thumbnail with direct link | NOT VERIFIED | Identify rendered 4.2.0 example and save HTML evidence | Implementation agent |
| Representative thumbnail only | NOT FOUND | Create or identify a published fixture; preserve the image without inventing a link | Implementation agent |
| Direct PDF | NOT FOUND | Add a separately verified approved public PDF File Version to an isolated fixture | Rob / implementation agent |
| Image plus companion PDF | NOT FOUND | Create an isolated Digital Object fixture with both published versions and record ownership | Rob / implementation agent |
| Unsupported URL | NOT VERIFIED | Add a published test URL in an isolated fixture | Implementation agent |
| No digital content | NOT VERIFIED | Identify an ordinary Archival Object and retain its page URL/HTML evidence | Implementation agent |
| Long notes and sidebar positions | NOT VERIFIED | Exercise stock 4.2.0 pages after PUI starts, with both configured positions | Implementation agent |

## Repeatable local fixture procedure

1. Start the existing 4.2.0 Compose services without deleting or recreating volumes. If the standard PUI port is occupied, use a temporary alternate-port override and record it.
2. Query each Digital Object through the local API with resolved instances and record the current `lock_version`.
3. Resolve every linked instance to its Archival Object URL and save read-only pre-change JSON outside the plugin package.
4. Create only isolated, published local fixtures for missing cases. Keep the original record fields and current lock version in the rollback evidence.
5. Re-read each record and PUI page, then add the URL, page type, producer, source URLs, expected behavior, and evidence path here.

No fixture edits were made during LYR-01. The current API/PUI checks used the authenticated local API on port 18089 and PUI on port 18081; all four records rendered and all four current `linked_instances` arrays were empty. Fixture creation, Archival Object mappings and browser checks remain open.
