import { extractManifestPages, hasRenderablePages } from '../manifest.mjs';

// Transitional Compass/Islandora compatibility; remove with WBL-0905.
export function toLocalCantaloupeInfoUrl(serviceId, cfg) {
  if (!serviceId) return '';

  var normalized = serviceId.replace(/\/$/, '');
  var marker = '/iiif/2/';
  var pos = normalized.indexOf(marker);

  if (pos === -1) {
    return normalized + '/info.json';
  }

  var identifier = normalized.slice(pos + marker.length);
  var decoded = '';

  try {
    decoded = decodeURIComponent(identifier);
  } catch (err) {
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
  } catch (err2) {
    // Keep the partially decoded key when nested encoding is malformed.
  }
  return cfg.cantaloupeBaseUrl + '/' + encodeURIComponent(s3Key) + '/info.json';
}

export function createCompassAdapter({ config: cfg, fetch, isAttemptActive, mountOsdViewer, reportFailure }) {
  function parsePages(manifest) {
    return extractManifestPages(manifest, function (serviceId) {
      return toLocalCantaloupeInfoUrl(serviceId, cfg);
    });
  }

  function fetchManifestUrl(url, mountOptions) {
    var isCompassManifest = new URL(url).hostname === cfg.compassHost;
    var useProxy = cfg.compassProxyUrl && isCompassManifest;
    var requestUrl = useProxy ? cfg.compassProxyUrl + '?url=' + encodeURIComponent(url) : url;
    return fetch(requestUrl, { signal: mountOptions.signal }).then(function (res) {
      if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
      if (!res.ok) throw new Error((useProxy ? 'Proxy HTTP ' : 'Manifest HTTP ') + res.status);
      return res.json();
    });
  }

  function mountCompass(container, descriptor, mountOptions) {
    var compassBase = cfg.compassBaseUrl || ('https://' + cfg.compassHost);

    // Use a server-side proxy when configured (required in browsers due to CORS
    // on the Islandora → Drupal redirect).  The proxy follows the redirect and
    // returns the full IIIF manifest JSON in a single response.
    var fetchManifest;
    if (cfg.compassProxyUrl) {
      fetchManifest = fetch(
        cfg.compassProxyUrl + '?url=' + encodeURIComponent(descriptor.compassUrl),
        { signal: mountOptions.signal }
      ).then(function (res) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
        if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
        return res.json();
      });
    } else {
      // Fallback: direct fetch (only works if Islandora endpoint allows CORS)
      fetchManifest = fetch(descriptor.compassUrl, { redirect: 'follow', signal: mountOptions.signal })
        .then(function (res) {
          if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
          var nodeMatch = res.url.match(/\/node\/(\d+)/);
          if (!nodeMatch) throw new Error('Could not resolve Compass node from: ' + res.url);
          return fetch(compassBase + '/node/' + nodeMatch[1] + '/manifest', { signal: mountOptions.signal });
        })
        .then(function (res) {
          if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
          if (!res.ok) throw new Error('Manifest HTTP ' + res.status);
          return res.json();
        });
    }

    return fetchManifest
      .then(function (manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error('ATTEMPT_DISPOSED');
        var tileSources = parsePages(manifest);
        if (!hasRenderablePages(tileSources)) throw new Error('No renderable image services in manifest');
        return mountOsdViewer(container, tileSources, mountOptions);
      })
      .catch(function (err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, 'compass', 'content-unavailable');
        throw err;
      });
  }

  return { mountCompass, fetchManifestUrl, parsePages };
}
