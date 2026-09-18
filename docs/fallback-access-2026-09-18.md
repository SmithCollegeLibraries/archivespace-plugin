# DV-M02 direct-file fallback checkpoint — 2026-09-18

Historical checkpoint: the first direct-file implementation below was partial.
The approved-policy follow-up below supersedes its pending content decision.
Final verification and completion status are recorded at the end. No hosted
changes or release approval.

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

## Approved policy and completion follow-up

Rob approved asking visitors to enable JavaScript for the digital viewer. The
`noscript` message is: “This digital viewer requires JavaScript. Please enable
JavaScript in your browser and reload this page to view the digital content.”
Google documents enabling JavaScript for required functionality ([Google help](https://support.google.com/accounts/answer/7675428?co=GENIE.Platform%3DDesktop&hl=en));
MDN recommends a minimum noscript explanation ([developer guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Add_JavaScript_to_your_web_page)).
This does not mean a blocked individual script disables JavaScript, so persistent
conditional guidance separately mentions blocked scripts. Existing manifest links
remain available and are described as potentially containing viewing data, not
as equivalent readable access. No alternate public-content destination is created.

The final follow-up covers the additional-file-version partial too, preserving
ArchivesSpace 4.2.0 caption/use-statement/data-URL display precedence, using Rails
`link_to` to escape text. Collection browse, local record-navigation and
thumbnail-only paths do not promise an embedded viewer.

Real-page inspection found a representative anchor could have no visible bounds
while its image was unavailable. The fallback now supplies an explicit escaped
“Open original link” to the **same published HTTP(S) or root-relative destination**.
It creates no link for other schemes. Access instructions remain visible during
normal rendering and failures; there is no readiness-dependent hiding and no
false claim that a PDF embed loaded successfully.

### Final result — COMPLETE locally

- 11 Ruby tests / 54 assertions; 70 Node tests; Ruby asset-version check: pass.
- Final fixture matrix: 42/42 pass, including manifest sequences and keyboard
  activation of the explicit text link with the same destination.
- Real ArchivesSpace 4.2.0 at local PUI 18081: 27/27 pass (nine DO/AO fixtures,
  including 871/874 representative/additional versions, under no-JS, viewer
  blocked and OSD blocked). Readable text links match existing published URLs,
  can receive keyboard focus, and no viewer mounts under blocked startup.
- Four real exclusions pass: DO 872, AO 4103, AO 4102 and resource 3 have no
  misleading viewer guidance. No records were edited. Docker is left running.
- Normal-page screenshot reviewed for placement; this is not an assertion of
  complete remote-content load. Working/failed/partial startup is covered by the
  intercepted fixture matrix; local rendering and link visibility are verified
  separately. Browser: Chrome 151.0.7922.174. Hosted access/CSP/CORS, full PDF
  usability and release approval remain separate deployment checks.
- [Recorded results](evidence/dv-m02-2026-09-18.json); exact implementation commit
  is in the parent completion ledger. Seven runtime/test files mirrored with
  byte identity. User-approved scope needs no invented alternate content URL.
