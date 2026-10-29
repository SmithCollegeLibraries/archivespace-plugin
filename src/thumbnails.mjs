import { buildThumbnailUrl } from './tile-sources.mjs';

const THUMBNAIL_TIMEOUT_MS = 10000;

export function createThumbnails(dependencies) {
  function addThumbnailCarousel(container, viewer, tileSources, options) {
    const elements = createCarouselElements(dependencies.document);
    const state = { disposed: false };
    const queue = createThumbnailQueue(dependencies, state);
    const observer = createThumbnailObserver(
      dependencies.IntersectionObserver,
      elements.viewport,
      queue.enqueue
    );
    const buttons = createPageButtons({
      document: dependencies.document,
      viewer,
      tileSources,
      options,
      state,
      observer,
      enqueueThumbnail: queue.enqueue,
      isAttemptActive: dependencies.isAttemptActive,
      warmSequenceCache: dependencies.warmSequenceCache,
    });

    appendThumbnails(elements, buttons, container);
    const updateArrows = bindCarouselNavigation(elements, buttons);
    bindViewerLifecycle(viewer, buttons, options, state, observer, queue,
      dependencies.isAttemptActive, dependencies.registerAttemptCleanup, updateArrows);
  }

  return { addThumbnailCarousel };
}

function createCarouselElements(document) {
  const carousel = document.createElement('div');
  const prevBtn = document.createElement('button');
  const nextBtn = document.createElement('button');
  const viewport = document.createElement('div');
  const track = document.createElement('div');

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

  return { carousel, prevBtn, nextBtn, viewport, track };
}

function createThumbnailQueue({ setTimeout, clearTimeout }, state) {
  const queue = [];
  let cancelActive = null;

  function loadNext() {
    if (state.disposed || cancelActive || queue.length === 0) return;
    const image = queue.shift();
    let completed = false;
    let timerId;

    function finish(cancelRequest) {
      if (completed) return;
      completed = true;
      clearTimeout(timerId);
      image.removeEventListener('load', onComplete);
      image.removeEventListener('error', onComplete);
      if (cancelRequest) image.removeAttribute('src');
      cancelActive = null;
      loadNext();
    }

    function onComplete() { finish(false); }
    cancelActive = function () { finish(true); };
    image.addEventListener('load', onComplete, { once: true });
    image.addEventListener('error', onComplete, { once: true });
    timerId = setTimeout(cancelActive, THUMBNAIL_TIMEOUT_MS);
    image.src = image.dataset.thumbnailUrl;
  }

  function enqueue(image) {
    if (state.disposed || image.dataset.thumbnailQueued) return;
    image.dataset.thumbnailQueued = 'true';
    queue.push(image);
    loadNext();
  }

  function dispose() {
    queue.length = 0;
    if (cancelActive) cancelActive();
  }

  return { enqueue, dispose };
}

function createThumbnailObserver(Observer, viewport, enqueueThumbnail) {
  if (typeof Observer === 'undefined') return null;
  let observer;
  observer = new Observer(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      enqueueThumbnail(entry.target);
      observer.unobserve(entry.target);
    });
  }, { root: viewport, rootMargin: '100px' });
  return observer;
}

function createPageButtons({ document, viewer, tileSources, options, state, observer,
  enqueueThumbnail, isAttemptActive, warmSequenceCache }) {
  return tileSources.map(function (tileSource, index) {
    return createPageButton({
      document,
      viewer,
      tileSources,
      tileSource,
      index,
      options,
      state,
      observer,
      enqueueThumbnail,
      isAttemptActive,
      warmSequenceCache,
    });
  });
}

function createPageButton({ document, viewer, tileSources, tileSource, index, options,
  state, observer, enqueueThumbnail, isAttemptActive, warmSequenceCache }) {
  const button = document.createElement('button');
  const image = document.createElement('img');
  const label = document.createElement('span');
  const thumbnailUrl = buildThumbnailUrl(tileSource);

  button.type = 'button';
  button.className = 'dv-thumbnail-btn';
  button.setAttribute('aria-label', 'Go to image ' + (index + 1));
  button.addEventListener('click', function () {
    if (state.disposed || !isAttemptActive(options && options.attempt)) return;
    viewer.goToPage(index);
    warmSequenceCache(tileSources, index, options);
  });

  image.className = 'dv-thumbnail-img';
  image.alt = 'Thumbnail ' + (index + 1);
  image.decoding = 'async';
  if (thumbnailUrl) {
    image.dataset.thumbnailUrl = thumbnailUrl;
    if (observer) {
      observer.observe(image);
    } else {
      enqueueThumbnail(image);
    }
  }

  label.className = 'dv-thumbnail-label';
  label.textContent = String(index + 1);
  button.appendChild(image);
  button.appendChild(label);
  return button;
}

function updateArrowState(viewport, track, prevBtn, nextBtn) {
  prevBtn.disabled = viewport.scrollLeft <= 0;
  nextBtn.disabled = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 1;
}

function updateActiveThumbnail(buttons, index, updateArrows) {
  buttons.forEach(function (button, buttonIndex) {
    const isActive = buttonIndex === index;
    if (button.classList && button.classList.toggle) {
      button.classList.toggle('is-active', isActive);
    }
    button.setAttribute('aria-current', isActive ? 'true' : 'false');
    if (isActive && button.scrollIntoView) {
      button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(updateArrows);
  } else {
    updateArrows();
  }
}

function bindCarouselNavigation({ viewport, track, prevBtn, nextBtn }, buttons) {
  const updateArrows = function () { updateArrowState(viewport, track, prevBtn, nextBtn); };
  prevBtn.addEventListener('click', function () {
    viewport.scrollBy({ left: -Math.max(viewport.clientWidth * 0.75, 220), behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', function () {
    viewport.scrollBy({ left: Math.max(viewport.clientWidth * 0.75, 220), behavior: 'smooth' });
  });
  viewport.addEventListener('scroll', updateArrows);
  updateActiveThumbnail(buttons, 0, updateArrows);
  updateArrows();
  return updateArrows;
}

function appendThumbnails(elements, buttons, container) {
  buttons.forEach(function (button) { elements.track.appendChild(button); });
  elements.viewport.appendChild(elements.track);
  elements.carousel.appendChild(elements.prevBtn);
  elements.carousel.appendChild(elements.viewport);
  elements.carousel.appendChild(elements.nextBtn);
  container.appendChild(elements.carousel);
}

function disposeThumbnails(state, observer, queue) {
  if (state.disposed) return;
  state.disposed = true;
  if (observer) observer.disconnect();
  queue.dispose();
}

function bindViewerLifecycle(viewer, buttons, options, state, observer, queue,
  isAttemptActive, registerAttemptCleanup, updateArrows) {
  const updateActive = function (index) { updateActiveThumbnail(buttons, index, updateArrows); };
  const onPage = function (data) {
    if (state.disposed || !isAttemptActive(options && options.attempt)) return;
    if (!data || typeof data.page !== 'number') return;
    updateActive(data.page);
  };
  const cleanup = function () { disposeThumbnails(state, observer, queue); };

  viewer.addHandler('page', onPage);
  viewer.addHandler('before-destroy', cleanup);
  registerAttemptCleanup(options && options.attempt, cleanup);
}
