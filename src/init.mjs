import { detectSource, buildDescriptorSelection } from './source-selection.mjs';
import { classifyPageContext } from './page-layout.mjs';

export function createInitializer(dependencies) {
  function init() {
    initializeViewer(dependencies);
  }
  return { init };
}

function selectSources(group, config) {
  const candidates = [];
  group.items.forEach(function (item) {
    const descriptor = detectSource(item.uri, config);
    if (descriptor) candidates.push({ item, descriptor });
  });
  return {
    selection: buildDescriptorSelection(candidates),
    // Preserve discovery order independently of source ranking.
    signature: candidates.map(function (candidate) { return candidate.item.uri; }).join('\u0000'),
  };
}

function createContainer(dependencies, group, selection, signature, viewerColumn) {
  const container = dependencies.document.createElement('div');
  container.className = 'digital-viewer-container';
  container.__dvDescriptorSelection = selection;
  container.__dvMountOptions = {
    loadingTimeoutMs: dependencies.config.loadingTimeoutMs,
    allowFallbackOnTimeout: selection.rankedCandidates.length > 1,
  };
  const state = {
    root: group.root, container, signature, attempt: null,
    disposed: false, seenInInit: true,
    layoutPane: viewerColumn ? viewerColumn.parentNode : null,
  };
  container.__dvMountState = state;
  if (group.root) group.root.__dvMountState = state;
  dependencies.lifecycle.activeMountStates.push(state);
  return container;
}

function placeContainer(dependencies, container, selection, viewerColumn) {
  if (viewerColumn) {
    viewerColumn.appendChild(container);
    return true;
  }
  const insertAfter = dependencies.pageLayout.findInsertAfter(selection.primaryCandidate.item.anchor);
  if (!insertAfter || !insertAfter.parentNode) return false;
  insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
  return true;
}

function isReusableMount(existing, signature) {
  return existing && !existing.disposed && existing.signature === signature &&
    existing.container && existing.container.parentNode;
}

function mountReplacementGroup(dependencies, disposeMountState, mountRankedSources,
  group, selection, signature, existing, layoutKind) {
  const viewerColumn = layoutKind === 'leaf-digital-object'
    ? dependencies.pageLayout.prepareLeafLayout()
    : null;
  if (existing) disposeMountState(existing, { preserveLayout: true });
  const container = createContainer(dependencies, group, selection, signature, viewerColumn);
  if (!placeContainer(dependencies, container, selection, viewerColumn)) {
    disposeMountState(container.__dvMountState);
    return;
  }
  mountRankedSources(container, selection.rankedCandidates);
}

function mountGroup(dependencies, disposeMountState, mountRankedSources, group, layoutKind) {
  const { selection, signature } = selectSources(group, dependencies.config);
  const existing = group.root && group.root.__dvMountState;
  if (!selection.primaryCandidate) {
    if (existing) disposeMountState(existing);
    return;
  }
  if (isReusableMount(existing, signature)) {
    existing.seenInInit = true;
    return;
  }
  mountReplacementGroup(dependencies, disposeMountState, mountRankedSources,
    group, selection, signature, existing, layoutKind);
}

function markMountsUnseen(activeMountStates) {
  activeMountStates.forEach(function (state) { state.seenInInit = false; });
}

function handleGroupMountError(dependencies, disposeMountState, group) {
  try {
    disposeMountState(group.root && group.root.__dvMountState);
  } catch {
    // A host DOM failure during cleanup must remain isolated as well.
  }
  dependencies.console.warn('[digital_viewer] stage=startup code=group-unavailable');
}

function mountGroupsIndependently(dependencies, groups, layoutKind, disposeMountState, mountRankedSources) {
  groups.forEach(function (group) {
    try {
      mountGroup(dependencies, disposeMountState, mountRankedSources, group, layoutKind);
    } catch {
      // A failed object must not stop later groups or remove original links.
      handleGroupMountError(dependencies, disposeMountState, group);
    }
  });
}

function disposeUnseenMounts(activeMountStates, disposeMountState) {
  activeMountStates.slice().forEach(function (state) {
    if (!state.seenInInit) disposeMountState(state);
  });
}

function initializeViewer(dependencies) {
  if (typeof dependencies.OpenSeadragon === 'undefined') {
    dependencies.console.warn('[digital_viewer] stage=startup code=osd-unavailable (OpenSeadragon not loaded)');
    return;
  }
  const groups = dependencies.sources.collectGroups();
  const activeMountStates = dependencies.lifecycle.activeMountStates;
  const disposeMountState = dependencies.lifecycle.disposeMountState;
  const mountRankedSources = dependencies.mountRankedSources;
  markMountsUnseen(activeMountStates);
  if (groups.length) {
    const layoutKind = classifyPageContext(dependencies.pageLayout.getPageContext());
    mountGroupsIndependently(dependencies, groups, layoutKind, disposeMountState, mountRankedSources);
  }
  disposeUnseenMounts(activeMountStates, disposeMountState);
}
