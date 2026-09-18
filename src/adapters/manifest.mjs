import { hasRenderablePages } from '../manifest.mjs';

export function createManifestAdapter({ fetchManifestUrl, parsePages, isAttemptActive, mountOsdViewer, reportFailure }) {
  function mountManifest(container, descriptor, mountOptions) {
    var fetchManifest = fetchManifestUrl(descriptor.manifestUrl, mountOptions);

    return fetchManifest
      .then(function (manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
        var tileSources = parsePages(manifest);
        if (!hasRenderablePages(tileSources)) throw new Error('No renderable image services in manifest');
        return mountOsdViewer(container, tileSources, mountOptions);
      })
      .catch(function (err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, 'manifest', 'content-unavailable');
        throw err;
      });
  }

  return mountManifest;
}
