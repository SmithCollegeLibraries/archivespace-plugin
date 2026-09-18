import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

async function module(name) {
  const url = new URL('../src/' + name + '.mjs', import.meta.url);
  assert.ok(existsSync(url), 'Missing extracted module: ' + name);
  return import(url);
}

const manifest = { sequences: [{ canvases: [
  { '@id': 'page-1', label: 'First', images: [{ resource: { '@id': 'https://files.test/original.jpg', service: { '@id': 'https://images.test/iiif/2/a%2Fb' } } }] },
  { '@id': 'page-2', label: 'Missing', images: [] },
] }] };

test('pure manifest parser preserves service identifiers, unavailable pages and order', async function () {
  const { extractManifestPages } = await module('manifest');
  const pages = extractManifestPages(manifest);
  assert.deepEqual(pages.map(page => page.canvasId), ['page-1', 'page-2']);
  assert.equal(pages[0].tileSource, 'https://images.test/iiif/2/a%2Fb/info.json');
  assert.equal(pages[0].imageUrl, 'https://files.test/original.jpg');
  assert.equal(pages[1].unavailable, true);
  assert.equal(pages[1].pageIndex, 1);
});

test('pure Presentation 3 parser groups media without browser globals', async function () {
  const { extractManifestContent } = await module('manifest');
  const bodies = [{id:'/image',type:'Image'}, {id:'/video',type:'Video'}, {id:'/audio',type:'Sound'}, {id:'/pdf',format:'application/pdf'}];
  const content = extractManifestContent({items:bodies.map(body => ({items:[{items:[{body}]}]}))});
  assert.deepEqual(Object.values(content).map(items => items[0].url), ['/image','/video','/audio','/pdf']);
});

test('Compass rewrite is isolated from generic manifest parsing', async function () {
  const { toLocalCantaloupeInfoUrl } = await module('adapters/compass');
  const { extractManifestPages } = await module('manifest');
  const service = 'https://compass.test/iiif/2/' + encodeURIComponent('https://compass.test/system/files/a/b.tif');
  assert.equal(toLocalCantaloupeInfoUrl(service, {cantaloupeBaseUrl:'/iiif/2'}), '/iiif/2/a%2Fb.tif/info.json');
  const original = structuredClone(manifest);
  original.sequences[0].canvases[0].images[0].resource.service['@id'] = service;
  assert.equal(extractManifestPages(original)[0].tileSource, service + '/info.json');
});

for (const adapter of ['manifest', 'compass', 'preservica']) {
  test(adapter + ' adapter passes explicit request ownership and mount options to renderer', async function () {
    const { createSourceAdapters } = await module('adapters/index');
    const attempt = { active:true, disposed:false };
    const options = {attempt,signal:new AbortController().signal};
    const container = {};
    const requests = [], renders = [];
    const adapters = createSourceAdapters({
      config:{compassHost:'compass.test',compassProxyUrl:'/resolve',preservicaApiBase:'/backend',cantaloupeBaseUrl:'/iiif/2'},
      fetch(url, request) { requests.push({url,request}); return Promise.resolve({ok:true,json:async () => adapter === 'preservica' ? {items:[{items:[{items:[{body:{id:'https://files.test/image.jpg',type:'Image'}}]}]}]} : manifest}); },
      isAttemptActive: current => current.active && !current.disposed,
      mountOsdViewer(...args) { renders.push(args); return Promise.resolve('mounted'); },
      reportFailure() { assert.fail('Unexpected adapter failure'); },
    });
    const descriptors = {
      manifest: {manifestUrl:'https://files.test/manifests/book.json'},
      compass: {compassUrl:'https://compass.test/islandora/object/book'},
      preservica: {uuid:'object-id'},
    };
    const descriptor = descriptors[adapter];
    assert.equal(await adapters[adapter](container,descriptor,options),'mounted');
    assert.equal(requests[0].request.signal,options.signal);
    assert.equal(renders[0][0],container);
    assert.equal(renders[0][2],options);
    assert.equal(renders[0][1].length,adapter === 'preservica' ? undefined : 2);
  });
}

test('Compass redirect path forwards the same attempt signal to its manifest request', async function () {
  const { createSourceAdapters } = await module('adapters/index');
  const signal = new AbortController().signal;
  const requests=[];
  const adapters=createSourceAdapters({config:{compassBaseUrl:'https://compass.test',compassHost:'compass.test'},
    fetch:async (url,options) => {requests.push({url,options});return requests.length===1 ? {url:'https://compass.test/node/42'} : {ok:true,json:async()=>manifest};},
    isAttemptActive:()=>true,mountOsdViewer:async()=>{},reportFailure(){assert.fail('Unexpected failure');},
  });
  await adapters.compass({}, {compassUrl:'https://compass.test/islandora/object/book'}, {signal});
  assert.equal(requests[0].options.redirect,'follow');
  assert.equal(requests[1].url,'https://compass.test/node/42/manifest');
  assert.ok(requests.every(request=>request.options.signal===signal));
});
