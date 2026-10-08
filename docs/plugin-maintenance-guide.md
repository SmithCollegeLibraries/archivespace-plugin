# Maintaining digital_viewer

Updated 21 September 2026 after local module work and campus verification.
The refactor is separate from the previously published `553e0f3` baseline.
Local development verification does not authorize installation; installation
follows the hosting provider's staging and acceptance process.

## Start here

- [Page-load walkthrough](plugin-startup.md): current filenames and call sequence.
- [Build, source maps and tests](plugin-build.md): edit `src/`, commit generated assets.
- [Adapter trace](plugin-adapters.md): manifest, Compass, Preservica and direct media.
- [Viewer ownership](plugin-viewer-lifecycle.md): controls, thumbnails, cancellation.
- [Template contract](plugin-source-contract.md): attributes, producers and selectors.
- [Release/rollback procedure](plugin-release-workflow.md): package and verify exact bytes.

## From Ruby to displayed content

```text
ArchivesSpace published records / File Versions
  public/views/layout_head.html.erb
    → escaped window.DigitalViewer settings + versioned OSD / bundle / CSS URLs
  public/views/shared/_digital.html.erb
  public/views/digital_objects/_additional_file_versions.html.erb
    → page/group/source attributes + original links
    → shared/_digital_viewer_fallback.html.erb: no-JS and blocked-script guidance
  src/entry.mjs → readConfig → createViewerRuntime → DOM-ready init
  src/init.mjs → page-sources → source-selection → page-layout → mount-sequence
  src/adapters/* → manifest/backend/proxy/direct file → viewer/native media
  src/lifecycle.mjs → cancel old attempt, dispose resources, advance fallback
```

Ruby/ERB runs on the ArchivesSpace server. JavaScript runs in the visitor's browser.
`<%= ... %>` emits Ruby results into the HTML; the `j` helper in the head escapes
values for a JavaScript string. `COMPASS_PROXY_URL` is a transitional delivery
setting used by the Compass adapter, including real browser CORS/redirect handling.
It is not merely a testing flag. Hosted manifests bypass the Compass resolver.

The plugin reads the public page; it does not discover hidden records through the
ArchivesSpace API, convert TIFFs, upload files or provide content access control.
Cantaloupe serves image descriptions/tiles; manifest and thumbnail hosts may be
separate. Preservica uses the companion backend, which owns authentication.
`plugin_init.rb` entry files do not fetch content or start workers.

## What is maintained

This repository is the authoritative home for maintained viewer source. The local
integration stack uses a mirror under `plugins/digital_viewer/`; mirror source,
tests, build files, templates and generated assets and verify byte identity before
local ASpace checks.
`src/` is authoritative JavaScript. `public/assets/digital_viewer.js` and its map
are generated and committed. Do not patch them by hand. ArchivesSpace needs no
Node/npm runtime. The parent React/PHP prototype is a separate product.

`frontend/` contains historical copies, explicitly marked in its README. Their
use across ArchivesSpace Staff and PUI is being reconciled. The plugin does not include the
old full `public/views/objects/show.html.erb` override; remove stale deployment
copies through the operator's installation procedure, not by overwriting whole
ArchivesSpace pages during troubleshooting.

## Visible behavior and fallback

The accepted local pilot types are a single image, an image sequence (including
scanned text), and PDF. Preservica/audio/video paths retain regression coverage;
they do not gain hosted playback acceptance from this refactor.

- Recognized Presentation 2 manifests render ordered pages through OpenSeadragon.
  Unavailable canvases retain their positions. This is not universal IIIF support.
- Direct HTTP(S) image URLs use a native image; PDFs use a frame and `Open PDF` link.
- Alternatives within a leaf Digital Object share one viewer. Separate linked
  objects stay separate, even when URLs repeat.
- Non-PDF candidates take precedence over a companion PDF; PDF-only objects use
  their PDF. Object/page modes preserve the existing download policy.
- Failed attempts advance within their group. A final slow attempt keeps waiting
  with `Still loading`; stale results cannot replace a newer attempt.
- Without JavaScript, the server says to enable JavaScript and reload. Blocked
  scripts have separate guidance. Original destinations remain available. A
  manifest original link may contain viewing data rather than readable pages.
- Browser PDF embedding restrictions can prevent inline display while direct
  access works. The plugin does not bypass those restrictions.

There is no general mutation observer or global `init` API. Full page reloads are
the normal way to recheck changed records; the internal initializer is tested for
safe reuse/replacement.

## Symptom-to-module map

| Symptom | Source / function | Reproduce or regress |
| --- | --- | --- |
| No viewer anywhere | head template; `entry.mjs`; `init.mjs` | `artifact.test.mjs`, blocked-script browser checks |
| One expected source missing | templates; `page-sources.mjs` → `auditSourceContract`, `collectGroups`; `source-selection.mjs` → `detectSource` | `startup.test.mjs`, `browser/diagnostics.mjs`, `browser/source-contract.mjs` |
| Wrong objects grouped / neighboring PDF used | `page-sources.mjs` → `findGroupRoot`; `source-selection.mjs` → `buildDescriptorSelection` | `digital_viewer.test.mjs`, `browser/startup.mjs` |
| Manifest fails | `adapters/manifest.mjs` → `mountManifest`; `manifest.mjs` → `extractManifestPages` | `adapters.test.mjs`, controlled-failure recipe below |
| Compass redirect/key fails | `adapters/compass.mjs` → `mountCompass`, `toLocalCantaloupeInfoUrl` | adapter and encoded-identifier tests |
| Preservica fails | `adapters/preservica.mjs` → `mountPreservica`; backend configuration | adapter/coordinator tests; separate playback gate |
| Tiles stall or old error returns | `viewer.mjs` → `mountOsdViewer`; `mount-sequence.mjs`; `lifecycle.mjs` | `browser/source-request-ownership.mjs` |
| Blank/stalled previews | `thumbnails.mjs` → `addThumbnailCarousel`; `tile-sources.mjs` → `buildThumbnailUrl` | `browser/thumbnail-queue.mjs` |
| Incorrect download | `viewer-modes.mjs` → `syncViewerModeActions`; `tile-sources.mjs` → `getTileSourceImageUrl`, `getCompanionPdfUrl` | download-policy tests; scanned-text/separate-object browser checks |
| Toolbar/keyboard failure | `controls.mjs`, `events.mjs` | `browser/viewer-lifecycle.mjs` |
| Duplicate viewer / removed metadata | `init.mjs`, `page-layout.mjs` | `browser/startup.mjs`, local layout checks |
| Original link missing | shared/additional-version/fallback ERB | `fallback_template_test.rb`, `browser/fallback-access.mjs` |
| Wrong served version / prefix 404 | asset-version Ruby helper, head template, proxy configuration | asset-version tests, module-build checks, release workflow |

Use module paths and function names, not generated line numbers. Browser source
maps map the committed bundle back to these files. Dated review records describe
their own candidate context; current source and tests remain the developer
reference.

## Diagnostics

Plugin warnings contain fixed stages and safe codes, never raw request URLs,
query strings, exception bodies or credentials. Browser/OSD/network messages may
still contain destinations; redact those before sharing logs.

| Diagnostic | Meaning |
| --- | --- |
| `stage=startup code=osd-unavailable` | OSD did not load; original links remain. |
| `stage=discovery code=source-contract-missing` | A producer marked a source as expected, but its `data-file-uri` is absent/blank. Inspect template/theme changes. |
| `stage=startup code=source-unavailable` | One source root could not be grouped. |
| `stage=startup code=group-unavailable` | One group failed during setup; later groups can continue. |
| `stage=configuration code=preservica-unavailable` | Preservica backend base is missing. |
| `stage=manifest/compass/preservica/viewer code=content-unavailable/manifest-unavailable` | Request, parsing, rendering or final-group failure; inspect Network to locate the failing service. |
| `stage=manifest code=invalid-canvas` | Preservica parser skipped an invalid canvas. |

No sources is a normal, quiet result. `data-dv-source-expected="true"` is emitted
only alongside plugin-owned source hints. Unsupported but nonempty URLs are not
contract failures. If another plugin removes both the source and expectation
marker, runtime cannot infer that lost content; compare server HTML/templates.

## Reproduce a success and a controlled failure

From the plugin root, use the pinned tool versions in `.nvmrc`/`package.json`:

```sh
npm ci
npm run check:generated
npm test
ruby test/asset_version_test.rb
ruby test/fallback_template_test.rb
```

With Playwright and Chrome installed in an external QA environment:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROME_PATH=/absolute/path/to/chrome \
node scripts/verify-browser.mjs --suite deterministic --output /tmp/viewer-browser.json
```

The request-ownership helper renders a real two-page IIIF sequence with vendored
OSD. It then fails a current page request and verifies the unavailable-page
message; an older failed request must not overwrite a replacement. The startup
helper additionally fails one manifest request while another object renders and
its original link remains keyboard-accessible. Read the JSON result and the
named helper to repeat that exact failure. No live record edits are needed.

For existing local ArchivesSpace fixtures, start the loopback content server for
the prepared records and sample files, then run the same command with `--suite local`. It checks real Rails markup,
no-JS/blocked scripts, native PDF rendering, scanned text, downloads, separate
objects and a single-image fixture. Fixture IDs are local, not production IDs.

For a real incident, record environment/commit/browser, compare one working
record, and inspect each request separately: bundle, manifest, info.json, tiles,
thumbnail and PDF. Check redirects/login responses as well as HTTP status. Do not
repair a service outage by changing source ranking or embedding credentials.
## Settings

The installed template reads **environment variables in the ArchivesSpace process**. It places public values into `window.DigitalViewer` before loading the JavaScript. Plugin-specific AppConfig mapping is not implemented. AppConfig still controls whether the plugin is enabled at all.

| Environment variable | Browser setting | Meaning / unset behavior |
| --- | --- | --- |
| `CANTALOUPE_PUBLIC_URL` | `cantaloupeBaseUrl` | Public IIIF Image API base, commonly ending in `/iiif/2`. Empty disables legacy file-key construction. Complete service addresses in manifests can still work without it. |
| `COMPASS_BASE_URL` | `compassBaseUrl` | Optional legacy Compass base. Its parsed hostname becomes `compassHost`; empty/invalid values disable Compass-specific matching. Similar-looking other hosts must not match. |
| `COMPASS_PROXY_URL` | `compassProxyUrl` | Optional resolver URL. Used for Compass-hosted sources only; converted manifests on other hosts load directly. Empty does not install or create a resolver. |
| `PRESERVICA_API_BASE` | `preservicaApiBase` | Optional companion-backend base. Code appends `/api/iiif/UUID/manifest.json`; avoid an accidental duplicated `/api/api/` path. Empty reports unavailable Preservica viewing while preserving original links. |
| `DIGITAL_VIEWER_LOADING_TIMEOUT_MS` | `loadingTimeoutMs` | Positive finite milliseconds; missing, empty, nonnumeric or nonpositive values fall back to 30,000. Does not change the 10-second thumbnail budget. |

No AWS or Preservica credentials belong here: these settings are visible to visitors. Changing environment values normally requires the host's agreed process restart; changing a shell variable in your own terminal does not reconfigure an already-running ArchivesSpace process.

The JavaScript has a historical `/iiif/2` internal default, but the supported template explicitly supplies an empty value when the environment is unset. If requests unexpectedly target ArchivesSpace's own `/iiif/2`, check missing/old config injection, a legacy file being loaded, or duplicate scripts before blaming Cantaloupe.

Asset URLs respect ArchivesSpace's `app_prefix` when available. The Ruby helper computes one SHA-256 value from the names and bytes of the main JS, CSS and bundled OSD, then adds it as `?v=...` to all three URLs. This asks the browser for a new version after a content change and returns to the old version after a byte-identical rollback. Modification times are not used. This value is **not** the checksum of an installation archive and does not cover every template or config setting.
