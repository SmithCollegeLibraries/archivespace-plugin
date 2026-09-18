import { readConfig } from './config.mjs';
import { createViewerRuntime } from './runtime.mjs';

const runtime = createViewerRuntime({
  config: readConfig(window.DigitalViewer), document, console,
  fetch: window.fetch && window.fetch.bind(window),
  OpenSeadragon: window.OpenSeadragon,
  IntersectionObserver: window.IntersectionObserver,
  Image: window.Image, AbortController: window.AbortController,
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runtime.init);
} else {
  runtime.init();
}
