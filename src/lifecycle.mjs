// One lifecycle instance owns the record groups and their current attempts.
export function createLifecycle({ AbortController, setTimeout, clearTimeout,
  showLoadingNotice, restoreLeafLayoutIfUnused }) {
  var activeMountStates = [];

  function createAttempt() {
    return {
      active: true, disposed: false, viewer: null,
      controller: typeof AbortController !== 'undefined' ? new AbortController() : null,
      timers: [], cleanups: [], timeoutId: null,
    };
  }

  function disposeViewer(viewer) {
    if (viewer && typeof viewer.destroy === 'function') viewer.destroy();
  }

  function isAttemptActive(attempt) {
    return !attempt || attempt.active !== false;
  }

  function registerAttemptCleanup(attempt, cleanup) {
    if (!attempt || typeof cleanup !== 'function') return;
    attempt.cleanups.push(cleanup);
  }

  function disposeAttempt(attempt) {
    var cleanups;

    if (!attempt || attempt.disposed) return;
    attempt.disposed = true;
    attempt.active = false;
    clearAttemptTimeout(attempt);
    (attempt.timers || []).forEach(function (timerId) {
      clearTimeout(timerId);
    });
    attempt.timers = [];
    if (attempt.controller && typeof attempt.controller.abort === 'function') {
      attempt.controller.abort();
    }
    try {
      if (attempt.viewer) disposeViewer(attempt.viewer);
    } catch (err) {
      // Other owned resources must still be released if a renderer throws.
    }
    cleanups = (attempt.cleanups || []).slice();
    attempt.cleanups = [];
    cleanups.forEach(function (cleanup) {
      try {
        cleanup();
      } catch (err) {
        // Cleanup must not interrupt replacement or teardown.
      }
    });
  }

  function clearAttemptTimeout(attempt) {
    if (!attempt || attempt.timeoutId === null || typeof attempt.timeoutId === 'undefined') return;
    clearTimeout(attempt.timeoutId);
    attempt.timeoutId = null;
  }

  function scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback) {
    attempt.timeoutId = setTimeout(function () {
      if (!isAttemptActive(attempt) || attempt.completed || attempt.timedOut) return;
      attempt.timeoutId = null;
      attempt.timedOut = true;
      if (allowFallback) {
        disposeAttempt(attempt);
        onFallback();
      } else {
        showLoadingNotice(container);
      }
    }, timeout);
  }

  function disposeMountState(state, options) {
    var activeIndex;

    if (!state || state.disposed) return;
    state.disposed = true;
    disposeAttempt(state.attempt);
    if (state.container) {
      state.container.__dvMountState = null;
      if (state.container.parentNode && typeof state.container.parentNode.removeChild === 'function') {
        state.container.parentNode.removeChild(state.container);
      }
    }
    if (state.root && state.root.__dvMountState === state) state.root.__dvMountState = null;
    activeIndex = activeMountStates.indexOf(state);
    if (activeIndex !== -1) activeMountStates.splice(activeIndex, 1);
    if (!options || !options.preserveLayout) restoreLeafLayoutIfUnused(state.layoutPane);
  }

  return { activeMountStates, createAttempt, disposeViewer, isAttemptActive, registerAttemptCleanup, disposeAttempt, clearAttemptTimeout, scheduleAttemptTimeout, disposeMountState };
}
