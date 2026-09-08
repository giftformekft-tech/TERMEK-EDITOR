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
const shirt = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="#f7f6f2"/><path d="M165 75 60 120 20 235 105 265 135 205 125 550Q240 575 355 550L345 205 375 265 460 235 420 120 315 75Q240 120 165 75Z" fill="#e9e1ce" stroke="#d4cbb8" stroke-width="2"/><path d="M165 75Q240 170 315 75" fill="none" stroke="#cec4ae" stroke-width="5"/></svg>';
const html = '<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#eeede8;font-family:Arial}button,input,select{font:inherit}</style><link rel="stylesheet" href="/assets/css/designer.css"><link rel="stylesheet" href="/assets/css/designer-studio.css">' + fs.readFileSync('templates/designer-page.php','utf8') + '<script>window.NB_DESIGNER='+JSON.stringify(fixture)+'</script><script src="/tmp/ui-qa/fabric.min.js"></script><script>fabric.Canvas=new Proxy(fabric.Canvas,{construct(T,args){window.qaCanvas=new T(...args);return window.qaCanvas;}})</script><script src="/assets/js/designer-app.js"></script></html>';
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
        // Mobile totals must not depend on the desktop summary container.
        body=body.replace('id="nb-price-display"','id="qa-omitted-desktop-price"');
      }
      return route.fulfill({contentType:'text/html',body});
    }
    if(u.pathname==='/tmp/ui-qa/fabric.min.js')return route.fulfill({path:fabricPath,contentType:'application/javascript'});
    if(u.pathname==='/shirt.svg')return route.fulfill({contentType:'image/svg+xml',body:shirt});
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
    await page.locator('#nb-flyout').waitFor({state:'visible'});
    const widthBefore=await page.locator('.nb-column--stage').evaluate(e=>e.getBoundingClientRect().width);
    await page.locator('[data-nb-rail-target="addtext"]').click();
    await page.locator('#nb-add-text').click();
    await page.locator('#nb-font-size').waitFor({state:'visible'});
    const widthAfter=await page.locator('.nb-column--stage').evaluate(e=>e.getBoundingClientRect().width);
    assert.ok(Math.abs(widthBefore-widthAfter)<2,'stable desktop stage width');
    await page.locator('[data-nb-rail-target="layers"]').click();
    assert.ok(await page.locator('.nb-layer-item').count()>0,'text added to layers');
    await page.locator('#nb-undo-btn').click();
    await page.waitForTimeout(150);
    await page.locator('#nb-redo-btn').click();
    await page.waitForTimeout(150);
    await page.locator('[data-nb-rail-target="product"]').click();
    await page.locator('#nb-product-modal-trigger').click();
    assert.equal(await page.locator('#nb-modal-product-list .nb-modal-product').count(), 1, 'admin products appear in product picker');
    assert.equal(await page.locator('#nb-modal-product-list .nb-modal-product strong').textContent(), 'Prémium póló', 'product picker uses configured title');
    await page.locator('#nb-modal-product-list .nb-modal-product').click();
    await page.locator('#nb-product-modal').waitFor({state:'hidden'});
    await page.locator('#nb-double-sided-toggle').check();
    await page.locator('.nb-side-button[data-nb-side="back"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-nb-rail-target="addtext"]').click();
    await page.locator('#nb-add-text').click();
    assert.equal((await page.locator('#nb-studio-total').textContent()).replace(/\s/g,''),'8490Ft','back-side surcharge reaches mobile total');
    await page.locator('#nb-undo-btn').click();
    await page.waitForFunction(()=>document.getElementById('nb-studio-total').textContent.replace(/\s/g,'')==='6990Ft');
    await page.locator('.nb-side-button[data-nb-side="front"]').click();
    await page.waitForTimeout(200);
    for(const key of ['upload','shapes','templates','layers','properties','product']){
      const b=page.locator(`[data-nb-rail-target="${key}"]`);
      if(await b.getAttribute('aria-expanded')!=='true') await b.click();
      assert.equal(await b.getAttribute('aria-expanded'),'true',key+' accessible');
    }
    await page.waitForTimeout(250);
    await page.screenshot({path:'tmp/ui-qa/desktop.png',fullPage:true});
    await page.locator('#nb-add-to-cart').click();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('#nb-processing-overlay').isVisible(),false,'failed cart unlocks UI');
    for(const width of [1024,768,390,320]){
      await page.setViewportSize({width,height:900});await page.waitForTimeout(400);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
      assert.equal(overflow,false,'page overflow at '+width);
      assert.ok(await page.locator('#nb-canvas').evaluate(e=>e.getBoundingClientRect().width>180),'canvas stays visible at '+width);
      if(width<=768){
        await page.locator('#nb-studio-checkout').waitFor({state:'visible'});
        assert.ok(await page.locator('#nb-mobile-toolbar').evaluate(e=>e.getBoundingClientRect().height<100),'mobile toolbar is one row');
        for(const key of ['product','upload','addtext','shapes','templates','layers','properties','sides']){
          const b=page.locator(`[data-nb-sheet-target="${key}"]`);
          await b.click();
          await page.locator('#nb-mobile-sheet').waitFor({state:'visible'});
          assert.ok(await page.locator('#nb-mobile-sheet-content').evaluate(e=>e.children.length>0),key+' mobile contents');
          await page.locator('#nb-mobile-sheet-close').click();
          await page.locator('#nb-mobile-sheet').waitFor({state:'hidden'});
        }
        const before=cartRequests;
        await page.locator('#nb-studio-order').click();
        await page.locator('#nb-mobile-complete').waitFor({state:'visible'});
        await page.locator('#nb-mobile-bulk').waitFor({state:'visible'});
        assert.equal(cartRequests,before,'bottom cart opens the panel without submitting at '+width);
        assert.equal(await page.locator('#nb-studio-checkout').evaluate(e=>e.children.length),2,'bottom bar contains only price and cart button');
        await page.screenshot({path:'tmp/ui-qa/cart-panel-'+width+'.png',fullPage:true});
        await page.locator('#nb-mobile-complete').click();
        await page.locator('#nb-processing-overlay').waitFor({state:'hidden'});
        assert.equal(cartRequests,before+1,'panel confirmation submits exactly once at '+width);
        await page.locator('#nb-mobile-sheet-close').click();
        await page.locator('#nb-mobile-sheet').waitFor({state:'hidden'});
        assert.equal((await page.locator('#nb-studio-total').textContent()).replace(/\s/g,''),'6990Ft','mobile price at '+width);
        assert.equal(await page.locator('[data-nb-sheet-target="cart"]').count(),0,'cart removed from tool icons');
        const header=await page.locator('.nb-studio-header').boundingBox();
        const stage=await page.locator('.nb-product-stage').boundingBox();
        assert.ok(header.y>=stage.y+stage.height-1,'header under canvas at '+width);
        const row=page.locator('.nb-mobile-toolbar-row');
        const scrollable=await row.evaluate(e=>e.scrollWidth>e.clientWidth+1);
        assert.equal(await page.locator('#nb-mobile-scroll-hint').isVisible(),scrollable,'visible scroll hint');
        await row.evaluate(e=>{e.scrollLeft=0;});
        await page.locator('#nb-studio-order').click();
        await page.locator('#nb-mobile-bulk').waitFor({state:'visible'});
        await page.locator('#nb-mobile-sheet-close').click();
        await page.locator('#nb-mobile-sheet').waitFor({state:'hidden'});
      }
      await page.screenshot({path:`tmp/ui-qa/viewport-${width}.png`,fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
    assert.equal(await page.locator('#nb-designer > .nb-studio-header').count(),1,'desktop header restored');
    await page.locator('[data-nb-rail-target="product"]').click();
    await page.locator('#nb-product-modal-trigger').waitFor({state:'visible'});
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
    await page.locator('[data-nb-rail-target="templates"]').click();
    await page.locator('#nb-templates-trigger').click();
    await page.locator('#nb-template-search-input').waitFor({state:'visible'});
    await page.locator('#nb-template-search-input').fill('Teszt');
    await page.waitForTimeout(600);
    await page.screenshot({path:'tmp/ui-qa/templates-themed.png',fullPage:true});
    await page.locator('[data-nb-close="templates-modal"]').last().click();
    await page.setViewportSize({width:390,height:900});
    await page.locator('#nb-studio-order').waitFor({state:'visible'});
    assert.equal(await page.locator('#nb-studio-order').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(35, 69, 103)','mobile theme color');
    for (const query of ['', '?numeric=1']) {
      await page.goto('http://nb.test/'+query);
      await page.waitForFunction(()=>document.getElementById('nb-studio-total').textContent.replace(/\s/g,'')==='6990Ft');
      assert.equal(await page.locator('.nb-column--stage > .nb-studio-header').count(),1,'mobile cold-start header');
      await page.addStyleTag({content:'button {padding: 15px 30px; line-height: 2;}'});
      for(const id of ['nb-undo-btn','nb-redo-btn','nb-zoom-in','nb-zoom-out']) {
        const button=page.locator('#'+id), icon=button.locator('svg');
        const b=await button.boundingBox(), i=await icon.boundingBox();
        assert.ok(b.width>=44 && b.height>=44,'touch target '+id);
        assert.ok(Math.abs(i.x+i.width/2-b.x-b.width/2)<1 && Math.abs(i.y+i.height/2-b.y-b.height/2)<1,'centered icon '+id);
      }
      await page.locator('#nb-zoom-in').click();
      assert.ok(await page.evaluate(()=>window.qaCanvas.getZoom()>1),'mobile zoom action');
      await page.locator('#nb-zoom-out').click();
      await page.screenshot({path:'tmp/ui-qa/mobile-cold'+(query?'-numeric':'')+'.png',fullPage:true});
      await page.evaluate(()=>{const size=document.getElementById('nb-size');size.value='';size.dispatchEvent(new Event('change',{bubbles:true}));});
      const before=cartRequests;
      await page.locator('#nb-studio-order').click();
      await page.locator('#nb-mobile-sheet').waitFor({state:'visible'});
      assert.equal(cartRequests,before,'incomplete selection does not submit cart');
    }
    cartSucceeds=true;
    await page.goto('http://nb.test/');
    await page.locator('[data-nb-sheet-target="addtext"]').click();
    await page.locator('#nb-add-text').click();
    await page.locator('#nb-mobile-sheet-close').click();
    await page.locator('#nb-mobile-sheet').waitFor({state:'hidden'});
    const successfulCartBefore=cartRequests;
    await page.locator('#nb-studio-order').click();
    await page.locator('#nb-mobile-complete').waitFor({state:'visible'});
    assert.equal(cartRequests,successfulCartBefore,'opening the panel does not submit');
    await Promise.all([page.waitForURL('http://nb.test/cart-confirmed'),page.locator('#nb-mobile-complete').click()]);
    assert.equal(cartRequests,successfulCartBefore+1,'successful mobile cart redirects exactly once');
    assert.deepEqual(errors,[],'JavaScript errors across all interactions');
    console.log('PASS: original tools, text, layers, undo/redo, sides, cart error recovery, mobile 8 tools and cart confirmation panel, cold-start price and numeric fallback, scroll hint and SVG alignment, responsive widths 1440/1024/768/390/320, desktop-mobile-desktop restoration.');
  }finally{await page.screenshot({path:'tmp/ui-qa/last-state.png',fullPage:true}).catch(()=>{});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
