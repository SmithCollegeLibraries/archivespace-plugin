import { sanitizeUrl } from '../urls.mjs';
import { getLoadingTimeout } from '../config.mjs';

// Direct images, IIIF tile sources and native PDF/audio/video rendering.
export function createDirectAdapters({ document, setTimeout, clearTimeout, mountOsdViewer,
  showError, resetContainer, addViewerModeActions, showLoadingNotice, clearLoadingNotice,
  registerAttemptCleanup, createFallbackLink }) {
  function mountCantaloupe(container, descriptor, mountOptions) {
    return mountOsdViewer(container, descriptor.infoUrl, mountOptions);
  }

  function waitForImageLoad(image, container, options) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timeoutId = setTimeout(function () {
        if (settled) return;
        if (options && options.allowFallbackOnTimeout) {
          finish(new Error('STATIC_IMAGE_TIMEOUT'));
        } else {
          showLoadingNotice(container);
        }
      }, getLoadingTimeout(options || {}));

      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (!error) clearLoadingNotice(container);
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
      registerAttemptCleanup(options && options.attempt, function () {
        finish(new Error('ATTEMPT_DISPOSED'));
      });

      if (image.complete) {
        if (typeof image.naturalWidth === 'number' && image.naturalWidth === 0) {
          finish(new Error('STATIC_IMAGE_FAILED'));
        } else {
          finish();
        }
      }
    });
  }

  function mountStaticImage(container, descriptor, mountOptions) {
    var safeImageUrl = sanitizeUrl(descriptor.imageUrl);

    if (!safeImageUrl) {
      showError(container, 'Image not available (unsupported URL)');
      return;
    }

    resetContainer(container);
    container.classList.add('dv-active');

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
    addViewerModeActions(container, null, [{ imageUrl: safeImageUrl, pageLabel: 'Image view' }], mountOptions);
    return waitForImageLoad(image, container, mountOptions);
  }

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

  return { mountCantaloupe, mountStaticImage, mountVideoViewer, mountAudioViewer, mountPdfViewer };
}
