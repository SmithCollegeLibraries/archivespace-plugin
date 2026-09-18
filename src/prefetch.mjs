import { getTileSourceValue } from './tile-sources.mjs';

const SEQUENCE_PRELOAD_DISTANCE = 2;

export function getPreloadPageIndexes(activeIndex, total, distance) {
  var indexes = [];
  var radius = typeof distance === 'number' ? distance : SEQUENCE_PRELOAD_DISTANCE;
  var offset;

  if (total <= 0) return indexes;

  indexes.push(activeIndex);

  for (offset = 1; offset <= radius; offset += 1) {
    if (activeIndex - offset >= 0) {
      indexes.push(activeIndex - offset);
    }
    if (activeIndex + offset < total) {
      indexes.push(activeIndex + offset);
    }
  }

  return indexes;
}

export function createPrefetch({ fetch, Image, registerAttemptCleanup }) {
  var warmedResourceUrls = {};

  function primeResourceUrl(url, useFetch, options) {
    var attempt = options && options.attempt;
    if (attempt && attempt.active === false) return;
    var warmed = attempt ? (attempt.warmedResourceUrls || (attempt.warmedResourceUrls = {})) : warmedResourceUrls;
    if (!url || warmed[url]) return;
    warmed[url] = true;

    if (useFetch && typeof fetch === 'function') {
      var request;
      try {
        request = fetch(url, { cache: 'force-cache', signal: attempt && attempt.controller ? attempt.controller.signal : undefined });
      } catch (err) {
        delete warmed[url];
        return;
      }
      Promise.resolve(request)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .catch(function () {
          delete warmed[url];
        });
      return;
    }

    if (typeof Image !== 'undefined') {
      var image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      if (attempt && registerAttemptCleanup) registerAttemptCleanup(attempt, function () {
        image.removeAttribute('src');
      });
      image.src = url;
    }
  }

  function warmSequenceCache(tileSources, activeIndex, options) {
    getPreloadPageIndexes(activeIndex, tileSources.length, SEQUENCE_PRELOAD_DISTANCE)
      .forEach(function (index) {
        var tileSource = tileSources[index];
        var osdTileSource = getTileSourceValue(tileSource);

        if (typeof osdTileSource === 'string' && /\/info\.json(?:\?.*)?$/i.test(osdTileSource)) {
          primeResourceUrl(osdTileSource, true, options);
        }
      });
  }

  return { primeResourceUrl, warmSequenceCache };
}
