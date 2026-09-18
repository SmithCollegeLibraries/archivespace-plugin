import { detectSource, buildDescriptorSelection } from './source-selection.mjs';
import { classifyPageContext } from './page-layout.mjs';

export function createInitializer({ config, document, console, OpenSeadragon,
  sources, pageLayout, lifecycle, mountRankedSources }) {
  const { activeMountStates, disposeMountState } = lifecycle;

  function selectSources(group) {
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

  function createContainer(group, selection, signature, viewerColumn) {
    const container = document.createElement('div');
    container.className = 'digital-viewer-container';
    container.__dvDescriptorSelection = selection;
    container.__dvMountOptions = {
      loadingTimeoutMs: config.loadingTimeoutMs,
      allowFallbackOnTimeout: selection.rankedCandidates.length > 1,
    };
    const state = {
      root: group.root, container, signature, attempt: null,
      disposed: false, seenInInit: true,
      layoutPane: viewerColumn ? viewerColumn.parentNode : null,
    };
    container.__dvMountState = state;
    if (group.root) group.root.__dvMountState = state;
    activeMountStates.push(state);
    return container;
  }

  function placeContainer(container, selection, viewerColumn) {
    if (viewerColumn) {
      viewerColumn.appendChild(container);
      return true;
    }
    const insertAfter = pageLayout.findInsertAfter(selection.primaryCandidate.item.anchor);
    if (!insertAfter || !insertAfter.parentNode) return false;
    insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
    return true;
  }

  function mountGroup(group, layoutKind) {
    const { selection, signature } = selectSources(group);
    const existing = group.root && group.root.__dvMountState;
    if (!selection.primaryCandidate) {
      if (existing) disposeMountState(existing);
      return;
    }

    if (existing && !existing.disposed && existing.signature === signature &&
        existing.container && existing.container.parentNode) {
      existing.seenInInit = true;
      return;
    }

    const viewerColumn = layoutKind === 'leaf-digital-object' ? pageLayout.prepareLeafLayout() : null;
    if (existing) disposeMountState(existing, { preserveLayout: true });
    const container = createContainer(group, selection, signature, viewerColumn);
    if (!placeContainer(container, selection, viewerColumn)) {
      disposeMountState(container.__dvMountState);
      return;
    }
    mountRankedSources(container, selection.rankedCandidates);
  }

  function init() {
    if (typeof OpenSeadragon === 'undefined') {
      console.warn('[digital_viewer] stage=startup code=osd-unavailable (OpenSeadragon not loaded)');
      return;
    }
    const groups = sources.collectGroups();
    activeMountStates.forEach(function (state) { state.seenInInit = false; });
    if (groups.length) {
      const layoutKind = classifyPageContext(pageLayout.getPageContext());
      groups.forEach(function (group) {
        try {
          mountGroup(group, layoutKind);
        } catch (err) {
          // A failed object must not stop later groups or remove original links.
          try {
            disposeMountState(group.root && group.root.__dvMountState);
          } catch (cleanupError) {
            // A host DOM failure during cleanup must remain isolated as well.
          }
          console.warn('[digital_viewer] stage=startup code=group-unavailable');
        }
      });
    }
    activeMountStates.slice().forEach(function (state) {
      if (!state.seenInInit) disposeMountState(state);
    });
  }

  return { init };
}
