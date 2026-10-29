import { extractManifestContent as parseManifestContent } from '../manifest.mjs';

// The backend handles Preservica authentication and content delivery.
function getManifestUrl(config, uuid) {
  return config.preservicaApiBase.replace(/\/$/, '') + '/api/iiif/' + uuid + '/manifest.json';
}

function requestManifest(dependencies, manifestUrl, mountOptions) {
  const { fetch, isAttemptActive } = dependencies;
  return fetch(manifestUrl, { signal: mountOptions.signal })
    .then(function (response) {
      if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
}

function extractContent(dependencies, manifest) {
  return parseManifestContent(manifest, function () {
    dependencies.console.warn('[digital_viewer] stage=manifest code=invalid-canvas');
  });
}

function countRenderableContent(content) {
  return content.images.length + content.videos.length + content.audio.length + content.pdfs.length;
}

function mountImageContent(dependencies, container, images, mountOptions) {
  const { mountOsdViewer } = dependencies;
  const osdSources = images.map(function (image) {
    return { type: 'image', url: image.url };
  });
  return mountOsdViewer(
    container,
    osdSources.length === 1 ? osdSources[0] : osdSources,
    mountOptions
  );
}

function mountContent(dependencies, container, content, mountOptions) {
  const { mountVideoViewer, mountAudioViewer, mountPdfViewer, clearLoadingNotice } = dependencies;
  if (content.videos.length > 0) mountVideoViewer(container, content.videos);
  if (content.audio.length > 0) mountAudioViewer(container, content.audio);
  if (content.images.length > 0) {
    return mountImageContent(dependencies, container, content.images, mountOptions);
  }
  if (content.pdfs.length > 0) mountPdfViewer(container, content.pdfs[0]);
  clearLoadingNotice(container);
}

function mountManifestContent(dependencies, container, manifest, mountOptions) {
  const { isAttemptActive } = dependencies;
  if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
  const content = extractContent(dependencies, manifest);
  if (countRenderableContent(content) === 0) throw new Error('No renderable content found in manifest');
  return mountContent(dependencies, container, content, mountOptions);
}

function mountPreservica(dependencies, container, descriptor, mountOptions) {
  const { config, reportFailure, isAttemptActive } = dependencies;
  if (!config.preservicaApiBase) {
    reportFailure(container, 'configuration', 'preservica-unavailable');
    return Promise.reject(new Error('PRESERVICA_UNAVAILABLE'));
  }
  const manifestUrl = getManifestUrl(config, descriptor.uuid);
  return requestManifest(dependencies, manifestUrl, mountOptions)
    .then(function (manifest) {
      return mountManifestContent(dependencies, container, manifest, mountOptions);
    })
    .catch(function (error) {
      if (!isAttemptActive(mountOptions.attempt)) throw error;
      reportFailure(container, 'preservica', 'manifest-unavailable');
      throw error;
    });
}

export function createPreservicaAdapter(dependencies) {
  return function mountPreservicaAdapter(container, descriptor, mountOptions) {
    return mountPreservica(dependencies, container, descriptor, mountOptions);
  };
}
