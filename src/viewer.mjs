import { getLoadingTimeout } from './config.mjs';
import { getTileSourceValue, isUnavailableTileSource, buildThumbnailUrl } from './tile-sources.mjs';
import { createPageErrors } from './viewer-page-errors.mjs';

export function createViewer(dependencies) {
  return {
    mountOsdViewer: function (container, tileSources, options) {
      return mountOsdViewer(dependencies, container, tileSources, options);
    },
  };
}

function createMountState(dependencies, container, tileSources, options) {
  var mountOptions = options || {};
  var state = {
    container: container,
    tileSources: tileSources,
    mountOptions: mountOptions,
    attempt: mountOptions.attempt,
    activePageIndex: 0,
    firstTileReady: false,
    pageErrorMessage: null,
    pageErrorState: null,
    imagePageOwners: [],
    currentTiledImage: null,
    activeSourceRequest: null,
    viewerDisposed: false,
    tileTimerId: null,
    settled: false,
    timeoutId: null,
  };
  var osdElement;

  dependencies.resetContainer(container);
  container.classList.add('dv-active');
  osdElement = dependencies.document.createElement('div');
  osdElement.className = 'dv-osd';
  container.appendChild(osdElement);
  state.osdElement = osdElement;
  state.isSequence = Array.isArray(tileSources) && tileSources.length > 1;
  state.osdTileSources = state.isSequence
    ? tileSources.map(getTileSourceValue)
    : getTileSourceValue(tileSources);
  state.viewer = dependencies.OpenSeadragon(createOpenSeadragonOptions(osdElement, state.isSequence));
  if (state.attempt) state.attempt.viewer = state.viewer;
  state.pageErrors = createPageErrors(state, dependencies.document);
  return state;
}

function createOpenSeadragonOptions(element, isSequence) {
  return {
    element: element,
    sequenceMode: isSequence,
    initialPage: 0,
    showNavigationControl: false,
    showSequenceControl: false,
    prefixUrl: '',
    defaultZoomLevel: 0,
    minZoomLevel: 0.05,
    animationTime: 0.3,
    gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
    crossOriginPolicy: 'Anonymous',
  };
}

function mountOsdViewer(dependencies, container, tileSources, options) {
  var state = createMountState(dependencies, container, tileSources, options);
  var openPromise = createOpenPromise(dependencies, state);
  addMountedViewerControls(dependencies, state);
  return openPromise;
}

function createOpenPromise(dependencies, state) {
  return new Promise(function (resolve, reject) {
    state.resolveOpen = resolve;
    state.rejectOpen = reject;
    startOpenDeadline(dependencies, state);
    registerSourceRequestGuard(dependencies, state);
    registerViewerEvents(dependencies, state);
    dependencies.registerAttemptCleanup(state.attempt, function () {
      settleOpenFailure(dependencies, state, new Error('ATTEMPT_DISPOSED'));
    });
    openViewer(state, dependencies);
  });
}

function startOpenDeadline(dependencies, state) {
  if (state.attempt) return;
  state.timeoutId = dependencies.setTimeout(function () {
    if (state.settled) return;
    if (state.mountOptions.allowFallbackOnTimeout) {
      state.settled = true;
      dependencies.disposeViewer(state.viewer);
      state.rejectOpen(new Error('OSD_TIMEOUT'));
      return;
    }
    dependencies.showLoadingNotice(state.container);
  }, getLoadingTimeout(state.mountOptions));
}

function settleOpen(dependencies, state) {
  if (state.settled) {
    showUnavailablePage(state, state.activePageIndex);
    return;
  }
  state.settled = true;
  clearOpenDeadline(dependencies, state);
  dependencies.clearLoadingNotice(state.container);
  state.resolveOpen(state.viewer);
  dispatchViewerOpenEvent(dependencies, state);
  showUnavailablePage(state, state.activePageIndex);
  startTileDeadline(dependencies, state);
}

function showUnavailablePage(state, pageIndex, allowWithoutImage) {
  if (isUnavailableTileSource(state.tileSources[pageIndex])) {
    state.pageErrors.showPageError({ page: pageIndex }, allowWithoutImage ? { allowWithoutImage: true } : undefined);
  }
}

function clearOpenDeadline(dependencies, state) {
  if (state.timeoutId !== null) dependencies.clearTimeout(state.timeoutId);
}

function dispatchViewerOpenEvent(dependencies, state) {
  var window = dependencies.document.defaultView;
  if (!window || !window.CustomEvent || !state.container.dispatchEvent) return;
  state.container.dispatchEvent(new window.CustomEvent('digital-viewer:open', {
    bubbles: true,
    detail: { viewer: state.viewer },
  }));
}

function startTileDeadline(dependencies, state) {
  if (state.firstTileReady) return;
  state.tileTimerId = dependencies.setTimeout(function () {
    if (!state.firstTileReady) dependencies.showLoadingNotice(state.container);
  }, getLoadingTimeout(state.mountOptions));
}

function settleOpenFailure(dependencies, state, error) {
  if (state.settled) return;
  state.settled = true;
  clearOpenDeadline(dependencies, state);
  dependencies.disposeViewer(state.viewer);
  state.rejectOpen(error || new Error('OSD_OPEN_FAILED'));
}

function openViewer(state, dependencies) {
  try {
    state.viewer.open(state.osdTileSources);
  } catch (error) {
    settleOpenFailure(dependencies, state, error);
  }
}

function isCurrentSourceRequest(dependencies, state, request) {
  return !state.viewerDisposed && dependencies.isAttemptActive(state.attempt) && request &&
    request === state.activeSourceRequest && request.pageIndex === state.activePageIndex;
}

function guardSourceCallback(dependencies, state, request, callback) {
  return function () {
    if (!isCurrentSourceRequest(dependencies, state, request) || request.completed) return;
    request.completed = true;
    if (typeof callback === 'function') return callback.apply(this, arguments);
  };
}

function wrapTiledImageRequest(dependencies, state, addTiledImage, options) {
  var requestOptions = Object.assign({}, options);
  var request = {
    options: requestOptions,
    pageIndex: typeof state.viewer.currentPage === 'function' ? state.viewer.currentPage() : state.activePageIndex,
    completed: false,
  };

  state.activePageIndex = request.pageIndex;
  state.activeSourceRequest = request;
  requestOptions.success = guardSourceCallback(dependencies, state, request, options.success);
  requestOptions.error = guardSourceCallback(dependencies, state, request, options.error);
  return addTiledImage.call(state.viewer, requestOptions);
}

function registerSourceRequestGuard(dependencies, state) {
  var addTiledImage = state.viewer.addTiledImage;
  state.viewer.addTiledImage = function (options) {
    return wrapTiledImageRequest(dependencies, state, addTiledImage, options);
  };
}

function handleOpen(dependencies, state) {
  if (!dependencies.isAttemptActive(state.attempt)) return;
  state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
  settleOpen(dependencies, state);
}

function handleOpenFailed(dependencies, state, data) {
  if (!isCurrentSourceRequest(dependencies, state, state.activeSourceRequest) || !data ||
      data.options !== state.activeSourceRequest.options) return;
  state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
  if (state.settled) {
    state.pageErrors.showPageError({ page: state.activeSourceRequest.pageIndex }, { allowWithoutImage: true });
  } else {
    settleOpenFailure(dependencies, state, new Error('OSD_OPEN_FAILED'));
  }
}

function handlePage(dependencies, state, data) {
  if (!dependencies.isAttemptActive(state.attempt) || !data || typeof data.page !== 'number') return;
  state.activePageIndex = data.page;
  state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
  state.pageErrors.removePageError();
  showUnavailablePage(state, state.activePageIndex, true);
}

function handleTileReady(dependencies, state, data) {
  var info;
  if (!dependencies.isAttemptActive(state.attempt)) return;
  info = state.pageErrors.eventPageInfo(data);
  if (!info || info.pageIndex === null || info.current === false) return;
  state.firstTileReady = true;
  clearTileDeadline(dependencies, state);
  dependencies.clearLoadingNotice(state.container);
  if (!isUnavailableTileSource(state.tileSources[info.pageIndex])) {
    state.pageErrors.clearPageError(data, info);
  }
}

function clearTileDeadline(dependencies, state) {
  if (state.tileTimerId !== null) dependencies.clearTimeout(state.tileTimerId);
}

function handleTileLoadFailed(dependencies, state, data) {
  if (dependencies.isAttemptActive(state.attempt)) state.pageErrors.showPageError(data);
}

function handleViewerClose(state) {
  state.currentTiledImage = null;
  state.activeSourceRequest = null;
}

function handleBeforeDestroy(dependencies, state) {
  state.viewerDisposed = true;
  state.activeSourceRequest = null;
  clearOpenDeadline(dependencies, state);
  if (!state.settled) {
    state.settled = true;
    state.rejectOpen(new Error('ATTEMPT_DISPOSED'));
  }
  clearTileDeadline(dependencies, state);
}

function registerViewerEvents(dependencies, state) {
  state.viewer.addHandler('open', function () {
    handleOpen(dependencies, state);
  });
  state.viewer.addHandler('open-failed', function (data) {
    handleOpenFailed(dependencies, state, data);
  });
  state.viewer.addHandler('close', function () {
    handleViewerClose(state);
  });
  state.viewer.addHandler('page', function (data) {
    handlePage(dependencies, state, data);
  });
  state.viewer.addHandler('tile-ready', function (data) {
    handleTileReady(dependencies, state, data);
  });
  state.viewer.addHandler('tile-load-failed', function (data) {
    handleTileLoadFailed(dependencies, state, data);
  });
  state.viewer.addHandler('before-destroy', function () {
    handleBeforeDestroy(dependencies, state);
  });
}

function warmSequencePage(dependencies, state, data) {
  if (!dependencies.isAttemptActive(state.attempt)) return;
  dependencies.warmSequenceCache(state.tileSources, data.page, state.mountOptions);
}

function addMountedViewerControls(dependencies, state) {
  dependencies.addControls(state.osdElement, state.viewer, state.mountOptions);
  dependencies.addViewerModeActions(state.container, state.viewer, state.tileSources, state.mountOptions);
  if (state.isSequence) {
    addSequenceControls(dependencies, state);
  } else {
    primeSingleImageThumbnail(dependencies, state);
  }
}

function addSequenceControls(dependencies, state) {
  dependencies.addPageNav(state.container, state.viewer, state.tileSources.length, state.mountOptions);
  dependencies.addThumbnailCarousel(state.container, state.viewer, state.tileSources, state.mountOptions);
  dependencies.warmSequenceCache(state.tileSources, 0, state.mountOptions);
  state.viewer.addHandler('page', function (data) {
    warmSequencePage(dependencies, state, data);
  });
}

function primeSingleImageThumbnail(dependencies, state) {
  var thumbnailUrl = buildThumbnailUrl(state.tileSources);
  if (thumbnailUrl) dependencies.primeResourceUrl(thumbnailUrl, false, state.mountOptions);
}
