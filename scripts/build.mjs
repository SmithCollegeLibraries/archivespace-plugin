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

async function outputAssets(assets, check) {
  const directory = join(pluginRoot, 'public/assets');
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
    const watcher = await context({ ...options(pluginRoot), plugins: [{
      name: 'version-and-write',
      setup(api) {
        api.onEnd(async result => {
          if (result.errors.length === 0) await outputAssets(versionedAssets(result), false);
        });
      },
    }] });
    await watcher.watch();
    console.log('Watching src/; ArchivesSpace serves the generated assets.');
  } else {
    await outputAssets(await buildAssets(), process.argv.includes('--check'));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
