import { createViewerScope } from './events.mjs';

export function createControls({ document, isAttemptActive, registerAttemptCleanup }) {
  var IMAGE_ADJUSTMENT_STEP = 20;
  var DEFAULT_IMAGE_ADJUSTMENTS = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0,
  };
  var viewerControlInstanceCount = 0;

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

  function addControls(container, viewer, options) {
    var scope = createViewerScope(viewer, options && options.attempt, registerAttemptCleanup);
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
    state.popover.id = state.adjustButton.getAttribute('aria-controls');
    bar.appendChild(state.popover);
    state.toggleButton = buildControlsToggle(viewer, state);
    bar.appendChild(state.toggleButton);

    if (document && typeof document.addEventListener === 'function') {
      scope.listen(document, 'click', function (event) {
        if (!state.isPopoverOpen) return;
        if (!event || !event.target) return;
        if (!isElementInside(bar, event.target)) {
          setAdjustPopoverOpen(state, false);
        }
      });

      scope.listen(document, 'keydown', function (event) {
        if (!state.isPopoverOpen || !event) return;
        if (event.key === 'Escape' || event.keyCode === 27) {
          setAdjustPopoverOpen(state, false);
          syncToolbarState(viewer, state);
        }
      });
    }

    if (viewer && typeof viewer.addHandler === 'function') {
      viewer.addHandler('animation', function () {
        if (!isAttemptActive(options && options.attempt)) return;
        syncToolbarState(viewer, state);
      });
      viewer.addHandler('open', function () {
        if (!isAttemptActive(options && options.attempt)) return;
        applyViewerImageAdjustments(viewer);
        syncToolbarState(viewer, state);
      });
      viewer.addHandler('full-page', function () {
        if (!isAttemptActive(options && options.attempt)) return;
        syncToolbarState(viewer, state);
      });
    }

    setControlsCollapsed(state, false);
    syncToolbarState(viewer, state);
    container.appendChild(bar);
  }

  function addPageNav(container, viewer, total, options) {
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
      if (!isAttemptActive(options && options.attempt)) return;
      counter.textContent = (data.page + 1) + ' / ' + total;
      prevBtn.disabled = data.page === 0;
      nextBtn.disabled = data.page === total - 1;
    });
  }

  return { addControls, addPageNav };
}
