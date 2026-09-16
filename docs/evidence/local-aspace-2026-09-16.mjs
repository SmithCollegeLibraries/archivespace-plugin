// Read-only Playwright observations for the local fixtures in fixture-ledger.md.
// These functions report measurements; callers must compare them to the ledger.
// They do not create records, assert full acceptance, or contact hosted ASpace.

export const pilotPages = async (page) => {
 const rows=[];
 for(const [id,count] of [[869,1],[863,77],[864,41],[867,36]]) {
  const errors=[]; const onError=e=>errors.push(e.message); page.on('pageerror',onError);
  const started=Date.now();
  const response=await page.goto('http://localhost:18081/repositories/2/digital_objects/'+id);
  const html=await response.text();
  let loaded=true; try {await page.waitForFunction(()=>{const v=document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer; return v?.world.getItemAt(0)?.getFullyLoaded();},{},{timeout:20000});}catch{loaded=false;}
  const result=await page.evaluate(()=>({type:document.querySelector('[data-dv-page-context]')?.dataset.recordType,children:document.querySelector('[data-dv-page-context]')?.dataset.hasChildren,pane:!!document.querySelector('#notes_row > .resizable-content-pane'),originalLinks:[...document.querySelectorAll('.available-digital-objects a[href],[data-additional-file-version] a[href]')].map(a=>({href:a.href,visible:!!a.getClientRects().length})),mounts:document.querySelectorAll('.digital-viewer-container').length,pages:document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer?.tileSources?.length||1,counter:document.querySelector('.dv-page-counter')?.textContent||null,errors:[...document.querySelectorAll('.dv-error-msg,.dv-tile-error-msg,.dv-loading-msg')].map(e=>e.textContent)}));
  rows.push({id,status:response.status(),serverPane:html.includes('resizable-content-pane'),serverOriginalLink:html.includes('https://libtools2.smith.edu/digital/manifests/'),loaded,elapsedMs:Date.now()-started,expectedPages:count,...result,pageErrors:errors});
  page.off('pageerror',onError);
 }
 return rows;
};

export const archivalPages = async (page) => {
 const rows=[];
 for(const [id,mounts] of [[4096,1],[4097,1],[4098,1],[4099,1],[4100,2],[4101,0],[4102,0],[4103,0],[4104,0]]) {
  const response=await page.goto('http://localhost:18081/repositories/2/archival_objects/'+id);
  const html=await response.text(); let loaded=null;
  if(mounts)try{await page.waitForFunction(n=>{const cs=[...document.querySelectorAll('.digital-viewer-container')];return cs.length===n&&cs.every(c=>c.__dvMountAttempt?.viewer?.world.getItemAt(0)?.getFullyLoaded());},mounts,{timeout:15000});loaded=true;}catch{loaded=false;}
  rows.push({id,status:response.status(),expectedMounts:mounts,loaded,serverPane:html.includes('resizable-content-pane'),...await page.evaluate(()=>({type:document.querySelector('[data-dv-page-context]')?.dataset.recordType,mounts:document.querySelectorAll('.digital-viewer-container').length,leafColumn:!!document.querySelector('#dv-viewer-column'),groups:[...document.querySelectorAll('.available-digital-objects [data-dv-source-group]')].map(g=>({group:g.dataset.dvSourceGroup,links:[...g.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'),visible:!!a.getClientRects().length})),mounts:g.querySelectorAll('.digital-viewer-container').length})),representatives:[...document.querySelectorAll('[data-rep-file-version-wrapper] > a')].map(a=>a.getAttribute('href')),stockImages:[...document.querySelectorAll('.available-digital-objects img')].filter(i=>!i.closest('.digital-viewer-container')).map(i=>({loaded:i.complete&&i.naturalWidth>0,linked:!!i.closest('a')})),pages:[...document.querySelectorAll('.digital-viewer-container')].map(c=>c.__dvMountAttempt?.viewer?.tileSources?.length||1),errors:[...document.querySelectorAll('.dv-error-msg,.dv-tile-error-msg,.dv-loading-msg')].map(e=>e.textContent)}))});
 }
 return rows;
};

export const edgePages = async(page)=>{
 const rows=[];
 for(const [id,mounts] of [[870,1],[871,1],[872,0],[873,0],[874,1]]) {
 const res=await page.goto('http://localhost:18081/repositories/2/digital_objects/'+id); const html=await res.text(); let loaded=null;
 if(mounts){try{await page.waitForFunction(()=>document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer?.world.getItemAt(0)?.getFullyLoaded(),{},{timeout:15000});loaded=true;}catch{loaded=false;}}
 rows.push({id,status:res.status(),expectedMounts:mounts,loaded,hiddenSentinelInHtml:html.includes('example.invalid/unpublished'),...await page.evaluate(()=>({context:document.querySelector('[data-dv-page-context]')?.dataset,leafColumn:!!document.querySelector('#dv-viewer-column'),mounts:document.querySelectorAll('.digital-viewer-container').length,pages:document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer?.tileSources?.length||null,externalAnchors:document.querySelectorAll('.external-digital-object__link').length,representative:[...document.querySelectorAll('[data-rep-file-version-wrapper] > a')].map(a=>({href:a.getAttribute('href'),visible:!!a.getClientRects().length})),images:[...document.querySelectorAll('.available-digital-objects img')].map(i=>({loaded:i.complete&&i.naturalWidth>0,linked:!!i.closest('a')})),additional:[...document.querySelectorAll('[data-additional-file-version] a[href]')].map(a=>({href:a.href,visible:!!a.getClientRects().length})),errors:[...document.querySelectorAll('.dv-error-msg,.dv-tile-error-msg,.dv-loading-msg')].map(e=>e.textContent)}))});
 }return rows;
};
export const navigation = async(page)=>{
 await page.goto('http://localhost:18081/repositories/2/digital_objects/863');
 const results=[];
 for(const index of [0,38,76]){
  if(index) await page.locator('.dv-thumbnail-btn').nth(index).click();
  let loaded=true;try{await page.waitForFunction(i=>{const v=document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer;return v?.currentPage()===i&&v.world.getItemAt(0)?.getFullyLoaded();},index,{timeout:20000});}catch{loaded=false;}
  results.push({page:index+1,loaded,counter:await page.locator('.dv-page-counter').textContent(),downloadVisible:await page.locator('[data-action=download-image]').isVisible()});
 }
 await page.getByRole('button',{name:'Open page 77',exact:true}).focus();
 await page.keyboard.press('Enter');
 results.push({action:'keyboard Open page 77',downloadVisible:await page.locator('[data-action=download-image]').isVisible(),href:await page.locator('[data-action=download-image]').getAttribute('href')});
 await page.getByRole('button',{name:'Back to object',exact:true}).click();
 results.push({action:'Back to object',downloadVisible:await page.locator('[data-action=download-image]').isVisible()});
 const zoom=await page.evaluate(()=>document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer.viewport.getZoom());
 await page.getByRole('button',{name:'Zoom in',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(z=>document.querySelector('.digital-viewer-container').__dvMountAttempt.viewer.viewport.getZoom()>z,zoom);
 results.push({action:'keyboard Zoom in',passed:true});
 return results;
};

export const failureControls = async(page)=>{
 const rows=[];
 for(const mode of ['javascript-disabled','osd-blocked','manifest-blocked']){
  const context=await page.context().browser().newContext({javaScriptEnabled:mode!=='javascript-disabled',viewport:{width:1280,height:900}});
  try{
   if(mode==='osd-blocked')await context.route('**/openseadragon.min.js?*',r=>r.abort());
   if(mode==='manifest-blocked')await context.route('https://libtools2.smith.edu/digital/manifests/**',r=>r.abort());
   const tab=await context.newPage();
   for(const path of ['digital_objects/869','archival_objects/4096']){
    const res=await tab.goto('http://localhost:18081/repositories/2/'+path);
    if(mode==='manifest-blocked')await tab.locator('.dv-error-msg').waitFor();
    const anchors=tab.locator('.external-digital-object__link');
    rows.push({mode,path,status:res.status(),links:await anchors.count(),linkVisible:await anchors.first().isVisible(),href:await anchors.first().getAttribute('href'),mounts:await tab.locator('.digital-viewer-container').count(),messages:await tab.locator('.dv-error-msg').allTextContents()});
   }
  }finally{await context.close();}
 }return rows;
};
