/**
 * digital_viewer — ArchivesSpace PUI plugin
 *
 * Scans the page for digital object file URIs and mounts an OpenSeadragon
 * IIIF viewer when a Compass S3 TIFF (served via Cantaloupe) or a Preservica
 * IIIF manifest is detected.
 *
 * No build step required — this is vanilla JS loaded by the PUI layout.
 * OpenSeadragon is loaded from the same assets directory.
 *
 * Configuration (set these on window before this script loads, or via a
 * data attribute on <body>):
 *
 *   window.DigitalViewer = {
 *     cantaloupeBaseUrl: 'https://your-server/iiif/2',   // required for S3 TIFFs
 *     compassHost: 'compass.fivecolleges.edu',           // default shown
 *   };
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const cfg = Object.assign({
    cantaloupeBaseUrl: '/iiif/2',
    compassHost: 'compass.fivecolleges.edu',
  }, window.DigitalViewer || {});

  // Regex for a Preservica / generic UUID in a URI
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // ── Source detection ──────────────────────────────────────────────────────

  /**
   * Given a file_uri string, return a viewer descriptor or null.
   *
   * @returns {{ type: 'cantaloupe', infoUrl: string }
   *          |{ type: 'preservica', manifestUrl: string }
   *          | null}
   */
  function detectSource(fileUri) {
    if (!fileUri) return null;

    // Compass S3 TIFF — strip host + /system/files/ → date-path key for Cantaloupe
    if (fileUri.includes(cfg.compassHost + '/system/files/')) {
      const pos = fileUri.indexOf('/system/files/');
      if (pos !== -1) {
        const s3Key = fileUri.slice(pos + '/system/files/'.length);
        // Only image formats we can deep-zoom
        if (/\.(tiff?|jp2|jpe?g|png)$/i.test(s3Key)) {
          const infoUrl = cfg.cantaloupeBaseUrl + '/' + encodeURIComponent(s3Key) + '/info.json';
          return { type: 'cantaloupe', infoUrl };
        }
      }
    }

    // Preservica UUID — expect the consuming page to expose a manifest URL
    // via a data attribute on the file-version element.
    const uuidMatch = fileUri.match(UUID_RE);
    if (uuidMatch) {
      // Manifest URL is built server-side; look for it on the element.
      // Fallback: we can construct it if the Preservica API base is known.
      return { type: 'preservica', uuid: uuidMatch[0], manifestUrl: null };
    }

    return null;
  }

  // ── Viewer mount ─────────────────────────────────────────────────────────

  function mountViewer(container, descriptor) {
    container.innerHTML = '';
    container.style.cssText = 'width:100%;height:500px;background:#111;border-radius:8px;overflow:hidden;';

    const viewerEl = document.createElement('div');
    viewerEl.style.cssText = 'width:100%;height:100%;';
    container.appendChild(viewerEl);

    const tileSources = descriptor.type === 'cantaloupe'
      ? descriptor.infoUrl
      : { type: 'legacy-image-pyramid', levels: [{ url: descriptor.manifestUrl }] };

    /* global OpenSeadragon */
    const viewer = OpenSeadragon({
      element: viewerEl,
      tileSources,
      showNavigationControl: false,
      defaultZoomLevel: 0,
      minZoomLevel: 0.05,
      animationTime: 0.3,
      gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
    });

    // Minimal floating controls
    const controls = document.createElement('div');
    controls.style.cssText = 'position:absolute;top:8px;left:8px;z-index:10;display:flex;flex-direction:column;gap:4px;';
    controls.innerHTML = [
      ['＋', () => viewer.viewport.zoomBy(2)],
      ['－', () => viewer.viewport.zoomBy(0.5)],
      ['⌂', () => viewer.viewport.goHome()],
    ].map(([label]) =>
      `<button style="width:32px;height:32px;background:rgba(255,255,255,.9);border:1px solid #ccc;` +
      `border-radius:4px;cursor:pointer;font-size:16px;line-height:1;">${label}</button>`
    ).join('');

    // Wire up click handlers after inserting into DOM
    container.style.position = 'relative';
    container.appendChild(controls);
    const btns = controls.querySelectorAll('button');
    btns[0].addEventListener('click', () => viewer.viewport.zoomBy(2));
    btns[1].addEventListener('click', () => viewer.viewport.zoomBy(0.5));
    btns[2].addEventListener('click', () => viewer.viewport.goHome());
  }

  // ── Page scan ─────────────────────────────────────────────────────────────

  /**
   * Find file_uri values in the page.
   *
   * ASpace PUI renders digital object file versions in a <dl> with
   * <dt>File URI</dt><dd><a href="...">...</a></dd>.
   * We also accept data-file-uri attributes for theme overrides.
   */
  function collectFileUris() {
    const uris = [];

    // data-file-uri attribute (theme / future templates)
    document.querySelectorAll('[data-file-uri]').forEach((el) => {
      uris.push({ uri: el.dataset.fileUri, anchor: el });
    });

    // ASpace default PUI rendering
    document.querySelectorAll('dt').forEach((dt) => {
      if (/file uri/i.test(dt.textContent)) {
        const dd = dt.nextElementSibling;
        if (dd) {
          const a = dd.querySelector('a');
          const uri = a ? a.href : dd.textContent.trim();
          if (uri) uris.push({ uri, anchor: dd });
        }
      }
    });

    return uris;
  }

  function init() {
    if (typeof OpenSeadragon === 'undefined') {
      console.warn('[digital_viewer] OpenSeadragon not loaded — viewer will not mount.');
      return;
    }

    const fileUris = collectFileUris();
    if (fileUris.length === 0) return;

    fileUris.forEach(({ uri, anchor }) => {
      const descriptor = detectSource(uri);
      if (!descriptor) return;

      // Insert a viewer container immediately after the file URI entry
      const container = document.createElement('div');
      container.className = 'digital-viewer-container';
      anchor.closest('dl, .digital-object, .instance')?.after(container)
        ?? anchor.parentNode?.insertBefore(container, anchor.nextSibling);

      mountViewer(container, descriptor);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
