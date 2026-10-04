const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
process.chdir(root);
fs.mkdirSync('tmp/ui-qa', { recursive: true });
const fabricPath = process.env.FABRIC_JS_PATH || path.join(root, 'tmp/ui-qa/fabric.min.js');
assert.ok(fs.existsSync(fabricPath), 'Set FABRIC_JS_PATH to Fabric.js 5.3.0 (the plugin dependency).');

const fixture = {
  rest: 'http://nb.test/api/', nonce: 'test', nb_product_id: 1,
  settings: { products: [1], types: ['Póló'], type_products: {'póló':1}, color_palette: ['Natúr','Fekete'],
    catalog: {1:{ title:'Prémium póló', price_value:6990, price_text:'6 990 Ft', types:['Póló'], colors:['Natúr','Fekete'], sizes:['S','M','L','XL'], map:{'póló|natúr':{mockup_index:0,mockup_back_index:0},'póló|fekete':{mockup_index:0}}}},
    double_sided_fee:1500, bulk_discounts:[{min_qty:5,max_qty:0,percent:10}],
    mockups:[{image_url:'http://nb.test/shirt.svg',canvas_w:480,canvas_h:640,area:{x:145,y:170,w:190,h:290,width_mm:300,height_mm:400,dpi:300}}]
  }
};
const templates = { categories: [{ id: 3, name: 'Sport', count: 1 }], templates: [{ id: 11, title: 'Csapat logó' }] };
const templateDesign = { layers: { version: '5.3.0', objects: [{ type: 'textbox', version: '5.3.0', left: 160, top: 220, width: 160, text: 'SABLON', fontSize: 30, fill: '#1d3557', fontFamily: 'Arial', textAlign: 'center' }] } };
const shirt = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="#f7f6f2"/><path d="M165 75 60 120 20 235 105 265 135 205 125 550Q240 575 355 550L345 205 375 265 460 235 420 120 315 75Q240 120 165 75Z" fill="#e9e1ce" stroke="#d4cbb8" stroke-width="2"/><path d="M165 75Q240 170 315 75" fill="none" stroke="#cec4ae" stroke-width="5"/></svg>';
const html = '<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#eeede8;font-family:Arial}button,input,select{font:inherit}</style><link rel="stylesheet" href="/assets/css/designer.css">' + fs.readFileSync('templates/designer-page.php','utf8') + '<script>window.NB_DESIGNER='+JSON.stringify(fixture)+'</script><script src="/tmp/ui-qa/fabric.min.js"></script><script>fabric.Canvas=new Proxy(fabric.Canvas,{construct(T,args){window.qaCanvas=new T(...args);return window.qaCanvas;}})</script><script src="/assets/js/designer-app.js"></script></html>';

const designCount = page => page.evaluate(() => window.qaCanvas.getObjects().filter(o => !o.__nb_bg && !o.__nb_area && !o.__nb_crop_overlay).length);
const total = async page => (await page.locator('#nb-studio-total').textContent()).replace(/\s/g, '');
const orderTotal = async page => (await page.locator('#nb-price-total').textContent()).replace(/\s/g, '');

(async()=>{
  const browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {channel:'chrome'}),headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  let cartRequests=0;
  let cartSucceeds=false;
  const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.dismiss());
  await page.route('**/*', async route=>{
    const u=new URL(route.request().url());
    if(u.hostname !== 'nb.test')return route.abort();
    if(u.pathname==='/') {
      let body=html;
      if(u.searchParams.has('numeric')) {
        const numeric=JSON.parse(JSON.stringify(fixture));
        delete numeric.settings.catalog[1].price_text;
        numeric.settings.catalog[1].price_value='6990';
        body=body.replace(JSON.stringify(fixture),JSON.stringify(numeric));
        // The mobile total must not depend on the desktop price container.
        body=body.replace('id="nb-price-display"','id="qa-omitted-desktop-price"');
      }
      return route.fulfill({contentType:'text/html',body});
    }
    if(u.pathname==='/tmp/ui-qa/fabric.min.js')return route.fulfill({path:fabricPath,contentType:'application/javascript'});
    if(u.pathname==='/shirt.svg')return route.fulfill({contentType:'image/svg+xml',body:shirt});
    if(u.pathname==='/api/templates')return route.fulfill({contentType:'application/json',body:JSON.stringify(templates)});
    if(u.pathname==='/api/load-design')return route.fulfill({contentType:'application/json',body:JSON.stringify(templateDesign)});
    if(u.pathname==='/api/save')return route.fulfill({contentType:'application/json',body:JSON.stringify({design_id:77})});
    if(u.pathname==='/api/add-to-cart'){cartRequests++;return route.fulfill({status:cartSucceeds?200:400,contentType:'application/json',body:JSON.stringify(cartSucceeds?{redirect:'http://nb.test/cart-confirmed'}:{message:'Tesztelt kosárhiba'})});}
    if(u.pathname==='/cart-confirmed')return route.fulfill({contentType:'text/html',body:'<p>Kosár teszt</p>'});
    if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'[]'});
    const file=path.join(root,u.pathname);if(fs.existsSync(file))return route.fulfill({path:file});
    return route.abort();
  });
  try{
    await page.goto('http://nb.test/');
    await page.waitForTimeout(700);
    assert.deepEqual(errors,[], 'initial JavaScript errors');
    const ids = await page.locator('[id]').evaluateAll(els=>els.map(e=>e.id));
    assert.equal(ids.length,new Set(ids).size,'duplicate element IDs');

    // Desktop layout: tools panel open, heading below the canvas.
    await page.locator('[data-nb-panel="product"]').waitFor({state:'visible'});
    assert.ok(await page.evaluate(()=>document.querySelector('.nb-stage-footer').getBoundingClientRect().top>=document.querySelector('.nb-stage-canvas').getBoundingClientRect().bottom),'desktop heading below canvas');
    await page.locator('#nb-studio-help-toggle').click();
    await page.locator('#nb-studio-help').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await page.locator('#nb-studio-help').waitFor({state:'hidden'});

    // Every tool opens its own panel without changing the canvas width.
    const widthBefore=await page.locator('.nb-stage').evaluate(e=>e.getBoundingClientRect().width);
    for(const key of ['upload','text','elements','templates','product']){
      await page.locator(`.nb-rail [data-nb-tool="${key}"]`).click();
      await page.locator(`[data-nb-panel="${key}"]`).waitFor({state:'visible'});
      assert.equal(await page.locator(`.nb-rail [data-nb-tool="${key}"]`).getAttribute('aria-expanded'),'true',key+' accessible');
    }
    const widthAfter=await page.locator('.nb-stage').evaluate(e=>e.getBoundingClientRect().width);
    assert.ok(Math.abs(widthBefore-widthAfter)<2,'stable desktop stage width');

    // Colours and sizes are chosen inline; several sizes need an explicit choice.
    assert.equal(await page.locator('#nb-modal-color-list .nb-swatch').count(),2,'colour swatches');
    assert.equal(await page.locator('#nb-size').inputValue(),'','no size preselected');
    await page.locator('#nb-add-to-cart').click();
    await page.locator('.nb-toast').first().waitFor({state:'visible'});
    assert.equal(cartRequests,0,'missing size does not submit the cart');
    assert.equal(await page.locator('#nb-size-group').evaluate(e=>e.classList.contains('is-attention')),true,'size group highlighted');
    await page.locator('#nb-size-buttons .nb-pill').nth(1).click();
    assert.equal(await page.locator('#nb-size').inputValue(),'M','size selected');
    await page.locator('#nb-modal-color-list .nb-swatch').nth(1).click();
    assert.equal(await page.locator('#nb-color').inputValue(),'fekete','colour selected');
    assert.equal(await page.locator('#nb-size').inputValue(),'M','size kept after colour change');

    // Text: typed in a field, editable from the properties panel, undo/redo.
    await page.locator('.nb-rail [data-nb-tool="text"]').click();
    await page.locator('#nb-text-input').fill('Hajrá csapat');
    await page.locator('#nb-add-text').click();
    await page.locator('[data-nb-section="text"]').waitFor({state:'visible'});
    assert.equal(await designCount(page),1,'text added');
    assert.equal(await page.locator('#nb-quickbar').isVisible(),true,'selection toolbar');
    await page.locator('#nb-text-content').fill('Hajrá 2026');
    assert.equal(await page.evaluate(()=>window.qaCanvas.getActiveObject().text),'Hajrá 2026','text edited from the panel');
    await page.locator('#nb-tab-layers').click();
    assert.equal(await page.locator('.nb-layer-item').count(),1,'text listed in layers');
    await page.locator('#nb-undo-btn').click();
    await page.waitForTimeout(150);
    await page.locator('#nb-redo-btn').click();
    await page.waitForTimeout(150);

    // Object positions never drift when the viewport changes.
    const before=await page.evaluate(()=>{const o=window.qaCanvas.getObjects().find(x=>x.type==='textbox');return [o.left,o.top,o.scaleX];});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
    await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(400);
    const after=await page.evaluate(()=>{const o=window.qaCanvas.getObjects().find(x=>x.type==='textbox');return [o.left,o.top,o.scaleX];});
    assert.deepEqual(after,before,'objects keep their position across resizes');

    // The back side is offered directly; its surcharge reaches the totals.
    await page.locator('button[data-nb-side="back"]').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#nb-double-sided-toggle').isChecked(),true,'back side enables double-sided printing');
    await page.locator('.nb-rail [data-nb-tool="text"]').click();
    await page.locator('#nb-add-text').click();
    await page.waitForTimeout(200);
    assert.equal(await total(page),'8490Ft','back-side surcharge reaches the top total');
    assert.equal(await orderTotal(page),'8490Ft','back-side surcharge reaches the summary');
    await page.locator('#nb-undo-btn').click();
    await page.waitForFunction(()=>document.getElementById('nb-studio-total').textContent.replace(/\s/g,'')==='6990Ft');
    await page.locator('button[data-nb-side="front"]').click();
    await page.waitForTimeout(250);

    // Preview hides the guides and the selection toolbar.
    await page.locator('#nb-preview-toggle').click();
    assert.equal(await page.evaluate(()=>window.qaCanvas.__nb_area_rect.visible),false,'preview hides the print area');
    assert.equal(await page.locator('#nb-quickbar').isVisible(),false,'preview hides the selection toolbar');
    await page.locator('#nb-preview-toggle').click();
    assert.equal(await page.evaluate(()=>window.qaCanvas.__nb_area_rect.visible),true,'guides restored');

    // Templates load inside the panel and confirm before replacing a design.
    await page.locator('.nb-rail [data-nb-tool="templates"]').click();
    await page.locator('.nb-template-card').first().waitFor({state:'visible'});
    await page.locator('.nb-template-card').first().click();
    await page.locator('#nb-dialog').waitFor({state:'visible'});
    await page.locator('#nb-dialog-cancel').click();
    await page.locator('#nb-dialog').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.qaCanvas.getObjects().some(o=>o.text==='SABLON')),false,'cancelled template keeps the design');

    await page.screenshot({path:'tmp/ui-qa/desktop.png',fullPage:true});
    await page.locator('#nb-add-to-cart').click();
    await page.waitForTimeout(1200);
    assert.equal(cartRequests,1,'complete selection submits once');
    assert.equal(await page.locator('#nb-processing-overlay').isVisible(),false,'failed cart unlocks UI');
    await page.locator('.nb-toast--error').first().waitFor({state:'visible'});

    for(const width of [1024,768,390,320]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
      assert.equal(overflow,false,'page overflow at '+width);
      assert.ok(await page.locator('#nb-canvas').evaluate(e=>e.getBoundingClientRect().width>180),'canvas stays visible at '+width);
      if(width>768){
        assert.ok(await page.evaluate(()=>document.querySelector('.nb-stage-footer').getBoundingClientRect().top>=document.querySelector('.nb-stage-canvas').getBoundingClientRect().bottom),'heading below canvas at '+width);
        await page.locator('.nb-rail [data-nb-tool="upload"]').click();
        await page.locator('#nb-dock.is-open [data-nb-panel="upload"]').waitFor({state:'visible'});
        await page.keyboard.press('Escape');
        await page.waitForTimeout(250);
        assert.equal(await page.locator('#nb-dock').evaluate(e=>e.classList.contains('is-open')),false,'tablet panel closes at '+width);
      } else {
        await page.locator('#nb-tabbar').waitFor({state:'visible'});
        assert.ok(await page.locator('#nb-tabbar').evaluate(e=>e.getBoundingClientRect().height<100),'mobile tab bar is one row');
        assert.equal(await page.locator('#nb-tabbar').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'all tools fit without scrolling at '+width);
        for(const key of ['product','upload','text','elements','templates']){
          await page.locator(`.nb-tabbar [data-nb-tool="${key}"]`).click();
          await page.locator(`#nb-dock.is-open [data-nb-panel="${key}"]`).waitFor({state:'visible'});
          // The tab bar stays usable while a sheet is open.
          assert.equal(await page.locator('.nb-tabbar [data-nb-tool="product"]').evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el.contains(hit);}),true,'tab bar not covered by '+key);
        }
        await page.locator('#nb-dock [data-nb-panel="templates"] [data-nb-sheet-close]').click();
        await page.waitForFunction(()=>!document.getElementById('nb-dock').classList.contains('is-open'));
        const beforeCart=cartRequests;
        await page.locator('#nb-studio-order').click();
        await page.locator('#nb-order.is-open #nb-add-to-cart').waitFor({state:'visible'});
        await page.locator('#nb-order.is-open #nb-bulk-modal-trigger').waitFor({state:'visible'});
        assert.equal(cartRequests,beforeCart,'top cart button opens the summary without submitting at '+width);
        await page.screenshot({path:'tmp/ui-qa/cart-panel-'+width+'.png'});
        await page.locator('#nb-add-to-cart').click();
        await page.locator('#nb-processing-overlay').waitFor({state:'hidden'});
        assert.equal(cartRequests,beforeCart+1,'summary confirmation submits exactly once at '+width);
        await page.locator('#nb-order [data-nb-sheet-close]').click();
        await page.waitForFunction(()=>!document.getElementById('nb-order').classList.contains('is-open'));
        assert.equal(await total(page),'6990Ft','mobile price at '+width);
        assert.equal(await page.locator('.nb-stage-footer').isVisible(),false,'mobile keeps the canvas first');
      }
      await page.screenshot({path:`tmp/ui-qa/viewport-${width}.png`});
    }

    await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
    await page.evaluate(()=>{
      const el=document.getElementById('nb-designer');
      el.style.setProperty('--nb-accent','#234567');
      el.style.setProperty('--nb-accent-text','#ffffff');
      el.style.setProperty('--nb-secondary','#cdeabc');
      el.style.setProperty('--nb-radius','0px');
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#nb-add-to-cart').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(35, 69, 103)','primary theme color');
    assert.equal(await page.locator('#nb-bulk-modal-trigger').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(205, 234, 188)','secondary theme color');
    assert.equal(await page.locator('#nb-add-to-cart').evaluate(e=>getComputedStyle(e).borderRadius),'0px','square button setting');
    await page.screenshot({path:'tmp/ui-qa/desktop-themed.png'});
    await page.setViewportSize({width:390,height:900});
    await page.locator('#nb-studio-order').waitFor({state:'visible'});
    assert.equal(await page.locator('#nb-studio-order').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(35, 69, 103)','mobile theme color');

    for (const query of ['', '?numeric=1']) {
      await page.evaluate(()=>{try{localStorage.clear();}catch(e){}});
      await page.goto('http://nb.test/'+query);
      await page.waitForFunction(()=>document.getElementById('nb-studio-total').textContent.replace(/\s/g,'')==='6990Ft');
      await page.addStyleTag({content:'button {padding: 15px 30px; line-height: 2;}'});
      for(const id of ['nb-undo-btn','nb-redo-btn','nb-preview-toggle','nb-layers-quick']) {
        const button=page.locator('#'+id), icon=button.locator('svg').first();
        const b=await button.boundingBox(), i=await icon.boundingBox();
        assert.ok(b.width>=44 && b.height>=44,'touch target '+id);
        assert.ok(Math.abs(i.x+i.width/2-b.x-b.width/2)<1 && Math.abs(i.y+i.height/2-b.y-b.height/2)<1,'centered icon '+id);
      }
      await page.screenshot({path:'tmp/ui-qa/mobile-cold'+(query?'-numeric':'')+'.png'});
      const beforeCart=cartRequests;
      await page.locator('#nb-studio-order').click();
      await page.locator('#nb-dock.is-open [data-nb-panel="product"]').waitFor({state:'visible'});
      assert.equal(cartRequests,beforeCart,'incomplete selection does not submit the cart');
    }

    // Unfinished work is offered again after a reload.
    await page.locator('#nb-size-buttons .nb-pill').nth(2).click();
    await page.locator('.nb-tabbar [data-nb-tool="text"]').click();
    await page.locator('#nb-text-input').fill('Piszkozat');
    await page.locator('#nb-add-text').click();
    await page.waitForTimeout(1300);
    await page.reload();
    await page.locator('#nb-dialog').waitFor({state:'visible'});
    await page.locator('#nb-dialog-ok').click();
    await page.waitForFunction(()=>window.qaCanvas.getObjects().some(o=>o.text==='Piszkozat'));
    assert.equal(await page.locator('#nb-size').inputValue(),'L','draft restores the size');

    cartSucceeds=true;
    const successfulCartBefore=cartRequests;
    await page.locator('#nb-studio-order').click();
    await page.locator('#nb-order.is-open #nb-add-to-cart').waitFor({state:'visible'});
    assert.equal(cartRequests,successfulCartBefore,'opening the summary does not submit');
    await Promise.all([page.waitForURL('http://nb.test/cart-confirmed'),page.locator('#nb-add-to-cart').click()]);
    assert.equal(cartRequests,successfulCartBefore+1,'successful mobile cart redirects exactly once');
    assert.equal(await page.evaluate(()=>localStorage.getItem('nb_designer_draft_v1')),null,'draft cleared after a successful order');
    assert.deepEqual(errors,[],'JavaScript errors across all interactions');
    console.log('PASS: panels on desktop/tablet/mobile, inline colour and size choice with explicit size, text field editing, layers, undo/redo, stable object positions, back-side offer and surcharge, preview, templates with confirmation, cart error recovery and success, theme colours, touch targets, cold-start and numeric price, draft restore, responsive widths 1440/1024/768/390/320.');
  }finally{await page.screenshot({path:'tmp/ui-qa/last-state.png',fullPage:true}).catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
