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
