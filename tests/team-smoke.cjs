const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
process.chdir(root);
fs.mkdirSync('tmp/ui-qa', { recursive: true });
const fabricPath = process.env.FABRIC_JS_PATH || path.join(root, 'tmp/ui-qa/fabric.min.js');
assert.ok(fs.existsSync(fabricPath), 'Set FABRIC_JS_PATH to Fabric.js 5.3.0 (the plugin dependency).');

const area = { id: 'area_front', role: 'front', x: 145, y: 170, w: 190, h: 253, canvas_w: 480, canvas_h: 640, width_mm: 300, height_mm: 400, dpi: 300 };
const fixture = {
  rest: 'http://nb.test/api/', nonce: 'test', cartUrl: 'http://nb.test/cart-confirmed',
  catalog: { 1: {
    id: 1, title: 'Prémium póló', types: ['Póló'], colors: ['Zöld', 'Kék', 'Fekete'], colors_by_type: { 'póló': ['Zöld', 'Kék', 'Fekete'] },
    sizes: ['S', 'M', 'L', 'XL'], price_value: 5000, prices: { 'póló|kék|XL': 5500 },
    map: { 'póló|zöld': { front: 'm1', back: 'm2' }, 'póló|kék': { front: 'm1', back: 'm2' }, 'póló|fekete': { front: 'm1', back: 'm2' } }
  } },
  mockups: {
    m1: { id: 'm1', image_url: 'http://nb.test/shirt.svg', canvas_w: 480, canvas_h: 640, areas: [area] },
    m2: { id: 'm2', image_url: 'http://nb.test/shirt.svg', canvas_w: 480, canvas_h: 640, areas: [Object.assign({}, area, { id: 'area_back', role: 'back' })] }
  },
  colorMeta: {}, fonts: [],
  discounts: [{ min_qty: 10, max_qty: 0, percent: 10 }],
  team: {
    gap_mm: 20, min_qty: 1, max_colors: 8,
    tiers: [
      { id: 'small', label: 'Kis nyomat', max_w_mm: 100, max_h_mm: 100, price: 990 },
      { id: 'medium', label: 'Közepes nyomat', max_w_mm: 210, max_h_mm: 297, price: 1490 },
      { id: 'large', label: 'Nagy nyomat', max_w_mm: 297, max_h_mm: 420, price: 1990 }
    ],
    presets: [
      { id: 'work-left-chest', mode: 'work', side: 'front', kind: 'logo', label: 'Bal mell logó', cx: 0.7, top: 0.08, w_mm: 90, h_mm: 90, text: '' },
      { id: 'work-back-top', mode: 'work', side: 'back', kind: 'text', label: 'Hát felső cégnév', cx: 0.5, top: 0.05, w_mm: 260, h_mm: 50, text: 'CÉGNÉV' },
      { id: 'sport-back-num', mode: 'sport', side: 'back', kind: 'number', label: 'Hát szám', cx: 0.5, top: 0.22, w_mm: 220, h_mm: 250, text: '10' }
    ]
  }
};
const shirt = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="#f7f6f2"/><path d="M165 75 60 120 20 235 105 265 135 205 125 550Q240 575 355 550L345 205 375 265 460 235 420 120 315 75Q240 120 165 75Z" fill="#e9e1ce" stroke="#d4cbb8" stroke-width="2"/></svg>';
const logoPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEUAAAD/AAAb/40iAAAAAXRSTlMAQObYZgAAAB9JREFUaN7twTEBAAAAwqD1T20LL6AAAAAAAAAAAP4GHMgAAX2Nc0QAAAAASUVORK5CYII=', 'base64');
const template = fs.readFileSync('templates/team-designer-page.php', 'utf8').replace(/<\?php[\s\S]*?\?>/, '');
const html = '<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fff;font-family:Arial}</style><link rel="stylesheet" href="/assets/css/team-designer.css">' + template + '<script>window.NB_TEAM=' + JSON.stringify(fixture) + '</script><script src="/tmp/ui-qa/fabric.min.js"></script><script src="/assets/js/team-designer.js"></script></html>';

const objectsOn = (page, side) => page.evaluate(s => window.NBTeamDesigner.sides[s].canvas.getObjects().filter(o => !o.nbArea).map(o => o.type), side);
const text = async (page, id) => (await page.locator('#' + id).textContent()).replace(/\s/g, '');

(async () => {
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let orderBody = null;
  let orderStatus = 400;
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'nb.test') return route.abort();
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
    if (u.pathname === '/tmp/ui-qa/fabric.min.js') return route.fulfill({ path: fabricPath, contentType: 'application/javascript' });
    if (u.pathname === '/shirt.svg') return route.fulfill({ contentType: 'image/svg+xml', body: shirt });
    if (u.pathname === '/api/team/order') {
      orderBody = JSON.parse(route.request().postData());
      return route.fulfill({ status: orderStatus, contentType: 'application/json', body: JSON.stringify(orderStatus === 200 ? { ok: true, redirect: 'http://nb.test/cart-confirmed' } : { message: 'Tesztelt kosárhiba' }) });
    }
    if (u.pathname === '/cart-confirmed') return route.fulfill({ contentType: 'text/html', body: '<p>Kosár teszt</p>' });
    const file = path.join(root, u.pathname);
    if (fs.existsSync(file)) return route.fulfill({ path: file });
    return route.abort();
  });

  try {
    await page.goto('http://nb.test/');
    assert.equal(await page.locator('#nbt-work').isHidden(), true, 'workspace hidden before choosing a mode');
    await page.click('.nbt-mode-card[data-mode="work"]');
    await page.waitForSelector('#nbt-work:not([hidden])');
    assert.equal(await page.locator('.nbt-type[aria-pressed="true"]').count(), 1, 'first product preselected');
    assert.equal(await page.locator('.nbt-swatch').count(), 3, 'colour swatches');
    assert.deepEqual(await page.locator('.nbt-chip span').allTextContents(), ['Bal mell logó', 'Hát felső cégnév'], 'work presets only');

    // Kosárba üres tervvel: magyarázat, nincs kérés.
    await page.click('#nbt-cart');
    assert.match(await page.locator('#nbt-error').textContent(), /logót vagy feliratot/);
    assert.equal(orderBody, null);

    // Logó a bal mell sablonra: fájlválasztó nyílik, utána a jó helyre kerül.
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.nbt-chip:has-text("Bal mell logó")')]);
    await chooser.setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: logoPng });
    await page.waitForFunction(() => window.NBTeamDesigner.sides.front.canvas.getObjects().some(o => o.type === 'image'));
    assert.deepEqual(await objectsOn(page, 'front'), ['image']);
    assert.match(await page.locator('#nbt-error').textContent(), /hány darab/, 'the check message moves on to the next missing step');
    const logoBox = await page.evaluate(() => {
      const q = window.NBTeamDesigner.computeQuote();
      return q.elements.map(e => ({ w: Math.round(e.w_mm), h: Math.round(e.h_mm), x: Math.round(e.x_mm + e.w_mm / 2) }))[0];
    });
    assert.deepEqual(logoBox, { w: 90, h: 90, x: 210 }, 'logo sized 9x9 cm at the left chest');
    assert.match(await page.locator('#nbt-size-readout').textContent(), /9,0 × 9,0 cm/);

    // Hátoldali felirat a sablonnal: átvált hátra, szerkeszthető a mezőben.
    await page.click('.nbt-chip:has-text("Hát felső cégnév")');
    assert.equal(await page.locator('.nbt-sides [data-side="back"]').getAttribute('aria-selected'), 'true');
    assert.deepEqual(await objectsOn(page, 'back'), ['text']);
    await page.fill('#nbt-text-input', 'GIFT FOR ME KFT');
    assert.equal(await page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getObjects().find(o => o.type === 'text').text), 'GIFT FOR ME KFT');

    // Két nyomat: kicsi elöl (990), közepes vagy nagy hátul.
    await page.waitForTimeout(200);
    const quote = await page.evaluate(() => { const q = window.NBTeamDesigner.computeQuote(); return { n: q.placements.length, unit: q.unitPrint, labels: q.placements.map(p => p.side + ':' + p.label) }; });
    assert.equal(quote.n, 2, 'one print per side');
    assert.ok(quote.labels.includes('front:Kis nyomat'), quote.labels.join());
    assert.ok(quote.labels.includes('back:Közepes nyomat'), 'longer text keeps its 26 cm preset width: ' + quote.labels.join());
    assert.equal(quote.unit, 990 + 1490);
    assert.equal(await text(page, 'nbt-sum-print'), '+' + quote.unit + 'Ft(2nyomat)', 'print summary');

    // Mennyiségek: zöld S5 M5, kék L3 XL2 = 15 db, 10% kedvezmény.
    const firstRow = page.locator('.nbt-row').first();
    assert.match(await firstRow.textContent(), /Zöld/);
    await firstRow.locator('input').nth(0).fill('5');
    await firstRow.locator('input').nth(1).fill('5');
    await page.selectOption('#nbt-add-color', 'Kék');
    await page.waitForFunction(() => document.querySelectorAll('.nbt-row').length === 2);
    const secondRow = page.locator('.nbt-row').nth(1);
    await secondRow.locator('input').nth(2).fill('3');
    await secondRow.locator('input').nth(3).fill('2');
    await page.waitForTimeout(250);
    assert.equal(await text(page, 'nbt-sum-qty'), '15db');
    assert.equal(await page.locator('#nbt-error').isHidden(), true, 'check message disappears once everything is set');
    assert.equal(await page.locator('#nbt-sum-discount-row').isVisible(), true);
    const expected = Math.round(((5000 + quote.unit) * 13 + (5500 + quote.unit) * 2) * 0.9);
    assert.equal(await text(page, 'nbt-sum-total'), expected + 'Ft', 'total = (product + print) x qty, minus 10%');
    assert.equal(await page.locator('.nbt-row.is-preview').textContent().then(t => /Kék/.test(t)), true, 'new colour is previewed');

    // Kontrasztfigyelmeztetés fekete feliratnál fekete ruhán.
    await page.evaluate(() => { const o = window.NBTeamDesigner.sides.back.canvas.getObjects().find(x => x.type === 'text'); o.set('fill', '#111111'); });
    await page.selectOption('#nbt-add-color', 'Fekete');
    await page.locator('.nbt-row').nth(2).locator('input').nth(0).fill('1');
    await page.waitForTimeout(250);
    assert.match(await page.locator('#nbt-warnings').textContent(), /fekete színű ruhán alig fog látszani/);
    await page.locator('.nbt-row').nth(2).locator('.nbt-row__remove').click();
    await page.waitForTimeout(250);
    assert.equal(await text(page, 'nbt-sum-qty'), '15db');
    await page.screenshot({ path: 'tmp/ui-qa/team-desktop.png', fullPage: true });

    // Kosárhiba: üzenet, a felület használható marad.
    await page.click('#nbt-cart');
    await page.waitForSelector('#nbt-error:not([hidden])');
    assert.match(await page.locator('#nbt-error').textContent(), /Tesztelt kosárhiba/);
    assert.equal(await page.locator('#nbt-busy').isHidden(), true);
    assert.ok(orderBody, 'order request sent');
    assert.equal(orderBody.product_id, 1);
    assert.equal(orderBody.type, 'Póló');
    assert.equal(orderBody.mode, 'work');
    assert.deepEqual(orderBody.rows.map(r => r.color + r.size + r.qty), ['ZöldS5', 'ZöldM5', 'KékL3', 'KékXL2']);
    assert.deepEqual(orderBody.previews.map(p => p.color), ['Zöld', 'Kék']);
    assert.ok(orderBody.previews.every(p => p.front.startsWith('data:image/png') && p.back.startsWith('data:image/png')));
    assert.ok(orderBody.print.front.startsWith('data:image/png') && orderBody.print.back.startsWith('data:image/png'));
    assert.equal(orderBody.elements.length, 2);
    const printSize = await page.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), orderBody.print.front);
    assert.ok(printSize[0] >= 3400 && printSize[0] <= 3600, 'front print ~300 dpi on 30 cm: ' + printSize);

    // Siker: irány a kosár, a piszkozat törlődik.
    orderStatus = 200;
    await Promise.all([page.waitForURL('http://nb.test/cart-confirmed'), page.click('#nbt-cart')]);
    assert.equal(await page.evaluate(() => localStorage.getItem('nb_team_draft_v1')), null);

    // Piszkozat visszaállítása újratöltés után.
    await page.goto('http://nb.test/');
    await page.click('.nbt-mode-card[data-mode="sport"]');
    await page.click('.nbt-chip:has-text("Hát szám")');
    await page.locator('.nbt-row').first().locator('input').nth(1).fill('7');
    await page.waitForTimeout(1200);
    await page.reload();
    await page.waitForSelector('#nbt-draft:not([hidden])');
    await page.click('#nbt-draft-restore');
    await page.waitForFunction(() => window.NBTeamDesigner.sides.back.canvas.getObjects().some(o => o.type === 'text'));
    assert.equal(await text(page, 'nbt-sum-qty'), '7db');
    assert.equal(await page.locator('#nbt-mode-label').textContent(), 'Csapatmez');

    // Mobil: nincs vízszintes görgetés, alsó sáv látszik, a méretmezők elég nagyok.
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, 'no horizontal scroll at ' + width + ': ' + overflow);
      assert.equal(await page.locator('#nbt-bar').isVisible(), true);
      const inputBox = await page.locator('.nbt-size input').first().boundingBox();
      assert.ok(inputBox.height >= 44, 'size input touch target');
      const canvasBox = await page.locator('#nbt-canvas-frame').boundingBox();
      assert.ok(canvasBox.width <= width - 32 + 1, 'canvas fits gutters');
      await page.screenshot({ path: 'tmp/ui-qa/team-mobile-' + width + '.png', fullPage: true });
    }

    assert.deepEqual(errors, [], 'no page errors');
    console.log('team designer smoke test passed');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
