import { sanitizeUrl } from './urls.mjs';
import { getTileSourceImageUrl } from './tile-sources.mjs';

export function createViewerModes({ document, isAttemptActive }) {
  function setElementHidden(element, hidden) {
    if (!element) return;

    element.setAttribute('aria-hidden', hidden ? 'true' : 'false');

    if (element.classList && typeof element.classList.toggle === 'function') {
      element.classList.toggle('is-hidden', !!hidden);
    }
  }

  function getViewerModeLabel(state) {
    var currentPage = state.tileSources[state.activePageIndex] || null;
    var pageLabel = currentPage && currentPage.pageLabel;

    if (state.isSequence && state.mode === 'object') {
      return 'Object view';
    }

    if (pageLabel) {
      return pageLabel;
    }

    if (state.isSequence) {
      return 'Page ' + (state.activePageIndex + 1);
    }

    return 'Image view';
  }

  function syncViewerModeActions(state) {
    var currentPage = state.tileSources[state.activePageIndex] || null;
    var currentPageImageUrl = currentPage ? getTileSourceImageUrl(currentPage) : '';
    var isPageMode = state.mode === 'page';

    state.pageDownloadImageUrl = currentPageImageUrl;
    state.root.setAttribute('data-view-mode', state.mode);
    state.modeLabel.textContent = getViewerModeLabel(state);

    if (state.openPageButton) {
      state.openPageButton.textContent = 'Open page ' + (state.activePageIndex + 1);
      setElementHidden(state.openPageButton, !state.isSequence || isPageMode);
    }

    if (state.backToObjectButton) {
      setElementHidden(state.backToObjectButton, !state.isSequence || !isPageMode);
    }

    if (state.downloadPdfLink) {
      if (state.objectDownloadPdfUrl) {
        state.downloadPdfLink.setAttribute('href', state.objectDownloadPdfUrl);
      } else {
        state.downloadPdfLink.removeAttribute('href');
      }
      setElementHidden(state.downloadPdfLink, !state.objectDownloadPdfUrl || isPageMode);
    }

    if (state.downloadImageLink) {
      if (currentPageImageUrl) {
        state.downloadImageLink.setAttribute('href', currentPageImageUrl);
      } else {
        state.downloadImageLink.removeAttribute('href');
      }
      setElementHidden(
        state.downloadImageLink,
        !currentPageImageUrl || (state.isSequence && !isPageMode)
      );
    }
  }

  function addViewerModeActions(container, viewer, tileSources, options) {
    var pages = Array.isArray(tileSources) ? tileSources.slice() : [tileSources];
    var isSequence = pages.length > 1;
    var objectDownloadPdfUrl = options && options.objectDownloadPdfUrl || '';
    var root = document.createElement('div');
    var status = document.createElement('div');
    var modeLabel = document.createElement('span');
    var actions = document.createElement('div');
    var openPageButton = document.createElement('button');
    var backToObjectButton = document.createElement('button');
    var downloadPdfLink = document.createElement('a');
    var downloadImageLink = document.createElement('a');
    var state;

    if (!isSequence && !objectDownloadPdfUrl && !getTileSourceImageUrl(pages[0])) {
      return null;
    }

    root.className = 'dv-mode-actions';

    status.className = 'dv-mode-status';
    modeLabel.className = 'dv-mode-label';
    status.appendChild(modeLabel);

    actions.className = 'dv-mode-buttons';

    openPageButton.type = 'button';
    openPageButton.className = 'dv-mode-btn';
    openPageButton.setAttribute('data-action', 'open-page');
    openPageButton.addEventListener('click', function () {
      state.mode = 'page';
      syncViewerModeActions(state);
    });

    backToObjectButton.type = 'button';
    backToObjectButton.className = 'dv-mode-btn';
    backToObjectButton.textContent = 'Back to object';
    backToObjectButton.setAttribute('data-action', 'back-to-object');
    backToObjectButton.addEventListener('click', function () {
      state.mode = 'object';
      syncViewerModeActions(state);
    });

    downloadPdfLink.className = 'dv-mode-link';
    downloadPdfLink.textContent = 'Download PDF';
    downloadPdfLink.target = '_blank';
    downloadPdfLink.rel = 'noopener';
    downloadPdfLink.setAttribute('data-action', 'download-pdf');

    downloadImageLink.className = 'dv-mode-link';
    downloadImageLink.textContent = 'Download image';
    downloadImageLink.target = '_blank';
    downloadImageLink.rel = 'noopener';
    downloadImageLink.setAttribute('data-action', 'download-image');

    actions.appendChild(openPageButton);
    actions.appendChild(backToObjectButton);
    actions.appendChild(downloadPdfLink);
    actions.appendChild(downloadImageLink);

    root.appendChild(status);
    root.appendChild(actions);

    state = {
      root: root,
      tileSources: pages,
      isSequence: isSequence,
      mode: isSequence ? 'object' : 'page',
      activePageIndex: 0,
      objectDownloadPdfUrl: sanitizeUrl(objectDownloadPdfUrl),
      pageDownloadImageUrl: '',
      modeLabel: modeLabel,
      openPageButton: openPageButton,
      backToObjectButton: backToObjectButton,
      downloadPdfLink: downloadPdfLink,
      downloadImageLink: downloadImageLink,
    };

    if (viewer && typeof viewer.addHandler === 'function') {
      viewer.addHandler('page', function (data) {
        if (!isAttemptActive(options && options.attempt)) return;
        if (!data || typeof data.page !== 'number') return;
        state.activePageIndex = data.page;
        syncViewerModeActions(state);
      });
    }

    syncViewerModeActions(state);
    container.appendChild(root);
    return state;
  }

  return { addViewerModeActions };
}
