# Refactor validation — 18 September 2026

**Resolution, 21 September:** the same candidate passed the complete campus local suite; [DV-M08 completion](refactor-validation-2026-09-21.md). The original observations below remain dated history.

Status: **DV-M08 remains open for live image-service verification.** Developer
mapping, diagnostics, clean-package tests and PDF checks are implemented. Live
scanned-text validation is blocked by an image-service connection timeout; the
separate-object and single-image acceptance checks remain unverified in this run.
No hosted install, publication or record changes were performed.

## Exact artifacts and environment

- Tested runtime/template candidate: `7e43830b8ccdd6f26ad826a6803317f67bad6fe2`.
  Later evidence/documentation commits do not change those runtime bytes.
- Prior rollback artifact: `a5c5277` (DV-M07).
- Candidate archive SHA-256: `0ae28c83b6dd629d3eb44b77899dbba408722f6afdac33b6cd6dec372fe4207b`.
- Prior archive SHA-256: `bfc4dc5b614c0a57945b9b3f216be60d251507bbd956c9b0dc354daf1ce71e96`.
- Parent-only deliverables: `exports/dv-m08-20260918/` holds both archives,
  inventories and raw test evidence. Candidate/prior have 165/161 archive members;
  inventories distinguish regular files. No `.env`, Git metadata or node_modules
  were archived. Required entry/assets/source/build files and OSD notice are present.
- ArchivesSpace Docker image: `archivesspace/archivesspace:4.2.0`, PUI 18081;
  vendored OSD 5.0.1; Chrome 151.0.7922.174, macOS/Apple Silicon development host.
- Node 26.8.2; npm 11.19.1; esbuild 0.28.1; host Ruby 2.6.10p210.
  Ruby unit tests use host Ruby; actual template rendering is checked in ASpace.
- Existing public fixture server at loopback 18090 was restarted. Existing
  ArchivesSpace fixture records and public PDF/manifest files were not edited.

## Passed checks

All browser helpers were loaded from the fresh candidate archive extraction.
The live ASpace plugin mirror contains matching candidate runtime/template bytes.

| Check | Result |
| --- | --- |
| Clean extraction `npm ci`, generated comparison, `npm test` | 139 Node tests pass; all committed output reproducible |
| Ruby asset version | Pass, including content change/fixed-mtime and copied-byte identity |
| Ruby templates | 15 tests / 80 assertions pass |
| Safe diagnostics | 3 browser cases: absent and valid sources quiet; missing expected attribute logs fixed code only |
| Startup/layout/failure isolation | 6 cases; metadata/original links, keyboard access, reinit and replacement |
| Viewer keyboard/disposal | Desktop/mobile cases; document subscriptions removed |
| Request replacement | 2 real-OSD delayed/stale request cases |
| Thumbnail queues | 6 timeout/disposal cases with/without IntersectionObserver |
| Source contract | 20 deterministic markup cases and 7 real Rails pages |
| Fallback access | 42 deterministic cases and 27 real no-JS/blocked-script rows |
| Live module startup/source maps | 3 root/prefix/live-PUI checks |
| Real local PDF rendering | 12 rows: 1/4/35-page PDFs × Digital/Archival Object × desktop/mobile; native load progress and navigation checked |
| Real blocked PDF embedding | 2 rows; frame refusal and keyboard original-link access verified |

The diagnostic addition was tested red first: a missing expected attribute failed
the new Node assertion and three Ruby source-producing branches lacked the marker.
After implementation all checks above pass. It preserves compatibility discovery
and logs no raw source URL or exception body.

## Live image-service blocker

`runScannedTextChecks` timed out after 30 seconds on the initial page of local
Digital Object 879. The local six-page manifest completed successfully. Its
first image `info.json` XHR and nearby speculative metadata requests to
`https://digital.smith.edu/iiif/2/` remained pending. A separate direct curl to the
first `info.json` ended with connection timeout after 25 seconds (HTTP 000).
This establishes a service-reachability problem from this test environment; it
does not establish the cause or claim a global service outage.

No response interception was substituted for this live test. The deterministic
manifest/page tests passed, but do not establish real image delivery. The local
suite stopped at this failure, so scanned-text page/download checks,
`runSeparateObjectCheck`, and the final single-image fixture are **not accepted**
by this checkpoint. Historical 16 September results are not relabeled as current.

To close DV-M08 after service access recovers, rerun the immutable candidate:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROME_PATH=/absolute/path/to/chrome \
node scripts/verify-browser.mjs --suite local --output /tmp/viewer-local-recheck.json
```

Keep the original failed evidence and append the recheck/environment. If source
changes become necessary, create and verify a new immutable artifact.

## Rollback and remaining gates

The first local file-only rollback detected cached asset-length metadata and an
incomplete HTTP response. The candidate files were restored in `finally`.
The release workflow now requires a local ASpace restart at each asset switch.
The restart-based B → A → B rehearsal **passed**: served JS/CSS/OSD/map bytes and
the Ruby digest matched each immutable artifact, then returned to the candidate's
exact values. The restored candidate's browser startup/source-map smoke passed.
[Machine-readable evidence](evidence/dv-m08-2026-09-18.json) records every asset hash
and test result. The local mirror remains on the candidate; its 51 source/build/
test/runtime-template files match. The public fixture server remains on loopback
18090 for local verification.

Hosted Gates A/B remain open: operator configuration, actual PUI prefix/CSP/CORS,
off-campus access, full package/config rollback, review/approval and wider browser/
accessibility acceptance. Local asset rollback does not close hosted rollback.
Legacy Staff/frontend reconciliation remains WBL-0901; Preservica/audio/video
regression coverage does not add them to the accepted hosted pilot.
