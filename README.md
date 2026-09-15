# digital_viewer

ArchivesSpace Public User Interface plugin for IIIF image viewing with OpenSeadragon, plus source adapters for direct files, legacy Compass and Preservica.

Status: development pilot; tested locally with ArchivesSpace 4.2.0. Not yet approved for Lyrasis production. Current evidence and next tasks: `docs/lyrasis-staging-launch-task-list.md` and `docs/staging-release-evidence.md`.

The current staging launch inventory and evidence record are `docs/fixture-ledger.md` and `docs/staging-release-evidence.md`.

## Install on a test instance

1. Clone https://github.com/SmithCollegeLibraries/archivespace-plugin.git into `plugins/digital_viewer` in the ArchivesSpace installation. The on-disk directory name must be `digital_viewer`.
2. Append `digital_viewer` to the existing `AppConfig[:plugins]` array in `config/config.rb`; preserve other enabled plugins.
3. Have the host set the configuration below in the ArchivesSpace process environment, then restart using its normal procedure. The plugin currently reads environment variables only; AppConfig mapping is not implemented.
4. Inspect the generated `window.DigitalViewer` values and asset requests in the PUI. Verify digital-object and linked archival-object pages against the agreed fixtures.

## Configuration read by public/views/layout_head.html.erb

| Environment variable | Unset/empty behavior | Hosted-test value |
|---|---|---|
| `CANTALOUPE_PUBLIC_URL` | Empty string; complete manifest service URLs can still work, while legacy Compass key construction has no configured base | `https://digital.smith.edu/iiif/2` |
| `COMPASS_BASE_URL` | Empty or invalid URL disables Compass host matching | Set only for approved transitional Compass paths |
| `COMPASS_PROXY_URL` | Empty; direct Compass resolution is not guaranteed | Empty for the converted-manifest pilot |
| `PRESERVICA_API_BASE` | Empty; Preservica viewing reports unavailable and keeps the original link | Empty for the converted-manifest pilot |
| `DIGITAL_VIEWER_LOADING_TIMEOUT_MS` | Positive finite milliseconds; defaults to 30000 | Default unless an approved measurement supports another value |

The template emits an escaped `window.DigitalViewer` object before the viewer loads. `compassHost` is derived from the hostname in `COMPASS_BASE_URL`; there is no separate host setting. An absent environment key and an explicit empty value both produce safe empty adapter settings, with no implicit localhost endpoints. The asset URLs use ArchivesSpace's `app_prefix` when available, and JavaScript, CSS and vendored OpenSeadragon share a version based on the newest asset modification time. Do not place AWS credentials in this plugin: they belong only on the image server.

Direct converted manifests on libtools2 are fetched by the browser; they do not need the Compass resolver or Preservica backend. Legacy Compass records and Preservica records require their respective companion services. Manifests point to public image-service URLs and stored thumbnail URLs; their browser origins require suitable CORS and host CSP settings.

## Source and tests

The authoritative viewer is `public/assets/digital_viewer.js`; asset injection is `public/views/layout_head.html.erb`. Legacy copies remain under `frontend/`; WBL-0901 reconciliation is outstanding. Keep the currently tested package intact until that task is verified. The on-disk plugin directory must be named `digital_viewer`, and the target ArchivesSpace version is 4.2.0.

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
