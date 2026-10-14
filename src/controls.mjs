import { createViewerScope } from './events.mjs';
import { createImageAdjustments } from './control-adjustments.mjs';

export function createControls(dependencies) {
  var context = Object.assign({}, dependencies, {
    adjustments: createImageAdjustments(),
    instanceCount: 0,
  });

  return {
    addControls: function (container, viewer, options) {
      addControls(context, container, viewer, options);
    },
    addPageNav: function (container, viewer, total, options) {
      addPageNav(context, container, viewer, total, options);
    },
  };
}

function makeButton(document, icon, title, onClick) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'dv-ctrl-btn dv-ctrl-btn--' + icon;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute('data-icon', icon);
  button.addEventListener('click', onClick);
  return button;
}

function setButtonActive(button, active) {
  if (!button) return;
  if (button.classList && typeof button.classList.toggle === 'function') {
    button.classList.toggle('is-active', !!active);
  }
}

function setButtonPressed(button, pressed) {
  setButtonActive(button, pressed);
  if (button) button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
}

function normalizeZoom(value) {
  return isFinite(value) && value > 0 ? value : 1;
}

function getViewerZoomPercent(viewer) {
  var viewport = viewer && viewer.viewport;
  var currentZoom = viewport && typeof viewport.getZoom === 'function'
    ? normalizeZoom(viewport.getZoom(true))
    : 1;
  var homeZoom = viewport && typeof viewport.getHomeZoom === 'function'
    ? normalizeZoom(viewport.getHomeZoom())
    : 1;

  return Math.round((currentZoom / homeZoom) * 100) + '%';
}

function isElementInside(parent, candidate) {
  var node = candidate;
  while (node) {
    if (node === parent) return true;
    node = node.parentNode;
  }
  return false;
}

function setControlsCollapsed(state, collapsed) {
  if (!state || !state.root) return;
  state.isCollapsed = !!collapsed;
  if (state.isCollapsed && state.isPopoverOpen) setAdjustPopoverOpen(state, false);
  if (state.root.classList && typeof state.root.classList.toggle === 'function') {
    state.root.classList.toggle('is-collapsed', state.isCollapsed);
  }
  if (state.toggleButton) {
    state.toggleButton.setAttribute('aria-expanded', state.isCollapsed ? 'false' : 'true');
  }
}

function updatePopoverRoot(state, open) {
  if (state.root && state.root.classList && typeof state.root.classList.toggle === 'function') {
    state.root.classList.toggle('is-adjust-open', open);
  }
}

function updatePopoverElement(state, open) {
  if (!state.popover) return;
  state.popover.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (state.popover.classList && typeof state.popover.classList.toggle === 'function') {
    state.popover.classList.toggle('is-open', open);
  }
}

function updatePopoverButton(state, open) {
  if (!state.adjustButton) return;
  state.adjustButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  setButtonActive(state.adjustButton, open);
}

function setAdjustPopoverOpen(state, open) {
  if (!state || (open && state.isCollapsed)) return;
  state.isPopoverOpen = !!open;
  updatePopoverRoot(state, state.isPopoverOpen);
  updatePopoverElement(state, state.isPopoverOpen);
  updatePopoverButton(state, state.isPopoverOpen);
}

function syncAdjustPopover(context, viewer, state) {
  var adjustments;
  if (!state) return;
  adjustments = context.adjustments.get(viewer);
  state.rangeControls.forEach(function (control) {
    var value = adjustments[control.key];
    control.input.value = String(value);
    control.value.textContent = value + '%';
  });
  state.toggleControls.forEach(function (control) {
    setButtonPressed(control.button, adjustments[control.key] !== 0);
  });
}

function syncToolbarState(context, viewer, state) {
  if (!state) return;
  if (state.zoomLabel) state.zoomLabel.textContent = getViewerZoomPercent(viewer);
  if (state.flipButton) {
    setButtonPressed(state.flipButton, context.adjustments.isFlipped(viewer));
  }
  if (state.fullscreenButton && viewer && typeof viewer.isFullPage === 'function') {
    setButtonPressed(state.fullscreenButton, !!viewer.isFullPage());
  }
  syncAdjustPopover(context, viewer, state);
}

function makeAdjustmentRangeControl(context, viewer, state, label, key) {
  var document = context.document;
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
    context.adjustments.set(viewer, key, nextValue);
    syncToolbarState(context, viewer, state);
  });
  row.appendChild(labelText);
  row.appendChild(slider);
  row.appendChild(value);
  state.rangeControls.push({ key: key, input: slider, value: value });
  return row;
}

function makeAdjustmentToggle(context, viewer, state, title, key, label) {
  var button = context.document.createElement('button');
  button.type = 'button';
  button.className = 'dv-adjust-toggle';
  button.title = title;
  button.textContent = label;
  button.setAttribute('aria-label', title);
  button.setAttribute('data-setting', key);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', function () {
    context.adjustments.toggle(viewer, key);
    syncToolbarState(context, viewer, state);
  });
  state.toggleControls.push({ key: key, button: button });
  return button;
}

function makePopoverActionButton(document, label, title, onClick) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'dv-adjust-action';
  button.title = title;
  button.textContent = label;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', onClick);
  return button;
}

function makeRotationButton(context, viewer, state, label, title, direction) {
  return makePopoverActionButton(context.document, label, title, function () {
    context.adjustments.rotate(viewer, direction);
    syncToolbarState(context, viewer, state);
  });
}

function makeFlipButton(context, viewer, state) {
  return makePopoverActionButton(context.document, 'Flip', 'Flip horizontally', function () {
    context.adjustments.setFlip(viewer, !context.adjustments.isFlipped(viewer));
    syncToolbarState(context, viewer, state);
  });
}

function makeFullscreenButton(context, viewer, state) {
  return makePopoverActionButton(context.document, 'Fullscreen', 'Toggle fullscreen', function () {
    if (typeof viewer.isFullPage === 'function' && viewer.isFullPage()) {
      viewer.setFullPage(false);
    } else if (typeof viewer.setFullPage === 'function') {
      viewer.setFullPage(true);
    }
    syncToolbarState(context, viewer, state);
  });
}

function buildPopoverActions(context, viewer, state) {
  var actions = context.document.createElement('div');
  actions.className = 'dv-adjust-actions';
  actions.appendChild(makeRotationButton(context, viewer, state, 'Rotate left', 'Rotate left 90 degrees', -1));
  actions.appendChild(makeRotationButton(context, viewer, state, 'Rotate right', 'Rotate right 90 degrees', 1));
  state.flipButton = makeFlipButton(context, viewer, state);
  state.fullscreenButton = makeFullscreenButton(context, viewer, state);
  actions.appendChild(state.flipButton);
  actions.appendChild(state.fullscreenButton);
  return actions;
}

function buildAdjustmentBody(context, viewer, state) {
  var body = context.document.createElement('div');
  body.className = 'dv-adjust-body';
  body.appendChild(makeAdjustmentRangeControl(context, viewer, state, 'Brightness', 'brightness'));
  body.appendChild(makeAdjustmentRangeControl(context, viewer, state, 'Contrast', 'contrast'));
  body.appendChild(makeAdjustmentRangeControl(context, viewer, state, 'Saturation', 'saturation'));
  return body;
}

function buildAdjustmentToggles(context, viewer, state) {
  var toggles = context.document.createElement('div');
  toggles.className = 'dv-adjust-toggles';
  toggles.appendChild(makeAdjustmentToggle(context, viewer, state, 'Toggle greyscale', 'grayscale', 'Greyscale'));
  toggles.appendChild(makeAdjustmentToggle(context, viewer, state, 'Toggle color invert', 'invert', 'Invert'));
  return toggles;
}

function buildAdjustmentFooter(context, viewer, state) {
  var footer = context.document.createElement('div');
  var resetButton = context.document.createElement('button');
  footer.className = 'dv-adjust-footer';
  resetButton.type = 'button';
  resetButton.className = 'dv-adjust-reset';
  resetButton.textContent = 'Reset image';
  resetButton.title = 'Revert image transforms and adjustments';
  resetButton.setAttribute('aria-label', 'Revert image transforms and adjustments');
  resetButton.addEventListener('click', function () {
    context.adjustments.reset(viewer);
    syncToolbarState(context, viewer, state);
  });
  footer.appendChild(resetButton);
  return footer;
}

function buildAdjustPopover(context, viewer, state) {
  var document = context.document;
  var popover = document.createElement('div');
  var title = document.createElement('div');
  popover.className = 'dv-adjust-popover';
  popover.setAttribute('aria-hidden', 'true');
  title.className = 'dv-adjust-title';
  title.textContent = 'Adjust image';
  popover.appendChild(title);
  popover.appendChild(buildPopoverActions(context, viewer, state));
  popover.appendChild(buildAdjustmentBody(context, viewer, state));
  popover.appendChild(buildAdjustmentToggles(context, viewer, state));
  popover.appendChild(buildAdjustmentFooter(context, viewer, state));
  return popover;
}

function makeSyncedButton(context, viewer, state, icon, title, action) {
  return makeButton(context.document, icon, title, function () {
    action();
    syncToolbarState(context, viewer, state);
  });
}

function zoomViewer(viewer, factor) {
  if (viewer.viewport && typeof viewer.viewport.zoomBy === 'function') {
    viewer.viewport.zoomBy(factor);
  }
}

function homeViewer(viewer) {
  if (viewer.viewport && typeof viewer.viewport.goHome === 'function') {
    viewer.viewport.goHome();
  }
}

function createAdjustButton(context, viewer, state, instanceId) {
  var button = makeButton(context.document, 'adjust', 'Adjust image', function () {
    setAdjustPopoverOpen(state, !state.isPopoverOpen);
    syncToolbarState(context, viewer, state);
  });
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'dv-adjust-popover-' + instanceId);
  return button;
}

function buildToolbarActions(context, viewer, state, instanceId) {
  var actions = context.document.createElement('div');
  actions.className = 'dv-controls-actions';
  actions.appendChild(makeSyncedButton(context, viewer, state, 'zoom-out', 'Zoom out', function () {
    zoomViewer(viewer, 0.67);
  }));
  actions.appendChild(makeSyncedButton(context, viewer, state, 'zoom-in', 'Zoom in', function () {
    zoomViewer(viewer, 1.5);
  }));
  actions.appendChild(makeSyncedButton(context, viewer, state, 'home', 'Reset zoom to fit', function () {
    homeViewer(viewer);
  }));
  state.adjustButton = createAdjustButton(context, viewer, state, instanceId);
  actions.appendChild(state.adjustButton);
  return actions;
}

function buildToolbarStatus(context, viewer, state) {
  var status = context.document.createElement('div');
  var zoomLabel = context.document.createElement('span');
  var dismissButton = makeButton(context.document, 'collapse', 'Hide toolbar', function () {
    setControlsCollapsed(state, true);
    syncToolbarState(context, viewer, state);
  });
  status.className = 'dv-controls-status';
  zoomLabel.className = 'dv-zoom-label';
  dismissButton.className += ' dv-controls-dismiss';
  status.appendChild(zoomLabel);
  status.appendChild(dismissButton);
  state.zoomLabel = zoomLabel;
  return status;
}

function buildPrimaryControls(context, viewer, state, instanceId) {
  var bar = context.document.createElement('div');
  bar.className = 'dv-controls-bar';
  bar.appendChild(buildToolbarActions(context, viewer, state, instanceId));
  bar.appendChild(buildToolbarStatus(context, viewer, state));
  return bar;
}

function buildControlsToggle(context, viewer, state) {
  var toggle = context.document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dv-controls-toggle';
  toggle.textContent = 'Tools';
  toggle.title = 'Show toolbar';
  toggle.setAttribute('aria-label', 'Show toolbar');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.addEventListener('click', function () {
    setControlsCollapsed(state, false);
    syncToolbarState(context, viewer, state);
  });
  return toggle;
}

function createControlState(bar) {
  return {
    root: bar,
    rangeControls: [],
    toggleControls: [],
    isPopoverOpen: false,
    isCollapsed: false,
  };
}

function buildControlsBar(context, bar, viewer, state) {
  var instanceId = context.instanceCount;
  bar.appendChild(buildPrimaryControls(context, viewer, state, instanceId));
  state.popover = buildAdjustPopover(context, viewer, state);
  state.popover.id = state.adjustButton.getAttribute('aria-controls');
  bar.appendChild(state.popover);
  state.toggleButton = buildControlsToggle(context, viewer, state);
  bar.appendChild(state.toggleButton);
}

function dismissPopoverOnOutsideClick(state, bar, event) {
  if (state.isPopoverOpen && event && event.target && !isElementInside(bar, event.target)) {
    setAdjustPopoverOpen(state, false);
  }
}

function dismissPopoverOnEscape(context, viewer, state, event) {
  if (!state.isPopoverOpen || !event) return;
  if (event.key === 'Escape' || event.keyCode === 27) {
    setAdjustPopoverOpen(state, false);
    syncToolbarState(context, viewer, state);
  }
}

function registerDocumentListeners(context, scope, bar, viewer, state) {
  var document = context.document;
  if (!document || typeof document.addEventListener !== 'function') return;
  scope.listen(document, 'click', function (event) {
    dismissPopoverOnOutsideClick(state, bar, event);
  });
  scope.listen(document, 'keydown', function (event) {
    dismissPopoverOnEscape(context, viewer, state, event);
  });
}

function syncViewerOnAnimation(context, viewer, state, attempt) {
  if (context.isAttemptActive(attempt)) syncToolbarState(context, viewer, state);
}

function syncViewerOnOpen(context, viewer, state, attempt) {
  if (!context.isAttemptActive(attempt)) return;
  context.adjustments.apply(viewer);
  syncToolbarState(context, viewer, state);
}

function registerViewerHandlers(context, viewer, state, attempt) {
  if (!viewer || typeof viewer.addHandler !== 'function') return;
  viewer.addHandler('animation', function () {
    syncViewerOnAnimation(context, viewer, state, attempt);
  });
  viewer.addHandler('open', function () {
    syncViewerOnOpen(context, viewer, state, attempt);
  });
  viewer.addHandler('full-page', function () {
    syncViewerOnAnimation(context, viewer, state, attempt);
  });
}

function addControls(context, container, viewer, options) {
  var scope = createViewerScope(viewer, options && options.attempt, context.registerAttemptCleanup);
  var bar = context.document.createElement('div');
  var state = createControlState(bar);
  bar.className = 'dv-controls';
  context.adjustments.apply(viewer);
  context.instanceCount += 1;
  buildControlsBar(context, bar, viewer, state);
  registerDocumentListeners(context, scope, bar, viewer, state);
  registerViewerHandlers(context, viewer, state, options && options.attempt);
  setControlsCollapsed(state, false);
  syncToolbarState(context, viewer, state);
  container.appendChild(bar);
}

function createPageButton(document, label) {
  var button = document.createElement('button');
  button.textContent = label;
  button.className = 'dv-page-btn';
  return button;
}

function updatePageNavigation(data, total, counter, previousButton, nextButton) {
  counter.textContent = (data.page + 1) + ' / ' + total;
  previousButton.disabled = data.page === 0;
  nextButton.disabled = data.page === total - 1;
}

function addPageNav(context, container, viewer, total, options) {
  var document = context.document;
  var nav = document.createElement('div');
  var previousButton = createPageButton(document, '‹ Prev');
  var counter = document.createElement('span');
  var nextButton = createPageButton(document, 'Next ›');
  nav.className = 'dv-page-nav';
  previousButton.disabled = true;
  counter.className = 'dv-page-counter';
  counter.textContent = '1 / ' + total;
  previousButton.addEventListener('click', function () { viewer.goToPreviousPage(); });
  nextButton.addEventListener('click', function () { viewer.goToNextPage(); });
  nav.appendChild(previousButton);
  nav.appendChild(counter);
  nav.appendChild(nextButton);
  container.appendChild(nav);
  viewer.addHandler('page', function (data) {
    if (!context.isAttemptActive(options && options.attempt)) return;
    updatePageNavigation(data, total, counter, previousButton, nextButton);
  });
}
