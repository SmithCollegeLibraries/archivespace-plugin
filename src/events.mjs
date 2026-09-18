// A viewer owns external event subscriptions until its destruction or attempt disposal.
export function createViewerScope(viewer, attempt, registerAttemptCleanup) {
  let disposed = false;
  const cleanups = [];

  function listen(target, event, callback) {
    function guarded(eventData) {
      if (disposed || (attempt && attempt.active === false)) return;
      callback(eventData);
    }
    target.addEventListener(event, guarded);
    cleanups.push(function () {
      if (typeof target.removeEventListener === 'function') target.removeEventListener(event, guarded);
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cleanups.splice(0).forEach(function (cleanup) { cleanup(); });
    if (viewer && typeof viewer.removeHandler === 'function') viewer.removeHandler('before-destroy', dispose);
  }

  if (viewer && typeof viewer.addHandler === 'function') viewer.addHandler('before-destroy', dispose);
  registerAttemptCleanup(attempt, dispose);
  return { listen, dispose };
}
