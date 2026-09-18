# Following a page load (DV-M07)

This is the current source path from an ArchivesSpace record page to its viewer.
The ERB templates still supply configuration, source hints, page context and
original links. The generated bundle runs the maintained modules below.

```text
entry.mjs           read configuration; start when the DOM is ready
  runtime.mjs       construct modules and pass their dependencies
    init.mjs        collect groups → select sources → reuse/create container
                    → place container → start ranked mounts → remove obsolete mounts
      page-sources.mjs   source hints, compatibility selectors, grouping/deduplication
      page-layout.mjs    page context, stock/leaf/inline placement and restoration
      source-selection.mjs  detection, priorities and companion selection
      mount-sequence.mjs    attempt creation, deadline, success/fallback
        adapters/           request/parse/render selected content
        lifecycle.mjs       cancellation and resource disposal
```

`runtime.mjs` is now a 66-line composition root. `init.mjs` is approximately 100
lines and names the startup steps explicitly. Factories own their local state;
no cross-module mutable global or browser test hook is introduced. Lifecycle
receives a layout-release callback, and layout receives the current active states
when restoring a pane; neither module imports the other.

## Discovery and layout

`page-sources.mjs` owns the [template attribute contract](plugin-source-contract.md)
and legacy CSS/definition-list selectors. Groups use DOM-root identity. Duplicate
URLs within one group are alternatives; the same URL in separate linked objects
still produces separate viewers. A leaf Digital Object groups its alternatives
at the record pane. Synthesized `render-N` values remain instance-local.

`page-layout.mjs` reads `data-dv-page-context`. Leaf Digital Object pages get the
existing metadata/viewer columns; stock pages retain separate linked objects;
missing panes use adjacent inline viewers. Original record nodes and links are
moved, never recreated. Lifecycle restores the original leaf layout after the
last active mount is removed.

## Reinitialization and failures

For each group, startup compares the supported source URLs in discovery order
with the mounted group's signature. An unchanged attached mount is reused.
Changed sources dispose the old attempt and replace its container. Groups no
longer discovered are disposed after the scan. A source without an insertion
location is disposed immediately instead of retaining a detached mount state.

A group setup exception is caught locally, its partial mount is disposed, and
startup continues with the next group. A fixed diagnostic is logged without raw
URLs or exception text. Source-root grouping failures are likewise isolated.
The server-rendered original links and fallback guidance remain available.

`mount-sequence.mjs` runs each adapter through a promise boundary, so synchronous
throws and rejected requests follow the same cancellation/fallback path. It
preserves the final slow-attempt behavior and deadline ownership established in
DV-M06. One group's source failure does not cancel another group's work.

A failure before discovery itself (for example a script blocked entirely) still
uses the server-rendered DV-M02 guidance and original links. This ticket does not
add runtime recovery from arbitrary host DOM corruption.

## Tests and next work

`test/startup.test.mjs` checks grouping and module boundaries. Existing source
integration tests retain reinitialization, replacement, layout restoration and
fallback coverage; a new setup-failure test proves the next object still mounts.
`test/browser/startup.mjs` exercises the unmodified bundle through stock, leaf,
inline, partial setup, synchronous renderer and asynchronous request failures.
It captures the normal DOM-ready callback in the fixture to repeat initialization;
production exports no global initializer. It also checks replacement, original
metadata/link preservation and keyboard access to the original destination.

DV-M08 consolidates the full developer map and assembled-plugin validation. Build
instructions remain in [the build guide](plugin-build.md), with request adapters
in [the adapter trace](plugin-adapters.md) and ownership in
[the viewer/lifecycle guide](plugin-viewer-lifecycle.md).
