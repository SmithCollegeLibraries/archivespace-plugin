import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Capture DOM readiness in the fixture; execute the unmodified generated bundle.
export async function runStartupChecks(browser, pluginRoot) {
  const results=[];
  const origin='http://startup.test';
  const scenarios=[
    {name:'stock',record_type:'ArchivalObject',pane:true,count:2},
    {name:'leaf',record_type:'DigitalObject',pane:true,count:1},
    {name:'inline',record_type:'DigitalObject',pane:false,count:2},
    {name:'partial-setup-failure',record_type:'ArchivalObject',pane:true,count:1,failure:'insert'},
    {name:'async-group-failure',record_type:'ArchivalObject',pane:true,count:2,failure:'fetch'},
    {name:'sync-group-failure',record_type:'ArchivalObject',pane:true,count:2,failure:'osd'},
  ];
  for(const scenario of scenarios) {
    const context=await browser.newContext();const page=await context.newPage();
    try {
      const files=[0,1].map(index=>({out:origin+'/image-'+index+'.jpg',caption:'Original '+index}));
      if(scenario.failure==='fetch'||scenario.failure==='osd') files[0].out=origin+'/manifests/first.json';
      const html=execFileSync('ruby',[join(pluginRoot,'test/support/render_digital_fixture.rb')],{
        input:JSON.stringify({record_type:scenario.record_type,files}),encoding:'utf8',
      });
      await context.route('**/*',route=>{
        if(route.request().url().includes('/manifests/')) {
          if(scenario.failure==='fetch') return route.abort();
          return route.fulfill({json:{sequences:[{canvases:[{images:[{resource:{service:{'@id':origin+'/iiif/a'}}}]}]}]}});
        }
        return route.fulfill({contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64')});
      });
      const content='<p id="metadata">Record metadata remains readable</p>'+html;
      await page.setContent(scenario.pane?'<div id="notes_row"><section class="resizable-content-pane">'+content+'</section></div>':content);
      await page.addScriptTag({path:join(pluginRoot,'public/assets/openseadragon.min.js')});
      await page.evaluate(failure=>{
        window.DigitalViewer={compassBaseUrl:'',cantaloupeBaseUrl:''};
        Object.defineProperty(document,'readyState',{configurable:true,get:()=> 'loading'});
        const add=document.addEventListener.bind(document);
        document.addEventListener=function(type,handler,...rest){
          if(type==='DOMContentLoaded') window.fixtureInit=handler;
          else add(type,handler,...rest);
        };
        if(failure==='insert') {
          const insert=Element.prototype.insertBefore;let failed=false;
          Element.prototype.insertBefore=function(child,ref){
            if(!failed && child.classList.contains('digital-viewer-container')){failed=true;throw new Error('fixture insertion failure');}
            return insert.call(this,child,ref);
          };
        }
        if(failure==='osd') window.OpenSeadragon=function(){throw new Error('fixture constructor failure');};
      },scenario.failure);
      await page.addScriptTag({path:join(pluginRoot,'public/assets/digital_viewer.js')});
      assert.equal(await page.locator('.digital-viewer-container').count(),0);
      await page.evaluate(()=>{delete document.readyState;window.fixtureInit();});
      await page.waitForFunction(()=>[...document.querySelectorAll('.digital-viewer-container')].every(element=>element.__dvMountAttempt?.completed||element.classList.contains('dv-error')));
      assert.equal(await page.locator('.digital-viewer-container').count(),scenario.count);
      assert.equal(await page.locator('#metadata').textContent(),'Record metadata remains readable');
      for(const file of files) assert.ok(await page.locator('a').evaluateAll((anchors,url)=>anchors.some(a=>a.href===url),file.out));
      const originalLink=page.locator('.dv-original-link').filter({hasText:'Open original link'}).last();
      assert.equal(await originalLink.getAttribute('href'),files[1].out);
      await originalLink.focus();
      const opened=context.waitForEvent('page');
      await page.keyboard.press('Enter');
      const originalTab=await opened;
      await originalTab.waitForLoadState('domcontentloaded');
      assert.equal(originalTab.url(),files[1].out);
      await originalTab.close();
      if(scenario.name==='leaf') assert.equal(await page.locator('#dv-viewer-column .digital-viewer-container').count(),1);
      if(scenario.failure==='fetch'||scenario.failure==='osd') {
        assert.equal(await page.locator('.dv-error').count(),1);
        assert.equal(await page.locator('.dv-static-image img').count(),1);
      }
      if(!scenario.failure) {
        assert.equal(await page.evaluate(()=>{
          const before=[...document.querySelectorAll('.digital-viewer-container')];
          window.fixtureInit();
          const after=[...document.querySelectorAll('.digital-viewer-container')];
          return before.length===after.length&&before.every((node,index)=>node===after[index]);
        }),true);
        await page.evaluate(()=>{
          document.querySelector('[data-file-uri]').dataset.fileUri='http://startup.test/replacement.jpg';
          window.fixtureInit();
        });
        await page.waitForFunction(()=>[...document.querySelectorAll('.digital-viewer-container')].every(element=>element.__dvMountAttempt?.completed));
        assert.equal(await page.locator('.digital-viewer-container').count(),scenario.count);
      }
      results.push({scenario:scenario.name,mounts:scenario.count,metadataAndOriginalLinks:true,keyboardOriginalAccess:true,reinitAndReplacement:!scenario.failure});
    } finally {await context.close();}
  }
  return results;
}
