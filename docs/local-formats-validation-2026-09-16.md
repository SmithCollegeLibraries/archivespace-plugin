# Local PDF and scanned-text validation — 2026-09-16

Status: requested local fixture/testing subtask completed. **Not Lyrasis installation approval.** Rob remains approver; these are implementer observations, not independent review.

Runtime remains `0c1ca140a51a28b93b8895b19b5b869ce0c9a5d5`, with asset digest `26102a571fd06034f4d7e68aa902535a34ff1def31a8ba8f0e82536914a947ec`. No viewer, CSS, template, backend or host-policy change was needed. New browser assertions and their README are mirrored into the parent plugin. Both copies retain 63 passing Node tests; Ruby asset-version checks and new JavaScript syntax checks pass. ASpace 4.2.0 serves the parent copy at `http://localhost:18081` with the existing left sidebar configuration.

Final read-only GET/hash checks match all three served assets to disk. New browser-probe SHA-256: `46d01ccfdde1e4222b92972cda7df4c399b0c534cb6c345ed568676de9d18709`. Full `public/`, `frontend/` and `test/` directory comparisons pass between copies, as does guide parity. Final API readbacks verify all twelve fixture identities, the original resource's nine children, and unchanged File Versions on pilots 863/864/867/869. Local `readbacks.json` records these checks without session credentials.

## Scope correction

Rob relayed Special Collections' three object types: a multipage TIFF-backed image sequence (including scanned text), a single image, or a PDF. **No mixed-media objects are required for this pilot.** Updated both implementation-guide copies accordingly. Mixed *available/unavailable canvases* still require failure coverage; that is not mixed media. Existing companion-PDF unit tests remain useful regression coverage and were not deleted.

An Archival Object may still link two separate Digital Objects. One new fixture links the six-page image object and a distinct PDF object to verify isolation; it does not fabricate an image-plus-PDF object.

## User-supplied sources and local records

All IDs in this table are **local repository 2**, not hosted record IDs. Each new title starts `LOCAL ONLY`; identifiers start `dv-format-20260916`. The new collection is resource **3**, separate from the existing nine-AO QA collection (resource 2). Created 12 records: one resource, five Digital Objects and six Archival Objects. No existing record was posted/updated.

| Source | Local Digital Object / Archival Object | Test content |
| --- | --- | --- |
| [Having Our Say](https://compass.fivecolleges.edu/islandora/object/smith%3A1339838) | 875 / 4105 | Unmodified local copy of `2023-07/view_6703.pdf`; 35 pages |
| [What It Is, May 1973](https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00730_as506331_001) | 876 / 4106 | Unmodified local copy of the supplied object's PDF; 1 page |
| [What It Is, July 1973](https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00730_as506333_001) | 877 / 4107 | Unmodified local copy of the supplied object's PDF; 4 pages |
| Same May 1973 PDF, original Compass file URL | 878 / 4108 | Real `X-Frame-Options: SAMEORIGIN` refusal; working direct access |
| [20/20, 1983](https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541945) | 879 / 4109 | Six scanned images, converted local manifest and linked stored thumbnail |
| Separate linked Digital Objects 879 and 877 | — / 4110 | Two independent source groups/viewers, image then PDF |

The new text example is **scanned text, not a plain `.txt` document**. Its public Compass node is 1373239; the source manifest has six canvases, retained in order. Service-image dimensions are 3536×4525, 3545×4538, 2191×3534, 2178×3533, 2185×3538 and 3216×4575. Source production AO 541945 is provenance, not a local identifier. Compass also offers a PDF derivative of this object; it was not added as a mandatory companion fixture.

The local manifest points to `https://digital.smith.edu/iiif/2/2025-10%2Fsmith_ssc_ms00237_as541945_p0001.tif` through `p0006.tif`, with the source's stored S3 thumbnails. No manifest was published remotely; no Compass token/settings were copied. This checks these particular public services, not a general TIFF-availability or restricted-content claim.

## Browser results

Real Chrome 151, existing ASpace 4.2.0 and vendored OSD 5.0.1; no intercepted image/PDF responses. Checked-in assertions: [local-formats.mjs](../test/browser/local-formats.mjs). [Machine-readable observations](evidence/local-formats-2026-09-16.json) record IDs, source URLs, dimensions, layouts, headers and counts.

- **12 PDF rows pass:** three PDFs × Digital Object/Archival Object × 1280/390px. HTTP 200 record pages, original links and `Open PDF` visible, correct source, one PDF viewer, no image viewer, no page/viewer horizontal overflow. Chrome's native PDF viewer reports load progress 100 and page counts 1/4/35. The multipage PDFs scroll first→last→first. Screenshots were visually inspected; iframe `load` alone is not counted as rendering proof.
- **Two real blocked-embed rows pass:** DO 878 and AO 4108 show Chrome's frame refusal for the original Compass PDF. Focusing `Open PDF` and pressing Enter opens a new tab that renders the one-page PDF. The blocked frame itself remains a browser error panel; the plugin does not claim it rendered successfully or circumvent the header. This is usable fallback, not attractive inline presentation or hosted acceptance.
- **Four scanned-text rows pass:** DO 879 and AO 4109 at 1280/390px. All six pages navigate in order and their current viewport tiles fully load; all six thumbnails load. Keyboard thumbnail navigation/zoom work. Object mode hides the page-image download; page 6 exposes its own image URL; Back to object hides it. No Compass-origin requests occur while viewing the converted sequence.
- **Linked thumbnail-plus-out-link branch passes:** AO 4109 renders the manifest anchor as `a.thumbnail`, not the external-link class. The original image/link remains visible and one viewer is mounted. This closes the previously missing local entry-list branch fixture.
- **Separate-object isolation passes:** AO 4110 has `digital-0` and `digital-1`, six-image and four-page-PDF viewers respectively. The image viewer has no PDF download/link from its neighbor. Both original links remain visible and both viewers fit at 1280/390px.
- **No-JavaScript PDF access passes:** DO 876 and AO 4106 retain visible original PDF links and create no plugin viewer.
- **Dated localhost-origin observations:** six `info.json` responses and first/last 512-pixel JPEG requests return 200 with `Access-Control-Allow-Origin: *`; `Vary` includes `Origin`. The May PDF returns 200/application/pdf with `X-Frame-Options: SAMEORIGIN`. These do not establish future Lyrasis-origin/CSP/off-campus behavior.

The harness uses Chrome-specific native-PDF metadata only for the PDF assertions. Chrome may defer off-screen PDF loading; the harness scrolls the embed into view before checking it. Its narrow native toolbar hides the page-number input, so actual wheel scrolling verifies navigation. These are harness accommodations, not plugin changes or simulated PDF success.

## Fixture files and reproducibility

Parent-only directory: `exports/lyr-pdf-text-20260916/` contains `fixture-plan.json`, exact `created.json` responses, `public/pdfs/`, `public/manifests/20-20-1983.json`, and `screenshots/`. PDFs are downloaded originals, not authored dummy historical documents. They and screenshots are excluded from the plugin package.

| Local PDF filename | Bytes | SHA-256 |
| --- | ---: | --- |
| `having-our-say.pdf` | 405085 | `4db4b474830788f48b52533ee50bafa8207dfa8938a5f64dae354bf1a6dc1ec4` |
| `what-it-is-may-1973.pdf` | 747211 | `9ab016472ab4319021c4596e188b25a8d729385adbe1571c6e953116db8ad5c0` |
| `what-it-is-july-1973.pdf` | 2691377 | `da345e041e0cea726cc386ead093a10dc17cc28d74bffe0d768d196d12846274` |

PDF page counts were independently read with pypdf. macOS `sips` rendered the source first pages as supporting local images; browser screenshots verify the actual PUI embeds.

For review/reconstruction, sanitized [ordered creation payloads](evidence/local-format-fixtures-2026-09-16.json), [local manifest](evidence/20-20-1983.local.json), and returned IDs in the observation JSON are checked in. These files are test evidence, not deployable record updates or production manifests. Do not install the localhost URLs on Lyrasis.

1. On this stack, verify ASpace is healthy on 18081/18089/18082 and the recorded fixture titles/identifiers still match. **Do not repost the creation plan.** On another disposable local database, resolve unique identifiers and create only missing labeled records in plan order, substituting each `$key` with the returned URI. Record returned IDs and adapt the read-only test IDs; never assume these IDs are free or use hosted ASpace. Credentials stay in memory.
2. Prepare only a dedicated local fixture directory, not the repository root. Obtain the three original PDFs from the source URLs below and verify the hashes above. Copy the checked-in local manifest into that directory's `manifests/20-20-1983.json`.
3. Serve that directory on **loopback only**, port 18090, with the manifest CORS allowance for the local PUI. The current session left its fixture server running for local review. If restarting, first check the port owner and reuse/stop only this fixture process; do not kill an unrelated listener.
4. Run the browser functions using an explicit Playwright context; see [browser README](../test/browser/README.md#local-pdf-and-scanned-text-checks). The implementation run used the Playwright browser bridge to execute these functions, not the standalone CLI snippet. Use installed Chrome for its native PDF viewer.

Original PDF download URLs:

```text
https://compass.fivecolleges.edu/system/files/2023-07/view_6703.pdf
https://compass.fivecolleges.edu/system/files/2024-11/smith_ssc_ms00730_as506331_001.pdf
https://compass.fivecolleges.edu/system/files/2024-11/smith_ssc_ms00730_as506333_001.pdf
```

Fixture-server restart command from the **parent repository root** (does not create or modify files):

```sh
python3 -u - <<'PY'
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

fixture_root = Path('exports/lyr-pdf-text-20260916/public').resolve(strict=True)
assert (fixture_root / 'manifests/20-20-1983.json').is_file()
assert (fixture_root / 'pdfs/what-it-is-may-1973.pdf').is_file()

class FixtureHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(fixture_root), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:18081')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

ThreadingHTTPServer(('127.0.0.1', 18090), FixtureHandler).serve_forever()
PY
```

Do not place credentials, private files or symlinks outside this public fixture directory. The local server is a temporary QA dependency, not a service proposed for Lyrasis.

## Open gates and cleanup boundary

This closes the local approved-PDF, six-page scanned-text, linked thumbnail/out-link and separate-PDF isolation fixture gaps within the observed Chrome scope. It does not close full M01–M18 acceptance. No Safari/Firefox/mobile-device or screen-reader check, complete Tab-order audit, full-resolution image-download completion, exhaustive failure matrix, hosted-origin/CSP/CORS/off-campus test, restricted-content verification, package/notice review or rollback rehearsal was performed here. Preservica remains a separate adapter/delivery-service gate if it is added to the hosted feature set; no additional media formats were introduced.

Original Compass landing-page resolution is not being claimed as a way to extract PDFs: the PDF fixtures use actual file URLs. Before hosted inline-PDF testing, select an approved durable HTTPS file endpoint whose frame policy permits that use, or have Rob explicitly accept direct-link fallback. Local serving success does not prove that such an endpoint is ready.

The guide is now included in the standalone commit for this checkpoint; that fixes its omission from future `git archive` output, not the remaining extracted-package/rollback acceptance. Parent runtime/tests and guide remain uncommitted under the read-only parent Git-index policy. No push or hosted write occurred.

No records/files were deleted. To remove this test collection later, first re-read returned URIs and verify `dv-format-20260916` identifiers plus current lock versions, then obtain cleanup approval. Retire only those records and the fixture server/files; do not restore broad database snapshots or touch resource 2, original pilots, production AO 541945, or hosted records.
