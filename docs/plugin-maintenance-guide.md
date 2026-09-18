# How digital_viewer works and how to troubleshoot it

Prepared 17 September 2026 for Rob, Special Collections, Lyrasis and future maintainers.

Development update, 18 September: DV-M02 adds [server-rendered direct-file access instructions](fallback-access-2026-09-18.md) through `public/views/shared/_digital_viewer_fallback.html.erb`, called by `_digital.html.erb`. This unapproved development checkpoint preserves original links when scripts fail; manifest-only policy and actual-ASpace verification remain open. The published baseline described below is unchanged.

This guide describes the plugin at published commit `553e0f33916e005e3ce529213c50e2d3e93084a6`, with runtime changes last made in `2b863370bed0f57db3069a071b641dae0cf13754`. Target: ArchivesSpace **4.2.0**; bundled image viewer: OpenSeadragon **5.0.1**. Check the installed version before applying these details to a later release.

The corrective code and its evidence have passed independent review, and Rob approved merging and publishing that candidate. That is **not permission to install on Lyrasis**: the staging-install checklist, Gate A, remains open. Older dated evidence may still say review is pending; it records an earlier point in time.

DV-M03 adds an [explicit source attribute contract](plugin-source-contract.md) for plugin-owned markup, with compatibility selectors retained for stock/theme output.

DV-M04 moves maintained JavaScript to `src/` and adds the [locked build, source maps and migrated test workflow](plugin-build.md). Older file/function descriptions below describe responsibilities; use source modules for edits, not the generated asset.

Start here:

- [Quick overview](#quick-overview)
- [Languages and components](#languages-and-components)
- [What happens when someone opens a record](#what-happens-when-someone-opens-a-record)
- [Content types and visible behavior](#content-types-and-visible-behavior)
- [Settings](#settings)
- [Troubleshooting](#troubleshooting)
- [File-by-file inventory](#file-by-file-inventory)
- [Where to look inside the main JavaScript file](#where-to-look-inside-the-main-javascript-file)
- [Tests and safe maintenance](#tests-and-safe-maintenance)

## Quick overview

`digital_viewer` adds digital-content viewing to ArchivesSpace's **public website**. It reads the links ArchivesSpace has already put on a record page, recognizes supported content, and displays an image, an image sequence, or a PDF beside or below that record. The existing links remain available.

It is not a separate catalog, storage system or preservation system. It does not upload files, convert TIFFs, create manifests, edit ArchivesSpace records, or provide access control for restricted content. Those responsibilities belong to ArchivesSpace and the content services.

The three pilot object types are:

- One image.
- A sequence of images, including scanned text pages.
- A PDF.

Audio/video and Preservica-related code exists, but playback through those paths is **not accepted as part of this staging pilot**. Mixed-media objects are not a pilot requirement.

The most important files are:

| If you need to understand… | Start with… |
| --- | --- |
| How the browser finds and displays content | [public/assets/digital_viewer.js](../public/assets/digital_viewer.js) |
| How the page gets its settings and viewer files | [public/views/layout_head.html.erb](../public/views/layout_head.html.erb) |
| How original links, thumbnails and separate objects are preserved | [public/views/shared/_digital.html.erb](../public/views/shared/_digital.html.erb) |
| Layout, sizing, buttons and narrow screens | [public/assets/digital_viewer.css](../public/assets/digital_viewer.css) |
| Whether the browser is receiving the right file versions | [public/views/digital_viewer_asset_version.rb](../public/views/digital_viewer_asset_version.rb) |

### Which copy are we talking about?

All file paths below are relative to the **standalone plugin repository**, the repository published at https://github.com/SmithCollegeLibraries/archivespace-plugin.

In the larger development workspace it is checked out at `exports/archivespace-plugin-repository/`. The local Docker instance reads a separate working copy under `plugins/digital_viewer/`. Editing the standalone checkout alone does not change the Docker-mounted copy. The implementation workflow keeps the corresponding runtime and test files identical.

Within the plugin, `public/` contains the tested public-site implementation. The `frontend/` directory contains older, different files; it is **not** a second up-to-date copy. Do not edit it expecting to fix the current public viewer. Reconciliation of those older files is still a separate task.

## Languages and components

| Language or file type | Job in this plugin | Where it runs |
| --- | --- | --- |
| JavaScript (`.js`) | Recognizes links, creates viewers, handles controls, loading and errors | Visitor's browser |
| Ruby (`.rb`) | Provides plugin entry files and calculates the asset version | ArchivesSpace server; ASpace uses JRuby, the Java-hosted Ruby runtime |
| ERB (`.html.erb`) | HTML templates containing small Ruby sections; emits configuration and record markup | Server, before sending the page to the browser |
| CSS (`.css`) | Sizes and positions the viewer, toolbar, thumbnails and surrounding record content | Browser |
| JavaScript modules (`.mjs`) | Maintained viewer source under `src/`, build tooling and tests | Bundled for browsers; tooling/tests run in Node.js / Playwright |
| JSON (`.json`) | Structured manifests and saved test observations; not executable plugin code | Read as data |
| Markdown (`.md`) | Installation, evidence and maintenance documentation | Documentation only |
| PNG (`.png`) | Bundled button images retained with the viewer assets | Static image files |

There is no React, TypeScript, PHP application or database migration inside this plugin. DV-M04 adds a developer-only JavaScript build step; installed ArchivesSpace hosts still need no Node/npm. The larger parent project has a React/PHP prototype and companion services, but those are separate products. Node.js is used for testing; it is not a server the installed plugin needs to run.

OpenSeadragon is the included JavaScript library that handles zooming and image tiles. It is not Mirador. PDFs use the browser's own PDF support, not OpenSeadragon.

### A few terms used below

- **PUI:** Public User Interface—the visitor-facing ArchivesSpace site, not the Staff interface.
- **Digital Object / Archival Object:** an ArchivesSpace digital-content record / a descriptive archival record that can link to digital objects.
- **File Version:** an ArchivesSpace entry containing a file or service link and related settings. It is not a Git version.
- **Manifest:** a JSON description of the pages in an object and where their images can be requested. It contains directions to images, not the image pixels themselves.
- **IIIF:** the shared format used for these image descriptions and image requests.
- **`info.json`:** a description of one image service: dimensions, available sizes and how to request image pieces.
- **Tile:** a small piece of an image, loaded as needed for viewing/zooming.
- **Asset:** a browser file such as JavaScript, CSS or an icon.
- **Mount:** create a viewer in a page. **Dispose:** remove that viewer and stop work belonging to it.

For the extracted source adapters and current function names, see the [adapter trace](plugin-adapters.md).

## What happens when someone opens a record

```text
ArchivesSpace record and published File Versions
  -> server templates produce the public page, links and plugin settings
  -> browser loads OpenSeadragon, digital_viewer.js and digital_viewer.css
  -> plugin finds supported links and keeps separate objects in separate groups
  -> browser requests a manifest, image service, direct image or PDF
  -> viewer displays content; original links remain available
```

For a converted image sequence, the browser normally retrieves a manifest from the manifest host, then image descriptions/tiles from Cantaloupe, and thumbnails from the addresses recorded in the manifest. These may be **different servers**. ArchivesSpace can load correctly while one of those services is unavailable.

### 1. ArchivesSpace supplies the page and links

The plugin must be enabled in ArchivesSpace's existing `AppConfig[:plugins]` list. Preserve other plugins rather than replacing that list.

The two `plugin_init.rb` files are currently comments-only entry files. They do not fetch content or start a background worker. The actual server-side output comes from templates:

- `layout_head.html.erb` inserts settings and loads the three browser assets in order: OpenSeadragon, the plugin JavaScript, and its CSS.
- `shared/_digital.html.erb` replaces one small shared piece of ArchivesSpace's record rendering. It keeps stock links/representative images and adds page/group markers the JavaScript can read.

The plugin no longer includes the full `public/views/objects/show.html.erb` page replacement. ArchivesSpace supplies the overall object page. A stray old copy of that removed file in an installation is a useful troubleshooting lead.

The shared partial has two main branches. If ArchivesSpace supplies a **representative file version**, it renders that using the stock `shared/representative_file_version_record` partial. Otherwise, it renders entries from the digital-object list. Entries can contain `out` (destination), `thumb` (thumbnail), `caption`, and `material` fields. A thumbnail with no destination stays a thumbnail; the plugin does not invent an original-file link.

Digital Object pages can also expose their own additional File Versions through stock ArchivesSpace markup. Consequently, an absence of `.external-digital-object__link` links does **not** prove that the page has no usable source. Representative links and additional File Versions must be checked too.

### 2. JavaScript finds and groups links

The JavaScript starts once the page is ready. It does not call the ArchivesSpace REST API to discover hidden records or credentials. It examines the already-rendered page, including:

- Additional File Version links: `[data-additional-file-version] a[href]`.
- External digital-object links: `.available-digital-objects a.external-digital-object__link[href]`.
- Linked thumbnails: `.available-digital-objects a.thumbnail[href]`.
- The direct representative-file link: `[data-rep-file-version-wrapper] > a[href]`.
- Explicit `[data-file-uri]` elements, and a fallback scan for a `File URI` description row.

The exact names above are useful search terms in a browser's Elements panel. A selector is simply an address for a kind of element on the page.

Links describing alternatives for the same leaf Digital Object are grouped together. Distinct linked objects on an Archival Object page remain separate. Repeated URLs are removed **within a group**, not across unrelated objects. Labels such as `digital-0` are page-rendering markers, not persistent ArchivesSpace record IDs.

This separation is important: a PDF attached to one linked object must not become the download for a neighboring image object.

### 3. It chooses a source and places the viewer

Recognizing a URL and choosing between several recognized URLs are separate steps. `detectSource` recognizes the form of each link; `buildDescriptorSelection` ranks alternatives within a group.

For image/non-PDF alternatives, the normal order is: recognized direct manifest, constructed Cantaloupe service, legacy Compass object, direct static image, then Preservica. A PDF-only group uses the PDF. If a group contains a non-PDF candidate and a PDF, the non-PDF candidate is preferred; the PDF remains a companion and later fallback. This existing companion behavior is not a new mixed-media pilot requirement.

A Digital Object with no children uses a viewer column inside the stock content pane. Archival Object pages and Digital Objects with children keep the stock layout with viewers placed near their own source blocks. If the expected page structure is absent, the code uses inline placement rather than replacing the whole page.

Starting the same initialization again is designed to reuse unchanged viewers, replace changed ones and remove obsolete ones. However, there is no general automatic watcher for links inserted later by another script. The `window.DigitalViewer` object contains settings, not a public `init()` API; normal page reloads are the safe way to recheck changed content.

## Content types and visible behavior

| Source | What the current plugin does | Important limit |
| --- | --- | --- |
| Converted manifest URL matching `/manifests/...json` | Reads the first sequence of a IIIF Presentation 2 manifest and builds an OpenSeadragon page sequence | This is not a universal recognizer for every valid IIIF URL or version. A differently named JSON URL may not be detected. |
| Configured Compass `/node/.../manifest` or `/manifest-single` | Uses the same manifest reader | Legacy Compass path; a bare `/node/NUMBER` link is converted to `/node/NUMBER/manifest`. |
| Configured Compass `/islandora/object/...` or `/object/...` | Resolves the object to a manifest, using the configured resolver if present | Without a resolver, redirects and browser permissions must allow direct lookup. Transitional dependency. |
| Configured Compass `/system/files/...tif`, `.tiff` or `.jp2` | Builds a Cantaloupe `info.json` URL from the file key | Requires a usable Cantaloupe base. It does not convert the original TIFF in the browser. |
| Direct HTTP(S) JPG/JPEG, PNG, GIF or WebP URL | Displays an ordinary browser image and an image link | This path does not provide the tiled OpenSeadragon zoom toolbar. |
| Direct HTTP(S) `.pdf` URL | Inserts a PDF frame and an always-available `Open PDF` link | The host/browser may refuse embedding even when opening the link works. |
| URL containing a Preservica-style UUID | Calls the configured companion backend for a manifest | Companion service required; playback is outside the accepted pilot scope. |
| Unsupported link or no usable link | Does not create a viewer for that group; keeps stock content | A link to another ArchivesSpace record is not automatically followed to find its images. |

The detector uses URL patterns, not a request to inspect every link's file type. For example, a PDF without a recognizable `.pdf` URL or an arbitrary direct `info.json` link is not guaranteed to be detected. Query strings are supported in the documented extension patterns; do not assume every URL variation is supported. Inspect `detectSource` before changing record links merely to make the viewer appear.

### Image sequences, controls and downloads

- OpenSeadragon retrieves each image's `info.json` and tiles. Controls add zoom, fit/reset, full-page viewing, rotation, flip and display adjustments. Display adjustments do not rewrite stored images.
- The manifest supplies page order and count. Unavailable pages keep their positions instead of shifting all later page numbers. If no pages are usable, the plugin tries an alternative source or reports unavailable content.
- “Object view” and “Open page” are viewing/download modes inside the same sequence. The page-image download is intentionally hidden in object mode. “Open page” reveals the current page's image link; “Back to object” hides it again. A single image does not need that extra step.
- Image links target the manifest's image address or a derived full-size image-service URL. They are not automatically original TIFF downloads or whole-object ZIP files. The content server and browser control whether the link opens or saves a file.
- The plugin may prefetch nearby `info.json` descriptions. That is separate from thumbnail loading; the entire sequence of thumbnails is not eagerly requested when visibility-based loading is available.

### Loading, failure and recovery

There are two different time budgets:

| Work | Budget and outcome |
| --- | --- |
| Opening a content candidate | Defaults to 30 seconds, configurable. The normal sequence shares an initial deadline across manifest retrieval/reading and opening its viewer. If another candidate exists, timeout advances to it. If this is the last candidate, the viewer remains alive and shows `Still loading` so a slow response can still succeed. |
| A sequence thumbnail | Fixed 10 seconds per active request, independent of the setting above. Requests run one at a time per viewer. Timeout removes that image request and advances the queue. Its numbered page button remains usable; the preview is not automatically retried. |

Opening an image source does not itself prove pixels have loaded. A separate first-tile check can show `Still loading` while keeping an opened viewer alive. Later source/tile errors report `This page is unavailable.` for the current page, not an error for the entire sequence.

The code associates callbacks with the request/image that owns them. This prevents a delayed failure for a page you left from overwriting a newer page's state—even when you navigate A → B → A. OSD events worth knowing are `open`, `open-failed`, `tile-ready`, `tile-load-failed`, `page`, `close` and `before-destroy`. The plugin uses **`tile-ready`, not `tile-drawn`**, for tile recovery.

A timed-out thumbnail can currently look blank without a special explanation. That is a known nonblocking UX follow-up. It is not proof that the full-size page failed. Another open follow-up concerns document-wide click/Escape handlers in the toolbar; it is separate from the thumbnail timer/listener cleanup already fixed.

### PDFs are a different path

`mountPdfViewer` inserts an HTML `iframe`—a small embedded browser document—and an `Open PDF` link. The mount completes when the frame is inserted, **not when the browser has proved the PDF rendered**. It does not reliably detect a cross-site PDF embedding refusal and switch sources automatically.

If a PDF opens in its own tab but not inside ArchivesSpace, check the PDF host's embedding rules and the ArchivesSpace page's browser policy. Changing CORS alone does not fix `X-Frame-Options: SAMEORIGIN` or a restrictive `frame-ancestors` rule. The staging decision is either an approved host that permits embedding or explicitly accepted direct-link behavior.

## Settings

The installed template reads **environment variables in the ArchivesSpace process**. It places public values into `window.DigitalViewer` before loading the JavaScript. Plugin-specific AppConfig mapping is not implemented. AppConfig still controls whether the plugin is enabled at all.

| Environment variable | Browser setting | Meaning / unset behavior |
| --- | --- | --- |
| `CANTALOUPE_PUBLIC_URL` | `cantaloupeBaseUrl` | Public IIIF Image API base, commonly ending in `/iiif/2`. Empty disables legacy file-key construction. Complete service addresses in manifests can still work without it. |
| `COMPASS_BASE_URL` | `compassBaseUrl` | Optional legacy Compass base. Its parsed hostname becomes `compassHost`; empty/invalid values disable Compass-specific matching. Similar-looking other hosts must not match. |
| `COMPASS_PROXY_URL` | `compassProxyUrl` | Optional resolver URL. Used for Compass-hosted sources only; converted manifests on other hosts load directly. Empty does not install or create a resolver. |
| `PRESERVICA_API_BASE` | `preservicaApiBase` | Optional companion-backend base. Code appends `/api/iiif/UUID/manifest.json`; avoid an accidental duplicated `/api/api/` path. Empty reports unavailable Preservica viewing while preserving original links. |
| `DIGITAL_VIEWER_LOADING_TIMEOUT_MS` | `loadingTimeoutMs` | Positive finite milliseconds; missing, empty, nonnumeric or nonpositive values fall back to 30,000. Does not change the 10-second thumbnail budget. |

No AWS or Preservica credentials belong here: these settings are visible to visitors. Changing environment values normally requires the host's agreed process restart; changing a shell variable in your own terminal does not reconfigure an already-running ArchivesSpace process.

The JavaScript has a historical `/iiif/2` internal default, but the supported template explicitly supplies an empty value when the environment is unset. If requests unexpectedly target ArchivesSpace's own `/iiif/2`, check missing/old config injection, a legacy file being loaded, or duplicate scripts before blaming Cantaloupe.

Asset URLs respect ArchivesSpace's `app_prefix` when available. The Ruby helper computes one SHA-256 value from the names and bytes of the main JS, CSS and bundled OSD, then adds it as `?v=...` to all three URLs. This asks the browser for a new version after a content change and returns to the old version after a byte-identical rollback. Modification times are not used. This value is **not** the checksum of an installation archive and does not cover every template or config setting.

## Troubleshooting

### First collect a small, safe set of facts

1. Which environment: local, Lyrasis test, or production? Record the **public** page URL and whether it is a Digital Object or an Archival Object. Do not diagnose the public plugin from the Staff page.
2. Which installed commit and browser/version? Which object/page number fails? Compare a working record in the same environment.
3. Are the original links visible, and do they work directly? For a representative image, confirm whether its link points to a file/manifest or to another ArchivesSpace record.
4. Open the browser's Developer Tools, then Network and Console. Reload while recording requests. Inspect the three plugin assets, the manifest, `info.json`, tiles, thumbnail and PDF separately. An HTTP 200 for the ArchivesSpace page does not prove those later requests worked.
5. Record the first relevant error, response status and failed request type. Check that “JSON” is actually JSON, not a login page returned with HTTP 200. Do not change several settings at once.

Before sharing screenshots/logs, remove credentials, cookies, authorization headers, signed URL parameters and restricted identifiers. Plugin warnings deliberately omit raw URLs; browser/library messages may not. Never attach an entire `.env` file or unredacted network export to a ticket.

### Match the symptom to the likely area

| Symptom | First checks | File/function or owner |
| --- | --- | --- |
| No viewers on any page | Correct public site? Plugin enabled? JS/CSS/OSD requested successfully? Inline settings blocked? Console says OSD not loaded? | `layout_head.html.erb`, host plugin list/security settings, `init` |
| Only one record lacks a viewer | Published source link present? Recognized URL shape? Representative link points to another record? | ArchivesSpace File Versions; `_digital.html.erb`; `collectSourceAnchors`, `detectSource` |
| Original links disappeared | Compare server HTML and active shared partial with reviewed version; check another plugin's override | `_digital.html.erb`; Lyrasis for template conflicts |
| Two objects combined, or a neighboring PDF attached | Inspect `data-dv-source-group` boundaries and source links | `_digital.html.erb`; `findGroupRoot`, `buildDescriptorSelection`, `init` |
| Viewer appears, but images do not | Separate manifest success, service-description success and tile success; check permissions, URL encoding and HTTPS | `mountCompassManifest`, `extractCompassTileSources`, `mountOsdViewer`; content-service owner |
| `Still loading` persists | Is it the last candidate? Is a request genuinely pending? Is `info.json` loaded but tiles blocked? | `scheduleAttemptTimeout`, `mountOsdViewer`; service/network checks. Increasing the timeout does not repair a bad URL. |
| One page says unavailable; others work | Check that page's manifest/service/tiles. Page count must stay unchanged. | `extractCompassTileSources`, current-page handlers in `mountOsdViewer` |
| Old error appears after rapid navigation | Confirm reviewed JS/OSD versions and same-source request ownership behavior | `mountOsdViewer`; `source-request-ownership.mjs` regression |
| Blank thumbnail but full image works | Check the distinct thumbnail URL and the 10-second deadline; numbered button should still navigate | `buildThumbnailUrl`, `addThumbnailCarousel`; manifest/thumbnail host |
| Every later thumbnail waits forever | Verify latest served JS, timeout cancellation and no duplicate older script | `addThumbnailCarousel`; `thumbnail-queue.mjs` regression |
| PDF opens separately but is blank in viewer | Inspect embedding refusal and page security rules; use `Open PDF` | `mountPdfViewer`; PDF host and Lyrasis. Not an OSD tile problem. |
| Image download missing/wrong page | Is a sequence still in object mode? Does current canvas supply the intended image URL? | `addViewerModeActions`, `syncViewerModeActions`, `getTileSourceImageUrl`; manifest producer |
| Viewer/notes/sidebar overlap | Browser width, actual ASpace sidebar setting, loaded CSS, stale whole-page override | `digital_viewer.css`, `prepareLeafLayout`; `local-layout.mjs` |
| Asset 404s when installed under a URL prefix | Compare generated asset paths with the actual PUI path | `layout_head.html.erb`, host prefix/proxy configuration |
| Change is not visible | Edited wrong copy? Wrong version installed? Served bytes/digest different? Browser/proxy cache? | Standalone vs Docker copy; asset helper; host restart/cache procedures |
| ASpace page itself returns an error | Server-side template/Ruby exception, missing helper/assets, conflicting plugin | Lyrasis/ASpace application logs; `_digital.html.erb`, `layout_head.html.erb`, asset helper |
| Works only while logged in or on campus | Content service is not truly public or off-campus reachable; redirects/authentication may differ | ITS/content owner and Lyrasis. Do not solve by embedding credentials. |
| Preservica fails but converted image manifests work | Preservica base/backend missing or incorrect; this adapter is separate | `mountPreservica`; companion backend owner. Outside current playback acceptance. |

### Three different kinds of browser restriction

- **CORS:** the content server's permission for a browser on the ArchivesSpace site to read its responses. OSD requests images using `Anonymous` cross-origin mode; they should not depend on a visitor already being logged in to the content host.
- **CSP:** ArchivesSpace's Content Security Policy, which limits the scripts, connections, images and frames its pages may use. Ask Lyrasis for the real policy and the actual blocked directive; do not disable security wholesale.
- **PDF embedding rules:** the PDF host can prohibit another site from putting its document inside a frame. This can block embedding while leaving direct navigation usable.

Also check mixed content: an HTTPS page may reject an HTTP image/service. Inspect the exact staging origin and current responses; an old localhost test is not proof of current hosted permissions. The plugin does not enforce the public/restricted content boundary—content-service authorization must do that, including cached derivatives.

### Read-only checks for a maintainer

From the standalone plugin root:

```sh
git rev-parse HEAD
git status --short
npm ci
npm run check:generated
npm test
ruby test/asset_version_test.rb
ruby -r ./public/views/digital_viewer_asset_version -e 'puts DigitalViewerAssetVersion.for_plugin_root(Dir.pwd)'
shasum -a 256 public/assets/digital_viewer.js public/assets/digital_viewer.css public/assets/openseadragon.min.js
```

Compare the helper output with the `?v=` value in the page's asset requests; compare file hashes with fetched **served bytes**, not just filenames. A Git-less installation needs the deployment record/archive checksum instead of `git rev-parse`.

In the browser console, these checks only inspect state:

```js
typeof window.OpenSeadragon
window.DigitalViewer
document.querySelectorAll('.digital-viewer-container').length
document.querySelector('[data-dv-page-context]')?.dataset
```

The settings may contain service URLs; redact before sharing. A container count is not proof of a loaded image or PDF. Do not paste unknown debugging scripts into a logged-in browser.

Local QA normally uses PUI `http://localhost:18081`, Staff `http://localhost:18082`, API port `18089`, and a loopback-only PDF/manifest fixture server at `http://localhost:18090`. The parent Compose default PUI port is `8081`; the QA override uses `18081` to avoid an unrelated listener. Check the running setup instead of restarting services or killing a process to claim a port. Local fixture addresses/IDs must never be copied into staging as content endpoints.

## File-by-file inventory

This inventories all **75 files tracked at the published baseline**, grouping only the repeated icon states. This new guide is an additional documentation file. Files in the parent project, generated local dependencies, `.git/` internals and ignored personal files are not plugin components.

### Root and active public-site files

| File | What it does / when to inspect it |
| --- | --- |
| [.gitignore](../.gitignore) | Excludes local dependencies, environment files, logs and OS clutter from normal Git additions. Not a replacement for checking a release package for secrets. |
| [README.md](../README.md) | Installation pinning, configuration, tests and release cautions. Start here when handing the repository to a host. |
| [SOURCE.md](../SOURCE.md) | Records the original extraction from the parent repository. Its initial commit/test count is historical, not the current candidate. |
| [plugin_init.rb](../plugin_init.rb) | Root ASpace plugin entry, currently comments only. The older source/activation examples in its comments are not the full current feature list; follow README for installation. |
| [public/plugin_init.rb](../public/plugin_init.rb) | Public-application entry, also comments only; points to template/browser work. |
| [public/views/layout_head.html.erb](../public/views/layout_head.html.erb) | Reads public environment settings, escapes them for JavaScript, applies the PUI path prefix, and inserts the three versioned browser asset tags. |
| [public/views/digital_viewer_asset_version.rb](../public/views/digital_viewer_asset_version.rb) | Hashes the ordered filenames and contents of JS/CSS/OSD. Useful for stale assets and rollback identity. |
| [public/views/shared/_digital.html.erb](../public/views/shared/_digital.html.erb) | Preserves stock representative/entry/thumbnail rendering while adding page context and object grouping. Calls stock ASpace helpers and the stock representative-file partial. Upgrade-sensitive. |
| [public/assets/digital_viewer.js](../public/assets/digital_viewer.js) | Main application logic: source scanning/ranking, layout enhancement, rendering, controls, downloads, request ownership, timeouts, fallback and cleanup. |
| [public/assets/digital_viewer.css](../public/assets/digital_viewer.css) | Viewer and surrounding stock-page layout; toolbar, controls, responsive widths, error/loading text, navigation, thumbnails and media containers. Narrow-screen rules mostly use a 767px breakpoint. |
| [public/assets/openseadragon.min.js](../public/assets/openseadragon.min.js) | Bundled third-party OpenSeadragon 5.0.1. Compressed library, not the place for routine plugin fixes. Preserve its notice; upgrades require the ownership/thumbnail/browser regressions. |

There is deliberately **no** tracked `public/views/objects/show.html.erb`. The stock ASpace `shared/representative_file_version_record` is also not a file supplied by this plugin; the partial calls into the installed ASpace version.

### Older files retained under frontend

| File | What it does / caution |
| --- | --- |
| [frontend/assets/javascripts/digital_viewer.js](../frontend/assets/javascripts/digital_viewer.js) | Earlier 175-line viewer with limited detection and minimal controls. It lacks the current public viewer's loading, grouping and recovery work. Not the tested PUI source. |
| [frontend/assets/stylesheets/digital_viewer.css](../frontend/assets/stylesheets/digital_viewer.css) | Earlier six-line container styling; not the current responsive stylesheet. |
| [frontend/views/layouts/_digital_viewer_assets.html.erb](../frontend/views/layouts/_digital_viewer_assets.html.erb) | Earlier asset/config injection partial, with different defaults. Its comments describe an old integration approach; they do not establish that current PUI pages load it. |

ASpace's `frontend` name refers to its staff-side application area; do not confuse it with the visitor's browser or the parent project's React `frontend/`. Verify actual asset requests when uncertain. Do not silently delete or synchronize these legacy files: checking their Staff/PUI loading and distribution impact is the separate WBL-0901 task.

### Bundled PNG icons

All files in this group live in `public/images/`. Each family below has four exact filenames, formed by adding `_rest.png`, `_hover.png`, `_pressed.png`, and `_grouphover.png`. Those states mean idle, pointer-over, pressed and pointer-over-control-group. For example: `flip_rest.png`, `flip_hover.png`, `flip_pressed.png`, `flip_grouphover.png`.

| Filename family | All four files represent |
| --- | --- |
| `public/images/flip_*.png` | Flip image control |
| `public/images/fullpage_*.png` | Full-page control |
| `public/images/home_*.png` | Return to the home/fit view |
| `public/images/next_*.png` | Next page |
| `public/images/previous_*.png` | Previous page |
| `public/images/rotateleft_*.png` | Rotate left |
| `public/images/rotateright_*.png` | Rotate right |
| `public/images/zoomin_*.png` | Zoom in |
| `public/images/zoomout_*.png` | Zoom out |

These are **36 files**, not separate programs. The current plugin disables OSD's built-in navigation/sequence controls and builds its own buttons with text/CSS symbols. These PNGs are not what draws the current custom toolbar; inspect the JS/CSS first if those controls look wrong.

### Tests and browser helpers

| File | Purpose and requirements |
| --- | --- |
| [test/digital_viewer.test.mjs](../test/digital_viewer.test.mjs) | 70 automated Node tests at the baseline. Loads the main public JS into a small simulated browser environment. Covers source selection, grouping, loading, stale callbacks, thumbnails and controls. Does not prove real browser layout or hosted access. |
| [test/asset_version_test.rb](../test/asset_version_test.rb) | Tests the actual Ruby hashing helper with temporary files: changed JS bytes change the version despite fixed timestamps; identical copied bytes retain it despite different timestamps. Not a full deployed-cache rollback test. |
| [test/browser/README.md](../test/browser/README.md) | Commands and prerequisites for each browser helper; explicit browser contexts are required. See the dependency note below. |
| [test/browser/source-request-ownership.mjs](../test/browser/source-request-ownership.mjs) | Real OSD with intercepted test responses. Delays/fails old page requests to verify they cannot overwrite newer ones. Needs Playwright/browser and plugin files, not ASpace. |
| [test/browser/thumbnail-queue.mjs](../test/browser/thumbnail-queue.mjs) | Holds real thumbnail responses open: six timeout/disposal scenarios, native/no observer, cancellation and late-response safety. Uses about 45 seconds of real time. No ASpace needed. |
| [test/browser/local-layout.mjs](../test/browser/local-layout.mjs) | Checks actual local ASpace records at several widths, sidebar configurations, keyboard actions, resizing and tree navigation. Needs the ledger's local fixture database and running ASpace; changing a DOM label is not a real sidebar-config test. |
| [test/browser/local-formats.mjs](../test/browser/local-formats.mjs) | Checks local PDF/scanned-text examples, blocked embedding/direct access and separate objects. Needs local ASpace, the loopback fixture server and installed Chrome for its native PDF checks. It does not create records. |

### Documentation and saved evidence

These files explain decisions and preserve observations. They do not execute during a visitor's page load. Treat dates, candidate hashes and test counts as part of each observation; older results do not automatically apply to the latest candidate.

| File | Purpose |
| --- | --- |
| [docs/plugin-maintenance-guide.md](plugin-maintenance-guide.md) | This operational explanation and complete baseline file inventory. |
| [docs/fixture-ledger.md](fixture-ledger.md) | Local record IDs, expected content, page counts, representative/thumbnail cases and source-grouping examples. Local IDs are not hosted IDs. |
| [docs/lyrasis-staging-launch-task-list.md](lyrasis-staging-launch-task-list.md) | Detailed implementation tasks, test matrix, responsibilities and staging approval requirements. |
| [docs/staging-release-evidence.md](staging-release-evidence.md) | Dated implementation/test/review history. Read the candidate/date with each result. |
| [docs/staging-signoff-2026-09-16.md](staging-signoff-2026-09-16.md) | Local acceptance boundary, remaining work and Gate A/B definitions. Later merge approval does not close these installation gates. |
| [docs/thumbnail-queue-correction-2026-09-17.md](thumbnail-queue-correction-2026-09-17.md) | Timeout correction, hashes, negative control, measured Chrome results and limitations. Its pending-review wording predates the subsequently accepted review/merge. |
| [docs/claude-pre-merge-review-2026-09-17.md](claude-pre-merge-review-2026-09-17.md) | Request for cumulative independent review, with immutable targets and reviewer responsibilities. Not itself proof of approval. |
| [docs/independent-review-handoff-2026-09-16.md](independent-review-handoff-2026-09-16.md) | Earlier R03/request-ownership handoff and reproduction instructions. Historical target. |
| [docs/local-validation-2026-09-16.md](local-validation-2026-09-16.md) | Local ASpace/fixture integration checkpoint, recorded findings and limitations. |
| [docs/local-layout-validation-2026-09-16.md](local-layout-validation-2026-09-16.md) | Layout, URL/prefix, sidebar, keyboard and tree-navigation observations, including stock leaf-tree behavior. |
| [docs/local-formats-validation-2026-09-16.md](local-formats-validation-2026-09-16.md) | PDF/scanned-text source provenance, hashes, local fixture setup and observed browser results. |
| [docs/plugin-pilot-checkpoint-2026-09-10.md](plugin-pilot-checkpoint-2026-09-10.md) | Earlier public-delivery pilot and record-workflow checkpoint. |
| [docs/workbench-lite/archivesspace-4.2.0-pilot.md](workbench-lite/archivesspace-4.2.0-pilot.md) | Earlier compatibility pilot, local-stack details, manifest hosting and thumbnail/cache follow-ups. |
| [docs/evidence/20-20-1983.local.json](evidence/20-20-1983.local.json) | Saved local scanned-text IIIF manifest used with the six-page example. Test content, not site configuration. |
| [docs/evidence/local-aspace-2026-09-16.json](evidence/local-aspace-2026-09-16.json) | Saved observations for pilot/archival/edge records, navigation and failure controls. |
| [docs/evidence/local-aspace-2026-09-16.mjs](evidence/local-aspace-2026-09-16.mjs) | Read-only Playwright observation functions for those local records. Reports measurements; callers must compare them with expectations. Does not create records or assert full release acceptance. |
| [docs/evidence/local-format-fixtures-2026-09-16.json](evidence/local-format-fixtures-2026-09-16.json) | Saved inventory of the twelve local format-fixture records. Not an automatic installer or a complete database backup. |
| [docs/evidence/local-formats-2026-09-16.json](evidence/local-formats-2026-09-16.json) | Detailed saved PDF, blocked-PDF, scanned-text, separate-object and source-policy observations. |
| [docs/evidence/local-layout-2026-09-16.json](evidence/local-layout-2026-09-16.json) | Detailed saved layout/sidebar/keyboard/render/asset checks and negative controls. |

Snapshots are evidence, not authoritative deployment settings. Some historical documents reference files in the parent workspace that are not in the standalone package. Do not assume a JSON evidence file is safe to POST to the ArchivesSpace API or restore over a current record.

## Where to look inside the main JavaScript file

Search for the function name in `public/assets/digital_viewer.js`; names are more durable than line numbers. The small helper functions between these sections support the listed jobs.

| Area | Useful names | What to check |
| --- | --- | --- |
| Settings and URLs | `cfg`, `parseCantaloupeBase`, `parseCompassHost`, `sanitizeUrl` | Empty/invalid settings, expected host, supported URL forms |
| Recognition/ranking | `detectSource`, `descriptorPriority`, `descriptorSelectionPriority`, `buildDescriptorSelection` | Why a link is ignored or one source wins over another; PDF companion rule |
| Image controls | `addControls`, `buildPrimaryControls`, `buildAdjustPopover`, `syncToolbarState`, `applyViewerImageAdjustments` | Toolbar, zoom status, flip/rotation, sliders and Escape/click handlers |
| Page/download controls | `addPageNav`, `addViewerModeActions`, `syncViewerModeActions`, `getTileSourceImageUrl` | Page numbering, object/page mode and current image download |
| Thumbnail requests | `buildThumbnailUrl`, `addThumbnailCarousel`, `THUMBNAIL_TIMEOUT_MS` | Preview URL, visibility, serial queue, timeout, cancellation and disposal |
| Nearby description prefetch | `getPreloadPageIndexes`, `primeResourceUrl`, `warmSequenceCache` | Extra nearby `info.json` requests; not the thumbnail queue |
| Main image viewer | `mountOsdViewer` | OSD construction, handlers attached before `open`, page/image/request ownership, tile failures and recovery |
| User messages | `showLoadingNotice`, `clearLoadingNotice`, `showError`, `reportFailure` | Loading versus page error versus whole-group failure; safe diagnostic codes |
| Lifecycle and fallback | `getLoadingTimeout`, `scheduleAttemptTimeout`, `disposeAttempt`, `disposeMountState`, `isAttemptActive` | Shared opening deadline, cancellation, late callbacks, replacing/reusing viewers |
| Direct files | `mountStaticImage`, `waitForImageLoad`, `mountPdfViewer` | Ordinary image load success/failure; PDF frame/direct link behavior |
| Legacy/converted image services | `toLocalCantaloupeInfoUrl`, `mountCantaloupe`, `extractCompassTileSources`, `mountCompass`, `mountCompassManifest` | Encoded file keys, expected Presentation 2 structure, resolver versus direct fetch |
| Preservica adapter | `extractManifestContent`, `mountPreservica`, `mountVideoViewer`, `mountAudioViewer` | Separate backend/Presentation 3 path; not a generic replacement for the pilot manifest parser |
| Link discovery/grouping | `collectSourceAnchors`, `collectFileUris`, `findGroupRoot`, `findInsertAfter` | Published page links, representative/thumbnail branches and correct inline placement |
| Stock layout integration | `getPageContext`, `classifyPageContext`, `prepareLeafLayout`, `restoreLeafLayoutIfUnused` | Leaf-only columns, existing stock pane, reuse and restoration |
| Starting and choosing the renderer | `init`, `mountDescriptor`, `resetContainer` | OSD availability, groups/candidate order, repeated initialization and cleanup |

## Tests and safe maintenance

The 70-test Node suite and Ruby asset test were verified for the published baseline. The independent review also reproduced the six thumbnail-browser scenarios, both request-ownership scenarios, the old-runtime negative control and local PUI asset identity. This does not mean every browser, every local test-matrix row, or hosted behavior is accepted.

Browser helpers need **Playwright available to the Node process** and an installed browser. `import ... from 'playwright'` in the browser README only works when that package resolves from the runner's location. A copy in the npx cache is not automatically available by bare name from the plugin root. Use a prepared external QA environment or its explicit module path; do not add a hard-coded user-specific cache path to the plugin. Use an explicit `browser.newContext()` and create the page from it, since helpers open their own tabs. Close only the test context/browser you created.

For a change:

1. Record the failing page, environment and exact installed commit before editing.
2. Make the smallest change in the correct `public/` file; add a failing regression before a runtime fix. Do not patch the minified library or legacy duplicate to hide a symptom.
3. Run Node/Ruby/syntax checks and the relevant real-browser test. Mirror the corresponding files into the parent Docker plugin before claiming local ASpace verified the change.
4. Check the served asset bytes/version, not just source files. If configuration changes, coordinate the appropriate ASpace restart with its operator.
5. Record the new commit and evidence, including what was not tested. Preserve original links and record values. Do not edit dated evidence to pretend it was collected against the new code.
6. Obtain review/approval appropriate to the change. Package preparation, a rehearsed rollback and Gate A approval still precede Lyrasis installation; hosted checks follow under Gate B.

On an ArchivesSpace upgrade, recheck the stock shared partial/helpers, the page selectors used by this plugin, the actual PUI prefix and other installed plugins. Removing the full object-page override reduces upgrade risk; it does not eliminate it. On an OSD upgrade, rerun the real request-ownership and thumbnail tests, not only simulated Node checks.

Rollback needs two separate records: the prior plugin/configuration and any changed ArchivesSpace File Versions. Restoring code does not restore record links. This guide explains where to investigate; it does not authorize server restarts, record edits, security-policy changes or destructive cleanup.
