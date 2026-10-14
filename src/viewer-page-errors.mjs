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

// eslint-disable-next-line complexity
function sourcePageIndex(state, source) {
  var index;
  var candidate;

  if (!source) return null;
  for (index = 0; index < state.osdTileSources.length; index += 1) {
    candidate = state.osdTileSources[index];
    if (candidate === source) return index;
    if (typeof candidate === 'string' && typeof source === 'string' && candidate === source) return index;
    if (candidate && source && candidate.url && source.url && candidate.url === source.url) return index;
    if (candidate && candidate.url && typeof source === 'string' && candidate.url === source) return index;
    if (typeof candidate === 'string' && source && source.url && candidate === source.url) return index;
  }
  return null;
}

// eslint-disable-next-line complexity, max-lines-per-function
function eventPageInfo(state, data) {
  var tiledImage = data && (data.tiledImage || (data.tile && data.tile.tiledImage));
  var source = data && (data.source || data.tileSource);
  var actualCurrentTiledImage = getCurrentTiledImage(state);
  var owner;
  var index;

  if (tiledImage) {
    owner = state.imagePageOwners.filter(function (entry) {
      return entry.tiledImage === tiledImage;
    })[0];
    if (owner) {
      return {
        pageIndex: owner.pageIndex,
        current: tiledImage === actualCurrentTiledImage && owner.pageIndex === state.activePageIndex,
        tiledImage: tiledImage,
        tile: data && data.tile,
      };
    }
    if (tiledImage === actualCurrentTiledImage) {
      rememberCurrentTiledImage(state, state.activePageIndex);
      return {
        pageIndex: state.activePageIndex,
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
      current: data.page === state.activePageIndex && !!actualCurrentTiledImage,
      tiledImage: actualCurrentTiledImage,
      tile: data.tile,
    };
  }
  if (data && data.source && typeof data.source.index === 'number') {
    return {
      pageIndex: data.source.index,
      current: data.source.index === state.activePageIndex && !!actualCurrentTiledImage,
      tiledImage: actualCurrentTiledImage,
      tile: data.tile,
    };
  }
  if (data && data.item && typeof data.item.index === 'number') {
    return {
      pageIndex: data.item.index,
      current: data.item.index === state.activePageIndex && !!actualCurrentTiledImage,
      tiledImage: actualCurrentTiledImage,
      tile: data.tile,
    };
  }
  if (data && data.item && data.item.source && typeof data.item.source.index === 'number') {
    return {
      pageIndex: data.item.source.index,
      current: data.item.source.index === state.activePageIndex && !!actualCurrentTiledImage,
      tiledImage: actualCurrentTiledImage,
      tile: data.tile,
    };
  }
  index = sourcePageIndex(state, source);
  if (index !== null) {
    return {
      pageIndex: index,
      current: index === state.activePageIndex && !!actualCurrentTiledImage,
      tiledImage: actualCurrentTiledImage,
      tile: data && data.tile,
    };
  }
  return {
    pageIndex: state.activePageIndex,
    current: !!actualCurrentTiledImage,
    tiledImage: actualCurrentTiledImage,
    tile: data && data.tile,
  };
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

// eslint-disable-next-line complexity
function clearPageError(state, data, info) {
  var failedTileIndex;

  info = info || eventPageInfo(state, data);
  if (!state.pageErrorState || !info || info.pageIndex !== state.pageErrorState.pageIndex || info.current === false) return;
  if (state.pageErrorState.tiledImage && info.tiledImage && state.pageErrorState.tiledImage !== info.tiledImage) return;
  if (state.pageErrorState.requiresReload) return;
  if (info.tile) {
    failedTileIndex = state.pageErrorState.tiles.indexOf(info.tile);
    if (failedTileIndex !== -1) state.pageErrorState.tiles.splice(failedTileIndex, 1);
    if (state.pageErrorState.tiles.length > 0) return;
  }
  removePageError(state);
}

// eslint-disable-next-line complexity
function showPageError(state, document, data, options) {
  var info = eventPageInfo(state, data);
  var message;

  if (!info || info.pageIndex === null || info.pageIndex !== state.activePageIndex) return;
  if (info.current === false && !(options && options.allowWithoutImage)) return;
  if (!state.pageErrorState || state.pageErrorState.pageIndex !== info.pageIndex ||
      (state.pageErrorState.tiledImage && info.tiledImage && state.pageErrorState.tiledImage !== info.tiledImage)) {
    state.pageErrorState = {
      pageIndex: info.pageIndex,
      tiledImage: info.tiledImage || state.currentTiledImage,
      tiles: [],
      requiresReload: false,
    };
  }
  if (info.tile && state.pageErrorState.tiles.indexOf(info.tile) === -1) state.pageErrorState.tiles.push(info.tile);
  if (!info.tile) state.pageErrorState.requiresReload = true;
  if (state.pageErrorMessage) return;
  message = document.createElement('p');
  message.className = 'dv-tile-error-msg';
  message.setAttribute('data-page-index', String(info.pageIndex));
  message.textContent = 'This page is unavailable.';
  state.container.appendChild(message);
  state.pageErrorMessage = message;
}
