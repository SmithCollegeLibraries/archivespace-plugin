// Runtime composition and page integration; scanning/layout extraction follows in DV-M07.
// Every browser dependency is supplied by entry.mjs or the test harness.
import { getLoadingTimeout } from './config.mjs';
import { detectSource, buildDescriptorSelection } from './source-selection.mjs';
import { sanitizeUrl } from './urls.mjs';
import { createSourceAdapters } from './adapters/index.mjs';
import { getCompanionPdfUrl, buildThumbnailUrl } from './tile-sources.mjs';
import { createLifecycle } from './lifecycle.mjs';
import { createControls } from './controls.mjs';
import { createViewerModes } from './viewer-modes.mjs';
import { createPrefetch, getPreloadPageIndexes } from './prefetch.mjs';
import { createThumbnails } from './thumbnails.mjs';
import { createViewer } from './viewer.mjs';

export function createViewerRuntime({ config: cfg, document, console, fetch,
  OpenSeadragon, IntersectionObserver, Image, AbortController, setTimeout, clearTimeout }) {
  var sourceGroupCount = 0;

  function createFallbackLink(url, label) {
    var safeUrl = sanitizeUrl(url);
    var link;

    if (!safeUrl) return null;

    link = document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = label;
    return link;
  }

  function getContainerViewerOptions(container) {
    var mountOptions = container && container.__dvMountOptions || {};
    var attempt = mountOptions.attempt;

    return {
      objectDownloadPdfUrl: getCompanionPdfUrl(container && container.__dvDescriptorSelection),
      loadingTimeoutMs: mountOptions.loadingTimeoutMs,
      allowFallbackOnTimeout: !!mountOptions.allowFallbackOnTimeout,
      attempt: attempt,
      signal: attempt && attempt.controller ? attempt.controller.signal : undefined,
    };
  }

  function showError(container, message) {
    var paragraph;

    container.classList.add('dv-active', 'dv-error');
    container.innerHTML = '';
    paragraph = document.createElement('p');
    paragraph.className = 'dv-error-msg';
    paragraph.textContent = message;
    container.appendChild(paragraph);
  }

  function reportFailure(container, stage, code) {
    var stages = {
      configuration: true,
      preservica: true,
      compass: true,
      manifest: true,
      viewer: true,
    };
    var codes = {
      'preservica-unavailable': true,
      'manifest-unavailable': true,
      'content-unavailable': true,
    };
    var safeStage = stages[stage] ? stage : 'viewer';
    var safeCode = codes[code] ? code : 'content-unavailable';

    console.warn('[digital_viewer] stage=' + safeStage + ' code=' + safeCode);
    showError(container, 'Digital content unavailable.');
  }

  function showLoadingNotice(container) {
    var notice;

    if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = true;
    if (!container || container.querySelector('.dv-loading-msg')) return;
    notice = document.createElement('p');
    notice.className = 'dv-loading-msg';
    notice.textContent = 'Still loading';
    container.appendChild(notice);
  }

  function clearLoadingNotice(container) {
    var notice = container && container.querySelector('.dv-loading-msg');

    if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = false;
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
  }

  function resetContainer(container) {
    var preserveLoading = !!(container && container.querySelector && container.querySelector('.dv-loading-msg')) ||
      !!(container && container.__dvMountAttempt && container.__dvMountAttempt.loadingShown);

    container.className = 'digital-viewer-container';
    container.innerHTML = '';
    if (preserveLoading) showLoadingNotice(container);
  }

  const lifecycle = createLifecycle({ AbortController, setTimeout, clearTimeout,
    showLoadingNotice, restoreLeafLayoutIfUnused });
  const { activeMountStates, createAttempt, isAttemptActive, registerAttemptCleanup,
    disposeAttempt, clearAttemptTimeout, scheduleAttemptTimeout, disposeMountState } = lifecycle;
  const { addControls, addPageNav } = createControls({ document, isAttemptActive, registerAttemptCleanup });
  const { addViewerModeActions } = createViewerModes({ document, isAttemptActive });
  const { primeResourceUrl, warmSequenceCache } = createPrefetch({ fetch, Image, registerAttemptCleanup });
  const { addThumbnailCarousel } = createThumbnails({ document, IntersectionObserver, setTimeout,
    clearTimeout, isAttemptActive, registerAttemptCleanup, warmSequenceCache });
  const { mountOsdViewer } = createViewer({ document, OpenSeadragon, setTimeout, clearTimeout,
    resetContainer, showLoadingNotice, clearLoadingNotice, isAttemptActive,
    disposeViewer: lifecycle.disposeViewer, registerAttemptCleanup, addControls, addPageNav,
    addViewerModeActions, addThumbnailCarousel, warmSequenceCache, primeResourceUrl });

  const adapters = createSourceAdapters({
    config: cfg, document, console, fetch, setTimeout, clearTimeout,
    mountOsdViewer, reportFailure, isAttemptActive, showError, resetContainer,
    addViewerModeActions, showLoadingNotice, clearLoadingNotice,
    registerAttemptCleanup, createFallbackLink,
  });

  function mountDescriptor(container, descriptor) {
    resetContainer(container);
    if (!Object.prototype.hasOwnProperty.call(adapters, descriptor.type)) {
      return Promise.reject(new Error('UNSUPPORTED_DESCRIPTOR'));
    }
    var adapter = adapters[descriptor.type];
    return adapter(container, descriptor, getContainerViewerOptions(container));
  }

  // ── Page scan ─────────────────────────────────────────────────────────────

  /**
   * Find file_uri values in the page.
   *
   * ASpace PUI renders digital object file versions in multiple ways:
   *   1. .available-digital-objects a.external-digital-object__link[href]
   *      (standard digital object record page)
   *   2. <dt>File URI</dt><dd><a href="..."> (some themes / archival object pages)
   *   3. data-file-uri attribute (theme / future template overrides)
   */
  function collectSourceAnchors(root) {
    var selectors = [
      '[data-additional-file-version] a[href]',
      '.available-digital-objects a.external-digital-object__link[href]',
      '.available-digital-objects a.thumbnail[href]',
      '[data-rep-file-version-wrapper] > a[href]',
      '[data-file-uri]'
    ];
    var results = [];
    var seen = [];

    if (!root || typeof root.querySelectorAll !== 'function') return results;

    selectors.forEach(function (selector) {
      var elements = root.querySelectorAll(selector);
      for (var i = 0; i < elements.length; i += 1) {
        if (elements[i].closest && elements[i].closest('[data-dv-browse-only]')) continue;
        if (seen.indexOf(elements[i]) === -1) {
          seen.push(elements[i]);
          results.push(elements[i]);
        }
      }
    });

    return results;
  }

  function collectFileUris() {
    var results = [];
    var anchors = collectSourceAnchors(document);

    anchors.forEach(function (anchor) {
      var uri = anchor.dataset && anchor.dataset.fileUri
        ? anchor.dataset.fileUri
        : anchor.href;
      if (uri) results.push({ uri: uri, anchor: anchor });
    });

    // ASpace archival object page / some themes: <dt>File URI</dt><dd><a href="...">
    var dts = document.querySelectorAll('dt');
    for (var j = 0; j < dts.length; j += 1) {
      if (/file\s+uri/i.test(dts[j].textContent)) {
        var dd = dts[j].nextElementSibling;
        if (dd) {
          var a = dd.querySelector('a');
          var uri = a ? a.href : dd.textContent.trim();
          if (uri) results.push({ uri: uri, anchor: a || dd });
        }
      }
    }

    return results;
  }

  function findGroupRoot(anchor) {
    var root;
    var pageContext = getPageContext();

    if (pageContext.recordType === 'DigitalObject' && pageContext.hasChildren === false && pageContext.paneExists) {
      root = document.querySelector('#notes_row > .resizable-content-pane');
    }

    if (!root && anchor.closest) {
      root = anchor.closest(
        '[data-dv-source-group], [data-additional-file-version], ' +
        '[data-rep-file-version-wrapper], .objectimage, .record-pane, .digital-object, .instance'
      ) || anchor.parentNode;
    } else if (!root) {
      root = anchor.parentNode;
    }

    if (root && root.setAttribute && !root.getAttribute('data-dv-source-group')) {
      sourceGroupCount += 1;
      root.setAttribute('data-dv-source-group', 'render-' + sourceGroupCount);
    }

    return root;
  }

  function findInsertAfter(anchor) {
    // Keep each inline viewer adjacent to its own source, including thumbnails.
    var sourceGroup = anchor.closest ? anchor.closest('[data-dv-source-group]') : null;
    if (sourceGroup) return sourceGroup;

    if (anchor.classList && anchor.classList.contains('external-digital-object__link')) {
      var availBlock = anchor.closest
        ? anchor.closest('.available-digital-objects')
        : null;
      return availBlock || anchor.parentNode;
    }

    if (anchor.closest && anchor.closest('[data-additional-file-version]')) {
      return anchor.closest('.panel') || anchor.parentNode;
    }

    return (anchor.closest
      ? anchor.closest('dl, .digital-object, .instance')
      : null) || anchor.parentNode;
  }

  function classifyPageContext(context) {
    if (!context || !context.paneExists) return 'inline-fallback';
    if (context.recordType === 'DigitalObject' && context.hasChildren === false) {
      return 'leaf-digital-object';
    }
    return 'stock';
  }

  function getPageContext() {
    var context = document.querySelector('[data-dv-page-context]');
    var dataset = context && context.dataset ? context.dataset : {};

    return {
      recordType: dataset.recordType || '',
      hasChildren: dataset.hasChildren === 'true',
      paneExists: !!document.querySelector('#notes_row > .resizable-content-pane'),
    };
  }

  function prepareLeafLayout() {
    var pane = document.querySelector('#notes_row > .resizable-content-pane');
    var metadataColumn;
    var viewerColumn;

    if (!pane || !pane.children) return null;
    viewerColumn = pane.querySelector('#dv-viewer-column');
    if (viewerColumn) {
      pane.classList.add('dv-enhanced-pane');
      return viewerColumn;
    }

    metadataColumn = document.createElement('div');
    metadataColumn.className = 'dv-metadata-column';
    viewerColumn = document.createElement('div');
    viewerColumn.id = 'dv-viewer-column';
    viewerColumn.className = 'dv-viewer-column';

    while (pane.firstChild) {
      metadataColumn.appendChild(pane.firstChild);
    }
    pane.appendChild(metadataColumn);
    pane.appendChild(viewerColumn);
    pane.classList.add('dv-enhanced-pane');
    pane.__dvLeafLayoutState = {
      pane: pane,
      metadataColumn: metadataColumn,
      viewerColumn: viewerColumn,
    };
    return viewerColumn;
  }

  function restoreLeafLayoutIfUnused(pane) {
    var layoutState;
    var metadataColumn;
    var viewerColumn;
    var hasActiveMount = false;

    if (!pane) return;
    activeMountStates.some(function (state) {
      if (state && !state.disposed && state.layoutPane === pane) {
        hasActiveMount = true;
        return true;
      }
      return false;
    });
    if (hasActiveMount) return;

    layoutState = pane.__dvLeafLayoutState;
    metadataColumn = (layoutState && layoutState.metadataColumn) || pane.querySelector('.dv-metadata-column');
    viewerColumn = (layoutState && layoutState.viewerColumn) || pane.querySelector('#dv-viewer-column');
    if (!metadataColumn && !viewerColumn) return;

    if (metadataColumn) {
      while (metadataColumn.firstChild) pane.appendChild(metadataColumn.firstChild);
      if (metadataColumn.parentNode) metadataColumn.parentNode.removeChild(metadataColumn);
    }
    if (viewerColumn && viewerColumn.parentNode) viewerColumn.parentNode.removeChild(viewerColumn);
    pane.classList.remove('dv-enhanced-pane');
    pane.__dvLeafLayoutState = null;
  }

  // ── Initialization ────────────────────────────────────────────────────────

  function init() {
    if (typeof OpenSeadragon === 'undefined') {
      console.warn('[digital_viewer] OpenSeadragon not loaded — viewer will not mount.');
      return;
    }

    var fileUris = collectFileUris();
    if (fileUris.length === 0) {
      activeMountStates.slice().forEach(disposeMountState);
      return;
    }

    activeMountStates.forEach(function (state) { state.seenInInit = false; });

    var pageContext = getPageContext();
    var pageLayout = classifyPageContext(pageContext);
    var viewerColumn = null;

    var groups = [];

    fileUris.forEach(function (item) {
      var root = findGroupRoot(item.anchor);
      var group = null;
      var idx;

      for (idx = 0; idx < groups.length; idx += 1) {
        if (groups[idx].root === root) {
          group = groups[idx];
          break;
        }
      }

      if (!group) {
        group = { root: root, items: [] };
        groups.push(group);
      }

      if (!group.items.some(function (existing) { return existing.uri === item.uri; })) {
        group.items.push(item);
      }
    });

    groups.forEach(function (group) {
      var candidates = [];
      var selection;
      var ranked;
      var chosen = null;
      var container;
      var insertAfter;
      var signature;
      var existingState;
      var idx;

      group.items.forEach(function (item) {
        var candidateDescriptor = detectSource(item.uri, cfg);
        if (!candidateDescriptor) return;
        candidates.push({ item: item, descriptor: candidateDescriptor });
      });

      existingState = group.root && group.root.__dvMountState;
      if (candidates.length === 0) {
        if (existingState) disposeMountState(existingState);
        return;
      }

      if (!viewerColumn && pageLayout === 'leaf-digital-object') {
        viewerColumn = prepareLeafLayout();
      }

      selection = buildDescriptorSelection(candidates);
      ranked = selection.rankedCandidates;
      chosen = selection.primaryCandidate;

      if (!chosen) return;

      signature = candidates.map(function (candidate) {
        return candidate.item.uri;
      }).join('\u0000');
      if (existingState && !existingState.disposed && existingState.signature === signature &&
          existingState.container && existingState.container.parentNode) {
        existingState.seenInInit = true;
        return;
      }
      if (existingState) disposeMountState(existingState, { preserveLayout: true });

      container = document.createElement('div');
      container.className = 'digital-viewer-container';
      container.__dvDescriptorSelection = selection;
      container.__dvMountOptions = {
        loadingTimeoutMs: cfg.loadingTimeoutMs,
        allowFallbackOnTimeout: ranked.length > 1,
      };
      container.__dvMountState = {
        root: group.root,
        container: container,
        signature: signature,
        attempt: null,
        disposed: false,
        seenInInit: true,
        layoutPane: viewerColumn ? viewerColumn.parentNode : null,
      };
      if (group.root) group.root.__dvMountState = container.__dvMountState;
      activeMountStates.push(container.__dvMountState);

      if (viewerColumn) {
        // Two-column layout: append directly into the right column.
        viewerColumn.appendChild(container);
      } else {
        // Inline fallback: insert after the nearest meaningful block.
        insertAfter = findInsertAfter(chosen.item.anchor);
        if (insertAfter && insertAfter.parentNode) {
          insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
        } else {
          return;
        }
      }

      (function tryMount(rankIndex) {
        var mountState = container.__dvMountState;
        var attempt = createAttempt();

        if (!mountState || mountState.disposed) return;
        if (mountState.attempt) disposeAttempt(mountState.attempt);
        mountState.attempt = attempt;
        container.__dvMountAttempt = attempt;
        container.__dvMountOptions.allowFallbackOnTimeout = rankIndex + 1 < ranked.length;
        container.__dvMountOptions.attempt = attempt;
        scheduleAttemptTimeout(
          attempt,
          container,
          getLoadingTimeout(container.__dvMountOptions),
          rankIndex + 1 < ranked.length,
          function () {
            if (!mountState.disposed) tryMount(rankIndex + 1);
          }
        );
        Promise.resolve().then(function () {
          if (!isAttemptActive(attempt)) return Promise.reject(new Error('ATTEMPT_DISPOSED'));
          return mountDescriptor(container, ranked[rankIndex].descriptor);
        })
          .then(function () {
            if (!isAttemptActive(attempt)) return;
            attempt.completed = true;
            clearAttemptTimeout(attempt);
          })
          .catch(function () {
            if (!isAttemptActive(attempt) || mountState.disposed) return;
            disposeAttempt(attempt);
            if (rankIndex + 1 < ranked.length) {
              tryMount(rankIndex + 1);
            } else {
              reportFailure(container, 'viewer', 'content-unavailable');
            }
          });
      })(0);
    });

    activeMountStates.slice().forEach(function (state) {
      if (!state.seenInInit) disposeMountState(state);
    });
  }

  return {
    addViewerModeActions,
    getPreloadPageIndexes,
    buildThumbnailUrl,
    addControls,
    addThumbnailCarousel,
    warmSequenceCache,
    classifyPageContext,
    collectSourceAnchors,
    mountOsdViewer,
    mountDescriptor,
    adapters,
    getContainerViewerOptions,
    disposeMountState,
    init
  };
}
