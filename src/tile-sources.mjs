import { sanitizeUrl } from './urls.mjs';

const THUMBNAIL_SIZE = 160;

export function getTileSourceValue(tileSource) {
  if (!tileSource) return tileSource;
  if (tileSource.tileSource) return tileSource.tileSource;
  return tileSource;
}

export function isUnavailableTileSource(tileSource) {
  return !!(tileSource && tileSource.unavailable);
}

export function buildThumbnailUrl(tileSource) {
  var infoUrl;

  if (!tileSource) return '';
  if (tileSource.unavailable) return '';

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

export function getTileSourceImageUrl(tileSource) {
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

export function getCompanionPdfUrl(selection) {
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
