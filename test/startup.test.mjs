import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

async function module(name) {
  const url=new URL('../src/'+name+'.mjs',import.meta.url);
  assert.ok(existsSync(url),'Missing extracted module: '+name);
  return import(url);
}

test('page discovery groups by DOM identity and deduplicates within each group', async function () {
  const { createPageSources }=await module('page-sources');
  const roots=[{},{}];
  const anchors=[0,0,1].map(index=>({href:'https://files.test/book.pdf',parentNode:roots[index]}));
  const document={querySelectorAll:selector=>selector==='[data-file-uri]'?anchors:[]};
  const sources=createPageSources({document,getPageContext:()=>({})});
  const groups=sources.collectGroups();
  assert.equal(groups.length,2);
  assert.ok(groups.every(group=>group.items.length===1));
  assert.equal(groups[0].root,roots[0]);
  assert.equal(groups[1].root,roots[1]);
});

for(const [name,factory] of [['page-layout','createPageLayout'],['init','createInitializer'],['mount-sequence','createMountSequence'],['status','createStatus']]) {
  test(name+' exposes its explicit module boundary',async function(){
    assert.equal(typeof (await module(name))[factory],'function');
  });
}

test('source contract distinguishes absent sources from missing explicit hints without exposing destinations', async function () {
  const { createPageSources }=await module('page-sources');
  let expected=[];const warnings=[];
  const sources=createPageSources({document:{querySelectorAll:selector=>selector==='[data-dv-source-expected]'?expected:[]},
    getPageContext:()=>({}),onContractFailure:code=>warnings.push(code)});
  sources.collectGroups();assert.deepEqual(warnings,[]);
  expected=[{getAttribute:()=>null}];sources.collectGroups();
  assert.deepEqual(warnings,['source-contract-missing']);
  warnings.length=0;
  expected=[{getAttribute:()=> 'https://files.test/private?token=secret'}];sources.collectGroups();
  assert.deepEqual(warnings,[]);
});

test('leaf digital object sources group in the notes pane and mark it for the current render', async function () {
  const { createPageSources } = await module('page-sources');
  const pane = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
  };
  const anchor = {
    href: 'https://example.org/item.jpg',
    parentNode: {},
    closest(selector) {
      if (selector === '[data-dv-browse-only]') return null;
      throw new Error('notes pane should be selected first');
    },
  };
  const document = {
    querySelector(selector) {
      return selector === '#notes_row > .resizable-content-pane' ? pane : null;
    },
    querySelectorAll(selector) { return selector === '[data-file-uri]' ? [anchor] : []; },
  };
  const sources = createPageSources({
    document,
    getPageContext: () => ({ recordType: 'DigitalObject', hasChildren: false, paneExists: true }),
  });

  const groups = sources.collectGroups();

  assert.equal(groups.length, 1);
  assert.equal(groups[0].root, pane);
  assert.equal(pane.getAttribute('data-dv-source-group'), 'render-1');
});

test('page source discovery reports an ancestor lookup failure and skips that source', async function () {
  const { createPageSources } = await module('page-sources');
  const anchor = {
    href: 'https://example.org/item.jpg',
    parentNode: {},
    closest(selector) {
      if (selector === '[data-dv-browse-only]') return null;
      throw new Error('lookup failed');
    },
  };
  let failures = 0;
  const sources = createPageSources({
    document: { querySelectorAll: selector => selector === '[data-file-uri]' ? [anchor] : [] },
    getPageContext: () => ({ recordType: 'ArchivalObject' }),
    onDiscoveryError: () => { failures += 1; },
  });

  assert.deepEqual(sources.collectGroups(), []);
  assert.equal(failures, 1);
});

for (const recordType of ['ArchivalObject', 'DigitalObject']) {
  test(recordType + ' representative anchor and file hint share their explicit outer group', async function () {
    const { createPageSources } = await module('page-sources');
    const group = {getAttribute: () => 'representative'};
    const figure = {};
    const uri = 'https://files.test/image.jpg';
    function closest(legacy) {
      return selector => selector === '[data-dv-source-group]' ? group :
        selector.includes('[data-rep-file-version-wrapper]') ? legacy : null;
    }
    const anchor = {href:uri, closest:closest(figure)};
    const hint = {dataset:{fileUri:uri}, closest:closest(group)};
    const document = {querySelectorAll: selector =>
      selector === '[data-rep-file-version-wrapper] > a[href]' ? [anchor] :
      selector === '[data-file-uri]' ? [hint] : []};
    const sources = createPageSources({document, getPageContext:()=>({recordType,hasChildren:true})});
    const groups = sources.collectGroups();
    assert.equal(groups.length, 1);
    assert.equal(groups[0].root, group);
    assert.equal(groups[0].items.length, 1);
  });
}
