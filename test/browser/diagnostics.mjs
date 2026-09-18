import assert from 'node:assert/strict';

export async function runDiagnosticChecks(browser, pluginRoot) {
  const results=[];
  for (const scenario of ['absent','valid','missing']) {
    const context=await browser.newContext();const page=await context.newPage();const warnings=[];
    page.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
    try {
      const source='https://files.test/unsupported.txt?token=must-not-be-logged';
      await page.setContent(scenario==='absent'?'<p>No digital source</p>':
        '<div data-dv-source-expected="true" '+(scenario==='valid'?'data-file-uri="'+source+'"':'')+'><a href="'+source+'">Original</a></div>');
      await page.addScriptTag({path:pluginRoot+'/public/assets/openseadragon.min.js'});
      await page.addScriptTag({path:pluginRoot+'/public/assets/digital_viewer.js'});
      assert.deepEqual(warnings,scenario==='missing'?['[digital_viewer] stage=discovery code=source-contract-missing']:[]);
      assert.ok(warnings.every(message=>!message.includes('token')&&!message.includes('https:')));
      results.push({scenario,warnings});
    } finally {await context.close();}
  }
  return results;
}
