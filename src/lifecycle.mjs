// One lifecycle instance owns the record groups and their current attempts.
function createAttempt({ AbortController }) {
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

function clearAttemptTimeout(attempt, clearTimeout) {
  if (!attempt || attempt.timeoutId === null || typeof attempt.timeoutId === 'undefined') return;
  clearTimeout(attempt.timeoutId);
  attempt.timeoutId = null;
}

function runAttemptCleanups(attempt) {
  const cleanups = (attempt.cleanups || []).slice();
  attempt.cleanups = [];
  cleanups.forEach(function (cleanup) {
    try {
      cleanup();
    } catch {
      // Cleanup must not interrupt replacement or teardown.
    }
  });
}

function disposeAttempt(attempt, dependencies) {
  const { clearTimeout } = dependencies;
  if (!attempt || attempt.disposed) return;
  attempt.disposed = true;
  attempt.active = false;
  clearAttemptTimeout(attempt, clearTimeout);
  (attempt.timers || []).forEach(function (timerId) {
    clearTimeout(timerId);
  });
  attempt.timers = [];
  abortAttempt(attempt);
  disposeAttemptViewer(attempt);
  runAttemptCleanups(attempt);
}

function abortAttempt(attempt) {
  if (attempt.controller && typeof attempt.controller.abort === 'function') {
    attempt.controller.abort();
  }
}

function disposeAttemptViewer(attempt) {
  try {
    if (attempt.viewer) disposeViewer(attempt.viewer);
  } catch {
    // Other owned resources must still be released if a renderer throws.
  }
}

function scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback, dependencies) {
  const { setTimeout, showLoadingNotice } = dependencies;
  attempt.timeoutId = setTimeout(function () {
    if (!isAttemptActive(attempt) || attempt.completed || attempt.timedOut) return;
    attempt.timeoutId = null;
    attempt.timedOut = true;
    if (allowFallback) {
      disposeAttempt(attempt, dependencies);
      onFallback();
    } else {
      showLoadingNotice(container);
    }
  }, timeout);
}

function detachMountContainer(container) {
  if (!container) return;
  container.__dvMountState = null;
  if (container.parentNode && typeof container.parentNode.removeChild === 'function') {
    container.parentNode.removeChild(container);
  }
}

function clearMountRoot(state) {
  if (state.root && state.root.__dvMountState === state) state.root.__dvMountState = null;
}

function removeActiveMountState(activeMountStates, state) {
  const activeIndex = activeMountStates.indexOf(state);
  if (activeIndex !== -1) activeMountStates.splice(activeIndex, 1);
}

function disposeMountState(state, options, activeMountStates, dependencies) {
  const disposeAttempt = dependencies.disposeAttempt;
  const restoreLeafLayoutIfUnused = dependencies.restoreLeafLayoutIfUnused;
  if (!state || state.disposed) return;
  state.disposed = true;
  disposeAttempt(state.attempt);
  detachMountContainer(state.container);
  clearMountRoot(state);
  removeActiveMountState(activeMountStates, state);
  if (!options || !options.preserveLayout) restoreLeafLayoutIfUnused(state.layoutPane);
}

function createAttemptOperations(dependencies) {
  return {
    createAttempt: function () { return createAttempt(dependencies); },
    disposeViewer,
    isAttemptActive,
    registerAttemptCleanup,
    disposeAttempt: function (attempt) { disposeAttempt(attempt, dependencies); },
    clearAttemptTimeout: function (attempt) { clearAttemptTimeout(attempt, dependencies.clearTimeout); },
    scheduleAttemptTimeout: function (attempt, container, timeout, allowFallback, onFallback) {
      scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback, dependencies);
    },
  };
}

function createMountStateOperations(activeMountStates, dependencies, disposeAttemptOperation) {
  return {
    disposeMountState: function (state, options) {
      const mountDependencies = {
        disposeAttempt: disposeAttemptOperation,
        restoreLeafLayoutIfUnused: dependencies.restoreLeafLayoutIfUnused,
      };
      disposeMountState(state, options, activeMountStates, mountDependencies);
    },
  };
}

export function createLifecycle(dependencies) {
  const activeMountStates = [];
  const attemptOperations = createAttemptOperations(dependencies);
  return {
    activeMountStates,
    ...attemptOperations,
    ...createMountStateOperations(activeMountStates, dependencies, attemptOperations.disposeAttempt),
  };
}
