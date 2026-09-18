import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

async function module(name) {
  const url = new URL('../src/' + name + '.mjs', import.meta.url);
  assert.ok(existsSync(url), 'Missing extracted module: ' + name);
  return import(url);
}

test('lifecycle disposes an owned attempt once and preserves a final slow attempt', async function () {
  const { createLifecycle } = await module('lifecycle');
  let deadline, cleanups = 0, notices = 0, destroys = 0;
  const lifecycle = createLifecycle({AbortController,setTimeout(fn){deadline=fn;return 1;},clearTimeout(){},showLoadingNotice(){notices++;}});
  const attempt = lifecycle.createAttempt();
  attempt.viewer = {destroy(){destroys++;}};
  lifecycle.registerAttemptCleanup(attempt,()=>cleanups++);
  lifecycle.scheduleAttemptTimeout(attempt,{},10,false,()=>assert.fail('Final attempt must remain'));
  deadline();
  assert.equal(notices,1);
  assert.equal(attempt.active,true);
  lifecycle.disposeAttempt(attempt);
  lifecycle.disposeAttempt(attempt);
  assert.equal(attempt.controller.signal.aborted,true);
  assert.equal(cleanups,1);
  assert.equal(destroys,1);
});

for (const [name, factory] of [['controls','createControls'],['viewer','createViewer'],['thumbnails','createThumbnails'],['viewer-modes','createViewerModes'],['prefetch','createPrefetch']]) {
  test(name + ' has an explicit factory independent of startup', async function () {
    const exports = await module(name);
    assert.equal(typeof exports[factory], 'function');
  });
}

test('prefetch uses the attempt signal and can retry after disposing another attempt', async function () {
  const { createPrefetch } = await module('prefetch');
  const requests=[];
  const prefetch=createPrefetch({fetch(url,options){requests.push(options);return Promise.resolve({ok:true,text:async()=>''});}});
  const first={active:true,controller:new AbortController(),cleanups:[]};
  const second={active:true,controller:new AbortController(),cleanups:[]};
  prefetch.warmSequenceCache(['/iiif/2/a/info.json'],0,{attempt:first});
  first.active=false;first.controller.abort();
  prefetch.warmSequenceCache(['/iiif/2/a/info.json'],0,{attempt:second});
  assert.equal(requests.length,2);
  assert.equal(requests[0].signal,first.controller.signal);
  assert.equal(requests[1].signal,second.controller.signal);
});

test('a failing viewer teardown does not strand attempt cleanup', async function () {
  const { createLifecycle } = await module('lifecycle');
  const lifecycle=createLifecycle({AbortController,setTimeout,clearTimeout});
  const attempt=lifecycle.createAttempt();let cleaned=false;
  attempt.viewer={destroy(){throw new Error('viewer teardown failed');}};
  lifecycle.registerAttemptCleanup(attempt,()=>{cleaned=true;});
  assert.doesNotThrow(()=>lifecycle.disposeAttempt(attempt));
  assert.equal(cleaned,true);
});

test('speculative prefetch failure cannot reject a mounted viewer', async function () {
  const { createPrefetch } = await module('prefetch');
  const prefetch=createPrefetch({fetch(){throw new Error('blocked');}});
  assert.doesNotThrow(()=>prefetch.warmSequenceCache(['/iiif/2/a/info.json'],0));
});

test('destroying a standalone pending viewer clears its open deadline and settles its promise', async function () {
  const { createViewer } = await module('viewer');
  const timers=new Set(), handlers={};let next=0;
  const viewer={addHandler(name,fn){handlers[name]=fn;},open(){},destroy(){handlers['before-destroy']();}};
  const noop=()=>{};
  const api=createViewer({document:{createElement(){return {}; }},OpenSeadragon:()=>viewer,
    setTimeout(){timers.add(++next);return next;},clearTimeout(id){timers.delete(id);},
    resetContainer:noop,showLoadingNotice:noop,clearLoadingNotice:noop,isAttemptActive:()=>true,
    disposeViewer:v=>v.destroy(),registerAttemptCleanup:noop,addControls:noop,addPageNav:noop,
    addViewerModeActions:noop,addThumbnailCarousel:noop,warmSequenceCache:noop,primeResourceUrl:noop,
  });
  const mounting=api.mountOsdViewer({classList:{add:noop},appendChild:noop},'/image/info.json');
  const rejected=assert.rejects(mounting,/ATTEMPT_DISPOSED/);
  assert.equal(timers.size,1);
  viewer.destroy();
  assert.equal(timers.size,0);
  await rejected;
});
