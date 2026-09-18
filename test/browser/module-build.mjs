import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
export async function runModuleBuildChecks(browser, root, puiBase = 'http://localhost:18081') {
const results=[];
 const page=await browser.newPage();
 const response=await page.goto(puiBase + '/repositories/2/digital_objects/876');
 assert.equal(response.status(),200);
 await page.waitForSelector('.digital-viewer-container',{timeout:15000});
 const url=await page.locator('script[src*="digital_viewer.js"]').getAttribute('src');
 assert.ok(url);results.push({case:'real ArchivesSpace PDF startup',script:url,passed:true});
 await page.close();
 for(const prefix of ['', '/pui']) {
  const context=await browser.newContext();const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const cdp=await context.newCDPSession(p);await cdp.send('Debugger.enable');let parsed;
  cdp.on('Debugger.scriptParsed', e=>{if(e.url.endsWith('/digital_viewer.js'))parsed=e;});
  await p.route('http://bundle.test/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname.includes('/assets/')) {
    const name=pathname.split('/').pop();await route.fulfill({contentType:name.endsWith('.map')?'application/json':'text/javascript',body:readFileSync(root+'/public/assets/'+name)});
   } else await route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'"},body:`<html><body><script src="${prefix}/assets/openseadragon.min.js"></script><script src="${prefix}/assets/digital_viewer.js"></script></body></html>`});
  });
  await p.goto('http://bundle.test'+prefix+'/record');assert.ok(parsed?.sourceMapURL);
  const mapURL=new URL(parsed.sourceMapURL,parsed.url);assert.equal(mapURL.pathname,prefix+'/assets/digital_viewer.js.map');
  const mapPage=await context.newPage();await mapPage.route('**/*',route=>route.fulfill({contentType:'application/json',body:readFileSync(root+'/public/assets/digital_viewer.js.map')}));
  const mapResponse=await mapPage.goto(mapURL.href);const map=await mapResponse.json();
  for (let i=0;i<map.sources.length;i++) assert.equal(map.sourcesContent[i],readFileSync(new URL(map.sources[i],'file://'+root+'/public/assets/digital_viewer.js.map'),'utf8'));
  assert.deepEqual(errors,[]);results.push({case:'bundle/source maps with self-only script CSP',prefix,sources:map.sources,passed:true});await context.close();
 }
 return results;
}
