import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

function option(name, fallback) {
  const index=process.argv.indexOf(name);
  return index===-1?fallback:process.argv[index+1];
}
const root=resolve(option('--plugin-root',fileURLToPath(new URL('..',import.meta.url))));
const suite=option('--suite','deterministic');
const output=option('--output',null);
if(!['deterministic','local'].includes(suite)) throw new Error('Use --suite deterministic or local');
const modulePath=process.env.PLAYWRIGHT_MODULE;
const {chromium}=await import(modulePath?pathToFileURL(resolve(modulePath)).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
const evidence={suite,browser:browser.version(),node:process.version,results:{}};
async function run(file,fn,...args) {
  const helper=await import(pathToFileURL(resolve(root,'test/browser',file+'.mjs')).href);
  evidence.results[fn]=await helper[fn](...args);
  console.log(fn+': passed');
  if(output)await writeFile(output,JSON.stringify(evidence,null,2)+'\n');
}
try {
  const context=await browser.newContext();const page=await context.newPage();
  if(suite==='deterministic') {
    await run('diagnostics','runDiagnosticChecks',browser,root);
    await run('startup','runStartupChecks',browser,root);
    await run('viewer-lifecycle','runViewerLifecycleChecks',browser,root);
    await run('source-request-ownership','runSourceRequestOwnership',page,root);
    await run('thumbnail-queue','runThumbnailQueueChecks',page,root);
    await run('source-contract','runSourceContractChecks',browser,root);
    await run('fallback-access','runFallbackAccessChecks',browser,root);
  } else {
    await run('module-build','runModuleBuildChecks',browser,root);
    await run('source-contract','runLocalSourceContractChecks',browser);
    await run('fallback-access','runLocalFallbackChecks',browser);
    await run('local-formats','runPdfChecks',page);
    await run('local-formats','runBlockedPdfChecks',page);
    await run('local-formats','runScannedTextChecks',page);
    await run('local-formats','runSeparateObjectCheck',page);
    await page.goto('http://localhost:18081/repositories/2/digital_objects/869');
    await page.waitForFunction(()=>document.querySelector('.digital-viewer-container')?.__dvMountAttempt?.viewer?.world?.getItemAt(0)?.getFullyLoaded(),null,{timeout:30000});
    evidence.results.singleImage={record:869,fullyLoaded:true};
    if(output)await writeFile(output,JSON.stringify(evidence,null,2)+'\n');
    console.log('Single-image fixture: passed');
  }
} finally {await browser.close();}
