import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const sourcePath = fileURLToPath(new URL('../public/assets/digital_viewer.js', import.meta.url));

function loadHooks(options = {}) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const instrumented = source.replace(
    /\}\)\(\);\s*$/,
    "window.__digitalViewerTestHooks = { detectSource: detectSource, parseCompassHost: parseCompassHost, pickBestDescriptor: pickBestDescriptor, buildDescriptorSelection: buildDescriptorSelection, extractCompassTileSources: extractCompassTileSources, addViewerModeActions: addViewerModeActions, toLocalCantaloupeInfoUrl: toLocalCantaloupeInfoUrl, getPreloadPageIndexes: getPreloadPageIndexes, buildThumbnailUrl: buildThumbnailUrl, addControls: addControls, mountCompassManifest: mountCompassManifest, addThumbnailCarousel: addThumbnailCarousel, warmSequenceCache: warmSequenceCache, classifyPageContext: classifyPageContext, collectSourceAnchors: collectSourceAnchors, mountOsdViewer: mountOsdViewer, mountStaticImage: mountStaticImage, mountDescriptor: mountDescriptor, disposeMountState: disposeMountState, init: init, makeElement: document.createElement };\n})();"
  );

  function makeElement(tagName) {
    const element = {
      tagName,
      className: '',
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      dataset: {},
      title: '',
      value: '',
      type: '',
      disabled: false,
      parentNode: null,
      attributes: {},
      appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
        child.parentNode = null;
        return child;
      },
      addEventListener(eventName, handler) {
        this['on' + eventName] = handler;
      },
      setAttribute(name, value) {
        this.attributes[name] = value;
        this[name] = value;
      },
      removeAttribute(name) {
        delete this.attributes[name];
        delete this[name];
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
      querySelectorAll(selector) {
        const results = [];

        function matches(node) {
          if (!node) return false;
          if (selector.charAt(0) === '.') {
            return (node.className || '').split(/\s+/).indexOf(selector.slice(1)) !== -1;
          }
          if (selector.charAt(0) === '[' && selector.charAt(selector.length - 1) === ']') {
            const attributeSelector = selector.slice(1, -1);
            const parts = attributeSelector.split('=');
            const attributeName = parts[0];
            if (!Object.prototype.hasOwnProperty.call(node.attributes || {}, attributeName)) {
              return false;
            }
            if (parts.length === 1) {
              return true;
            }
            return String(node.attributes[attributeName]) === parts.slice(1).join('=').replace(/^"|"$/g, '');
          }
          return node.tagName === selector;
        }

        function visit(node) {
          (node.children || []).forEach(function (child) {
            if (matches(child)) {
              results.push(child);
            }
            visit(child);
          });
        }

        visit(this);
        return results;
      },
    };

    Object.defineProperty(element, 'innerHTML', {
      configurable: true,
      get() { return element._innerHTML || ''; },
      set(value) {
        element._innerHTML = String(value);
        if (value === '') {
          element.children.forEach(child => { child.parentNode = null; });
          element.children = [];
        }
      },
    });
    element.classList = {
      add() {
        Array.prototype.forEach.call(arguments, function (token) {
          if (!token) return;
          const tokens = element.className ? element.className.split(/\s+/) : [];
          if (tokens.indexOf(token) === -1) {
            tokens.push(token);
            element.className = tokens.join(' ').trim();
          }
        });
      },
      remove() {
        Array.prototype.forEach.call(arguments, function (token) {
          const tokens = element.className ? element.className.split(/\s+/) : [];
          element.className = tokens.filter(function (current) {
            return current && current !== token;
          }).join(' ');
        });
      },
      contains(token) {
        return (element.className ? element.className.split(/\s+/) : []).indexOf(token) !== -1;
      },
      toggle(token, force) {
        if (force === true) {
          this.add(token);
          return true;
        }
        if (force === false) {
          this.remove(token);
          return false;
        }
        if (this.contains(token)) {
          this.remove(token);
          return false;
        }
        this.add(token);
        return true;
      },
    };

    return element;
  }

  const documentStub = {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement(tagName) {
      return makeElement(tagName);
    },
  };

  const context = {
    window: {
      DigitalViewer: {
        cantaloupeBaseUrl: 'http://localhost:8080/iiif/2',
        compassBaseUrl: 'https://compass.fivecolleges.edu',
        compassHost: 'compass.fivecolleges.edu',
        ...options.config,
      },
    },
    document: options.document || documentStub,
    console: options.console || console,
    fetch: options.fetch || function () {
      throw new Error('fetch should not be called in unit tests');
    },
    OpenSeadragon: options.OpenSeadragon || function () {
      throw new Error('OpenSeadragon should not be called in unit tests');
    },
    IntersectionObserver: options.IntersectionObserver,
    Image: options.Image,
    URL,
    AbortController,
    Array,
    Object,
    setTimeout,
    clearTimeout,
    isFinite,
    decodeURIComponent,
    encodeURIComponent,
  };

  vm.runInNewContext(instrumented, context, { filename: sourcePath });
  return context.window.__digitalViewerTestHooks;
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeInitDocument(uris = ['https://example.org/image.jpg'], leaf = false) {
  const nodes = [];

  function makeNode(tagName) {
    const node = {
      tagName,
      className: '',
      textContent: '',
      innerHTML: '',
      style: {},
      children: [],
      dataset: {},
      attributes: {},
      parentNode: null,
      appendChild(child) {
        if (child.parentNode && child.parentNode !== this) child.parentNode.removeChild(child);
        child.parentNode = this;
        this.children.push(child);
        return child;
      },
      insertBefore(child, reference) {
        child.parentNode = this;
        const index = reference ? this.children.indexOf(reference) : -1;
        if (index === -1) this.children.push(child);
        else this.children.splice(index, 0, child);
        return child;
      },
      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) this.children.splice(index, 1);
        child.parentNode = null;
        return child;
      },
      addEventListener(name, handler) {
        this['on' + name] = handler;
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      getAttribute(name) {
        return this.attributes[name];
      },
      removeAttribute(name) {
        delete this.attributes[name];
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
      querySelectorAll(selector) {
        const result = [];
        function visit(current) {
          current.children.forEach(function (child) {
            if (selector === child.tagName ||
                (selector.charAt(0) === '#' && child.id === selector.slice(1)) ||
                (selector.charAt(0) === '.' && child.className.split(/\s+/).indexOf(selector.slice(1)) !== -1)) {
              result.push(child);
            }
            visit(child);
          });
        }
        visit(this);
        return result;
      },
    };
    Object.defineProperty(node, 'firstChild', {
      get() { return this.children[0] || null; },
    });
    Object.defineProperty(node, 'nextSibling', {
      get() {
        if (!this.parentNode) return null;
        const index = this.parentNode.children.indexOf(this);
        return index === -1 ? null : this.parentNode.children[index + 1] || null;
      },
    });
    Object.defineProperty(node, 'innerHTML', {
      configurable: true,
      get() { return node._innerHTML || ''; },
      set(value) {
        node._innerHTML = String(value);
        if (value === '') {
          node.children.forEach(child => { child.parentNode = null; });
          node.children = [];
        }
      },
    });
    node.classList = {
      add(...tokens) {
        const current = node.className ? node.className.split(/\s+/) : [];
        tokens.forEach(function (token) {
          if (current.indexOf(token) === -1) current.push(token);
        });
        node.className = current.join(' ');
      },
      remove(...tokens) {
        node.className = node.className.split(/\s+/).filter(function (token) {
          return tokens.indexOf(token) === -1;
        }).join(' ');
      },
      contains(token) {
        return node.className.split(/\s+/).indexOf(token) !== -1;
      },
      toggle(token, force) {
        const shouldAdd = typeof force === 'boolean' ? force : !this.contains(token);
        if (shouldAdd) this.add(token);
        else this.remove(token);
        return shouldAdd;
      },
    };
    return node;
  }

  const documentStub = {
    readyState: 'loading',
    addEventListener() {},
    createElement(tagName) {
      return makeNode(tagName);
    },
    querySelector(selector) {
      if (selector === '[data-dv-page-context]') return null;
      if (selector === '#notes_row > .resizable-content-pane') return null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'dt') return [];
      if (selector.indexOf('a[href]') !== -1) return nodes;
      return [];
    },
  };
  const host = makeNode('section');
  const sourceGroup = makeNode('div');
  let pane;
  let stockContent;
  uris.forEach(function (uri) {
    const anchor = makeNode('a');
    anchor.href = uri;
    sourceGroup.appendChild(anchor);
    nodes.push(anchor);
  });
  if (leaf) {
    pane = makeNode('section');
    pane.className = 'resizable-content-pane';
    stockContent = makeNode('div');
    stockContent.className = 'stock-content';
    pane.appendChild(stockContent);
    pane.appendChild(sourceGroup);
    host.appendChild(pane);
    documentStub.querySelector = function (selector) {
      if (selector === '[data-dv-page-context]') {
        return { dataset: { recordType: 'DigitalObject', hasChildren: 'false' } };
      }
      if (selector === '#notes_row > .resizable-content-pane') return pane;
      return null;
    };
  } else {
    host.appendChild(sourceGroup);
  }
  documentStub.sourceGroup = sourceGroup;
  documentStub.host = host;
  documentStub.pane = pane;
  documentStub.stockContent = stockContent;
  return documentStub;
}

test('detectSource normalizes bare Compass node URLs to direct manifest descriptors', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass.fivecolleges.edu/node/1353469')),
    {
      type: 'compass-manifest',
      manifestUrl: 'https://compass.fivecolleges.edu/node/1353469/manifest',
    }
  );
});

test('detectSource requires strict configured Compass host equality', function () {
  const hooks = loadHooks();

  assert.equal(
    hooks.detectSource('https://compass.fivecolleges.edu.example.org/islandora/object/item-1'),
    null
  );

  const unconfiguredHooks = loadHooks({
    config: {
      compassBaseUrl: '',
      compassHost: '',
    },
  });

  assert.equal(
    unconfiguredHooks.detectSource('https://example.org/system/files/page.tif'),
    null
  );

  const noCantaloupeHooks = loadHooks({
    config: {
      cantaloupeBaseUrl: '',
      compassBaseUrl: 'https://compass.fivecolleges.edu',
    },
  });

  assert.equal(
    noCantaloupeHooks.detectSource('https://compass.fivecolleges.edu/system/files/page.tif'),
    null
  );
});

test('parseCompassHost accepts only HTTP(S) hostnames and normalizes them', function () {
  const hooks = loadHooks();

  assert.equal(hooks.parseCompassHost(' HTTPS://Compass.Example.org/base/ '), 'compass.example.org');
  assert.equal(hooks.parseCompassHost(''), '');
  assert.equal(hooks.parseCompassHost('localhost:8080'), '');
  assert.equal(hooks.parseCompassHost('javascript:alert(1)'), '');
});

test('classifyPageContext enhances only an explicit leaf Digital Object page', function () {
  const hooks = loadHooks();

  assert.equal(
    hooks.classifyPageContext({ recordType: 'DigitalObject', hasChildren: false, paneExists: true }),
    'leaf-digital-object'
  );
  assert.equal(
    hooks.classifyPageContext({ recordType: 'DigitalObject', hasChildren: true, paneExists: true }),
    'stock'
  );
  assert.equal(
    hooks.classifyPageContext({ recordType: 'ArchivalObject', hasChildren: false, paneExists: true }),
    'stock'
  );
  assert.equal(
    hooks.classifyPageContext({ recordType: 'DigitalObject', hasChildren: false, paneExists: false }),
    'inline-fallback'
  );
});

test('collectSourceAnchors includes direct representative and thumbnail links but excludes figcaption browse links', function () {
  const hooks = loadHooks();
  const representative = { href: 'https://example.org/representative.jpg' };
  const external = { href: 'https://example.org/object.json' };
  const thumbnail = { href: 'https://example.org/thumb.jpg' };
  const browse = { href: '/repositories/2/resources/1/digitized' };
  const root = {
    querySelectorAll(selector) {
      return {
        '[data-rep-file-version-wrapper] > a[href]': [representative],
        '.available-digital-objects a.external-digital-object__link[href]': [external],
        '.available-digital-objects a.thumbnail[href]': [thumbnail],
        '[data-rep-file-version-wrapper] figcaption a[href]': [browse],
      }[selector] || [];
    },
  };

  const anchors = hooks.collectSourceAnchors(root);

  assert.equal(anchors.length, 3);
  assert.ok(anchors.includes(representative));
  assert.ok(anchors.includes(external));
  assert.ok(anchors.includes(thumbnail));
  assert.ok(!anchors.includes(browse));
});

test('mountOsdViewer attaches open handlers before opening without a tileSources constructor option', async function () {
  const calls = [];
  let constructedOptions;
  const fakeOpenSeadragon = (options) => {
    constructedOptions = options;
    return {
      canvas: { style: {} },
      viewport: {
        zoomBy() {},
        goHome() {},
        setRotation() {},
        getRotation() { return 0; },
        toggleFlip() {},
        setFlip() {},
        getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      addHandler(name) { calls.push(name); },
      open(source) { calls.push(['open', source]); },
    };
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');

  const mounting = hooks.mountOsdViewer(
    container,
    'https://example.org/image/info.json',
    { loadingTimeoutMs: 1, allowFallbackOnTimeout: true }
  );

  assert.equal(constructedOptions.tileSources, undefined);
  assert.ok(calls.indexOf('open') !== -1);
  assert.ok(calls.indexOf('open-failed') !== -1);
  assert.ok(calls.indexOf('tile-ready') !== -1);
  assert.equal(calls.indexOf('tile-drawn'), -1);
  assert.ok(calls.indexOf('open') < calls.findIndex(call => Array.isArray(call) && call[0] === 'open'));
  assert.deepEqual(calls.find(call => Array.isArray(call) && call[0] === 'open'), [
    'open',
    'https://example.org/image/info.json',
  ]);
  await assert.rejects(mounting, /OSD_TIMEOUT/);
});

test('mountStaticImage waits for image load before resolving and rejects on image error', async function () {
  const hooks = loadHooks();
  const container = hooks.makeElement('div');
  const mounting = hooks.mountStaticImage(container, { imageUrl: 'https://example.org/image.jpg' });
  const image = container.querySelector('img');

  assert.equal(typeof mounting.then, 'function');
  let settled = false;
  mounting.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);

  image.onload();
  await mounting;

  const failedContainer = hooks.makeElement('div');
  const failed = hooks.mountStaticImage(failedContainer, { imageUrl: 'https://example.org/broken.jpg' });
  failedContainer.querySelector('img').onerror();
  await assert.rejects(failed, /STATIC_IMAGE_FAILED/);
});

test('mountDescriptor propagates static-image load failures for source fallback', async function () {
  const hooks = loadHooks();
  const container = hooks.makeElement('div');
  const mounting = hooks.mountDescriptor(container, {
    type: 'static-image',
    imageUrl: 'https://example.org/broken.jpg',
  });

  assert.equal(typeof mounting.then, 'function');
  container.querySelector('img').onerror();
  await assert.rejects(mounting, /STATIC_IMAGE_FAILED/);
});

test('init reuses an unchanged source-group mount instead of duplicating it', async function () {
  const documentStub = makeInitDocument();
  const hooks = loadHooks({ document: documentStub });

  hooks.init();
  await Promise.resolve();
  const firstContainer = documentStub.host.children[1];
  firstContainer.querySelector('img').onload();
  await Promise.resolve();

  hooks.init();

  assert.equal(documentStub.host.children.length, 2);
  assert.equal(documentStub.host.children[1], firstContainer);
});

test('init removes an obsolete mount when the replacement source is unsupported', async function () {
  const documentStub = makeInitDocument();
  const hooks = loadHooks({ document: documentStub });

  hooks.init();
  await Promise.resolve();
  documentStub.host.children[1].querySelector('img').onload();
  await Promise.resolve();

  documentStub.sourceGroup.children[0].href = 'https://example.org/unsupported.txt';
  hooks.init();

  assert.equal(documentStub.host.querySelector('.digital-viewer-container'), null);
  assert.equal(documentStub.host.children.length, 1);
  assert.equal(documentStub.sourceGroup.children.length, 1);
});

test('leaf replacement reuses the enhanced viewer column and explicit disposal restores stock layout', async function () {
  const documentStub = makeInitDocument(['https://example.org/first.jpg'], true);
  const hooks = loadHooks({ document: documentStub });

  hooks.init();
  await Promise.resolve();
  const firstColumn = documentStub.pane.querySelector('#dv-viewer-column');
  const firstContainer = firstColumn.querySelector('.digital-viewer-container');
  firstContainer.querySelector('img').onload();
  await Promise.resolve();

  documentStub.sourceGroup.children[0].href = 'https://example.org/second.jpg';
  hooks.init();
  await Promise.resolve();

  assert.equal(documentStub.pane.querySelector('#dv-viewer-column'), firstColumn);
  assert.equal(firstColumn.querySelector('.digital-viewer-container').querySelector('img').src, 'https://example.org/second.jpg');

  hooks.disposeMountState(documentStub.pane.__dvMountState);

  assert.equal(documentStub.pane.querySelector('#dv-viewer-column'), null);
  assert.equal(documentStub.pane.querySelector('.dv-metadata-column'), null);
  assert.equal(documentStub.pane.classList.contains('dv-enhanced-pane'), false);
  assert.equal(documentStub.sourceGroup.parentNode, documentStub.pane);
});

test('disposing a pending mount clears owned work and is idempotent', async function () {
  const documentStub = makeInitDocument(['https://compass.fivecolleges.edu/system/files/page.tif']);
  let viewer;
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; }, setFullPage() {}, forceRedraw() {},
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      destroy() {
        this.destroyed = true;
        (handlers['before-destroy'] || []).forEach(handler => handler());
      },
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ document: documentStub, OpenSeadragon: fakeOpenSeadragon });

  hooks.init();
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  const state = documentStub.sourceGroup.__dvMountState;
  assert.ok(state);
  assert.equal(viewer.destroyed, undefined);

  hooks.disposeMountState(state);
  hooks.disposeMountState(state);
  await new Promise(resolve => setTimeout(resolve, 10));

  assert.equal(viewer.destroyed, true);
  assert.equal(documentStub.host.children.length, 1);
  assert.equal(documentStub.host.querySelector('.dv-loading-msg'), null);
});

test('init catches synchronous primary mount errors and falls back once', async function () {
  const documentStub = makeInitDocument([
    'https://compass.fivecolleges.edu/system/files/page.tif',
    'https://example.org/fallback.jpg',
  ]);
  const hooks = loadHooks({
    document: documentStub,
    OpenSeadragon() {
      throw new Error('constructor failure');
    },
  });

  hooks.init();
  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  const container = documentStub.host.children[1];
  assert.ok(container);
  assert.equal(documentStub.host.children.length, 2);
  assert.equal(container.querySelectorAll('img').length, 1);
  container.querySelector('img').onload();
  await Promise.resolve();
  assert.equal(container.querySelector('.dv-error-msg'), null);
});

test('init times out a pending manifest fetch and mounts the next source once', async function () {
  const documentStub = makeInitDocument([
    'https://libtools2.smith.edu/manifests/pending.json',
    'https://example.org/fallback.jpg',
  ]);
  let abortCount = 0;
  const hooks = loadHooks({
    document: documentStub,
    config: { loadingTimeoutMs: 5 },
    fetch(url, options) {
      assert.match(url, /pending\.json$/);
      return new Promise(function (resolve, reject) {
        options.signal.addEventListener('abort', function () {
          abortCount += 1;
          reject(new Error('AbortError'));
        });
      });
    },
  });

  hooks.init();
  await new Promise(resolve => setTimeout(resolve, 15));
  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  const container = documentStub.host.children[1];
  assert.equal(abortCount, 1);
  assert.equal(documentStub.host.children.length, 2);
  assert.equal(container.querySelectorAll('img').length, 1);
  container.querySelector('img').onload();
  await Promise.resolve();
});

test('init ignores a late manifest body after timed-out fallback', async function () {
  const documentStub = makeInitDocument([
    'https://libtools2.smith.edu/manifests/body-pending.json',
    'https://example.org/fallback.jpg',
  ]);
  let bodyResolve;
  let abortCount = 0;
  const hooks = loadHooks({
    document: documentStub,
    config: { loadingTimeoutMs: 5 },
    fetch(url, options) {
      assert.match(url, /body-pending\.json$/);
      options.signal.addEventListener('abort', function () {
        abortCount += 1;
      });
      return Promise.resolve({
        ok: true,
        json() {
          return new Promise(function (resolve) {
            bodyResolve = resolve;
          });
        },
      });
    },
  });

  hooks.init();
  await new Promise(resolve => setTimeout(resolve, 15));
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  const container = documentStub.host.children[1];

  assert.equal(abortCount, 1);
  assert.equal(container.querySelectorAll('img').length, 1);
  container.querySelector('img').onload();
  bodyResolve({ items: [] });
  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  assert.equal(documentStub.host.children.length, 2);
  assert.equal(container.querySelector('.dv-error-msg'), null);
});

test('final pending manifest shows one loading note and accepts late OSD success', async function () {
  const documentStub = makeInitDocument(['https://libtools2.smith.edu/manifests/final.json']);
  let manifestResolve;
  let viewer;
  const currentItem = {};
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; }, setFullPage() {}, forceRedraw() {},
      world: { getItemAt() { return currentItem; } },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({
    document: documentStub,
    config: { loadingTimeoutMs: 5 },
    OpenSeadragon: fakeOpenSeadragon,
    fetch() {
      return new Promise(function (resolve) {
        manifestResolve = resolve;
      });
    },
  });

  hooks.init();
  await new Promise(resolve => setTimeout(resolve, 15));
  const container = documentStub.host.children[1];
  assert.equal(container.querySelectorAll('.dv-loading-msg').length, 1);

  manifestResolve({
    ok: true,
    json() {
      return Promise.resolve({
        sequences: [{
          canvases: [{
            images: [{
              resource: {
                id: 'https://digital.smith.edu/images/page-1.jpg',
                service: { id: 'https://digital.smith.edu/iiif/2/page-1' },
              },
            }],
          }],
        }],
      });
    },
  });
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  viewer.handlers.open.forEach(handler => handler());
  viewer.handlers['tile-ready'].forEach(handler => handler({ page: 0 }));
  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  assert.equal(container.querySelector('.dv-loading-msg'), null);
  assert.equal(container.querySelector('.dv-error-msg'), null);
});

test('mountOsdViewer advances timed-out alternatives but retains a slow final viewer', async function () {
  const viewers = [];
  const fakeOpenSeadragon = (options) => {
    const handlers = {};
    const currentItem = {};
    const viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {},
        goHome() {},
        setRotation() {},
        getRotation() { return 0; },
        toggleFlip() {},
        setFlip() {},
        getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: { getItemAt() { return currentItem; } },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      destroy() { viewer.destroyed = true; },
      handlers,
      destroyed: false,
    };
    viewers.push(viewer);
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');

  const finalAttempt = hooks.mountOsdViewer(
    container,
    'https://example.org/slow-final/info.json',
    { loadingTimeoutMs: 1 }
  );
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(viewers[0].destroyed, false);
  assert.equal(container.querySelector('.dv-loading-msg').textContent, 'Still loading');

  viewers[0].handlers.open.forEach(handler => handler());
  viewers[0].handlers['tile-ready'].forEach(handler => handler());
  await finalAttempt;
  assert.equal(container.querySelector('.dv-loading-msg'), null);

  const alternativeContainer = hooks.makeElement('div');
  const alternativeAttempt = hooks.mountOsdViewer(
    alternativeContainer,
    'https://example.org/slow-alternative/info.json',
    { loadingTimeoutMs: 1, allowFallbackOnTimeout: true }
  );
  await assert.rejects(alternativeAttempt, /OSD_TIMEOUT/);
  assert.equal(viewers[1].destroyed, true);
});

test('tile-load-failed reports the unavailable page without replacing the active viewer', async function () {
  let viewer;
  const currentItem = {};
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {},
        goHome() {},
        setRotation() {},
        getRotation() { return 0; },
        toggleFlip() {},
        setFlip() {},
        getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: { getItemAt() { return currentItem; } },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountOsdViewer(
    container,
    'https://example.org/page/info.json',
    { loadingTimeoutMs: 20 }
  );

  viewer.handlers.open.forEach(handler => handler());
  viewer.handlers['tile-ready'].forEach(handler => handler());
  await mounting;
  viewer.handlers['tile-load-failed'].forEach(handler => handler({}));
  viewer.handlers['tile-load-failed'].forEach(handler => handler({}));

  assert.equal(container.querySelector('.dv-tile-error-msg').textContent, 'This page is unavailable.');
  assert.equal(viewer.destroyed, undefined);
});

test('later page failures stay page-scoped and clear after recovery', async function () {
  let viewer;
  const pageItems = [{}, {}];
  let currentPageItem = pageItems[0];
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: {
        getItemAt() { return currentPageItem; },
      },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountOsdViewer(container, [
    { tileSource: 'page-1', imageUrl: 'https://example.org/page-1.jpg' },
    { tileSource: 'page-2', imageUrl: 'https://example.org/page-2.jpg' },
  ], { loadingTimeoutMs: 20 });

  viewer.handlers.open.forEach(handler => handler());
  currentPageItem = pageItems[1];
  viewer.handlers.page.forEach(handler => handler({ page: 1 }));
  await mounting;

  const failedTile = {};
  viewer.handlers['tile-load-failed'].forEach(handler => handler({
    tile: {},
    tiledImage: pageItems[0],
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);
  viewer.handlers['tile-load-failed'].forEach(handler => handler({
    tile: failedTile,
    tiledImage: pageItems[1],
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg').textContent, 'This page is unavailable.');

  viewer.handlers['tile-ready'].forEach(handler => handler({
    tile: {},
    tiledImage: pageItems[0],
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');
  viewer.handlers['tile-ready'].forEach(handler => handler({
    tile: {},
    tiledImage: pageItems[1],
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');
  viewer.handlers['tile-ready'].forEach(handler => handler({
    tile: failedTile,
    tiledImage: pageItems[1],
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);
});

test('rapid sequence navigation ignores retired image events while the world is empty', async function () {
  let viewer;
  const originalA = {};
  const replacementA = {};
  let currentPageItem = originalA;
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: {
        getItemAt() { return currentPageItem; },
      },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountOsdViewer(container, [
    { tileSource: 'page-a', imageUrl: 'https://example.org/page-a.jpg' },
    { tileSource: 'page-b', imageUrl: 'https://example.org/page-b.jpg' },
  ], { loadingTimeoutMs: 20 });

  viewer.handlers.open.forEach(handler => handler());
  await mounting;

  currentPageItem = null;
  viewer.handlers.close.forEach(handler => handler());
  viewer.handlers.page.forEach(handler => handler({ page: 1 }));
  viewer.handlers.close.forEach(handler => handler());
  viewer.handlers.page.forEach(handler => handler({ page: 0 }));

  const delayedTile = {};
  viewer.handlers['tile-load-failed'].forEach(handler => handler({
    tile: delayedTile,
    tiledImage: originalA,
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);
  viewer.handlers['tile-ready'].forEach(handler => handler({
    tile: delayedTile,
    tiledImage: originalA,
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);

  currentPageItem = replacementA;
  viewer.handlers.open.forEach(handler => handler());
  const replacementTile = {};
  viewer.handlers['tile-load-failed'].forEach(handler => handler({
    tile: replacementTile,
    tiledImage: replacementA,
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '0');
  viewer.handlers['tile-ready'].forEach(handler => handler({
    tile: replacementTile,
    tiledImage: replacementA,
  }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);
});

test('page-level source failures use active page ownership without an image', async function () {
  let viewer;
  const pageItems = [{}, {}];
  let currentPageItem = pageItems[0];
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: {
        getItemAt() { return currentPageItem; },
      },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountOsdViewer(container, [
    { tileSource: 'page-a', imageUrl: 'https://example.org/page-a.jpg' },
    { tileSource: 'page-b', imageUrl: 'https://example.org/page-b.jpg' },
  ], { loadingTimeoutMs: 20 });

  viewer.handlers.open.forEach(handler => handler());
  await mounting;

  currentPageItem = null;
  viewer.handlers.close.forEach(handler => handler());
  viewer.handlers.page.forEach(handler => handler({ page: 1 }));
  viewer.handlers['open-failed'].forEach(handler => handler({ source: 'retired-page' }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);
  viewer.handlers['open-failed'].forEach(handler => handler({ source: 'page-a' }));
  assert.equal(container.querySelector('.dv-tile-error-msg'), null);

  viewer.handlers['open-failed'].forEach(handler => handler({ source: 'page-b' }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');
  viewer.handlers['open-failed'].forEach(handler => handler({ source: 'page-a' }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');
});

test('unavailable sequence canvases show an error when their placeholders open', async function () {
  let viewer;
  const pageItems = [{}, {}];
  let currentPageItem = pageItems[0];
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; },
      setFullPage() {},
      forceRedraw() {},
      world: {
        getItemAt() { return currentPageItem; },
      },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({ OpenSeadragon: fakeOpenSeadragon });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountOsdViewer(container, [
    { tileSource: 'page-a', imageUrl: 'https://example.org/page-a.jpg' },
    {
      tileSource: {
        type: 'image',
        url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
      },
      unavailable: true,
      pageIndex: 1,
    },
  ], { loadingTimeoutMs: 20 });

  viewer.handlers.open.forEach(handler => handler());
  await mounting;

  currentPageItem = null;
  viewer.handlers.close.forEach(handler => handler());
  viewer.handlers.page.forEach(handler => handler({ page: 1 }));
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');

  currentPageItem = pageItems[1];
  viewer.handlers.open.forEach(handler => handler());
  assert.equal(container.querySelector('.dv-tile-error-msg').getAttribute('data-page-index'), '1');
});

test('an entirely unavailable manifest falls back to a working alternative', async function () {
  const documentStub = makeInitDocument([
    'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/test/manifests/unavailable.json',
    'https://example.org/fallback.jpg',
  ]);
  let viewer;
  let currentItem;
  const fakeOpenSeadragon = () => {
    const handlers = {};
    viewer = {
      canvas: { style: {} },
      viewport: {
        zoomBy() {}, goHome() {}, setRotation() {}, getRotation() { return 0; },
        toggleFlip() {}, setFlip() {}, getFlip() { return false; },
      },
      isFullPage() { return false; }, setFullPage() {}, forceRedraw() {},
      world: { getItemAt() { return currentItem; } },
      addHandler(name, handler) {
        if (!handlers[name]) handlers[name] = [];
        handlers[name].push(handler);
      },
      open() {
        currentItem = {};
        (handlers.open || []).forEach(handler => handler({ source: 'placeholder' }));
      },
      destroy() {},
      handlers,
    };
    return viewer;
  };
  const hooks = loadHooks({
    document: documentStub,
    config: { cantaloupeBaseUrl: '' },
    OpenSeadragon: fakeOpenSeadragon,
    fetch() {
      return Promise.resolve({
        ok: true,
        json() {
          return Promise.resolve({
            sequences: [{
              canvases: [{
                images: [{
                  resource: {
                    service: {
                      id: 'https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2Flegacy.tif',
                    },
                  },
                }],
              }],
            }],
          });
        },
      });
    },
  });

  hooks.init();
  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  const container = documentStub.host.children[1];
  assert.equal(container.querySelectorAll('img').length, 1);
  assert.equal(container.querySelector('.dv-error-msg'), null);
  container.querySelector('img').onload();
  await Promise.resolve();
});

test('source failure diagnostics omit raw errors, URLs, and query strings', async function () {
  const rawError = 'resolved https://example.org/manifest.json?token=secret-value';
  const logs = [];
  const hooks = loadHooks({
    console: { warn(...args) { logs.push(args.join(' ')); } },
    fetch() { return Promise.reject(new Error(rawError)); },
  });
  const container = hooks.makeElement('div');
  const mounting = hooks.mountCompassManifest(container, {
    manifestUrl: 'https://example.org/manifest.json',
  });

  await assert.rejects(mounting);
  assert.equal(container.querySelector('.dv-error-msg').textContent.includes(rawError), false);
  assert.equal(logs.join(' ').includes(rawError), false);
});

test('detectSource detects workbench-lite manifest URLs', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/manifests/smith_ssc_ms00237_as542263.json')),
    {
      type: 'compass-manifest',
      manifestUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/manifests/smith_ssc_ms00237_as542263.json',
    }
  );
});

test('detectSource recognizes direct Compass PDF URLs', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass.fivecolleges.edu/system/files/2024-11/smith_ca_ms01117_as559172_001.pdf')),
    {
      type: 'static-pdf',
      url: 'https://compass.fivecolleges.edu/system/files/2024-11/smith_ca_ms01117_as559172_001.pdf',
    }
  );
});

test('detectSource recognizes generic external PDF URLs as static PDFs', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://example.org/files/object-1.pdf')),
    {
      type: 'static-pdf',
      url: 'https://example.org/files/object-1.pdf',
    }
  );
});

test('detectSource recognizes direct Compass-hosted images as static images', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/styles/large/public/2023-08/79665.jpg')),
    {
      type: 'static-image',
      imageUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/styles/large/public/2023-08/79665.jpg',
    }
  );
});

test('detectSource recognizes generic external images as static images', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://example.org/images/object-1.jpg')),
    {
      type: 'static-image',
      imageUrl: 'https://example.org/images/object-1.jpg',
    }
  );
});

test('detectSource normalizes Compass object aliases to Islandora object URLs', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass.fivecolleges.edu/object/smith:1358434')),
    {
      type: 'compass',
      compassUrl: 'https://compass.fivecolleges.edu/islandora/object/smith:1358434',
    }
  );
});

test('detectSource preserves existing Islandora object URLs', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.detectSource('https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541926')),
    {
      type: 'compass',
      compassUrl: 'https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541926',
    }
  );
});

test('toLocalCantaloupeInfoUrl decodes doubly-encoded Compass TIFF identifiers once', function () {
  const hooks = loadHooks();

  assert.equal(
    hooks.toLocalCantaloupeInfoUrl('https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2F2023-08%2Fsmith%253A1358443.tif'),
    'http://localhost:8080/iiif/2/2023-08%2Fsmith%3A1358443.tif/info.json'
  );
});

test('toLocalCantaloupeInfoUrl disables legacy key rewriting without a usable base', function () {
  const serviceId = 'https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2F2023-08%2Fsmith%253A1358443.tif';
  const manifest = {
    sequences: [{
      canvases: [{
        images: [{ resource: { service: { id: serviceId } } }],
      }],
    }],
  };

  ['', '  ', null, 'javascript:alert(1)'].forEach(function (baseUrl) {
    const hooks = loadHooks({ config: { cantaloupeBaseUrl: baseUrl } });
    assert.equal(hooks.toLocalCantaloupeInfoUrl(serviceId), '');
    assert.equal(hooks.extractCompassTileSources(manifest).length, 1);
    assert.equal(hooks.extractCompassTileSources(manifest)[0].unavailable, true);
  });
});

test('extractCompassTileSources preserves unavailable canvases and original page positions', function () {
  const hooks = loadHooks({ config: { cantaloupeBaseUrl: '' } });
  const service = (id) => ({ images: [{ resource: { service: { id } } }] });
  const manifest = {
    sequences: [{
      canvases: [
        service('https://delivery.example.org/iiif/2/page-1'),
        service('https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2Fpage-2.tif'),
        service('https://delivery.example.org/iiif/2/page-3'),
      ],
    }],
  };

  const pages = hooks.extractCompassTileSources(manifest);

  assert.equal(pages.length, 3);
  assert.deepEqual(normalize(pages.map(page => page.pageIndex)), [0, 1, 2]);
  assert.equal(pages[0].unavailable, undefined);
  assert.equal(pages[1].unavailable, true);
  assert.equal(pages[2].unavailable, undefined);
});

test('getPreloadPageIndexes prioritizes the current page and nearby sequence pages', function () {
  const hooks = loadHooks();

  assert.deepEqual(
    normalize(hooks.getPreloadPageIndexes(2, 6, 2)),
    [2, 1, 3, 0, 4]
  );

  assert.deepEqual(
    normalize(hooks.getPreloadPageIndexes(0, 4, 2)),
    [0, 1, 2]
  );
});

test('buildThumbnailUrl derives thumbnail images for IIIF and static image sources', function () {
  const hooks = loadHooks();

  assert.equal(
    hooks.buildThumbnailUrl({
      tileSource: 'http://localhost:8080/iiif/2/2025-10%2F1372440.tif/info.json',
      thumbnailUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-10/1372440.jpg',
    }),
    'https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-10/1372440.jpg'
  );

  assert.equal(
    hooks.buildThumbnailUrl('http://localhost:8080/iiif/2/2025-10%2F1372440.tif/info.json'),
    'http://localhost:8080/iiif/2/2025-10%2F1372440.tif/full/!160,160/0/default.jpg'
  );

  assert.equal(
    hooks.buildThumbnailUrl({ type: 'image', url: 'https://example.org/images/object-1.jpg' }),
    'https://example.org/images/object-1.jpg'
  );
});

test('pickBestDescriptor prefers canonical Compass sources', function () {
  const hooks = loadHooks();

  const manifestDescriptor = hooks.detectSource('https://compass.fivecolleges.edu/node/1363011/manifest-single');
  const islandoraDescriptor = hooks.detectSource('https://compass.fivecolleges.edu/islandora/object/smith_ca_ms01038_as382303_001');
  const thumbnailDescriptor = hooks.detectSource('https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-08/1363011.jpg');

  assert.deepEqual(
    normalize(hooks.pickBestDescriptor([thumbnailDescriptor, islandoraDescriptor, manifestDescriptor])),
    normalize(manifestDescriptor)
  );

  const multipageCompassDescriptor = hooks.detectSource('https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541926');

  assert.deepEqual(
    normalize(hooks.pickBestDescriptor([thumbnailDescriptor, multipageCompassDescriptor])),
    normalize(multipageCompassDescriptor)
  );

  const pdfDescriptor = hooks.detectSource('https://compass.fivecolleges.edu/system/files/2024-11/smith_ca_ms01117_as559172_001.pdf');
  const nodeDescriptor = hooks.detectSource('https://compass.fivecolleges.edu/node/1353469');

  assert.deepEqual(
    normalize(hooks.pickBestDescriptor([thumbnailDescriptor, islandoraDescriptor, nodeDescriptor, pdfDescriptor])),
    normalize(nodeDescriptor)
  );
});

test('buildDescriptorSelection keeps image viewers primary while retaining whole-object PDF companions', function () {
  const hooks = loadHooks();
  const compassCandidate = {
    item: { uri: 'https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541926' },
    descriptor: hooks.detectSource('https://compass.fivecolleges.edu/islandora/object/smith_ssc_ms00237_as541926'),
  };
  const pdfCandidate = {
    item: { uri: 'https://compass.fivecolleges.edu/system/files/2023-08/smith%3A1362898.pdf' },
    descriptor: hooks.detectSource('https://compass.fivecolleges.edu/system/files/2023-08/smith%3A1362898.pdf'),
  };

  const mixedSelection = hooks.buildDescriptorSelection([pdfCandidate, compassCandidate]);

  assert.equal(mixedSelection.primaryCandidate.descriptor.type, 'compass');
  assert.deepEqual(
    normalize(mixedSelection.rankedCandidates.map(function (candidate) {
      return candidate.descriptor.type;
    })),
    ['compass', 'static-pdf']
  );
  assert.deepEqual(
    normalize(mixedSelection.companionCandidates.map(function (candidate) {
      return candidate.descriptor.type;
    })),
    ['static-pdf']
  );

  const pdfOnlySelection = hooks.buildDescriptorSelection([pdfCandidate]);

  assert.equal(pdfOnlySelection.primaryCandidate.descriptor.type, 'static-pdf');
  assert.deepEqual(normalize(pdfOnlySelection.companionCandidates), []);
});

test('extractCompassTileSources preserves per-page metadata needed for page mode decisions', function () {
  const hooks = loadHooks();
  const manifest = {
    sequences: [{
      canvases: [{
        '@id': 'https://compass.fivecolleges.edu/node/1372439/canvas/6653288',
        label: '9 to 5, Boston MA, 1983, page 1',
        images: [{
          resource: {
            '@id': 'https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2F2025-10%2Fsmith_ssc_ms00237_as541926_p0001.tif/full/full/0/default.jpg',
            service: {
              '@id': 'https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2F2025-10%2Fsmith_ssc_ms00237_as541926_p0001.tif',
            },
          },
        }],
        metadata: [{ label: 'Identifier', value: 'smith_ssc_ms00237_as541926_p0001' }],
        seeAlso: {
          '@id': 'https://compass.fivecolleges.edu/system/files/2025-10/smith_ssc_ms00237_as541926_p0001.html',
          format: 'text/vnd.hocr+html',
        },
        thumbnail: {
          '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-10/1372440.jpg',
        },
      }],
    }],
  };

  assert.deepEqual(
    normalize(hooks.extractCompassTileSources(manifest)),
    [{
      tileSource: 'http://localhost:8080/iiif/2/2025-10%2Fsmith_ssc_ms00237_as541926_p0001.tif/info.json',
      thumbnailUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/s3fs-public/2025-10/1372440.jpg',
      pageIndex: 0,
      pageLabel: '9 to 5, Boston MA, 1983, page 1',
      canvasId: 'https://compass.fivecolleges.edu/node/1372439/canvas/6653288',
      pageIdentifier: 'smith_ssc_ms00237_as541926_p0001',
      imageUrl: 'https://compass.fivecolleges.edu/cantaloupe/iiif/2/https%3A%2F%2Fcompass.fivecolleges.edu%2Fsystem%2Ffiles%2F2025-10%2Fsmith_ssc_ms00237_as541926_p0001.tif/full/full/0/default.jpg',
      ocrUrl: 'https://compass.fivecolleges.edu/system/files/2025-10/smith_ssc_ms00237_as541926_p0001.html',
      ocrFormat: 'text/vnd.hocr+html',
    }]
  );
});

test('extractCompassTileSources works with workbench-lite-style IIIF 2 manifests', function () {
  const hooks = loadHooks();
  const manifest = {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/manifests/smith_ssc_ms00237_as542263.json',
    '@type': 'sc:Manifest',
    sequences: [{
      '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/manifests/smith_ssc_ms00237_as542263/sequence/normal',
      '@type': 'sc:Sequence',
      canvases: [{
        '@id': 'page/smith_ssc_ms00237_as542263_p0001',
        label: 'Page 1',
        images: [{
          '@type': 'oa:Annotation',
          motivation: 'sc:painting',
          on: 'page/smith_ssc_ms00237_as542263_p0001',
          resource: {
            '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/objects/smith_ssc_ms00237_as542263_p0001.jpg',
            '@type': 'dctypes:Image',
            format: 'image/jpeg',
            service: {
              '@id': 'http://localhost:8182/iiif/2/workbench-lite%2Fobjects%2Fsmith_ssc_ms00237_as542263_p0001.jpg',
            },
          },
        }],
        metadata: [{ label: 'Identifier', value: 'smith_ssc_ms00237_as542263_p0001' }],
        seeAlso: {
          '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/hocr/smith_ssc_ms00237_as542263_p0001.html',
          format: 'text/vnd.hocr+html',
        },
        thumbnail: {
          '@id': 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/thumbs/smith_ssc_ms00237_as542263_p0001.jpg',
        },
      }],
    }],
  };

  assert.deepEqual(
    normalize(hooks.extractCompassTileSources(manifest)),
    [{
      tileSource: 'http://localhost:8182/iiif/2/workbench-lite%2Fobjects%2Fsmith_ssc_ms00237_as542263_p0001.jpg/info.json',
      thumbnailUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/thumbs/smith_ssc_ms00237_as542263_p0001.jpg',
      pageIndex: 0,
      pageLabel: 'Page 1',
      canvasId: 'page/smith_ssc_ms00237_as542263_p0001',
      pageIdentifier: 'smith_ssc_ms00237_as542263_p0001',
      imageUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/objects/smith_ssc_ms00237_as542263_p0001.jpg',
      ocrUrl: 'https://compass-prod-i2-files.s3.amazonaws.com/workbench-lite/smith_steinem_text/hocr/smith_ssc_ms00237_as542263_p0001.html',
      ocrFormat: 'text/vnd.hocr+html',
    }]
  );
});

test('addViewerModeActions requires explicit page mode before showing page image download', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
  const pageHandlers = [];
  const viewer = {
    addHandler(name, handler) {
      if (name === 'page') {
        pageHandlers.push(handler);
      }
    },
  };

  const state = hooks.addViewerModeActions(container, viewer, [
    {
      tileSource: 'http://localhost:8080/iiif/2/object-p0001/info.json',
      pageLabel: 'Page 1',
      imageUrl: 'https://example.org/object-p0001.jpg',
    },
    {
      tileSource: 'http://localhost:8080/iiif/2/object-p0002/info.json',
      pageLabel: 'Page 2',
      imageUrl: 'https://example.org/object-p0002.jpg',
    },
  ], {
    objectDownloadPdfUrl: 'https://example.org/object.pdf',
  });

  assert.equal(container.children.length, 1);
  assert.equal(state.mode, 'object');
  assert.equal(state.modeLabel.textContent, 'Object view');
  assert.equal(state.downloadPdfLink.getAttribute('href'), 'https://example.org/object.pdf');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'false');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'true');
  assert.equal(state.openPageButton.textContent, 'Open page 1');

  state.openPageButton.onclick();

  assert.equal(state.mode, 'page');
  assert.equal(state.modeLabel.textContent, 'Page 1');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'true');
  assert.equal(state.downloadImageLink.getAttribute('href'), 'https://example.org/object-p0001.jpg');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'false');
  assert.equal(state.backToObjectButton.getAttribute('aria-hidden'), 'false');

  pageHandlers[0]({ page: 1 });

  assert.equal(state.modeLabel.textContent, 'Page 2');
  assert.equal(state.downloadImageLink.getAttribute('href'), 'https://example.org/object-p0002.jpg');

  state.backToObjectButton.onclick();

  assert.equal(state.mode, 'object');
  assert.equal(state.modeLabel.textContent, 'Object view');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'false');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'true');
});

test('addViewerModeActions shows a companion PDF in object mode and restores it after leaving page mode', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
  const pageHandlers = [];
  const viewer = {
    addHandler(name, handler) {
      if (name === 'page') {
        pageHandlers.push(handler);
      }
    },
  };

  const state = hooks.addViewerModeActions(container, viewer, [
    {
      tileSource: 'http://localhost:8080/iiif/2/object-p0001/info.json',
      pageLabel: 'Page 1',
      imageUrl: 'https://example.org/object-p0001.jpg',
    },
    {
      tileSource: 'http://localhost:8080/iiif/2/object-p0002/info.json',
      pageLabel: 'Page 2',
      imageUrl: 'https://example.org/object-p0002.jpg',
    },
  ], {
    objectDownloadPdfUrl: 'https://example.org/object.pdf',
  });

  assert.equal(state.mode, 'object');
  assert.equal(state.downloadPdfLink.getAttribute('href'), 'https://example.org/object.pdf');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'false');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'true');

  pageHandlers[0]({ page: 1 });
  state.openPageButton.onclick();

  assert.equal(state.mode, 'page');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'true');
  assert.equal(state.downloadImageLink.getAttribute('href'), 'https://example.org/object-p0002.jpg');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'false');

  state.backToObjectButton.onclick();

  assert.equal(state.mode, 'object');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'false');
  assert.equal(state.downloadImageLink.getAttribute('aria-hidden'), 'true');
});

test('addViewerModeActions hides unsafe javascript: image download URLs', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };

  const state = hooks.addViewerModeActions(container, null, [{
    tileSource: 'http://localhost:8080/iiif/2/object-p0001/info.json',
    pageLabel: 'Page 1',
    imageUrl: 'javascript:alert(1)',
  }], {});

  assert.equal(state, null);
  assert.equal(container.children.length, 0);
});

test('addViewerModeActions hides unsafe javascript: PDF companion URLs', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };

  const state = hooks.addViewerModeActions(container, null, [{
    tileSource: 'http://localhost:8080/iiif/2/object-p0001/info.json',
    pageLabel: 'Page 1',
    imageUrl: 'https://example.org/object-p0001.jpg',
  }, {
    tileSource: 'http://localhost:8080/iiif/2/object-p0002/info.json',
    pageLabel: 'Page 2',
    imageUrl: 'https://example.org/object-p0002.jpg',
  }], {
    objectDownloadPdfUrl: 'javascript:alert(1)',
  });

  assert.equal(state.mode, 'object');
  assert.equal(state.downloadPdfLink.getAttribute('aria-hidden'), 'true');
  assert.equal(state.downloadPdfLink.getAttribute('href'), undefined);
});

test('addControls renders a bottom toolbar with primary actions and an adjustment popover trigger', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
  const noop = function () {};
  const viewer = {
    canvas: { style: {} },
    viewport: {
      zoomBy: noop,
      goHome: noop,
      setRotation: noop,
      getRotation() { return 0; },
      toggleFlip: noop,
      setFlip: noop,
      getFlip() { return false; },
    },
    isFullPage() { return false; },
    setFullPage: noop,
    forceRedraw: noop,
  };

  hooks.addControls(container, viewer);

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].className, 'dv-controls');

  assert.deepEqual(
    {
      childCount: container.children[0].children.length,
      barClassName: container.children[0].children[0].className,
      actionsClassName: container.children[0].children[0].children[0].className,
      statusClassName: container.children[0].children[0].children[1].className,
      popoverClassName: container.children[0].children[1].className,
      dismissTitle: container.children[0].children[0].children[1].children[1].title,
      toggleClassName: container.children[0].children[2].className,
      actionTitles: container.children[0].children[0].children[0].children.map(function (button) {
        return button.title;
      }),
    },
    {
      childCount: 3,
      barClassName: 'dv-controls-bar',
      actionsClassName: 'dv-controls-actions',
      statusClassName: 'dv-controls-status',
      popoverClassName: 'dv-adjust-popover',
      dismissTitle: 'Hide toolbar',
      toggleClassName: 'dv-controls-toggle',
      actionTitles: [
        'Zoom out',
        'Zoom in',
        'Reset zoom to fit',
        'Adjust image',
      ],
    }
  );

  assert.equal(container.children[0].children[1].getAttribute('aria-hidden'), 'true');
  assert.equal(container.children[0].className, 'dv-controls');
});

test('addControls keeps the toolbar visible until the user hides it, then allows showing it again', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
  const viewer = {
    canvas: { style: {} },
    viewport: {
      zoomBy() {},
      goHome() {},
      setRotation() {},
      getRotation() { return 0; },
      toggleFlip() {},
      setFlip() {},
      getFlip() { return false; },
    },
    isFullPage() { return false; },
    setFullPage() {},
    forceRedraw() {},
  };

  hooks.addControls(container, viewer);

  const controls = container.children[0];
  const dismissButton = controls.children[0].children[1].children[1];
  const toggleButton = controls.children[2];
  const adjustButton = controls.children[0].children[0].children[3];

  assert.equal(controls.className, 'dv-controls');
  assert.equal(adjustButton.getAttribute('aria-expanded'), 'false');

  dismissButton.onclick();

  assert.equal(controls.className, 'dv-controls is-collapsed');
  assert.equal(controls.children[1].getAttribute('aria-hidden'), 'true');
  assert.equal(toggleButton.title, 'Show toolbar');

  toggleButton.onclick();

  assert.equal(controls.className, 'dv-controls');
  assert.equal(toggleButton.title, 'Show toolbar');
});

test('addControls opens the adjustment popover and applies slider-based image changes', function () {
  const hooks = loadHooks();
  const container = {
    children: [],
    className: 'digital-viewer-container',
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
  };
  const viewer = {
    canvas: { style: {} },
    viewport: {
      zoomBy() {},
      goHome() {},
      setRotation() {},
      getRotation() { return 0; },
      toggleFlip() {},
      setFlip() {},
      getFlip() { return false; },
    },
    isFullPage() { return false; },
    setFullPage() {},
    forceRedraw() {},
  };

  hooks.addControls(container, viewer);

  const bar = container.children[0];
  const actionButtons = bar.children[0].children[0].children;
  const popover = bar.children[1];
  const adjustButton = actionButtons[3];

  adjustButton.onclick();

  assert.equal(popover.getAttribute('aria-hidden'), 'false');
  assert.equal(adjustButton.getAttribute('aria-expanded'), 'true');

  const brightnessSlider = popover.querySelector('[data-setting="brightness"]');
  brightnessSlider.value = '140';
  brightnessSlider.oninput({ target: brightnessSlider });

  assert.equal(viewer.canvas.style.filter, 'brightness(140%) contrast(100%) saturate(100%) grayscale(0%) invert(0%)');

  const grayscaleToggle = popover.querySelector('[data-setting="grayscale"]');
  grayscaleToggle.onclick();

  assert.equal(viewer.canvas.style.filter, 'brightness(140%) contrast(100%) saturate(100%) grayscale(100%) invert(0%)');

  const resetButton = popover.querySelector('.dv-adjust-reset');
  resetButton.onclick();

  assert.equal(viewer.canvas.style.filter, 'brightness(100%) contrast(100%) saturate(100%) grayscale(0%) invert(0%)');
  assert.equal(brightnessSlider.value, '100');

  adjustButton.onclick();

  assert.equal(popover.getAttribute('aria-hidden'), 'true');
  assert.equal(adjustButton.getAttribute('aria-expanded'), 'false');
});

for (const manifestUrl of [
  'https://digital.smith.edu/manifests/sia-pilot.json',
  'https://delivery.s3.amazonaws.com/manifests/pilot.json',
  'https://compass.fivecolleges.edu.example.org/manifests/pilot.json',
]) {
  test('fetches external manifest directly with Compass proxy enabled: ' + manifestUrl, function () {
    let requestedUrl;
    const hooks = loadHooks({
      config: { compassProxyUrl: 'http://localhost:8080/compass-resolve' },
      fetch(url) {
        requestedUrl = url;
        throw new Error('Request captured');
      },
    });
    assert.throws(() => hooks.mountCompassManifest({}, { manifestUrl }), /Request captured/);
    assert.equal(requestedUrl, manifestUrl);
  });
}

test('continues proxying Compass manifests when the resolver is configured', function () {
  let requestedUrl;
  const manifestUrl = 'https://compass.fivecolleges.edu/node/79656/manifest';
  const proxy = 'http://localhost:8080/compass-resolve';
  const hooks = loadHooks({
    config: { compassProxyUrl: proxy },
    fetch(url) {
      requestedUrl = url;
      throw new Error('Request captured');
    },
  });
  assert.throws(() => hooks.mountCompassManifest({}, { manifestUrl }), /Request captured/);
  assert.equal(requestedUrl, proxy + '?url=' + encodeURIComponent(manifestUrl));
});

function makeThumbnailFixture(options = {}) {
  const hooks = loadHooks(options);
  const container = hooks.makeElement('div');
  const handlers = {};
  const viewer = { addHandler(name, handler) { handlers[name] = handler; }, goToPage() {} };
  const pages = Array.from({ length: 77 }, (_, i) => ({
    tileSource: 'https://digital.smith.edu/iiif/2/page' + i + '/info.json',
    thumbnailUrl: 'https://digital.smith.edu/iiif/2/page' + i + '/full/150,/0/default.jpg',
  }));
  hooks.addThumbnailCarousel(container, viewer, pages);
  return { hooks, container, handlers, pages, images: container.querySelectorAll('img') };
}

test('multipage thumbnails wait for visibility and load one at a time', function () {
  let observer;
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; this.observed = []; observer = this; }
    observe(image) { this.observed.push(image); }
    unobserve() {}
    disconnect() {}
  }
  const fixture = makeThumbnailFixture({ IntersectionObserver: Observer });
  assert.equal(fixture.images.filter(image => image.src).length, 0);
  assert.equal(observer.observed.length, 77);
  assert.equal(observer.options.root, fixture.container.querySelector('.dv-thumbnail-viewport'));
  observer.callback(fixture.images.slice(0, 3).map(target => ({ target, isIntersecting: true })));
  assert.equal(fixture.images.filter(image => image.src).length, 1);
  fixture.images[0].onload();
  assert.equal(fixture.images.filter(image => image.src).length, 2);
  fixture.images[1].onerror();
  assert.equal(fixture.images.filter(image => image.src).length, 3);
  observer.callback([{ target: fixture.images[3], isIntersecting: false }]);
  fixture.images[2].onload();
  assert.equal(fixture.images[3].src, undefined);
});

test('thumbnail fallback limits concurrent requests without IntersectionObserver', function () {
  const fixture = makeThumbnailFixture();
  assert.equal(fixture.images.filter(image => image.src).length, 1);
  fixture.images[0].onerror();
  assert.equal(fixture.images.filter(image => image.src).length, 2);
});

test('sequence cache warming does not bypass the thumbnail queue', function () {
  let imageCount = 0;
  const hooks = loadHooks({
    Image: function () { imageCount += 1; },
    fetch() { return Promise.resolve({ ok: true, text() { return Promise.resolve('{}'); } }); },
  });
  hooks.warmSequenceCache([
    { tileSource: 'https://digital.smith.edu/iiif/2/page1/info.json', thumbnailUrl: 'https://digital.smith.edu/thumb1.jpg' },
    { tileSource: 'https://digital.smith.edu/iiif/2/page2/info.json', thumbnailUrl: 'https://digital.smith.edu/thumb2.jpg' },
  ], 0);
  assert.equal(imageCount, 0);
});
