import assert from 'node:assert/strict';

// Deterministic real-browser keyboard and document-subscription cleanup checks.
export async function runViewerLifecycleChecks(browser, pluginRoot) {
  const results = [];
  const context = await browser.newContext();
  const page = await context.newPage();
  const origin = 'http://viewer-lifecycle.test';
  try {
    await page.route('**/*', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({contentType:'text/html',body:
        `<div data-dv-source-group="book" data-file-uri="${origin}/manifests/book.json"></div>`});
      if (path === '/manifests/book.json') return route.fulfill({json:{sequences:[{canvases:[0,1].map(index => ({
        images:[{resource:{'@id':origin+'/original/'+index+'.jpg',service:{'@id':origin+'/iiif/'+index}}}],
      }))}]}});
      if (path.endsWith('/info.json')) return route.fulfill({json:{
        '@context':'http://iiif.io/api/image/2/context.json','@id':origin+path.replace('/info.json',''),
        protocol:'http://iiif.io/api/image',width:256,height:256,
        tiles:[{width:256,scaleFactors:[1]}],profile:['http://iiif.io/api/image/2/level1.json'],
      }});
      return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="navy"/></svg>'});
    });
    for (const width of [1280,390]) {
      await page.setViewportSize({width,height:900});
      await page.goto(origin);
      await page.addStyleTag({path:pluginRoot+'/public/assets/digital_viewer.css'});
      await page.addScriptTag({path:pluginRoot+'/public/assets/openseadragon.min.js'});
      await page.evaluate(() => {
        window.DigitalViewer={compassBaseUrl:'',cantaloupeBaseUrl:''};
        window.documentSubscriptions=[];
        const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
        document.addEventListener=function(type,callback,options) {
          if(type==='click'||type==='keydown') window.documentSubscriptions.push({type,callback,active:true});
          return add(type,callback,options);
        };
        document.removeEventListener=function(type,callback,options) {
          window.documentSubscriptions.forEach(entry=>{if(entry.type===type&&entry.callback===callback)entry.active=false;});
          return remove(type,callback,options);
        };
      });
      await page.addScriptTag({path:pluginRoot+'/public/assets/digital_viewer.js'});
      await page.waitForFunction(()=>document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.completed);
      await page.getByRole('button',{name:'Adjust image',exact:true}).focus();
      await page.keyboard.press('Space');
      await page.locator('.dv-adjust-popover.is-open').waitFor();
      const slider=page.getByRole('slider',{name:/^Brightness/});
      const before=Number(await slider.inputValue());
      await slider.focus();await page.keyboard.press('ArrowRight');
      assert.ok(Number(await slider.inputValue())>before);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.dv-adjust-popover').getAttribute('aria-hidden'),'true');
      await page.getByRole('button',{name:'Go to image 2',exact:true}).focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer.currentPage()===1);
      await page.getByRole('button',{name:'Open page 2',exact:true}).focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('[data-action="download-image"]').getAttribute('href'),origin+'/original/1.jpg');
      const cleanup=await page.evaluate(()=>{
        const viewer=document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer;
        const before=window.documentSubscriptions.filter(entry=>entry.active).length;
        viewer.destroy();
        const after=window.documentSubscriptions.filter(entry=>entry.active).length;
        window.documentSubscriptions.forEach(entry=>entry.callback({key:'Escape',target:document.body}));
        return {before,after};
      });
      assert.ok(cleanup.before>=2);
      assert.equal(cleanup.after,0);
      results.push({width,keyboardNavigation:true,downloadDestination:true,documentCleanup:cleanup});
    }
  } finally {await context.close();}
  return results;
}
