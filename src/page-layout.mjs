export function classifyPageContext(context) {
  if (!context || !context.paneExists) return 'inline-fallback';
  if (context.recordType === 'DigitalObject' && context.hasChildren === false) {
    return 'leaf-digital-object';
  }
  return 'stock';
}

function findSourceGroup(anchor) {
  return anchor.closest ? anchor.closest('[data-dv-source-group]') : null;
}

function findExternalObjectBlock(anchor) {
  if (!anchor.classList || !anchor.classList.contains('external-digital-object__link')) {
    return { matched: false };
  }
  const availableBlock = anchor.closest ? anchor.closest('.available-digital-objects') : null;
  return { matched: true, insertAfter: availableBlock || anchor.parentNode };
}

function findAdditionalVersionBlock(anchor) {
  if (!anchor.closest || !anchor.closest('[data-additional-file-version]')) return { matched: false };
  return { matched: true, insertAfter: anchor.closest('.panel') || anchor.parentNode };
}

function findLegacyInsertionPoint(anchor) {
  return (anchor.closest ? anchor.closest('dl, .digital-object, .instance') : null) || anchor.parentNode;
}

function findInsertAfter(anchor) {
  // Keep each inline viewer adjacent to its own source, including thumbnails.
  const sourceGroup = findSourceGroup(anchor);
  if (sourceGroup) return sourceGroup;
  const externalBlock = findExternalObjectBlock(anchor);
  if (externalBlock.matched) return externalBlock.insertAfter;
  const additionalBlock = findAdditionalVersionBlock(anchor);
  if (additionalBlock.matched) return additionalBlock.insertAfter;
  return findLegacyInsertionPoint(anchor);
}

function getPageContext(document) {
  const context = document.querySelector('[data-dv-page-context]');
  const dataset = context && context.dataset ? context.dataset : {};
  return {
    recordType: dataset.recordType || '',
    hasChildren: dataset.hasChildren === 'true',
    paneExists: !!document.querySelector('#notes_row > .resizable-content-pane'),
  };
}

function getLeafLayoutPane(document) {
  return document.querySelector('#notes_row > .resizable-content-pane');
}

function existingViewerColumn(pane) {
  const viewerColumn = pane.querySelector('#dv-viewer-column');
  if (!viewerColumn) return null;
  pane.classList.add('dv-enhanced-pane');
  return viewerColumn;
}

function createLeafLayoutColumns(document) {
  const metadataColumn = document.createElement('div');
  const viewerColumn = document.createElement('div');
  metadataColumn.className = 'dv-metadata-column';
  viewerColumn.id = 'dv-viewer-column';
  viewerColumn.className = 'dv-viewer-column';
  return { metadataColumn, viewerColumn };
}

function movePaneChildren(pane, metadataColumn) {
  while (pane.firstChild) metadataColumn.appendChild(pane.firstChild);
}

function prepareLeafLayout(document) {
  const pane = getLeafLayoutPane(document);
  if (!pane || !pane.children) return null;
  const currentViewerColumn = existingViewerColumn(pane);
  if (currentViewerColumn) return currentViewerColumn;

  const { metadataColumn, viewerColumn } = createLeafLayoutColumns(document);
  movePaneChildren(pane, metadataColumn);
  pane.appendChild(metadataColumn);
  pane.appendChild(viewerColumn);
  pane.classList.add('dv-enhanced-pane');
  pane.__dvLeafLayoutState = { pane, metadataColumn, viewerColumn };
  return viewerColumn;
}

function hasActiveMountForPane(activeMountStates, pane) {
  return activeMountStates.some(function (state) {
    return state && !state.disposed && state.layoutPane === pane;
  });
}

function findLeafLayoutColumns(pane) {
  const layoutState = pane.__dvLeafLayoutState;
  return {
    metadataColumn: (layoutState && layoutState.metadataColumn) || pane.querySelector('.dv-metadata-column'),
    viewerColumn: (layoutState && layoutState.viewerColumn) || pane.querySelector('#dv-viewer-column'),
  };
}

function restoreMetadataChildren(pane, metadataColumn) {
  if (!metadataColumn) return;
  while (metadataColumn.firstChild) pane.appendChild(metadataColumn.firstChild);
  if (metadataColumn.parentNode) metadataColumn.parentNode.removeChild(metadataColumn);
}

function removeViewerColumn(viewerColumn) {
  if (viewerColumn && viewerColumn.parentNode) viewerColumn.parentNode.removeChild(viewerColumn);
}

function restoreLeafLayoutIfUnused(pane, activeMountStates) {
  if (!pane || hasActiveMountForPane(activeMountStates, pane)) return;
  const { metadataColumn, viewerColumn } = findLeafLayoutColumns(pane);
  if (!metadataColumn && !viewerColumn) return;
  restoreMetadataChildren(pane, metadataColumn);
  removeViewerColumn(viewerColumn);
  pane.classList.remove('dv-enhanced-pane');
  pane.__dvLeafLayoutState = null;
}

export function createPageLayout({ document }) {
  return {
    findInsertAfter,
    getPageContext: function () { return getPageContext(document); },
    prepareLeafLayout: function () { return prepareLeafLayout(document); },
    restoreLeafLayoutIfUnused,
  };
}
