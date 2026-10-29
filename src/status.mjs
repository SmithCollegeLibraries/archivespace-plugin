import { sanitizeUrl } from './urls.mjs';

function createFallbackLink(document, url, label) {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) return null;
  const link = document.createElement('a');
  link.href = safeUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = label;
  return link;
}

function showError(document, container, message) {
  container.classList.add('dv-active', 'dv-error');
  container.innerHTML = '';
  const paragraph = document.createElement('p');
  paragraph.className = 'dv-error-msg';
  paragraph.textContent = message;
  container.appendChild(paragraph);
}

function safeFailureLabels(stage, code) {
  const stages = {
    configuration: true,
    preservica: true,
    compass: true,
    manifest: true,
    viewer: true,
  };
  const codes = {
    'preservica-unavailable': true,
    'manifest-unavailable': true,
    'content-unavailable': true,
  };
  return {
    stage: stages[stage] ? stage : 'viewer',
    code: codes[code] ? code : 'content-unavailable',
  };
}

function reportFailure(document, console, container, stage, code) {
  const safeLabels = safeFailureLabels(stage, code);
  console.warn('[digital_viewer] stage=' + safeLabels.stage + ' code=' + safeLabels.code);
  showError(document, container, 'Digital content unavailable.');
}

function appendLoadingNotice(document, container) {
  if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = true;
  if (!container || container.querySelector('.dv-loading-msg')) return;
  const notice = document.createElement('p');
  notice.className = 'dv-loading-msg';
  notice.textContent = 'Still loading';
  container.appendChild(notice);
}

function removeLoadingNotice(container) {
  const notice = container && container.querySelector('.dv-loading-msg');
  if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = false;
  if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
}

function resetContainer(container, showLoadingNotice) {
  const hasLoadingNotice = !!(container && container.querySelector && container.querySelector('.dv-loading-msg'));
  const loadingWasShown = !!(container && container.__dvMountAttempt && container.__dvMountAttempt.loadingShown);
  container.className = 'digital-viewer-container';
  container.innerHTML = '';
  if (hasLoadingNotice || loadingWasShown) showLoadingNotice(container);
}

export function createStatus({ document, console }) {
  function showLoadingNotice(container) {
    appendLoadingNotice(document, container);
  }

  return {
    createFallbackLink: function (url, label) { return createFallbackLink(document, url, label); },
    showError: function (container, message) { showError(document, container, message); },
    reportFailure: function (container, stage, code) {
      reportFailure(document, console, container, stage, code);
    },
    showLoadingNotice,
    clearLoadingNotice: removeLoadingNotice,
    resetContainer: function (container) { resetContainer(container, showLoadingNotice); },
  };
}
