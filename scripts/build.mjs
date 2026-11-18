import { build, context } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));

function options(root) {
  return {
    absWorkingDir: root,
    entryPoints: ['src/entry.mjs'],
    outfile: 'public/assets/digital_viewer.js',
    bundle: true, platform: 'browser', format: 'iife', target: 'es2017',
    minify: false, sourcemap: 'external', sourcesContent: true,
    legalComments: 'inline', write: false,
    banner: { js: '// GENERATED from src/entry.mjs. Edit src/ and run npm run build.' },
  };
}

function pageOptions(root) {
  return {
    absWorkingDir: root,
    entryPoints: ['src/page-entry.mjs'],
    outfile: 'public/digital-viewer/viewer.js',
    bundle: true, platform: 'browser', format: 'iife', target: 'es2017',
    minify: false, sourcemap: 'external', sourcesContent: true,
    legalComments: 'inline', write: false,
    banner: { js: '// GENERATED from src/page-entry.mjs. Edit src/ and run npm run build.' },
  };
}

function versionedAssets(result) {
  const map = result.outputFiles.find(file => file.path.endsWith('.map')).text;
  const script = result.outputFiles.find(file => file.path.endsWith('.js')).text;
  const version = createHash('sha256').update(map).digest('hex');
  return {
    'digital_viewer.js.map': map,
    'digital_viewer.js': script + '//# sourceMappingURL=digital_viewer.js.map?v=' + version + '\n',
  };
}

export async function buildAssets(root = pluginRoot) {
  return versionedAssets(await build(options(root)));
}

async function pageAssets(root, result) {
  const map = result.outputFiles.find(file => file.path.endsWith('.map')).text;
  const script = result.outputFiles.find(file => file.path.endsWith('.js')).text;
  const [html, baseCss, pageCss, openseadragon] = await Promise.all([
    readFile(join(root, 'src/standalone-viewer.html'), 'utf8'),
    readFile(join(root, 'public/assets/digital_viewer.css'), 'utf8'),
    readFile(join(root, 'src/standalone-viewer.css'), 'utf8'),
    readFile(join(root, 'public/assets/openseadragon.min.js'), 'utf8'),
  ]);
  return {
    'index.html': html,
    'viewer.css': baseCss + '\n' + pageCss,
    'openseadragon.min.js': openseadragon,
    'viewer.js': script,
    'viewer.js.map': map,
  };
}

export async function buildPageAssets(root = pluginRoot) {
  return pageAssets(root, await build(pageOptions(root)));
}

async function outputAssets(assets, check, relativeDirectory) {
  const directory = join(pluginRoot, relativeDirectory);
  if (!check) await mkdir(directory, { recursive: true });
  for (const [name, content] of Object.entries(assets)) {
    const path = join(directory, name);
    if (check) {
      const existing = await readFile(path, 'utf8').catch(() => null);
      if (existing !== content) throw new Error('Stale or missing generated asset: ' + name + '. Run npm run build.');
    } else {
      await writeFile(path, content);
    }
  }
}

async function main() {
  if (process.argv.includes('--watch')) {
    const pluginWatcher = await context({ ...options(pluginRoot), plugins: [{
      name: 'version-and-write',
      setup(api) {
        api.onEnd(async result => {
          if (result.errors.length === 0) await outputAssets(versionedAssets(result), false, 'public/assets');
        });
      },
    }] });
    const pageWatcher = await context({ ...pageOptions(pluginRoot), plugins: [{
      name: 'page-output',
      setup(api) {
        api.onEnd(async result => {
          if (result.errors.length === 0) {
            const assets = await pageAssets(pluginRoot, result);
            await outputAssets(assets, false, 'public/digital-viewer');
          }
        });
      },
    }] });
    await Promise.all([pluginWatcher.watch(), pageWatcher.watch()]);
    console.log('Watching src/; ArchivesSpace serves plugin assets and public/digital-viewer serves the page.');
  } else {
    const check = process.argv.includes('--check');
    await outputAssets(await buildAssets(), check, 'public/assets');
    await outputAssets(await buildPageAssets(), check, 'public/digital-viewer');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
