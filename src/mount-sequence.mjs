import { getLoadingTimeout } from './config.mjs';
import { getCompanionPdfUrl } from './tile-sources.mjs';

export function getContainerViewerOptions(container) {
  var mountOptions = container && container.__dvMountOptions || {};
  var attempt = mountOptions.attempt;

  return {
    objectDownloadPdfUrl: getCompanionPdfUrl(container && container.__dvDescriptorSelection),
    loadingTimeoutMs: mountOptions.loadingTimeoutMs,
    allowFallbackOnTimeout: !!mountOptions.allowFallbackOnTimeout,
    attempt: attempt,
    signal: attempt && attempt.controller ? attempt.controller.signal : undefined,
  };
}

export function createMountSequence({ lifecycle, mountDescriptor, reportFailure }) {
  const { createAttempt, disposeAttempt, isAttemptActive, scheduleAttemptTimeout, clearAttemptTimeout } = lifecycle;

  function mountRankedSources(container, ranked) {
    function tryMount(rankIndex) {
      var mountState = container.__dvMountState;
      var attempt = createAttempt();

      if (!mountState || mountState.disposed) return;
      if (mountState.attempt) disposeAttempt(mountState.attempt);
      mountState.attempt = attempt;
      container.__dvMountAttempt = attempt;
      container.__dvMountOptions.allowFallbackOnTimeout = rankIndex + 1 < ranked.length;
      container.__dvMountOptions.attempt = attempt;
      scheduleAttemptTimeout(
        attempt,
        container,
        getLoadingTimeout(container.__dvMountOptions),
        rankIndex + 1 < ranked.length,
        function () {
          if (!mountState.disposed) tryMount(rankIndex + 1);
        }
      );
      Promise.resolve().then(function () {
        if (!isAttemptActive(attempt)) return Promise.reject(new Error('ATTEMPT_DISPOSED'));
        return mountDescriptor(container, ranked[rankIndex].descriptor);
      })
        .then(function () {
          if (!isAttemptActive(attempt)) return;
          attempt.completed = true;
          clearAttemptTimeout(attempt);
        })
        .catch(function () {
          if (!isAttemptActive(attempt) || mountState.disposed) return;
          disposeAttempt(attempt);
          if (rankIndex + 1 < ranked.length) {
            tryMount(rankIndex + 1);
          } else {
            reportFailure(container, 'viewer', 'content-unavailable');
          }
        });
    }
    tryMount(0);
  }

  return { mountRankedSources };
}
