# Tracing source adapters (DV-M05)

Start in `src/entry.mjs`, which creates a runtime and calls `init` once the DOM is
ready. The runtime discovers record sources, calls `source-selection.mjs`, creates
an owned mount attempt, and calls `mountDescriptor` for the chosen candidate.

```text
init.init → ranked candidate → mount-sequence → runtime.mountDescriptor
  → adapters/index.mjs registry
    → manifest.mjs    generic manifest request → parse pages → OpenSeadragon
    → compass.mjs     Compass proxy/redirect → parse pages → OpenSeadragon
    → preservica.mjs  backend manifest → group media → appropriate renderer
    → direct.mjs      IIIF info.json, static image, PDF, audio or video
  → success: complete attempt
  → failure/timeout: dispose attempt → try next ranked candidate
```

## Where to look

| Symptom | Maintained source |
| --- | --- |
| Wrong source chosen or PDF companion missing | `src/source-selection.mjs` |
| Wrong page count/order, missing-page placeholder or canvas metadata | `src/manifest.mjs`: `extractManifestPages` |
| Preservica content routed to wrong media renderer | `src/manifest.mjs`: `extractManifestContent`; `src/adapters/preservica.mjs` |
| Compass proxy, redirect or encoded S3 identifier problem | `src/adapters/compass.mjs` |
| Hosted manifest fetch or generic manifest failure | `src/adapters/manifest.mjs` |
| Static image loading or native PDF/audio/video markup | `src/adapters/direct.mjs` |
| Unsafe download/native media destination | `src/urls.mjs`, plus runtime download controls |
| A failed or late request overwrites a newer viewer | Runtime attempt/fallback coordinator; adapter active-attempt checks |

## Explicit adapter contract

`createSourceAdapters(dependencies)` composes the adapters once per runtime.
Dependencies include configuration, fetch/DOM/timer APIs, renderers, status
callbacks and attempt ownership helpers. Every mount receives
`(container, descriptor, mountOptions)`. Options carry the existing attempt,
AbortSignal, timeout/fallback policy and companion-PDF destination. Adapters do
not choose the next candidate or own the record's fallback order.

The runtime catches both synchronous exceptions and rejected mount promises.
It aborts and disposes the old attempt before advancing. Request adapters check
ownership before parsing a response and again before rendering a parsed body;
a late response cannot replace the fallback. Static image cleanup settles its
pending load when the owner disposes it. Native PDF/audio/video markup mounts
synchronously; the current plugin does not detect every subsequent browser
playback or iframe loading failure. Their original links remain available.

## Parsing and Compass isolation

`extractManifestPages` retains the existing Presentation 2 canvas order, missing
canvas slots, service identifiers and page/download metadata. Its default service
mapping simply adds `/info.json`. The Compass compatibility adapter supplies the
legacy service URL rewrite through an explicit callback. That composition keeps
existing rewriting behavior for hosted manifests containing legacy service URLs.

`extractManifestContent` retains the existing Presentation 3 media grouping used
by Preservica. An optional invalid-canvas callback lets the adapter retain the
existing sanitized warning without giving the parser a console dependency.
This extraction does not expand IIIF format support or alter parsing policy.
Raw metadata destinations still pass through the existing URL policy before
becoming actionable viewer/download/native-media links.

The generic adapter receives request/parsing callbacks; it has no Compass host,
proxy or S3 rewrite logic. `adapters/index.mjs` supplies those compatibility
callbacks today. WBL-0905 can replace this wiring and remove `adapters/compass.mjs`
without rewriting generic rendering. Detection/descriptor cleanup still belongs
to that cutover task. The historical `compass-manifest` descriptor string remains
unchanged; generic implementation names are now `mountManifest` and
`extractManifestPages`.

## Verification

Run the [build and test commands](plugin-build.md). Tests cover all previous
regressions plus pure parsing, explicit signals/context, Compass redirects,
request/body/renderer failures, missing Preservica configuration, cancellation
before and after response parsing, native media and direct-image/PDF fallback.
`test/adapters.test.mjs` tests the adapter boundary;
`test/digital_viewer.test.mjs` exercises the real coordinator.

The distributed script and source map remain generated artifacts. Viewer/UI extraction is documented in [DV-M06 ownership](plugin-viewer-lifecycle.md);
page integration is documented in [DV-M07 startup](plugin-startup.md); no deployment build step is introduced.
