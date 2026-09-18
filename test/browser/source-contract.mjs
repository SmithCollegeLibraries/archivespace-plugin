import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Exercise discovery through the unmodified served script, not injected hooks.
export async function runSourceContractChecks(browser, pluginRoot) {
  const origin = 'http://digital-viewer.test';
  const image = origin + '/image.jpg?a=1&b=2';
  const file = { out: image, caption: 'Image' };
  const cases = [
    { name: 'entry', files: [file], count: 1 },
    { name: 'thumbnail-link', files: [{ ...file, thumb: origin + '/thumb.jpg' }], count: 1 },
    { name: 'representative', representative: { file_uri: origin + '/thumb.jpg', derived_from: image }, count: 1 },
    { name: 'thumbnail-only', files: [{ thumb: origin + '/thumb.jpg' }], count: 0 },
    { name: 'browse-only', browse: true, representative: { file_uri: origin + '/thumb.jpg', derived_from: image }, count: 0 },
    { name: 'additional-version', additional: true, files: [{ file_uri: image }], count: 1 },
    { name: 'separate-objects-same-url', record_type: 'ArchivalObject', files: [file, file], count: 2 },
    { name: 'leaf-alternatives', files: [file, { out: origin + '/other.jpg', caption: 'Alternative' }], count: 1 },
    { name: 'parent-object', has_children: true, files: [file, file], count: 2 },
    { name: 'separate-image-pdf', record_type: 'ArchivalObject', files: [file, { out: origin + '/document.pdf', caption: 'PDF' }], count: 2 },
  ];
  const results = [];
  for (const item of cases) {
    for (const changedMarkup of [false, true]) {
      const context = await browser.newContext();
      try {
        const options = { record_type: 'DigitalObject', ...item };
        const html = execFileSync('ruby', [join(pluginRoot, 'test/support/render_digital_fixture.rb')], {
          input: JSON.stringify(options), encoding: 'utf8',
        });
        const extraContext = item.additional ? '<div data-dv-page-context data-record-type="DigitalObject" data-has-children="false"></div>' : '';
        const page = await context.newPage();
        await page.route('**/*', route => route.fulfill({contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64')}));
        await page.setContent('<h1>Record</h1><div id="notes_row"><section class="resizable-content-pane">' + extraContext + html + '</section></div>');
        const sourceValues = await page.locator('[data-file-uri]').evaluateAll(elements => elements.map(element => element.dataset.fileUri));
        if (item.count && !sourceValues.includes(image)) throw new Error(item.name + ': escaped source changed');
        if (changedMarkup) {
          await page.evaluate(() => {
            document.querySelectorAll('.available-digital-objects, .objectimage, .external-digital-object__link, .thumbnail, .card').forEach(element => { element.className = 'renamed-by-theme'; });
            document.querySelectorAll('[data-rep-file-version-wrapper]').forEach(element => element.removeAttribute('data-rep-file-version-wrapper'));
            document.querySelectorAll('a').forEach(anchor => {
              const wrapper = document.createElement('div');
              anchor.replaceWith(wrapper); wrapper.appendChild(anchor);
            });
          });
        }
        await page.addScriptTag({ content: 'window.DigitalViewer={cantaloupeBaseUrl:"",compassBaseUrl:""};' });
        await page.addScriptTag({ content: readFileSync(join(pluginRoot,'public/assets/openseadragon.min.js'),'utf8') });
        await page.addScriptTag({ content: readFileSync(join(pluginRoot,'public/assets/digital_viewer.js'),'utf8') });
        const mounts = await page.locator('.digital-viewer-container').count();
        if (mounts !== item.count) throw new Error(`${item.name}/${changedMarkup}: expected ${item.count}, got ${mounts}`);
        if (item.name === 'separate-image-pdf') {
          if (await page.locator('.dv-static-image').count() !== 1 || await page.locator('.dv-pdf').count() !== 1) throw new Error('Separate media groups combined');
        }
        results.push({name:item.name,changedMarkup,mounts});
      } finally { await context.close(); }
    }
  }
  return results;
}

export async function runLocalSourceContractChecks(browser, base = 'http://localhost:18081') {
  const context = await browser.newContext({javaScriptEnabled:false});
  const results=[];
  try {
    const page=await context.newPage();
    for(const [fixture,minimum] of [['digital_objects/863',1],['archival_objects/4097',1],
      ['digital_objects/871',2],['digital_objects/874',1],['digital_objects/872',0],
      ['archival_objects/4103',0],['archival_objects/4110',2]]) {
      const response=await page.goto(base+'/repositories/2/'+fixture,{waitUntil:'domcontentloaded'});
      if(response.status()!==200)throw new Error(fixture+': Rails render failed');
      const state=await page.evaluate(()=>{
        const sources=[...document.querySelectorAll('[data-file-uri]')];
        const originalLinks=[...document.querySelectorAll('.available-digital-objects a[href], [data-additional-file-version] a[href]')];
        return { count:sources.length,
          match:sources.every(source=>originalLinks.some(link=>link.href===new URL(source.dataset.fileUri,location.href).href)),
          entryGroup:document.querySelector('.available-digital-objects[data-dv-source-group="digital-object-entries"]')?.dataset.dvSourceGroup,
          malformed:[...document.querySelectorAll('[data-dv-source-group]')].some(group=>group.dataset.dvSourceGroup.includes('"')),
        };
      });
      if((minimum===0?state.count!==0:state.count<minimum)||!state.match||state.malformed)throw new Error(fixture+': invalid source contract '+JSON.stringify(state));
      if(fixture==='digital_objects/863'&&state.entryGroup!=='digital-object-entries')throw new Error('Rails escaped group attribute');
      results.push({fixture,...state});
    }
  }finally{await context.close();}
  return results;
}
