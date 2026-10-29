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

function createViewerFeatures(dependencies, lifecycle) {
  const { document, fetch, Image, IntersectionObserver, setTimeout, clearTimeout } = dependencies;
  const { isAttemptActive, registerAttemptCleanup } = lifecycle;
  const controls = createControls({ document, isAttemptActive, registerAttemptCleanup });
  const viewerModes = createViewerModes({ document, isAttemptActive });
  const prefetch = createPrefetch({ fetch, Image, registerAttemptCleanup });
  const thumbnails = createThumbnails({ document, IntersectionObserver, setTimeout,
    clearTimeout, isAttemptActive, registerAttemptCleanup,
    warmSequenceCache: prefetch.warmSequenceCache });
  return { controls, viewerModes, prefetch, thumbnails };
}

function createOpenSeadragonViewer(dependencies, lifecycle, status, features) {
  return createViewer({
    document: dependencies.document,
    OpenSeadragon: dependencies.OpenSeadragon,
    setTimeout: dependencies.setTimeout,
    clearTimeout: dependencies.clearTimeout,
    resetContainer: status.resetContainer,
    showLoadingNotice: status.showLoadingNotice,
    clearLoadingNotice: status.clearLoadingNotice,
    isAttemptActive: lifecycle.isAttemptActive,
    disposeViewer: lifecycle.disposeViewer,
    registerAttemptCleanup: lifecycle.registerAttemptCleanup,
    addControls: features.controls.addControls,
    addPageNav: features.controls.addPageNav,
    addViewerModeActions: features.viewerModes.addViewerModeActions,
    addThumbnailCarousel: features.thumbnails.addThumbnailCarousel,
    warmSequenceCache: features.prefetch.warmSequenceCache,
    primeResourceUrl: features.prefetch.primeResourceUrl,
  });
}

function createRuntimeAdapters(dependencies, lifecycle, status, features, mountOsdViewer) {
  return createSourceAdapters({
    config: dependencies.config,
    document: dependencies.document,
    console: dependencies.console,
    fetch: dependencies.fetch,
    setTimeout: dependencies.setTimeout,
    clearTimeout: dependencies.clearTimeout,
    mountOsdViewer,
    reportFailure: status.reportFailure,
    isAttemptActive: lifecycle.isAttemptActive,
    showError: status.showError,
    resetContainer: status.resetContainer,
    addViewerModeActions: features.viewerModes.addViewerModeActions,
    showLoadingNotice: status.showLoadingNotice,
    clearLoadingNotice: status.clearLoadingNotice,
    registerAttemptCleanup: lifecycle.registerAttemptCleanup,
    createFallbackLink: status.createFallbackLink,
  });
}

function createDescriptorMounter(adapters, resetContainer) {
  return function mountDescriptor(container, descriptor) {
    resetContainer(container);
    if (!Object.prototype.hasOwnProperty.call(adapters, descriptor.type)) {
      return Promise.reject(new Error('UNSUPPORTED_DESCRIPTOR'));
    }
    const adapter = adapters[descriptor.type];
    return adapter(container, descriptor, getContainerViewerOptions(container));
  };
}

function createRuntimeSources(document, pageLayout, console) {
  return createPageSources({
    document,
    getPageContext: pageLayout.getPageContext,
    onContractFailure() { console.warn('[digital_viewer] stage=discovery code=source-contract-missing'); },
    onDiscoveryError() { console.warn('[digital_viewer] stage=startup code=source-unavailable'); },
  });
}

function createRuntimeServices(dependencies) {
  const status = createStatus({ document: dependencies.document, console: dependencies.console });
  const pageLayout = createPageLayout({ document: dependencies.document });
  const lifecycle = createLifecycle({
    AbortController: dependencies.AbortController,
    setTimeout: dependencies.setTimeout,
    clearTimeout: dependencies.clearTimeout,
    showLoadingNotice: status.showLoadingNotice,
    restoreLeafLayoutIfUnused: pane => pageLayout.restoreLeafLayoutIfUnused(
      pane,
      lifecycle.activeMountStates
    ),
  });
  const features = createViewerFeatures(dependencies, lifecycle);
  const viewer = createOpenSeadragonViewer(dependencies, lifecycle, status, features);
  const adapters = createRuntimeAdapters(dependencies, lifecycle, status, features, viewer.mountOsdViewer);
  return { status, pageLayout, lifecycle, features, viewer, adapters };
}

function createRuntimeStartup(dependencies, services) {
  const { status, pageLayout, lifecycle, adapters } = services;
  const mountDescriptor = createDescriptorMounter(adapters, status.resetContainer);
  const sources = createRuntimeSources(dependencies.document, pageLayout, dependencies.console);
  const mountSequence = createMountSequence({ lifecycle, mountDescriptor, reportFailure: status.reportFailure });
  const initializer = createInitializer({
    config: dependencies.config,
    document: dependencies.document,
    console: dependencies.console,
    OpenSeadragon: dependencies.OpenSeadragon,
    sources,
    pageLayout,
    lifecycle,
    mountRankedSources: mountSequence.mountRankedSources,
  });
  return { mountDescriptor, sources, initializer };
}

function createPublicRuntimeApi(services, startup) {
  const { features, viewer, adapters, lifecycle } = services;
  const { mountDescriptor, sources, initializer } = startup;
  return {
    addViewerModeActions: features.viewerModes.addViewerModeActions,
    getPreloadPageIndexes,
    buildThumbnailUrl,
    addControls: features.controls.addControls,
    addThumbnailCarousel: features.thumbnails.addThumbnailCarousel,
    warmSequenceCache: features.prefetch.warmSequenceCache,
    classifyPageContext,
    collectSourceAnchors: sources.collectSourceAnchors,
    mountOsdViewer: viewer.mountOsdViewer,
    mountDescriptor,
    adapters,
    getContainerViewerOptions,
    disposeMountState: lifecycle.disposeMountState,
    init: initializer.init,
  };
}

export function createViewerRuntime(dependencies) {
  const services = createRuntimeServices(dependencies);
  const startup = createRuntimeStartup(dependencies, services);
  return createPublicRuntimeApi(services, startup);
}
