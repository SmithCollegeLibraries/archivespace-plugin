import { sanitizeUrl } from '../urls.mjs';
import { getLoadingTimeout } from '../config.mjs';

// Direct images, IIIF tile sources and native PDF/audio/video rendering.
function createImageLoadWaiter(dependencies) {
  function waitForImageLoad(image, container, options) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timeoutId = dependencies.setTimeout(function () {
        if (settled) return;
        if (options && options.allowFallbackOnTimeout) {
          finish(new Error('STATIC_IMAGE_TIMEOUT'));
        } else {
          dependencies.showLoadingNotice(container);
        }
      }, getLoadingTimeout(options || {}));

      function finish(error) {
        if (settled) return;
        settled = true;
        dependencies.clearTimeout(timeoutId);
        if (!error) dependencies.clearLoadingNotice(container);
        if (error) {
          reject(error);
        } else {
          resolve(image);
        }
      }

      image.addEventListener('load', function () { finish(); });
      image.addEventListener('error', function () {
        finish(new Error('STATIC_IMAGE_FAILED'));
      });
      dependencies.registerAttemptCleanup(options && options.attempt, function () {
        finish(new Error('ATTEMPT_DISPOSED'));
      });

      settleFromCachedImage(image, finish);
    });
  }

  return waitForImageLoad;
}

function settleFromCachedImage(image, finish) {
  if (!image.complete) return;
  if (typeof image.naturalWidth === 'number' && image.naturalWidth === 0) {
    finish(new Error('STATIC_IMAGE_FAILED'));
  } else {
    finish();
  }
}

function createStaticImageAdapter(dependencies, waitForImageLoad) {
  return function mountStaticImage(container, descriptor, mountOptions) {
    var safeImageUrl = sanitizeUrl(descriptor.imageUrl);

    if (!safeImageUrl) {
      dependencies.showError(container, 'Image not available (unsupported URL)');
      return;
    }

    dependencies.resetContainer(container);
    container.classList.add('dv-active');
    var wrap = dependencies.document.createElement('div');
    wrap.className = 'dv-static-image';
    var image = createStaticImageElement(dependencies.document, safeImageUrl);
    wrap.appendChild(image);
    container.appendChild(wrap);
    dependencies.addViewerModeActions(container, null,
      [{ imageUrl: safeImageUrl, pageLabel: 'Image view' }], mountOptions);
    return waitForImageLoad(image, container, mountOptions);
  };
}

function createStaticImageElement(document, safeImageUrl) {
  var image = document.createElement('img');
  image.src = safeImageUrl;
  image.alt = 'Digital object image';
  image.style.display = 'block';
  image.style.width = '100%';
  image.style.height = 'auto';
  return image;
}

function createNativeMediaAdapters(dependencies) {
  return {
    mountVideoViewer: createNativeMediaAdapter(dependencies, 'video'),
    mountAudioViewer: createNativeMediaAdapter(dependencies, 'audio'),
  };
}

function getNativeMediaSettings(mediaType) {
  if (mediaType === 'video') {
    return {
      error: 'Video not available (unsupported URL)',
      fallback: 'Your browser does not support video playback. ',
      download: 'Download the video',
    };
  }
  return {
    error: 'Audio not available (unsupported URL)',
    fallback: 'Your browser does not support audio playback. ',
    download: 'Download the audio',
  };
}

function appendNativeMediaSources(document, media, sources) {
  var validSources = [];
  sources.forEach(function (src) {
    var safeUrl = sanitizeUrl(src && src.url);
    var source = document.createElement('source');
    if (!safeUrl) return;
    source.src = safeUrl;
    if (src.format) source.type = src.format;
    media.appendChild(source);
    validSources.push(src);
  });
  return validSources;
}

function appendNativeMediaFallback(dependencies, media, validSources, settings) {
  var fallback = dependencies.document.createElement('p');
  var fallbackLink = dependencies.createFallbackLink(validSources[0].url, settings.download);
  fallback.className = 'dv-fallback';
  fallback.appendChild(dependencies.document.createTextNode(settings.fallback));
  if (fallbackLink) {
    fallback.appendChild(fallbackLink);
    fallback.appendChild(dependencies.document.createTextNode('.'));
  }
  media.appendChild(fallback);
}

function createNativeMediaAdapter(dependencies, mediaType) {
  return function mountNativeMedia(container, sources) {
    var settings = getNativeMediaSettings(mediaType);
    container.classList.add('dv-active');
    var wrap = dependencies.document.createElement('div');
    wrap.className = 'dv-' + mediaType;
    var media = dependencies.document.createElement(mediaType);
    media.controls = true;
    media.preload = 'metadata';
    var validSources = appendNativeMediaSources(dependencies.document, media, sources);

    if (validSources.length === 0) {
      dependencies.showError(container, settings.error);
      return;
    }

    appendNativeMediaFallback(dependencies, media, validSources, settings);
    wrap.appendChild(media);
    container.appendChild(wrap);
  };
}

function createPdfViewerAdapter(dependencies) {
  return function mountPdfViewer(container, source) {
    var safeUrl = sanitizeUrl(source && source.url);
    if (!safeUrl) {
      dependencies.showError(container, 'PDF not available (unsupported URL)');
      return;
    }

    container.classList.add('dv-active');
    var wrap = dependencies.document.createElement('div');
    wrap.className = 'dv-pdf';
    var iframe = dependencies.document.createElement('iframe');
    iframe.src = safeUrl;
    iframe.title = 'PDF viewer';
    iframe.setAttribute('allow', 'fullscreen');
    var fallback = dependencies.document.createElement('p');
    fallback.className = 'dv-fallback';
    var fallbackLink = dependencies.createFallbackLink(safeUrl, 'Open PDF');
    if (fallbackLink) fallback.appendChild(fallbackLink);
    wrap.appendChild(iframe);
    wrap.appendChild(fallback);
    container.appendChild(wrap);
  };
}

export function createDirectAdapters(dependencies) {
  var waitForImageLoad = createImageLoadWaiter(dependencies);
  return {
    mountCantaloupe: function (container, descriptor, mountOptions) {
      return dependencies.mountOsdViewer(container, descriptor.infoUrl, mountOptions);
    },
    mountStaticImage: createStaticImageAdapter(dependencies, waitForImageLoad),
    ...createNativeMediaAdapters(dependencies),
    mountPdfViewer: createPdfViewerAdapter(dependencies),
  };
}
