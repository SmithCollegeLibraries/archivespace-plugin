import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../public/assets/digital_viewer.js', import.meta.url), 'utf8');

for (const readyState of ['loading', 'complete']) {
  test('unmodified served artifact starts once at DOM readiness: ' + readyState, function () {
    let callback;
    let scans = 0;
    const document = {
      readyState,
      addEventListener(event, handler) { assert.equal(event, 'DOMContentLoaded'); callback = handler; },
      querySelectorAll() { scans++; return []; },
    };
    const window = { DigitalViewer: {}, OpenSeadragon() {}, setTimeout, clearTimeout };
    const initialGlobals = Object.keys(window);
    vm.runInNewContext(script, { window, document, console, URL });
    if (readyState === 'loading') {
      assert.equal(scans, 0);
      assert.equal(typeof callback, 'function');
      callback();
    }
    assert.ok(scans > 0);
    assert.deepEqual(Object.keys(window), initialGlobals, 'Production bundle must not export test hooks');
  });
}

test('unmodified served artifact safely exits when OpenSeadragon is blocked', function () {
  const warnings = [];
  const document = { readyState: 'complete', querySelectorAll() { throw new Error('Must not scan'); } };
  vm.runInNewContext(script, {
    window: { setTimeout, clearTimeout }, document, URL,
    console: { warn(message) { warnings.push(message); } },
  });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /OpenSeadragon not loaded/);
});
