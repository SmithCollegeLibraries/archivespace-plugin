# Building and debugging digital_viewer (DV-M04–07)

The maintained viewer source is now `src/`. `public/assets/digital_viewer.js` and
`digital_viewer.js.map` are generated and committed together. ArchivesSpace still
loads one classic script, preceded by vendored OpenSeadragon; no Node/npm or build
step is needed on its host. CSS, Ruby templates and OpenSeadragon remain separate.

## Source map

| File | Responsibility |
| --- | --- |
| `src/entry.mjs` | Reads browser configuration/dependencies and starts at DOM readiness. |
| `src/config.mjs` | Pure configuration copying/normalization and loading timeout parsing. |
| `src/source-selection.mjs` | URL classification, priorities, primary and companion selection. Receives config explicitly. |
| `src/manifest.mjs` | Presentation 2 page parsing and Presentation 3 media grouping. No DOM or configuration dependency. |
| `src/adapters/` | Manifest, Compass, Preservica and direct media mounts. See the [adapter trace](plugin-adapters.md). |
| `src/urls.mjs` | Shared URL policy for native media and download links. |
| `src/runtime.mjs` | Composition root wiring explicit dependencies. |
| `src/init.mjs`, `src/mount-sequence.mjs` | Group initialization and owned ranked mount attempts. |
| `src/page-sources.mjs`, `src/page-layout.mjs` | Source discovery/grouping and stock/leaf/inline layout. |
| `src/status.mjs` | Safe status messages, loading notices and original-link construction. |
| `src/lifecycle.mjs`, `src/viewer.mjs` | Attempt ownership and OpenSeadragon setup/request handling. |
| `src/controls.mjs`, `src/viewer-modes.mjs` | Navigation/adjustments and object/page/download actions. |
| `src/thumbnails.mjs`, `src/prefetch.mjs` | Bounded preview loading and owned speculative requests. |
| `src/events.mjs`, `src/tile-sources.mjs` | Disposable external listeners and pure tile/download helpers. |
| `scripts/build.mjs` | Reproducible bundle/map generation, watch mode and stale-output check. |

The runtime factory returns an explicit capability object for source tests and
later module extraction. Entry uses only `init`; no test hooks are attached to
`window`. DV-M07 reduces the composition root to 66 lines. Follow [page startup](plugin-startup.md) and the [viewer ownership guide](plugin-viewer-lifecycle.md). Current function names remain searchable in the modules above. Generic manifest
functions are now `extractManifestPages` and `mountManifest`; the historical
`compass-manifest` descriptor value is preserved for compatibility.

## Development and verification

Pinned development environment: Node **26.8.2** (`.nvmrc`), npm **11.19.1**
(`packageManager`/engines), esbuild **0.28.1** (exact dev dependency and lockfile).
The installed esbuild optional platform binary works without dependency install
scripts; `.npmrc` disables them. No development dependency is added to the browser.

From the standalone plugin root:

```sh
npm ci
npm run check:generated  # detects stale/missing committed output without overwriting it
npm test                # rebuild + source tests + unmodified artifact startup tests
ruby test/asset_version_test.rb
ruby test/fallback_template_test.rb
npm run build:watch     # optional; Ctrl-C stops it
```

After editing source, use `npm run build`, or let watch mode rebuild; reload the
local PUI. Run the existing `test/browser/README.md` checks against the generated
artifact for behavioral changes. Commit source, lockfile changes (if any), bundle
and map in the same ticket commit. Never hand-edit the generated script or map.
`npm run check:generated` builds in memory with writes disabled and compares both
outputs; it fails rather than repairing stale artifacts. CI checks this **before**
`npm test`, because the latter intentionally regenerates files. CI workflow is
added here but a remote CI run is not claimed until publication.

The build targets ES2017 syntax and uses no minification or runtime code splitting.
This is not a browser-API polyfill: existing feature guards and browser checks still
apply. Node/npm are developer-only requirements. Official tool reference:
[esbuild API](https://esbuild.github.io/api/).

## Debugging and asset versions

The script ends with a relative `digital_viewer.js.map?v=<map SHA-256>` reference.
The map includes public source contents and repository-relative paths, so browser
DevTools can show the maintained modules. No local absolute paths or secrets are
embedded. Changing source comments can change the map; its hash changes the script,
and the existing Ruby asset digest then invalidates that script too. The source
map itself is not required for viewing content.

Relative map resolution preserves a PUI URL prefix. The template retains its
existing `app_prefix` behavior; deployment must still verify its actual proxy,
CSP and map MIME/availability. No `type=module`, new script origin, eval permission
or import map is introduced. If a host declines to serve maps, retain the matching
map in the release for manual DevTools loading; do not regenerate against a moving
branch. Release tests must exercise the extracted package, not just `src/`.

## Tests after harness migration

- `test/digital_viewer.test.mjs`: all 71 existing regressions retained, now calling
  imported source APIs and a runtime instance with explicit dependencies. Its
  small DOM shim remains; it no longer rewrites an IIFE or runs altered script text.
  Its detection/ranking bindings call the exported pure functions directly.
- `test/modules.test.mjs`: configuration isolation, explicit detection config,
  encoded identifiers, selection policy and linked-map digest/source content.
- `test/build.test.mjs`: a clean source copy in another directory produces
  identical output; a source-map-only change changes the script's versioned map link.
- `test/artifact.test.mjs`: runs the **unmodified** generated script in a VM to
  verify DOM readiness, blocked OSD behavior and absence of global test hooks.
- `test/adapters.test.mjs`: pure parser contracts, explicit adapter mount/request context and Compass redirect handling. Additional coordinator regressions in `digital_viewer.test.mjs` cover request/body/renderer failures, missing configuration, cancellation and native media.
- `test/lifecycle.test.mjs`: extracted factory boundaries, disposal/deadline and prefetch ownership/error regressions. Browser keyboard and listener-disposal checks are in `viewer-lifecycle.mjs`.
- `test/startup.test.mjs` and `test/browser/startup.mjs`: group identity, repeated startup, layout/replacement and isolated setup/renderer/request failures.
- Browser helpers continue to load `public/assets/digital_viewer.js` unchanged,
  covering real DOM behavior, failures, grouping, requests and thumbnail cleanup.

## Parent mirror and legacy copies

Maintain the standalone repository first. Mirror `src/`, `scripts/`, package and
lock files, tests, and generated JS/map to parent `plugins/digital_viewer/` when
updating its Docker mount. Verify byte identity; do not copy `node_modules`.
Use `npm --prefix plugins/digital_viewer ci` and `npm --prefix plugins/digital_viewer test`
from the parent when needed. The parent React frontend's build is unrelated.

Files under this plugin's `frontend/` are historical staff-side copies, not
maintained viewer source. They remain packaged unchanged pending WBL-0901's
separate host/Staff/PUI reconciliation; do not patch them or use them as inputs to
this build. `frontend/README.md` marks this explicitly. This ticket does not close
WBL-0901 or authorize deleting those files.
