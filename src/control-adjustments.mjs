const DEFAULT_IMAGE_ADJUSTMENTS = Object.freeze({
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  invert: 0,
});

function cloneDefaultImageAdjustments() {
  return Object.assign({}, DEFAULT_IMAGE_ADJUSTMENTS);
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
  var filterValue;

  if (!target) return;
  filterValue = buildViewerImageFilter(adjustments);
  target.style.filter = filterValue;
  target.style.webkitFilter = filterValue;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setViewerImageSetting(viewer, key, value) {
  var numericValue = parseInt(value, 10);

  if (isNaN(numericValue)) numericValue = 0;
  getViewerImageAdjustments(viewer)[key] = clamp(numericValue, 0, 200);
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
  var viewport = viewer && viewer.viewport;
  var currentRotation;

  if (!viewport || typeof viewport.getRotation !== 'function' || typeof viewport.setRotation !== 'function') return;
  currentRotation = viewport.getRotation();
  currentRotation += direction * (isViewerFlipped(viewer) ? -90 : 90);
  viewport.setRotation(currentRotation);
}

function resetViewerTransforms(viewer) {
  var viewport = viewer && viewer.viewport;

  if (!viewport) return;
  if (typeof viewport.setRotation === 'function') viewport.setRotation(0);
  setViewerFlip(viewer, false);
  resetViewerImageAdjustments(viewer);
  if (typeof viewport.goHome === 'function') viewport.goHome();
  if (typeof viewer.forceRedraw === 'function') viewer.forceRedraw();
}

export function createImageAdjustments() {
  return {
    get: getViewerImageAdjustments,
    apply: applyViewerImageAdjustments,
    set: setViewerImageSetting,
    toggle: toggleViewerImageSetting,
    reset: resetViewerTransforms,
    isFlipped: isViewerFlipped,
    setFlip: setViewerFlip,
    rotate: rotateViewer,
  };
}
