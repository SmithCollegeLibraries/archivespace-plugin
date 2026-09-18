# DV-M03: template-to-viewer source contract

Date: 2026-09-18. Scope: ArchivesSpace PUI plugin. This extends the existing
attribute contract; it does not replace source detection, priorities or grouping.

## Producers and consumers

| Attribute | Producer | Consumer / meaning |
| --- | --- | --- |
| `data-dv-page-context` | `_digital.html.erb`, one context marker | `getPageContext()` locates record context. |
| `data-record-type` | Same marker, Ruby record class name | `classifyPageContext()` identifies DigitalObject vs other pages. |
| `data-has-children` | Same marker, `true`/`false` | Leaf Digital Objects may use one shared viewer/layout; parents retain separate groups. |
| `data-dv-source-group` | Representative root, Digital Object entry list, each entry/thumbnail wrapper | `findGroupRoot()` and `findInsertAfter()` preserve group boundaries and placement. IDs describe rendered blocks, not persistent ASpace records. |
| `data-file-uri` | Entry/thumbnail wrapper with an outbound link; plugin wrapper around stock representative rendering; additional-file-version `li` | `collectSourceAnchors()` finds it; `collectFileUris()` reads `dataset.fileUri` before `href`. A source element need not itself be a link. It must have the same published destination as its original link. |
| `data-dv-browse-only` | Representative group when it links to browsing the collection's digital materials | Scanner excludes the whole subtree even if legacy selectors match its links. |
| `data-additional-file-version` | Additional-version `li`, retained from ASpace | Existing compatibility selector and group boundary. |
| `data-rep-file-version-wrapper` | Stock ArchivesSpace representative partial | Legacy discovery compatibility only; plugin-owned source wrapper no longer depends on its direct-child anchor structure. |

No source URL is invented for an unlinked thumbnail. A local record-navigation
URI can still be present on a representative wrapper; existing detection rejects
it as a non-renderable source. Browse-only groups are explicitly excluded.
Fallback text links from DV-M02 are not new independent source groups. Duplicate
URLs within a group are deduplicated; identical URLs in distinct groups remain
distinct. Leaf Digital Object grouping still takes precedence when the stock
record pane and child context are available.

`findGroupRoot()` still synthesizes `render-N` when a compatibility source has no
explicit group marker. This remains runtime-local fallback state, not an ID that
should be written into records or persisted across requests.

## Escaping and compatibility

ERB escapes each new `data-file-uri` value. The browser must decode it back to the
exact original URL (including query separators), without double encoding an IIIF
identifier. The Digital Object entry-group attribute is now literal conditional
markup: emitting an entire attribute via `<%= ' ... ' %>` let Rails escape its
quotes and produce the wrong dataset value in the actual page.

Existing stock/theme selectors remain for markup outside these plugin templates.
The File URI definition-list fallback remains unchanged. Cosmetic-class changes
and added wrappers no longer prevent discovery of plugin-owned source hints.
This does not promise compatibility with removal/renaming of the contract itself,
a new Rails record shape or changed stock layout panes.

## Remaining upgrade assumptions

- ASpace still renders these partials with the current `record`, `dig_objs`, `fvs`
  and representative-file locals. Publication filtering remains ASpace's job.
- The stock representative partial is still available; plugin wrapping does not
  substitute its caption/browse behavior.
- `#notes_row > .resizable-content-pane` remains the layout/leaf-group signal.
  The browser mutation tests intentionally preserve it; arbitrary layout changes
  still need upgrade review.
- Stock additional-version markers and File URI labels remain compatibility
  assumptions where no explicit source hint is supplied by the plugin.

## Verification and upgrade smoke check

`ruby test/fallback_template_test.rb` verifies URI attributes, escaping, source
branches, browse and thumbnail-only exclusions. `node --test test/*.mjs` retains
existing grouping/fallback/download regressions and tests browse-subtree exclusion.

`runSourceContractChecks(browser, pluginRoot)` in
`test/browser/source-contract.mjs` runs the served script against actual plugin
ERB rendered with minimal Rails-helper substitutes. Twenty cases exercise ten
shapes with original markup and with renamed cosmetic classes, removed stock
representative marker and newly wrapped links. It checks exact source values,
viewer counts and separate image/PDF mounting. It does not claim full image/PDF
rendering or real-Rails escaping from those fixtures alone.

`runLocalSourceContractChecks(browser)` verifies the attributes from real local
ASpace 4.2.0 pages, original published destinations, absence of malformed quoted
group values, representative/additional versions and thumbnail-only exclusions.
It defaults to local port 18081 and edits no records.

For an upgrade, run both helpers, then verify a working single/sequence viewer
and separate linked objects on the new version, plus DV-M02 disabled/blocked-script
checks. Confirm both Digital Object and Archival Object page types, representative
and additional-version branches, child vs leaf layout, readable original links,
collection browse navigation and absence of unpublished source URLs. Preserve
fixture identities and record exact runtime/ASpace/browser versions in evidence.
