// Pure manifest parsing. URL rewriting is supplied by adapters.
export const UNAVAILABLE_TILE_SOURCE = {
  type: 'image',
  url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  width: 1,
  height: 1,
};

function defaultServiceInfoUrl(serviceId) {
  return serviceId.replace(/\/$/, '') + '/info.json';
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

export function extractManifestPages(manifest, serviceInfoUrl = defaultServiceInfoUrl) {
  const sequence = manifest.sequences && manifest.sequences[0];
  const canvases = sequence && Array.isArray(sequence.canvases) ? sequence.canvases : [];
  return canvases.map(function (canvas, index) {
    return extractPresentation2Page(canvas, index, serviceInfoUrl);
  });
}

function extractPresentation2Page(canvas, index, serviceInfoUrl) {
  const image = getCanvasImage(canvas);
  const resource = image && image.resource;
  const serviceId = getImageServiceId(resource);
  const tileSource = serviceId ? serviceInfoUrl(serviceId) : '';
  const seeAlso = canvas && canvas.seeAlso;
  const page = {
    tileSource: tileSource || UNAVAILABLE_TILE_SOURCE,
    thumbnailUrl: getCanvasThumbnailUrl(canvas) || '',
    pageIndex: index,
    pageLabel: canvas.label || '',
    canvasId: getManifestNodeId(canvas),
    pageIdentifier: getCanvasMetadataValue(canvas, 'Identifier'),
    imageUrl: getPageImageUrl(getManifestNodeId(resource), serviceId),
    ocrUrl: getManifestNodeId(seeAlso),
    ocrFormat: seeAlso && seeAlso.format || '',
  };
  if (isUnavailablePage(image, serviceId, tileSource)) page.unavailable = true;
  return page;
}

function getCanvasImage(canvas) {
  return canvas.images && canvas.images[0];
}

function getCanvasThumbnailUrl(canvas) {
  const thumbnail = canvas.thumbnail && (Array.isArray(canvas.thumbnail) ? canvas.thumbnail[0] : canvas.thumbnail);
  return thumbnail && (thumbnail['@id'] || thumbnail.id || '');
}

function getImageServiceId(resource) {
  const service = resource && resource.service;
  return service ? (service['@id'] || service.id || '').replace(/\/$/, '') : '';
}

function getPageImageUrl(imageUrl, serviceId) {
  return imageUrl || (serviceId ? serviceId + '/full/full/0/default.jpg' : '');
}

function isUnavailablePage(image, serviceId, tileSource) {
  return !image || !serviceId || !tileSource;
}

export function extractManifestContent(manifest, onInvalidCanvas = function () {}) {
  const result = { images: [], videos: [], audio: [], pdfs: [] };
  const canvases = manifest.items && Array.isArray(manifest.items) ? manifest.items : [];
  canvases.forEach(function (canvas) { appendCanvasContent(canvas, result, onInvalidCanvas); });
  return result;
}

function appendCanvasContent(canvas, result, onInvalidCanvas) {
  try {
    const annotationPage = canvas.items && canvas.items[0];
    const annotation = annotationPage && annotationPage.items && annotationPage.items[0];
    const body = annotation && annotation.body;
    if (body) appendManifestBody(body, canvas, result);
  } catch {
    onInvalidCanvas();
  }
}

function appendManifestBody(body, canvas, result) {
  const { url, format, type } = describeManifestBody(body);
  if (!url) return;

  if (isVideoContent(type, format)) {
    appendVideoContent(body, canvas, url, result);
  } else if (isAudioContent(type, format)) {
    appendAudioContent(body, canvas, url, result);
  } else if (format === 'application/pdf') {
    result.pdfs.push({ url: url });
  } else {
    result.images.push({ url: url, format: body.format || 'image/jpeg' });
  }
}

function describeManifestBody(body) {
  return {
    url: body.id || body['@id'] || '',
    format: (body.format || '').toLowerCase(),
    type: (body.type || body['@type'] || '').toLowerCase(),
  };
}

function isVideoContent(type, format) {
  return type === 'video' || format.indexOf('video/') === 0;
}

function isAudioContent(type, format) {
  return type === 'sound' || format.indexOf('audio/') === 0;
}

function appendVideoContent(body, canvas, url, result) {
  result.videos.push({
    url: url,
    format: body.format || 'video/mp4',
    width: canvas.width || null,
    height: canvas.height || null,
    duration: canvas.duration || null,
  });
}

function appendAudioContent(body, canvas, url, result) {
  result.audio.push({ url: url, format: body.format || 'audio/mpeg', duration: canvas.duration || null });
}

export function hasRenderablePages(tileSources) {
  return Array.isArray(tileSources) && tileSources.some(function (tileSource) {
    return tileSource && !tileSource.unavailable && !!(tileSource.tileSource || tileSource);
  });
}
