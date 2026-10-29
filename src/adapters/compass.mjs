import { extractManifestPages, hasRenderablePages } from '../manifest.mjs';

// Transitional Compass/Islandora compatibility; remove during the Islandora exit cutover.
export function toLocalCantaloupeInfoUrl(serviceId, cfg) {
  if (!serviceId) return '';

  var normalized = serviceId.replace(/\/$/, '');
  var marker = '/iiif/2/';
  var pos = normalized.indexOf(marker);

  if (pos === -1) {
    return normalized + '/info.json';
  }

  var identifier = normalized.slice(pos + marker.length);
  var decoded;

  try {
    decoded = decodeURIComponent(identifier);
  } catch {
    decoded = identifier;
  }

  var fileMarker = '/system/files/';
  var filePos = decoded.indexOf(fileMarker);
  if (filePos === -1) {
    return normalized + '/info.json';
  }
  if (!cfg.cantaloupeBaseUrl) return '';

  var s3Key = decoded.slice(filePos + fileMarker.length);
  try {
    s3Key = decodeURIComponent(s3Key);
  } catch {
    // Keep the partially decoded key when nested encoding is malformed.
  }
  return cfg.cantaloupeBaseUrl + '/' + encodeURIComponent(s3Key) + '/info.json';
}

function parsePages(manifest, config) {
  return extractManifestPages(manifest, function (serviceId) {
    return toLocalCantaloupeInfoUrl(serviceId, config);
  });
}

function fetchManifestUrl(dependencies, url, mountOptions) {
  const { config, fetch, isAttemptActive } = dependencies;
  const isCompassManifest = new URL(url).hostname === config.compassHost;
  const useProxy = config.compassProxyUrl && isCompassManifest;
  const requestUrl = useProxy ? config.compassProxyUrl + '?url=' + encodeURIComponent(url) : url;
  return fetch(requestUrl, { signal: mountOptions.signal }).then(function (res) {
    if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
    if (!res.ok) throw new Error((useProxy ? 'Proxy HTTP ' : 'Manifest HTTP ') + res.status);
    return res.json();
  });
}

function fetchProxyManifest(dependencies, descriptor, mountOptions) {
  const { config, fetch, isAttemptActive } = dependencies;
  const requestUrl = config.compassProxyUrl + '?url=' + encodeURIComponent(descriptor.compassUrl);
  return fetch(requestUrl, { signal: mountOptions.signal }).then(function (res) {
    if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
    if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
    return res.json();
  });
}

function fetchRedirectedManifest(dependencies, descriptor, mountOptions, compassBase) {
  const { fetch, isAttemptActive } = dependencies;
  return fetch(descriptor.compassUrl, { redirect: 'follow', signal: mountOptions.signal })
    .then(function (res) {
      if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
      const nodeMatch = res.url.match(/\/node\/(\d+)/);
      if (!nodeMatch) throw new Error('Could not resolve Compass node from: ' + res.url);
      return fetch(compassBase + '/node/' + nodeMatch[1] + '/manifest', { signal: mountOptions.signal });
    })
    .then(function (res) {
      if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
      if (!res.ok) throw new Error('Manifest HTTP ' + res.status);
      return res.json();
    });
}

function fetchCompassManifest(dependencies, descriptor, mountOptions, compassBase) {
  if (dependencies.config.compassProxyUrl) {
    return fetchProxyManifest(dependencies, descriptor, mountOptions);
  }
  return fetchRedirectedManifest(dependencies, descriptor, mountOptions, compassBase);
}

function mountManifestPages(dependencies, container, manifest, mountOptions) {
  const { isAttemptActive, mountOsdViewer } = dependencies;
  if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
  const tileSources = parsePages(manifest, dependencies.config);
  if (!hasRenderablePages(tileSources)) throw new Error('No renderable image services in manifest');
  return mountOsdViewer(container, tileSources, mountOptions);
}

function mountCompass(dependencies, container, descriptor, mountOptions) {
  const { config, isAttemptActive, reportFailure } = dependencies;
  const compassBase = config.compassBaseUrl || ('https://' + config.compassHost);
  return fetchCompassManifest(dependencies, descriptor, mountOptions, compassBase)
    .then(function (manifest) {
      return mountManifestPages(dependencies, container, manifest, mountOptions);
    })
    .catch(function (error) {
      if (!isAttemptActive(mountOptions.attempt)) throw error;
      reportFailure(container, 'compass', 'content-unavailable');
      throw error;
    });
}

export function createCompassAdapter(dependencies) {
  return {
    mountCompass: function (container, descriptor, options) {
      return mountCompass(dependencies, container, descriptor, options);
    },
    fetchManifestUrl: function (url, options) {
      return fetchManifestUrl(dependencies, url, options);
    },
    parsePages: function (manifest) { return parsePages(manifest, dependencies.config); },
  };
}
