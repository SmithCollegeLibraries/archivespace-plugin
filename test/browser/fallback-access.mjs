import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const origin = 'http://digital-viewer.test';
const pixel = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
function pdfFixture() {
  const stream = 'BT /F1 18 Tf 20 100 Td (Fallback PDF fixture) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(text.length); text += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = text.length;
  text += `xref\n0 6\n0000000000 65535 f \n` + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  return Buffer.from(text + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}

// The actual ERB is rendered with documented helper substitutes, not Rails.
// All browser responses are intercepted. No ASpace or external URLs are used.
export async function runFallbackAccessChecks(browser, pluginRoot) {
  const results = [];
  const scenarios = ['no-js', 'viewer-blocked', 'osd-blocked', 'config-absent', 'content-blocked', 'init-failed', 'working'];
  for (const recordType of ['DigitalObject', 'ArchivalObject']) {
    for (const format of ['png', 'pdf']) {
      for (const scenario of scenarios) {
        const context = await browser.newContext({ javaScriptEnabled: scenario !== 'no-js' });
        try {
          const url = origin + '/original.' + format;
          const rendered = execFileSync('ruby', [join(pluginRoot, 'test/support/render_digital_fixture.rb')], {
            input: JSON.stringify({ record_type: recordType, files: [{ out: url, caption: 'Original file', material: '(text)' }] }),
            encoding: 'utf8',
          });
          const config = scenario === 'config-absent' ? '' : '<script>window.DigitalViewer={cantaloupeBaseUrl:"",compassBaseUrl:"",loadingTimeoutMs:100};</script>';
          const failure = scenario === 'init-failed' ? '<script>const originalAssign=Object.assign; Object.assign=function(){Object.assign=originalAssign; throw new Error("fixture init failure");};</script>' : '';
          await context.route('**/*', async route => {
            const request = route.request();
            const path = new URL(request.url()).pathname;
            if (path === '/') {
              return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>${config}
                <script src="/assets/openseadragon.min.js"></script>${failure}<script src="/assets/digital_viewer.js"></script>
                <link rel="stylesheet" href="/assets/digital_viewer.css"></head><body><h1>Record metadata</h1>${rendered}</body></html>` });
            }
            if (path.startsWith('/assets/')) {
              if ((scenario === 'viewer-blocked' && path.endsWith('/digital_viewer.js')) ||
                  (scenario === 'osd-blocked' && path.endsWith('/openseadragon.min.js'))) return route.abort();
              return route.fulfill({ contentType: path.endsWith('.css') ? 'text/css' : 'text/javascript',
                body: readFileSync(join(pluginRoot, 'public', path)) });
            }
            // Content blocking here targets embedded content, not top-level direct access.
            let isEmbedded = request.resourceType() === 'image';
            try { isEmbedded = isEmbedded || !!request.frame().parentFrame(); }
            catch (error) { if (!request.isNavigationRequest()) throw error; }
            if (scenario === 'content-blocked' && isEmbedded) return route.abort();
            return route.fulfill({ contentType: format === 'pdf' ? 'application/pdf' : 'image/gif', body: format === 'pdf' ? pdfFixture() : pixel });
          });
          const page = await context.newPage();
          await page.goto(origin, { waitUntil: 'load' });
          const help = page.locator('.dv-access-help');
          const mounts = await page.locator('.digital-viewer-container').count();
          const shouldMount = ['working', 'config-absent', 'content-blocked'].includes(scenario);
          if (Boolean(mounts) !== shouldMount) throw new Error(`${scenario}: unexpected viewer startup state`);
          if (!await help.isVisible()) throw new Error(`${recordType}/${format}/${scenario}: missing access explanation`);
          if (!await page.locator('h1').isVisible()) throw new Error('Record metadata lost');
          const noScript = help.locator('noscript');
          if (scenario === 'no-js' && !await noScript.isVisible()) throw new Error('Disabled-JS explanation missing');
          if (scenario !== 'no-js' && await noScript.isVisible()) throw new Error('Incorrect disabled-JS explanation');
          const link = page.locator('.external-digital-object__link');
          await link.focus();
          const popupPromise = context.waitForEvent('page');
          await page.keyboard.press('Enter');
          const popup = await popupPromise;
          await popup.waitForLoadState('load');
          if (popup.url() !== url) throw new Error('Original destination changed');
          if (format === 'png') {
            await popup.waitForFunction(() => document.images[0] && document.images[0].naturalWidth > 0);
          } else {
            // Native PDF internals differ with JS disabled; URL/load proves navigation,
            // not a full PDF usability/accessibility acceptance claim.
            if (await popup.locator('body').count() !== 1) throw new Error('PDF destination did not load');
          }
          results.push({ recordType, format, scenario, originalDestinationOpened: true });
        } finally { await context.close(); }
      }
    }
  }
  return results;
}
