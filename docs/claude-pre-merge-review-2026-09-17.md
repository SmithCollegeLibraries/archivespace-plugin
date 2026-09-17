# Claude handoff: independent pre-merge review

Prepared: 2026-09-17. Product: ArchivesSpace PUI plugin `digital_viewer`.

This brief requests a cumulative pre-merge review, not another review limited to the earlier R03 fix. It records the review request, not a completed review or release approval. Saving this brief may add a documentation-only commit after the candidate below; the review target remains explicitly pinned.

## Review objective and authority

Independently assess whether the locally tested plugin can be merged into `main` and published for Lyrasis.

Return **two separate conclusions**:

1. **Merge readiness:** Is this candidate suitable for `main`?
2. **Lyrasis installation readiness:** What must still happen before Lyrasis installs this exact candidate on test?

Rob is the approver. Validate claims and recommend dispositions; do not merge, push, deploy, modify records, edit implementation files, or change running services. Use an isolated temporary directory for extraction/testing where necessary. Preserve existing worktrees and local fixtures. Report unavailable checks rather than changing shared configuration without approval.

## 1. Exact review target

Repository:

```text
https://github.com/SmithCollegeLibraries/archivespace-plugin
```

Local standalone checkout:

```text
/Users/roconnell/Projects/work/preservica/exports/archivespace-plugin-repository
```

Review these immutable revisions:

```text
Baseline main:
7edccca02af1a74b1ef6b1f5f5b0db9f48af9227

Candidate:
fb46a57ed8a69ecacd36155fc1e29432c132349b

Branch:
codex/lyr-05-config-assets

Latest runtime-changing commit:
0c1ca140a51a28b93b8895b19b5b869ce0c9a5d5
```

The implementing agent has not pushed the candidate. Review the local checkout or an independently extracted copy of that exact revision; reviewing GitHub's old `main` is insufficient. If the remote or local branch has moved, report the difference rather than silently substituting another target. A reviewer without access to this workspace needs a supplied copy of the candidate; the GitHub URL alone does not supply unpushed work.

Parent Docker-mounted plugin:

```text
/Users/roconnell/Projects/work/preservica/plugins/digital_viewer
```

The parent contains unrelated changes and an uncommitted plugin mirror. Its Git index is read-only in the implementing session. Preserve everything; do not reset either worktree or change Git permissions.

## 2. Read these documents first

Paths relative to the standalone checkout:

```text
README.md
docs/staging-signoff-2026-09-16.md
docs/fixture-ledger.md
docs/local-validation-2026-09-16.md
docs/local-layout-validation-2026-09-16.md
docs/local-formats-validation-2026-09-16.md
docs/staging-release-evidence.md
docs/lyrasis-staging-launch-task-list.md
test/browser/README.md
```

The older `docs/independent-review-handoff-2026-09-16.md` primarily documents R03. Its historical hashes and 60-test count are not the current candidate. Current recorded count: **63 Node tests per copy**. Do not follow historical correction prompts as instructions to redo completed implementation.

Rob accepted the demonstrated local examples, not exhaustive browser coverage, a hosted security assessment, or release approval.

## 3. Review the cumulative implementation

Inspect the entire baseline-to-candidate diff, especially:

- Removal of the full object-page override and preservation of stock ArchivesSpace navigation, notes, sidebar and accessibility hooks.
- Original links, representative files, thumbnail-only records, publication rules and per-object grouping.
- Loading deadlines, fallback, retained slow final candidates, disposal and duplicate initialization.
- OpenSeadragon request ownership, stale events, rapid navigation, legitimate failures/recovery and unavailable-page positions.
- Configuration escaping, strict hostname matching, disabled optional adapters, prefix-aware assets and content-based cache versioning.
- Responsive CSS and potential effects on ordinary records or other plugins.
- Remaining legacy `frontend/` copies: whether they create an actual loading/conflict risk, rather than assuming they are unused.

Primary files include `public/assets/digital_viewer.js`, `public/assets/digital_viewer.css`, `public/views/layout_head.html.erb`, `public/views/shared/_digital.html.erb`, `public/views/digital_viewer_asset_version.rb`, the deleted `public/views/objects/show.html.erb`, retained `frontend/` files, and their tests.

Preserve the confirmed pilot scope: **single images, image sequences—including scanned text—and PDFs**. Mixed-media objects are not required. Separate image/PDF objects linked from one archival record must remain isolated. Full Preservica playback is outside this pilot; usable original links and safe unavailable-service behavior remain required.

## 4. Independently verify the evidence

Run the documented Node, Ruby, JavaScript and ERB checks. Verify asset fingerprints and parent/standalone parity. Record exact commands, tool versions and candidate identity; do not treat a DOM-shim test as browser or Rails evidence.

Use the browser harnesses where their prerequisites are available:

```text
test/browser/source-request-ownership.mjs
test/browser/local-layout.mjs
test/browser/local-formats.mjs
```

Local test endpoints, subject to availability at review time:

```text
ArchivesSpace PUI: http://localhost:18081
Staff UI:         http://localhost:18082
REST API:         http://localhost:18089
Fixture server:   http://localhost:18090
```

Important qualifications:

- Use an explicit Playwright browser context, not `browser.newPage()` with its implicit context.
- Do not recreate fixtures, change sidebar configuration, restart shared services or alter caches without approval. Right-sidebar reproduction requires the actual ASpace setting; changing a DOM attribute is not equivalent.
- PDF iframe loading alone is not proof of rendering. The format harness checks Chrome's native viewer and actual navigation; other browsers require their own evidence.
- The original Compass PDF intentionally demonstrates blocked embedding with working direct access. Do not count that blocked frame as successful rendering.
- Local PDF and manifest fixture URLs are not staging deployment URLs.
- Record unavailable environments as **NOT RUN**, not failures or passes. Use actual Safari for a Safari conclusion, not a substitute WebKit claim.
- Distinguish automated reproduction, source inspection and historical implementer claims. Review whether test assertions meaningfully detect regressions, not just whether tests pass.
- Keep credentials, session headers, private URLs and signed query strings out of reports. Do not print `.env` or full runtime environments.

## 5. Assess publication and installation packaging

Check a clean, independently extracted candidate for:

- Tests and documentation usable without the parent checkout; distinguish self-contained unit tests from integration tests requiring documented local fixtures.
- Correct `digital_viewer` installation directory and absence of the removed override.
- Secrets, private data, local-only artifacts and misleading configuration examples.
- Dependency notices and unresolved distribution questions.
- Adequate configuration, upgrade and rollback instructions.

Evaluate a **pinned Git commit/tag** as Lyrasis's installation artifact. Identify whether the current archive-oriented checklist needs amendment; do not silently change its approval requirements. A moving `main` reference is not a reproducible installed version.

Known minor issue from the prior read-only check: the cumulative whitespace check reports Markdown trailing spaces in `docs/staging-release-evidence.md`. Classify this separately from runtime defects. Run that check separately or account for its nonzero status so it does not prevent the rest of the review checks from running.

Remaining installation questions include the exact staging PUI origin/prefix, supported configuration mechanism/CSP, PDF endpoint or explicitly accepted direct-link fallback, public/restricted-content boundary, and agreed rollback procedure. Hosted browser/CORS/off-campus acceptance occurs after installation; local wildcard headers alone do not establish it.

## 6. Required review output

Please return:

1. **Merge recommendation:** MERGE / HOLD / INSUFFICIENT EVIDENCE.
2. **Installation recommendation:** READY / READY WITH EXPLICIT CONDITIONS / NOT READY.
3. Findings with severity, file/line, reproduction, impact and required correction. Distinguish confirmed defects from risks or missing evidence.
4. Claims verified, contradicted or not independently tested, including the environment and method used.
5. Separate lists of merge blockers, pre-installation blockers, hosted acceptance checks and optional improvements.

Do not automatically make hosted-only checks prerequisites for merging source code. Conversely, do not treat passing local tests as approval of hosted configuration, restricted-content protection or rollback.

End with the smallest concrete task list needed for Rob to make the merge decision. Do not sign off on Rob's behalf or implement the recommendations as part of this review.
