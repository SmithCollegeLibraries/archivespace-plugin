# DV-M09 — Refactor review follow-up

The M08 completion report remains a historical record of candidate `7e43830`.
This is a separate correction ticket; the new runtime does not inherit a claim
that the full campus suite has already been rerun against it.

## Findings and disposition

| Finding | Assessment and action |
| --- | --- |
| Duplicate representative viewers | Confirmed. Nearest match in a combined selector can split the anchor and hint. Explicit source-group ancestry now wins before legacy selectors. Both DigitalObject and ArchivalObject parent fixtures are covered. |
| Per-request asset hashing / page failure | Confirmed. Cache by normalized plugin root under a process mutex. Missing/unreadable files yield a fixed diagnostic and cached fallback version instead of raising through the layout. Restart after asset updates or repair. |
| Adjust aria-controls | Confirmed. Popover now uses the exact ID assigned to its button. |
| Preservica loading notice | Confirmed for native video/audio/PDF mounts following a slow manifest. Clear the notice after mounting; image readiness remains OSD-owned. This does not establish production Preservica playback support. |
| README/config drift | Confirmed in the parent mirror README; the standalone README already documented empty configuration and content hashing. Correct parent documentation and remove the overwritten Compass host default and implicit Cantaloupe default. Thus the review's whole-tree byte-identity claim was too broad. |
| Static-image reset | Confirmed class loss. Reset before adding dv-active; retain the adapter reset so direct adapter calls remain usable. |
| Fallback “link above” | Confirmed for destinations excluded by the link policy. Only refer to a link when one is rendered; preserve JavaScript guidance. |
| Manifest tautology | The final truthiness check in hasRenderablePages is redundant after the truthy tileSource guard. It does not change current behavior. Deferred; supported source-shape validation deserves its own scope. |
| Repeated deadlines | The outer timer covers fetching and mounting; renderer timers also protect direct mounts. Duplication exists, but deleting a timer is not demonstrated safe. Defer consolidation with final-attempt and cancellation coverage. |

## Verification

Before implementation, focused Node regressions failed for grouping, ARIA,
native-media notice clearing, static-image activation and empty configuration.
Ruby tests reproduced missing-asset exceptions, lack of process caching and
misleading fallback copy. Chrome using the original bundle failed the added
parent representative case: expected one mount, observed two.

After implementation:
- 145 Node tests pass; generated bundle check passes.
- Ruby asset-version checks pass (process cache, fresh-process content changes,
  copy/mtime independence, missing assets).
- 15 Ruby template tests / 82 assertions pass.
- Chrome deterministic suite passes: 3 diagnostics, 6 startup, 2 lifecycle,
  2 request ownership, 6 thumbnail, 24 source-contract and 42 fallback rows.
- Local ASpace was restarted: PUI HTTP 200, all four served assets and Ruby
  version match the tested files, and live PDF startup/source maps pass.
  Ninety-one source/public/test files match the parent mirror.
- Browser evidence is recorded in `evidence/dv-m09-2026-09-21.json`.

Browser fixtures render the actual plugin ERB with helper substitutes; they do
not replace a hosted ArchivesSpace test. The campus live service suite and hosted
Gates A/B are not newly claimed for this correction. No records, remote services,
push or hosted install are part of this ticket. Parent mirror/tracking remains
uncommitted; the standalone completion hash is recorded in the parent ledger.
