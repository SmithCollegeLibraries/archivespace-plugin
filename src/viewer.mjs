import { getLoadingTimeout } from './config.mjs';
import { UNAVAILABLE_TILE_SOURCE } from './manifest.mjs';
import { getTileSourceValue, isUnavailableTileSource, buildThumbnailUrl } from './tile-sources.mjs';

export function createViewer({ document, OpenSeadragon, setTimeout, clearTimeout, resetContainer,
  showLoadingNotice, clearLoadingNotice, isAttemptActive, disposeViewer, registerAttemptCleanup,
  addControls, addPageNav, addViewerModeActions, addThumbnailCarousel, warmSequenceCache, primeResourceUrl }) {
  function mountOsdViewer(container, tileSources, options) {
    var openPromise;
    var mountOptions = options || {};
    var tileTimerId = null;
    var firstTileReady = false;
    var attempt = mountOptions.attempt;
    var activePageIndex = 0;
    var pageErrorMessage = null;
    var pageErrorState = null;
    var imagePageOwners = [];
    var currentTiledImage = null;
    var activeSourceRequest = null;
    var viewerDisposed = false;
    resetContainer(container);
    container.classList.add('dv-active');

    var osdEl = document.createElement('div');
    osdEl.className = 'dv-osd';
    container.appendChild(osdEl);

    var isSequence = Array.isArray(tileSources) && tileSources.length > 1;
    var osdTileSources = isSequence
      ? tileSources.map(getTileSourceValue)
      : getTileSourceValue(tileSources);

    /* global OpenSeadragon */
    var viewer = OpenSeadragon({
      element: osdEl,
      sequenceMode: isSequence,
      initialPage: 0,
      showNavigationControl: false,
      showSequenceControl: false,   // we use our own prev/next buttons
      prefixUrl: '',                // suppress OSD's built-in image loading
      defaultZoomLevel: 0,
      minZoomLevel: 0.05,
      animationTime: 0.3,
      gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
      crossOriginPolicy: 'Anonymous',
    });
    if (attempt) attempt.viewer = viewer;

    openPromise = new Promise(function (resolve, reject) {
      var settled = false;
      var timeoutId = null;

      if (!attempt) {
        timeoutId = setTimeout(function () {
          if (settled) return;
          if (mountOptions.allowFallbackOnTimeout) {
            settled = true;
            disposeViewer(viewer);
            reject(new Error('OSD_TIMEOUT'));
          } else {
            showLoadingNotice(container);
          }
        }, getLoadingTimeout(mountOptions));
      }

      function settleOpen() {
        if (settled) {
          if (isUnavailableTileSource(tileSources[activePageIndex])) {
            showPageError({ page: activePageIndex });
          }
          return;
        }
        settled = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        clearLoadingNotice(container);
        resolve(viewer);
        if (isUnavailableTileSource(tileSources[activePageIndex])) {
          showPageError({ page: activePageIndex });
        }
        if (!firstTileReady) {
          tileTimerId = setTimeout(function () {
            if (!firstTileReady) showLoadingNotice(container);
          }, getLoadingTimeout(mountOptions));
        }
      }

      function settleOpenFailure(error) {
        if (settled) return;
        settled = true;
        if (timeoutId !== null) clearTimeout(timeoutId);
        disposeViewer(viewer);
        reject(error || new Error('OSD_OPEN_FAILED'));
      }

      function getCurrentTiledImage() {
        var tiledImage;

        if (!viewer.world || typeof viewer.world.getItemAt !== 'function') return null;
        tiledImage = viewer.world.getItemAt(0) || null;
        if (!tiledImage) currentTiledImage = null;
        return tiledImage;
      }

      function rememberCurrentTiledImage(pageIndex) {
        var tiledImage = getCurrentTiledImage();
        var owner;
        var changed;

        if (!tiledImage) {
          currentTiledImage = null;
          return null;
        }
        changed = currentTiledImage !== tiledImage;
        currentTiledImage = tiledImage;
        owner = imagePageOwners.filter(function (entry) {
          return entry.tiledImage === tiledImage;
        })[0];
        if (!owner) {
          owner = { tiledImage: tiledImage, pageIndex: pageIndex };
          imagePageOwners.push(owner);
        }
        if (changed) clearPageErrorForReload(pageIndex, tiledImage);
        return tiledImage;
      }

      function sourcePageIndex(source) {
        var index;
        var candidate;

        if (!source) return null;
        for (index = 0; index < osdTileSources.length; index += 1) {
          candidate = osdTileSources[index];
          if (candidate === source) return index;
          if (typeof candidate === 'string' && typeof source === 'string' && candidate === source) return index;
          if (candidate && source && candidate.url && source.url && candidate.url === source.url) return index;
          if (candidate && candidate.url && typeof source === 'string' && candidate.url === source) return index;
          if (typeof candidate === 'string' && source && source.url && candidate === source.url) return index;
        }
        return null;
      }

      function eventPageInfo(data) {
        var tiledImage = data && (data.tiledImage || (data.tile && data.tile.tiledImage));
        var source = data && (data.source || data.tileSource);
        var actualCurrentTiledImage = getCurrentTiledImage();
        var owner;
        var index;

        if (tiledImage) {
          owner = imagePageOwners.filter(function (entry) {
            return entry.tiledImage === tiledImage;
          })[0];
          if (owner) {
            return {
              pageIndex: owner.pageIndex,
              current: tiledImage === actualCurrentTiledImage && owner.pageIndex === activePageIndex,
              tiledImage: tiledImage,
              tile: data && data.tile,
            };
          }
          if (tiledImage === actualCurrentTiledImage) {
            rememberCurrentTiledImage(activePageIndex);
            return {
              pageIndex: activePageIndex,
              current: true,
              tiledImage: tiledImage,
              tile: data && data.tile,
            };
          }
          return null;
        }
        if (data && typeof data.page === 'number') {
          return {
            pageIndex: data.page,
            current: data.page === activePageIndex && !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data.tile,
          };
        }
        if (data && data.source && typeof data.source.index === 'number') {
          return {
            pageIndex: data.source.index,
            current: data.source.index === activePageIndex && !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data.tile,
          };
        }
        if (data && data.item && typeof data.item.index === 'number') {
          return {
            pageIndex: data.item.index,
            current: data.item.index === activePageIndex && !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data.tile,
          };
        }
        if (data && data.item && data.item.source && typeof data.item.source.index === 'number') {
          return {
            pageIndex: data.item.source.index,
            current: data.item.source.index === activePageIndex && !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data.tile,
          };
        }
        index = sourcePageIndex(source);
        if (index !== null) {
          return {
            pageIndex: index,
            current: index === activePageIndex && !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data && data.tile,
          };
        }
        return {
          pageIndex: activePageIndex,
          current: !!actualCurrentTiledImage,
          tiledImage: actualCurrentTiledImage,
          tile: data && data.tile,
        };
      }

      function removePageError() {
        if (pageErrorMessage && pageErrorMessage.parentNode) pageErrorMessage.parentNode.removeChild(pageErrorMessage);
        pageErrorMessage = null;
        pageErrorState = null;
      }

      function clearPageErrorForReload(pageIndex, tiledImage) {
        if (!pageErrorState || pageErrorState.pageIndex !== pageIndex || !tiledImage) return;
        if (pageErrorState.tiledImage !== tiledImage) removePageError();
      }

      function clearPageError(data, info) {
        var failedTileIndex;

        info = info || eventPageInfo(data);
        if (!pageErrorState || !info || info.pageIndex !== pageErrorState.pageIndex || info.current === false) return;
        if (pageErrorState.tiledImage && info.tiledImage && pageErrorState.tiledImage !== info.tiledImage) return;
        if (pageErrorState.requiresReload) return;
        if (info.tile) {
          failedTileIndex = pageErrorState.tiles.indexOf(info.tile);
          if (failedTileIndex !== -1) pageErrorState.tiles.splice(failedTileIndex, 1);
          if (pageErrorState.tiles.length > 0) return;
        }
        removePageError();
      }

      function showPageError(data, options) {
        var info = eventPageInfo(data);
        var message;

        if (!info || info.pageIndex === null || info.pageIndex !== activePageIndex) return;
        if (info.current === false && !(options && options.allowWithoutImage)) return;
        if (!pageErrorState || pageErrorState.pageIndex !== info.pageIndex ||
            (pageErrorState.tiledImage && info.tiledImage && pageErrorState.tiledImage !== info.tiledImage)) {
          pageErrorState = {
            pageIndex: info.pageIndex,
            tiledImage: info.tiledImage || currentTiledImage,
            tiles: [],
            requiresReload: false,
          };
        }
        if (info.tile && pageErrorState.tiles.indexOf(info.tile) === -1) pageErrorState.tiles.push(info.tile);
        if (!info.tile) pageErrorState.requiresReload = true;
        if (pageErrorMessage) return;
        message = document.createElement('p');
        message.className = 'dv-tile-error-msg';
        message.setAttribute('data-page-index', String(info.pageIndex));
        message.textContent = 'This page is unavailable.';
        container.appendChild(message);
        pageErrorMessage = message;
      }

      function isCurrentSourceRequest(request) {
        return !viewerDisposed && isAttemptActive(attempt) && request &&
          request === activeSourceRequest && request.pageIndex === activePageIndex;
      }

      // OSD 5.0.1 creates fresh addTiledImage options for every sequence open
      // and returns that same options object in metadata error events. Guard
      // its callbacks before they can raise open/open-failed (including OSD's
      // own error UI); a URL or page index cannot identify a repeated request.
      var addTiledImage = viewer.addTiledImage;
      viewer.addTiledImage = function (options) {
        var requestOptions = Object.assign({}, options);
        var request = {
          options: requestOptions,
          pageIndex: typeof viewer.currentPage === 'function' ? viewer.currentPage() : activePageIndex,
          completed: false,
        };

        // goToPage sets currentPage before open, but raises page afterwards.
        activePageIndex = request.pageIndex;
        activeSourceRequest = request;

        function guardCallback(callback) {
          return function () {
            if (!isCurrentSourceRequest(request) || request.completed) return;
            request.completed = true;
            if (typeof callback === 'function') return callback.apply(this, arguments);
          };
        }

        requestOptions.success = guardCallback(options.success);
        requestOptions.error = guardCallback(options.error);
        return addTiledImage.call(this, requestOptions);
      };

      viewer.addHandler('open', function () {
        if (!isAttemptActive(attempt)) return;
        rememberCurrentTiledImage(activePageIndex);
        settleOpen();
      });
      viewer.addHandler('open-failed', function (data) {
        if (!isCurrentSourceRequest(activeSourceRequest) || !data ||
            data.options !== activeSourceRequest.options) return;
        rememberCurrentTiledImage(activePageIndex);
        if (settled) showPageError({ page: activeSourceRequest.pageIndex }, { allowWithoutImage: true });
        else settleOpenFailure(new Error('OSD_OPEN_FAILED'));
      });
      viewer.addHandler('close', function () {
        currentTiledImage = null;
        activeSourceRequest = null;
      });
      viewer.addHandler('page', function (data) {
        if (!isAttemptActive(attempt)) return;
        if (!data || typeof data.page !== 'number') return;
        activePageIndex = data.page;
        rememberCurrentTiledImage(activePageIndex);
        removePageError();
        if (isUnavailableTileSource(tileSources[activePageIndex])) {
          showPageError({ page: activePageIndex }, { allowWithoutImage: true });
        }
      });
      viewer.addHandler('tile-ready', function (data) {
        var info;

        if (!isAttemptActive(attempt)) return;
        info = eventPageInfo(data);
        if (!info || info.pageIndex === null || info.current === false) return;
        firstTileReady = true;
        if (tileTimerId !== null) clearTimeout(tileTimerId);
        clearLoadingNotice(container);
        if (!isUnavailableTileSource(tileSources[info.pageIndex])) clearPageError(data, info);
      });
      viewer.addHandler('tile-load-failed', function (data) {
        if (!isAttemptActive(attempt)) return;
        showPageError(data);
      });
      viewer.addHandler('before-destroy', function () {
        viewerDisposed = true;
        activeSourceRequest = null;
        if (timeoutId !== null) clearTimeout(timeoutId);
        if (!settled) {
          settled = true;
          reject(new Error('ATTEMPT_DISPOSED'));
        }
        if (tileTimerId !== null) clearTimeout(tileTimerId);
      });
      registerAttemptCleanup(attempt, function () {
        settleOpenFailure(new Error('ATTEMPT_DISPOSED'));
      });

      try {
        viewer.open(osdTileSources);
      } catch (err) {
        settleOpenFailure(err);
      }
    });

    addControls(osdEl, viewer, mountOptions);
    addViewerModeActions(container, viewer, tileSources, mountOptions);
    if (isSequence) {
      addPageNav(container, viewer, tileSources.length, mountOptions);
      addThumbnailCarousel(container, viewer, tileSources, mountOptions);
      warmSequenceCache(tileSources, 0, mountOptions);
      viewer.addHandler('page', function (data) {
        if (!isAttemptActive(attempt)) return;
        warmSequenceCache(tileSources, data.page, mountOptions);
      });
    } else if (buildThumbnailUrl(tileSources)) {
      primeResourceUrl(buildThumbnailUrl(tileSources), false, mountOptions);
    }
    return openPromise;
  }

  return { mountOsdViewer };
}
