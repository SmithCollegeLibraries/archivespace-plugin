# Campus recheck and DV-M08 completion — 21 September 2026

Status: **DV-M08 COMPLETE locally. DV-M01–DV-M08 are now complete.**
The campus recheck closes the live image-service gate left open on 18 September.
Lyrasis installation/release Gates A/B remain open; no push or hosted change was made.

## Same immutable candidate

- Runtime/template artifact: `7e43830b8ccdd6f26ad826a6803317f67bad6fe2`.
- Candidate archive SHA-256: `0ae28c83b6dd629d3eb44b77899dbba408722f6afdac33b6cd6dec372fe4207b`.
- A fresh extraction of the saved archive supplied the browser runner and helpers.
  Ninety-three source/public/build/test files matched the mounted plugin. All four
  served assets, the Ruby asset version and the source-expectation marker matched.
- ArchivesSpace 4.2.0, OpenSeadragon 5.0.1, Chrome 151.0.7922.174, Node 26.8.2.
  Existing PUI 18081 and loopback fixture server 18090 were already running.
- No runtime, template, configuration, fixture content or record changes were needed.

The previously blocked `digital.smith.edu` info.json request returned HTTP 200 in
0.314 seconds from the campus environment. All local tests used real responses;
no image/PDF response interception or substitute content was added.

## Full local suite passed

| Check | Evidence |
| --- | --- |
| Module startup and source maps | 3 checks, including live PUI startup and root/prefix map fixtures |
| Real Rails source contract | 7 record checks |
| No-JS/blocked-script fallback | 27 rows |
| Native PDF rendering/navigation | 12 rows: 1/4/35-page PDFs across Digital/Archival Objects and desktop/mobile widths |
| Real blocked embedding/direct access | 2 rows |
| Scanned text | 4 rows: DO 879 / AO 4109 at 1280/390px; all six pages load in order, thumbnails load, zoom and page-download actions pass |
| Separate image/PDF objects | AO 4110 retains distinct source groups; six-image viewer and four-page PDF stay separate, including PDF download ownership, at both widths |
| Single image | DO 869 loads its image fully |

The scanned-text checks also observe successful replacement-service tile responses
and zero Compass-origin requests while viewing the converted sequence. Download
checks verify the current page's link and object/page-mode visibility; they do not
claim a full-resolution download acceptance test.

[Machine-readable campus evidence](evidence/dv-m08-2026-09-21.json) contains the
observations and asset hashes. Raw output is retained in the parent workspace at
`exports/dv-m08-20260921/`.

## Evidence continuity and remaining release work

The [18 September report](refactor-validation-2026-09-18.md) and failed image-service
observations are preserved as history. Its 139 Node tests, 15 Ruby template tests /
80 assertions, asset-version checks, deterministic browser tests, clean-package
verification and restart-based B → A → B rollback still apply to the unchanged
candidate. They were not unnecessarily repeated for this connectivity-only recheck.

The full local suite was rerun using `scripts/verify-browser.mjs --suite local`
from the fresh archive extraction with the QA environment's Playwright and Chrome.
See [the maintenance guide](plugin-maintenance-guide.md) for the reproducible command.

Local completion does not close hosted operator configuration, actual proxy/CSP/
CORS/off-campus checks, full hosted package/config rollback, review/approval or
broader accessibility/browser acceptance. The legacy Staff/frontend reconciliation
remains WBL-0901. No additional pilot media scope is implied.
