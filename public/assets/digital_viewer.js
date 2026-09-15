/**
 * digital_viewer — ArchivesSpace PUI plugin
 *
 * Scans every page for digital object file URIs and mounts an OpenSeadragon
 * IIIF viewer when a Compass S3 TIFF (served via Cantaloupe) or a Preservica
 * IIIF manifest is detected.
 *
 * No build step required — plain ES5-compatible vanilla JS.
 * OpenSeadragon is loaded from the same assets directory (/assets/openseadragon.min.js).
 *
 * Configuration (injected by layout_head.html.erb before this script):
 *
 *   window.DigitalViewer = {
 *     cantaloupeBaseUrl: 'http://localhost:8080/iiif/2',  // required for S3 TIFFs
 *     compassHost: 'compass.fivecolleges.edu',            // default
 *     preservicaApiBase: 'https://smith.preservica.com',  // optional, for Preservica
 *   };
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  var cfg = Object.assign({
    cantaloupeBaseUrl: '/iiif/2',
    compassHost: 'compass.fivecolleges.edu',
    preservicaApiBase: null,
  }, window.DigitalViewer || {});

  // Strip trailing slash from base URL
  cfg.cantaloupeBaseUrl = cfg.cantaloupeBaseUrl.replace(/\/$/, '');

  // Regex for a UUID in a URI (used to detect Preservica assets)
  var UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // File extensions we can deep-zoom via Cantaloupe
  var DEEP_ZOOM_RE = /\.(tiff?|jp2)(\?.*)?$/i;
  var STATIC_IMAGE_RE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
  var PDF_RE = /\.pdf(\?.*)?$/i;
  var SEQUENCE_PRELOAD_DISTANCE = 2;
  var THUMBNAIL_SIZE = 160;
  var IMAGE_ADJUSTMENT_STEP = 20;
  var DEFAULT_IMAGE_ADJUSTMENTS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0,
  };
  var warmedResourceUrls = {};
  var viewerControlInstanceCount = 0;
  var sourceGroupCount = 0;

  function sanitizeUrl(url) {
    var trimmed = typeof url === 'string' ? url.trim() : '';
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^\//.test(trimmed)) return trimmed;
    return '';
  }

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

  // ── Source detection ──────────────────────────────────────────────────────

  /**
   * Given a file_uri string, return a viewer descriptor or null.
   *
   * Returns one of:
   *   { type: 'cantaloupe', infoUrl: string }
   *   { type: 'preservica', uuid: string }
   *   null
   */
  function detectSource(fileUri) {
    if (!fileUri) return null;

    var normalizedUri = fileUri.replace(/^\/\//, 'https://');
    var isCompassHost = normalizedUri.indexOf(cfg.compassHost) !== -1;

    if (/^https?:\/\//i.test(normalizedUri) && PDF_RE.test(normalizedUri)) {
      return { type: 'static-pdf', url: normalizedUri };
    }

    // Compass S3 TIFF — strip host + /system/files/ to get the S3 path key
    if (normalizedUri.indexOf(cfg.compassHost + '/system/files/') !== -1) {
      var marker = '/system/files/';
      var pos = normalizedUri.indexOf(marker);
      if (pos !== -1) {
        var s3Key = normalizedUri.slice(pos + marker.length);
        if (DEEP_ZOOM_RE.test(s3Key)) {
          var infoUrl = cfg.cantaloupeBaseUrl + '/' + encodeURIComponent(s3Key) + '/info.json';
          return { type: 'cantaloupe', infoUrl: infoUrl };
        }
        if (STATIC_IMAGE_RE.test(s3Key)) {
          return { type: 'static-image', imageUrl: normalizedUri };
        }
      }
    }

    if (/^https?:\/\//i.test(normalizedUri) && STATIC_IMAGE_RE.test(normalizedUri)) {
      return { type: 'static-image', imageUrl: normalizedUri };
    }

    // Compass Islandora object URL — needs IIIF manifest lookup via redirect-follow
    if (normalizedUri.indexOf(cfg.compassHost) !== -1 &&
        (normalizedUri.indexOf('/islandora/object/') !== -1 || normalizedUri.indexOf('/object/') !== -1)) {
      var compassObjectUrl = normalizedUri;
      if (normalizedUri.indexOf('/islandora/object/') === -1) {
        compassObjectUrl = normalizedUri.replace('/object/', '/islandora/object/');
      }
      return {
        type: 'compass',
        compassUrl: compassObjectUrl,
      };
    }

    // Compass direct manifest URL — already resolved to a Drupal node
    if (normalizedUri.indexOf(cfg.compassHost) !== -1 &&
        normalizedUri.indexOf('/node/') !== -1 &&
        /\/manifest(?:-single)?(?:\?.*)?$/i.test(normalizedUri)) {
      return { type: 'compass-manifest', manifestUrl: normalizedUri.replace(/^http:\/\//i, 'https://') };
    }

    if (normalizedUri.indexOf(cfg.compassHost) !== -1 &&
        /\/node\/\d+(?:\?.*)?$/i.test(normalizedUri)) {
      return {
        type: 'compass-manifest',
        manifestUrl: normalizedUri.replace(/^http:\/\//i, 'https://').replace(/\/?(?:\?.*)?$/i, '') + '/manifest',
      };
    }

    if (/^https?:\/\/.+\/manifests\/.+\.json(?:\?.*)?$/i.test(normalizedUri)) {
      return { type: 'compass-manifest', manifestUrl: normalizedUri };
    }

    // Preservica — UUID anywhere in the URI
    var uuidMatch = normalizedUri.match(UUID_RE);
    if (uuidMatch) {
      return { type: 'preservica', uuid: uuidMatch[0] };
    }

    return null;
  }

  function descriptorPriority(descriptor) {
    if (!descriptor) return -1;

    switch (descriptor.type) {
      case 'compass-manifest':
        return 600;
      case 'static-pdf':
        return 500;
      case 'cantaloupe':
        return 400;
      case 'compass':
        return 350;
      case 'static-image':
        return 300;
      case 'preservica':
        return 50;
      default:
        return 0;
    }
  }

  function pickBestDescriptor(descriptors) {
    var best = null;
    var bestPriority = -1;

    descriptors.forEach(function (descriptor) {
      var priority = descriptorPriority(descriptor);
      if (priority > bestPriority) {
        best = descriptor;
        bestPriority = priority;
      }
    });

    return best;
  }

  function descriptorSelectionPriority(descriptor, hasNonPdfCandidate) {
    if (hasNonPdfCandidate && descriptor && descriptor.type === 'static-pdf') {
      return -1;
    }

    return descriptorPriority(descriptor);
  }

  function buildDescriptorSelection(candidates) {
    var rankedCandidates;
    var primaryCandidate;
    var companionCandidates = [];
    var hasNonPdfCandidate = candidates.some(function (candidate) {
      return candidate && candidate.descriptor && candidate.descriptor.type !== 'static-pdf';
    });

    rankedCandidates = candidates.slice().sort(function (left, right) {
      return descriptorSelectionPriority(right.descriptor, hasNonPdfCandidate) -
        descriptorSelectionPriority(left.descriptor, hasNonPdfCandidate);
    });

    primaryCandidate = rankedCandidates[0] || null;

    rankedCandidates.forEach(function (candidate) {
      if (!candidate || candidate === primaryCandidate || !candidate.descriptor) return;
      if (hasNonPdfCandidate && candidate.descriptor.type === 'static-pdf') {
        companionCandidates.push(candidate);
      }
    });

    return {
      primaryCandidate: primaryCandidate,
      rankedCandidates: rankedCandidates,
      companionCandidates: companionCandidates,
    };
  }

  // ── Viewer helpers ────────────────────────────────────────────────────────

  function makeButton(icon, title, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dv-ctrl-btn dv-ctrl-btn--' + icon;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.setAttribute('data-icon', icon);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function setButtonActive(button, active) {
    if (!button) return;
    if (button.classList && typeof button.classList.toggle === 'function') {
      button.classList.toggle('is-active', !!active);
    }
  }

  function setButtonPressed(button, pressed) {
    setButtonActive(button, pressed);
    if (button) {
      button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cloneDefaultImageAdjustments() {
    return {
      brightness: DEFAULT_IMAGE_ADJUSTMENTS.brightness,
      contrast: DEFAULT_IMAGE_ADJUSTMENTS.contrast,
      saturation: DEFAULT_IMAGE_ADJUSTMENTS.saturation,
      grayscale: DEFAULT_IMAGE_ADJUSTMENTS.grayscale,
      invert: DEFAULT_IMAGE_ADJUSTMENTS.invert,
    };
  }

  function getViewerImageAdjustments(viewer) {
    if (!viewer.__dvImageAdjustments) {
      viewer.__dvImageAdjustments = cloneDefaultImageAdjustments();
    }
    return viewer.__dvImageAdjustments;
  }

  function getViewerVisualTarget(viewer) {
    if (!viewer) return null;
    if (viewer.canvas) return viewer.canvas;
    if (viewer.element && typeof viewer.element.querySelector === 'function') {
      return viewer.element.querySelector('.openseadragon-canvas');
    }
    return null;
  }

  function buildViewerImageFilter(adjustments) {
    return 'brightness(' + adjustments.brightness + '%) ' +
      'contrast(' + adjustments.contrast + '%) ' +
      'saturate(' + adjustments.saturation + '%) ' +
      'grayscale(' + adjustments.grayscale + '%) ' +
      'invert(' + adjustments.invert + '%)';
  }

  function applyViewerImageAdjustments(viewer) {
    var target = getViewerVisualTarget(viewer);
    var adjustments = getViewerImageAdjustments(viewer);
    var filterValue = buildViewerImageFilter(adjustments);

    if (!target) return;

    target.style.filter = filterValue;
    target.style.webkitFilter = filterValue;
  }

  function adjustViewerImageSetting(viewer, key, delta) {
    var adjustments = getViewerImageAdjustments(viewer);
    adjustments[key] = clamp(adjustments[key] + delta, 0, 200);
    applyViewerImageAdjustments(viewer);
  }

  function setViewerImageSetting(viewer, key, value) {
    var adjustments = getViewerImageAdjustments(viewer);
    var numericValue = parseInt(value, 10);
    if (isNaN(numericValue)) {
      numericValue = 0;
    }
    adjustments[key] = clamp(numericValue, 0, 200);
    applyViewerImageAdjustments(viewer);
  }

  function toggleViewerImageSetting(viewer, key) {
    var adjustments = getViewerImageAdjustments(viewer);
    adjustments[key] = adjustments[key] === 0 ? 100 : 0;
    applyViewerImageAdjustments(viewer);
  }

  function resetViewerImageAdjustments(viewer) {
    viewer.__dvImageAdjustments = cloneDefaultImageAdjustments();
    applyViewerImageAdjustments(viewer);
  }

  function isViewerFlipped(viewer) {
    if (!viewer || !viewer.viewport) return false;
    if (typeof viewer.viewport.getFlip === 'function') {
      return !!viewer.viewport.getFlip();
    }
    return !!viewer.viewport.flipped;
  }

  function setViewerFlip(viewer, flipped) {
    if (!viewer || !viewer.viewport) return;
    if (typeof viewer.viewport.setFlip === 'function') {
      viewer.viewport.setFlip(flipped);
      return;
    }
    if (viewer.viewport.flipped !== flipped && typeof viewer.viewport.toggleFlip === 'function') {
      viewer.viewport.toggleFlip();
    }
  }

  function rotateViewer(viewer, direction) {
    var currentRotation;
    if (!viewer || !viewer.viewport || typeof viewer.viewport.getRotation !== 'function' || typeof viewer.viewport.setRotation !== 'function') {
      return;
    }

    currentRotation = viewer.viewport.getRotation();
    if (direction < 0) {
      currentRotation = isViewerFlipped(viewer) ? currentRotation + 90 : currentRotation - 90;
    } else {
      currentRotation = isViewerFlipped(viewer) ? currentRotation - 90 : currentRotation + 90;
    }

    viewer.viewport.setRotation(currentRotation);
  }

  function resetViewerTransforms(viewer) {
    if (!viewer || !viewer.viewport) return;

    if (typeof viewer.viewport.setRotation === 'function') {
      viewer.viewport.setRotation(0);
    }
    setViewerFlip(viewer, false);
    resetViewerImageAdjustments(viewer);
    if (typeof viewer.viewport.goHome === 'function') {
      viewer.viewport.goHome();
    }
    if (typeof viewer.forceRedraw === 'function') {
      viewer.forceRedraw();
    }
  }

  function getViewerZoomPercent(viewer) {
    var currentZoom = 1;
    var homeZoom = 1;

    if (viewer && viewer.viewport && typeof viewer.viewport.getZoom === 'function') {
      currentZoom = viewer.viewport.getZoom(true);
      if (!isFinite(currentZoom) || currentZoom <= 0) {
        currentZoom = 1;
      }
    }

    if (viewer && viewer.viewport && typeof viewer.viewport.getHomeZoom === 'function') {
      homeZoom = viewer.viewport.getHomeZoom();
      if (!isFinite(homeZoom) || homeZoom <= 0) {
        homeZoom = 1;
      }
    }

    return Math.round((currentZoom / homeZoom) * 100) + '%';
  }

  function isElementInside(parent, candidate) {
    var node = candidate;
    while (node) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  function setControlsCollapsed(state, collapsed) {
    if (!state || !state.root) return;

    state.isCollapsed = !!collapsed;

    if (state.isCollapsed && state.isPopoverOpen) {
      setAdjustPopoverOpen(state, false);
    }

    if (state.root.classList && typeof state.root.classList.toggle === 'function') {
      state.root.classList.toggle('is-collapsed', state.isCollapsed);
    }

    if (state.toggleButton) {
      state.toggleButton.setAttribute('aria-expanded', state.isCollapsed ? 'false' : 'true');
    }
  }

  function setAdjustPopoverOpen(state, open) {
    if (!state) return;
    if (open && state.isCollapsed) return;
    state.isPopoverOpen = !!open;

    if (state.root && state.root.classList && typeof state.root.classList.toggle === 'function') {
      state.root.classList.toggle('is-adjust-open', !!open);
    }

    if (state.popover) {
      state.popover.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (state.popover.classList && typeof state.popover.classList.toggle === 'function') {
        state.popover.classList.toggle('is-open', !!open);
      }
    }

    if (state.adjustButton) {
      state.adjustButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      setButtonActive(state.adjustButton, !!open);
    }
  }

  function syncAdjustPopover(viewer, state) {
    var adjustments;

    if (!state) return;

    adjustments = getViewerImageAdjustments(viewer);

    state.rangeControls.forEach(function (control) {
      var value = adjustments[control.key];
      control.input.value = String(value);
      control.value.textContent = value + '%';
    });

    state.toggleControls.forEach(function (control) {
      setButtonPressed(control.button, adjustments[control.key] !== 0);
    });
  }

  function syncToolbarState(viewer, state) {
    if (!state) return;

    if (state.zoomLabel) {
      state.zoomLabel.textContent = getViewerZoomPercent(viewer);
    }

    if (state.flipButton) {
      setButtonPressed(state.flipButton, isViewerFlipped(viewer));
    }

    if (state.fullscreenButton && viewer && typeof viewer.isFullPage === 'function') {
      setButtonPressed(state.fullscreenButton, !!viewer.isFullPage());
    }

    syncAdjustPopover(viewer, state);
  }

  function makeAdjustmentRangeControl(viewer, state, label, key) {
    var row = document.createElement('label');
    var labelText = document.createElement('span');
    var slider = document.createElement('input');
    var value = document.createElement('span');

    row.className = 'dv-adjust-control';
    labelText.className = 'dv-adjust-label';
    labelText.textContent = label;

    slider.className = 'dv-adjust-slider';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '200';
    slider.step = '5';
    slider.setAttribute('data-setting', key);

    value.className = 'dv-adjust-value';

    slider.addEventListener('input', function (event) {
      var nextValue = event && event.target ? event.target.value : slider.value;
      setViewerImageSetting(viewer, key, nextValue);
      syncToolbarState(viewer, state);
    });

    row.appendChild(labelText);
    row.appendChild(slider);
    row.appendChild(value);

    state.rangeControls.push({ key: key, input: slider, value: value });
    return row;
  }

  function makeAdjustmentToggle(viewer, state, title, key, label) {
    var btn = document.createElement('button');

    btn.type = 'button';
    btn.className = 'dv-adjust-toggle';
    btn.title = title;
    btn.textContent = label;
    btn.setAttribute('aria-label', title);
    btn.setAttribute('data-setting', key);
    btn.setAttribute('aria-pressed', 'false');

    btn.addEventListener('click', function () {
      toggleViewerImageSetting(viewer, key);
      syncToolbarState(viewer, state);
    });

    state.toggleControls.push({ key: key, button: btn });
    return btn;
  }

  function makePopoverActionButton(label, title, onClick) {
    var btn = document.createElement('button');

    btn.type = 'button';
    btn.className = 'dv-adjust-action';
    btn.title = title;
    btn.textContent = label;
    btn.setAttribute('aria-label', title);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildAdjustPopover(viewer, state) {
    var popover = document.createElement('div');
    var title = document.createElement('div');
    var actions = document.createElement('div');
    var body = document.createElement('div');
    var toggles = document.createElement('div');
    var footer = document.createElement('div');
    var resetBtn = document.createElement('button');

    popover.className = 'dv-adjust-popover';
    popover.setAttribute('aria-hidden', 'true');

    title.className = 'dv-adjust-title';
    title.textContent = 'Adjust image';

    actions.className = 'dv-adjust-actions';
    actions.appendChild(makePopoverActionButton('Rotate left', 'Rotate left 90 degrees', function () {
      rotateViewer(viewer, -1);
      syncToolbarState(viewer, state);
    }));
    actions.appendChild(makePopoverActionButton('Rotate right', 'Rotate right 90 degrees', function () {
      rotateViewer(viewer, 1);
      syncToolbarState(viewer, state);
    }));
    state.flipButton = makePopoverActionButton('Flip', 'Flip horizontally', function () {
      setViewerFlip(viewer, !isViewerFlipped(viewer));
      syncToolbarState(viewer, state);
    });
    actions.appendChild(state.flipButton);
    state.fullscreenButton = makePopoverActionButton('Fullscreen', 'Toggle fullscreen', function () {
      if (typeof viewer.isFullPage === 'function' && viewer.isFullPage()) {
        viewer.setFullPage(false);
      } else if (typeof viewer.setFullPage === 'function') {
        viewer.setFullPage(true);
      }
      syncToolbarState(viewer, state);
    });
    actions.appendChild(state.fullscreenButton);

    body.className = 'dv-adjust-body';
    body.appendChild(makeAdjustmentRangeControl(viewer, state, 'Brightness', 'brightness'));
    body.appendChild(makeAdjustmentRangeControl(viewer, state, 'Contrast', 'contrast'));
    body.appendChild(makeAdjustmentRangeControl(viewer, state, 'Saturation', 'saturation'));

    toggles.className = 'dv-adjust-toggles';
    toggles.appendChild(makeAdjustmentToggle(viewer, state, 'Toggle greyscale', 'grayscale', 'Greyscale'));
    toggles.appendChild(makeAdjustmentToggle(viewer, state, 'Toggle color invert', 'invert', 'Invert'));

    footer.className = 'dv-adjust-footer';
    resetBtn.type = 'button';
    resetBtn.className = 'dv-adjust-reset';
    resetBtn.textContent = 'Reset image';
    resetBtn.title = 'Revert image transforms and adjustments';
    resetBtn.setAttribute('aria-label', 'Revert image transforms and adjustments');
    resetBtn.addEventListener('click', function () {
      resetViewerTransforms(viewer);
      syncToolbarState(viewer, state);
    });
    footer.appendChild(resetBtn);

    popover.appendChild(title);
    popover.appendChild(actions);
    popover.appendChild(body);
    popover.appendChild(toggles);
    popover.appendChild(footer);
    return popover;
  }

  function buildPrimaryControls(viewer, state) {
    var bar = document.createElement('div');
    var actions = document.createElement('div');
    var status = document.createElement('div');
    var zoomLabel = document.createElement('span');
    var dismissButton;
    var instanceId = viewerControlInstanceCount;

    function invoke(action) {
      return function () {
        action();
        syncToolbarState(viewer, state);
      };
    }

    bar.className = 'dv-controls-bar';
    actions.className = 'dv-controls-actions';
    status.className = 'dv-controls-status';
    zoomLabel.className = 'dv-zoom-label';

    actions.appendChild(makeButton('zoom-out', 'Zoom out', invoke(function () {
      if (viewer.viewport && typeof viewer.viewport.zoomBy === 'function') {
        viewer.viewport.zoomBy(0.67);
      }
    })));

    actions.appendChild(makeButton('zoom-in', 'Zoom in', invoke(function () {
      if (viewer.viewport && typeof viewer.viewport.zoomBy === 'function') {
        viewer.viewport.zoomBy(1.5);
      }
    })));

    actions.appendChild(makeButton('home', 'Reset zoom to fit', invoke(function () {
      if (viewer.viewport && typeof viewer.viewport.goHome === 'function') {
        viewer.viewport.goHome();
      }
    })));

    state.adjustButton = makeButton('adjust', 'Adjust image', function () {
      setAdjustPopoverOpen(state, !state.isPopoverOpen);
      syncToolbarState(viewer, state);
    });
    state.adjustButton.setAttribute('aria-haspopup', 'dialog');
    state.adjustButton.setAttribute('aria-expanded', 'false');
    state.adjustButton.setAttribute('aria-controls', 'dv-adjust-popover-' + instanceId);
    actions.appendChild(state.adjustButton);

    status.appendChild(zoomLabel);
    dismissButton = makeButton('collapse', 'Hide toolbar', function () {
      setControlsCollapsed(state, true);
      syncToolbarState(viewer, state);
    });
    dismissButton.className += ' dv-controls-dismiss';
    status.appendChild(dismissButton);
    state.zoomLabel = zoomLabel;

    bar.appendChild(actions);
    bar.appendChild(status);
    return bar;
  }

  function buildControlsToggle(viewer, state) {
    var toggle = document.createElement('button');

    toggle.type = 'button';
    toggle.className = 'dv-controls-toggle';
    toggle.textContent = 'Tools';
    toggle.title = 'Show toolbar';
    toggle.setAttribute('aria-label', 'Show toolbar');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.addEventListener('click', function () {
      setControlsCollapsed(state, false);
      syncToolbarState(viewer, state);
    });

    return toggle;
  }

  function addControls(container, viewer) {
    var bar = document.createElement('div');
    var state = {
      root: bar,
      rangeControls: [],
      toggleControls: [],
      isPopoverOpen: false,
      isCollapsed: false,
    };

    bar.className = 'dv-controls';
    applyViewerImageAdjustments(viewer);

    viewerControlInstanceCount += 1;
    bar.appendChild(buildPrimaryControls(viewer, state));
    state.popover = buildAdjustPopover(viewer, state);
    state.popover.id = 'dv-adjust-popover-' + (viewerControlInstanceCount - 1);
    bar.appendChild(state.popover);
    state.toggleButton = buildControlsToggle(viewer, state);
    bar.appendChild(state.toggleButton);

    if (document && typeof document.addEventListener === 'function') {
      document.addEventListener('click', function (event) {
        if (!state.isPopoverOpen) return;
        if (!event || !event.target) return;
        if (!isElementInside(bar, event.target)) {
          setAdjustPopoverOpen(state, false);
        }
      });

      document.addEventListener('keydown', function (event) {
        if (!state.isPopoverOpen || !event) return;
        if (event.key === 'Escape' || event.keyCode === 27) {
          setAdjustPopoverOpen(state, false);
          syncToolbarState(viewer, state);
        }
      });
    }

    if (viewer && typeof viewer.addHandler === 'function') {
      viewer.addHandler('animation', function () {
        syncToolbarState(viewer, state);
      });
      viewer.addHandler('open', function () {
        applyViewerImageAdjustments(viewer);
        syncToolbarState(viewer, state);
      });
      viewer.addHandler('full-page', function () {
        syncToolbarState(viewer, state);
      });
    }

    setControlsCollapsed(state, false);
    syncToolbarState(viewer, state);
    container.appendChild(bar);
  }

  function addPageNav(container, viewer, total) {
    var nav = document.createElement('div');
    nav.className = 'dv-page-nav';

    function pageBtn(label) {
      var btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'dv-page-btn';
      return btn;
    }

    var prevBtn = pageBtn('‹ Prev');
    prevBtn.disabled = true;

    var counter = document.createElement('span');
    counter.className = 'dv-page-counter';
    counter.textContent = '1 / ' + total;

    var nextBtn = pageBtn('Next ›');

    prevBtn.addEventListener('click', function () { viewer.goToPreviousPage(); });
    nextBtn.addEventListener('click', function () { viewer.goToNextPage(); });

    nav.appendChild(prevBtn);
    nav.appendChild(counter);
    nav.appendChild(nextBtn);
    container.appendChild(nav);

    viewer.addHandler('page', function (data) {
      counter.textContent = (data.page + 1) + ' / ' + total;
      prevBtn.disabled = data.page === 0;
      nextBtn.disabled = data.page === total - 1;
    });
  }

  function getPreloadPageIndexes(activeIndex, total, distance) {
    var indexes = [];
    var radius = typeof distance === 'number' ? distance : SEQUENCE_PRELOAD_DISTANCE;
    var offset;

    if (total <= 0) return indexes;

    indexes.push(activeIndex);

    for (offset = 1; offset <= radius; offset += 1) {
      if (activeIndex - offset >= 0) {
        indexes.push(activeIndex - offset);
      }
      if (activeIndex + offset < total) {
        indexes.push(activeIndex + offset);
      }
    }

    return indexes;
  }

  function getTileSourceValue(tileSource) {
    if (!tileSource) return tileSource;
    if (tileSource.tileSource) return tileSource.tileSource;
    return tileSource;
  }

  function buildThumbnailUrl(tileSource) {
    var infoUrl;

    if (!tileSource) return '';

    if (tileSource.thumbnailUrl) {
      return tileSource.thumbnailUrl;
    }

    if (tileSource.tileSource) {
      return buildThumbnailUrl(tileSource.tileSource);
    }

    if (typeof tileSource === 'string') {
      infoUrl = tileSource;
    } else if (tileSource.url) {
      return tileSource.url;
    } else if (tileSource['@id']) {
      infoUrl = tileSource['@id'];
    } else if (tileSource.id) {
      infoUrl = tileSource.id;
    }

    if (!infoUrl) return '';
    if (/\/info\.json(?:\?.*)?$/i.test(infoUrl)) {
      return infoUrl.replace(/\/info\.json(?:\?.*)?$/i, '/full/!' + THUMBNAIL_SIZE + ',' + THUMBNAIL_SIZE + '/0/default.jpg');
    }

    return infoUrl;
  }

  function getTileSourceImageUrl(tileSource) {
    var infoUrl;

    if (!tileSource) return '';

    if (tileSource.imageUrl) {
      return sanitizeUrl(tileSource.imageUrl);
    }

    if (tileSource.tileSource) {
      return getTileSourceImageUrl(tileSource.tileSource);
    }

    if (typeof tileSource === 'string') {
      infoUrl = tileSource;
    } else if (tileSource.url) {
      return sanitizeUrl(tileSource.url);
    } else if (tileSource['@id']) {
      infoUrl = tileSource['@id'];
    } else if (tileSource.id) {
      infoUrl = tileSource.id;
    }

    if (!infoUrl) return '';
    if (/\/info\.json(?:\?.*)?$/i.test(infoUrl)) {
      return sanitizeUrl(infoUrl.replace(/\/info\.json(?:\?.*)?$/i, '/full/full/0/default.jpg'));
    }

    return sanitizeUrl(infoUrl);
  }

  function getCompanionPdfUrl(selection) {
    var companions = selection && Array.isArray(selection.companionCandidates)
      ? selection.companionCandidates
      : [];
    var pdfUrl = '';

    companions.some(function (candidate) {
      var descriptor = candidate && candidate.descriptor;
      if (!descriptor || descriptor.type !== 'static-pdf' || !descriptor.url) return false;
      pdfUrl = sanitizeUrl(descriptor.url);
      if (!pdfUrl) return false;
      return true;
    });

    return pdfUrl;
  }

  function getContainerViewerOptions(container) {
    return {
      objectDownloadPdfUrl: getCompanionPdfUrl(container && container.__dvDescriptorSelection),
    };
  }

  function setElementHidden(element, hidden) {
    if (!element) return;

    element.setAttribute('aria-hidden', hidden ? 'true' : 'false');

    if (element.classList && typeof element.classList.toggle === 'function') {
      element.classList.toggle('is-hidden', !!hidden);
    }
  }

  function getViewerModeLabel(state) {
    var currentPage = state.tileSources[state.activePageIndex] || null;
    var pageLabel = currentPage && currentPage.pageLabel;

    if (state.isSequence && state.mode === 'object') {
      return 'Object view';
    }

    if (pageLabel) {
      return pageLabel;
    }

    if (state.isSequence) {
      return 'Page ' + (state.activePageIndex + 1);
    }

    return 'Image view';
  }

  function syncViewerModeActions(state) {
    var currentPage = state.tileSources[state.activePageIndex] || null;
    var currentPageImageUrl = currentPage ? getTileSourceImageUrl(currentPage) : '';
    var isPageMode = state.mode === 'page';

    state.pageDownloadImageUrl = currentPageImageUrl;
    state.root.setAttribute('data-view-mode', state.mode);
    state.modeLabel.textContent = getViewerModeLabel(state);

    if (state.openPageButton) {
      state.openPageButton.textContent = 'Open page ' + (state.activePageIndex + 1);
      setElementHidden(state.openPageButton, !state.isSequence || isPageMode);
    }

    if (state.backToObjectButton) {
      setElementHidden(state.backToObjectButton, !state.isSequence || !isPageMode);
    }

    if (state.downloadPdfLink) {
      if (state.objectDownloadPdfUrl) {
        state.downloadPdfLink.setAttribute('href', state.objectDownloadPdfUrl);
      } else {
        state.downloadPdfLink.removeAttribute('href');
      }
      setElementHidden(state.downloadPdfLink, !state.objectDownloadPdfUrl || isPageMode);
    }

    if (state.downloadImageLink) {
      if (currentPageImageUrl) {
        state.downloadImageLink.setAttribute('href', currentPageImageUrl);
      } else {
        state.downloadImageLink.removeAttribute('href');
      }
      setElementHidden(
        state.downloadImageLink,
        !currentPageImageUrl || (state.isSequence && !isPageMode)
      );
    }
  }

  function addViewerModeActions(container, viewer, tileSources, options) {
    var pages = Array.isArray(tileSources) ? tileSources.slice() : [tileSources];
    var isSequence = pages.length > 1;
    var objectDownloadPdfUrl = options && options.objectDownloadPdfUrl || '';
    var root = document.createElement('div');
    var status = document.createElement('div');
    var modeLabel = document.createElement('span');
    var actions = document.createElement('div');
    var openPageButton = document.createElement('button');
    var backToObjectButton = document.createElement('button');
    var downloadPdfLink = document.createElement('a');
    var downloadImageLink = document.createElement('a');
    var state;

    if (!isSequence && !objectDownloadPdfUrl && !getTileSourceImageUrl(pages[0])) {
      return null;
    }

    root.className = 'dv-mode-actions';

    status.className = 'dv-mode-status';
    modeLabel.className = 'dv-mode-label';
    status.appendChild(modeLabel);

    actions.className = 'dv-mode-buttons';

    openPageButton.type = 'button';
    openPageButton.className = 'dv-mode-btn';
    openPageButton.setAttribute('data-action', 'open-page');
    openPageButton.addEventListener('click', function () {
      state.mode = 'page';
      syncViewerModeActions(state);
    });

    backToObjectButton.type = 'button';
    backToObjectButton.className = 'dv-mode-btn';
    backToObjectButton.textContent = 'Back to object';
    backToObjectButton.setAttribute('data-action', 'back-to-object');
    backToObjectButton.addEventListener('click', function () {
      state.mode = 'object';
      syncViewerModeActions(state);
    });

    downloadPdfLink.className = 'dv-mode-link';
    downloadPdfLink.textContent = 'Download PDF';
    downloadPdfLink.target = '_blank';
    downloadPdfLink.rel = 'noopener';
    downloadPdfLink.setAttribute('data-action', 'download-pdf');

    downloadImageLink.className = 'dv-mode-link';
    downloadImageLink.textContent = 'Download image';
    downloadImageLink.target = '_blank';
    downloadImageLink.rel = 'noopener';
    downloadImageLink.setAttribute('data-action', 'download-image');

    actions.appendChild(openPageButton);
    actions.appendChild(backToObjectButton);
    actions.appendChild(downloadPdfLink);
    actions.appendChild(downloadImageLink);

    root.appendChild(status);
    root.appendChild(actions);

    state = {
      root: root,
      tileSources: pages,
      isSequence: isSequence,
      mode: isSequence ? 'object' : 'page',
      activePageIndex: 0,
      objectDownloadPdfUrl: sanitizeUrl(objectDownloadPdfUrl),
      pageDownloadImageUrl: '',
      modeLabel: modeLabel,
      openPageButton: openPageButton,
      backToObjectButton: backToObjectButton,
      downloadPdfLink: downloadPdfLink,
      downloadImageLink: downloadImageLink,
    };

    if (viewer && typeof viewer.addHandler === 'function') {
      viewer.addHandler('page', function (data) {
        if (!data || typeof data.page !== 'number') return;
        state.activePageIndex = data.page;
        syncViewerModeActions(state);
      });
    }

    syncViewerModeActions(state);
    container.appendChild(root);
    return state;
  }

  function primeResourceUrl(url, useFetch) {
    if (!url || warmedResourceUrls[url]) return;
    warmedResourceUrls[url] = true;

    if (useFetch && typeof fetch === 'function') {
      fetch(url, { cache: 'force-cache' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .catch(function () {
          delete warmedResourceUrls[url];
        });
      return;
    }

    if (typeof Image !== 'undefined') {
      var image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      image.src = url;
    }
  }

  function warmSequenceCache(tileSources, activeIndex) {
    getPreloadPageIndexes(activeIndex, tileSources.length, SEQUENCE_PRELOAD_DISTANCE)
      .forEach(function (index) {
        var tileSource = tileSources[index];
        var osdTileSource = getTileSourceValue(tileSource);

        if (typeof osdTileSource === 'string' && /\/info\.json(?:\?.*)?$/i.test(osdTileSource)) {
          primeResourceUrl(osdTileSource, true);
        }
      });
  }

  function addThumbnailCarousel(container, viewer, tileSources) {
    var carousel = document.createElement('div');
    var prevBtn = document.createElement('button');
    var nextBtn = document.createElement('button');
    var viewport = document.createElement('div');
    var track = document.createElement('div');
    var buttons = [];
    var thumbnailQueue = [];
    var thumbnailLoading = false;
    var disposed = false;
    var thumbnailObserver;

    function loadNextThumbnail() {
      if (disposed || thumbnailLoading || thumbnailQueue.length === 0) return;
      var image = thumbnailQueue.shift();
      var completed = false;
      thumbnailLoading = true;
      function finish() {
        if (completed) return;
        completed = true;
        thumbnailLoading = false;
        loadNextThumbnail();
      }
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
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
        viewer.goToPage(index);
        warmSequenceCache(tileSources, index);
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
      updateActive(data.page);
    });
    viewer.addHandler('before-destroy', function () {
      disposed = true;
      thumbnailQueue = [];
      if (thumbnailObserver) thumbnailObserver.disconnect();
    });
  }

  /**
   * Mount an OpenSeadragon viewer into `container`.
   * tileSources can be a string/object (single image) or an array (multi-page sequence).
   */
  function mountOsdViewer(container, tileSources, options) {
    container.innerHTML = '';
    container.classList.add('dv-active');

    var osdEl = document.createElement('div');
    osdEl.className = 'dv-osd';
    container.appendChild(osdEl);

    var isSequence = Array.isArray(tileSources) && tileSources.length > 1;
    var osdTileSources = isSequence
      ? tileSources.map(getTileSourceValue)
      : getTileSourceValue(tileSources);

    /* global OpenSeadragon */
    var viewer = OpenSeadragon({
      element: osdEl,
      tileSources: osdTileSources,
      sequenceMode: isSequence,
      initialPage: 0,
      showNavigationControl: false,
      showSequenceControl: false,   // we use our own prev/next buttons
      prefixUrl: '',                // suppress OSD's built-in image loading
      defaultZoomLevel: 0,
      minZoomLevel: 0.05,
      animationTime: 0.3,
      gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
      crossOriginPolicy: 'Anonymous',
    });

    addControls(container, viewer);
    addViewerModeActions(container, viewer, tileSources, options || {});
    if (isSequence) {
      addPageNav(container, viewer, tileSources.length);
      addThumbnailCarousel(container, viewer, tileSources);
      warmSequenceCache(tileSources, 0);
      viewer.addHandler('page', function (data) {
        warmSequenceCache(tileSources, data.page);
      });
    } else if (buildThumbnailUrl(tileSources)) {
      primeResourceUrl(buildThumbnailUrl(tileSources), false);
    }
    return viewer;
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

  function toLocalCantaloupeInfoUrl(serviceId) {
    if (!serviceId) return '';

    var normalized = serviceId.replace(/\/$/, '');
    var marker = '/iiif/2/';
    var pos = normalized.indexOf(marker);

    if (pos === -1) {
      return normalized + '/info.json';
    }

    var identifier = normalized.slice(pos + marker.length);
    var decoded = '';

    try {
      decoded = decodeURIComponent(identifier);
    } catch (err) {
      decoded = identifier;
    }

    var fileMarker = '/system/files/';
    var filePos = decoded.indexOf(fileMarker);
    if (filePos === -1) {
      return normalized + '/info.json';
    }

    var s3Key = decoded.slice(filePos + fileMarker.length);
    try {
      s3Key = decodeURIComponent(s3Key);
    } catch (err2) {
      // Keep the partially decoded key when nested encoding is malformed.
    }
    return cfg.cantaloupeBaseUrl + '/' + encodeURIComponent(s3Key) + '/info.json';
  }

  // ── Cantaloupe mount ──────────────────────────────────────────────────────

  function mountCantaloupe(container, descriptor) {
    // Verify info.json is reachable before mounting (gives a better error message)
    return fetch(descriptor.infoUrl, { method: 'HEAD' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        mountOsdViewer(container, descriptor.infoUrl, getContainerViewerOptions(container));
      })
      .catch(function (err) {
        console.warn('[digital_viewer] Cantaloupe probe failed:', err);
        showError(container, 'Image not available (' + err.message + ')');
        throw err;
      });
  }

  function mountStaticImage(container, descriptor) {
    var safeImageUrl = sanitizeUrl(descriptor.imageUrl);

    if (!safeImageUrl) {
      showError(container, 'Image not available (unsupported URL)');
      return;
    }

    container.classList.add('dv-active');
    container.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'dv-static-image';

    var image = document.createElement('img');
    image.src = safeImageUrl;
    image.alt = 'Digital object image';
    image.style.display = 'block';
    image.style.width = '100%';
    image.style.height = 'auto';

    wrap.appendChild(image);
    container.appendChild(wrap);
    addViewerModeActions(container, null, [{ imageUrl: safeImageUrl, pageLabel: 'Image view' }], getContainerViewerOptions(container));
  }

  // ── Preservica mount ──────────────────────────────────────────────────────

  /**
   * Parse a IIIF Presentation 3 manifest generated by the backend and group
   * canvas bodies by content type so each can be routed to the right renderer.
   *
   * Returns:
   *   {
   *     images: [{ url, format }],          // body.type === 'Image'
   *     videos: [{ url, format, width, height, duration }],  // body.type === 'Video'
   *     audio:  [{ url, format, duration }], // body.type === 'Sound'
   *     pdfs:   [{ url }],                  // format === 'application/pdf'
   *   }
   */
  function extractManifestContent(manifest) {
    var result = { images: [], videos: [], audio: [], pdfs: [] };

    var canvases = (manifest.items && Array.isArray(manifest.items)) ? manifest.items : [];

    canvases.forEach(function (canvas) {
      try {
        var annotPage = canvas.items && canvas.items[0];
        var annot = annotPage && annotPage.items && annotPage.items[0];
        var body = annot && annot.body;
        if (!body) return;

        var url = body.id || body['@id'] || '';
        var format = (body.format || '').toLowerCase();
        var type = (body.type || body['@type'] || '').toLowerCase();

        if (!url) return;

        if (type === 'video' || format.indexOf('video/') === 0) {
          result.videos.push({
            url: url,
            format: body.format || 'video/mp4',
            width: canvas.width || null,
            height: canvas.height || null,
            duration: canvas.duration || null,
          });
        } else if (type === 'sound' || format.indexOf('audio/') === 0) {
          result.audio.push({
            url: url,
            format: body.format || 'audio/mpeg',
            duration: canvas.duration || null,
          });
        } else if (format === 'application/pdf') {
          result.pdfs.push({ url: url });
        } else {
          // Image (or unknown — display as image)
          result.images.push({ url: url, format: body.format || 'image/jpeg' });
        }
      } catch (e) {
        console.warn('[digital_viewer] Could not parse canvas:', canvas, e);
      }
    });

    return result;
  }

  /**
   * Fetch a Preservica IIIF manifest from the backend proxy and render the
   * content using the appropriate viewer (OSD for images, <video> for video,
   * <audio> for audio, <iframe> for PDFs).
   *
   * Manifest endpoint: /api/iiif/{uuid}/manifest.json
   * Content endpoint:  /api/content/{bitstreamId}  (handles Range headers for seeking)
   *
   * The backend handles Preservica authentication — the browser never calls
   * smith.preservica.com directly.
   */
  function mountPreservica(container, descriptor) {
    if (!cfg.preservicaApiBase) {
      showError(container, 'Preservica viewer not configured (preservicaApiBase missing).');
      return Promise.reject(new Error('Preservica viewer not configured (preservicaApiBase missing).'));
    }

    var manifestUrl = cfg.preservicaApiBase.replace(/\/$/, '') + '/api/iiif/' + descriptor.uuid + '/manifest.json';

    return fetch(manifestUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (manifest) {
        var content = extractManifestContent(manifest);
        var total = content.images.length + content.videos.length + content.audio.length + content.pdfs.length;

        if (total === 0) {
          throw new Error('No renderable content found in manifest');
        }

        // Render each content type. Most Preservica objects have a single type,
        // but the spec allows mixed manifests.
        if (content.videos.length > 0) {
          mountVideoViewer(container, content.videos);
        }
        if (content.audio.length > 0) {
          mountAudioViewer(container, content.audio);
        }
        if (content.images.length > 0) {
          // Preservica images don't have a IIIF Image API behind them, so we
          // use OSD's simple image mode (static rendering, no deep zoom).
          var osdSources = content.images.map(function (img) {
            return { type: 'image', url: img.url };
          });
          mountOsdViewer(container, osdSources.length === 1 ? osdSources[0] : osdSources, getContainerViewerOptions(container));
        }
        if (content.pdfs.length > 0) {
          mountPdfViewer(container, content.pdfs[0]);
        }
      })
      .catch(function (err) {
        console.warn('[digital_viewer] Preservica manifest fetch failed:', err);
        showError(container, 'Preservica content not available (' + err.message + ')');
        throw err;
      });
  }

  // ── Preservica: Video renderer ────────────────────────────────────────────

  /**
   * Render one or more video bitstreams in a native HTML5 <video> element.
   * The backend streams content via /api/content/{id} with Range header support,
   * so timeline seeking works out of the box.
   */
  function mountVideoViewer(container, sources) {
    var validSources = [];

    container.classList.add('dv-active');

    var wrap = document.createElement('div');
    wrap.className = 'dv-video';

    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';

    sources.forEach(function (src) {
      var safeUrl = sanitizeUrl(src && src.url);
      var source = document.createElement('source');
      if (!safeUrl) return;
      source.src = safeUrl;
      if (src.format) source.type = src.format;
      video.appendChild(source);
      validSources.push(src);
    });

    if (validSources.length === 0) {
      showError(container, 'Video not available (unsupported URL)');
      return;
    }

    // Fallback text for browsers without <video> support (extremely rare)
    var fallback = document.createElement('p');
    var fallbackLink = createFallbackLink(validSources[0].url, 'Download the video');
    fallback.className = 'dv-fallback';
    fallback.appendChild(document.createTextNode('Your browser does not support video playback. '));
    if (fallbackLink) {
      fallback.appendChild(fallbackLink);
      fallback.appendChild(document.createTextNode('.'));
    }
    video.appendChild(fallback);

    wrap.appendChild(video);
    container.appendChild(wrap);
  }

  // ── Preservica: Audio renderer ────────────────────────────────────────────

  /**
   * Render one or more audio bitstreams in a native HTML5 <audio> element.
   */
  function mountAudioViewer(container, sources) {
    var validSources = [];

    container.classList.add('dv-active');

    var wrap = document.createElement('div');
    wrap.className = 'dv-audio';

    var audio = document.createElement('audio');
    audio.controls = true;
    audio.preload = 'metadata';

    sources.forEach(function (src) {
      var safeUrl = sanitizeUrl(src && src.url);
      var source = document.createElement('source');
      if (!safeUrl) return;
      source.src = safeUrl;
      if (src.format) source.type = src.format;
      audio.appendChild(source);
      validSources.push(src);
    });

    if (validSources.length === 0) {
      showError(container, 'Audio not available (unsupported URL)');
      return;
    }

    var fallback = document.createElement('p');
    var fallbackLink = createFallbackLink(validSources[0].url, 'Download the audio');
    fallback.className = 'dv-fallback';
    fallback.appendChild(document.createTextNode('Your browser does not support audio playback. '));
    if (fallbackLink) {
      fallback.appendChild(fallbackLink);
      fallback.appendChild(document.createTextNode('.'));
    }
    audio.appendChild(fallback);

    wrap.appendChild(audio);
    container.appendChild(wrap);
  }

  // ── Preservica: PDF renderer ──────────────────────────────────────────────

  /**
   * Render a PDF bitstream using the browser's built-in PDF viewer via <iframe>.
   * A download link is included as fallback for browsers that don't embed PDFs.
   */
  function mountPdfViewer(container, source) {
    var safeUrl = sanitizeUrl(source && source.url);
    var fallbackLink;

    if (!safeUrl) {
      showError(container, 'PDF not available (unsupported URL)');
      return;
    }

    container.classList.add('dv-active');

    var wrap = document.createElement('div');
    wrap.className = 'dv-pdf';

    var iframe = document.createElement('iframe');
    iframe.src = safeUrl;
    iframe.title = 'PDF viewer';
    // Allow the browser PDF plugin to activate inside the iframe
    iframe.setAttribute('allow', 'fullscreen');

    var fallback = document.createElement('p');
    fallback.className = 'dv-fallback';
    fallbackLink = createFallbackLink(safeUrl, 'Open PDF');
    if (fallbackLink) fallback.appendChild(fallbackLink);

    wrap.appendChild(iframe);
    wrap.appendChild(fallback);
    container.appendChild(wrap);
  }

  function getManifestNodeId(node) {
    if (!node) return '';
    return node['@id'] || node.id || '';
  }

  function getCanvasMetadataValue(canvas, label) {
    var metadata = canvas && Array.isArray(canvas.metadata) ? canvas.metadata : [];
    var match = null;

    metadata.some(function (entry) {
      if (!entry || entry.label !== label) return false;
      match = entry.value;
      return true;
    });

    return match || '';
  }

  function extractCompassTileSources(manifest) {
    var tileSources = [];
    var seq = manifest.sequences && manifest.sequences[0];
    var canvases = seq && Array.isArray(seq.canvases) ? seq.canvases : [];

    canvases.forEach(function (canvas, index) {
      var img = canvas.images && canvas.images[0];
      var thumbnail = canvas.thumbnail && (Array.isArray(canvas.thumbnail) ? canvas.thumbnail[0] : canvas.thumbnail);
      var thumbnailUrl = thumbnail && (thumbnail['@id'] || thumbnail.id || '');
      var resource = img && img.resource;
      var seeAlso = canvas && canvas.seeAlso;
      var imageUrl = getManifestNodeId(resource);
      if (!img) return;
      var svc = resource && resource.service;
      if (svc) {
        var serviceId = (svc['@id'] || svc.id || '').replace(/\/$/, '');
        if (serviceId) {
          tileSources.push({
            tileSource: toLocalCantaloupeInfoUrl(serviceId),
            thumbnailUrl: thumbnailUrl || '',
            pageIndex: index,
            pageLabel: canvas.label || '',
            canvasId: getManifestNodeId(canvas),
            pageIdentifier: getCanvasMetadataValue(canvas, 'Identifier'),
            imageUrl: imageUrl || (serviceId + '/full/full/0/default.jpg'),
            ocrUrl: getManifestNodeId(seeAlso),
            ocrFormat: seeAlso && seeAlso.format || '',
          });
        }
      }
    });

    return tileSources;
  }

  // ── Compass IIIF mount ────────────────────────────────────────────────────

  /**
   * Resolve a Compass Islandora object URL to a IIIF manifest by following
   * the redirect to the Drupal node page, then render all canvases with OSD.
   */
  function mountCompass(container, descriptor) {
    var compassBase = cfg.compassBaseUrl || ('https://' + cfg.compassHost);

    // Use a server-side proxy when configured (required in browsers due to CORS
    // on the Islandora → Drupal redirect).  The proxy follows the redirect and
    // returns the full IIIF manifest JSON in a single response.
    var fetchManifest;
    if (cfg.compassProxyUrl) {
      fetchManifest = fetch(
        cfg.compassProxyUrl + '?url=' + encodeURIComponent(descriptor.compassUrl)
      ).then(function (res) {
        if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
        return res.json();
      });
    } else {
      // Fallback: direct fetch (only works if Islandora endpoint allows CORS)
      fetchManifest = fetch(descriptor.compassUrl, { redirect: 'follow' })
        .then(function (res) {
          var nodeMatch = res.url.match(/\/node\/(\d+)/);
          if (!nodeMatch) throw new Error('Could not resolve Compass node from: ' + res.url);
          return fetch(compassBase + '/node/' + nodeMatch[1] + '/manifest');
        })
        .then(function (res) {
          if (!res.ok) throw new Error('Manifest HTTP ' + res.status);
          return res.json();
        });
    }

    return fetchManifest
      .then(function (manifest) {
        var tileSources = extractCompassTileSources(manifest);
        if (tileSources.length === 0) throw new Error('No image services in manifest');
        mountOsdViewer(container, tileSources, getContainerViewerOptions(container));
      })
      .catch(function (err) {
        console.warn('[digital_viewer] Compass viewer error:', err);
        showError(container, 'Compass image not available (' + err.message + ')');
        throw err;
      });
  }

  function mountCompassManifest(container, descriptor) {
    var fetchManifest;
    var isCompassManifest = new URL(descriptor.manifestUrl).hostname === cfg.compassHost;

    // The Compass resolver only accepts Compass URLs; hosted manifests load directly.
    if (cfg.compassProxyUrl && isCompassManifest) {
      fetchManifest = fetch(
        cfg.compassProxyUrl + '?url=' + encodeURIComponent(descriptor.manifestUrl)
      ).then(function (res) {
        if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
        return res.json();
      });
    } else {
      fetchManifest = fetch(descriptor.manifestUrl)
        .then(function (res) {
          if (!res.ok) throw new Error('Manifest HTTP ' + res.status);
          return res.json();
        });
    }

    return fetchManifest
      .then(function (manifest) {
        var tileSources = extractCompassTileSources(manifest);
        if (tileSources.length === 0) throw new Error('No image services in manifest');
        mountOsdViewer(container, tileSources, getContainerViewerOptions(container));
      })
      .catch(function (err) {
        console.warn('[digital_viewer] Compass manifest viewer error:', err);
        showError(container, 'Compass image not available (' + err.message + ')');
        throw err;
      });
  }

  function resetContainer(container) {
    container.className = 'digital-viewer-container';
    container.innerHTML = '';
  }

  function mountDescriptor(container, descriptor) {
    resetContainer(container);

    if (descriptor.type === 'cantaloupe') {
      return mountCantaloupe(container, descriptor);
    }
    if (descriptor.type === 'static-image') {
      mountStaticImage(container, descriptor);
      return Promise.resolve();
    }
    if (descriptor.type === 'static-pdf') {
      mountPdfViewer(container, { url: descriptor.url });
      return Promise.resolve();
    }
    if (descriptor.type === 'compass') {
      return mountCompass(container, descriptor);
    }
    if (descriptor.type === 'compass-manifest') {
      return mountCompassManifest(container, descriptor);
    }
    if (descriptor.type === 'preservica') {
      return mountPreservica(container, descriptor);
    }

    return Promise.reject(new Error('Unsupported descriptor type: ' + descriptor.type));
  }

  // ── Page scan ─────────────────────────────────────────────────────────────

  /**
   * Find file_uri values in the page.
   *
   * ASpace PUI renders digital object file versions in multiple ways:
   *   1. .available-digital-objects a.external-digital-object__link[href]
   *      (standard digital object record page)
   *   2. <dt>File URI</dt><dd><a href="..."> (some themes / archival object pages)
   *   3. data-file-uri attribute (theme / future template overrides)
   */
  function collectSourceAnchors(root) {
    var selectors = [
      '[data-additional-file-version] a[href]',
      '.available-digital-objects a.external-digital-object__link[href]',
      '.available-digital-objects a.thumbnail[href]',
      '[data-rep-file-version-wrapper] > a[href]',
      '[data-file-uri]'
    ];
    var results = [];
    var seen = [];

    if (!root || typeof root.querySelectorAll !== 'function') return results;

    selectors.forEach(function (selector) {
      var elements = root.querySelectorAll(selector);
      for (var i = 0; i < elements.length; i += 1) {
        if (seen.indexOf(elements[i]) === -1) {
          seen.push(elements[i]);
          results.push(elements[i]);
        }
      }
    });

    return results;
  }

  function collectFileUris() {
    var results = [];
    var anchors = collectSourceAnchors(document);

    anchors.forEach(function (anchor) {
      var uri = anchor.dataset && anchor.dataset.fileUri
        ? anchor.dataset.fileUri
        : anchor.href;
      if (uri) results.push({ uri: uri, anchor: anchor });
    });

    // ASpace archival object page / some themes: <dt>File URI</dt><dd><a href="...">
    var dts = document.querySelectorAll('dt');
    for (var j = 0; j < dts.length; j += 1) {
      if (/file\s+uri/i.test(dts[j].textContent)) {
        var dd = dts[j].nextElementSibling;
        if (dd) {
          var a = dd.querySelector('a');
          var uri = a ? a.href : dd.textContent.trim();
          if (uri) results.push({ uri: uri, anchor: a || dd });
        }
      }
    }

    return results;
  }

  function findGroupRoot(anchor) {
    var root;
    var pageContext = getPageContext();

    if (pageContext.recordType === 'DigitalObject' && pageContext.hasChildren === false && pageContext.paneExists) {
      root = document.querySelector('#notes_row > .resizable-content-pane');
    }

    if (!root && anchor.closest) {
      root = anchor.closest(
        '[data-dv-source-group], [data-additional-file-version], ' +
        '[data-rep-file-version-wrapper], .objectimage, .record-pane, .digital-object, .instance'
      ) || anchor.parentNode;
    } else if (!root) {
      root = anchor.parentNode;
    }

    if (root && root.setAttribute && !root.getAttribute('data-dv-source-group')) {
      sourceGroupCount += 1;
      root.setAttribute('data-dv-source-group', 'render-' + sourceGroupCount);
    }

    return root;
  }

  function findInsertAfter(anchor) {
    if (anchor.classList && anchor.classList.contains('external-digital-object__link')) {
      var availBlock = anchor.closest
        ? anchor.closest('.available-digital-objects')
        : null;
      return availBlock || anchor.parentNode;
    }

    if (anchor.closest && anchor.closest('[data-additional-file-version]')) {
      return anchor.closest('.panel') || anchor.parentNode;
    }

    return (anchor.closest
      ? anchor.closest('dl, .digital-object, .instance')
      : null) || anchor.parentNode;
  }

  function classifyPageContext(context) {
    if (!context || !context.paneExists) return 'inline-fallback';
    if (context.recordType === 'DigitalObject' && context.hasChildren === false) {
      return 'leaf-digital-object';
    }
    return 'stock';
  }

  function getPageContext() {
    var context = document.querySelector('[data-dv-page-context]');
    var dataset = context && context.dataset ? context.dataset : {};

    return {
      recordType: dataset.recordType || '',
      hasChildren: dataset.hasChildren === 'true',
      paneExists: !!document.querySelector('#notes_row > .resizable-content-pane'),
    };
  }

  function prepareLeafLayout() {
    var pane = document.querySelector('#notes_row > .resizable-content-pane');
    var metadataColumn;
    var viewerColumn;

    if (!pane || !pane.children || pane.querySelector('#dv-viewer-column')) return null;

    metadataColumn = document.createElement('div');
    metadataColumn.className = 'dv-metadata-column';
    viewerColumn = document.createElement('div');
    viewerColumn.id = 'dv-viewer-column';
    viewerColumn.className = 'dv-viewer-column';

    while (pane.firstChild) {
      metadataColumn.appendChild(pane.firstChild);
    }
    pane.appendChild(metadataColumn);
    pane.appendChild(viewerColumn);
    pane.classList.add('dv-enhanced-pane');
    return viewerColumn;
  }

  // ── Initialization ────────────────────────────────────────────────────────

  function init() {
    if (typeof OpenSeadragon === 'undefined') {
      console.warn('[digital_viewer] OpenSeadragon not loaded — viewer will not mount.');
      return;
    }

    var fileUris = collectFileUris();
    if (fileUris.length === 0) return;

    var pageContext = getPageContext();
    var pageLayout = classifyPageContext(pageContext);
    var viewerColumn = null;

    var groups = [];

    fileUris.forEach(function (item) {
      var root = findGroupRoot(item.anchor);
      var group = null;
      var idx;

      for (idx = 0; idx < groups.length; idx += 1) {
        if (groups[idx].root === root) {
          group = groups[idx];
          break;
        }
      }

      if (!group) {
        group = { root: root, items: [] };
        groups.push(group);
      }

      if (!group.items.some(function (existing) { return existing.uri === item.uri; })) {
        group.items.push(item);
      }
    });

    groups.forEach(function (group) {
      var candidates = [];
      var selection;
      var ranked;
      var chosen = null;
      var container;
      var insertAfter;
      var idx;

      group.items.forEach(function (item) {
        var candidateDescriptor = detectSource(item.uri);
        if (!candidateDescriptor) return;
        candidates.push({ item: item, descriptor: candidateDescriptor });
      });

      if (candidates.length === 0) return;

      if (!viewerColumn && pageLayout === 'leaf-digital-object') {
        viewerColumn = prepareLeafLayout();
      }

      selection = buildDescriptorSelection(candidates);
      ranked = selection.rankedCandidates;
      chosen = selection.primaryCandidate;

      if (!chosen) return;

      container = document.createElement('div');
      container.className = 'digital-viewer-container';
      container.__dvDescriptorSelection = selection;

      if (viewerColumn) {
        // Two-column layout: append directly into the right column.
        viewerColumn.appendChild(container);
      } else {
        // Inline fallback: insert after the nearest meaningful block.
        insertAfter = findInsertAfter(chosen.item.anchor);
        if (insertAfter && insertAfter.parentNode) {
          insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
        } else {
          return;
        }
      }

      (function tryMount(rankIndex) {
        mountDescriptor(container, ranked[rankIndex].descriptor)
          .catch(function () {
            if (rankIndex + 1 < ranked.length) {
              tryMount(rankIndex + 1);
            }
          });
      })(0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
