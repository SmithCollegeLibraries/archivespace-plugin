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
    var svc = resource && resource.service;
    var serviceId = svc ? (svc['@id'] || svc.id || '').replace(/\/$/, '') : '';
    var tileSource = serviceId ? serviceInfoUrl(serviceId) : '';
    var page = {
      tileSource: tileSource || UNAVAILABLE_TILE_SOURCE,
      thumbnailUrl: thumbnailUrl || '',
      pageIndex: index,
      pageLabel: canvas.label || '',
      canvasId: getManifestNodeId(canvas),
      pageIdentifier: getCanvasMetadataValue(canvas, 'Identifier'),
      imageUrl: imageUrl || (serviceId ? serviceId + '/full/full/0/default.jpg' : ''),
      ocrUrl: getManifestNodeId(seeAlso),
      ocrFormat: seeAlso && seeAlso.format || '',
    };

    if (!img || !serviceId || !tileSource) page.unavailable = true;
    tileSources.push(page);
  });

  return tileSources;
}

export function extractManifestContent(manifest, onInvalidCanvas = function () {}) {
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
      onInvalidCanvas();
    }
  });

  return result;
}

export function hasRenderablePages(tileSources) {
  return Array.isArray(tileSources) && tileSources.some(function (tileSource) {
    return tileSource && !tileSource.unavailable && !!(tileSource.tileSource || tileSource);
  });
}
