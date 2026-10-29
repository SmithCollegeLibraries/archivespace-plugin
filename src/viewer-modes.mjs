import { sanitizeUrl } from './urls.mjs';
import { getTileSourceImageUrl } from './tile-sources.mjs';

export function createViewerModes({ document, isAttemptActive }) {
  function addViewerModeActions(container, viewer, tileSources, options) {
    const pages = Array.isArray(tileSources) ? tileSources.slice() : [tileSources];
    const isSequence = pages.length > 1;
    const objectDownloadPdfUrl = options && options.objectDownloadPdfUrl || '';

    if (!shouldCreateModeActions(pages, isSequence, objectDownloadPdfUrl)) return null;

    const elements = createModeElements(document);
    const state = createViewerModeState(pages, isSequence, objectDownloadPdfUrl, elements);

    bindModeButtons(elements, state);
    bindViewerPages(viewer, options, state, isAttemptActive);
    syncViewerModeActions(state);
    container.appendChild(elements.root);
    return state;
  }

  return { addViewerModeActions };
}

function shouldCreateModeActions(pages, isSequence, objectDownloadPdfUrl) {
  return isSequence || objectDownloadPdfUrl || getTileSourceImageUrl(pages[0]);
}

function createModeButton(document, action, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dv-mode-btn';
  button.textContent = label;
  button.setAttribute('data-action', action);
  return button;
}

function createModeLink(document, action, label) {
  const link = document.createElement('a');
  link.className = 'dv-mode-link';
  link.textContent = label;
  link.target = '_blank';
  link.rel = 'noopener';
  link.setAttribute('data-action', action);
  return link;
}

function createModeElements(document) {
  const root = document.createElement('div');
  const status = document.createElement('div');
  const modeLabel = document.createElement('span');
  const actions = document.createElement('div');
  const openPageButton = createModeButton(document, 'open-page', '');
  const backToObjectButton = createModeButton(document, 'back-to-object', 'Back to object');
  const downloadPdfLink = createModeLink(document, 'download-pdf', 'Download PDF');
  const downloadImageLink = createModeLink(document, 'download-image', 'Download image');

  root.className = 'dv-mode-actions';
  status.className = 'dv-mode-status';
  modeLabel.className = 'dv-mode-label';
  status.appendChild(modeLabel);
  actions.className = 'dv-mode-buttons';
  actions.appendChild(openPageButton);
  actions.appendChild(backToObjectButton);
  actions.appendChild(downloadPdfLink);
  actions.appendChild(downloadImageLink);
  root.appendChild(status);
  root.appendChild(actions);

  return { root, modeLabel, openPageButton, backToObjectButton, downloadPdfLink, downloadImageLink };
}

function createViewerModeState(pages, isSequence, objectDownloadPdfUrl, elements) {
  return {
    root: elements.root,
    tileSources: pages,
    isSequence,
    mode: isSequence ? 'object' : 'page',
    activePageIndex: 0,
    objectDownloadPdfUrl: sanitizeUrl(objectDownloadPdfUrl),
    pageDownloadImageUrl: '',
    modeLabel: elements.modeLabel,
    openPageButton: elements.openPageButton,
    backToObjectButton: elements.backToObjectButton,
    downloadPdfLink: elements.downloadPdfLink,
    downloadImageLink: elements.downloadImageLink,
  };
}

function bindModeButtons(elements, state) {
  elements.openPageButton.addEventListener('click', function () {
    state.mode = 'page';
    syncViewerModeActions(state);
  });
  elements.backToObjectButton.addEventListener('click', function () {
    state.mode = 'object';
    syncViewerModeActions(state);
  });
}

function bindViewerPages(viewer, options, state, isAttemptActive) {
  if (!viewer || typeof viewer.addHandler !== 'function') return;
  viewer.addHandler('page', function (data) {
    if (!isAttemptActive(options && options.attempt)) return;
    if (!data || typeof data.page !== 'number') return;
    state.activePageIndex = data.page;
    syncViewerModeActions(state);
  });
}

function setElementHidden(element, hidden) {
  if (!element) return;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (element.classList && typeof element.classList.toggle === 'function') {
    element.classList.toggle('is-hidden', !!hidden);
  }
}

function getViewerModeLabel(state) {
  const currentPage = state.tileSources[state.activePageIndex] || null;
  const pageLabel = currentPage && currentPage.pageLabel;
  if (state.isSequence && state.mode === 'object') return 'Object view';
  if (pageLabel) return pageLabel;
  if (state.isSequence) return 'Page ' + (state.activePageIndex + 1);
  return 'Image view';
}

function syncOpenPageAction(state, isPageMode) {
  state.openPageButton.textContent = 'Open page ' + (state.activePageIndex + 1);
  setElementHidden(state.openPageButton, !state.isSequence || isPageMode);
}

function syncBackToObjectAction(state, isPageMode) {
  setElementHidden(state.backToObjectButton, !state.isSequence || !isPageMode);
}

function setLinkHref(link, url) {
  if (url) {
    link.setAttribute('href', url);
  } else {
    link.removeAttribute('href');
  }
}

function syncPdfDownloadAction(state, isPageMode) {
  setLinkHref(state.downloadPdfLink, state.objectDownloadPdfUrl);
  setElementHidden(state.downloadPdfLink, !state.objectDownloadPdfUrl || isPageMode);
}

function syncImageDownloadAction(state, isPageMode, currentPageImageUrl) {
  setLinkHref(state.downloadImageLink, currentPageImageUrl);
  setElementHidden(
    state.downloadImageLink,
    !currentPageImageUrl || (state.isSequence && !isPageMode)
  );
}

function syncViewerModeActions(state) {
  const currentPage = state.tileSources[state.activePageIndex] || null;
  const currentPageImageUrl = currentPage ? getTileSourceImageUrl(currentPage) : '';
  const isPageMode = state.mode === 'page';

  state.pageDownloadImageUrl = currentPageImageUrl;
  state.root.setAttribute('data-view-mode', state.mode);
  state.modeLabel.textContent = getViewerModeLabel(state);
  syncOpenPageAction(state, isPageMode);
  syncBackToObjectAction(state, isPageMode);
  syncPdfDownloadAction(state, isPageMode);
  syncImageDownloadAction(state, isPageMode, currentPageImageUrl);
}
