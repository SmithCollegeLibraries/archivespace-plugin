import { readConfig } from './config.mjs';
import { extractManifestPages, hasRenderablePages, UNAVAILABLE_TILE_SOURCE } from './manifest.mjs';
import { createViewerRuntime } from './runtime.mjs';

const INITIAL_TITLE = 'Digital viewer';
const ERROR_TITLE = 'Digital viewer unavailable';
const LOAD_ERROR = 'The manifest could not be loaded.';
const PAGE_ERROR = 'This page is unavailable.';
const SLOW_NOTICE = 'Still loading.';

function parseAllowedOrigins(value) {
  if (typeof value !== 'string') return new Set();
  return new Set(value.trim().split(/\s+/).map(function (item) {
    try {
      const url = new URL(item);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' ||
          url.search || url.hash) return '';
      return url.origin;
    } catch {
      return '';
    }
  }).filter(Boolean));
}

export function getManifestUrl(search, allowedOrigins) {
  const values = new URLSearchParams(search).getAll('manifest');
  if (values.length !== 1) return null;
  try {
    const url = new URL(values[0]);
    if (url.protocol !== 'https:' || url.username || url.password ||
        !parseAllowedOrigins(allowedOrigins).has(url.origin)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function getManifestTitle(label) {
  if (typeof label === 'string') return label;
  if (Array.isArray(label)) {
    for (const value of label) {
      const title = getManifestTitle(value);
      if (title) return title;
    }
  }
  if (label && typeof label['@value'] === 'string') return label['@value'];
  return '';
}

function isSafeDestination(value) {
  if (typeof value !== 'string' || !value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateManifestPages(pages) {
  return pages.map(function (page) {
    if ([page.tileSource, page.thumbnailUrl, page.imageUrl].every(isSafeDestination)) {
      const serviceUrl = typeof page.tileSource === 'string' && page.tileSource.endsWith('/info.json')
        ? page.tileSource.slice(0, -'/info.json'.length)
        : '';
      if (serviceUrl && page.imageUrl === serviceUrl + '/full/full/0/default.jpg') {
        return Object.assign({}, page, { imageUrl: serviceUrl + '/full/max/0/default.jpg' });
      }
      return page;
    }
    return Object.assign({}, page, {
      tileSource: UNAVAILABLE_TILE_SOURCE,
      thumbnailUrl: '',
      imageUrl: '',
      unavailable: true,
    });
  });
}

function announce(status, message) {
  status.textContent = message;
}

function showError(document, status, message) {
  document.title = ERROR_TITLE;
  announce(status, message);
  return false;
}

async function loadManifest(window, manifestUrl, status) {
  const timer = window.setTimeout(function () { announce(status, SLOW_NOTICE); }, readConfig({}).loadingTimeoutMs);
  try {
    const response = await window.fetch(manifestUrl, { redirect: 'error' });
    if (!response.ok) throw new Error(LOAD_ERROR);
    const manifest = await response.json();
    if (status.textContent === SLOW_NOTICE) announce(status, '');
    return manifest;
  } finally {
    window.clearTimeout(timer);
  }
}

function watchLoadingMessages(window, container, status) {
  if (!window.MutationObserver) return;
  const observer = new window.MutationObserver(function () {
    const loading = container.querySelector('.dv-loading-msg');
    if (loading) announce(status, SLOW_NOTICE);
    else if (status.textContent === SLOW_NOTICE) announce(status, '');
  });
  observer.observe(container, { childList: true, subtree: true });
}

function watchViewerMessages(container, status, pages) {
  container.addEventListener('digital-viewer:open', function (event) {
    const viewer = event.detail && event.detail.viewer;
    if (!viewer || typeof viewer.addHandler !== 'function') return;
    let failedPage = null;
    viewer.addHandler('page', function (data) {
      const image = viewer.world && viewer.world.getItemAt(0);
      if (pages[data.page] && pages[data.page].unavailable) {
        announce(status, PAGE_ERROR);
      } else if (data.page !== failedPage && image && image.getFullyLoaded && image.getFullyLoaded()) {
        failedPage = null;
        announce(status, '');
      }
    });
    viewer.addHandler('tile-load-failed', function () {
      failedPage = viewer.currentPage();
      if (!pages[failedPage] || !pages[failedPage].unavailable) announce(status, PAGE_ERROR);
    });
    viewer.addHandler('tile-ready', function () {
      const currentPage = viewer.currentPage();
      if (currentPage !== failedPage && pages[currentPage] && !pages[currentPage].unavailable) {
        failedPage = null;
        announce(status, '');
      }
    });
    const currentPage = viewer.currentPage();
    if (pages[currentPage] && pages[currentPage].unavailable) announce(status, PAGE_ERROR);
  });
}

function pageOpenSeadragon(window) {
  const openSeadragon = window.OpenSeadragon;
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return openSeadragon;
  return function (options) {
    return openSeadragon(Object.assign({}, options, { animationTime: 0 }));
  };
}

function viewerDependencies(window, document) {
  const config = readConfig({});
  return {
    config, document, console,
    fetch: window.fetch && window.fetch.bind(window),
    OpenSeadragon: pageOpenSeadragon(window),
    IntersectionObserver: window.IntersectionObserver,
    Image: window.Image, AbortController: window.AbortController,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
  };
}

export async function startViewerPage(window, document) {
  const container = document.getElementById('viewer');
  const status = document.getElementById('viewer-status');
  const script = document.querySelector('script[data-allowed-origins]');
  const manifestUrl = getManifestUrl(window.location.search, script && script.getAttribute('data-allowed-origins'));
  if (!manifestUrl) return showError(document, status, 'A valid, allowed HTTPS manifest URL is required.');
  if (!window.OpenSeadragon) return showError(document, status, 'The viewer could not start.');
  if (!window.fetch) return showError(document, status, LOAD_ERROR);

  try {
    const manifest = await loadManifest(window, manifestUrl, status);
    const parsedPages = extractManifestPages(manifest);
    if (!hasRenderablePages(parsedPages)) {
      return showError(document, status, 'The manifest contains no viewable pages.');
    }
    const pages = validateManifestPages(parsedPages);
    document.title = getManifestTitle(manifest.label) || INITIAL_TITLE;
    watchLoadingMessages(window, container, status);
    watchViewerMessages(container, status, pages);
    const dependencies = viewerDependencies(window, document);
    const runtime = createViewerRuntime(dependencies);
    const opening = runtime.mountOsdViewer(container, pages, { loadingTimeoutMs: dependencies.config.loadingTimeoutMs });
    const pdfAction = container.querySelector('[data-action="download-pdf"]');
    if (pdfAction) pdfAction.remove();
    await opening;
    return true;
  } catch {
    return showError(document, status, LOAD_ERROR);
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  startViewerPage(window, document);
}
