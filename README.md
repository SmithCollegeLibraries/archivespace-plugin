# digital_viewer

ArchivesSpace Public User Interface plugin for IIIF image viewing with OpenSeadragon, plus source adapters for direct files, legacy Compass and Preservica.

Status: local demonstration accepted by Rob on 2026-09-16; tested locally with ArchivesSpace 4.2.0. Neither the Lyrasis staging-install package nor production rollout is approved. Current sign-off and next work: [staging checkpoint](docs/staging-signoff-2026-09-16.md); detailed tasks/evidence: `docs/lyrasis-staging-launch-task-list.md` and `docs/staging-release-evidence.md`.

The current staging launch inventory and evidence record are `docs/fixture-ledger.md` and `docs/staging-release-evidence.md`.

## Install on a test instance

1. Obtain Rob's approved release record, including the **full 40-character commit ID** and package checksum. No candidate in this README is implicitly approved. In a new plugin directory, clone without checking out the moving default branch, then check out that exact commit in detached-HEAD mode. The on-disk directory name must be `digital_viewer`. Do not overwrite an existing installation; follow the agreed backup/update/rollback procedure instead.

   Run from the ArchivesSpace installation directory after setting `APPROVED_PLUGIN_COMMIT` to the approved full commit ID:

   ```sh
   : "${APPROVED_PLUGIN_COMMIT:?Set this to the approved full 40-character commit ID}" &&
   test "${#APPROVED_PLUGIN_COMMIT}" -eq 40 &&
   git clone --no-checkout https://github.com/SmithCollegeLibraries/archivespace-plugin.git plugins/digital_viewer &&
   git -C plugins/digital_viewer checkout --detach "$APPROVED_PLUGIN_COMMIT" &&
   test "$(git -C plugins/digital_viewer rev-parse HEAD)" = "$APPROVED_PLUGIN_COMMIT"
   ```

   Stop if any command fails or the resolved ID differs. Do not substitute `main`, a branch tip or a shortened ID. If the approved commit is not available from the repository, obtain the approved pinned archive and verify its checksum before extraction; do not fall back to a different revision. Record the resolved ID before enabling the plugin. Archive/extracted-package approval remains a separate Gate A check.
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

The template emits an escaped `window.DigitalViewer` object before the viewer loads. `compassHost` is derived from the hostname in `COMPASS_BASE_URL`; there is no separate host setting. An absent environment key and an explicit empty value both produce safe empty adapter settings, with no implicit localhost endpoints. The asset URLs use ArchivesSpace's `app_prefix` when available, and JavaScript, CSS and vendored OpenSeadragon share a SHA-256 content version over their ordered filenames and bytes. Do not place AWS credentials in this plugin: they belong only on the image server.

Direct converted manifests on libtools2 are fetched by the browser; they do not need the Compass resolver or Preservica backend. Legacy Compass records and Preservica records require their respective companion services. Manifests point to public image-service URLs and stored thumbnail URLs; their browser origins require suitable CORS and host CSP settings.

## Source and tests

The authoritative viewer is `public/assets/digital_viewer.js`; asset injection is `public/views/layout_head.html.erb`. Legacy copies remain under `frontend/`; WBL-0901 reconciliation is outstanding. Keep the currently tested package intact until that task is verified. The on-disk plugin directory must be named `digital_viewer`, and the target ArchivesSpace version is 4.2.0.

From this repository root:

```sh
node --test test/*.mjs
```

The tests use Node's built-in test runner and a DOM shim. They do not substitute for real browser or hosted ArchivesSpace tests.

Thumbnail requests run one at a time per viewer (only visible/near-visible previews are queued when IntersectionObserver is available). Each gets a fixed 10-second timeout, independent of `DIGITAL_VIEWER_LOADING_TIMEOUT_MS`. Timeout or disposal removes the active image's `src`, clears its timer/listeners and advances only if the viewer is still active. A timed-out preview is not automatically retried; its numbered button and the full-size page remain available. Browser scheduling can delay a timeout in an inactive tab. See [focused browser regressions](test/browser/README.md) for real-request recovery and cancellation checks.

## Test and rollback

Verify single/multipage rendering, page and thumbnail navigation, zoom, download policy, broken-source fallback and a record without digital content. Check for localhost URLs, mixed content, CSP/CORS errors and unauthenticated public access. Local Chrome PDF, blocked-embedding/direct-access and scanned-text evidence is recorded; cross-browser/remaining release checks and hosted PDF policy remain open. Preservica playback is outside this converted-manifest/PDF pilot, not claimed as verified.

Before installing, retain the host's current plugin/config versions. Roll back by restoring the prior plugin and config, or disabling this plugin in the enabled list, and restarting ArchivesSpace. Restore record file versions separately from saved snapshots if the pilot changes them. Rehearse this on test before production.

## Distribution

Keep repository location, source commit, archive checksum and installed configuration with each deployment. OpenSeadragon is vendored; retain its notices. Repository license and third-party redistribution review are outstanding before a public release. This README does not assign a new license.
