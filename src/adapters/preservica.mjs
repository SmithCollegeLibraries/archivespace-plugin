import { extractManifestContent } from '../manifest.mjs';

// The backend handles Preservica authentication and content delivery.
export function createPreservicaAdapter({ config: cfg, fetch, console, isAttemptActive, reportFailure,
  mountOsdViewer, mountVideoViewer, mountAudioViewer, mountPdfViewer }) {
  function mountPreservica(container, descriptor, mountOptions) {
    if (!cfg.preservicaApiBase) {
      reportFailure(container, 'configuration', 'preservica-unavailable');
      return Promise.reject(new Error('PRESERVICA_UNAVAILABLE'));
    }

    var manifestUrl = cfg.preservicaApiBase.replace(/\/$/, '') + '/api/iiif/' + descriptor.uuid + '/manifest.json';

    return fetch(manifestUrl, { signal: mountOptions.signal })
      .then(function (res) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
        var content = extractManifestContent(manifest, function () {
          console.warn('[digital_viewer] stage=manifest code=invalid-canvas');
        });
        var total = content.images.length + content.videos.length + content.audio.length + content.pdfs.length;

        if (total === 0) {
          throw new Error('No renderable content found in manifest');
        }

        // Render each content type. Most Preservica objects have a single type,
        // but the spec allows mixed manifests.
        if (content.videos.length > 0) {
          mountVideoViewer(container, content.videos);
        }
        if (content.audio.length > 0) {
          mountAudioViewer(container, content.audio);
        }
        if (content.images.length > 0) {
          // Preservica images don't have a IIIF Image API behind them, so we
          // use OSD's simple image mode (static rendering, no deep zoom).
          var osdSources = content.images.map(function (img) {
            return { type: 'image', url: img.url };
          });
          return mountOsdViewer(container, osdSources.length === 1 ? osdSources[0] : osdSources, mountOptions);
        }
        if (content.pdfs.length > 0) {
          mountPdfViewer(container, content.pdfs[0]);
        }
      })
      .catch(function (err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, 'preservica', 'manifest-unavailable');
        throw err;
      });
  }

  return mountPreservica;
}
