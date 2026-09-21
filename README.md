# digital_viewer

ArchivesSpace Public User Interface plugin for IIIF image viewing with OpenSeadragon, plus source adapters for direct files, legacy Compass and Preservica.

Tested locally with ArchivesSpace 4.2.0. The refactor and review fixes are complete,
and this version is ready for staging installation. Verify the installed plugin
in the hosted environment before production rollout.

## Install on a test instance

The plugin includes built JavaScript and CSS. No Node.js installation or build step
is needed on the ArchivesSpace server.

1. Back up any existing plugin directory and ArchivesSpace configuration.
2. For a new installation, run these commands from the ArchivesSpace installation directory:

   ```sh
   git clone --branch main https://github.com/SmithCollegeLibraries/archivespace-plugin.git plugins/digital_viewer
   git -C plugins/digital_viewer rev-parse HEAD
   ```

   Keep the printed commit ID with the installation record. The directory must be
   named `digital_viewer`. For an existing installation, update it to the selected
   commit using the host's normal deployment procedure.
3. Add `digital_viewer` to the existing `AppConfig[:plugins]` array in
   `config/config.rb`, preserving other enabled plugins.
4. Set the environment variables below for the ArchivesSpace process, then restart
   ArchivesSpace. Configuration currently uses environment variables, not custom
   AppConfig settings.
5. Check digital-object and linked archival-object pages: images, sequences, PDFs,
   original links and a record without digital content. Confirm that asset and
   content requests succeed in the browser.

To reproduce an installation later, check out its recorded commit. If delivering
an archive instead of using Git, record its SHA-256 checksum as well.

## Configuration

| Environment variable | Unset/empty behavior | Hosted-test value |
|---|---|---|
| `CANTALOUPE_PUBLIC_URL` | Empty string; complete manifest service URLs can still work, while legacy Compass key construction has no configured base | `https://digital.smith.edu/iiif/2` |
| `COMPASS_BASE_URL` | Empty or invalid URL disables Compass host matching | Set only when transitional Compass paths are needed |
| `COMPASS_PROXY_URL` | Empty; direct Compass resolution is not guaranteed | Empty for the converted-manifest pilot |
| `PRESERVICA_API_BASE` | Empty; Preservica viewing reports unavailable and keeps the original link | Empty for the converted-manifest pilot |
| `DIGITAL_VIEWER_LOADING_TIMEOUT_MS` | Positive finite milliseconds; defaults to 30000 | 30000 unless testing indicates another value is needed |

The template emits an escaped `window.DigitalViewer` object before the viewer loads. `compassHost` is derived from the hostname in `COMPASS_BASE_URL`; there is no separate host setting. An absent environment key and an explicit empty value both produce safe empty adapter settings, with no implicit localhost endpoints. The asset URLs use ArchivesSpace's `app_prefix` when available, and JavaScript, CSS and vendored OpenSeadragon share a SHA-256 content version over their ordered filenames and bytes. The version is cached per plugin root for the life of the PUI process; restart ArchivesSpace after any asset change, including local development edits. Missing or unreadable assets log a fixed diagnostic and use an unavailable version without breaking page rendering. Repair the package and restart before release. Do not place AWS credentials in this plugin: they belong only on the image server.

Direct converted manifests on libtools2 are fetched by the browser; they do not need the Compass resolver or Preservica backend. Legacy Compass records and Preservica records require their respective companion services. Manifests point to public image-service URLs and stored thumbnail URLs; their browser origins require suitable CORS and host CSP settings.

## Source and tests

The authoritative JavaScript source is `src/`; `public/assets/digital_viewer.js` and its map are generated and committed. Asset injection remains `public/views/layout_head.html.erb`. See [build, source map and test instructions](docs/plugin-build.md). The installed plugin directory must still be named `digital_viewer`.

From this repository root, using Node 26.8.2 and npm 11.19.1:

```sh
npm ci
npm run check:generated
npm test
ruby test/asset_version_test.rb
ruby test/fallback_template_test.rb
```

Node's test runner uses explicit source APIs, a DOM shim and unmodified artifact startup tests. Browser helpers test the generated script. These do not substitute for hosted acceptance. Legacy `frontend/` copies are marked historical and remain outside this build pending WBL-0901.

Thumbnail requests run one at a time per viewer (only visible/near-visible previews are queued when IntersectionObserver is available). Each gets a fixed 10-second timeout, independent of `DIGITAL_VIEWER_LOADING_TIMEOUT_MS`. Timeout or disposal removes the active image's `src`, clears its timer/listeners and advances only if the viewer is still active. A timed-out preview is not automatically retried; its numbered button and the full-size page remain available. Browser scheduling can delay a timeout in an inactive tab. See [focused browser regressions](test/browser/README.md) for real-request recovery and cancellation checks.

## Test and rollback

Verify single/multipage rendering, page and thumbnail navigation, zoom, download policy, broken-source fallback and a record without digital content. Check for localhost URLs, mixed content, CSP/CORS errors and unauthenticated public access. Local Chrome PDF, blocked-embedding/direct-access and scanned-text evidence is recorded; cross-browser/remaining release checks and hosted PDF policy remain open. Preservica playback is outside this converted-manifest/PDF pilot, not claimed as verified.

Before installing, retain the host's current plugin/config versions. Roll back by restoring the prior plugin and config, or disabling this plugin in the enabled list, and restarting ArchivesSpace. Restore record file versions separately from saved snapshots if the pilot changes them. Rehearse this on test before production.

## Distribution

Keep repository location, source commit, archive checksum and installed configuration with each deployment. OpenSeadragon is vendored; retain its notices. Repository license and third-party redistribution review are outstanding before a public release. This README does not assign a new license.

## Developer documentation

- [Maintenance and troubleshooting](docs/plugin-maintenance-guide.md)
- [Page-load trace](docs/plugin-startup.md)
- [Source adapters](docs/plugin-adapters.md)
- [Viewer lifecycle and controls](docs/plugin-viewer-lifecycle.md)
- [Build and tests](docs/plugin-build.md)
- [Package checks and rollback](docs/plugin-release-workflow.md)
- [Refactor verification](docs/refactor-validation-2026-09-21.md)
- [Review fixes and verification](docs/review-followup-2026-09-21.md)
