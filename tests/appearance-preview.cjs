const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const defaults = { background:'#f5f1e8', surface:'#ffffff', surface_alt:'#f7f6f2', text:'#20211f', muted:'#686b63', border:'#dedfd8', accent:'#f4d35e', accent_text:'#20211f', accent_hover:'#e9c344', secondary:'#f0f0e9', secondary_text:'#30332c', success:'#28734c', danger:'#b43b36', radius:12 };
const template = fs.readFileSync(path.join(root,'admin/templates/admin-page.php'),'utf8');
const start = template.indexOf('<div class="nb-appearance-preview"');
const end = template.indexOf('<div class="nb-appearance-legend"', start);
// Use the actual preview markup, substituting only its WordPress translations.
const preview = template.slice(start,end).replace(/<\?php (?:esc_html_e|esc_attr_e)\('([^']*)'[^;]*; \?>/g,'$1');
const fields = Object.entries(defaults).map(([key,value])=>`<label>${key}<span><input data-appearance-key="${key}" name="appearance[${key}]" type="${key==='radius'?'range':'color'}" min="0" max="24" value="${value}"><code>${value}</code></span></label>`).join('');
const html = `<!doctype html><html><meta charset="utf-8"><style>body{font:14px Arial;margin:30px;background:#f6f6f6}form{max-width:900px}section{display:grid;grid-template-columns:1fr 1fr;gap:30px}label{display:flex;justify-content:space-between;margin:8px 0}input{vertical-align:middle}button{padding:8px}aside{padding:16px;background:white}</style><link rel="stylesheet" href="/admin/css/appearance.css"><form class="nb-appearance-form" data-appearance-defaults='${JSON.stringify(defaults)}'><h1>Megjelenés — előnézet ellenőrzése</h1><section><div>${fields}<output data-appearance-radius-output></output><p><button type="button" data-appearance-reset>Alapértékek visszaállítása</button></p></div><aside>${preview}</aside></section></form><script src="/admin/js/appearance.js"></script></html>`;
(async()=>{
  fs.mkdirSync(path.join(root,'tmp/ui-qa'),{recursive:true});
  const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'}),headless:true});
  const page=await browser.newPage({viewport:{width:1100,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    if(u.pathname.startsWith('/admin/'))return route.fulfill({path:path.join(root,u.pathname)});
    return route.abort();
  });
  try{
    await page.goto('http://nb.test/');
    await page.locator('[data-appearance-key="accent"]').fill('#123456');
    await page.locator('[data-appearance-key="secondary"]').fill('#abcdef');
    await page.locator('[data-appearance-key="radius"]').fill('0');
    assert.equal(await page.locator('.is-primary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(18, 52, 86)');
    assert.equal(await page.locator('.is-secondary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(171, 205, 239)');
    assert.equal(await page.locator('.is-primary').evaluate(e=>getComputedStyle(e).borderRadius),'0px');
    assert.equal(await page.locator('[data-appearance-radius-output]').textContent(),'0 px');
    await page.locator('[data-appearance-reset]').click();
    assert.equal(await page.locator('[data-appearance-key="accent"]').inputValue(),'#f4d35e');
    assert.equal(await page.locator('.is-primary').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(244, 211, 94)');
    assert.equal(await page.locator('[data-appearance-radius-output]').textContent(),'12 px');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(root,'tmp/ui-qa/admin-preview.png'),fullPage:true});
    console.log('PASS: actual appearance preview markup and script, primary/secondary colors, zero radius, reset inputs + preview. WordPress save not mocked or asserted.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
