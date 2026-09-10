# ArchivesSpace 4.2.0 local compatibility pilot

Date: 2026-09-09. Scope: WBL-0904 / WBL-1004 preparation; not completion of the full production test matrix.

Smith reports Lyrasis runs ArchivesSpace 4.2.0. The local stack now pins `archivesspace/archivesspace:4.2.0` and `archivesspace/solr:4.2.0` (bundled Solr 9.9.0). API reports `ArchivesSpace (v4.2.0)`. MariaDB remains 10.3.39; this is version parity for the application, not a claim of full infrastructure parity with Lyrasis.

## Data preservation and upgrade

The app, database clients, database, and old Solr were stopped before copying `preservica_mariadb_data` to `preservica_mariadb_data_420`. Database migrations were run using the 4.2.0 image's `scripts/setup-database.sh`, which completed successfully. New `aspace_data_420` and `solr_data_420` volumes allow fresh indexes. All 867 digital objects remained after upgrade.

Original volumes remain intact for rollback:

- `preservica_mariadb_data`
- `preservica_aspace_data`
- `preservica_solr_data`

The new normal Compose configuration uses their `_420` counterparts. Do not run `docker compose down -v`. A fresh clone from older local volumes must be prepared before starting 4.2.0 against them; changing the image tag alone is not the rollback procedure.

Configuration snapshots and record evidence are under ignored local directory `exports/archivespace-4.2.0-20260909/`. This directory is not committed and must be retained on the workstation if using these exact rollback commands.

To restore the pre-upgrade snapshot, from the repository root:

```sh
docker compose stop archivesspace php-fpm mariadb aspace-solr
docker compose --project-directory "$PWD" -p preservica \
  -f exports/archivespace-4.2.0-20260909/docker-compose.before.yml \
  up -d mariadb aspace-solr php-fpm archivesspace
```

This resumes the original database snapshot; edits made only in the 4.2.0 database will not appear there. Do not run the old app against the migrated `_420` database. Normal `docker compose up` selects 4.2.0 again.

## Plugin correction

The old manifest fetch path sent every manifest to the Compass-only resolver whenever that resolver was configured. The single-image pilot initially worked around this by setting `COMPASS_PROXY_URL` to an empty string.

The authoritative PUI asset now checks the parsed manifest hostname. Only Compass manifests use the Compass resolver; hosted manifests load directly. Four regression tests exercise digital.smith.edu, S3, an unrelated hostname containing the Compass hostname, and continued Compass proxying. Three external-host tests failed before the fix; all 26 plugin tests pass afterward. No new source type was introduced, so the backend source detector does not require a matching change.

The temporary Docker proxy override is no longer needed. The local container again uses the normal Compass resolver setting. The served JS SHA-256 matches the authoritative plugin file.

The old healthcheck incorrectly used missing `curl`. The image includes `wget`, and the replacement check now reports healthy.

## Local pilot records

- Single-image pilot: http://localhost:8081/repositories/2/digital_objects/869
- Multipage pilot: http://localhost:8081/repositories/2/digital_objects/863

Both are LOCAL IDs, not production identifiers.

Record 863 is `9 to 5, Boston MA, 1983`. Its complete pre-test record, including six original file versions, was saved to `exports/archivespace-4.2.0-20260909/record-863.before-local-manifest-test.json`. Only its local file versions were replaced with the converted manifest URL for this test. To restore those file versions, fetch the current local record, replace its `file_versions` with the snapshot's array, and submit using the current `lock_version`; do not blindly POST the stale whole snapshot.

The temporary localhost manifest server is still used until public manifest hosting exists. Browser zoom/pan must be rechecked by the user on 4.2.0: no connected browser was available to the agent. HTTP page checks and unit tests do not establish full visual compatibility.

## Public manifest pilot package

Prepared under `exports/production-manifest-pilot/manifests/`:

- `sia-pilot.json`: one previously verified image.
- `smith_ssc_ms00237_as541926.json`: 77 views exported from Compass node 1372439, preserving sequence and labels while using digital.smith.edu image services and thumbnails.

Both use proposed public manifest IDs under `https://digital.smith.edu/manifests/`. The converted multipage manifest contains no Compass-host references. These are pilot viewer manifests; this conversion is not a general migration implementation or a complete metadata/download-policy migration.

Validation:

```sh
node --test plugins/digital_viewer/test/*.mjs
cd workbench-lite
SSL_CERT_FILE=/etc/ssl/cert.pem python3 -m workbench_lite.cli verify-cantaloupe \
  --manifest ../exports/production-manifest-pilot/manifests/smith_ssc_ms00237_as541926.json \
  --timeout 30 --format json
```

Results: 26 plugin tests passed; all 77 image metadata requests passed with positive dimensions; the one-image manifest also passed. A 512 x 512 tile from page 1 returned HTTP 200 and image/jpeg with `Access-Control-Allow-Origin: *` for the local PUI origin. This is functional testing, not a capacity benchmark.

## Remaining public deployment dependency

`https://digital.smith.edu/manifests/sia-pilot.json` returns 404. SSH access was not established from this session. The operator/ITS must confirm a writable web directory and configure the `/manifests/` HTTPS route, serving JSON with browser CORS access. No manifests have been published to that host by this work, and no Lyrasis records were edited.

Once those two JSON files are published, first verify their public responses and image services, then change the local pilot records' File URIs to the corresponding public URLs. Retain the file-version snapshots. Do not change Lyrasis records as part of the local test.

## References

- https://github.com/archivesspace/archivesspace/releases/tag/v4.2.0
- https://docs.archivesspace.org/administration/docker/

## Follow-up: libtools2 manifest hosting (2026-09-09)

This supersedes the proposed digital.smith.edu manifest hosting above. Cantaloupe remains on digital.smith.edu; public manifests now live on libtools2:

- https://libtools2.smith.edu/digital/manifests/sia-pilot.json
- https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00237_as541926.json

Only those two JSON files were uploaded to the user-authorized `/var/www/html/digital/manifests/` directory (its verified canonical path is `/home/www/html/digital/manifests/`). No remote files were overwritten or deleted. The user configured `.htaccess` with `Header always set Access-Control-Allow-Origin "*"`. Both public responses return HTTP 200, application/json, and one wildcard CORS origin header. Downloaded file bytes match the prepared local artifacts. Manifest IDs use libtools2; all image services still use digital.smith.edu.

Local Docker digital objects 869 and 863 now reference these public manifest URLs. Before-update snapshots and read-back results are saved under `exports/libtools2-manifest-pilot/record-updates/20260909T193656Z/`. The API read-back confirms both changes. No Lyrasis records were changed. Browser rendering on the new URLs remains user verification; the manifest files no longer require the temporary localhost server.

## Follow-up: restore existing thumbnails (2026-09-09)

With explicit user authorization, updated the hosted `smith_ssc_ms00237_as541926.json` manifest to retain all 77 original Compass manifest thumbnail descriptors. These point directly to existing JPEGs under `https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-10/`; zoomable image services still point to digital.smith.edu. The public response matches the local artifact byte for byte, and 77/77 thumbnail descriptors match the original export. Only this manifest inside libtools2's digital directory was overwritten; no remote files were deleted. The pre-update file is saved locally as `exports/libtools2-manifest-pilot/manifests/smith_ssc_ms00237_as541926.before-thumbnails-20260909T195247Z.json`.

Sequential public probes after the update: first stored thumbnail 200 in 0.179 seconds; first-page info 200 in 0.030 seconds; a 512-pixel tile 200 in 1.136 seconds; identical repeat tile 200 in 0.989 seconds. These samples are diagnostic observations, not a load test or evidence of a cold cache.

Read-only SSH inspection found `cache.server.derivative.enabled = false`, an empty derivative cache implementation, and a configured but nonexistent `/var/cache/cantaloupe` directory. The VM reports 3.3 GiB RAM, with Java configured for `-Xmx4g`; review memory allocation before capacity testing. Proposed next step is a disk derivative cache, with the user's authorization requested before writing to the Cantaloupe server. Cache maintenance and capacity limits must be planned before production growth. Official caching reference: https://cantaloupe-project.github.io/manual/5.0/caching.html

## Follow-up: derivative cache enabled (2026-09-09)

After user approval, reused the existing empty `/home/cantaloupe/cache` directory on digital.smith.edu (owned by cantaloupe:cantaloupe, mode 775). The home filesystem had approximately 25 GB available. Created a mode-600 configuration backup at `/home/cantaloupe/etc/cantaloupe.properties.before-cache-20260909T195859Z`, then changed only:

```properties
cache.server.derivative.enabled = true
cache.server.derivative = FilesystemCache
FilesystemCache.pathname = /home/cantaloupe/cache
```

Restarted using the authorized `sudo -n /bin/systemctl restart cantaloupe.service`; service reports active/running. Sequential public first-page tile requests returned HTTP 200 in 1.048 seconds, 0.041 seconds, and 0.030 seconds. All three bodies have identical SHA-256 and are valid 512x512 JPEGs. Cache inspection confirms both image and info files, totaling 32 KB. Raw measurements: `exports/libtools2-manifest-pilot/cache-test-results.json`. This verifies repeat-request caching, not cold-image latency or production capacity. The existing 30-day derivative TTL remains; the cache cleanup worker remains disabled and no files were deleted. Agree on cleanup and disk monitoring before scaling beyond the pilot.

Rollback: restore the three settings from the backup (`false`, empty implementation, `/var/cache/cantaloupe`) and restart the service. Cached files can remain in place; no deletion is required. Java heap versus VM memory sizing remains an outstanding production-readiness item.

## Follow-up: additional local records 864 and 867 (2026-09-09)

After the user broadened the service credential's S3 read policy, verified all 77 image metadata responses and dimensions for two additional items: Fossey photographs/captions (local 864, 41 views, Compass node 79656) and People photo shoot of Steinem (local 867, 36 views, node 1367868). Original exports, converted manifests, inventory, and per-image verification are retained under `exports/additional-manifest-pilot/`.

Published as new files using exclusive creation inside the authorized libtools2 digital directory:

- https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00386_as412062_001.json
- https://libtools2.smith.edu/digital/manifests/smith_ssc_ms00237_b216_f10.json

Public JSON bytes match the prepared artifacts and allow the local PUI origin through wildcard CORS. Both manifests retain original S3 thumbnails, use digital.smith.edu image services, and have no remaining Compass-host URLs. Samples from each return valid JPEG thumbnails and 400-pixel previews. Initial previews took 3.500 seconds (864) and 7.516 seconds (867); repeats took 0.043 and 0.030 seconds, respectively. These are sequential samples, not capacity measurements.

Updated only local Docker records 864/867 to the respective hosted manifest file versions and verified API read-back. Before/after snapshots: `exports/additional-manifest-pilot/record-updates/20260909T201033Z/`. Restore original file versions using the current record lock version for rollback. No Lyrasis records changed; no remote files deleted or overwritten. Browser rendering remains user verification.
