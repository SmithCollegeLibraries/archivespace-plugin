// URL classification and ranking; configuration is supplied by the caller.
// Regex for a UUID in a URI (used to detect Preservica assets)
var UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// File extensions we can deep-zoom via Cantaloupe
var DEEP_ZOOM_RE = /\.(tiff?|jp2)(\?.*)?$/i;
var STATIC_IMAGE_RE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
var PDF_RE = /\.pdf(\?.*)?$/i;

export function detectSource(fileUri, cfg) {
  var uriUrl;

  if (!fileUri) return null;

  var normalizedUri = fileUri.replace(/^\/\//, 'https://');
  try {
    uriUrl = new URL(normalizedUri);
  } catch (err) {
    uriUrl = null;
  }
  var isCompassHost = !!cfg.compassHost && !!uriUrl && uriUrl.hostname.toLowerCase() === cfg.compassHost;

  if (/^https?:\/\//i.test(normalizedUri) && PDF_RE.test(normalizedUri)) {
    return { type: 'static-pdf', url: normalizedUri };
  }

  // Compass S3 TIFF — strip host + /system/files/ to get the S3 path key
  if (isCompassHost && cfg.cantaloupeBaseUrl && normalizedUri.indexOf('/system/files/') !== -1) {
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
  if (isCompassHost &&
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
  if (isCompassHost &&
      normalizedUri.indexOf('/node/') !== -1 &&
      /\/manifest(?:-single)?(?:\?.*)?$/i.test(normalizedUri)) {
    return { type: 'compass-manifest', manifestUrl: normalizedUri.replace(/^http:\/\//i, 'https://') };
  }

  if (isCompassHost &&
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

export function descriptorPriority(descriptor) {
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

export function pickBestDescriptor(descriptors) {
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

export function descriptorSelectionPriority(descriptor, hasNonPdfCandidate) {
  if (hasNonPdfCandidate && descriptor && descriptor.type === 'static-pdf') {
    return -1;
  }

  return descriptorPriority(descriptor);
}

export function buildDescriptorSelection(candidates) {
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
