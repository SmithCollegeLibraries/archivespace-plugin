export function classifyPageContext(context) {
  if (!context || !context.paneExists) return 'inline-fallback';
  if (context.recordType === 'DigitalObject' && context.hasChildren === false) {
    return 'leaf-digital-object';
  }
  return 'stock';
}

export function createPageLayout({ document }) {
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

  function restoreLeafLayoutIfUnused(pane, activeMountStates) {
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

  return { findInsertAfter, getPageContext, prepareLeafLayout, restoreLeafLayoutIfUnused };
}
