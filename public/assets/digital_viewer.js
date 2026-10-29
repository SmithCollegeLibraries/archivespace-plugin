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
    } catch (e) {
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
    } catch (e) {
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
    var decoded;
    try {
      decoded = decodeURIComponent(identifier);
    } catch (e) {
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
    } catch (e) {
    }
    return cfg.cantaloupeBaseUrl + "/" + encodeURIComponent(s3Key) + "/info.json";
  }
  function parsePages(manifest, config) {
    return extractManifestPages(manifest, function(serviceId) {
      return toLocalCantaloupeInfoUrl(serviceId, config);
    });
  }
  function fetchManifestUrl(dependencies, url, mountOptions) {
    const { config, fetch, isAttemptActive: isAttemptActive2 } = dependencies;
    const isCompassManifest = new URL(url).hostname === config.compassHost;
    const useProxy = config.compassProxyUrl && isCompassManifest;
    const requestUrl = useProxy ? config.compassProxyUrl + "?url=" + encodeURIComponent(url) : url;
    return fetch(requestUrl, { signal: mountOptions.signal }).then(function(res) {
      if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
      if (!res.ok) throw new Error((useProxy ? "Proxy HTTP " : "Manifest HTTP ") + res.status);
      return res.json();
    });
  }
  function fetchProxyManifest(dependencies, descriptor, mountOptions) {
    const { config, fetch, isAttemptActive: isAttemptActive2 } = dependencies;
    const requestUrl = config.compassProxyUrl + "?url=" + encodeURIComponent(descriptor.compassUrl);
    return fetch(requestUrl, { signal: mountOptions.signal }).then(function(res) {
      if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
      if (!res.ok) throw new Error("Proxy HTTP " + res.status);
      return res.json();
    });
  }
  function fetchRedirectedManifest(dependencies, descriptor, mountOptions, compassBase) {
    const { fetch, isAttemptActive: isAttemptActive2 } = dependencies;
    return fetch(descriptor.compassUrl, { redirect: "follow", signal: mountOptions.signal }).then(function(res) {
      if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
      const nodeMatch = res.url.match(/\/node\/(\d+)/);
      if (!nodeMatch) throw new Error("Could not resolve Compass node from: " + res.url);
      return fetch(compassBase + "/node/" + nodeMatch[1] + "/manifest", { signal: mountOptions.signal });
    }).then(function(res) {
      if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
      if (!res.ok) throw new Error("Manifest HTTP " + res.status);
      return res.json();
    });
  }
  function fetchCompassManifest(dependencies, descriptor, mountOptions, compassBase) {
    if (dependencies.config.compassProxyUrl) {
      return fetchProxyManifest(dependencies, descriptor, mountOptions);
    }
    return fetchRedirectedManifest(dependencies, descriptor, mountOptions, compassBase);
  }
  function mountManifestPages(dependencies, container, manifest, mountOptions) {
    const { isAttemptActive: isAttemptActive2, mountOsdViewer: mountOsdViewer2 } = dependencies;
    if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
    const tileSources = parsePages(manifest, dependencies.config);
    if (!hasRenderablePages(tileSources)) throw new Error("No renderable image services in manifest");
    return mountOsdViewer2(container, tileSources, mountOptions);
  }
  function mountCompass(dependencies, container, descriptor, mountOptions) {
    const { config, isAttemptActive: isAttemptActive2, reportFailure: reportFailure2 } = dependencies;
    const compassBase = config.compassBaseUrl || "https://" + config.compassHost;
    return fetchCompassManifest(dependencies, descriptor, mountOptions, compassBase).then(function(manifest) {
      return mountManifestPages(dependencies, container, manifest, mountOptions);
    }).catch(function(error) {
      if (!isAttemptActive2(mountOptions.attempt)) throw error;
      reportFailure2(container, "compass", "content-unavailable");
      throw error;
    });
  }
  function createCompassAdapter(dependencies) {
    return {
      mountCompass: function(container, descriptor, options) {
        return mountCompass(dependencies, container, descriptor, options);
      },
      fetchManifestUrl: function(url, options) {
        return fetchManifestUrl(dependencies, url, options);
      },
      parsePages: function(manifest) {
        return parsePages(manifest, dependencies.config);
      }
    };
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
  function createImageLoadWaiter(dependencies) {
    function waitForImageLoad(image, container, options) {
      return new Promise(function(resolve, reject) {
        var settled = false;
        var timeoutId = dependencies.setTimeout(function() {
          if (settled) return;
          if (options && options.allowFallbackOnTimeout) {
            finish(new Error("STATIC_IMAGE_TIMEOUT"));
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
        image.addEventListener("load", function() {
          finish();
        });
        image.addEventListener("error", function() {
          finish(new Error("STATIC_IMAGE_FAILED"));
        });
        dependencies.registerAttemptCleanup(options && options.attempt, function() {
          finish(new Error("ATTEMPT_DISPOSED"));
        });
        settleFromCachedImage(image, finish);
      });
    }
    return waitForImageLoad;
  }
  function settleFromCachedImage(image, finish) {
    if (!image.complete) return;
    if (typeof image.naturalWidth === "number" && image.naturalWidth === 0) {
      finish(new Error("STATIC_IMAGE_FAILED"));
    } else {
      finish();
    }
  }
  function createStaticImageAdapter(dependencies, waitForImageLoad) {
    return function mountStaticImage(container, descriptor, mountOptions) {
      var safeImageUrl = sanitizeUrl(descriptor.imageUrl);
      if (!safeImageUrl) {
        dependencies.showError(container, "Image not available (unsupported URL)");
        return;
      }
      dependencies.resetContainer(container);
      container.classList.add("dv-active");
      var wrap = dependencies.document.createElement("div");
      wrap.className = "dv-static-image";
      var image = createStaticImageElement(dependencies.document, safeImageUrl);
      wrap.appendChild(image);
      container.appendChild(wrap);
      dependencies.addViewerModeActions(
        container,
        null,
        [{ imageUrl: safeImageUrl, pageLabel: "Image view" }],
        mountOptions
      );
      return waitForImageLoad(image, container, mountOptions);
    };
  }
  function createStaticImageElement(document2, safeImageUrl) {
    var image = document2.createElement("img");
    image.src = safeImageUrl;
    image.alt = "Digital object image";
    image.style.display = "block";
    image.style.width = "100%";
    image.style.height = "auto";
    return image;
  }
  function createNativeMediaAdapters(dependencies) {
    return {
      mountVideoViewer: createNativeMediaAdapter(dependencies, "video"),
      mountAudioViewer: createNativeMediaAdapter(dependencies, "audio")
    };
  }
  function getNativeMediaSettings(mediaType) {
    if (mediaType === "video") {
      return {
        error: "Video not available (unsupported URL)",
        fallback: "Your browser does not support video playback. ",
        download: "Download the video"
      };
    }
    return {
      error: "Audio not available (unsupported URL)",
      fallback: "Your browser does not support audio playback. ",
      download: "Download the audio"
    };
  }
  function appendNativeMediaSources(document2, media, sources) {
    var validSources = [];
    sources.forEach(function(src) {
      var safeUrl = sanitizeUrl(src && src.url);
      var source = document2.createElement("source");
      if (!safeUrl) return;
      source.src = safeUrl;
      if (src.format) source.type = src.format;
      media.appendChild(source);
      validSources.push(src);
    });
    return validSources;
  }
  function appendNativeMediaFallback(dependencies, media, validSources, settings) {
    var fallback = dependencies.document.createElement("p");
    var fallbackLink = dependencies.createFallbackLink(validSources[0].url, settings.download);
    fallback.className = "dv-fallback";
    fallback.appendChild(dependencies.document.createTextNode(settings.fallback));
    if (fallbackLink) {
      fallback.appendChild(fallbackLink);
      fallback.appendChild(dependencies.document.createTextNode("."));
    }
    media.appendChild(fallback);
  }
  function createNativeMediaAdapter(dependencies, mediaType) {
    return function mountNativeMedia(container, sources) {
      var settings = getNativeMediaSettings(mediaType);
      container.classList.add("dv-active");
      var wrap = dependencies.document.createElement("div");
      wrap.className = "dv-" + mediaType;
      var media = dependencies.document.createElement(mediaType);
      media.controls = true;
      media.preload = "metadata";
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
        dependencies.showError(container, "PDF not available (unsupported URL)");
        return;
      }
      container.classList.add("dv-active");
      var wrap = dependencies.document.createElement("div");
      wrap.className = "dv-pdf";
      var iframe = dependencies.document.createElement("iframe");
      iframe.src = safeUrl;
      iframe.title = "PDF viewer";
      iframe.setAttribute("allow", "fullscreen");
      var fallback = dependencies.document.createElement("p");
      fallback.className = "dv-fallback";
      var fallbackLink = dependencies.createFallbackLink(safeUrl, "Open PDF");
      if (fallbackLink) fallback.appendChild(fallbackLink);
      wrap.appendChild(iframe);
      wrap.appendChild(fallback);
      container.appendChild(wrap);
    };
  }
  function createDirectAdapters(dependencies) {
    var waitForImageLoad = createImageLoadWaiter(dependencies);
    return __spreadProps(__spreadValues({
      mountCantaloupe: function(container, descriptor, mountOptions) {
        return dependencies.mountOsdViewer(container, descriptor.infoUrl, mountOptions);
      },
      mountStaticImage: createStaticImageAdapter(dependencies, waitForImageLoad)
    }, createNativeMediaAdapters(dependencies)), {
      mountPdfViewer: createPdfViewerAdapter(dependencies)
    });
  }

  // src/adapters/manifest.mjs
  function createManifestAdapter({ fetchManifestUrl: fetchManifestUrl2, parsePages: parsePages2, isAttemptActive: isAttemptActive2, mountOsdViewer: mountOsdViewer2, reportFailure: reportFailure2 }) {
    function mountManifest(container, descriptor, mountOptions) {
      var fetchManifest = fetchManifestUrl2(descriptor.manifestUrl, mountOptions);
      return fetchManifest.then(function(manifest) {
        if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
        var tileSources = parsePages2(manifest);
        if (!hasRenderablePages(tileSources)) throw new Error("No renderable image services in manifest");
        return mountOsdViewer2(container, tileSources, mountOptions);
      }).catch(function(err) {
        if (!isAttemptActive2(mountOptions.attempt)) throw err;
        reportFailure2(container, "manifest", "content-unavailable");
        throw err;
      });
    }
    return mountManifest;
  }

  // src/adapters/preservica.mjs
  function getManifestUrl(config, uuid) {
    return config.preservicaApiBase.replace(/\/$/, "") + "/api/iiif/" + uuid + "/manifest.json";
  }
  function requestManifest(dependencies, manifestUrl, mountOptions) {
    const { fetch, isAttemptActive: isAttemptActive2 } = dependencies;
    return fetch(manifestUrl, { signal: mountOptions.signal }).then(function(response) {
      if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    });
  }
  function extractContent(dependencies, manifest) {
    return extractManifestContent(manifest, function() {
      dependencies.console.warn("[digital_viewer] stage=manifest code=invalid-canvas");
    });
  }
  function countRenderableContent(content) {
    return content.images.length + content.videos.length + content.audio.length + content.pdfs.length;
  }
  function mountImageContent(dependencies, container, images, mountOptions) {
    const { mountOsdViewer: mountOsdViewer2 } = dependencies;
    const osdSources = images.map(function(image) {
      return { type: "image", url: image.url };
    });
    return mountOsdViewer2(
      container,
      osdSources.length === 1 ? osdSources[0] : osdSources,
      mountOptions
    );
  }
  function mountContent(dependencies, container, content, mountOptions) {
    const { mountVideoViewer, mountAudioViewer, mountPdfViewer, clearLoadingNotice } = dependencies;
    if (content.videos.length > 0) mountVideoViewer(container, content.videos);
    if (content.audio.length > 0) mountAudioViewer(container, content.audio);
    if (content.images.length > 0) {
      return mountImageContent(dependencies, container, content.images, mountOptions);
    }
    if (content.pdfs.length > 0) mountPdfViewer(container, content.pdfs[0]);
    clearLoadingNotice(container);
  }
  function mountManifestContent(dependencies, container, manifest, mountOptions) {
    const { isAttemptActive: isAttemptActive2 } = dependencies;
    if (!isAttemptActive2(mountOptions.attempt)) throw new Error("ATTEMPT_DISPOSED");
    const content = extractContent(dependencies, manifest);
    if (countRenderableContent(content) === 0) throw new Error("No renderable content found in manifest");
    return mountContent(dependencies, container, content, mountOptions);
  }
  function mountPreservica(dependencies, container, descriptor, mountOptions) {
    const { config, reportFailure: reportFailure2, isAttemptActive: isAttemptActive2 } = dependencies;
    if (!config.preservicaApiBase) {
      reportFailure2(container, "configuration", "preservica-unavailable");
      return Promise.reject(new Error("PRESERVICA_UNAVAILABLE"));
    }
    const manifestUrl = getManifestUrl(config, descriptor.uuid);
    return requestManifest(dependencies, manifestUrl, mountOptions).then(function(manifest) {
      return mountManifestContent(dependencies, container, manifest, mountOptions);
    }).catch(function(error) {
      if (!isAttemptActive2(mountOptions.attempt)) throw error;
      reportFailure2(container, "preservica", "manifest-unavailable");
      throw error;
    });
  }
  function createPreservicaAdapter(dependencies) {
    return function mountPreservicaAdapter(container, descriptor, mountOptions) {
      return mountPreservica(dependencies, container, descriptor, mountOptions);
    };
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
  function createAttempt({ AbortController }) {
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
  function clearAttemptTimeout(attempt, clearTimeout) {
    if (!attempt || attempt.timeoutId === null || typeof attempt.timeoutId === "undefined") return;
    clearTimeout(attempt.timeoutId);
    attempt.timeoutId = null;
  }
  function runAttemptCleanups(attempt) {
    const cleanups = (attempt.cleanups || []).slice();
    attempt.cleanups = [];
    cleanups.forEach(function(cleanup) {
      try {
        cleanup();
      } catch (e) {
      }
    });
  }
  function disposeAttempt(attempt, dependencies) {
    const { clearTimeout } = dependencies;
    if (!attempt || attempt.disposed) return;
    attempt.disposed = true;
    attempt.active = false;
    clearAttemptTimeout(attempt, clearTimeout);
    (attempt.timers || []).forEach(function(timerId) {
      clearTimeout(timerId);
    });
    attempt.timers = [];
    abortAttempt(attempt);
    disposeAttemptViewer(attempt);
    runAttemptCleanups(attempt);
  }
  function abortAttempt(attempt) {
    if (attempt.controller && typeof attempt.controller.abort === "function") {
      attempt.controller.abort();
    }
  }
  function disposeAttemptViewer(attempt) {
    try {
      if (attempt.viewer) disposeViewer(attempt.viewer);
    } catch (e) {
    }
  }
  function scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback, dependencies) {
    const { setTimeout, showLoadingNotice } = dependencies;
    attempt.timeoutId = setTimeout(function() {
      if (!isAttemptActive(attempt) || attempt.completed || attempt.timedOut) return;
      attempt.timeoutId = null;
      attempt.timedOut = true;
      if (allowFallback) {
        disposeAttempt(attempt, dependencies);
        onFallback();
      } else {
        showLoadingNotice(container);
      }
    }, timeout);
  }
  function detachMountContainer(container) {
    if (!container) return;
    container.__dvMountState = null;
    if (container.parentNode && typeof container.parentNode.removeChild === "function") {
      container.parentNode.removeChild(container);
    }
  }
  function clearMountRoot(state) {
    if (state.root && state.root.__dvMountState === state) state.root.__dvMountState = null;
  }
  function removeActiveMountState(activeMountStates, state) {
    const activeIndex = activeMountStates.indexOf(state);
    if (activeIndex !== -1) activeMountStates.splice(activeIndex, 1);
  }
  function disposeMountState(state, options, activeMountStates, dependencies) {
    const disposeAttempt2 = dependencies.disposeAttempt;
    const restoreLeafLayoutIfUnused2 = dependencies.restoreLeafLayoutIfUnused;
    if (!state || state.disposed) return;
    state.disposed = true;
    disposeAttempt2(state.attempt);
    detachMountContainer(state.container);
    clearMountRoot(state);
    removeActiveMountState(activeMountStates, state);
    if (!options || !options.preserveLayout) restoreLeafLayoutIfUnused2(state.layoutPane);
  }
  function createAttemptOperations(dependencies) {
    return {
      createAttempt: function() {
        return createAttempt(dependencies);
      },
      disposeViewer,
      isAttemptActive,
      registerAttemptCleanup,
      disposeAttempt: function(attempt) {
        disposeAttempt(attempt, dependencies);
      },
      clearAttemptTimeout: function(attempt) {
        clearAttemptTimeout(attempt, dependencies.clearTimeout);
      },
      scheduleAttemptTimeout: function(attempt, container, timeout, allowFallback, onFallback) {
        scheduleAttemptTimeout(attempt, container, timeout, allowFallback, onFallback, dependencies);
      }
    };
  }
  function createMountStateOperations(activeMountStates, dependencies, disposeAttemptOperation) {
    return {
      disposeMountState: function(state, options) {
        const mountDependencies = {
          disposeAttempt: disposeAttemptOperation,
          restoreLeafLayoutIfUnused: dependencies.restoreLeafLayoutIfUnused
        };
        disposeMountState(state, options, activeMountStates, mountDependencies);
      }
    };
  }
  function createLifecycle(dependencies) {
    const activeMountStates = [];
    const attemptOperations = createAttemptOperations(dependencies);
    return __spreadValues(__spreadValues({
      activeMountStates
    }, attemptOperations), createMountStateOperations(activeMountStates, dependencies, attemptOperations.disposeAttempt));
  }

  // src/events.mjs
  function createViewerScope(viewer, attempt, registerAttemptCleanup2) {
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
    registerAttemptCleanup2(attempt, dispose);
    return { listen, dispose };
  }

  // src/control-adjustments.mjs
  var DEFAULT_IMAGE_ADJUSTMENTS = Object.freeze({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0
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
    var viewport = viewer && viewer.viewport;
    var currentRotation;
    if (!viewport || typeof viewport.getRotation !== "function" || typeof viewport.setRotation !== "function") return;
    currentRotation = viewport.getRotation();
    currentRotation += direction * (isViewerFlipped(viewer) ? -90 : 90);
    viewport.setRotation(currentRotation);
  }
  function resetViewerTransforms(viewer) {
    var viewport = viewer && viewer.viewport;
    if (!viewport) return;
    if (typeof viewport.setRotation === "function") viewport.setRotation(0);
    setViewerFlip(viewer, false);
    resetViewerImageAdjustments(viewer);
    if (typeof viewport.goHome === "function") viewport.goHome();
    if (typeof viewer.forceRedraw === "function") viewer.forceRedraw();
  }
  function createImageAdjustments() {
    return {
      get: getViewerImageAdjustments,
      apply: applyViewerImageAdjustments,
      set: setViewerImageSetting,
      toggle: toggleViewerImageSetting,
      reset: resetViewerTransforms,
      isFlipped: isViewerFlipped,
      setFlip: setViewerFlip,
      rotate: rotateViewer
    };
  }

  // src/controls.mjs
  function createControls(dependencies) {
    var context = Object.assign({}, dependencies, {
      adjustments: createImageAdjustments(),
      instanceCount: 0
    });
    return {
      addControls: function(container, viewer, options) {
        addControls(context, container, viewer, options);
      },
      addPageNav: function(container, viewer, total, options) {
        addPageNav(context, container, viewer, total, options);
      }
    };
  }
  function makeButton(document2, icon, title, onClick) {
    var button = document2.createElement("button");
    button.type = "button";
    button.className = "dv-ctrl-btn dv-ctrl-btn--" + icon;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.setAttribute("data-icon", icon);
    button.addEventListener("click", onClick);
    return button;
  }
  function setButtonActive(button, active) {
    if (!button) return;
    if (button.classList && typeof button.classList.toggle === "function") {
      button.classList.toggle("is-active", !!active);
    }
  }
  function setButtonPressed(button, pressed) {
    setButtonActive(button, pressed);
    if (button) button.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  function normalizeZoom(value) {
    return isFinite(value) && value > 0 ? value : 1;
  }
  function getViewerZoomPercent(viewer) {
    var viewport = viewer && viewer.viewport;
    var currentZoom = viewport && typeof viewport.getZoom === "function" ? normalizeZoom(viewport.getZoom(true)) : 1;
    var homeZoom = viewport && typeof viewport.getHomeZoom === "function" ? normalizeZoom(viewport.getHomeZoom()) : 1;
    return Math.round(currentZoom / homeZoom * 100) + "%";
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
    if (state.root.classList && typeof state.root.classList.toggle === "function") {
      state.root.classList.toggle("is-collapsed", state.isCollapsed);
    }
    if (state.toggleButton) {
      state.toggleButton.setAttribute("aria-expanded", state.isCollapsed ? "false" : "true");
    }
  }
  function updatePopoverRoot(state, open) {
    if (state.root && state.root.classList && typeof state.root.classList.toggle === "function") {
      state.root.classList.toggle("is-adjust-open", open);
    }
  }
  function updatePopoverElement(state, open) {
    if (!state.popover) return;
    state.popover.setAttribute("aria-hidden", open ? "false" : "true");
    if (state.popover.classList && typeof state.popover.classList.toggle === "function") {
      state.popover.classList.toggle("is-open", open);
    }
  }
  function updatePopoverButton(state, open) {
    if (!state.adjustButton) return;
    state.adjustButton.setAttribute("aria-expanded", open ? "true" : "false");
    setButtonActive(state.adjustButton, open);
  }
  function setAdjustPopoverOpen(state, open) {
    if (!state || open && state.isCollapsed) return;
    state.isPopoverOpen = !!open;
    updatePopoverRoot(state, state.isPopoverOpen);
    updatePopoverElement(state, state.isPopoverOpen);
    updatePopoverButton(state, state.isPopoverOpen);
  }
  function syncAdjustPopover(context, viewer, state) {
    var adjustments;
    if (!state) return;
    adjustments = context.adjustments.get(viewer);
    state.rangeControls.forEach(function(control) {
      var value = adjustments[control.key];
      control.input.value = String(value);
      control.value.textContent = value + "%";
    });
    state.toggleControls.forEach(function(control) {
      setButtonPressed(control.button, adjustments[control.key] !== 0);
    });
  }
  function syncToolbarState(context, viewer, state) {
    if (!state) return;
    if (state.zoomLabel) state.zoomLabel.textContent = getViewerZoomPercent(viewer);
    if (state.flipButton) {
      setButtonPressed(state.flipButton, context.adjustments.isFlipped(viewer));
    }
    if (state.fullscreenButton && viewer && typeof viewer.isFullPage === "function") {
      setButtonPressed(state.fullscreenButton, !!viewer.isFullPage());
    }
    syncAdjustPopover(context, viewer, state);
  }
  function makeAdjustmentRangeControl(context, viewer, state, label, key) {
    var document2 = context.document;
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
      context.adjustments.set(viewer, key, nextValue);
      syncToolbarState(context, viewer, state);
    });
    row.appendChild(labelText);
    row.appendChild(slider);
    row.appendChild(value);
    state.rangeControls.push({ key, input: slider, value });
    return row;
  }
  function makeAdjustmentToggle(context, viewer, state, title, key, label) {
    var button = context.document.createElement("button");
    button.type = "button";
    button.className = "dv-adjust-toggle";
    button.title = title;
    button.textContent = label;
    button.setAttribute("aria-label", title);
    button.setAttribute("data-setting", key);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", function() {
      context.adjustments.toggle(viewer, key);
      syncToolbarState(context, viewer, state);
    });
    state.toggleControls.push({ key, button });
    return button;
  }
  function makePopoverActionButton(document2, label, title, onClick) {
    var button = document2.createElement("button");
    button.type = "button";
    button.className = "dv-adjust-action";
    button.title = title;
    button.textContent = label;
    button.setAttribute("aria-label", title);
    button.addEventListener("click", onClick);
    return button;
  }
  function makeRotationButton(context, viewer, state, label, title, direction) {
    return makePopoverActionButton(context.document, label, title, function() {
      context.adjustments.rotate(viewer, direction);
      syncToolbarState(context, viewer, state);
    });
  }
  function makeFlipButton(context, viewer, state) {
    return makePopoverActionButton(context.document, "Flip", "Flip horizontally", function() {
      context.adjustments.setFlip(viewer, !context.adjustments.isFlipped(viewer));
      syncToolbarState(context, viewer, state);
    });
  }
  function makeFullscreenButton(context, viewer, state) {
    return makePopoverActionButton(context.document, "Fullscreen", "Toggle fullscreen", function() {
      if (typeof viewer.isFullPage === "function" && viewer.isFullPage()) {
        viewer.setFullPage(false);
      } else if (typeof viewer.setFullPage === "function") {
        viewer.setFullPage(true);
      }
      syncToolbarState(context, viewer, state);
    });
  }
  function buildPopoverActions(context, viewer, state) {
    var actions = context.document.createElement("div");
    actions.className = "dv-adjust-actions";
    actions.appendChild(makeRotationButton(context, viewer, state, "Rotate left", "Rotate left 90 degrees", -1));
    actions.appendChild(makeRotationButton(context, viewer, state, "Rotate right", "Rotate right 90 degrees", 1));
    state.flipButton = makeFlipButton(context, viewer, state);
    state.fullscreenButton = makeFullscreenButton(context, viewer, state);
    actions.appendChild(state.flipButton);
    actions.appendChild(state.fullscreenButton);
    return actions;
  }
  function buildAdjustmentBody(context, viewer, state) {
    var body = context.document.createElement("div");
    body.className = "dv-adjust-body";
    body.appendChild(makeAdjustmentRangeControl(context, viewer, state, "Brightness", "brightness"));
    body.appendChild(makeAdjustmentRangeControl(context, viewer, state, "Contrast", "contrast"));
    body.appendChild(makeAdjustmentRangeControl(context, viewer, state, "Saturation", "saturation"));
    return body;
  }
  function buildAdjustmentToggles(context, viewer, state) {
    var toggles = context.document.createElement("div");
    toggles.className = "dv-adjust-toggles";
    toggles.appendChild(makeAdjustmentToggle(context, viewer, state, "Toggle greyscale", "grayscale", "Greyscale"));
    toggles.appendChild(makeAdjustmentToggle(context, viewer, state, "Toggle color invert", "invert", "Invert"));
    return toggles;
  }
  function buildAdjustmentFooter(context, viewer, state) {
    var footer = context.document.createElement("div");
    var resetButton = context.document.createElement("button");
    footer.className = "dv-adjust-footer";
    resetButton.type = "button";
    resetButton.className = "dv-adjust-reset";
    resetButton.textContent = "Reset image";
    resetButton.title = "Revert image transforms and adjustments";
    resetButton.setAttribute("aria-label", "Revert image transforms and adjustments");
    resetButton.addEventListener("click", function() {
      context.adjustments.reset(viewer);
      syncToolbarState(context, viewer, state);
    });
    footer.appendChild(resetButton);
    return footer;
  }
  function buildAdjustPopover(context, viewer, state) {
    var document2 = context.document;
    var popover = document2.createElement("div");
    var title = document2.createElement("div");
    popover.className = "dv-adjust-popover";
    popover.setAttribute("aria-hidden", "true");
    title.className = "dv-adjust-title";
    title.textContent = "Adjust image";
    popover.appendChild(title);
    popover.appendChild(buildPopoverActions(context, viewer, state));
    popover.appendChild(buildAdjustmentBody(context, viewer, state));
    popover.appendChild(buildAdjustmentToggles(context, viewer, state));
    popover.appendChild(buildAdjustmentFooter(context, viewer, state));
    return popover;
  }
  function makeSyncedButton(context, viewer, state, icon, title, action) {
    return makeButton(context.document, icon, title, function() {
      action();
      syncToolbarState(context, viewer, state);
    });
  }
  function zoomViewer(viewer, factor) {
    if (viewer.viewport && typeof viewer.viewport.zoomBy === "function") {
      viewer.viewport.zoomBy(factor);
    }
  }
  function homeViewer(viewer) {
    if (viewer.viewport && typeof viewer.viewport.goHome === "function") {
      viewer.viewport.goHome();
    }
  }
  function createAdjustButton(context, viewer, state, instanceId) {
    var button = makeButton(context.document, "adjust", "Adjust image", function() {
      setAdjustPopoverOpen(state, !state.isPopoverOpen);
      syncToolbarState(context, viewer, state);
    });
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "dv-adjust-popover-" + instanceId);
    return button;
  }
  function buildToolbarActions(context, viewer, state, instanceId) {
    var actions = context.document.createElement("div");
    actions.className = "dv-controls-actions";
    actions.appendChild(makeSyncedButton(context, viewer, state, "zoom-out", "Zoom out", function() {
      zoomViewer(viewer, 0.67);
    }));
    actions.appendChild(makeSyncedButton(context, viewer, state, "zoom-in", "Zoom in", function() {
      zoomViewer(viewer, 1.5);
    }));
    actions.appendChild(makeSyncedButton(context, viewer, state, "home", "Reset zoom to fit", function() {
      homeViewer(viewer);
    }));
    state.adjustButton = createAdjustButton(context, viewer, state, instanceId);
    actions.appendChild(state.adjustButton);
    return actions;
  }
  function buildToolbarStatus(context, viewer, state) {
    var status = context.document.createElement("div");
    var zoomLabel = context.document.createElement("span");
    var dismissButton = makeButton(context.document, "collapse", "Hide toolbar", function() {
      setControlsCollapsed(state, true);
      syncToolbarState(context, viewer, state);
    });
    status.className = "dv-controls-status";
    zoomLabel.className = "dv-zoom-label";
    dismissButton.className += " dv-controls-dismiss";
    status.appendChild(zoomLabel);
    status.appendChild(dismissButton);
    state.zoomLabel = zoomLabel;
    return status;
  }
  function buildPrimaryControls(context, viewer, state, instanceId) {
    var bar = context.document.createElement("div");
    bar.className = "dv-controls-bar";
    bar.appendChild(buildToolbarActions(context, viewer, state, instanceId));
    bar.appendChild(buildToolbarStatus(context, viewer, state));
    return bar;
  }
  function buildControlsToggle(context, viewer, state) {
    var toggle = context.document.createElement("button");
    toggle.type = "button";
    toggle.className = "dv-controls-toggle";
    toggle.textContent = "Tools";
    toggle.title = "Show toolbar";
    toggle.setAttribute("aria-label", "Show toolbar");
    toggle.setAttribute("aria-expanded", "true");
    toggle.addEventListener("click", function() {
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
      isCollapsed: false
    };
  }
  function buildControlsBar(context, bar, viewer, state) {
    var instanceId = context.instanceCount;
    bar.appendChild(buildPrimaryControls(context, viewer, state, instanceId));
    state.popover = buildAdjustPopover(context, viewer, state);
    state.popover.id = state.adjustButton.getAttribute("aria-controls");
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
    if (event.key === "Escape" || event.keyCode === 27) {
      setAdjustPopoverOpen(state, false);
      syncToolbarState(context, viewer, state);
    }
  }
  function registerDocumentListeners(context, scope, bar, viewer, state) {
    var document2 = context.document;
    if (!document2 || typeof document2.addEventListener !== "function") return;
    scope.listen(document2, "click", function(event) {
      dismissPopoverOnOutsideClick(state, bar, event);
    });
    scope.listen(document2, "keydown", function(event) {
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
    if (!viewer || typeof viewer.addHandler !== "function") return;
    viewer.addHandler("animation", function() {
      syncViewerOnAnimation(context, viewer, state, attempt);
    });
    viewer.addHandler("open", function() {
      syncViewerOnOpen(context, viewer, state, attempt);
    });
    viewer.addHandler("full-page", function() {
      syncViewerOnAnimation(context, viewer, state, attempt);
    });
  }
  function addControls(context, container, viewer, options) {
    var scope = createViewerScope(viewer, options && options.attempt, context.registerAttemptCleanup);
    var bar = context.document.createElement("div");
    var state = createControlState(bar);
    bar.className = "dv-controls";
    context.adjustments.apply(viewer);
    context.instanceCount += 1;
    buildControlsBar(context, bar, viewer, state);
    registerDocumentListeners(context, scope, bar, viewer, state);
    registerViewerHandlers(context, viewer, state, options && options.attempt);
    setControlsCollapsed(state, false);
    syncToolbarState(context, viewer, state);
    container.appendChild(bar);
  }
  function createPageButton(document2, label) {
    var button = document2.createElement("button");
    button.textContent = label;
    button.className = "dv-page-btn";
    return button;
  }
  function updatePageNavigation(data, total, counter, previousButton, nextButton) {
    counter.textContent = data.page + 1 + " / " + total;
    previousButton.disabled = data.page === 0;
    nextButton.disabled = data.page === total - 1;
  }
  function addPageNav(context, container, viewer, total, options) {
    var document2 = context.document;
    var nav = document2.createElement("div");
    var previousButton = createPageButton(document2, "\u2039 Prev");
    var counter = document2.createElement("span");
    var nextButton = createPageButton(document2, "Next \u203A");
    nav.className = "dv-page-nav";
    previousButton.disabled = true;
    counter.className = "dv-page-counter";
    counter.textContent = "1 / " + total;
    previousButton.addEventListener("click", function() {
      viewer.goToPreviousPage();
    });
    nextButton.addEventListener("click", function() {
      viewer.goToNextPage();
    });
    nav.appendChild(previousButton);
    nav.appendChild(counter);
    nav.appendChild(nextButton);
    container.appendChild(nav);
    viewer.addHandler("page", function(data) {
      if (!context.isAttemptActive(options && options.attempt)) return;
      updatePageNavigation(data, total, counter, previousButton, nextButton);
    });
  }

  // src/viewer-modes.mjs
  function createViewerModes({ document: document2, isAttemptActive: isAttemptActive2 }) {
    function addViewerModeActions(container, viewer, tileSources, options) {
      const pages = Array.isArray(tileSources) ? tileSources.slice() : [tileSources];
      const isSequence = pages.length > 1;
      const objectDownloadPdfUrl = options && options.objectDownloadPdfUrl || "";
      if (!shouldCreateModeActions(pages, isSequence, objectDownloadPdfUrl)) return null;
      const elements = createModeElements(document2);
      const state = createViewerModeState(pages, isSequence, objectDownloadPdfUrl, elements);
      bindModeButtons(elements, state);
      bindViewerPages(viewer, options, state, isAttemptActive2);
      syncViewerModeActions(state);
      container.appendChild(elements.root);
      return state;
    }
    return { addViewerModeActions };
  }
  function shouldCreateModeActions(pages, isSequence, objectDownloadPdfUrl) {
    return isSequence || objectDownloadPdfUrl || getTileSourceImageUrl(pages[0]);
  }
  function createModeButton(document2, action, label) {
    const button = document2.createElement("button");
    button.type = "button";
    button.className = "dv-mode-btn";
    button.textContent = label;
    button.setAttribute("data-action", action);
    return button;
  }
  function createModeLink(document2, action, label) {
    const link = document2.createElement("a");
    link.className = "dv-mode-link";
    link.textContent = label;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("data-action", action);
    return link;
  }
  function createModeElements(document2) {
    const root = document2.createElement("div");
    const status = document2.createElement("div");
    const modeLabel = document2.createElement("span");
    const actions = document2.createElement("div");
    const openPageButton = createModeButton(document2, "open-page", "");
    const backToObjectButton = createModeButton(document2, "back-to-object", "Back to object");
    const downloadPdfLink = createModeLink(document2, "download-pdf", "Download PDF");
    const downloadImageLink = createModeLink(document2, "download-image", "Download image");
    root.className = "dv-mode-actions";
    status.className = "dv-mode-status";
    modeLabel.className = "dv-mode-label";
    status.appendChild(modeLabel);
    actions.className = "dv-mode-buttons";
    actions.appendChild(openPageButton);
    actions.appendChild(backToObjectButton);
    actions.appendChild(downloadPdfLink);
    actions.appendChild(downloadImageLink);
    root.appendChild(status);
    root.appendChild(actions);
    return { root, modeLabel, openPageButton, backToObjectButton, downloadPdfLink, downloadImageLink };
  }
  function createViewerModeState(pages, isSequence, objectDownloadPdfUrl, elements) {
    return {
      root: elements.root,
      tileSources: pages,
      isSequence,
      mode: isSequence ? "object" : "page",
      activePageIndex: 0,
      objectDownloadPdfUrl: sanitizeUrl(objectDownloadPdfUrl),
      pageDownloadImageUrl: "",
      modeLabel: elements.modeLabel,
      openPageButton: elements.openPageButton,
      backToObjectButton: elements.backToObjectButton,
      downloadPdfLink: elements.downloadPdfLink,
      downloadImageLink: elements.downloadImageLink
    };
  }
  function bindModeButtons(elements, state) {
    elements.openPageButton.addEventListener("click", function() {
      state.mode = "page";
      syncViewerModeActions(state);
    });
    elements.backToObjectButton.addEventListener("click", function() {
      state.mode = "object";
      syncViewerModeActions(state);
    });
  }
  function bindViewerPages(viewer, options, state, isAttemptActive2) {
    if (!viewer || typeof viewer.addHandler !== "function") return;
    viewer.addHandler("page", function(data) {
      if (!isAttemptActive2(options && options.attempt)) return;
      if (!data || typeof data.page !== "number") return;
      state.activePageIndex = data.page;
      syncViewerModeActions(state);
    });
  }
  function setElementHidden(element, hidden) {
    if (!element) return;
    element.setAttribute("aria-hidden", hidden ? "true" : "false");
    if (element.classList && typeof element.classList.toggle === "function") {
      element.classList.toggle("is-hidden", !!hidden);
    }
  }
  function getViewerModeLabel(state) {
    const currentPage = state.tileSources[state.activePageIndex] || null;
    const pageLabel = currentPage && currentPage.pageLabel;
    if (state.isSequence && state.mode === "object") return "Object view";
    if (pageLabel) return pageLabel;
    if (state.isSequence) return "Page " + (state.activePageIndex + 1);
    return "Image view";
  }
  function syncOpenPageAction(state, isPageMode) {
    state.openPageButton.textContent = "Open page " + (state.activePageIndex + 1);
    setElementHidden(state.openPageButton, !state.isSequence || isPageMode);
  }
  function syncBackToObjectAction(state, isPageMode) {
    setElementHidden(state.backToObjectButton, !state.isSequence || !isPageMode);
  }
  function setLinkHref(link, url) {
    if (url) {
      link.setAttribute("href", url);
    } else {
      link.removeAttribute("href");
    }
  }
  function syncPdfDownloadAction(state, isPageMode) {
    setLinkHref(state.downloadPdfLink, state.objectDownloadPdfUrl);
    setElementHidden(state.downloadPdfLink, !state.objectDownloadPdfUrl || isPageMode);
  }
  function syncImageDownloadAction(state, isPageMode, currentPageImageUrl) {
    setLinkHref(state.downloadImageLink, currentPageImageUrl);
    setElementHidden(
      state.downloadImageLink,
      !currentPageImageUrl || state.isSequence && !isPageMode
    );
  }
  function syncViewerModeActions(state) {
    const currentPage = state.tileSources[state.activePageIndex] || null;
    const currentPageImageUrl = currentPage ? getTileSourceImageUrl(currentPage) : "";
    const isPageMode = state.mode === "page";
    state.pageDownloadImageUrl = currentPageImageUrl;
    state.root.setAttribute("data-view-mode", state.mode);
    state.modeLabel.textContent = getViewerModeLabel(state);
    syncOpenPageAction(state, isPageMode);
    syncBackToObjectAction(state, isPageMode);
    syncPdfDownloadAction(state, isPageMode);
    syncImageDownloadAction(state, isPageMode, currentPageImageUrl);
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
      if (activeIndex - offset >= 0) indexes.push(activeIndex - offset);
      if (activeIndex + offset < total) indexes.push(activeIndex + offset);
    }
    return indexes;
  }
  function getAttemptResources(attempt, sharedResources) {
    if (attempt && attempt.active === false) return null;
    if (!attempt) return sharedResources;
    return attempt.warmedResourceUrls || (attempt.warmedResourceUrls = {});
  }
  function markResourceWarmed(warmedResources, url) {
    if (!url || warmedResources[url]) return false;
    warmedResources[url] = true;
    return true;
  }
  function clearWarmedResource(warmedResources, url) {
    delete warmedResources[url];
  }
  function fetchResource(fetch, url, attempt, warmedResources) {
    let request;
    try {
      request = fetch(url, {
        cache: "force-cache",
        signal: attempt && attempt.controller ? attempt.controller.signal : void 0
      });
    } catch (e) {
      clearWarmedResource(warmedResources, url);
      return;
    }
    Promise.resolve(request).then(function(response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.text();
    }).catch(function() {
      clearWarmedResource(warmedResources, url);
    });
  }
  function warmWithImage(Image, registerAttemptCleanup2, attempt, url) {
    if (typeof Image === "undefined") return;
    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    if (attempt && registerAttemptCleanup2) {
      registerAttemptCleanup2(attempt, function() {
        image.removeAttribute("src");
      });
    }
    image.src = url;
  }
  function primeResourceUrl(dependencies, sharedResources, url, useFetch, options) {
    const { fetch, Image, registerAttemptCleanup: registerAttemptCleanup2 } = dependencies;
    const attempt = options && options.attempt;
    const warmedResources = getAttemptResources(attempt, sharedResources);
    if (!warmedResources || !markResourceWarmed(warmedResources, url)) return;
    if (useFetch && typeof fetch === "function") {
      fetchResource(fetch, url, attempt, warmedResources);
      return;
    }
    warmWithImage(Image, registerAttemptCleanup2, attempt, url);
  }
  function isIiifInfoUrl(tileSource) {
    return typeof tileSource === "string" && /\/info\.json(?:\?.*)?$/i.test(tileSource);
  }
  function warmSequenceCache(dependencies, sharedResources, tileSources, activeIndex, options) {
    getPreloadPageIndexes(activeIndex, tileSources.length, SEQUENCE_PRELOAD_DISTANCE).forEach(function(index) {
      const tileSource = getTileSourceValue(tileSources[index]);
      if (isIiifInfoUrl(tileSource)) {
        primeResourceUrl(dependencies, sharedResources, tileSource, true, options);
      }
    });
  }
  function createPrefetch(dependencies) {
    const warmedResourceUrls = {};
    return {
      primeResourceUrl: function(url, useFetch, options) {
        primeResourceUrl(dependencies, warmedResourceUrls, url, useFetch, options);
      },
      warmSequenceCache: function(tileSources, activeIndex, options) {
        warmSequenceCache(dependencies, warmedResourceUrls, tileSources, activeIndex, options);
      }
    };
  }

  // src/thumbnails.mjs
  var THUMBNAIL_TIMEOUT_MS = 1e4;
  function createThumbnails(dependencies) {
    function addThumbnailCarousel(container, viewer, tileSources, options) {
      const elements = createCarouselElements(dependencies.document);
      const state = { disposed: false };
      const queue = createThumbnailQueue(dependencies, state);
      const observer = createThumbnailObserver(
        dependencies.IntersectionObserver,
        elements.viewport,
        queue.enqueue
      );
      const buttons = createPageButtons({
        document: dependencies.document,
        viewer,
        tileSources,
        options,
        state,
        observer,
        enqueueThumbnail: queue.enqueue,
        isAttemptActive: dependencies.isAttemptActive,
        warmSequenceCache: dependencies.warmSequenceCache
      });
      appendThumbnails(elements, buttons, container);
      const updateArrows = bindCarouselNavigation(elements, buttons);
      bindViewerLifecycle(
        viewer,
        buttons,
        options,
        state,
        observer,
        queue,
        dependencies.isAttemptActive,
        dependencies.registerAttemptCleanup,
        updateArrows
      );
    }
    return { addThumbnailCarousel };
  }
  function createCarouselElements(document2) {
    const carousel = document2.createElement("div");
    const prevBtn = document2.createElement("button");
    const nextBtn = document2.createElement("button");
    const viewport = document2.createElement("div");
    const track = document2.createElement("div");
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
    return { carousel, prevBtn, nextBtn, viewport, track };
  }
  function createThumbnailQueue({ setTimeout, clearTimeout }, state) {
    const queue = [];
    let cancelActive = null;
    function loadNext() {
      if (state.disposed || cancelActive || queue.length === 0) return;
      const image = queue.shift();
      let completed = false;
      let timerId;
      function finish(cancelRequest) {
        if (completed) return;
        completed = true;
        clearTimeout(timerId);
        image.removeEventListener("load", onComplete);
        image.removeEventListener("error", onComplete);
        if (cancelRequest) image.removeAttribute("src");
        cancelActive = null;
        loadNext();
      }
      function onComplete() {
        finish(false);
      }
      cancelActive = function() {
        finish(true);
      };
      image.addEventListener("load", onComplete, { once: true });
      image.addEventListener("error", onComplete, { once: true });
      timerId = setTimeout(cancelActive, THUMBNAIL_TIMEOUT_MS);
      image.src = image.dataset.thumbnailUrl;
    }
    function enqueue(image) {
      if (state.disposed || image.dataset.thumbnailQueued) return;
      image.dataset.thumbnailQueued = "true";
      queue.push(image);
      loadNext();
    }
    function dispose() {
      queue.length = 0;
      if (cancelActive) cancelActive();
    }
    return { enqueue, dispose };
  }
  function createThumbnailObserver(Observer, viewport, enqueueThumbnail) {
    if (typeof Observer === "undefined") return null;
    let observer;
    observer = new Observer(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        enqueueThumbnail(entry.target);
        observer.unobserve(entry.target);
      });
    }, { root: viewport, rootMargin: "100px" });
    return observer;
  }
  function createPageButtons({
    document: document2,
    viewer,
    tileSources,
    options,
    state,
    observer,
    enqueueThumbnail,
    isAttemptActive: isAttemptActive2,
    warmSequenceCache: warmSequenceCache2
  }) {
    return tileSources.map(function(tileSource, index) {
      return createPageButton2({
        document: document2,
        viewer,
        tileSources,
        tileSource,
        index,
        options,
        state,
        observer,
        enqueueThumbnail,
        isAttemptActive: isAttemptActive2,
        warmSequenceCache: warmSequenceCache2
      });
    });
  }
  function createPageButton2({
    document: document2,
    viewer,
    tileSources,
    tileSource,
    index,
    options,
    state,
    observer,
    enqueueThumbnail,
    isAttemptActive: isAttemptActive2,
    warmSequenceCache: warmSequenceCache2
  }) {
    const button = document2.createElement("button");
    const image = document2.createElement("img");
    const label = document2.createElement("span");
    const thumbnailUrl = buildThumbnailUrl(tileSource);
    button.type = "button";
    button.className = "dv-thumbnail-btn";
    button.setAttribute("aria-label", "Go to image " + (index + 1));
    button.addEventListener("click", function() {
      if (state.disposed || !isAttemptActive2(options && options.attempt)) return;
      viewer.goToPage(index);
      warmSequenceCache2(tileSources, index, options);
    });
    image.className = "dv-thumbnail-img";
    image.alt = "Thumbnail " + (index + 1);
    image.decoding = "async";
    if (thumbnailUrl) {
      image.dataset.thumbnailUrl = thumbnailUrl;
      if (observer) {
        observer.observe(image);
      } else {
        enqueueThumbnail(image);
      }
    }
    label.className = "dv-thumbnail-label";
    label.textContent = String(index + 1);
    button.appendChild(image);
    button.appendChild(label);
    return button;
  }
  function updateArrowState(viewport, track, prevBtn, nextBtn) {
    prevBtn.disabled = viewport.scrollLeft <= 0;
    nextBtn.disabled = viewport.scrollLeft + viewport.clientWidth >= track.scrollWidth - 1;
  }
  function updateActiveThumbnail(buttons, index, updateArrows) {
    buttons.forEach(function(button, buttonIndex) {
      const isActive = buttonIndex === index;
      if (button.classList && button.classList.toggle) {
        button.classList.toggle("is-active", isActive);
      }
      button.setAttribute("aria-current", isActive ? "true" : "false");
      if (isActive && button.scrollIntoView) {
        button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    });
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(updateArrows);
    } else {
      updateArrows();
    }
  }
  function bindCarouselNavigation({ viewport, track, prevBtn, nextBtn }, buttons) {
    const updateArrows = function() {
      updateArrowState(viewport, track, prevBtn, nextBtn);
    };
    prevBtn.addEventListener("click", function() {
      viewport.scrollBy({ left: -Math.max(viewport.clientWidth * 0.75, 220), behavior: "smooth" });
    });
    nextBtn.addEventListener("click", function() {
      viewport.scrollBy({ left: Math.max(viewport.clientWidth * 0.75, 220), behavior: "smooth" });
    });
    viewport.addEventListener("scroll", updateArrows);
    updateActiveThumbnail(buttons, 0, updateArrows);
    updateArrows();
    return updateArrows;
  }
  function appendThumbnails(elements, buttons, container) {
    buttons.forEach(function(button) {
      elements.track.appendChild(button);
    });
    elements.viewport.appendChild(elements.track);
    elements.carousel.appendChild(elements.prevBtn);
    elements.carousel.appendChild(elements.viewport);
    elements.carousel.appendChild(elements.nextBtn);
    container.appendChild(elements.carousel);
  }
  function disposeThumbnails(state, observer, queue) {
    if (state.disposed) return;
    state.disposed = true;
    if (observer) observer.disconnect();
    queue.dispose();
  }
  function bindViewerLifecycle(viewer, buttons, options, state, observer, queue, isAttemptActive2, registerAttemptCleanup2, updateArrows) {
    const updateActive = function(index) {
      updateActiveThumbnail(buttons, index, updateArrows);
    };
    const onPage = function(data) {
      if (state.disposed || !isAttemptActive2(options && options.attempt)) return;
      if (!data || typeof data.page !== "number") return;
      updateActive(data.page);
    };
    const cleanup = function() {
      disposeThumbnails(state, observer, queue);
    };
    viewer.addHandler("page", onPage);
    viewer.addHandler("before-destroy", cleanup);
    registerAttemptCleanup2(options && options.attempt, cleanup);
  }

  // src/viewer-page-errors.mjs
  function createPageErrors(state, document2) {
    return {
      getCurrentTiledImage: function() {
        return getCurrentTiledImage(state);
      },
      rememberCurrentTiledImage: function(pageIndex) {
        return rememberCurrentTiledImage(state, pageIndex);
      },
      eventPageInfo: function(data) {
        return eventPageInfo(state, data);
      },
      removePageError: function() {
        removePageError(state);
      },
      clearPageErrorForReload: function(pageIndex, tiledImage) {
        clearPageErrorForReload(state, pageIndex, tiledImage);
      },
      clearPageError: function(data, info) {
        clearPageError(state, data, info);
      },
      showPageError: function(data, options) {
        showPageError(state, document2, data, options);
      }
    };
  }
  function getCurrentTiledImage(state) {
    var tiledImage;
    if (!state.viewer.world || typeof state.viewer.world.getItemAt !== "function") return null;
    tiledImage = state.viewer.world.getItemAt(0) || null;
    if (!tiledImage) state.currentTiledImage = null;
    return tiledImage;
  }
  function findImageOwner(state, tiledImage) {
    return state.imagePageOwners.filter(function(entry) {
      return entry.tiledImage === tiledImage;
    })[0];
  }
  function rememberCurrentTiledImage(state, pageIndex) {
    var tiledImage = getCurrentTiledImage(state);
    var owner;
    var changed;
    if (!tiledImage) {
      state.currentTiledImage = null;
      return null;
    }
    changed = state.currentTiledImage !== tiledImage;
    state.currentTiledImage = tiledImage;
    owner = findImageOwner(state, tiledImage);
    if (!owner) {
      owner = { tiledImage, pageIndex };
      state.imagePageOwners.push(owner);
    }
    if (changed) clearPageErrorForReload(state, pageIndex, tiledImage);
    return tiledImage;
  }
  function tileSourceMatches(candidate, source) {
    var candidateUrl;
    var sourceUrl;
    if (candidate === source) return true;
    if (!candidate || !source) return false;
    candidateUrl = candidate.url;
    sourceUrl = source.url;
    if (candidateUrl && typeof source === "string") return candidateUrl === source;
    if (typeof candidate === "string" && sourceUrl) return candidate === sourceUrl;
    return !!candidateUrl && !!sourceUrl && candidateUrl === sourceUrl;
  }
  function sourcePageIndex(state, source) {
    var index;
    if (!source) return null;
    for (index = 0; index < state.osdTileSources.length; index += 1) {
      if (tileSourceMatches(state.osdTileSources[index], source)) return index;
    }
    return null;
  }
  function pageInfoForTiledImage(state, data, tiledImage, currentImage) {
    var owner;
    if (!tiledImage) return void 0;
    owner = findImageOwner(state, tiledImage);
    if (owner) {
      return createPageInfo(
        state,
        owner.pageIndex,
        currentImage,
        tiledImage,
        data && data.tile,
        tiledImage === currentImage && owner.pageIndex === state.activePageIndex
      );
    }
    if (tiledImage !== currentImage) return null;
    rememberCurrentTiledImage(state, state.activePageIndex);
    return createPageInfo(state, state.activePageIndex, currentImage, tiledImage, data && data.tile, true);
  }
  function numericPageIndex(value) {
    return typeof value === "number" ? value : void 0;
  }
  function firstPageIndex(indexes) {
    var index;
    for (index = 0; index < indexes.length; index += 1) {
      if (indexes[index] !== void 0) return indexes[index];
    }
    return void 0;
  }
  function explicitPageIndex(data) {
    return firstPageIndex([
      numericPageIndex(data && data.page),
      numericPageIndex(data && data.source && data.source.index),
      numericPageIndex(data && data.item && data.item.index),
      numericPageIndex(data && data.item && data.item.source && data.item.source.index)
    ]);
  }
  function createPageInfo(state, pageIndex, currentImage, tiledImage, tile, isCurrentImage) {
    return {
      pageIndex,
      current: isCurrentImage === void 0 ? pageIndex === state.activePageIndex && !!currentImage : isCurrentImage,
      tiledImage: tiledImage || currentImage,
      tile
    };
  }
  function eventTiledImage(data) {
    return data && (data.tiledImage || data.tile && data.tile.tiledImage);
  }
  function eventSource(data) {
    return data && (data.source || data.tileSource);
  }
  function sourcePageInfo(state, data, currentImage) {
    var pageIndex = sourcePageIndex(state, eventSource(data));
    if (pageIndex === null) return null;
    return createPageInfo(state, pageIndex, currentImage, currentImage, data && data.tile);
  }
  function eventPageInfo(state, data) {
    var currentImage = getCurrentTiledImage(state);
    var info = pageInfoForTiledImage(state, data, eventTiledImage(data), currentImage);
    var pageIndex;
    if (info !== void 0) return info;
    pageIndex = explicitPageIndex(data);
    if (pageIndex !== void 0) {
      return createPageInfo(state, pageIndex, currentImage, currentImage, data && data.tile);
    }
    return sourcePageInfo(state, data, currentImage) || createPageInfo(state, state.activePageIndex, currentImage, currentImage, data && data.tile);
  }
  function removePageError(state) {
    if (state.pageErrorMessage && state.pageErrorMessage.parentNode) {
      state.pageErrorMessage.parentNode.removeChild(state.pageErrorMessage);
    }
    state.pageErrorMessage = null;
    state.pageErrorState = null;
  }
  function clearPageErrorForReload(state, pageIndex, tiledImage) {
    if (!state.pageErrorState || state.pageErrorState.pageIndex !== pageIndex || !tiledImage) return;
    if (state.pageErrorState.tiledImage !== tiledImage) removePageError(state);
  }
  function matchesCurrentPageError(state, info) {
    var errorState = state.pageErrorState;
    if (!errorState || !info || info.pageIndex !== errorState.pageIndex || info.current === false) return false;
    if (errorState.tiledImage && info.tiledImage && errorState.tiledImage !== info.tiledImage) return false;
    return !errorState.requiresReload;
  }
  function clearFailedTile(state, tile) {
    var tileIndex;
    if (!tile) return true;
    tileIndex = state.pageErrorState.tiles.indexOf(tile);
    if (tileIndex !== -1) state.pageErrorState.tiles.splice(tileIndex, 1);
    return state.pageErrorState.tiles.length === 0;
  }
  function clearPageError(state, data, info) {
    info = info || eventPageInfo(state, data);
    if (!matchesCurrentPageError(state, info) || !clearFailedTile(state, info.tile)) return;
    removePageError(state);
  }
  function isCurrentPageError(state, info, options) {
    return info && info.pageIndex !== null && info.pageIndex === state.activePageIndex && (info.current !== false || options && options.allowWithoutImage);
  }
  function needsNewPageErrorState(state, info) {
    var errorState = state.pageErrorState;
    return !errorState || errorState.pageIndex !== info.pageIndex || errorState.tiledImage && info.tiledImage && errorState.tiledImage !== info.tiledImage;
  }
  function rememberPageError(state, info) {
    if (needsNewPageErrorState(state, info)) {
      state.pageErrorState = {
        pageIndex: info.pageIndex,
        tiledImage: info.tiledImage || state.currentTiledImage,
        tiles: [],
        requiresReload: false
      };
    }
    if (info.tile && state.pageErrorState.tiles.indexOf(info.tile) === -1) {
      state.pageErrorState.tiles.push(info.tile);
    }
    if (!info.tile) state.pageErrorState.requiresReload = true;
  }
  function createPageErrorMessage(state, document2, pageIndex) {
    var message = document2.createElement("p");
    message.className = "dv-tile-error-msg";
    message.setAttribute("data-page-index", String(pageIndex));
    message.textContent = "This page is unavailable.";
    state.container.appendChild(message);
    return message;
  }
  function showPageError(state, document2, data, options) {
    var info = eventPageInfo(state, data);
    if (!isCurrentPageError(state, info, options)) return;
    rememberPageError(state, info);
    if (!state.pageErrorMessage) {
      state.pageErrorMessage = createPageErrorMessage(state, document2, info.pageIndex);
    }
  }

  // src/viewer.mjs
  function createViewer(dependencies) {
    return {
      mountOsdViewer: function(container, tileSources, options) {
        return mountOsdViewer(dependencies, container, tileSources, options);
      }
    };
  }
  function createMountState(dependencies, container, tileSources, options) {
    var mountOptions = options || {};
    var state = {
      container,
      tileSources,
      mountOptions,
      attempt: mountOptions.attempt,
      activePageIndex: 0,
      firstTileReady: false,
      pageErrorMessage: null,
      pageErrorState: null,
      imagePageOwners: [],
      currentTiledImage: null,
      activeSourceRequest: null,
      viewerDisposed: false,
      tileTimerId: null,
      settled: false,
      timeoutId: null
    };
    var osdElement;
    dependencies.resetContainer(container);
    container.classList.add("dv-active");
    osdElement = dependencies.document.createElement("div");
    osdElement.className = "dv-osd";
    container.appendChild(osdElement);
    state.osdElement = osdElement;
    state.isSequence = Array.isArray(tileSources) && tileSources.length > 1;
    state.osdTileSources = state.isSequence ? tileSources.map(getTileSourceValue) : getTileSourceValue(tileSources);
    state.viewer = dependencies.OpenSeadragon(createOpenSeadragonOptions(osdElement, state.isSequence));
    if (state.attempt) state.attempt.viewer = state.viewer;
    state.pageErrors = createPageErrors(state, dependencies.document);
    return state;
  }
  function createOpenSeadragonOptions(element, isSequence) {
    return {
      element,
      sequenceMode: isSequence,
      initialPage: 0,
      showNavigationControl: false,
      showSequenceControl: false,
      prefixUrl: "",
      defaultZoomLevel: 0,
      minZoomLevel: 0.05,
      animationTime: 0.3,
      gestureSettingsMouse: { scrollToZoom: true, dblClickToZoom: true },
      crossOriginPolicy: "Anonymous"
    };
  }
  function mountOsdViewer(dependencies, container, tileSources, options) {
    var state = createMountState(dependencies, container, tileSources, options);
    var openPromise = createOpenPromise(dependencies, state);
    addMountedViewerControls(dependencies, state);
    return openPromise;
  }
  function createOpenPromise(dependencies, state) {
    return new Promise(function(resolve, reject) {
      state.resolveOpen = resolve;
      state.rejectOpen = reject;
      startOpenDeadline(dependencies, state);
      registerSourceRequestGuard(dependencies, state);
      registerViewerEvents(dependencies, state);
      dependencies.registerAttemptCleanup(state.attempt, function() {
        settleOpenFailure(dependencies, state, new Error("ATTEMPT_DISPOSED"));
      });
      openViewer(state, dependencies);
    });
  }
  function startOpenDeadline(dependencies, state) {
    if (state.attempt) return;
    state.timeoutId = dependencies.setTimeout(function() {
      if (state.settled) return;
      if (state.mountOptions.allowFallbackOnTimeout) {
        state.settled = true;
        dependencies.disposeViewer(state.viewer);
        state.rejectOpen(new Error("OSD_TIMEOUT"));
        return;
      }
      dependencies.showLoadingNotice(state.container);
    }, getLoadingTimeout(state.mountOptions));
  }
  function settleOpen(dependencies, state) {
    if (state.settled) {
      showUnavailablePage(state, state.activePageIndex);
      return;
    }
    state.settled = true;
    clearOpenDeadline(dependencies, state);
    dependencies.clearLoadingNotice(state.container);
    state.resolveOpen(state.viewer);
    dispatchViewerOpenEvent(dependencies, state);
    showUnavailablePage(state, state.activePageIndex);
    startTileDeadline(dependencies, state);
  }
  function showUnavailablePage(state, pageIndex, allowWithoutImage) {
    if (isUnavailableTileSource(state.tileSources[pageIndex])) {
      state.pageErrors.showPageError({ page: pageIndex }, allowWithoutImage ? { allowWithoutImage: true } : void 0);
    }
  }
  function clearOpenDeadline(dependencies, state) {
    if (state.timeoutId !== null) dependencies.clearTimeout(state.timeoutId);
  }
  function dispatchViewerOpenEvent(dependencies, state) {
    var window2 = dependencies.document.defaultView;
    if (!window2 || !window2.CustomEvent || !state.container.dispatchEvent) return;
    state.container.dispatchEvent(new window2.CustomEvent("digital-viewer:open", {
      bubbles: true,
      detail: { viewer: state.viewer }
    }));
  }
  function startTileDeadline(dependencies, state) {
    if (state.firstTileReady) return;
    state.tileTimerId = dependencies.setTimeout(function() {
      if (!state.firstTileReady) dependencies.showLoadingNotice(state.container);
    }, getLoadingTimeout(state.mountOptions));
  }
  function settleOpenFailure(dependencies, state, error) {
    if (state.settled) return;
    state.settled = true;
    clearOpenDeadline(dependencies, state);
    dependencies.disposeViewer(state.viewer);
    state.rejectOpen(error || new Error("OSD_OPEN_FAILED"));
  }
  function openViewer(state, dependencies) {
    try {
      state.viewer.open(state.osdTileSources);
    } catch (error) {
      settleOpenFailure(dependencies, state, error);
    }
  }
  function isCurrentSourceRequest(dependencies, state, request) {
    return !state.viewerDisposed && dependencies.isAttemptActive(state.attempt) && request && request === state.activeSourceRequest && request.pageIndex === state.activePageIndex;
  }
  function guardSourceCallback(dependencies, state, request, callback) {
    return function() {
      if (!isCurrentSourceRequest(dependencies, state, request) || request.completed) return;
      request.completed = true;
      if (typeof callback === "function") return callback.apply(this, arguments);
    };
  }
  function wrapTiledImageRequest(dependencies, state, addTiledImage, options) {
    var requestOptions = Object.assign({}, options);
    var request = {
      options: requestOptions,
      pageIndex: typeof state.viewer.currentPage === "function" ? state.viewer.currentPage() : state.activePageIndex,
      completed: false
    };
    state.activePageIndex = request.pageIndex;
    state.activeSourceRequest = request;
    requestOptions.success = guardSourceCallback(dependencies, state, request, options.success);
    requestOptions.error = guardSourceCallback(dependencies, state, request, options.error);
    return addTiledImage.call(state.viewer, requestOptions);
  }
  function registerSourceRequestGuard(dependencies, state) {
    var addTiledImage = state.viewer.addTiledImage;
    state.viewer.addTiledImage = function(options) {
      return wrapTiledImageRequest(dependencies, state, addTiledImage, options);
    };
  }
  function handleOpen(dependencies, state) {
    if (!dependencies.isAttemptActive(state.attempt)) return;
    state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
    settleOpen(dependencies, state);
  }
  function handleOpenFailed(dependencies, state, data) {
    if (!isCurrentSourceRequest(dependencies, state, state.activeSourceRequest) || !data || data.options !== state.activeSourceRequest.options) return;
    state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
    if (state.settled) {
      state.pageErrors.showPageError({ page: state.activeSourceRequest.pageIndex }, { allowWithoutImage: true });
    } else {
      settleOpenFailure(dependencies, state, new Error("OSD_OPEN_FAILED"));
    }
  }
  function handlePage(dependencies, state, data) {
    if (!dependencies.isAttemptActive(state.attempt) || !data || typeof data.page !== "number") return;
    state.activePageIndex = data.page;
    state.pageErrors.rememberCurrentTiledImage(state.activePageIndex);
    state.pageErrors.removePageError();
    showUnavailablePage(state, state.activePageIndex, true);
  }
  function handleTileReady(dependencies, state, data) {
    var info;
    if (!dependencies.isAttemptActive(state.attempt)) return;
    info = state.pageErrors.eventPageInfo(data);
    if (!info || info.pageIndex === null || info.current === false) return;
    state.firstTileReady = true;
    clearTileDeadline(dependencies, state);
    dependencies.clearLoadingNotice(state.container);
    if (!isUnavailableTileSource(state.tileSources[info.pageIndex])) {
      state.pageErrors.clearPageError(data, info);
    }
  }
  function clearTileDeadline(dependencies, state) {
    if (state.tileTimerId !== null) dependencies.clearTimeout(state.tileTimerId);
  }
  function handleTileLoadFailed(dependencies, state, data) {
    if (dependencies.isAttemptActive(state.attempt)) state.pageErrors.showPageError(data);
  }
  function handleViewerClose(state) {
    state.currentTiledImage = null;
    state.activeSourceRequest = null;
  }
  function handleBeforeDestroy(dependencies, state) {
    state.viewerDisposed = true;
    state.activeSourceRequest = null;
    clearOpenDeadline(dependencies, state);
    if (!state.settled) {
      state.settled = true;
      state.rejectOpen(new Error("ATTEMPT_DISPOSED"));
    }
    clearTileDeadline(dependencies, state);
  }
  function registerViewerEvents(dependencies, state) {
    state.viewer.addHandler("open", function() {
      handleOpen(dependencies, state);
    });
    state.viewer.addHandler("open-failed", function(data) {
      handleOpenFailed(dependencies, state, data);
    });
    state.viewer.addHandler("close", function() {
      handleViewerClose(state);
    });
    state.viewer.addHandler("page", function(data) {
      handlePage(dependencies, state, data);
    });
    state.viewer.addHandler("tile-ready", function(data) {
      handleTileReady(dependencies, state, data);
    });
    state.viewer.addHandler("tile-load-failed", function(data) {
      handleTileLoadFailed(dependencies, state, data);
    });
    state.viewer.addHandler("before-destroy", function() {
      handleBeforeDestroy(dependencies, state);
    });
  }
  function warmSequencePage(dependencies, state, data) {
    if (!dependencies.isAttemptActive(state.attempt)) return;
    dependencies.warmSequenceCache(state.tileSources, data.page, state.mountOptions);
  }
  function addMountedViewerControls(dependencies, state) {
    dependencies.addControls(state.osdElement, state.viewer, state.mountOptions);
    dependencies.addViewerModeActions(state.container, state.viewer, state.tileSources, state.mountOptions);
    if (state.isSequence) {
      addSequenceControls(dependencies, state);
    } else {
      primeSingleImageThumbnail(dependencies, state);
    }
  }
  function addSequenceControls(dependencies, state) {
    dependencies.addPageNav(state.container, state.viewer, state.tileSources.length, state.mountOptions);
    dependencies.addThumbnailCarousel(state.container, state.viewer, state.tileSources, state.mountOptions);
    dependencies.warmSequenceCache(state.tileSources, 0, state.mountOptions);
    state.viewer.addHandler("page", function(data) {
      warmSequencePage(dependencies, state, data);
    });
  }
  function primeSingleImageThumbnail(dependencies, state) {
    var thumbnailUrl = buildThumbnailUrl(state.tileSources);
    if (thumbnailUrl) dependencies.primeResourceUrl(thumbnailUrl, false, state.mountOptions);
  }

  // src/status.mjs
  function createFallbackLink(document2, url, label) {
    const safeUrl = sanitizeUrl(url);
    if (!safeUrl) return null;
    const link = document2.createElement("a");
    link.href = safeUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = label;
    return link;
  }
  function showError(document2, container, message) {
    container.classList.add("dv-active", "dv-error");
    container.innerHTML = "";
    const paragraph = document2.createElement("p");
    paragraph.className = "dv-error-msg";
    paragraph.textContent = message;
    container.appendChild(paragraph);
  }
  function safeFailureLabels(stage, code) {
    const stages = {
      configuration: true,
      preservica: true,
      compass: true,
      manifest: true,
      viewer: true
    };
    const codes = {
      "preservica-unavailable": true,
      "manifest-unavailable": true,
      "content-unavailable": true
    };
    return {
      stage: stages[stage] ? stage : "viewer",
      code: codes[code] ? code : "content-unavailable"
    };
  }
  function reportFailure(document2, console2, container, stage, code) {
    const safeLabels = safeFailureLabels(stage, code);
    console2.warn("[digital_viewer] stage=" + safeLabels.stage + " code=" + safeLabels.code);
    showError(document2, container, "Digital content unavailable.");
  }
  function appendLoadingNotice(document2, container) {
    if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = true;
    if (!container || container.querySelector(".dv-loading-msg")) return;
    const notice = document2.createElement("p");
    notice.className = "dv-loading-msg";
    notice.textContent = "Still loading";
    container.appendChild(notice);
  }
  function removeLoadingNotice(container) {
    const notice = container && container.querySelector(".dv-loading-msg");
    if (container && container.__dvMountAttempt) container.__dvMountAttempt.loadingShown = false;
    if (notice && notice.parentNode) notice.parentNode.removeChild(notice);
  }
  function resetContainer(container, showLoadingNotice) {
    const hasLoadingNotice = !!(container && container.querySelector && container.querySelector(".dv-loading-msg"));
    const loadingWasShown = !!(container && container.__dvMountAttempt && container.__dvMountAttempt.loadingShown);
    container.className = "digital-viewer-container";
    container.innerHTML = "";
    if (hasLoadingNotice || loadingWasShown) showLoadingNotice(container);
  }
  function createStatus({ document: document2, console: console2 }) {
    function showLoadingNotice(container) {
      appendLoadingNotice(document2, container);
    }
    return {
      createFallbackLink: function(url, label) {
        return createFallbackLink(document2, url, label);
      },
      showError: function(container, message) {
        showError(document2, container, message);
      },
      reportFailure: function(container, stage, code) {
        reportFailure(document2, console2, container, stage, code);
      },
      showLoadingNotice,
      clearLoadingNotice: removeLoadingNotice,
      resetContainer: function(container) {
        resetContainer(container, showLoadingNotice);
      }
    };
  }

  // src/page-sources.mjs
  var SOURCE_ANCHOR_SELECTORS = [
    "[data-additional-file-version] a[href]",
    ".available-digital-objects a.external-digital-object__link[href]",
    ".available-digital-objects a.thumbnail[href]",
    "[data-rep-file-version-wrapper] > a[href]",
    "[data-file-uri]"
  ];
  var GROUP_ROOT_SELECTOR = "[data-dv-source-group]";
  var LEGACY_GROUP_ROOT_SELECTORS = [
    "[data-additional-file-version]",
    "[data-rep-file-version-wrapper]",
    ".objectimage",
    ".record-pane",
    ".digital-object",
    ".instance"
  ].join(", ");
  function createPageSources(dependencies) {
    const sourceGroupState = { count: 0 };
    function collectGroups() {
      auditSourceContract(dependencies.document, dependencies.onContractFailure);
      return collectPageGroups(dependencies, sourceGroupState);
    }
    return {
      collectSourceAnchors,
      collectFileUris: function() {
        return collectFileUris(dependencies.document);
      },
      collectGroups
    };
  }
  function collectSourceAnchors(root) {
    const results = [];
    const seen = [];
    if (!root || typeof root.querySelectorAll !== "function") return results;
    SOURCE_ANCHOR_SELECTORS.forEach(function(selector) {
      const elements = root.querySelectorAll(selector);
      for (let index = 0; index < elements.length; index += 1) {
        if (elements[index].closest && elements[index].closest("[data-dv-browse-only]")) continue;
        if (seen.indexOf(elements[index]) === -1) {
          seen.push(elements[index]);
          results.push(elements[index]);
        }
      }
    });
    return results;
  }
  function collectFileUris(document2) {
    const results = [];
    collectSourceAnchors(document2).forEach(function(anchor) {
      const uri = anchor.dataset && anchor.dataset.fileUri ? anchor.dataset.fileUri : anchor.href;
      if (uri) results.push({ uri, anchor });
    });
    collectDescriptionUris(document2, results);
    return results;
  }
  function collectDescriptionUris(document2, results) {
    const terms = document2.querySelectorAll("dt");
    for (let index = 0; index < terms.length; index += 1) {
      if (!/file\s+uri/i.test(terms[index].textContent)) continue;
      const description = terms[index].nextElementSibling;
      if (!description) continue;
      const anchor = description.querySelector("a");
      const uri = anchor ? anchor.href : description.textContent.trim();
      if (uri) results.push({ uri, anchor: anchor || description });
    }
  }
  function findLeafDigitalObjectRoot(document2, pageContext) {
    if (pageContext.recordType !== "DigitalObject" || pageContext.hasChildren !== false || !pageContext.paneExists) {
      return null;
    }
    return document2.querySelector("#notes_row > .resizable-content-pane");
  }
  function findClosestGroupRoot(anchor) {
    if (!anchor.closest) return anchor.parentNode;
    return anchor.closest(GROUP_ROOT_SELECTOR) || anchor.closest(LEGACY_GROUP_ROOT_SELECTORS) || anchor.parentNode;
  }
  function assignSourceGroup(root, sourceGroupState) {
    if (!root || !root.setAttribute || root.getAttribute("data-dv-source-group")) return;
    sourceGroupState.count += 1;
    root.setAttribute("data-dv-source-group", "render-" + sourceGroupState.count);
  }
  function findGroupRoot(document2, getPageContext2, anchor, sourceGroupState) {
    const pageContext = getPageContext2();
    const root = findLeafDigitalObjectRoot(document2, pageContext) || findClosestGroupRoot(anchor);
    assignSourceGroup(root, sourceGroupState);
    return root;
  }
  function auditSourceContract(document2, onContractFailure) {
    const expected = document2.querySelectorAll("[data-dv-source-expected]");
    for (const element of expected) {
      const uri = element.getAttribute("data-file-uri");
      if (!uri || !uri.trim()) {
        if (onContractFailure) onContractFailure("source-contract-missing");
        return;
      }
    }
  }
  function reportDiscoveryError(onDiscoveryError) {
    if (onDiscoveryError) onDiscoveryError();
  }
  function findOrCreateGroup(groups, root) {
    let group = groups.find(function(candidate) {
      return candidate.root === root;
    });
    if (!group) {
      group = { root, items: [] };
      groups.push(group);
    }
    return group;
  }
  function addUniqueItem(group, item) {
    if (!group.items.some(function(existing) {
      return existing.uri === item.uri;
    })) {
      group.items.push(item);
    }
  }
  function collectGroupItem(dependencies, sourceGroupState, groups, item) {
    let root;
    try {
      root = findGroupRoot(dependencies.document, dependencies.getPageContext, item.anchor, sourceGroupState);
    } catch (e) {
      reportDiscoveryError(dependencies.onDiscoveryError);
      return;
    }
    addUniqueItem(findOrCreateGroup(groups, root), item);
  }
  function collectPageGroups(dependencies, sourceGroupState) {
    const groups = [];
    collectFileUris(dependencies.document).forEach(function(item) {
      collectGroupItem(dependencies, sourceGroupState, groups, item);
    });
    return groups;
  }

  // src/page-layout.mjs
  function classifyPageContext(context) {
    if (!context || !context.paneExists) return "inline-fallback";
    if (context.recordType === "DigitalObject" && context.hasChildren === false) {
      return "leaf-digital-object";
    }
    return "stock";
  }
  function findSourceGroup(anchor) {
    return anchor.closest ? anchor.closest("[data-dv-source-group]") : null;
  }
  function findExternalObjectBlock(anchor) {
    if (!anchor.classList || !anchor.classList.contains("external-digital-object__link")) {
      return { matched: false };
    }
    const availableBlock = anchor.closest ? anchor.closest(".available-digital-objects") : null;
    return { matched: true, insertAfter: availableBlock || anchor.parentNode };
  }
  function findAdditionalVersionBlock(anchor) {
    if (!anchor.closest || !anchor.closest("[data-additional-file-version]")) return { matched: false };
    return { matched: true, insertAfter: anchor.closest(".panel") || anchor.parentNode };
  }
  function findLegacyInsertionPoint(anchor) {
    return (anchor.closest ? anchor.closest("dl, .digital-object, .instance") : null) || anchor.parentNode;
  }
  function findInsertAfter(anchor) {
    const sourceGroup = findSourceGroup(anchor);
    if (sourceGroup) return sourceGroup;
    const externalBlock = findExternalObjectBlock(anchor);
    if (externalBlock.matched) return externalBlock.insertAfter;
    const additionalBlock = findAdditionalVersionBlock(anchor);
    if (additionalBlock.matched) return additionalBlock.insertAfter;
    return findLegacyInsertionPoint(anchor);
  }
  function getPageContext(document2) {
    const context = document2.querySelector("[data-dv-page-context]");
    const dataset = context && context.dataset ? context.dataset : {};
    return {
      recordType: dataset.recordType || "",
      hasChildren: dataset.hasChildren === "true",
      paneExists: !!document2.querySelector("#notes_row > .resizable-content-pane")
    };
  }
  function getLeafLayoutPane(document2) {
    return document2.querySelector("#notes_row > .resizable-content-pane");
  }
  function existingViewerColumn(pane) {
    const viewerColumn = pane.querySelector("#dv-viewer-column");
    if (!viewerColumn) return null;
    pane.classList.add("dv-enhanced-pane");
    return viewerColumn;
  }
  function createLeafLayoutColumns(document2) {
    const metadataColumn = document2.createElement("div");
    const viewerColumn = document2.createElement("div");
    metadataColumn.className = "dv-metadata-column";
    viewerColumn.id = "dv-viewer-column";
    viewerColumn.className = "dv-viewer-column";
    return { metadataColumn, viewerColumn };
  }
  function movePaneChildren(pane, metadataColumn) {
    while (pane.firstChild) metadataColumn.appendChild(pane.firstChild);
  }
  function prepareLeafLayout(document2) {
    const pane = getLeafLayoutPane(document2);
    if (!pane || !pane.children) return null;
    const currentViewerColumn = existingViewerColumn(pane);
    if (currentViewerColumn) return currentViewerColumn;
    const { metadataColumn, viewerColumn } = createLeafLayoutColumns(document2);
    movePaneChildren(pane, metadataColumn);
    pane.appendChild(metadataColumn);
    pane.appendChild(viewerColumn);
    pane.classList.add("dv-enhanced-pane");
    pane.__dvLeafLayoutState = { pane, metadataColumn, viewerColumn };
    return viewerColumn;
  }
  function hasActiveMountForPane(activeMountStates, pane) {
    return activeMountStates.some(function(state) {
      return state && !state.disposed && state.layoutPane === pane;
    });
  }
  function findLeafLayoutColumns(pane) {
    const layoutState = pane.__dvLeafLayoutState;
    return {
      metadataColumn: layoutState && layoutState.metadataColumn || pane.querySelector(".dv-metadata-column"),
      viewerColumn: layoutState && layoutState.viewerColumn || pane.querySelector("#dv-viewer-column")
    };
  }
  function restoreMetadataChildren(pane, metadataColumn) {
    if (!metadataColumn) return;
    while (metadataColumn.firstChild) pane.appendChild(metadataColumn.firstChild);
    if (metadataColumn.parentNode) metadataColumn.parentNode.removeChild(metadataColumn);
  }
  function removeViewerColumn(viewerColumn) {
    if (viewerColumn && viewerColumn.parentNode) viewerColumn.parentNode.removeChild(viewerColumn);
  }
  function restoreLeafLayoutIfUnused(pane, activeMountStates) {
    if (!pane || hasActiveMountForPane(activeMountStates, pane)) return;
    const { metadataColumn, viewerColumn } = findLeafLayoutColumns(pane);
    if (!metadataColumn && !viewerColumn) return;
    restoreMetadataChildren(pane, metadataColumn);
    removeViewerColumn(viewerColumn);
    pane.classList.remove("dv-enhanced-pane");
    pane.__dvLeafLayoutState = null;
  }
  function createPageLayout({ document: document2 }) {
    return {
      findInsertAfter,
      getPageContext: function() {
        return getPageContext(document2);
      },
      prepareLeafLayout: function() {
        return prepareLeafLayout(document2);
      },
      restoreLeafLayoutIfUnused
    };
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
    } catch (e) {
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
  function createInitializer(dependencies) {
    function init() {
      initializeViewer(dependencies);
    }
    return { init };
  }
  function selectSources(group, config) {
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
  function createContainer(dependencies, group, selection, signature, viewerColumn) {
    const container = dependencies.document.createElement("div");
    container.className = "digital-viewer-container";
    container.__dvDescriptorSelection = selection;
    container.__dvMountOptions = {
      loadingTimeoutMs: dependencies.config.loadingTimeoutMs,
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
    dependencies.lifecycle.activeMountStates.push(state);
    return container;
  }
  function placeContainer(dependencies, container, selection, viewerColumn) {
    if (viewerColumn) {
      viewerColumn.appendChild(container);
      return true;
    }
    const insertAfter = dependencies.pageLayout.findInsertAfter(selection.primaryCandidate.item.anchor);
    if (!insertAfter || !insertAfter.parentNode) return false;
    insertAfter.parentNode.insertBefore(container, insertAfter.nextSibling);
    return true;
  }
  function isReusableMount(existing, signature) {
    return existing && !existing.disposed && existing.signature === signature && existing.container && existing.container.parentNode;
  }
  function mountReplacementGroup(dependencies, disposeMountState2, mountRankedSources, group, selection, signature, existing, layoutKind) {
    const viewerColumn = layoutKind === "leaf-digital-object" ? dependencies.pageLayout.prepareLeafLayout() : null;
    if (existing) disposeMountState2(existing, { preserveLayout: true });
    const container = createContainer(dependencies, group, selection, signature, viewerColumn);
    if (!placeContainer(dependencies, container, selection, viewerColumn)) {
      disposeMountState2(container.__dvMountState);
      return;
    }
    mountRankedSources(container, selection.rankedCandidates);
  }
  function mountGroup(dependencies, disposeMountState2, mountRankedSources, group, layoutKind) {
    const { selection, signature } = selectSources(group, dependencies.config);
    const existing = group.root && group.root.__dvMountState;
    if (!selection.primaryCandidate) {
      if (existing) disposeMountState2(existing);
      return;
    }
    if (isReusableMount(existing, signature)) {
      existing.seenInInit = true;
      return;
    }
    mountReplacementGroup(
      dependencies,
      disposeMountState2,
      mountRankedSources,
      group,
      selection,
      signature,
      existing,
      layoutKind
    );
  }
  function markMountsUnseen(activeMountStates) {
    activeMountStates.forEach(function(state) {
      state.seenInInit = false;
    });
  }
  function handleGroupMountError(dependencies, disposeMountState2, group) {
    try {
      disposeMountState2(group.root && group.root.__dvMountState);
    } catch (e) {
    }
    dependencies.console.warn("[digital_viewer] stage=startup code=group-unavailable");
  }
  function mountGroupsIndependently(dependencies, groups, layoutKind, disposeMountState2, mountRankedSources) {
    groups.forEach(function(group) {
      try {
        mountGroup(dependencies, disposeMountState2, mountRankedSources, group, layoutKind);
      } catch (e) {
        handleGroupMountError(dependencies, disposeMountState2, group);
      }
    });
  }
  function disposeUnseenMounts(activeMountStates, disposeMountState2) {
    activeMountStates.slice().forEach(function(state) {
      if (!state.seenInInit) disposeMountState2(state);
    });
  }
  function initializeViewer(dependencies) {
    if (typeof dependencies.OpenSeadragon === "undefined") {
      dependencies.console.warn("[digital_viewer] stage=startup code=osd-unavailable (OpenSeadragon not loaded)");
      return;
    }
    const groups = dependencies.sources.collectGroups();
    const activeMountStates = dependencies.lifecycle.activeMountStates;
    const disposeMountState2 = dependencies.lifecycle.disposeMountState;
    const mountRankedSources = dependencies.mountRankedSources;
    markMountsUnseen(activeMountStates);
    if (groups.length) {
      const layoutKind = classifyPageContext(dependencies.pageLayout.getPageContext());
      mountGroupsIndependently(dependencies, groups, layoutKind, disposeMountState2, mountRankedSources);
    }
    disposeUnseenMounts(activeMountStates, disposeMountState2);
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
  function createMountSequence(dependencies) {
    function mountRankedSources(container, ranked) {
      tryMountRankedSource(container, ranked, 0, dependencies);
    }
    return { mountRankedSources };
  }
  function tryMountRankedSource(container, ranked, rankIndex, dependencies) {
    const { lifecycle, mountDescriptor, reportFailure: reportFailure2 } = dependencies;
    const { createAttempt: createAttempt2, disposeAttempt: disposeAttempt2, isAttemptActive: isAttemptActive2, scheduleAttemptTimeout: scheduleAttemptTimeout2, clearAttemptTimeout: clearAttemptTimeout2 } = lifecycle;
    const mountState = container.__dvMountState;
    const attempt = createAttempt2();
    if (!mountState || mountState.disposed) return;
    if (mountState.attempt) disposeAttempt2(mountState.attempt);
    mountState.attempt = attempt;
    container.__dvMountAttempt = attempt;
    container.__dvMountOptions.allowFallbackOnTimeout = rankIndex + 1 < ranked.length;
    container.__dvMountOptions.attempt = attempt;
    scheduleAttemptTimeout2(
      attempt,
      container,
      getLoadingTimeout(container.__dvMountOptions),
      rankIndex + 1 < ranked.length,
      function() {
        if (!mountState.disposed) tryMountRankedSource(container, ranked, rankIndex + 1, dependencies);
      }
    );
    Promise.resolve().then(function() {
      if (!isAttemptActive2(attempt)) return Promise.reject(new Error("ATTEMPT_DISPOSED"));
      return mountDescriptor(container, ranked[rankIndex].descriptor);
    }).then(function() {
      if (!isAttemptActive2(attempt)) return;
      attempt.completed = true;
      clearAttemptTimeout2(attempt);
    }).catch(function() {
      if (!isAttemptActive2(attempt) || mountState.disposed) return;
      disposeAttempt2(attempt);
      if (rankIndex + 1 < ranked.length) {
        tryMountRankedSource(container, ranked, rankIndex + 1, dependencies);
      } else {
        reportFailure2(container, "viewer", "content-unavailable");
      }
    });
  }

  // src/runtime.mjs
  function createViewerFeatures(dependencies, lifecycle) {
    const { document: document2, fetch, Image, IntersectionObserver, setTimeout, clearTimeout } = dependencies;
    const { isAttemptActive: isAttemptActive2, registerAttemptCleanup: registerAttemptCleanup2 } = lifecycle;
    const controls = createControls({ document: document2, isAttemptActive: isAttemptActive2, registerAttemptCleanup: registerAttemptCleanup2 });
    const viewerModes = createViewerModes({ document: document2, isAttemptActive: isAttemptActive2 });
    const prefetch = createPrefetch({ fetch, Image, registerAttemptCleanup: registerAttemptCleanup2 });
    const thumbnails = createThumbnails({
      document: document2,
      IntersectionObserver,
      setTimeout,
      clearTimeout,
      isAttemptActive: isAttemptActive2,
      registerAttemptCleanup: registerAttemptCleanup2,
      warmSequenceCache: prefetch.warmSequenceCache
    });
    return { controls, viewerModes, prefetch, thumbnails };
  }
  function createOpenSeadragonViewer(dependencies, lifecycle, status, features) {
    return createViewer({
      document: dependencies.document,
      OpenSeadragon: dependencies.OpenSeadragon,
      setTimeout: dependencies.setTimeout,
      clearTimeout: dependencies.clearTimeout,
      resetContainer: status.resetContainer,
      showLoadingNotice: status.showLoadingNotice,
      clearLoadingNotice: status.clearLoadingNotice,
      isAttemptActive: lifecycle.isAttemptActive,
      disposeViewer: lifecycle.disposeViewer,
      registerAttemptCleanup: lifecycle.registerAttemptCleanup,
      addControls: features.controls.addControls,
      addPageNav: features.controls.addPageNav,
      addViewerModeActions: features.viewerModes.addViewerModeActions,
      addThumbnailCarousel: features.thumbnails.addThumbnailCarousel,
      warmSequenceCache: features.prefetch.warmSequenceCache,
      primeResourceUrl: features.prefetch.primeResourceUrl
    });
  }
  function createRuntimeAdapters(dependencies, lifecycle, status, features, mountOsdViewer2) {
    return createSourceAdapters({
      config: dependencies.config,
      document: dependencies.document,
      console: dependencies.console,
      fetch: dependencies.fetch,
      setTimeout: dependencies.setTimeout,
      clearTimeout: dependencies.clearTimeout,
      mountOsdViewer: mountOsdViewer2,
      reportFailure: status.reportFailure,
      isAttemptActive: lifecycle.isAttemptActive,
      showError: status.showError,
      resetContainer: status.resetContainer,
      addViewerModeActions: features.viewerModes.addViewerModeActions,
      showLoadingNotice: status.showLoadingNotice,
      clearLoadingNotice: status.clearLoadingNotice,
      registerAttemptCleanup: lifecycle.registerAttemptCleanup,
      createFallbackLink: status.createFallbackLink
    });
  }
  function createDescriptorMounter(adapters, resetContainer2) {
    return function mountDescriptor(container, descriptor) {
      resetContainer2(container);
      if (!Object.prototype.hasOwnProperty.call(adapters, descriptor.type)) {
        return Promise.reject(new Error("UNSUPPORTED_DESCRIPTOR"));
      }
      const adapter = adapters[descriptor.type];
      return adapter(container, descriptor, getContainerViewerOptions(container));
    };
  }
  function createRuntimeSources(document2, pageLayout, console2) {
    return createPageSources({
      document: document2,
      getPageContext: pageLayout.getPageContext,
      onContractFailure() {
        console2.warn("[digital_viewer] stage=discovery code=source-contract-missing");
      },
      onDiscoveryError() {
        console2.warn("[digital_viewer] stage=startup code=source-unavailable");
      }
    });
  }
  function createRuntimeServices(dependencies) {
    const status = createStatus({ document: dependencies.document, console: dependencies.console });
    const pageLayout = createPageLayout({ document: dependencies.document });
    const lifecycle = createLifecycle({
      AbortController: dependencies.AbortController,
      setTimeout: dependencies.setTimeout,
      clearTimeout: dependencies.clearTimeout,
      showLoadingNotice: status.showLoadingNotice,
      restoreLeafLayoutIfUnused: (pane) => pageLayout.restoreLeafLayoutIfUnused(
        pane,
        lifecycle.activeMountStates
      )
    });
    const features = createViewerFeatures(dependencies, lifecycle);
    const viewer = createOpenSeadragonViewer(dependencies, lifecycle, status, features);
    const adapters = createRuntimeAdapters(dependencies, lifecycle, status, features, viewer.mountOsdViewer);
    return { status, pageLayout, lifecycle, features, viewer, adapters };
  }
  function createRuntimeStartup(dependencies, services) {
    const { status, pageLayout, lifecycle, adapters } = services;
    const mountDescriptor = createDescriptorMounter(adapters, status.resetContainer);
    const sources = createRuntimeSources(dependencies.document, pageLayout, dependencies.console);
    const mountSequence = createMountSequence({ lifecycle, mountDescriptor, reportFailure: status.reportFailure });
    const initializer = createInitializer({
      config: dependencies.config,
      document: dependencies.document,
      console: dependencies.console,
      OpenSeadragon: dependencies.OpenSeadragon,
      sources,
      pageLayout,
      lifecycle,
      mountRankedSources: mountSequence.mountRankedSources
    });
    return { mountDescriptor, sources, initializer };
  }
  function createPublicRuntimeApi(services, startup) {
    const { features, viewer, adapters, lifecycle } = services;
    const { mountDescriptor, sources, initializer } = startup;
    return {
      addViewerModeActions: features.viewerModes.addViewerModeActions,
      getPreloadPageIndexes,
      buildThumbnailUrl,
      addControls: features.controls.addControls,
      addThumbnailCarousel: features.thumbnails.addThumbnailCarousel,
      warmSequenceCache: features.prefetch.warmSequenceCache,
      classifyPageContext,
      collectSourceAnchors: sources.collectSourceAnchors,
      mountOsdViewer: viewer.mountOsdViewer,
      mountDescriptor,
      adapters,
      getContainerViewerOptions,
      disposeMountState: lifecycle.disposeMountState,
      init: initializer.init
    };
  }
  function createViewerRuntime(dependencies) {
    const services = createRuntimeServices(dependencies);
    const startup = createRuntimeStartup(dependencies, services);
    return createPublicRuntimeApi(services, startup);
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
//# sourceMappingURL=digital_viewer.js.map?v=de7f5827dfcecb5c794aa5a767f0f26db62f86df2c4ac08d8328af8002af6779
