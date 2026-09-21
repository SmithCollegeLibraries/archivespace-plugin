// The template attribute contract and legacy selectors live here.
export function createPageSources({ document, getPageContext, onDiscoveryError, onContractFailure }) {
  var sourceGroupCount = 0;

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
      root = anchor.closest('[data-dv-source-group]') || anchor.closest(
        '[data-additional-file-version], ' +
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

  function auditSourceContract() {
    const expected = document.querySelectorAll('[data-dv-source-expected]');
    for (const element of expected) {
      const uri = element.getAttribute('data-file-uri');
      if (!uri || !uri.trim()) {
        if (onContractFailure) onContractFailure('source-contract-missing');
        return;
      }
    }
  }

  function collectGroups() {
    auditSourceContract();
    var fileUris = collectFileUris();
    var groups = [];

    fileUris.forEach(function (item) {
      var root;
      try {
        root = findGroupRoot(item.anchor);
      } catch (err) {
        if (onDiscoveryError) onDiscoveryError();
        return;
      }
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

    return groups;
  }

  return { collectSourceAnchors, collectFileUris, collectGroups };
}
