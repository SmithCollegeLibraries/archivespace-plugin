# Viewer modules and resource ownership (DV-M06)

DV-M07 moves page scanning/layout and ranked mounting into [startup modules](plugin-startup.md); `src/runtime.mjs` is now a 66-line composition root.
The viewer implementation is now divided by responsibility:

| Module | Responsibility |
| --- | --- |
| `lifecycle.mjs` | Creates attempts; owns group states, cancellation, deadlines, cleanup and layout-release callback. |
| `viewer.mjs` | OpenSeadragon construction/opening, source-request identity, tile failures and loading state. |
| `controls.mjs` | Zoom, rotation/flip/image adjustments, toolbar visibility and page navigation. |
| `events.mjs` | Viewer/attempt-owned document subscriptions and their disposal guards. |
| `viewer-modes.mjs` | Object/page modes and safe image/PDF download actions. |
| `thumbnails.mjs` | Visibility observation, serial preview queue, preview deadlines and page buttons. |
| `prefetch.mjs` | Nearby `info.json` warming and single-image preload; attempt-scoped deduplication. |
| `tile-sources.mjs` | Pure tile-source, thumbnail and safe download URL helpers. |

All factories receive browser APIs and callbacks from the runtime. No new global
hooks or dependencies are introduced. OpenSeadragon remains the separately
vendored library; the modules compile to the same single served viewer script.

## Ownership and disposal

| Resource | Owner | Disposal |
| --- | --- | --- |
| Manifest/proxy/backend requests | Current mount attempt | Shared AbortController aborts before fallback/group removal. Adapters check active ownership before rendering. |
| Nearby metadata prefetch | Current mount attempt | Same attempt signal; deduplication is per attempt so cancelling one group does not suppress another group's request. Errors are nonfatal. |
| Single-image speculative preload | Current mount attempt | Attempt cleanup removes `src`. |
| Group deadline | Lifecycle | Clears on completion/disposal; alternatives advance once. A final slow attempt stays active with a loading message. |
| Standalone OSD open deadline | Viewer module | Clears on open, failure or viewer destruction; destruction settles the pending promise. Normal runtime mounts use the group deadline. |
| First-tile loading timer | Viewer module | Clears on tile readiness or viewer destruction. |
| Thumbnail deadline, active preview and queue | Carousel | At most one active preview per carousel. Completion/error/timeout releases its slot; disposal clears the timer, removes listeners/active `src`, drops queued work. |
| IntersectionObserver | Carousel | Disconnects on viewer destruction or attempt cleanup. Saved observer/image callbacks are inert after disposal. |
| Document click/Escape listeners | Controls' viewer scope | Removed on `before-destroy` or attempt cleanup. Saved callbacks check the disposed scope. This closes the document-listener follow-up. |
| OpenSeadragon event listeners/requests | OpenSeadragon viewer | Viewer destruction clears the library's handlers and requests; plugin attempt/source identity checks protect replacement mounts. |
| Button/slider/scroll listeners on generated elements | Generated UI subtree | Subtree is removed with the group/viewer. The detached subtree and its listeners can be collected; no document subscription retains it. |

`disposeAttempt` is idempotent: mark inactive, clear deadlines, abort, destroy the
viewer, run cleanup callbacks. A throwing viewer teardown cannot skip the other
cleanup callbacks. Thumbnails also register with the attempt so cleanup still
runs if a renderer's destruction fails. Group disposal then removes the container
and releases layout through an injected callback; lifecycle never imports layout.

The low-level standalone APIs used by unit tests can run without an attempt.
Production runtime mounts always provide one. Direct callers of prefetch helpers
must supply an owned attempt if they need cancellation; the helpers' unowned mode
is only a best-effort cache warmer. Calling `viewer.destroy()` releases viewer
resources; removing the complete record group is the lifecycle owner's operation.

## Viewer interface consumed by controls

`controls.mjs` uses the existing OpenSeadragon surface:

- `viewport`: zoom/fit, rotation and flip methods; zoom conversion methods are
  checked before use.
- Viewer: `isFullPage`, `setFullPage`, optional `forceRedraw`, `addHandler`,
  `goToPreviousPage` and `goToNextPage` for sequences.
- Image target: viewer canvas/drawer element for CSS adjustments.
- Events: `animation`, `open`, `full-page`, `page`, and `before-destroy`.

Thumbnail page buttons use `goToPage`; mode/download controls consume `page`
events and page descriptors. Thumbnail failures only affect their preview slots;
they do not reject a successfully mounted main viewer.

## Verification and debugging

Run the [build/test commands](plugin-build.md). The existing request-ownership,
thumbnail, download-policy and fallback regressions remain in
`test/digital_viewer.test.mjs`. `test/lifecycle.test.mjs` adds module boundaries,
attempt disposal, prefetch cancellation/error isolation and standalone deadline
cleanup. Tests call explicit APIs; browser tests run the unmodified bundle.

`test/browser/viewer-lifecycle.mjs` checks keyboard adjustments, Escape, page
navigation, the page download destination and document subscription removal at
1280px and 390px. Existing browser request-ownership checks cover rapid page
replacement; thumbnail checks cover first/middle stalled previews and disposal,
with and without IntersectionObserver. Hosted deployment remains a separate gate.
