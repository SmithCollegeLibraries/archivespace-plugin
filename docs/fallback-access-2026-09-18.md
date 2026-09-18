# DV-M02 direct-file fallback checkpoint — 2026-09-18

Status: partial implementation, ticket remains IN PROGRESS. Manifest-only policy
awaits Rob's response; no alternative public destination is invented. Real-ASpace
rendering remains unverified: Docker daemon was unavailable and the attempted
application launch did not start it. No hosted changes or release approval.

## Implemented behavior

`public/views/shared/_digital.html.erb` renders the new
`shared/_digital_viewer_fallback.html.erb` beside direct PDF/image destinations
in representative, entry and thumbnail-link branches. It uses the existing
original link without duplicating its URL or changing publication/download
policy. Thumbnail-only entries get no invented link. Case-insensitive PDF and
JPEG/PNG/GIF/WebP suffixes allow query strings/fragments.

The short conditional explanation stays visible: “If the viewer is unavailable,
use the original PDF/image link above to open the file directly.” Keeping it
available also covers partial failures and PDF embeds whose readability cannot
be inferred from iframe insertion. A `noscript` sentence explains disabled JS.
No JavaScript or CSS is needed for either access instructions or the original
link. Manifest-only, legacy object and additional-file-version-only paths are
not newly handled by this partial implementation.

## Verification

- Test-first Ruby checks failed for missing direct-file explanations, then for
  missing integration in the three existing template branches. Final result:
  **6 tests / 28 assertions pass**, with no failures/errors/skips.
- Existing Node suite: **70 pass, 0 fail/skip**. Ruby asset-version check passes.
- Chrome **151.0.7922.174** deterministic browser matrix: **28/28 pass**.
  DigitalObject/ArchivalObject × image/PDF × no-JS, viewer blocked, OSD blocked,
  config absent, embedded content blocked, synchronous init failure, working.
  Every row checks explanation/metadata visibility, noscript state, viewer mount
  expectation and keyboard opening of the unchanged original destination.
  Images decode; PDF URL/load succeeds. This is not full native-PDF usability
  evidence. Fixtures are synthetic and all requests are intercepted.
- Ruby helper substitutes render real plugin ERB; they do not reproduce the Rails
  renderer or the actual stock representative partial. Real-ASpace and hosted
  checks remain necessary. The browser script's startup failures are deliberate;
  no clean-console claim is made.
- Initial sandbox Chrome launch failed; the isolated Chrome run outside the
  sandbox succeeded. An early test-harness popup/frame lookup was corrected
  before the successful complete run.
- See [reproduction commands](../test/browser/README.md). No runtime JS, CSS,
  configuration, source selection or source records changed.

## Remaining DV-M02 work

1. Rob decides manifest-only access policy (message/limited access versus an
   approved alternate destination); implement and test that decision.
2. Verify actual ArchivesSpace rendering and placement on both page types,
   including representative/browse, thumbnail-only and additional-file-version
   paths. Extend instructions to applicable uncovered paths without turning a
   collection browse link into a source.
3. Add manifest-only sequence browser cases and destination verification under
   no-JS, selective script blocking and failed/partial startup.
4. Record hosted limitations and the accepted content/access policy. Only then
   close the ticket criteria. This checkpoint does not assert equivalent access
   when the destination itself is blocked.
