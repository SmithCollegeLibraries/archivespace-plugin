import { buildThumbnailUrl } from './tile-sources.mjs';

export function createThumbnails({ document, IntersectionObserver, setTimeout, clearTimeout,
  isAttemptActive, registerAttemptCleanup, warmSequenceCache }) {
  var THUMBNAIL_TIMEOUT_MS = 10000;

  function addThumbnailCarousel(container, viewer, tileSources, options) {
    var carousel = document.createElement('div');
    var prevBtn = document.createElement('button');
    var nextBtn = document.createElement('button');
    var viewport = document.createElement('div');
    var track = document.createElement('div');
    var buttons = [];
    var thumbnailQueue = [];
    var cancelActiveThumbnail = null;
    var disposed = false;
    var thumbnailObserver;

    function loadNextThumbnail() {
      if (disposed || cancelActiveThumbnail || thumbnailQueue.length === 0) return;
      var image = thumbnailQueue.shift();
      var completed = false;
      var timerId;

      function finish(cancelRequest) {
        if (completed) return;
        completed = true;
        clearTimeout(timerId);
        image.removeEventListener('load', onComplete);
        image.removeEventListener('error', onComplete);
        // Retire the stalled request before releasing the serial queue slot.
        // Keep its numbered page button: a failed preview is not a failed page.
        if (cancelRequest) image.removeAttribute('src');
        cancelActiveThumbnail = null;
        loadNextThumbnail();
      }
      function onComplete() { finish(false); }
      cancelActiveThumbnail = function () { finish(true); };
      image.addEventListener('load', onComplete, { once: true });
      image.addEventListener('error', onComplete, { once: true });
      timerId = setTimeout(cancelActiveThumbnail, THUMBNAIL_TIMEOUT_MS);
      image.src = image.dataset.thumbnailUrl;
    }

    function queueThumbnail(image) {
      if (disposed || image.dataset.thumbnailQueued) return;
      image.dataset.thumbnailQueued = 'true';
      thumbnailQueue.push(image);
      loadNextThumbnail();
    }

    if (typeof IntersectionObserver !== 'undefined') {
      thumbnailObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          queueThumbnail(entry.target);
          thumbnailObserver.unobserve(entry.target);
        });
      }, { root: viewport, rootMargin: '100px' });
    }

    function updateArrowState() {
      prevBtn.disabled = viewport.scrollLeft <= 0;
      nextBtn.disabled = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 1;
    }

    function updateActive(index) {
      buttons.forEach(function (button, buttonIndex) {
        var isActive = buttonIndex === index;
        if (button.classList && button.classList.toggle) {
          button.classList.toggle('is-active', isActive);
        }
        button.setAttribute('aria-current', isActive ? 'true' : 'false');
        if (isActive && button.scrollIntoView) {
          button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(updateArrowState);
      } else {
        updateArrowState();
      }
    }

    carousel.className = 'dv-thumbnail-carousel';
    prevBtn.type = 'button';
    prevBtn.className = 'dv-thumbnail-carousel-btn';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', 'Scroll thumbnails backward');

    nextBtn.type = 'button';
    nextBtn.className = 'dv-thumbnail-carousel-btn';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', 'Scroll thumbnails forward');

    viewport.className = 'dv-thumbnail-viewport';
    track.className = 'dv-thumbnail-track';

    prevBtn.addEventListener('click', function () {
      viewport.scrollBy({ left: -Math.max(viewport.clientWidth * 0.75, 220), behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', function () {
      viewport.scrollBy({ left: Math.max(viewport.clientWidth * 0.75, 220), behavior: 'smooth' });
    });
    viewport.addEventListener('scroll', updateArrowState);

    tileSources.forEach(function (tileSource, index) {
      var thumbnailUrl = buildThumbnailUrl(tileSource);
      var button = document.createElement('button');
      var image = document.createElement('img');
      var label = document.createElement('span');

      button.type = 'button';
      button.className = 'dv-thumbnail-btn';
      button.setAttribute('aria-label', 'Go to image ' + (index + 1));
      button.addEventListener('click', function () {
        if (disposed || !isAttemptActive(options && options.attempt)) return;
        viewer.goToPage(index);
        warmSequenceCache(tileSources, index, options);
      });

      image.className = 'dv-thumbnail-img';
      image.alt = 'Thumbnail ' + (index + 1);
      image.decoding = 'async';
      if (thumbnailUrl) {
        image.dataset.thumbnailUrl = thumbnailUrl;
        if (thumbnailObserver) {
          thumbnailObserver.observe(image);
        } else {
          queueThumbnail(image);
        }
      }

      label.className = 'dv-thumbnail-label';
      label.textContent = String(index + 1);

      button.appendChild(image);
      button.appendChild(label);
      track.appendChild(button);
      buttons.push(button);
    });

    viewport.appendChild(track);
    carousel.appendChild(prevBtn);
    carousel.appendChild(viewport);
    carousel.appendChild(nextBtn);
    container.appendChild(carousel);
    updateActive(0);
    updateArrowState();

    viewer.addHandler('page', function (data) {
      if (disposed || !isAttemptActive(options && options.attempt)) return;
      updateActive(data.page);
    });
    function disposeThumbnails() {
      if (disposed) return;
      disposed = true;
      thumbnailQueue = [];
      if (thumbnailObserver) thumbnailObserver.disconnect();
      if (cancelActiveThumbnail) cancelActiveThumbnail();
    }
    viewer.addHandler('before-destroy', disposeThumbnails);
    registerAttemptCleanup(options && options.attempt, disposeThumbnails);
  }

  return { addThumbnailCarousel };
}
