export function createPageErrors(state, document) {
  return {
    getCurrentTiledImage: function () {
      return getCurrentTiledImage(state);
    },
    rememberCurrentTiledImage: function (pageIndex) {
      return rememberCurrentTiledImage(state, pageIndex);
    },
    eventPageInfo: function (data) {
      return eventPageInfo(state, data);
    },
    removePageError: function () {
      removePageError(state);
    },
    clearPageErrorForReload: function (pageIndex, tiledImage) {
      clearPageErrorForReload(state, pageIndex, tiledImage);
    },
    clearPageError: function (data, info) {
      clearPageError(state, data, info);
    },
    showPageError: function (data, options) {
      showPageError(state, document, data, options);
    },
  };
}

function getCurrentTiledImage(state) {
  var tiledImage;
  if (!state.viewer.world || typeof state.viewer.world.getItemAt !== 'function') return null;
  tiledImage = state.viewer.world.getItemAt(0) || null;
  if (!tiledImage) state.currentTiledImage = null;
  return tiledImage;
}

function findImageOwner(state, tiledImage) {
  return state.imagePageOwners.filter(function (entry) {
    return entry.tiledImage === tiledImage;
  })[0];
}

function rememberCurrentTiledImage(state, pageIndex) {
  var tiledImage = getCurrentTiledImage(state);
  var owner;
  var changed;

  if (!tiledImage) {
    state.currentTiledImage = null;
    return null;
  }
  changed = state.currentTiledImage !== tiledImage;
  state.currentTiledImage = tiledImage;
  owner = findImageOwner(state, tiledImage);
  if (!owner) {
    owner = { tiledImage: tiledImage, pageIndex: pageIndex };
    state.imagePageOwners.push(owner);
  }
  if (changed) clearPageErrorForReload(state, pageIndex, tiledImage);
  return tiledImage;
}

function tileSourceMatches(candidate, source) {
  var candidateUrl;
  var sourceUrl;

  if (candidate === source) return true;
  if (!candidate || !source) return false;
  candidateUrl = candidate.url;
  sourceUrl = source.url;
  if (candidateUrl && typeof source === 'string') return candidateUrl === source;
  if (typeof candidate === 'string' && sourceUrl) return candidate === sourceUrl;
  return !!candidateUrl && !!sourceUrl && candidateUrl === sourceUrl;
}

function sourcePageIndex(state, source) {
  var index;

  if (!source) return null;
  for (index = 0; index < state.osdTileSources.length; index += 1) {
    if (tileSourceMatches(state.osdTileSources[index], source)) return index;
  }
  return null;
}

function pageInfoForTiledImage(state, data, tiledImage, currentImage) {
  var owner;

  if (!tiledImage) return undefined;
  owner = findImageOwner(state, tiledImage);
  if (owner) {
    return createPageInfo(state, owner.pageIndex, currentImage, tiledImage, data && data.tile,
      tiledImage === currentImage && owner.pageIndex === state.activePageIndex);
  }
  if (tiledImage !== currentImage) return null;
  rememberCurrentTiledImage(state, state.activePageIndex);
  return createPageInfo(state, state.activePageIndex, currentImage, tiledImage, data && data.tile, true);
}

function numericPageIndex(value) {
  return typeof value === 'number' ? value : undefined;
}

function firstPageIndex(indexes) {
  var index;
  for (index = 0; index < indexes.length; index += 1) {
    if (indexes[index] !== undefined) return indexes[index];
  }
  return undefined;
}

function explicitPageIndex(data) {
  return firstPageIndex([
    numericPageIndex(data && data.page),
    numericPageIndex(data && data.source && data.source.index),
    numericPageIndex(data && data.item && data.item.index),
    numericPageIndex(data && data.item && data.item.source && data.item.source.index),
  ]);
}

function createPageInfo(state, pageIndex, currentImage, tiledImage, tile, isCurrentImage) {
  return {
    pageIndex: pageIndex,
    current: isCurrentImage === undefined ? pageIndex === state.activePageIndex && !!currentImage : isCurrentImage,
    tiledImage: tiledImage || currentImage,
    tile: tile,
  };
}

function eventTiledImage(data) {
  return data && (data.tiledImage || (data.tile && data.tile.tiledImage));
}

function eventSource(data) {
  return data && (data.source || data.tileSource);
}

function sourcePageInfo(state, data, currentImage) {
  var pageIndex = sourcePageIndex(state, eventSource(data));
  if (pageIndex === null) return null;
  return createPageInfo(state, pageIndex, currentImage, currentImage, data && data.tile);
}

function eventPageInfo(state, data) {
  var currentImage = getCurrentTiledImage(state);
  var info = pageInfoForTiledImage(state, data, eventTiledImage(data), currentImage);
  var pageIndex;

  if (info !== undefined) return info;
  pageIndex = explicitPageIndex(data);
  if (pageIndex !== undefined) {
    return createPageInfo(state, pageIndex, currentImage, currentImage, data && data.tile);
  }
  return sourcePageInfo(state, data, currentImage) ||
    createPageInfo(state, state.activePageIndex, currentImage, currentImage, data && data.tile);
}

function removePageError(state) {
  if (state.pageErrorMessage && state.pageErrorMessage.parentNode) {
    state.pageErrorMessage.parentNode.removeChild(state.pageErrorMessage);
  }
  state.pageErrorMessage = null;
  state.pageErrorState = null;
}

function clearPageErrorForReload(state, pageIndex, tiledImage) {
  if (!state.pageErrorState || state.pageErrorState.pageIndex !== pageIndex || !tiledImage) return;
  if (state.pageErrorState.tiledImage !== tiledImage) removePageError(state);
}

function matchesCurrentPageError(state, info) {
  var errorState = state.pageErrorState;
  if (!errorState || !info || info.pageIndex !== errorState.pageIndex || info.current === false) return false;
  if (errorState.tiledImage && info.tiledImage && errorState.tiledImage !== info.tiledImage) return false;
  return !errorState.requiresReload;
}

function clearFailedTile(state, tile) {
  var tileIndex;
  if (!tile) return true;
  tileIndex = state.pageErrorState.tiles.indexOf(tile);
  if (tileIndex !== -1) state.pageErrorState.tiles.splice(tileIndex, 1);
  return state.pageErrorState.tiles.length === 0;
}

function clearPageError(state, data, info) {
  info = info || eventPageInfo(state, data);
  if (!matchesCurrentPageError(state, info) || !clearFailedTile(state, info.tile)) return;
  removePageError(state);
}

function isCurrentPageError(state, info, options) {
  return info && info.pageIndex !== null && info.pageIndex === state.activePageIndex &&
    (info.current !== false || (options && options.allowWithoutImage));
}

function needsNewPageErrorState(state, info) {
  var errorState = state.pageErrorState;
  return !errorState || errorState.pageIndex !== info.pageIndex ||
    (errorState.tiledImage && info.tiledImage && errorState.tiledImage !== info.tiledImage);
}

function rememberPageError(state, info) {
  if (needsNewPageErrorState(state, info)) {
    state.pageErrorState = {
      pageIndex: info.pageIndex,
      tiledImage: info.tiledImage || state.currentTiledImage,
      tiles: [],
      requiresReload: false,
    };
  }
  if (info.tile && state.pageErrorState.tiles.indexOf(info.tile) === -1) {
    state.pageErrorState.tiles.push(info.tile);
  }
  if (!info.tile) state.pageErrorState.requiresReload = true;
}

function createPageErrorMessage(state, document, pageIndex) {
  var message = document.createElement('p');
  message.className = 'dv-tile-error-msg';
  message.setAttribute('data-page-index', String(pageIndex));
  message.textContent = 'This page is unavailable.';
  state.container.appendChild(message);
  return message;
}

function showPageError(state, document, data, options) {
  var info = eventPageInfo(state, data);
  if (!isCurrentPageError(state, info, options)) return;
  rememberPageError(state, info);
  if (!state.pageErrorMessage) {
    state.pageErrorMessage = createPageErrorMessage(state, document, info.pageIndex);
  }
}
