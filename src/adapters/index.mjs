import { createCompassAdapter } from './compass.mjs';
import { createDirectAdapters } from './direct.mjs';
import { createManifestAdapter } from './manifest.mjs';
import { createPreservicaAdapter } from './preservica.mjs';

// Composition only: attempts, timers and fallback order belong to the runtime.
// Each mount receives (container, descriptor, mountOptions), including signal/attempt.
export function createSourceAdapters(dependencies) {
  const direct = createDirectAdapters(dependencies);
  const compass = createCompassAdapter(dependencies);
  const manifest = createManifestAdapter({ ...dependencies,
    fetchManifestUrl: compass.fetchManifestUrl, parsePages: compass.parsePages });
  const preservica = createPreservicaAdapter({ ...dependencies, ...direct });

  function pdf(container, descriptor) {
    direct.mountPdfViewer(container, { url: descriptor.url });
    dependencies.clearLoadingNotice(container);
    return Promise.resolve();
  }

  return {
    cantaloupe: direct.mountCantaloupe,
    'static-image': direct.mountStaticImage,
    'static-pdf': pdf,
    compass: compass.mountCompass,
    // Keep the historical descriptor value to preserve selection contracts.
    'compass-manifest': manifest,
    manifest,
    preservica,
  };
}
