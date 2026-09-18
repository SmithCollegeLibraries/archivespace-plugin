# Package verification and rollback

This is a local preparation procedure. Preserve Lyrasis Gate A/B, operator
configuration agreement, independent review and Rob's installation approval.
No refactor ticket alone authorizes a push, hosted install or record edits.

## Prepare an immutable artifact

1. Finish source/template changes, run the [build/test commands](plugin-build.md),
   and commit source, lockfile, bundle and source map together.
2. Record the candidate commit and prior known-good commit. Create an archive
   with `git archive --format=tar --prefix=digital_viewer/ COMMIT > /tmp/candidate.tar`.
   Save its SHA-256 and a file inventory. Do not ship an arbitrary working directory.
3. Extract to a fresh directory. Check it has the plugin entry, public templates,
   CSS, vendored OSD, generated JS/map, source, pinned build tooling and tests.
   Check for accidentally packaged `.env`, credentials, `node_modules` or Git metadata.
   Keep vendored license notices. Legacy `frontend/` remains marked pending WBL-0901.
4. In the extracted package run `npm ci`, `npm run check:generated`, `npm test`
   and both Ruby tests. Run `scripts/verify-browser.mjs` against that directory.
   Deployment itself uses the committed assets; the host needs no build tool.
5. Compare the local/host-served JS, CSS, OSD and map bytes with this package.
   The Ruby version hashes JS/CSS/OSD bytes; JS includes the map's digest, so a
   changed map invalidates JS too. Verify root/prefixed map resolution separately.

Record exact commit, archive SHA-256, asset SHA-256 values, browser/Node/npm/Ruby/
ASpace/OSD versions and test results. A later documentation-only evidence commit
may refer to the tested artifact commit; explicitly verify runtime byte identity.

## Rehearse rollback

Keep the prior archive, its hash and the exact environment configuration. In a
local rehearsal, switch the mounted plugin's assets from candidate to prior and
back, restarting local ArchivesSpace at each switch and verifying served bytes
and Ruby version values at every step (B → A → B). File-only swaps can retain
cached asset-length metadata in the server and yield incomplete responses.
Confirm prior bytes restore the prior digest even with different file mtimes.
For template/server changes, restart the local ArchivesSpace service and verify
markup; a complete hosted rollback must restore the **whole prior package and
configuration**, not just JavaScript. File Version edits need a separate record
rollback; this refactor does not change records.

Run a read-only page smoke after restoring the candidate. Leave the development
mirror on the candidate. Do not call this a Lyrasis rollback rehearsal: actual
host caches, proxy prefix/CSP, browser behavior and operator procedure remain
Gate A/B work. Do not delete prior packages until that operator confirms retention.

## Verification entry points

- `scripts/verify-browser.mjs --suite deterministic`: local response fixtures;
  source failures, group isolation, keyboard, request races, thumbnail cancellation,
  fallback links and safe diagnostics.
- `scripts/verify-browser.mjs --suite local`: existing ASpace 4.2.0 fixture database
  at PUI 18081 and loopback content server 18090; actual markup and format rendering.
- [M08 report](refactor-validation-2026-09-18.md): exact local candidate and evidence.
- [Lyrasis tasks](lyrasis-staging-launch-task-list.md): installation and acceptance gates.
