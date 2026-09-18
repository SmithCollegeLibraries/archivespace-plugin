import { sanitizeUrl } from './urls.mjs';

export function createStatus({ document, console }) {
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

  return { createFallbackLink, showError, reportFailure, showLoadingNotice, clearLoadingNotice, resetContainer };
}
