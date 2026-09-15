# digital_viewer

ArchivesSpace Public User Interface plugin for IIIF image viewing with OpenSeadragon, plus source adapters for direct files, legacy Compass and Preservica.

Status: development pilot; tested locally with ArchivesSpace 4.2.0. Not yet approved for Lyrasis production. Current evidence and next tasks: `docs/plugin-pilot-checkpoint-2026-09-10.md` included in this repository.

The current staging launch inventory and evidence record are `docs/fixture-ledger.md` and `docs/staging-release-evidence.md`.

## Install on a test instance

1. Clone https://github.com/SmithCollegeLibraries/archivespace-plugin.git into `plugins/digital_viewer` in the ArchivesSpace installation. The on-disk directory name must be `digital_viewer`.
2. Append `digital_viewer` to the existing `AppConfig[:plugins]` array in `config/config.rb`; preserve other enabled plugins.
3. Have the host set the configuration below in the ArchivesSpace process environment, then restart using its normal procedure. AppConfig mapping for these settings is not implemented yet; confirm Lyrasis support first.
4. Inspect the generated `window.DigitalViewer` values and asset requests in the PUI. Verify digital-object and linked archival-object pages against the agreed fixtures.

## Configuration currently read by public/views/layout_head.html.erb

| Environment variable | Development default | Hosted-test requirement |
|---|---|---|
| CANTALOUPE_PUBLIC_URL | http://localhost:8080/iiif/2 | https://digital.smith.edu/iiif/2 |
| COMPASS_BASE_URL | https://compass.fivecolleges.edu | Only needed for transitional Compass records |
| COMPASS_PROXY_URL | http://localhost:8080/compass-resolve | Reachable resolver if testing legacy Compass paths; empty disables proxy use |
| PRESERVICA_API_BASE | http://localhost:8080 | Reachable backend when testing Preservica; no production endpoint verified |

These are actual current defaults, not recommended hosted values. `compassHost` is still hard-coded in the template. WBL-0902 must resolve host portability and unused-adapter behavior before a general production release. Do not place AWS credentials in this plugin: they belong only on the image server.

Direct converted manifests on libtools2 are fetched by the browser; they do not need the Compass resolver or Preservica backend. Legacy Compass records and Preservica records require their respective companion services. Manifests point to public image-service URLs and stored thumbnail URLs; their browser origins require suitable CORS and host CSP settings.

## Source and tests

The authoritative viewer is `public/assets/digital_viewer.js`; asset injection is `public/views/layout_head.html.erb`. Legacy copies remain under `frontend/`; WBL-0901 reconciliation is outstanding. Keep the currently tested package intact until that task is verified. The layout uses the JS file modification time for cache busting.

From this repository root:

```sh
node --test test/*.mjs
```

The tests use Node's built-in test runner and a DOM shim. They do not substitute for real browser or hosted ArchivesSpace tests.

## Test and rollback

Verify single/multipage rendering, page and thumbnail navigation, zoom, download policy, broken-source fallback and a record without digital content. Check for localhost URLs, mixed content, CSP/CORS errors and unauthenticated public access. The existing pilot matrix is incomplete for PDFs and Preservica.

Before installing, retain the host's current plugin/config versions. Roll back by restoring the prior plugin and config, or disabling this plugin in the enabled list, and restarting ArchivesSpace. Restore record file versions separately from saved snapshots if the pilot changes them. Rehearse this on test before production.

## Distribution

Keep repository location, source commit, archive checksum and installed configuration with each deployment. OpenSeadragon is vendored; retain its notices. Repository license and third-party redistribution review are outstanding before a public release. This README does not assign a new license.
