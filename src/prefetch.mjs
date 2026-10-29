import { getTileSourceValue } from './tile-sources.mjs';

const SEQUENCE_PRELOAD_DISTANCE = 2;

export function getPreloadPageIndexes(activeIndex, total, distance) {
  var indexes = [];
  var radius = typeof distance === 'number' ? distance : SEQUENCE_PRELOAD_DISTANCE;
  var offset;
  if (total <= 0) return indexes;
  indexes.push(activeIndex);
  for (offset = 1; offset <= radius; offset += 1) {
    if (activeIndex - offset >= 0) indexes.push(activeIndex - offset);
    if (activeIndex + offset < total) indexes.push(activeIndex + offset);
  }
  return indexes;
}

function getAttemptResources(attempt, sharedResources) {
  if (attempt && attempt.active === false) return null;
  if (!attempt) return sharedResources;
  return attempt.warmedResourceUrls || (attempt.warmedResourceUrls = {});
}

function markResourceWarmed(warmedResources, url) {
  if (!url || warmedResources[url]) return false;
  warmedResources[url] = true;
  return true;
}

function clearWarmedResource(warmedResources, url) {
  delete warmedResources[url];
}

function fetchResource(fetch, url, attempt, warmedResources) {
  let request;
  try {
    request = fetch(url, {
      cache: 'force-cache',
      signal: attempt && attempt.controller ? attempt.controller.signal : undefined,
    });
  } catch {
    clearWarmedResource(warmedResources, url);
    return;
  }
  Promise.resolve(request)
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.text();
    })
    .catch(function () { clearWarmedResource(warmedResources, url); });
}

function warmWithImage(Image, registerAttemptCleanup, attempt, url) {
  if (typeof Image === 'undefined') return;
  const image = new Image();
  image.decoding = 'async';
  image.loading = 'eager';
  if (attempt && registerAttemptCleanup) {
    registerAttemptCleanup(attempt, function () { image.removeAttribute('src'); });
  }
  image.src = url;
}

function primeResourceUrl(dependencies, sharedResources, url, useFetch, options) {
  const { fetch, Image, registerAttemptCleanup } = dependencies;
  const attempt = options && options.attempt;
  const warmedResources = getAttemptResources(attempt, sharedResources);
  if (!warmedResources || !markResourceWarmed(warmedResources, url)) return;
  if (useFetch && typeof fetch === 'function') {
    fetchResource(fetch, url, attempt, warmedResources);
    return;
  }
  warmWithImage(Image, registerAttemptCleanup, attempt, url);
}

function isIiifInfoUrl(tileSource) {
  return typeof tileSource === 'string' && /\/info\.json(?:\?.*)?$/i.test(tileSource);
}

function warmSequenceCache(dependencies, sharedResources, tileSources, activeIndex, options) {
  getPreloadPageIndexes(activeIndex, tileSources.length, SEQUENCE_PRELOAD_DISTANCE)
    .forEach(function (index) {
      const tileSource = getTileSourceValue(tileSources[index]);
      if (isIiifInfoUrl(tileSource)) {
        primeResourceUrl(dependencies, sharedResources, tileSource, true, options);
      }
    });
}

export function createPrefetch(dependencies) {
  const warmedResourceUrls = {};
  return {
    primeResourceUrl: function (url, useFetch, options) {
      primeResourceUrl(dependencies, warmedResourceUrls, url, useFetch, options);
    },
    warmSequenceCache: function (tileSources, activeIndex, options) {
      warmSequenceCache(dependencies, warmedResourceUrls, tileSources, activeIndex, options);
    },
  };
}
