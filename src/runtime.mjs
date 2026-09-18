// Composition root: wire explicit dependencies, then expose the initializer.
import { createSourceAdapters } from './adapters/index.mjs';
import { buildThumbnailUrl } from './tile-sources.mjs';
import { createLifecycle } from './lifecycle.mjs';
import { createControls } from './controls.mjs';
import { createViewerModes } from './viewer-modes.mjs';
import { createPrefetch, getPreloadPageIndexes } from './prefetch.mjs';
import { createThumbnails } from './thumbnails.mjs';
import { createViewer } from './viewer.mjs';
import { createStatus } from './status.mjs';
import { createPageSources } from './page-sources.mjs';
import { createPageLayout, classifyPageContext } from './page-layout.mjs';
import { createInitializer } from './init.mjs';
import { createMountSequence, getContainerViewerOptions } from './mount-sequence.mjs';

export function createViewerRuntime({ config: cfg, document, console, fetch,
  OpenSeadragon, IntersectionObserver, Image, AbortController, setTimeout, clearTimeout }) {
  const { createFallbackLink, showError, reportFailure, showLoadingNotice,
    clearLoadingNotice, resetContainer } = createStatus({ document, console });
  const pageLayout = createPageLayout({ document });
  const lifecycle = createLifecycle({ AbortController, setTimeout, clearTimeout,
    showLoadingNotice,
    restoreLeafLayoutIfUnused: pane => pageLayout.restoreLeafLayoutIfUnused(pane, lifecycle.activeMountStates),
  });
  const { isAttemptActive, registerAttemptCleanup, disposeMountState } = lifecycle;
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

  const sources = createPageSources({ document, getPageContext: pageLayout.getPageContext,
    onDiscoveryError() { console.warn('[digital_viewer] stage=startup code=source-unavailable'); },
  });
  const { mountRankedSources } = createMountSequence({ lifecycle, mountDescriptor, reportFailure });
  const { init } = createInitializer({ config: cfg, document, console, OpenSeadragon,
    sources, pageLayout, lifecycle, mountRankedSources });

  return {
    addViewerModeActions, getPreloadPageIndexes, buildThumbnailUrl, addControls,
    addThumbnailCarousel, warmSequenceCache, classifyPageContext,
    collectSourceAnchors: sources.collectSourceAnchors,
    mountOsdViewer, mountDescriptor, adapters, getContainerViewerOptions, disposeMountState, init,
  };
}
