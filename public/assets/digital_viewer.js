// GENERATED from src/entry.mjs. Edit src/ and run npm run build.
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

  // src/config.mjs
  function parseCantaloupeBase(baseUrl) {
    var parsed;
    var trimmed;
    if (typeof baseUrl !== "string") return "";
    trimmed = baseUrl.trim();
    if (!trimmed) return "";
    if (/^\/(?!\/)/.test(trimmed)) return trimmed.replace(/\/$/, "");
    try {
      parsed = new URL(trimmed);
    } catch (err) {
      return "";
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return trimmed.replace(/\/$/, "");
  }
  function parseCompassHost(baseUrl) {
    var parsed;
    if (typeof baseUrl !== "string" || !baseUrl.trim()) return "";
    try {
      parsed = new URL(baseUrl.trim());
    } catch (err) {
      return "";
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.hostname ? parsed.hostname.toLowerCase() : "";
  }
  function getLoadingTimeout(options) {
    var configured = options && options.loadingTimeoutMs;
    var timeout = Number(configured);
    if (typeof configured === "undefined") timeout = 3e4;
    if (!isFinite(timeout) || timeout <= 0) return 3e4;
    return timeout;
  }
  function readConfig(input) {
    const cfg = Object.assign({
      cantaloupeBaseUrl: "",
      compassBaseUrl: "",
      preservicaApiBase: "",
      loadingTimeoutMs: 3e4
    }, input || {});
    cfg.cantaloupeBaseUrl = parseCantaloupeBase(cfg.cantaloupeBaseUrl);
    cfg.compassHost = parseCompassHost(cfg.compassBaseUrl);
    return cfg;
  }

  // src/manifest.mjs
  var UNAVAILABLE_TILE_SOURCE = {
    type: "image",
    url: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
    width: 1,
    height: 1
  };
  function defaultServiceInfoUrl(serviceId) {
    return serviceId.replace(/\/$/, "") + "/info.json";
  }
  function getManifestNodeId(node) {
    if (!node) return "";
    return node["@id"] || node.id || "";
  }
  function getCanvasMetadataValue(canvas, label) {
    var metadata = canvas && Array.isArray(canvas.metadata) ? canvas.metadata : [];
    var match = null;
    metadata.some(function(entry) {
      if (!entry || entry.label !== label) return false;
      match = entry.value;
      return true;
    });
    return match || "";
  }
  function extractManifestPages(manifest, serviceInfoUrl = defaultServiceInfoUrl) {
    var tileSources = [];
    var seq = manifest.sequences && manifest.sequences[0];
    var canvases = seq && Array.isArray(seq.canvases) ? seq.canvases : [];
    canvases.forEach(function(canvas, index) {
      var img = canvas.images && canvas.images[0];
      var thumbnail = canvas.thumbnail && (Array.isArray(canvas.thumbnail) ? canvas.thumbnail[0] : canvas.thumbnail);
      var thumbnailUrl = thumbnail && (thumbnail["@id"] || thumbnail.id || "");
      var resource = img && img.resource;
      var seeAlso = canvas && canvas.seeAlso;
      var imageUrl = getManifestNodeId(resource);
      var svc = resource && resource.service;
      var serviceId = svc ? (svc["@id"] || svc.id || "").replace(/\/$/, "") : "";
      var tileSource = serviceId ? serviceInfoUrl(serviceId) : "";
      var page = {
        tileSource: tileSource || UNAVAILABLE_TILE_SOURCE,
        thumbnailUrl: thumbnailUrl || "",
        pageIndex: index,
        pageLabel: canvas.label || "",
        canvasId: getManifestNodeId(canvas),
        pageIdentifier: getCanvasMetadataValue(canvas, "Identifier"),
        imageUrl: imageUrl || (serviceId ? serviceId + "/full/full/0/default.jpg" : ""),
        ocrUrl: getManifestNodeId(seeAlso),
        ocrFormat: seeAlso && seeAlso.format || ""
      };
      if (!img || !serviceId || !tileSource) page.unavailable = true;
      tileSources.push(page);
    });
    return tileSources;
  }
  function extractManifestContent(manifest, onInvalidCanvas = function() {
  }) {
    var result = { images: [], videos: [], audio: [], pdfs: [] };
    var canvases = manifest.items && Array.isArray(manifest.items) ? manifest.items : [];
    canvases.forEach(function(canvas) {
      try {
        var annotPage = canvas.items && canvas.items[0];
        var annot = annotPage && annotPage.items && annotPage.items[0];
        var body = annot && annot.body;
        if (!body) return;
        var url = body.id || body["@id"] || "";
        var format = (body.format || "").toLowerCase();
        var type = (body.type || body["@type"] || "").toLowerCase();
        if (!url) return;
        if (type === "video" || format.indexOf("video/") === 0) {
          result.videos.push({
            url,
            format: body.format || "video/mp4",
            width: canvas.width || null,
            height: canvas.height || null,
            duration: canvas.duration || null
          });
        } else if (type === "sound" || format.indexOf("audio/") === 0) {
          result.audio.push({
            url,
            format: body.format || "audio/mpeg",
            duration: canvas.duration || null
          });
        } else if (format === "application/pdf") {
          result.pdfs.push({ url });
        } else {
          result.images.push({ url, format: body.format || "image/jpeg" });
        }
      } catch (e) {
        onInvalidCanvas();
      }
    });
    return result;
  }
  function hasRenderablePages(tileSources) {
    return Array.isArray(tileSources) && tileSources.some(function(tileSource) {
      return tileSource && !tileSource.unavailable && !!(tileSource.tileSource || tileSource);
    });
  }

  // src/adapters/compass.mjs
  function toLocalCantaloupeInfoUrl(serviceId, cfg) {
    if (!serviceId) return "";
    var normalized = serviceId.replace(/\/$/, "");
    var marker = "/iiif/2/";
    var pos = normalized.indexOf(marker);
    if (pos === -1) {
      return normalized + "/info.json";
    }
    var identifier = normalized.slice(pos + marker.length);
    var decoded = "";
    try {
      decoded = decodeURIComponent(identifier);
    } catch (err) {
      decoded = identifier;
    }
    var fileMarker = "/system/files/";
    var filePos = decoded.indexOf(fileMarker);
    if (filePos === -1) {
      return normalized + "/info.json";
    }
    if (!cfg.cantaloupeBaseUrl) return "";
    var s3Key = decoded.slice(filePos + fileMarker.length);
    try {
      s3Key = decodeURIComponent(s3Key);
    } catch (err2) {
    }
    return cfg.cantaloupeBaseUrl + "/" + encodeURIComponent(s3Key) + "/info.json";
  }
  function createCompassAdapter({ config: cfg, fetch, isAttemptActive, mountOsdViewer, reportFailure }) {
    function parsePages(manifest) {
      return extractManifestPages(manifest, function(serviceId) {
        return toLocalCantaloupeInfoUrl(serviceId, cfg);
      });
    }
    function fetchManifestUrl(url, mountOptions) {
      var isCompassManifest = new URL(url).hostname === cfg.compassHost;
      var useProxy = cfg.compassProxyUrl && isCompassManifest;
      var requestUrl = useProxy ? cfg.compassProxyUrl + "?url=" + encodeURIComponent(url) : url;
      return fetch(requestUrl, { signal: mountOptions.signal }).then(function(res) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        if (!res.ok) throw new Error((useProxy ? "Proxy HTTP " : "Manifest HTTP ") + res.status);
        return res.json();
      });
    }
    function mountCompass(container, descriptor, mountOptions) {
      var compassBase = cfg.compassBaseUrl || "https://" + cfg.compassHost;
      var fetchManifest;
      if (cfg.compassProxyUrl) {
        fetchManifest = fetch(
          cfg.compassProxyUrl + "?url=" + encodeURIComponent(descriptor.compassUrl),
          { signal: mountOptions.signal }
        ).then(function(res) {
          if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
          if (!res.ok) throw new Error("Proxy HTTP " + res.status);
          return res.json();
        });
      } else {
        fetchManifest = fetch(descriptor.compassUrl, { redirect: "follow", signal: mountOptions.signal }).then(function(res) {
          if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
          var nodeMatch = res.url.match(/\/node\/(\d+)/);
          if (!nodeMatch) throw new Error("Could not resolve Compass node from: " + res.url);
          return fetch(compassBase + "/node/" + nodeMatch[1] + "/manifest", { signal: mountOptions.signal });
        }).then(function(res) {
          if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
          if (!res.ok) throw new Error("Manifest HTTP " + res.status);
          return res.json();
        });
      }
      return fetchManifest.then(function(manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        var tileSources = parsePages(manifest);
        if (!hasRenderablePages(tileSources)) throw new Error("No renderable image services in manifest");
        return mountOsdViewer(container, tileSources, mountOptions);
      }).catch(function(err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, "compass", "content-unavailable");
        throw err;
      });
    }
    return { mountCompass, fetchManifestUrl, parsePages };
  }

  // src/urls.mjs
  function sanitizeUrl(url) {
    var trimmed = typeof url === "string" ? url.trim() : "";
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^\//.test(trimmed)) return trimmed;
    return "";
  }

  // src/adapters/direct.mjs
  function createDirectAdapters({
    document: document2,
    setTimeout,
    clearTimeout,
    mountOsdViewer,
    showError,
    resetContainer,
    addViewerModeActions,
    showLoadingNotice,
    clearLoadingNotice,
    registerAttemptCleanup,
    createFallbackLink
  }) {
    function mountCantaloupe(container, descriptor, mountOptions) {
      return mountOsdViewer(container, descriptor.infoUrl, mountOptions);
    }
    function waitForImageLoad(image, container, options) {
      return new Promise(function(resolve, reject) {
        var settled = false;
        var timeoutId = setTimeout(function() {
          if (settled) return;
          if (options && options.allowFallbackOnTimeout) {
            finish(new Error("STATIC_IMAGE_TIMEOUT"));
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
        image.addEventListener("load", function() {
          finish();
        });
        image.addEventListener("error", function() {
          finish(new Error("STATIC_IMAGE_FAILED"));
        });
        registerAttemptCleanup(options && options.attempt, function() {
          finish(new Error("ATTEMPT_DISPOSED"));
        });
        if (image.complete) {
          if (typeof image.naturalWidth === "number" && image.naturalWidth === 0) {
            finish(new Error("STATIC_IMAGE_FAILED"));
          } else {
            finish();
          }
        }
      });
    }
    function mountStaticImage(container, descriptor, mountOptions) {
      var safeImageUrl = sanitizeUrl(descriptor.imageUrl);
      if (!safeImageUrl) {
        showError(container, "Image not available (unsupported URL)");
        return;
      }
      resetContainer(container);
      container.classList.add("dv-active");
      var wrap = document2.createElement("div");
      wrap.className = "dv-static-image";
      var image = document2.createElement("img");
      image.src = safeImageUrl;
      image.alt = "Digital object image";
      image.style.display = "block";
      image.style.width = "100%";
      image.style.height = "auto";
      wrap.appendChild(image);
      container.appendChild(wrap);
      addViewerModeActions(container, null, [{ imageUrl: safeImageUrl, pageLabel: "Image view" }], mountOptions);
      return waitForImageLoad(image, container, mountOptions);
    }
    function mountVideoViewer(container, sources) {
      var validSources = [];
      container.classList.add("dv-active");
      var wrap = document2.createElement("div");
      wrap.className = "dv-video";
      var video = document2.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      sources.forEach(function(src) {
        var safeUrl = sanitizeUrl(src && src.url);
        var source = document2.createElement("source");
        if (!safeUrl) return;
        source.src = safeUrl;
        if (src.format) source.type = src.format;
        video.appendChild(source);
        validSources.push(src);
      });
      if (validSources.length === 0) {
        showError(container, "Video not available (unsupported URL)");
        return;
      }
      var fallback = document2.createElement("p");
      var fallbackLink = createFallbackLink(validSources[0].url, "Download the video");
      fallback.className = "dv-fallback";
      fallback.appendChild(document2.createTextNode("Your browser does not support video playback. "));
      if (fallbackLink) {
        fallback.appendChild(fallbackLink);
        fallback.appendChild(document2.createTextNode("."));
      }
      video.appendChild(fallback);
      wrap.appendChild(video);
      container.appendChild(wrap);
    }
    function mountAudioViewer(container, sources) {
      var validSources = [];
      container.classList.add("dv-active");
      var wrap = document2.createElement("div");
      wrap.className = "dv-audio";
      var audio = document2.createElement("audio");
      audio.controls = true;
      audio.preload = "metadata";
      sources.forEach(function(src) {
        var safeUrl = sanitizeUrl(src && src.url);
        var source = document2.createElement("source");
        if (!safeUrl) return;
        source.src = safeUrl;
        if (src.format) source.type = src.format;
        audio.appendChild(source);
        validSources.push(src);
      });
      if (validSources.length === 0) {
        showError(container, "Audio not available (unsupported URL)");
        return;
      }
      var fallback = document2.createElement("p");
      var fallbackLink = createFallbackLink(validSources[0].url, "Download the audio");
      fallback.className = "dv-fallback";
      fallback.appendChild(document2.createTextNode("Your browser does not support audio playback. "));
      if (fallbackLink) {
        fallback.appendChild(fallbackLink);
        fallback.appendChild(document2.createTextNode("."));
      }
      audio.appendChild(fallback);
      wrap.appendChild(audio);
      container.appendChild(wrap);
    }
    function mountPdfViewer(container, source) {
      var safeUrl = sanitizeUrl(source && source.url);
      var fallbackLink;
      if (!safeUrl) {
        showError(container, "PDF not available (unsupported URL)");
        return;
      }
      container.classList.add("dv-active");
      var wrap = document2.createElement("div");
      wrap.className = "dv-pdf";
      var iframe = document2.createElement("iframe");
      iframe.src = safeUrl;
      iframe.title = "PDF viewer";
      iframe.setAttribute("allow", "fullscreen");
      var fallback = document2.createElement("p");
      fallback.className = "dv-fallback";
      fallbackLink = createFallbackLink(safeUrl, "Open PDF");
      if (fallbackLink) fallback.appendChild(fallbackLink);
      wrap.appendChild(iframe);
      wrap.appendChild(fallback);
      container.appendChild(wrap);
    }
    return { mountCantaloupe, mountStaticImage, mountVideoViewer, mountAudioViewer, mountPdfViewer };
  }

  // src/adapters/manifest.mjs
  function createManifestAdapter({ fetchManifestUrl, parsePages, isAttemptActive, mountOsdViewer, reportFailure }) {
    function mountManifest(container, descriptor, mountOptions) {
      var fetchManifest = fetchManifestUrl(descriptor.manifestUrl, mountOptions);
      return fetchManifest.then(function(manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        var tileSources = parsePages(manifest);
        if (!hasRenderablePages(tileSources)) throw new Error("No renderable image services in manifest");
        return mountOsdViewer(container, tileSources, mountOptions);
      }).catch(function(err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, "manifest", "content-unavailable");
        throw err;
      });
    }
    return mountManifest;
  }

  // src/adapters/preservica.mjs
  function createPreservicaAdapter({
    config: cfg,
    fetch,
    console: console2,
    isAttemptActive,
    reportFailure,
    clearLoadingNotice,
    mountOsdViewer,
    mountVideoViewer,
    mountAudioViewer,
    mountPdfViewer
  }) {
    function mountPreservica(container, descriptor, mountOptions) {
      if (!cfg.preservicaApiBase) {
        reportFailure(container, "configuration", "preservica-unavailable");
        return Promise.reject(new Error("PRESERVICA_UNAVAILABLE"));
      }
      var manifestUrl = cfg.preservicaApiBase.replace(/\/$/, "") + "/api/iiif/" + descriptor.uuid + "/manifest.json";
      return fetch(manifestUrl, { signal: mountOptions.signal }).then(function(res) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      }).then(function(manifest) {
        if (!isAttemptActive(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        var content = extractManifestContent(manifest, function() {
          console2.warn("[digital_viewer] stage=manifest code=invalid-canvas");
        });
        var total = content.images.length + content.videos.length + content.audio.length + content.pdfs.length;
        if (total === 0) {
          throw new Error("No renderable content found in manifest");
        }
        if (content.videos.length > 0) {
          mountVideoViewer(container, content.videos);
        }
        if (content.audio.length > 0) {
          mountAudioViewer(container, content.audio);
        }
        if (content.images.length > 0) {
          var osdSources = content.images.map(function(img) {
            return { type: "image", url: img.url };
          });
          return mountOsdViewer(container, osdSources.length === 1 ? osdSources[0] : osdSources, mountOptions);
        }
        if (content.pdfs.length > 0) {
          mountPdfViewer(container, content.pdfs[0]);
        }
        clearLoadingNotice(container);
      }).catch(function(err) {
        if (!isAttemptActive(mountOptions.attempt)) throw err;
        reportFailure(container, "preservica", "manifest-unavailable");
        throw err;
      });
    }
    return mountPreservica;
  }

  // src/adapters/index.mjs
  function createSourceAdapters(dependencies) {
    const direct = createDirectAdapters(dependencies);
    const compass = createCompassAdapter(dependencies);
    const manifest = createManifestAdapter(__spreadProps(__spreadValues({}, dependencies), {
      fetchManifestUrl: compass.fetchManifestUrl,
      parsePages: compass.parsePages
    }));
    const preservica = createPreservicaAdapter(__spreadValues(__spreadValues({}, dependencies), direct));
    function pdf(container, descriptor) {
      direct.mountPdfViewer(container, { url: descriptor.url });
      dependencies.clearLoadingNotice(container);
      return Promise.resolve();
    }
    return {
      cantaloupe: direct.mountCantaloupe,
      "static-image": direct.mountStaticImage,
      "static-pdf": pdf,
      compass: compass.mountCompass,
      // Keep the historical descriptor value to preserve selection contracts.
      "compass-manifest": manifest,
      manifest,
      preservica
    };
  }

  // src/tile-sources.mjs
  var THUMBNAIL_SIZE = 160;
  function getTileSourceValue(tileSource) {
    if (!tileSource) return tileSource;
    if (tileSource.tileSource) return tileSource.tileSource;
    return tileSource;
  }
  function isUnavailableTileSource(tileSource) {
    return !!(tileSource && tileSource.unavailable);
  }
  function buildThumbnailUrl(tileSource) {
    var infoUrl;
    if (!tileSource) return "";
    if (tileSource.unavailable) return "";
    if (tileSource.thumbnailUrl) {
      return tileSource.thumbnailUrl;
    }
    if (tileSource.tileSource) {
      return buildThumbnailUrl(tileSource.tileSource);
    }
    if (typeof tileSource === "string") {
      infoUrl = tileSource;
    } else if (tileSource.url) {
      return tileSource.url;
    } else if (tileSource["@id"]) {
      infoUrl = tileSource["@id"];
    } else if (tileSource.id) {
      infoUrl = tileSource.id;
    }
    if (!infoUrl) return "";
    if (/\/info\.json(?:\?.*)?$/i.test(infoUrl)) {
      return infoUrl.replace(/\/info\.json(?:\?.*)?$/i, "/full/!" + THUMBNAIL_SIZE + "," + THUMBNAIL_SIZE + "/0/default.jpg");
    }
    return infoUrl;
  }
  function getTileSourceImageUrl(tileSource) {
    var infoUrl;
    if (!tileSource) return "";
    if (tileSource.imageUrl) {
      return sanitizeUrl(tileSource.imageUrl);
    }
    if (tileSource.tileSource) {
      return getTileSourceImageUrl(tileSource.tileSource);
    }
    if (typeof tileSource === "string") {
      infoUrl = tileSource;
    } else if (tileSource.url) {
      return sanitizeUrl(tileSource.url);
    } else if (tileSource["@id"]) {
      infoUrl = tileSource["@id"];
    } else if (tileSource.id) {
      infoUrl = tileSource.id;
    }
    if (!infoUrl) return "";
    if (/\/info\.json(?:\?.*)?$/i.test(infoUrl)) {
      return sanitizeUrl(infoUrl.replace(/\/info\.json(?:\?.*)?$/i, "/full/full/0/default.jpg"));
    }
    return sanitizeUrl(infoUrl);
  }
  function getCompanionPdfUrl(selection) {
    var companions = selection && Array.isArray(selection.companionCandidates) ? selection.companionCandidates : [];
    var pdfUrl = "";
    companions.some(function(candidate) {
      var descriptor = candidate && candidate.descriptor;
      if (!descriptor || descriptor.type !== "static-pdf" || !descriptor.url) return false;
      pdfUrl = sanitizeUrl(descriptor.url);
      if (!pdfUrl) return false;
      return true;
    });
    return pdfUrl;
  }

  // src/lifecycle.mjs
  function createLifecycle({
    AbortController,
    setTimeout,
    clearTimeout,
    showLoadingNotice,
    restoreLeafLayoutIfUnused
  }) {
    var activeMountStates = [];
    function createAttempt() {
      return {
        active: true,
        disposed: false,
        viewer: null,
        controller: typeof AbortController !== "undefined" ? new AbortController() : null,
        timers: [],
        cleanups: [],
        timeoutId: null
      };
    }
    function disposeViewer(viewer) {
      if (viewer && typeof viewer.destroy === "function") viewer.destroy();
    }
    function isAttemptActive(attempt) {
      return !attempt || attempt.active !== false;
    }
    function registerAttemptCleanup(attempt, cleanup) {
      if (!attempt || typeof cleanup !== "function") return;
      attempt.cleanups.push(cleanup);
    }
    function disposeAttempt(attempt) {
      var cleanups;
      if (!attempt || attempt.disposed) return;
      attempt.disposed = true;
      attempt.active = false;
      clearAttemptTimeout(attempt);
      (attempt.timers || []).forEach(function(timerId) {
        clearTimeout(timerId);
      });
      attempt.timers = [];
      if (attempt.controller && typeof attempt.controller.abort === "function") {
        attempt.controller.abort();
      }
      try {
        if (attempt.viewer) disposeViewer(attempt.viewer);
      } catch (err) {
      }
      cleanups = (attempt.cleanups || []).slice();
      attempt.cleanups = [];
      cleanups.forEach(function(cleanup) {
        try {
          cleanup();
        } catch (err) {
        }
      });
    }
    function clearAttemptTimeout(attempt) {
      if (!attempt || attempt.timeoutId === null || typeof attempt.timeoutId === "undefined") return;
      clearTimeout(attempt.timeoutId);
      attempt.timeoutId = null;
    }
    function scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback) {
      attempt.timeoutId = setTimeout(function() {
        if (!isAttemptActive(attempt) || attempt.completed || attempt.timedOut) return;
        attempt.timeoutId = null;
        attempt.timedOut = true;
        if (allowFallback) {
          disposeAttempt(attempt);
          onFallback();
        } else {
          showLoadingNotice(container);
        }
      }, timeout);
    }
    function disposeMountState(state, options) {
      var activeIndex;
      if (!state || state.disposed) return;
      state.disposed = true;
      disposeAttempt(state.attempt);
      if (state.container) {
        state.container.__dvMountState = null;
        if (state.container.parentNode && typeof state.container.parentNode.removeChild === "function") {
          state.container.parentNode.removeChild(state.container);
        }
      }
      if (state.root && state.root.__dvMountState === state) state.root.__dvMountState = null;
      activeIndex = activeMountStates.indexOf(state);
      if (activeIndex !== -1) activeMountStates.splice(activeIndex, 1);
      if (!options || !options.preserveLayout) restoreLeafLayoutIfUnused(state.layoutPane);
    }
    return { activeMountStates, createAttempt, disposeViewer, isAttemptActive, registerAttemptCleanup, disposeAttempt, clearAttemptTimeout, scheduleAttemptTimeout, disposeMountState };
  }

  // src/events.mjs
  function createViewerScope(viewer, attempt, registerAttemptCleanup) {
    let disposed = false;
    const cleanups = [];
    function listen(target, event, callback) {
      function guarded(eventData) {
        if (disposed || attempt && attempt.active === false) return;
        callback(eventData);
      }
      target.addEventListener(event, guarded);
      cleanups.push(function() {
        if (typeof target.removeEventListener === "function") target.removeEventListener(event, guarded);
      });
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      cleanups.splice(0).forEach(function(cleanup) {
        cleanup();
      });
      if (viewer && typeof viewer.removeHandler === "function") viewer.removeHandler("before-destroy", dispose);
    }
    if (viewer && typeof viewer.addHandler === "function") viewer.addHandler("before-destroy", dispose);
    registerAttemptCleanup(attempt, dispose);
    return { listen, dispose };
  }

  // src/controls.mjs
  function createControls({ document: document2, isAttemptActive, registerAttemptCleanup }) {
    var IMAGE_ADJUSTMENT_STEP = 20;
    var DEFAULT_IMAGE_ADJUSTMENTS = {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      grayscale: 0,
      invert: 0
    };
    var viewerControlInstanceCount = 0;
    function makeButton(icon, title, onClick) {
      var btn = document2.createElement("button");
      btn.type = "button";
      btn.className = "dv-ctrl-btn dv-ctrl-btn--" + icon;
      btn.title = title;
      btn.setAttribute("aria-label", title);
      btn.setAttribute("data-icon", icon);
      btn.addEventListener("click", onClick);
      return btn;
    }
    function setButtonActive(button, active) {
      if (!button) return;
      if (button.classList && typeof button.classList.toggle === "function") {
        button.classList.toggle("is-active", !!active);
      }
    }
    function setButtonPressed(button, pressed) {
      setButtonActive(button, pressed);
      if (button) {
        button.setAttribute("aria-pressed", pressed ? "true" : "false");
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
        invert: DEFAULT_IMAGE_ADJUSTMENTS.invert
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
      if (viewer.element && typeof viewer.element.querySelector === "function") {
        return viewer.element.querySelector(".openseadragon-canvas");
      }
      return null;
    }
    function buildViewerImageFilter(adjustments) {
      return "brightness(" + adjustments.brightness + "%) contrast(" + adjustments.contrast + "%) saturate(" + adjustments.saturation + "%) grayscale(" + adjustments.grayscale + "%) invert(" + adjustments.invert + "%)";
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
      if (typeof viewer.viewport.getFlip === "function") {
        return !!viewer.viewport.getFlip();
      }
      return !!viewer.viewport.flipped;
    }
    function setViewerFlip(viewer, flipped) {
      if (!viewer || !viewer.viewport) return;
      if (typeof viewer.viewport.setFlip === "function") {
        viewer.viewport.setFlip(flipped);
        return;
      }
      if (viewer.viewport.flipped !== flipped && typeof viewer.viewport.toggleFlip === "function") {
        viewer.viewport.toggleFlip();
      }
    }
    function rotateViewer(viewer, direction) {
      var currentRotation;
      if (!viewer || !viewer.viewport || typeof viewer.viewport.getRotation !== "function" || typeof viewer.viewport.setRotation !== "function") {
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
      if (typeof viewer.viewport.setRotation === "function") {
        viewer.viewport.setRotation(0);
      }
      setViewerFlip(viewer, false);
      resetViewerImageAdjustments(viewer);
      if (typeof viewer.viewport.goHome === "function") {
        viewer.viewport.goHome();
      }
      if (typeof viewer.forceRedraw === "function") {
        viewer.forceRedraw();
      }
    }
    function getViewerZoomPercent(viewer) {
      var currentZoom = 1;
      var homeZoom = 1;
      if (viewer && viewer.viewport && typeof viewer.viewport.getZoom === "function") {
        currentZoom = viewer.viewport.getZoom(true);
        if (!isFinite(currentZoom) || currentZoom <= 0) {
          currentZoom = 1;
        }
      }
      if (viewer && viewer.viewport && typeof viewer.viewport.getHomeZoom === "function") {
        homeZoom = viewer.viewport.getHomeZoom();
        if (!isFinite(homeZoom) || homeZoom <= 0) {
          homeZoom = 1;
        }
      }
      return Math.round(currentZoom / homeZoom * 100) + "%";
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
      if (state.root.classList && typeof state.root.classList.toggle === "function") {
        state.root.classList.toggle("is-collapsed", state.isCollapsed);
      }
      if (state.toggleButton) {
        state.toggleButton.setAttribute("aria-expanded", state.isCollapsed ? "false" : "true");
      }
    }
    function setAdjustPopoverOpen(state, open) {
      if (!state) return;
      if (open && state.isCollapsed) return;
      state.isPopoverOpen = !!open;
      if (state.root && state.root.classList && typeof state.root.classList.toggle === "function") {
        state.root.classList.toggle("is-adjust-open", !!open);
      }
      if (state.popover) {
        state.popover.setAttribute("aria-hidden", open ? "false" : "true");
        if (state.popover.classList && typeof state.popover.classList.toggle === "function") {
          state.popover.classList.toggle("is-open", !!open);
        }
      }
      if (state.adjustButton) {
        state.adjustButton.setAttribute("aria-expanded", open ? "true" : "false");
        setButtonActive(state.adjustButton, !!open);
      }
    }
    function syncAdjustPopover(viewer, state) {
      var adjustments;
      if (!state) return;
      adjustments = getViewerImageAdjustments(viewer);
      state.rangeControls.forEach(function(control) {
        var value = adjustments[control.key];
        control.input.value = String(value);
        control.value.textContent = value + "%";
      });
      state.toggleControls.forEach(function(control) {
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
      if (state.fullscreenButton && viewer && typeof viewer.isFullPage === "function") {
        setButtonPressed(state.fullscreenButton, !!viewer.isFullPage());
      }
      syncAdjustPopover(viewer, state);
    }
    function makeAdjustmentRangeControl(viewer, state, label, key) {
      var row = document2.createElement("label");
      var labelText = document2.createElement("span");
      var slider = document2.createElement("input");
      var value = document2.createElement("span");
      row.className = "dv-adjust-control";
      labelText.className = "dv-adjust-label";
      labelText.textContent = label;
      slider.className = "dv-adjust-slider";
      slider.type = "range";
      slider.min = "0";
      slider.max = "200";
      slider.step = "5";
      slider.setAttribute("data-setting", key);
      value.className = "dv-adjust-value";
      slider.addEventListener("input", function(event) {
        var nextValue = event && event.target ? event.target.value : slider.value;
        setViewerImageSetting(viewer, key, nextValue);
        syncToolbarState(viewer, state);
      });
      row.appendChild(labelText);
      row.appendChild(slider);
      row.appendChild(value);
      state.rangeControls.push({ key, input: slider, value });
      return row;
    }
    function makeAdjustmentToggle(viewer, state, title, key, label) {
      var btn = document2.createElement("button");
      btn.type = "button";
      btn.className = "dv-adjust-toggle";
      btn.title = title;
      btn.textContent = label;
      btn.setAttribute("aria-label", title);
      btn.setAttribute("data-setting", key);
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function() {
        toggleViewerImageSetting(viewer, key);
        syncToolbarState(viewer, state);
      });
      state.toggleControls.push({ key, button: btn });
      return btn;
    }
    function makePopoverActionButton(label, title, onClick) {
      var btn = document2.createElement("button");
      btn.type = "button";
      btn.className = "dv-adjust-action";
      btn.title = title;
      btn.textContent = label;
      btn.setAttribute("aria-label", title);
      btn.addEventListener("click", onClick);
      return btn;
    }
    function buildAdjustPopover(viewer, state) {
      var popover = document2.createElement("div");
      var title = document2.createElement("div");
      var actions = document2.createElement("div");
      var body = document2.createElement("div");
      var toggles = document2.createElement("div");
      var footer = document2.createElement("div");
      var resetBtn = document2.createElement("button");
      popover.className = "dv-adjust-popover";
      popover.setAttribute("aria-hidden", "true");
      title.className = "dv-adjust-title";
      title.textContent = "Adjust image";
      actions.className = "dv-adjust-actions";
      actions.appendChild(makePopoverActionButton("Rotate left", "Rotate left 90 degrees", function() {
        rotateViewer(viewer, -1);
        syncToolbarState(viewer, state);
      }));
      actions.appendChild(makePopoverActionButton("Rotate right", "Rotate right 90 degrees", function() {
        rotateViewer(viewer, 1);
        syncToolbarState(viewer, state);
      }));
      state.flipButton = makePopoverActionButton("Flip", "Flip horizontally", function() {
        setViewerFlip(viewer, !isViewerFlipped(viewer));
        syncToolbarState(viewer, state);
      });
      actions.appendChild(state.flipButton);
      state.fullscreenButton = makePopoverActionButton("Fullscreen", "Toggle fullscreen", function() {
        if (typeof viewer.isFullPage === "function" && viewer.isFullPage()) {
          viewer.setFullPage(false);
        } else if (typeof viewer.setFullPage === "function") {
          viewer.setFullPage(true);
        }
        syncToolbarState(viewer, state);
      });
      actions.appendChild(state.fullscreenButton);
      body.className = "dv-adjust-body";
      body.appendChild(makeAdjustmentRangeControl(viewer, state, "Brightness", "brightness"));
      body.appendChild(makeAdjustmentRangeControl(viewer, state, "Contrast", "contrast"));
      body.appendChild(makeAdjustmentRangeControl(viewer, state, "Saturation", "saturation"));
      toggles.className = "dv-adjust-toggles";
      toggles.appendChild(makeAdjustmentToggle(viewer, state, "Toggle greyscale", "grayscale", "Greyscale"));
      toggles.appendChild(makeAdjustmentToggle(viewer, state, "Toggle color invert", "invert", "Invert"));
      footer.className = "dv-adjust-footer";
      resetBtn.type = "button";
      resetBtn.className = "dv-adjust-reset";
      resetBtn.textContent = "Reset image";
      resetBtn.title = "Revert image transforms and adjustments";
      resetBtn.setAttribute("aria-label", "Revert image transforms and adjustments");
      resetBtn.addEventListener("click", function() {
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
      var bar = document2.createElement("div");
      var actions = document2.createElement("div");
      var status = document2.createElement("div");
      var zoomLabel = document2.createElement("span");
      var dismissButton;
      var instanceId = viewerControlInstanceCount;
      function invoke(action) {
        return function() {
          action();
          syncToolbarState(viewer, state);
        };
      }
      bar.className = "dv-controls-bar";
      actions.className = "dv-controls-actions";
      status.className = "dv-controls-status";
      zoomLabel.className = "dv-zoom-label";
      actions.appendChild(makeButton("zoom-out", "Zoom out", invoke(function() {
        if (viewer.viewport && typeof viewer.viewport.zoomBy === "function") {
          viewer.viewport.zoomBy(0.67);
        }
      })));
      actions.appendChild(makeButton("zoom-in", "Zoom in", invoke(function() {
        if (viewer.viewport && typeof viewer.viewport.zoomBy === "function") {
          viewer.viewport.zoomBy(1.5);
        }
      })));
      actions.appendChild(makeButton("home", "Reset zoom to fit", invoke(function() {
        if (viewer.viewport && typeof viewer.viewport.goHome === "function") {
          viewer.viewport.goHome();
        }
      })));
      state.adjustButton = makeButton("adjust", "Adjust image", function() {
        setAdjustPopoverOpen(state, !state.isPopoverOpen);
        syncToolbarState(viewer, state);
      });
      state.adjustButton.setAttribute("aria-haspopup", "dialog");
      state.adjustButton.setAttribute("aria-expanded", "false");
      state.adjustButton.setAttribute("aria-controls", "dv-adjust-popover-" + instanceId);
      actions.appendChild(state.adjustButton);
      status.appendChild(zoomLabel);
      dismissButton = makeButton("collapse", "Hide toolbar", function() {
        setControlsCollapsed(state, true);
        syncToolbarState(viewer, state);
      });
      dismissButton.className += " dv-controls-dismiss";
      status.appendChild(dismissButton);
      state.zoomLabel = zoomLabel;
      bar.appendChild(actions);
      bar.appendChild(status);
      return bar;
    }
    function buildControlsToggle(viewer, state) {
      var toggle = document2.createElement("button");
      toggle.type = "button";
      toggle.className = "dv-controls-toggle";
      toggle.textContent = "Tools";
      toggle.title = "Show toolbar";
      toggle.setAttribute("aria-label", "Show toolbar");
      toggle.setAttribute("aria-expanded", "true");
      toggle.addEventListener("click", function() {
        setControlsCollapsed(state, false);
        syncToolbarState(viewer, state);
      });
      return toggle;
    }
    function addControls(container, viewer, options) {
      var scope = createViewerScope(viewer, options && options.attempt, registerAttemptCleanup);
      var bar = document2.createElement("div");
      var state = {
        root: bar,
        rangeControls: [],
        toggleControls: [],
        isPopoverOpen: false,
        isCollapsed: false
      };
      bar.className = "dv-controls";
      applyViewerImageAdjustments(viewer);
      viewerControlInstanceCount += 1;
      bar.appendChild(buildPrimaryControls(viewer, state));
      state.popover = buildAdjustPopover(viewer, state);
      state.popover.id = state.adjustButton.getAttribute("aria-controls");
      bar.appendChild(state.popover);
      state.toggleButton = buildControlsToggle(viewer, state);
      bar.appendChild(state.toggleButton);
      if (document2 && typeof document2.addEventListener === "function") {
        scope.listen(document2, "click", function(event) {
          if (!state.isPopoverOpen) return;
          if (!event || !event.target) return;
          if (!isElementInside(bar, event.target)) {
            setAdjustPopoverOpen(state, false);
          }
        });
        scope.listen(document2, "keydown", function(event) {
          if (!state.isPopoverOpen || !event) return;
          if (event.key === "Escape" || event.keyCode === 27) {
            setAdjustPopoverOpen(state, false);
            syncToolbarState(viewer, state);
          }
        });
      }
      if (viewer && typeof viewer.addHandler === "function") {
        viewer.addHandler("animation", function() {
          if (!isAttemptActive(options && options.attempt)) return;
          syncToolbarState(viewer, state);
        });
        viewer.addHandler("open", function() {
          if (!isAttemptActive(options && options.attempt)) return;
          applyViewerImageAdjustments(viewer);
          syncToolbarState(viewer, state);
        });
        viewer.addHandler("full-page", function() {
          if (!isAttemptActive(options && options.attempt)) return;
          syncToolbarState(viewer, state);
        });
      }
      setControlsCollapsed(state, false);
      syncToolbarState(viewer, state);
      container.appendChild(bar);
    }
    function addPageNav(container, viewer, total, options) {
      var nav = document2.createElement("div");
      nav.className = "dv-page-nav";
      function pageBtn(label) {
        var btn = document2.createElement("button");
        btn.textContent = label;
        btn.className = "dv-page-btn";
        return btn;
      }
      var prevBtn = pageBtn("\u2039 Prev");
      prevBtn.disabled = true;
      var counter = document2.createElement("span");
      counter.className = "dv-page-counter";
      counter.textContent = "1 / " + total;
      var nextBtn = pageBtn("Next \u203A");
      prevBtn.addEventListener("click", function() {
        viewer.goToPreviousPage();
      });
      nextBtn.addEventListener("click", function() {
        viewer.goToNextPage();
      });
      nav.appendChild(prevBtn);
      nav.appendChild(counter);
      nav.appendChild(nextBtn);
      container.appendChild(nav);
      viewer.addHandler("page", function(data) {
        if (!isAttemptActive(options && options.attempt)) return;
        counter.textContent = data.page + 1 + " / " + total;
        prevBtn.disabled = data.page === 0;
        nextBtn.disabled = data.page === total - 1;
      });
    }
    return { addControls, addPageNav };
  }

  // src/viewer-modes.mjs
  function createViewerModes({ document: document2, isAttemptActive }) {
    function setElementHidden(element, hidden) {
      if (!element) return;
      element.setAttribute("aria-hidden", hidden ? "true" : "false");
      if (element.classList && typeof element.classList.toggle === "function") {
        element.classList.toggle("is-hidden", !!hidden);
      }
    }
    function getViewerModeLabel(state) {
      var currentPage = state.tileSources[state.activePageIndex] || null;
      var pageLabel = currentPage && currentPage.pageLabel;
      if (state.isSequence && state.mode === "object") {
        return "Object view";
      }
      if (pageLabel) {
        return pageLabel;
      }
      if (state.isSequence) {
        return "Page " + (state.activePageIndex + 1);
      }
      return "Image view";
    }
    function syncViewerModeActions(state) {
      var currentPage = state.tileSources[state.activePageIndex] || null;
      var currentPageImageUrl = currentPage ? getTileSourceImageUrl(currentPage) : "";
      var isPageMode = state.mode === "page";
      state.pageDownloadImageUrl = currentPageImageUrl;
      state.root.setAttribute("data-view-mode", state.mode);
      state.modeLabel.textContent = getViewerModeLabel(state);
      if (state.openPageButton) {
        state.openPageButton.textContent = "Open page " + (state.activePageIndex + 1);
        setElementHidden(state.openPageButton, !state.isSequence || isPageMode);
      }
      if (state.backToObjectButton) {
        setElementHidden(state.backToObjectButton, !state.isSequence || !isPageMode);
      }
      if (state.downloadPdfLink) {
        if (state.objectDownloadPdfUrl) {
          state.downloadPdfLink.setAttribute("href", state.objectDownloadPdfUrl);
        } else {
          state.downloadPdfLink.removeAttribute("href");
        }
        setElementHidden(state.downloadPdfLink, !state.objectDownloadPdfUrl || isPageMode);
      }
      if (state.downloadImageLink) {
        if (currentPageImageUrl) {
          state.downloadImageLink.setAttribute("href", currentPageImageUrl);
        } else {
          state.downloadImageLink.removeAttribute("href");
        }
        setElementHidden(
          state.downloadImageLink,
          !currentPageImageUrl || state.isSequence && !isPageMode
        );
      }
    }
    function addViewerModeActions(container, viewer, tileSources, options) {
      var pages = Array.isArray(tileSources) ? tileSources.slice() : [tileSources];
      var isSequence = pages.length > 1;
      var objectDownloadPdfUrl = options && options.objectDownloadPdfUrl || "";
      var root = document2.createElement("div");
      var status = document2.createElement("div");
      var modeLabel = document2.createElement("span");
      var actions = document2.createElement("div");
      var openPageButton = document2.createElement("button");
      var backToObjectButton = document2.createElement("button");
      var downloadPdfLink = document2.createElement("a");
      var downloadImageLink = document2.createElement("a");
      var state;
      if (!isSequence && !objectDownloadPdfUrl && !getTileSourceImageUrl(pages[0])) {
        return null;
      }
      root.className = "dv-mode-actions";
      status.className = "dv-mode-status";
      modeLabel.className = "dv-mode-label";
      status.appendChild(modeLabel);
      actions.className = "dv-mode-buttons";
      openPageButton.type = "button";
      openPageButton.className = "dv-mode-btn";
      openPageButton.setAttribute("data-action", "open-page");
      openPageButton.addEventListener("click", function() {
        state.mode = "page";
        syncViewerModeActions(state);
      });
      backToObjectButton.type = "button";
      backToObjectButton.className = "dv-mode-btn";
      backToObjectButton.textContent = "Back to object";
      backToObjectButton.setAttribute("data-action", "back-to-object");
      backToObjectButton.addEventListener("click", function() {
        state.mode = "object";
        syncViewerModeActions(state);
      });
      downloadPdfLink.className = "dv-mode-link";
      downloadPdfLink.textContent = "Download PDF";
      downloadPdfLink.target = "_blank";
      downloadPdfLink.rel = "noopener";
      downloadPdfLink.setAttribute("data-action", "download-pdf");
      downloadImageLink.className = "dv-mode-link";
      downloadImageLink.textContent = "Download image";
      downloadImageLink.target = "_blank";
      downloadImageLink.rel = "noopener";
      downloadImageLink.setAttribute("data-action", "download-image");
      actions.appendChild(openPageButton);
      actions.appendChild(backToObjectButton);
      actions.appendChild(downloadPdfLink);
      actions.appendChild(downloadImageLink);
      root.appendChild(status);
      root.appendChild(actions);
      state = {
        root,
        tileSources: pages,
        isSequence,
        mode: isSequence ? "object" : "page",
        activePageIndex: 0,
        objectDownloadPdfUrl: sanitizeUrl(objectDownloadPdfUrl),
        pageDownloadImageUrl: "",
        modeLabel,
        openPageButton,
        backToObjectButton,
        downloadPdfLink,
        downloadImageLink
      };
      if (viewer && typeof viewer.addHandler === "function") {
        viewer.addHandler("page", function(data) {
          if (!isAttemptActive(options && options.attempt)) return;
          if (!data || typeof data.page !== "number") return;
          state.activePageIndex = data.page;
          syncViewerModeActions(state);
        });
      }
      syncViewerModeActions(state);
      container.appendChild(root);
      return state;
    }
    return { addViewerModeActions };
  }

  // src/prefetch.mjs
  var SEQUENCE_PRELOAD_DISTANCE = 2;
  function getPreloadPageIndexes(activeIndex, total, distance) {
    var indexes = [];
    var radius = typeof distance === "number" ? distance : SEQUENCE_PRELOAD_DISTANCE;
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
  function createPrefetch({ fetch, Image, registerAttemptCleanup }) {
    var warmedResourceUrls = {};
    function primeResourceUrl(url, useFetch, options) {
      var attempt = options && options.attempt;
      if (attempt && attempt.active === false) return;
      var warmed = attempt ? attempt.warmedResourceUrls || (attempt.warmedResourceUrls = {}) : warmedResourceUrls;
      if (!url || warmed[url]) return;
      warmed[url] = true;
      if (useFetch && typeof fetch === "function") {
        var request;
        try {
          request = fetch(url, { cache: "force-cache", signal: attempt && attempt.controller ? attempt.controller.signal : void 0 });
        } catch (err) {
          delete warmed[url];
          return;
        }
        Promise.resolve(request).then(function(res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        }).catch(function() {
          delete warmed[url];
        });
        return;
      }
      if (typeof Image !== "undefined") {
        var image = new Image();
        image.decoding = "async";
        image.loading = "eager";
        if (attempt && registerAttemptCleanup) registerAttemptCleanup(attempt, function() {
          image.removeAttribute("src");
        });
        image.src = url;
      }
    }
    function warmSequenceCache(tileSources, activeIndex, options) {
      getPreloadPageIndexes(activeIndex, tileSources.length, SEQUENCE_PRELOAD_DISTANCE).forEach(function(index) {
        var tileSource = tileSources[index];
        var osdTileSource = getTileSourceValue(tileSource);
        if (typeof osdTileSource === "string" && /\/info\.json(?:\?.*)?$/i.test(osdTileSource)) {
          primeResourceUrl(osdTileSource, true, options);
        }
      });
    }
    return { primeResourceUrl, warmSequenceCache };
  }

  // src/thumbnails.mjs
  function createThumbnails({
    document: document2,
    IntersectionObserver,
    setTimeout,
    clearTimeout,
    isAttemptActive,
    registerAttemptCleanup,
    warmSequenceCache
  }) {
    var THUMBNAIL_TIMEOUT_MS = 1e4;
    function addThumbnailCarousel(container, viewer, tileSources, options) {
      var carousel = document2.createElement("div");
      var prevBtn = document2.createElement("button");
      var nextBtn = document2.createElement("button");
      var viewport = document2.createElement("div");
      var track = document2.createElement("div");
      var buttons = [];
      var thumbnailQueue = [];
      var cancelActiveThumbnail = null;
      var disposed = false;
      var thumbnailObserver;
      function loadNextThumbnail() {
        if (disposed || cancelActiveThumbnail || thumbnailQueue.length === 0) return;
        var image = thumbnailQueue.shift();
        var completed = false;
        var timerId;
        function finish(cancelRequest) {
          if (completed) return;
          completed = true;
          clearTimeout(timerId);
          image.removeEventListener("load", onComplete);
          image.removeEventListener("error", onComplete);
          if (cancelRequest) image.removeAttribute("src");
          cancelActiveThumbnail = null;
          loadNextThumbnail();
        }
        function onComplete() {
          finish(false);
        }
        cancelActiveThumbnail = function() {
          finish(true);
        };
        image.addEventListener("load", onComplete, { once: true });
        image.addEventListener("error", onComplete, { once: true });
        timerId = setTimeout(cancelActiveThumbnail, THUMBNAIL_TIMEOUT_MS);
        image.src = image.dataset.thumbnailUrl;
      }
      function queueThumbnail(image) {
        if (disposed || image.dataset.thumbnailQueued) return;
        image.dataset.thumbnailQueued = "true";
        thumbnailQueue.push(image);
        loadNextThumbnail();
      }
      if (typeof IntersectionObserver !== "undefined") {
        thumbnailObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            queueThumbnail(entry.target);
            thumbnailObserver.unobserve(entry.target);
          });
        }, { root: viewport, rootMargin: "100px" });
      }
      function updateArrowState() {
        prevBtn.disabled = viewport.scrollLeft <= 0;
        nextBtn.disabled = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 1;
      }
      function updateActive(index) {
        buttons.forEach(function(button, buttonIndex) {
          var isActive = buttonIndex === index;
          if (button.classList && button.classList.toggle) {
            button.classList.toggle("is-active", isActive);
          }
          button.setAttribute("aria-current", isActive ? "true" : "false");
          if (isActive && button.scrollIntoView) {
            button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }
        });
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(updateArrowState);
        } else {
          updateArrowState();
        }
      }
      carousel.className = "dv-thumbnail-carousel";
      prevBtn.type = "button";
      prevBtn.className = "dv-thumbnail-carousel-btn";
      prevBtn.textContent = "\u2039";
      prevBtn.setAttribute("aria-label", "Scroll thumbnails backward");
      nextBtn.type = "button";
      nextBtn.className = "dv-thumbnail-carousel-btn";
      nextBtn.textContent = "\u203A";
      nextBtn.setAttribute("aria-label", "Scroll thumbnails forward");
      viewport.className = "dv-thumbnail-viewport";
      track.className = "dv-thumbnail-track";
      prevBtn.addEventListener("click", function() {
        viewport.scrollBy({ left: -Math.max(viewport.clientWidth * 0.75, 220), behavior: "smooth" });
      });
      nextBtn.addEventListener("click", function() {
        viewport.scrollBy({ left: Math.max(viewport.clientWidth * 0.75, 220), behavior: "smooth" });
      });
      viewport.addEventListener("scroll", updateArrowState);
      tileSources.forEach(function(tileSource, index) {
        var thumbnailUrl = buildThumbnailUrl(tileSource);
        var button = document2.createElement("button");
        var image = document2.createElement("img");
        var label = document2.createElement("span");
        button.type = "button";
        button.className = "dv-thumbnail-btn";
        button.setAttribute("aria-label", "Go to image " + (index + 1));
        button.addEventListener("click", function() {
          if (disposed || !isAttemptActive(options && options.attempt)) return;
          viewer.goToPage(index);
          warmSequenceCache(tileSources, index, options);
        });
        image.className = "dv-thumbnail-img";
        image.alt = "Thumbnail " + (index + 1);
        image.decoding = "async";
        if (thumbnailUrl) {
          image.dataset.thumbnailUrl = thumbnailUrl;
          if (thumbnailObserver) {
            thumbnailObserver.observe(image);
          } else {
            queueThumbnail(image);
          }
        }
        label.className = "dv-thumbnail-label";
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
      viewer.addHandler("page", function(data) {
        if (disposed || !isAttemptActive(options && options.attempt)) return;
        updateActive(data.page);
      });
      function disposeThumbnails() {
        if (disposed) return;
        disposed = true;
        thumbnailQueue = [];
        if (thumbnailObserver) thumbnailObserver.disconnect();
        if (cancelActiveThumbnail) cancelActiveThumbnail();
      }
      viewer.addHandler("before-destroy", disposeThumbnails);
      registerAttemptCleanup(options && options.attempt, disposeThumbnails);
    }
    return { addThumbnailCarousel };
  }

  // src/viewer.mjs
  function createViewer({
    document: document2,
    OpenSeadragon,
    setTimeout,
    clearTimeout,
    resetContainer,
    showLoadingNotice,
    clearLoadingNotice,
    isAttemptActive,
    disposeViewer,
    registerAttemptCleanup,
    addControls,
    addPageNav,
    addViewerModeActions,
    addThumbnailCarousel,
    warmSequenceCache,
    primeResourceUrl
  }) {
    function mountOsdViewer(container, tileSources, options) {
      var openPromise;
      var mountOptions = options || {};
      var tileTimerId = null;
      var firstTileReady = false;
      var attempt = mountOptions.attempt;
      var activePageIndex = 0;
      var pageErrorMessage = null;
      var pageErrorState = null;
      var imagePageOwners = [];
      var currentTiledImage = null;
      var activeSourceRequest = null;
      var viewerDisposed = false;
      resetContainer(container);
      container.classList.add("dv-active");
      var osdEl = document2.createElement("div");
      osdEl.className = "dv-osd";
      container.appendChild(osdEl);
      var isSequence = Array.isArray(tileSources) && tileSources.length > 1;
      var osdTileSources = isSequence ? tileSources.map(getTileSourceValue) : getTileSourceValue(tileSources);
      var viewer = OpenSeadragon({
        element: osdEl,
        sequenceMode: isSequence,
        initialPage: 0,
        showNavigationControl: false,
        showSequenceControl: false,
        // we use our own prev/next buttons
        prefixUrl: "",
        // suppress OSD's built-in image loading
        defaultZoomLevel: 0,
        minZoomLevel: 0.05,
        animationTime: 0.3,
        gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
        crossOriginPolicy: "Anonymous"
      });
      if (attempt) attempt.viewer = viewer;
      openPromise = new Promise(function(resolve, reject) {
        var settled = false;
        var timeoutId = null;
        if (!attempt) {
          timeoutId = setTimeout(function() {
            if (settled) return;
            if (mountOptions.allowFallbackOnTimeout) {
              settled = true;
              disposeViewer(viewer);
              reject(new Error("OSD_TIMEOUT"));
            } else {
              showLoadingNotice(container);
            }
          }, getLoadingTimeout(mountOptions));
        }
        function settleOpen() {
          if (settled) {
            if (isUnavailableTileSource(tileSources[activePageIndex])) {
              showPageError({ page: activePageIndex });
            }
            return;
          }
          settled = true;
          if (timeoutId !== null) clearTimeout(timeoutId);
          clearLoadingNotice(container);
          resolve(viewer);
          if (document2.defaultView && document2.defaultView.CustomEvent && container.dispatchEvent) {
            container.dispatchEvent(new document2.defaultView.CustomEvent("digital-viewer:open", {
              bubbles: true,
              detail: { viewer }
            }));
          }
          if (isUnavailableTileSource(tileSources[activePageIndex])) {
            showPageError({ page: activePageIndex });
          }
          if (!firstTileReady) {
            tileTimerId = setTimeout(function() {
              if (!firstTileReady) showLoadingNotice(container);
            }, getLoadingTimeout(mountOptions));
          }
        }
        function settleOpenFailure(error) {
          if (settled) return;
          settled = true;
          if (timeoutId !== null) clearTimeout(timeoutId);
          disposeViewer(viewer);
          reject(error || new Error("OSD_OPEN_FAILED"));
        }
        function getCurrentTiledImage() {
          var tiledImage;
          if (!viewer.world || typeof viewer.world.getItemAt !== "function") return null;
          tiledImage = viewer.world.getItemAt(0) || null;
          if (!tiledImage) currentTiledImage = null;
          return tiledImage;
        }
        function rememberCurrentTiledImage(pageIndex) {
          var tiledImage = getCurrentTiledImage();
          var owner;
          var changed;
          if (!tiledImage) {
            currentTiledImage = null;
            return null;
          }
          changed = currentTiledImage !== tiledImage;
          currentTiledImage = tiledImage;
          owner = imagePageOwners.filter(function(entry) {
            return entry.tiledImage === tiledImage;
          })[0];
          if (!owner) {
            owner = { tiledImage, pageIndex };
            imagePageOwners.push(owner);
          }
          if (changed) clearPageErrorForReload(pageIndex, tiledImage);
          return tiledImage;
        }
        function sourcePageIndex(source) {
          var index;
          var candidate;
          if (!source) return null;
          for (index = 0; index < osdTileSources.length; index += 1) {
            candidate = osdTileSources[index];
            if (candidate === source) return index;
            if (typeof candidate === "string" && typeof source === "string" && candidate === source) return index;
            if (candidate && source && candidate.url && source.url && candidate.url === source.url) return index;
            if (candidate && candidate.url && typeof source === "string" && candidate.url === source) return index;
            if (typeof candidate === "string" && source && source.url && candidate === source.url) return index;
          }
          return null;
        }
        function eventPageInfo(data) {
          var tiledImage = data && (data.tiledImage || data.tile && data.tile.tiledImage);
          var source = data && (data.source || data.tileSource);
          var actualCurrentTiledImage = getCurrentTiledImage();
          var owner;
          var index;
          if (tiledImage) {
            owner = imagePageOwners.filter(function(entry) {
              return entry.tiledImage === tiledImage;
            })[0];
            if (owner) {
              return {
                pageIndex: owner.pageIndex,
                current: tiledImage === actualCurrentTiledImage && owner.pageIndex === activePageIndex,
                tiledImage,
                tile: data && data.tile
              };
            }
            if (tiledImage === actualCurrentTiledImage) {
              rememberCurrentTiledImage(activePageIndex);
              return {
                pageIndex: activePageIndex,
                current: true,
                tiledImage,
                tile: data && data.tile
              };
            }
            return null;
          }
          if (data && typeof data.page === "number") {
            return {
              pageIndex: data.page,
              current: data.page === activePageIndex && !!actualCurrentTiledImage,
              tiledImage: actualCurrentTiledImage,
              tile: data.tile
            };
          }
          if (data && data.source && typeof data.source.index === "number") {
            return {
              pageIndex: data.source.index,
              current: data.source.index === activePageIndex && !!actualCurrentTiledImage,
              tiledImage: actualCurrentTiledImage,
              tile: data.tile
            };
          }
          if (data && data.item && typeof data.item.index === "number") {
            return {
              pageIndex: data.item.index,
              current: data.item.index === activePageIndex && !!actualCurrentTiledImage,
              tiledImage: actualCurrentTiledImage,
              tile: data.tile
            };
          }
          if (data && data.item && data.item.source && typeof data.item.source.index === "number") {
            return {
              pageIndex: data.item.source.index,
              current: data.item.source.index === activePageIndex && !!actualCurrentTiledImage,
              tiledImage: actualCurrentTiledImage,
              tile: data.tile
            };
          }
          index = sourcePageIndex(source);
          if (index !== null) {
            return {
              pageIndex: index,
              current: index === activePageIndex && !!actualCurrentTiledImage,
              tiledImage: actualCurrentTiledImage,
              tile: data && data.tile
            };
          }
          return {
            pageIndex: activePageIndex,
            current: !!actualCurrentTiledImage,
            tiledImage: actualCurrentTiledImage,
            tile: data && data.tile
          };
        }
        function removePageError() {
          if (pageErrorMessage && pageErrorMessage.parentNode) pageErrorMessage.parentNode.removeChild(pageErrorMessage);
          pageErrorMessage = null;
          pageErrorState = null;
        }
        function clearPageErrorForReload(pageIndex, tiledImage) {
          if (!pageErrorState || pageErrorState.pageIndex !== pageIndex || !tiledImage) return;
          if (pageErrorState.tiledImage !== tiledImage) removePageError();
        }
        function clearPageError(data, info) {
          var failedTileIndex;
          info = info || eventPageInfo(data);
          if (!pageErrorState || !info || info.pageIndex !== pageErrorState.pageIndex || info.current === false) return;
          if (pageErrorState.tiledImage && info.tiledImage && pageErrorState.tiledImage !== info.tiledImage) return;
          if (pageErrorState.requiresReload) return;
          if (info.tile) {
            failedTileIndex = pageErrorState.tiles.indexOf(info.tile);
            if (failedTileIndex !== -1) pageErrorState.tiles.splice(failedTileIndex, 1);
            if (pageErrorState.tiles.length > 0) return;
          }
          removePageError();
        }
        function showPageError(data, options2) {
          var info = eventPageInfo(data);
          var message;
          if (!info || info.pageIndex === null || info.pageIndex !== activePageIndex) return;
          if (info.current === false && !(options2 && options2.allowWithoutImage)) return;
          if (!pageErrorState || pageErrorState.pageIndex !== info.pageIndex || pageErrorState.tiledImage && info.tiledImage && pageErrorState.tiledImage !== info.tiledImage) {
            pageErrorState = {
              pageIndex: info.pageIndex,
              tiledImage: info.tiledImage || currentTiledImage,
              tiles: [],
              requiresReload: false
            };
          }
          if (info.tile && pageErrorState.tiles.indexOf(info.tile) === -1) pageErrorState.tiles.push(info.tile);
          if (!info.tile) pageErrorState.requiresReload = true;
          if (pageErrorMessage) return;
          message = document2.createElement("p");
          message.className = "dv-tile-error-msg";
          message.setAttribute("data-page-index", String(info.pageIndex));
          message.textContent = "This page is unavailable.";
          container.appendChild(message);
          pageErrorMessage = message;
        }
        function isCurrentSourceRequest(request) {
          return !viewerDisposed && isAttemptActive(attempt) && request && request === activeSourceRequest && request.pageIndex === activePageIndex;
        }
        var addTiledImage = viewer.addTiledImage;
        viewer.addTiledImage = function(options2) {
          var requestOptions = Object.assign({}, options2);
          var request = {
            options: requestOptions,
            pageIndex: typeof viewer.currentPage === "function" ? viewer.currentPage() : activePageIndex,
            completed: false
          };
          activePageIndex = request.pageIndex;
          activeSourceRequest = request;
          function guardCallback(callback) {
            return function() {
              if (!isCurrentSourceRequest(request) || request.completed) return;
              request.completed = true;
              if (typeof callback === "function") return callback.apply(this, arguments);
            };
          }
          requestOptions.success = guardCallback(options2.success);
          requestOptions.error = guardCallback(options2.error);
          return addTiledImage.call(this, requestOptions);
        };
        viewer.addHandler("open", function() {
          if (!isAttemptActive(attempt)) return;
          rememberCurrentTiledImage(activePageIndex);
          settleOpen();
        });
        viewer.addHandler("open-failed", function(data) {
          if (!isCurrentSourceRequest(activeSourceRequest) || !data || data.options !== activeSourceRequest.options) return;
          rememberCurrentTiledImage(activePageIndex);
          if (settled) showPageError({ page: activeSourceRequest.pageIndex }, { allowWithoutImage: true });
          else settleOpenFailure(new Error("OSD_OPEN_FAILED"));
        });
        viewer.addHandler("close", function() {
          currentTiledImage = null;
          activeSourceRequest = null;
        });
        viewer.addHandler("page", function(data) {
          if (!isAttemptActive(attempt)) return;
          if (!data || typeof data.page !== "number") return;
          activePageIndex = data.page;
          rememberCurrentTiledImage(activePageIndex);
          removePageError();
          if (isUnavailableTileSource(tileSources[activePageIndex])) {
            showPageError({ page: activePageIndex }, { allowWithoutImage: true });
          }
        });
        viewer.addHandler("tile-ready", function(data) {
          var info;
          if (!isAttemptActive(attempt)) return;
          info = eventPageInfo(data);
          if (!info || info.pageIndex === null || info.current === false) return;
          firstTileReady = true;
          if (tileTimerId !== null) clearTimeout(tileTimerId);
          clearLoadingNotice(container);
          if (!isUnavailableTileSource(tileSources[info.pageIndex])) clearPageError(data, info);
        });
        viewer.addHandler("tile-load-failed", function(data) {
          if (!isAttemptActive(attempt)) return;
          showPageError(data);
        });
        viewer.addHandler("before-destroy", function() {
          viewerDisposed = true;
          activeSourceRequest = null;
          if (timeoutId !== null) clearTimeout(timeoutId);
          if (!settled) {
            settled = true;
            reject(new Error("ATTEMPT_DISPOSED"));
          }
          if (tileTimerId !== null) clearTimeout(tileTimerId);
        });
        registerAttemptCleanup(attempt, function() {
          settleOpenFailure(new Error("ATTEMPT_DISPOSED"));
        });
        try {
          viewer.open(osdTileSources);
        } catch (err) {
          settleOpenFailure(err);
        }
      });
      addControls(osdEl, viewer, mountOptions);
      addViewerModeActions(container, viewer, tileSources, mountOptions);
      if (isSequence) {
        addPageNav(container, viewer, tileSources.length, mountOptions);
        addThumbnailCarousel(container, viewer, tileSources, mountOptions);
        warmSequenceCache(tileSources, 0, mountOptions);
        viewer.addHandler("page", function(data) {
          if (!isAttemptActive(attempt)) return;
          warmSequenceCache(tileSources, data.page, mountOptions);
        });
      } else if (buildThumbnailUrl(tileSources)) {
        primeResourceUrl(buildThumbnailUrl(tileSources), false, mountOptions);
      }
      return openPromise;
    }
    return { mountOsdViewer };
  }

  // src/status.mjs
  function createStatus({ document: document2, console: console2 }) {
    function createFallbackLink(url, label) {
      var safeUrl = sanitizeUrl(url);
      var link;
      if (!safeUrl) return null;
      link = document2.createElement("a");
      link.href = safeUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = label;
      return link;
    }
    function showError(container, message) {
      var paragraph;
      container.classList.add("dv-active", "dv-error");
      container.innerHTML = "";
      paragraph = document2.createElement("p");
      paragraph.className = "dv-error-msg";
      paragraph.textContent = message;
      container.appendChild(paragraph);
    }
    function reportFailure(container, stage, code) {
      var stages = {
        configuration: true,
        preservica: true,
        compass: true,
        manifest: true,
        viewer: true
      };
      var codes = {
        "preservica-unavailable": true,
        "manifest-unavailable": true,
        "content-unavailable": true
      };
      var safeStage = stages[stage] ? stage : "viewer";
      var safeCode = codes[code] ? code : "content-unavailable";
      console2.warn("[digital_viewer] stage=" + safeStage + " code=" + safeCode);
      showError(container, "Digital content unavailable.");
    }
    function showLoadingNotice(container) {
      var notice;
      if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = true;
      if (!container || container.querySelector(".dv-loading-msg")) return;
      notice = document2.createElement("p");
      notice.className = "dv-loading-msg";
      notice.textContent = "Still loading";
      container.appendChild(notice);
    }
    function clearLoadingNotice(container) {
      var notice = container && container.querySelector(".dv-loading-msg");
      if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = false;
      if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
    }
    function resetContainer(container) {
      var preserveLoading = !!(container && container.querySelector && container.querySelector(".dv-loading-msg")) || !!(container && container.__dvMountAttempt && container.__dvMountAttempt.loadingShown);
      container.className = "digital-viewer-container";
      container.innerHTML = "";
      if (preserveLoading) showLoadingNotice(container);
    }
    return { createFallbackLink, showError, reportFailure, showLoadingNotice, clearLoadingNotice, resetContainer };
  }

  // src/page-sources.mjs
  function createPageSources({ document: document2, getPageContext, onDiscoveryError, onContractFailure }) {
    var sourceGroupCount = 0;
    function collectSourceAnchors(root) {
      var selectors = [
        "[data-additional-file-version] a[href]",
        ".available-digital-objects a.external-digital-object__link[href]",
        ".available-digital-objects a.thumbnail[href]",
        "[data-rep-file-version-wrapper] > a[href]",
        "[data-file-uri]"
      ];
      var results = [];
      var seen = [];
      if (!root || typeof root.querySelectorAll !== "function") return results;
      selectors.forEach(function(selector) {
        var elements = root.querySelectorAll(selector);
        for (var i = 0; i < elements.length; i += 1) {
          if (elements[i].closest && elements[i].closest("[data-dv-browse-only]")) continue;
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
      var anchors = collectSourceAnchors(document2);
      anchors.forEach(function(anchor) {
        var uri2 = anchor.dataset && anchor.dataset.fileUri ? anchor.dataset.fileUri : anchor.href;
        if (uri2) results.push({ uri: uri2, anchor });
      });
      var dts = document2.querySelectorAll("dt");
      for (var j = 0; j < dts.length; j += 1) {
        if (/file\s+uri/i.test(dts[j].textContent)) {
          var dd = dts[j].nextElementSibling;
          if (dd) {
            var a = dd.querySelector("a");
            var uri = a ? a.href : dd.textContent.trim();
            if (uri) results.push({ uri, anchor: a || dd });
          }
        }
      }
      return results;
    }
    function findGroupRoot(anchor) {
      var root;
      var pageContext = getPageContext();
      if (pageContext.recordType === "DigitalObject" && pageContext.hasChildren === false && pageContext.paneExists) {
        root = document2.querySelector("#notes_row > .resizable-content-pane");
      }
      if (!root && anchor.closest) {
        root = anchor.closest("[data-dv-source-group]") || anchor.closest(
          "[data-additional-file-version], [data-rep-file-version-wrapper], .objectimage, .record-pane, .digital-object, .instance"
        ) || anchor.parentNode;
      } else if (!root) {
        root = anchor.parentNode;
      }
      if (root && root.setAttribute && !root.getAttribute("data-dv-source-group")) {
        sourceGroupCount += 1;
        root.setAttribute("data-dv-source-group", "render-" + sourceGroupCount);
      }
      return root;
    }
    function auditSourceContract() {
      const expected = document2.querySelectorAll("[data-dv-source-expected]");
      for (const element of expected) {
        const uri = element.getAttribute("data-file-uri");
        if (!uri || !uri.trim()) {
          if (onContractFailure) onContractFailure("source-contract-missing");
          return;
        }
      }
    }
    function collectGroups() {
      auditSourceContract();
      var fileUris = collectFileUris();
      var groups = [];
      fileUris.forEach(function(item) {
        var root;
        try {
          root = findGroupRoot(item.anchor);
        } catch (err) {
          if (onDiscoveryError) onDiscoveryError();
          return;
        }
        var group = null;
        var idx;
        for (idx = 0; idx < groups.length; idx += 1) {
          if (groups[idx].root === root) {
            group = groups[idx];
            break;
          }
        }
        if (!group) {
          group = { root, items: [] };
          groups.push(group);
        }
        if (!group.items.some(function(existing) {
          return existing.uri === item.uri;
        })) {
          group.items.push(item);
        }
      });
      return groups;
    }
    return { collectSourceAnchors, collectFileUris, collectGroups };
  }

  // src/page-layout.mjs
  function classifyPageContext(context) {
    if (!context || !context.paneExists) return "inline-fallback";
    if (context.recordType === "DigitalObject" && context.hasChildren === false) {
      return "leaf-digital-object";
    }
    return "stock";
  }
  function createPageLayout({ document: document2 }) {
    function findInsertAfter(anchor) {
      var sourceGroup = anchor.closest ? anchor.closest("[data-dv-source-group]") : null;
      if (sourceGroup) return sourceGroup;
      if (anchor.classList && anchor.classList.contains("external-digital-object__link")) {
        var availBlock = anchor.closest ? anchor.closest(".available-digital-objects") : null;
        return availBlock || anchor.parentNode;
      }
      if (anchor.closest && anchor.closest("[data-additional-file-version]")) {
        return anchor.closest(".panel") || anchor.parentNode;
      }
      return (anchor.closest ? anchor.closest("dl, .digital-object, .instance") : null) || anchor.parentNode;
    }
    function getPageContext() {
      var context = document2.querySelector("[data-dv-page-context]");
      var dataset = context && context.dataset ? context.dataset : {};
      return {
        recordType: dataset.recordType || "",
        hasChildren: dataset.hasChildren === "true",
        paneExists: !!document2.querySelector("#notes_row > .resizable-content-pane")
      };
    }
    function prepareLeafLayout() {
      var pane = document2.querySelector("#notes_row > .resizable-content-pane");
      var metadataColumn;
      var viewerColumn;
      if (!pane || !pane.children) return null;
      viewerColumn = pane.querySelector("#dv-viewer-column");
      if (viewerColumn) {
        pane.classList.add("dv-enhanced-pane");
        return viewerColumn;
      }
      metadataColumn = document2.createElement("div");
      metadataColumn.className = "dv-metadata-column";
      viewerColumn = document2.createElement("div");
      viewerColumn.id = "dv-viewer-column";
      viewerColumn.className = "dv-viewer-column";
      while (pane.firstChild) {
        metadataColumn.appendChild(pane.firstChild);
      }
      pane.appendChild(metadataColumn);
      pane.appendChild(viewerColumn);
      pane.classList.add("dv-enhanced-pane");
      pane.__dvLeafLayoutState = {
        pane,
        metadataColumn,
        viewerColumn
      };
      return viewerColumn;
    }
    function restoreLeafLayoutIfUnused(pane, activeMountStates) {
      var layoutState;
      var metadataColumn;
      var viewerColumn;
      var hasActiveMount = false;
      if (!pane) return;
      activeMountStates.some(function(state) {
        if (state && !state.disposed && state.layoutPane === pane) {
          hasActiveMount = true;
          return true;
        }
        return false;
      });
      if (hasActiveMount) return;
      layoutState = pane.__dvLeafLayoutState;
      metadataColumn = layoutState && layoutState.metadataColumn || pane.querySelector(".dv-metadata-column");
      viewerColumn = layoutState && layoutState.viewerColumn || pane.querySelector("#dv-viewer-column");
      if (!metadataColumn && !viewerColumn) return;
      if (metadataColumn) {
        while (metadataColumn.firstChild) pane.appendChild(metadataColumn.firstChild);
        if (metadataColumn.parentNode) metadataColumn.parentNode.removeChild(metadataColumn);
      }
      if (viewerColumn && viewerColumn.parentNode) viewerColumn.parentNode.removeChild(viewerColumn);
      pane.classList.remove("dv-enhanced-pane");
      pane.__dvLeafLayoutState = null;
    }
    return { findInsertAfter, getPageContext, prepareLeafLayout, restoreLeafLayoutIfUnused };
  }

  // src/source-selection.mjs
  var UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  var DEEP_ZOOM_RE = /\.(tiff?|jp2)(\?.*)?$/i;
  var STATIC_IMAGE_RE = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
  var PDF_RE = /\.pdf(\?.*)?$/i;
  function detectSource(fileUri, cfg) {
    var uriUrl;
    if (!fileUri) return null;
    var normalizedUri = fileUri.replace(/^\/\//, "https://");
    try {
      uriUrl = new URL(normalizedUri);
    } catch (err) {
      uriUrl = null;
    }
    var isCompassHost = !!cfg.compassHost && !!uriUrl && uriUrl.hostname.toLowerCase() === cfg.compassHost;
    if (/^https?:\/\//i.test(normalizedUri) && PDF_RE.test(normalizedUri)) {
      return { type: "static-pdf", url: normalizedUri };
    }
    if (isCompassHost && cfg.cantaloupeBaseUrl && normalizedUri.indexOf("/system/files/") !== -1) {
      var marker = "/system/files/";
      var pos = normalizedUri.indexOf(marker);
      if (pos !== -1) {
        var s3Key = normalizedUri.slice(pos + marker.length);
        if (DEEP_ZOOM_RE.test(s3Key)) {
          var infoUrl = cfg.cantaloupeBaseUrl + "/" + encodeURIComponent(s3Key) + "/info.json";
          return { type: "cantaloupe", infoUrl };
        }
        if (STATIC_IMAGE_RE.test(s3Key)) {
          return { type: "static-image", imageUrl: normalizedUri };
        }
      }
    }
    if (/^https?:\/\//i.test(normalizedUri) && STATIC_IMAGE_RE.test(normalizedUri)) {
      return { type: "static-image", imageUrl: normalizedUri };
    }
    if (isCompassHost && (normalizedUri.indexOf("/islandora/object/") !== -1 || normalizedUri.indexOf("/object/") !== -1)) {
      var compassObjectUrl = normalizedUri;
      if (normalizedUri.indexOf("/islandora/object/") === -1) {
        compassObjectUrl = normalizedUri.replace("/object/", "/islandora/object/");
      }
      return {
        type: "compass",
        compassUrl: compassObjectUrl
      };
    }
    if (isCompassHost && normalizedUri.indexOf("/node/") !== -1 && /\/manifest(?:-single)?(?:\?.*)?$/i.test(normalizedUri)) {
      return { type: "compass-manifest", manifestUrl: normalizedUri.replace(/^http:\/\//i, "https://") };
    }
    if (isCompassHost && /\/node\/\d+(?:\?.*)?$/i.test(normalizedUri)) {
      return {
        type: "compass-manifest",
        manifestUrl: normalizedUri.replace(/^http:\/\//i, "https://").replace(/\/?(?:\?.*)?$/i, "") + "/manifest"
      };
    }
    if (/^https?:\/\/.+\/manifests\/.+\.json(?:\?.*)?$/i.test(normalizedUri)) {
      return { type: "compass-manifest", manifestUrl: normalizedUri };
    }
    var uuidMatch = normalizedUri.match(UUID_RE);
    if (uuidMatch) {
      return { type: "preservica", uuid: uuidMatch[0] };
    }
    return null;
  }
  function descriptorPriority(descriptor) {
    if (!descriptor) return -1;
    switch (descriptor.type) {
      case "compass-manifest":
        return 600;
      case "static-pdf":
        return 500;
      case "cantaloupe":
        return 400;
      case "compass":
        return 350;
      case "static-image":
        return 300;
      case "preservica":
        return 50;
      default:
        return 0;
    }
  }
  function descriptorSelectionPriority(descriptor, hasNonPdfCandidate) {
    if (hasNonPdfCandidate && descriptor && descriptor.type === "static-pdf") {
      return -1;
    }
    return descriptorPriority(descriptor);
  }
  function buildDescriptorSelection(candidates) {
    var rankedCandidates;
    var primaryCandidate;
    var companionCandidates = [];
    var hasNonPdfCandidate = candidates.some(function(candidate) {
      return candidate && candidate.descriptor && candidate.descriptor.type !== "static-pdf";
    });
    rankedCandidates = candidates.slice().sort(function(left, right) {
      return descriptorSelectionPriority(right.descriptor, hasNonPdfCandidate) - descriptorSelectionPriority(left.descriptor, hasNonPdfCandidate);
    });
    primaryCandidate = rankedCandidates[0] || null;
    rankedCandidates.forEach(function(candidate) {
      if (!candidate || candidate === primaryCandidate || !candidate.descriptor) return;
      if (hasNonPdfCandidate && candidate.descriptor.type === "static-pdf") {
        companionCandidates.push(candidate);
      }
    });
    return {
      primaryCandidate,
      rankedCandidates,
      companionCandidates
    };
  }

  // src/init.mjs
  function createInitializer({
    config,
    document: document2,
    console: console2,
    OpenSeadragon,
    sources,
    pageLayout,
    lifecycle,
    mountRankedSources
  }) {
    const { activeMountStates, disposeMountState } = lifecycle;
    function selectSources(group) {
      const candidates = [];
      group.items.forEach(function(item) {
        const descriptor = detectSource(item.uri, config);
        if (descriptor) candidates.push({ item, descriptor });
      });
      return {
        selection: buildDescriptorSelection(candidates),
        // Preserve discovery order independently of source ranking.
        signature: candidates.map(function(candidate) {
          return candidate.item.uri;
        }).join("\0")
      };
    }
    function createContainer(group, selection, signature, viewerColumn) {
      const container = document2.createElement("div");
      container.className = "digital-viewer-container";
      container.__dvDescriptorSelection = selection;
      container.__dvMountOptions = {
        loadingTimeoutMs: config.loadingTimeoutMs,
        allowFallbackOnTimeout: selection.rankedCandidates.length > 1
      };
      const state = {
        root: group.root,
        container,
        signature,
        attempt: null,
        disposed: false,
        seenInInit: true,
        layoutPane: viewerColumn ? viewerColumn.parentNode : null
      };
      container.__dvMountState = state;
      if (group.root) group.root.__dvMountState = state;
      activeMountStates.push(state);
      return container;
    }
    function placeContainer(container, selection, viewerColumn) {
      if (viewerColumn) {
        viewerColumn.appendChild(container);
        return true;
      }
      const insertAfter = pageLayout.findInsertAfter(selection.primaryCandidate.item.anchor);
      if (!insertAfter || !insertAfter.parentNode) return false;
      insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
      return true;
    }
    function mountGroup(group, layoutKind) {
      const { selection, signature } = selectSources(group);
      const existing = group.root && group.root.__dvMountState;
      if (!selection.primaryCandidate) {
        if (existing) disposeMountState(existing);
        return;
      }
      if (existing && !existing.disposed && existing.signature === signature && existing.container && existing.container.parentNode) {
        existing.seenInInit = true;
        return;
      }
      const viewerColumn = layoutKind === "leaf-digital-object" ? pageLayout.prepareLeafLayout() : null;
      if (existing) disposeMountState(existing, { preserveLayout: true });
      const container = createContainer(group, selection, signature, viewerColumn);
      if (!placeContainer(container, selection, viewerColumn)) {
        disposeMountState(container.__dvMountState);
        return;
      }
      mountRankedSources(container, selection.rankedCandidates);
    }
    function init() {
      if (typeof OpenSeadragon === "undefined") {
        console2.warn("[digital_viewer] stage=startup code=osd-unavailable (OpenSeadragon not loaded)");
        return;
      }
      const groups = sources.collectGroups();
      activeMountStates.forEach(function(state) {
        state.seenInInit = false;
      });
      if (groups.length) {
        const layoutKind = classifyPageContext(pageLayout.getPageContext());
        groups.forEach(function(group) {
          try {
            mountGroup(group, layoutKind);
          } catch (err) {
            try {
              disposeMountState(group.root && group.root.__dvMountState);
            } catch (cleanupError) {
            }
            console2.warn("[digital_viewer] stage=startup code=group-unavailable");
          }
        });
      }
      activeMountStates.slice().forEach(function(state) {
        if (!state.seenInInit) disposeMountState(state);
      });
    }
    return { init };
  }

  // src/mount-sequence.mjs
  function getContainerViewerOptions(container) {
    var mountOptions = container && container.__dvMountOptions || {};
    var attempt = mountOptions.attempt;
    return {
      objectDownloadPdfUrl: getCompanionPdfUrl(container && container.__dvDescriptorSelection),
      loadingTimeoutMs: mountOptions.loadingTimeoutMs,
      allowFallbackOnTimeout: !!mountOptions.allowFallbackOnTimeout,
      attempt,
      signal: attempt && attempt.controller ? attempt.controller.signal : void 0
    };
  }
  function createMountSequence({ lifecycle, mountDescriptor, reportFailure }) {
    const { createAttempt, disposeAttempt, isAttemptActive, scheduleAttemptTimeout, clearAttemptTimeout } = lifecycle;
    function mountRankedSources(container, ranked) {
      function tryMount(rankIndex) {
        var mountState = container.__dvMountState;
        var attempt = createAttempt();
        if (!mountState || mountState.disposed) return;
        if (mountState.attempt) disposeAttempt(mountState.attempt);
        mountState.attempt = attempt;
        container.__dvMountAttempt = attempt;
        container.__dvMountOptions.allowFallbackOnTimeout = rankIndex + 1 < ranked.length;
        container.__dvMountOptions.attempt = attempt;
        scheduleAttemptTimeout(
          attempt,
          container,
          getLoadingTimeout(container.__dvMountOptions),
          rankIndex + 1 < ranked.length,
          function() {
            if (!mountState.disposed) tryMount(rankIndex + 1);
          }
        );
        Promise.resolve().then(function() {
          if (!isAttemptActive(attempt)) return Promise.reject(new Error("ATTEMPT_DISPOSED"));
          return mountDescriptor(container, ranked[rankIndex].descriptor);
        }).then(function() {
          if (!isAttemptActive(attempt)) return;
          attempt.completed = true;
          clearAttemptTimeout(attempt);
        }).catch(function() {
          if (!isAttemptActive(attempt) || mountState.disposed) return;
          disposeAttempt(attempt);
          if (rankIndex + 1 < ranked.length) {
            tryMount(rankIndex + 1);
          } else {
            reportFailure(container, "viewer", "content-unavailable");
          }
        });
      }
      tryMount(0);
    }
    return { mountRankedSources };
  }

  // src/runtime.mjs
  function createViewerRuntime({
    config: cfg,
    document: document2,
    console: console2,
    fetch,
    OpenSeadragon,
    IntersectionObserver,
    Image,
    AbortController,
    setTimeout,
    clearTimeout
  }) {
    const {
      createFallbackLink,
      showError,
      reportFailure,
      showLoadingNotice,
      clearLoadingNotice,
      resetContainer
    } = createStatus({ document: document2, console: console2 });
    const pageLayout = createPageLayout({ document: document2 });
    const lifecycle = createLifecycle({
      AbortController,
      setTimeout,
      clearTimeout,
      showLoadingNotice,
      restoreLeafLayoutIfUnused: (pane) => pageLayout.restoreLeafLayoutIfUnused(pane, lifecycle.activeMountStates)
    });
    const { isAttemptActive, registerAttemptCleanup, disposeMountState } = lifecycle;
    const { addControls, addPageNav } = createControls({ document: document2, isAttemptActive, registerAttemptCleanup });
    const { addViewerModeActions } = createViewerModes({ document: document2, isAttemptActive });
    const { primeResourceUrl, warmSequenceCache } = createPrefetch({ fetch, Image, registerAttemptCleanup });
    const { addThumbnailCarousel } = createThumbnails({
      document: document2,
      IntersectionObserver,
      setTimeout,
      clearTimeout,
      isAttemptActive,
      registerAttemptCleanup,
      warmSequenceCache
    });
    const { mountOsdViewer } = createViewer({
      document: document2,
      OpenSeadragon,
      setTimeout,
      clearTimeout,
      resetContainer,
      showLoadingNotice,
      clearLoadingNotice,
      isAttemptActive,
      disposeViewer: lifecycle.disposeViewer,
      registerAttemptCleanup,
      addControls,
      addPageNav,
      addViewerModeActions,
      addThumbnailCarousel,
      warmSequenceCache,
      primeResourceUrl
    });
    const adapters = createSourceAdapters({
      config: cfg,
      document: document2,
      console: console2,
      fetch,
      setTimeout,
      clearTimeout,
      mountOsdViewer,
      reportFailure,
      isAttemptActive,
      showError,
      resetContainer,
      addViewerModeActions,
      showLoadingNotice,
      clearLoadingNotice,
      registerAttemptCleanup,
      createFallbackLink
    });
    function mountDescriptor(container, descriptor) {
      resetContainer(container);
      if (!Object.prototype.hasOwnProperty.call(adapters, descriptor.type)) {
        return Promise.reject(new Error("UNSUPPORTED_DESCRIPTOR"));
      }
      var adapter = adapters[descriptor.type];
      return adapter(container, descriptor, getContainerViewerOptions(container));
    }
    const sources = createPageSources({
      document: document2,
      getPageContext: pageLayout.getPageContext,
      onContractFailure() {
        console2.warn("[digital_viewer] stage=discovery code=source-contract-missing");
      },
      onDiscoveryError() {
        console2.warn("[digital_viewer] stage=startup code=source-unavailable");
      }
    });
    const { mountRankedSources } = createMountSequence({ lifecycle, mountDescriptor, reportFailure });
    const { init } = createInitializer({
      config: cfg,
      document: document2,
      console: console2,
      OpenSeadragon,
      sources,
      pageLayout,
      lifecycle,
      mountRankedSources
    });
    return {
      addViewerModeActions,
      getPreloadPageIndexes,
      buildThumbnailUrl,
      addControls,
      addThumbnailCarousel,
      warmSequenceCache,
      classifyPageContext,
      collectSourceAnchors: sources.collectSourceAnchors,
      mountOsdViewer,
      mountDescriptor,
      adapters,
      getContainerViewerOptions,
      disposeMountState,
      init
    };
  }

  // src/entry.mjs
  var runtime = createViewerRuntime({
    config: readConfig(window.DigitalViewer),
    document,
    console,
    fetch: window.fetch && window.fetch.bind(window),
    OpenSeadragon: window.OpenSeadragon,
    IntersectionObserver: window.IntersectionObserver,
    Image: window.Image,
    AbortController: window.AbortController,
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window)
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runtime.init);
  } else {
    runtime.init();
  }
})();
//# sourceMappingURL=digital_viewer.js.map?v=716fcdda00dbafa7f2ce7908289dcaa48a453a752539cbcc079e4c836c1a46be
