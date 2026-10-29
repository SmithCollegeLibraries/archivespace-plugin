// The template attribute contract and legacy selectors live here.
const SOURCE_ANCHOR_SELECTORS = [
  '[data-additional-file-version] a[href]',
  '.available-digital-objects a.external-digital-object__link[href]',
  '.available-digital-objects a.thumbnail[href]',
  '[data-rep-file-version-wrapper] > a[href]',
  '[data-file-uri]',
];
const GROUP_ROOT_SELECTOR = '[data-dv-source-group]';
const LEGACY_GROUP_ROOT_SELECTORS = [
  '[data-additional-file-version]',
  '[data-rep-file-version-wrapper]',
  '.objectimage',
  '.record-pane',
  '.digital-object',
  '.instance',
].join(', ');

export function createPageSources(dependencies) {
  const sourceGroupState = { count: 0 };

  function collectGroups() {
    auditSourceContract(dependencies.document, dependencies.onContractFailure);
    return collectPageGroups(dependencies, sourceGroupState);
  }

  return {
    collectSourceAnchors,
    collectFileUris: function () { return collectFileUris(dependencies.document); },
    collectGroups,
  };
}

function collectSourceAnchors(root) {
  const results = [];
  const seen = [];
  if (!root || typeof root.querySelectorAll !== 'function') return results;

  SOURCE_ANCHOR_SELECTORS.forEach(function (selector) {
    const elements = root.querySelectorAll(selector);
    for (let index = 0; index < elements.length; index += 1) {
      if (elements[index].closest && elements[index].closest('[data-dv-browse-only]')) continue;
      if (seen.indexOf(elements[index]) === -1) {
        seen.push(elements[index]);
        results.push(elements[index]);
      }
    }
  });

  return results;
}

function collectFileUris(document) {
  const results = [];
  collectSourceAnchors(document).forEach(function (anchor) {
    const uri = anchor.dataset && anchor.dataset.fileUri ? anchor.dataset.fileUri : anchor.href;
    if (uri) results.push({ uri, anchor });
  });
  collectDescriptionUris(document, results);
  return results;
}

function collectDescriptionUris(document, results) {
  const terms = document.querySelectorAll('dt');
  for (let index = 0; index < terms.length; index += 1) {
    if (!/file\s+uri/i.test(terms[index].textContent)) continue;
    const description = terms[index].nextElementSibling;
    if (!description) continue;
    const anchor = description.querySelector('a');
    const uri = anchor ? anchor.href : description.textContent.trim();
    if (uri) results.push({ uri, anchor: anchor || description });
  }
}

function findLeafDigitalObjectRoot(document, pageContext) {
  if (pageContext.recordType !== 'DigitalObject' || pageContext.hasChildren !== false || !pageContext.paneExists) {
    return null;
  }
  return document.querySelector('#notes_row > .resizable-content-pane');
}

function findClosestGroupRoot(anchor) {
  if (!anchor.closest) return anchor.parentNode;
  return anchor.closest(GROUP_ROOT_SELECTOR) || anchor.closest(LEGACY_GROUP_ROOT_SELECTORS) || anchor.parentNode;
}

function assignSourceGroup(root, sourceGroupState) {
  if (!root || !root.setAttribute || root.getAttribute('data-dv-source-group')) return;
  sourceGroupState.count += 1;
  root.setAttribute('data-dv-source-group', 'render-' + sourceGroupState.count);
}

function findGroupRoot(document, getPageContext, anchor, sourceGroupState) {
  const pageContext = getPageContext();
  const root = findLeafDigitalObjectRoot(document, pageContext) || findClosestGroupRoot(anchor);
  assignSourceGroup(root, sourceGroupState);
  return root;
}

function auditSourceContract(document, onContractFailure) {
  const expected = document.querySelectorAll('[data-dv-source-expected]');
  for (const element of expected) {
    const uri = element.getAttribute('data-file-uri');
    if (!uri || !uri.trim()) {
      if (onContractFailure) onContractFailure('source-contract-missing');
      return;
    }
  }
}

function reportDiscoveryError(onDiscoveryError) {
  if (onDiscoveryError) onDiscoveryError();
}

function findOrCreateGroup(groups, root) {
  let group = groups.find(function (candidate) { return candidate.root === root; });
  if (!group) {
    group = { root, items: [] };
    groups.push(group);
  }
  return group;
}

function addUniqueItem(group, item) {
  if (!group.items.some(function (existing) { return existing.uri === item.uri; })) {
    group.items.push(item);
  }
}

function collectGroupItem(dependencies, sourceGroupState, groups, item) {
  let root;
  try {
    root = findGroupRoot(dependencies.document, dependencies.getPageContext, item.anchor, sourceGroupState);
  } catch {
    reportDiscoveryError(dependencies.onDiscoveryError);
    return;
  }
  addUniqueItem(findOrCreateGroup(groups, root), item);
}

function collectPageGroups(dependencies, sourceGroupState) {
  const groups = [];
  collectFileUris(dependencies.document).forEach(function (item) {
    collectGroupItem(dependencies, sourceGroupState, groups, item);
  });
  return groups;
}
