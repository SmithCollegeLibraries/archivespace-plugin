import { buildThumbnailUrl } from './tile-sources.mjs';

const THUMBNAIL_TIMEOUT_MS = 10000;

export function createThumbnails(dependencies) {
  function addThumbnailCarousel(container, viewer, tileSources, options) {
    const elements = createCarouselElements(dependencies.document);
    const state = { disposed: false };
    const lifecycle = { observer: null };
    const queue = createThumbnailQueue(dependencies, state, lifecycle);
    lifecycle.observer = createThumbnailObserver(
      dependencies.IntersectionObserver,
      elements.viewport,
      queue.enqueue,
      queue.dropQueued
    );
    const buttons = createPageButtons({
      document: dependencies.document,
      viewer,
      tileSources,
      options,
      state,
      observer: lifecycle.observer,
      enqueueThumbnail: queue.enqueue,
      isAttemptActive: dependencies.isAttemptActive,
      warmSequenceCache: dependencies.warmSequenceCache,
    });

    appendThumbnails(elements, buttons, container);
    const updateArrows = bindCarouselNavigation(elements, buttons);
    bindViewerLifecycle(viewer, buttons, options, state, lifecycle.observer, queue,
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

function createThumbnailQueue({ setTimeout, clearTimeout }, state, lifecycle) {
  const queue = {
    waiting: { iiif: [], stored: [] },
    active: { iiif: [], stored: [] },
    retries: new WeakMap(),
    setTimeout,
    clearTimeout,
    state,
    lifecycle,
  };
  queue.enqueue = function (image) {
    if (state.disposed || image.dataset.thumbnailQueued) return;
    image.dataset.thumbnailQueued = 'true';
    const lane = thumbnailLane(image.dataset.thumbnailUrl);
    queue.waiting[lane].push({ image, lane });
    loadThumbnailLane(queue, lane);
  };
  queue.dropQueued = image => dropQueuedThumbnail(queue, image);
  queue.dispose = () => disposeThumbnailQueue(queue);
  return queue;
}

function loadThumbnailLane(queue, lane) {
  const limit = lane === 'iiif' ? 1 : 4;
  while (!queue.state.disposed && queue.active[lane].length < limit && queue.waiting[lane].length) {
    startThumbnailRequest(queue, queue.waiting[lane].shift());
  }
}

function loadNextThumbnail(queue) {
  loadThumbnailLane(queue, 'iiif');
  loadThumbnailLane(queue, 'stored');
}

function startThumbnailRequest(queue, record) {
  const request = { image: record.image, lane: record.lane, completed: false };
  const complete = () => finishThumbnailRequest(queue, request, false);
  request.complete = complete;
  request.cancel = () => finishThumbnailRequest(queue, request, true);
  queue.active[request.lane].push(request);
  if (queue.lifecycle.observer) queue.lifecycle.observer.unobserve(request.image);
  request.image.addEventListener('load', complete, { once: true });
  request.image.addEventListener('error', complete, { once: true });
  request.timer = queue.setTimeout(
    () => finishThumbnailRequest(queue, request, true, true),
    THUMBNAIL_TIMEOUT_MS
  );
  request.image.src = request.image.dataset.thumbnailUrl;
}

function finishThumbnailRequest(queue, request, cancelRequest, timedOut = false) {
  if (request.completed) return;
  request.completed = true;
  queue.clearTimeout(request.timer);
  request.image.removeEventListener('load', request.complete);
  request.image.removeEventListener('error', request.complete);
  if (cancelRequest) request.image.removeAttribute('src');
  queue.active[request.lane].splice(queue.active[request.lane].indexOf(request), 1);
  if (timedOut) retryTimedOutThumbnail(queue, request.image);
  loadNextThumbnail(queue);
}

function retryTimedOutThumbnail(queue, image) {
  if (queue.state.disposed || queue.retries.has(image)) return;
  queue.retries.set(image, true);
  delete image.dataset.thumbnailQueued;
  if (queue.lifecycle.observer) queue.lifecycle.observer.observe(image);
  else queue.enqueue(image);
}

function dropQueuedThumbnail(queue, image) {
  ['iiif', 'stored'].forEach(function (lane) {
    const index = queue.waiting[lane].findIndex(record => record.image === image);
    if (index === -1) return;
    queue.waiting[lane].splice(index, 1);
    delete image.dataset.thumbnailQueued;
  });
}

function disposeThumbnailQueue(queue) {
  queue.waiting.iiif.length = 0;
  queue.waiting.stored.length = 0;
  [...queue.active.iiif, ...queue.active.stored].forEach(request => request.cancel());
}

function thumbnailLane(url) {
  const path = url.split(/[?#]/)[0].replace(/^[a-z][a-z\d+.-]*:\/\/[^/]*/i, '');
  return /\/full\/[^/]+\/0\/[^/]+\.[^/]+$/.test(path) ? 'iiif' : 'stored';
}

function createThumbnailObserver(Observer, viewport, enqueueThumbnail, dropQueuedThumbnail) {
  if (typeof Observer === 'undefined') return null;
  return new Observer(function (entries) {
    entries.filter(entry => !entry.isIntersecting)
      .forEach(entry => dropQueuedThumbnail(entry.target));
    entries.filter(entry => entry.isIntersecting)
      .forEach(entry => enqueueThumbnail(entry.target));
  }, { root: viewport, rootMargin: '100px' });
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
