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
    sizes: ['S', 'M', 'L', 'XL'],
    bands_by_type: { 'póló': [{ min: 1, max: 10, single: 6990, double: 1500 }, { min: 11, max: 0, single: 5990, double: 1200 }] },
    size_fees_by_type: { 'póló': { XL: 500 } },
    map: { 'póló|zöld': { front: 'm1', back: 'm2' }, 'póló|kék': { front: 'm1', back: 'm2' }, 'póló|fekete': { front: 'm1', back: 'm2' } }
  } },
  mockups: {
    m1: { id: 'm1', image_url: 'http://nb.test/shirt.svg', canvas_w: 480, canvas_h: 640, areas: [area] },
    m2: { id: 'm2', image_url: 'http://nb.test/shirt.svg', canvas_w: 480, canvas_h: 640, areas: [Object.assign({}, area, { id: 'area_back', role: 'back' })] }
  },
  colorMeta: {}, fonts: [],
  team: {
    min_qty: 1, max_colors: 8, personal_fee: 500, max_players: 100,
    presets: [
      { id: 'work-left-chest', mode: 'work', side: 'front', kind: 'logo', label: 'Bal mell logó', cx: 0.7, top: 0.08, w_mm: 90, h_mm: 90, text: '' },
      { id: 'work-right-text', mode: 'work', side: 'front', kind: 'text', label: 'Jobb mell felirat', cx: 0.3, top: 0.1, w_mm: 90, h_mm: 22, text: 'Név / beosztás', bind: 'name' },
      { id: 'work-back-top', mode: 'work', side: 'back', kind: 'text', label: 'Hát felső cégnév', cx: 0.5, top: 0.05, w_mm: 260, h_mm: 50, text: 'CÉGNÉV' },
      { id: 'sport-back-name', mode: 'sport', side: 'back', kind: 'text', label: 'Hát név', cx: 0.5, top: 0.05, w_mm: 280, h_mm: 70, text: 'NÉV', bind: 'name' },
      { id: 'sport-back-num', mode: 'sport', side: 'back', kind: 'number', label: 'Hát szám', cx: 0.5, top: 0.22, w_mm: 220, h_mm: 250, text: '10', bind: 'number' }
    ]
  }
};
const shirt = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="#f7f6f2"/><path d="M165 75 60 120 20 235 105 265 135 205 125 550Q240 575 355 550L345 205 375 265 460 235 420 120 315 75Q240 120 165 75Z" fill="#e9e1ce" stroke="#d4cbb8" stroke-width="2"/></svg>';
const jerseyPath = (x, fill) => '<path transform="translate(' + x + ' 40)" d="M120 0 40 34 8 120 70 142 92 100 86 330Q170 346 254 330L248 100 270 142 332 120 300 34 220 0Q170 30 120 0Z" fill="' + fill + '"/>';
const banner = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="560" viewBox="0 0 1600 560"><rect width="1600" height="560" fill="#e8efe9"/><rect y="420" width="1600" height="140" fill="#cfe0d2"/>' + jerseyPath(330, '#1f7a3a') + jerseyPath(630, '#1b2a4a') + jerseyPath(930, '#1f7a3a') + '<text x="800" y="250" text-anchor="middle" font-family="Arial" font-weight="700" font-size="64" fill="#fff">10</text><text x="500" y="250" text-anchor="middle" font-family="Arial" font-weight="700" font-size="64" fill="#fff">7</text><text x="1100" y="250" text-anchor="middle" font-family="Arial" font-weight="700" font-size="64" fill="#fff">5</text></svg>';
const logoPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQMAAACXljzdAAAABlBMVEUAAAD/AAAb/40iAAAAAXRSTlMAQObYZgAAAB9JREFUaN7twTEBAAAAwqD1T20LL6AAAAAAAAAAAP4GHMgAAX2Nc0QAAAAASUVORK5CYII=', 'base64');
// A sablont valódi PHP rendereli (tests/render-team-page.php), adminban beállított választószövegekkel és képpel.
const teamSettings = { intro: { title: 'Mit tervezel ma?', lead: 'Első sor\nMásodik sor', cards: { sport: { title: 'Focimez', text: 'Név és szám a háton.' } }, banner: { image_id: 12, title: 'Így készül a csapatmez', text: 'Tervezd meg, add meg a neveket.' } } };
const template = require('child_process').execFileSync(process.env.PHP_BINARY || 'php', ['tests/render-team-page.php', JSON.stringify(teamSettings)], { encoding: 'utf8' });
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
    if (u.pathname === '/card-12.svg') return route.fulfill({ contentType: 'image/svg+xml', body: banner });
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
    // Az adminban megadott választószövegek és kép; ami nincs megadva, az alapértéket kapja.
    assert.equal(await page.locator('#nbt-mode-title').textContent(), 'Mit tervezel ma?');
    assert.equal(await page.locator('.nbt-lead br').count(), 1, 'line breaks of the lead text are kept');
    assert.equal(await page.locator('.nbt-kicker').textContent(), 'Csapat- és munkaruha tervező');
    assert.equal(await page.locator('.nbt-mode-card[data-mode="sport"] strong').textContent(), 'Focimez');
    assert.equal(await page.locator('.nbt-mode-card .nbt-mode-card__icon').count(), 2, 'the cards keep their icons');
    assert.equal(await page.locator('.nbt-mode-card[data-mode="work"] strong').textContent(), 'Munkaruha, céges ruha');
    // A nagy kép a kártyák alatt, teljes szélességben, alatta a cím és a leírás.
    assert.equal(await page.locator('.nbt-mode-banner img').getAttribute('alt'), 'Kép 12');
    assert.equal(await page.locator('.nbt-mode-banner h2').textContent(), 'Így készül a csapatmez');
    await page.waitForFunction(() => document.querySelector('.nbt-mode-banner img').complete);
    const grid = await page.locator('.nbt-mode__grid').boundingBox();
    const banner = await page.locator('.nbt-mode-banner img').boundingBox();
    assert.ok(banner.y > grid.y + grid.height && Math.abs(banner.width - grid.width) < 2, 'banner is below the cards at full width');
    await page.screenshot({ path: 'tmp/ui-qa/team-mode.png', fullPage: true });
    await page.click('.nbt-mode-card[data-mode="work"]');
    await page.waitForSelector('#nbt-work:not([hidden])');
    assert.equal(await page.locator('.nbt-type[aria-pressed="true"]').count(), 1, 'first product preselected');
    assert.equal(await page.locator('.nbt-swatch').count(), 3, 'colour swatches');
    assert.deepEqual(await page.locator('.nbt-chip span').allTextContents(), ['Bal mell logó', 'Jobb mell felirat', 'Hát felső cégnév'], 'work presets only');

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
    assert.equal(await text(page, 'nbt-sum-sides'), 'Egyoldalas(elöl)');
    assert.equal(await text(page, 'nbt-sum-unit'), '6990Ft', 'one-sided price of the first band');
    assert.deepEqual(await page.locator('.nbt-bands__table tbody tr').evaluateAll(rows => rows.map(r => r.innerText.replace(/\s+/g, ' ').trim())), ['1–10 db 6 990 Ft 8 490 Ft', '11 db-tól 5 990 Ft 7 190 Ft'], 'price bands with one- and two-sided unit prices');

    // Ugyanarra a sablonra újra kattintva nem kerül még egy logó ugyanoda.
    await page.click('.nbt-chip:has-text("Bal mell logó")');
    assert.deepEqual(await objectsOn(page, 'front'), ['image'], 'clicking the preset again selects the placed logo');
    // Húzás után a logó elenged: az egér további mozgatása nem viszi magával.
    const logoAt = () => page.evaluate(() => { const o = window.NBTeamDesigner.sides.front.canvas.getObjects().find(x => x.type === 'image'); return [Math.round(o.left), Math.round(o.top)]; });
    const centre = await page.evaluate(() => { const c = window.NBTeamDesigner.sides.front.canvas; const o = c.getObjects().find(x => x.type === 'image'); const p = o.getCenterPoint(); const r = c.upperCanvasEl.getBoundingClientRect(); const k = r.width / c.getWidth(); return { x: r.left + p.x * k, y: r.top + p.y * k }; });
    const before = await logoAt();
    await page.mouse.move(centre.x, centre.y); await page.mouse.down(); await page.mouse.move(centre.x - 25, centre.y + 15, { steps: 4 }); await page.mouse.up();
    const dropped = await logoAt();
    await page.mouse.move(centre.x + 60, centre.y + 60, { steps: 4 });
    assert.notDeepEqual(dropped, before, 'the logo was dragged');
    assert.deepEqual(await logoAt(), dropped, 'the logo is released on mouse up');

    // Saját kép a logótól függetlenül: középre kerül, a logó marad.
    const [imageChooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#nbt-upload-image')]);
    await imageChooser.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: logoPng });
    await page.waitForFunction(() => window.NBTeamDesigner.sides.front.canvas.getObjects().filter(o => o.type === 'image').length === 2);
    assert.equal(await page.locator('#nbt-logo-name').textContent(), 'logo.png', 'the own image does not replace the logo');
    await page.click('#nbt-delete');
    assert.deepEqual(await objectsOn(page, 'front'), ['image']);
    assert.match(await page.locator('.nbt-colors-note').textContent(), /további színeket is hozzáadhatsz/);

    // Hátoldali felirat a sablonnal: átvált hátra, szerkeszthető a mezőben.
    await page.click('.nbt-chip:has-text("Hát felső cégnév")');
    assert.equal(await page.locator('.nbt-sides [data-side="back"]').getAttribute('aria-selected'), 'true');
    assert.deepEqual(await objectsOn(page, 'back'), ['text']);
    // Kiürített felirat nem tűnik el: továbblépéskor visszakapja a mintaszöveget.
    await page.fill('#nbt-text-input', '');
    await page.locator('#nbt-text-input').blur();
    assert.equal(await page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getObjects().find(o => o.type === 'text').text), 'CÉGNÉV');
    await page.evaluate(() => { const c = window.NBTeamDesigner.sides.back.canvas; c.setActiveObject(c.getObjects().find(o => o.type === 'text')); c.fire('selection:created'); });
    // Munkaruhán a felirat legfeljebb 3 soros.
    assert.equal(await page.locator('#nbt-text-label').textContent(), 'Felirat (legfeljebb 3 sor)');
    await page.fill('#nbt-text-input', 'GIFT FOR ME KFT\nBudapest\nÜzem 2\nnegyedik sor');
    assert.equal(await page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getObjects().find(o => o.type === 'text').text), 'GIFT FOR ME KFT\nBudapest\nÜzem 2');
    assert.equal(await page.locator('#nbt-bind-number').isHidden(), true, 'workwear texts offer the name only');
    const backText = await page.evaluate(() => { const o = window.NBTeamDesigner.sides.back.canvas.getObjects().find(x => x.type === 'text'); return Math.round(o.getScaledWidth() * 300 / 190); });
    assert.ok(backText <= 261, 'longer text keeps its 26 cm preset width: ' + backText);

    // Elöl és hátul is van minta: kétoldalas, a sáv kétoldalas ára.
    await page.waitForTimeout(200);
    assert.equal(await text(page, 'nbt-sum-sides'), 'Kétoldalas(elölésháton)'.replace('háton', 'hátul'));
    assert.equal(await text(page, 'nbt-sum-unit'), '8490Ft');
    assert.equal(await page.locator('.nbt-bands__table th.is-active').textContent(), 'Kétoldalas');

    // Mennyiségek: zöld S5 M5, kék L3 XL2 = 15 db, 10% kedvezmény.
    const firstRow = page.locator('.nbt-row').first();
    assert.match(await firstRow.textContent(), /Zöld/);
    await firstRow.locator('input').nth(0).fill('5');
    await firstRow.locator('input').nth(1).fill('5');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#nbt-next-tier').textContent(), 'Még 1 db, és a darabár 7 190 Ft.', 'next band hint');
    await page.click('.nbt-add-color__btn[data-color="Kék"]');
    await page.waitForFunction(() => document.querySelectorAll('.nbt-row').length === 2);
    const secondRow = page.locator('.nbt-row').nth(1);
    await secondRow.locator('input').nth(2).fill('3');
    await secondRow.locator('input').nth(3).fill('2');
    await page.waitForTimeout(250);
    assert.equal(await text(page, 'nbt-sum-qty'), '15db');
    assert.equal(await page.locator('#nbt-error').isHidden(), true, 'check message disappears once everything is set');
    assert.equal(await text(page, 'nbt-sum-unit'), '7190Ft', 'second band, two-sided');
    assert.equal(await text(page, 'nbt-sum-size'), '+1000Ft(2db)', 'XL size surcharge on the two XL shirts');
    assert.equal(await text(page, 'nbt-sum-total'), (15 * 7190 + 2 * 500) + 'Ft', 'total = band unit price x quantity + size surcharge');
    assert.match(await page.locator('.nbt-row').first().locator('.nbt-size').nth(3).textContent(), /XL\+500 Ft/, 'the surcharge is shown at the size');
    assert.equal(await page.locator('.nbt-add-color__btn .nbt-dot').count(), 1, 'remaining colours are offered with a swatch');
    assert.equal(await page.locator('.nbt-bands__table tr.is-current td').first().textContent(), '11 db-tól');
    assert.equal(await page.locator('#nbt-next-tier').isHidden(), true);
    assert.equal(await page.locator('.nbt-row.is-preview').textContent().then(t => /Kék/.test(t)), true, 'new colour is previewed');

    // Kontrasztfigyelmeztetés fekete feliratnál fekete ruhán.
    await page.evaluate(() => { const o = window.NBTeamDesigner.sides.back.canvas.getObjects().find(x => x.type === 'text'); o.set('fill', '#111111'); });
    await page.click('.nbt-add-color__btn[data-color="Fekete"]');
    await page.locator('.nbt-row').nth(2).locator('input').nth(0).fill('1');
    await page.waitForTimeout(250);
    assert.match(await page.locator('#nbt-warnings').textContent(), /fekete színű ruhán alig fog látszani/);
    await page.locator('.nbt-row').nth(2).locator('.nbt-row__remove').click();
    await page.waitForTimeout(250);
    assert.equal(await text(page, 'nbt-sum-qty'), '15db');
    // A tapadó tervező oszlop kijelölt elemmel is kifér a képernyőre.
    await page.evaluate(() => { const c = window.NBTeamDesigner.sides.back.canvas; c.setActiveObject(c.getObjects().find(o => o.type === 'text')); c.fire('selection:created'); });
    await page.waitForTimeout(100);
    const stage = await page.locator('.nbt-stage').boundingBox();
    assert.ok(stage.height <= 1000 - 16, 'stage fits the viewport: ' + stage.height);
    const tileImg = await page.locator('.nbt-type__img').first().boundingBox();
    assert.ok(tileImg.height <= 56, 'compact product tile');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'tmp/ui-qa/team-desktop.png' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);
    const stuck = await page.locator('#nbt-canvas-frame').boundingBox();
    assert.ok(stuck.y >= 0 && stuck.y < 100, 'canvas stays in view while scrolling: ' + stuck.y);
    await page.screenshot({ path: 'tmp/ui-qa/team-desktop-scrolled.png' });

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

    // Csapatmez névsorral: név és szám mezenként, a vásznon a kiválasztott játékos látszik.
    await page.goto('http://nb.test/');
    await page.click('.nbt-mode-card[data-mode="sport"]');
    await page.click('.nbt-chip:has-text("Hát név")');
    assert.equal(await page.locator('#nbt-step-roster').isVisible(), true, 'a name in the design brings up the roster as step 3');
    assert.equal(await page.locator('#nbt-step-qty-num').textContent(), '4', 'quantities move to step 4');
    await page.click('.nbt-chip:has-text("Hát szám")');
    const backTexts = () => page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getObjects().filter(o => o.type === 'text').map(o => (o.visible === false || o.nbGhost) ? '' : o.text));
    const players = page.locator('.nbt-player');
    assert.equal(await players.count(), 1);
    await players.nth(0).locator('.nbt-player__name').fill('KOVÁCS');
    await players.nth(0).locator('.nbt-player__number').fill('10');
    await players.nth(0).locator('.nbt-player__size').selectOption('M');
    assert.deepEqual(await backTexts(), ['KOVÁCS', '10']);
    await page.click('#nbt-add-player');
    await players.nth(1).locator('.nbt-player__name').fill('NAGY');
    await players.nth(1).locator('.nbt-player__number').fill('7x');
    assert.equal(await players.nth(1).locator('.nbt-player__number').inputValue(), '7', 'numbers only');
    await players.nth(1).locator('.nbt-player__size').selectOption('L');
    assert.deepEqual(await backTexts(), ['NAGY', '7'], 'the active player is shown');
    await players.nth(1).locator('.nbt-player__number').press('Enter');
    assert.equal(await players.count(), 3, 'Enter in the number field adds the next player');
    assert.deepEqual(await backTexts(), ['', ''], 'a blank shirt shows no name or number');
    assert.deepEqual(await page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getObjects().filter(o => o.type === 'text').map(o => [o.text, o.opacity])), [['NÉV', 0.35], ['10', 0.35]], 'the sample text stays visible, faded, so it can still be clicked');
    // „Kaci 5” egyben: Enterre szétválik névre és számra, és jön a következő sor.
    await players.nth(2).locator('.nbt-player__name').fill('Kaci 5');
    await players.nth(2).locator('.nbt-player__name').press('Enter');
    assert.equal(await players.nth(2).locator('.nbt-player__name').inputValue(), 'Kaci');
    assert.equal(await players.nth(2).locator('.nbt-player__number').inputValue(), '5');
    assert.equal(await players.count(), 4, 'Enter after a combined entry adds the next player');
    await players.nth(3).locator('.nbt-player__remove').click();
    await players.nth(2).locator('.nbt-player__name').fill('');
    await players.nth(2).locator('.nbt-player__number').fill('10');
    await page.waitForTimeout(250);
    assert.match(await page.locator('#nbt-warnings').textContent(), /10-es szám többször szerepel: KOVÁCS, \(név nélkül\)/);
    await players.nth(2).locator('.nbt-player__number').fill('');
    await players.nth(0).locator('.nbt-player__name').click();
    assert.deepEqual(await backTexts(), ['KOVÁCS', '10']);
    await page.waitForTimeout(250);
    assert.equal(await text(page, 'nbt-sum-qty'), '3db');
    assert.match(await page.locator('#nbt-roster-sum').textContent(), /3 mez · Zöld – M: 1, L: 2/);
    const rq = await page.evaluate(() => { const q = window.NBTeamDesigner.computeQuote(); return { personal: q.personalQty, unit: q.unit, total: Math.round(q.total) }; });
    assert.equal(rq.personal, 2, 'the name/number surcharge applies to the two named shirts');
    assert.equal(rq.unit, 6990, 'back only: one-sided');
    assert.equal(rq.total, 6990 * 3 + 500 * 2);
    assert.equal(await text(page, 'nbt-sum-personal'), '+500Ft×2db');
    // Csapatmezen a felirat egysoros.
    await page.click('#nbt-add-text');
    await page.fill('#nbt-text-input', 'FC\nGIFT');
    assert.equal(await page.evaluate(() => window.NBTeamDesigner.sides.back.canvas.getActiveObject().text), 'FC GIFT');
    await page.click('#nbt-delete');
    // A 4. csempe a névsorból összesít színenként és méretenként.
    await page.waitForTimeout(250);
    assert.deepEqual(await page.locator('#nbt-qty-summary .nbt-size b').allTextContents(), ['0', '1', '2', '0']);
    assert.equal(await page.locator('#nbt-qty-grid').isHidden(), true, 'no separate quantity inputs next to the roster');
    // Kosárba: közös nyomat név nélkül + játékosonként név/szám fájl.
    orderStatus = 400; orderBody = null;
    await page.click('#nbt-cart');
    await page.waitForSelector('#nbt-error:not([hidden])');
    assert.deepEqual(orderBody.roster.map(r => [r.name, r.number, r.size, r.color]), [['KOVÁCS', '10', 'M', 'Zöld'], ['NAGY', '7', 'L', 'Zöld'], ['', '', 'L', 'Zöld']]);
    assert.ok(orderBody.roster[0].personal.back.startsWith('data:image/png') && orderBody.roster[1].personal.back.startsWith('data:image/png'));
    assert.deepEqual(orderBody.roster[2].personal, {}, 'no file for a blank shirt');
    const inkPixels = src => page.evaluate(url => new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = 300; c.height = Math.round(300 * i.height / i.width); const x = c.getContext('2d'); x.drawImage(i, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 10) n++; r(n); }; i.src = url; }), src);
    assert.equal(await inkPixels(orderBody.print.back), 0, 'the shared back print leaves out the names and numbers');
    assert.ok(await inkPixels(orderBody.roster[0].personal.back) > 200, 'the player file contains the name and number');
    assert.deepEqual(await backTexts(), ['KOVÁCS', '10'], 'the canvas returns to the active player');

    // Piszkozat visszaállítása újratöltés után, a névsorral együtt.
    await page.waitForTimeout(1200);
    await page.reload();
    await page.waitForSelector('#nbt-draft:not([hidden])');
    await page.click('#nbt-draft-restore');
    await page.waitForFunction(() => window.NBTeamDesigner.sides.back.canvas.getObjects().some(o => o.type === 'text'));
    assert.equal(await text(page, 'nbt-sum-qty'), '3db');
    assert.equal(await page.locator('#nbt-mode-label').textContent(), 'Csapatmez');
    assert.equal(await players.nth(1).locator('.nbt-player__name').inputValue(), 'NAGY');
    assert.deepEqual(await backTexts(), ['KOVÁCS', '10']);
    await page.click('.nbt-sides [data-side="front"]');
    await players.nth(1).locator('.nbt-player__name').click();
    assert.equal(await page.locator('.nbt-sides [data-side="back"]').getAttribute('aria-selected'), 'true', 'choosing a player shows the side with the name');
    assert.deepEqual(await backTexts(), ['NAGY', '7']);
    await page.screenshot({ path: 'tmp/ui-qa/team-roster-desktop.png' });

    // Mobil: nincs vízszintes görgetés, alsó sáv látszik, a méretmezők elég nagyok.
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 0, 'no horizontal scroll at ' + width + ': ' + overflow);
      assert.equal(await page.locator('#nbt-bar').isVisible(), true);
      const nameBox = await page.locator('.nbt-player__name').first().boundingBox();
      assert.ok(nameBox.height >= 42 && nameBox.width >= 160, 'roster name field is usable on phones: ' + JSON.stringify(nameBox));
      await page.screenshot({ path: 'tmp/ui-qa/team-roster-mobile-' + width + '.png', fullPage: true });
      const inputBox = await page.locator('#nbt-qty-summary .nbt-size b').first().boundingBox();
      assert.ok(inputBox.height >= 44, 'size cells keep their size');
      const mobileTile = await page.locator('.nbt-type__img').first().boundingBox();
      assert.ok(mobileTile.height <= 56, 'compact product tile on phones');
      const canvasBox = await page.locator('#nbt-canvas-frame').boundingBox();
      assert.ok(canvasBox.width <= width - 32 + 1, 'canvas fits gutters');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'tmp/ui-qa/team-mobile-' + width + '.png', fullPage: true });
    }

    // Munkaruha névsor: csak név, szám nélkül.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.click('#nbt-change-mode');
    await page.click('.nbt-mode-card[data-mode="work"]');
    assert.equal(await page.locator('#nbt-step-roster').isVisible(), true);
    assert.equal(await page.locator('.nbt-player__number').count(), 0, 'no number field for workwear');
    assert.equal(await page.locator('#nbt-add-player').textContent(), '+ Név');
    assert.equal(await page.locator('.nbt-player__name').first().getAttribute('placeholder'), '1. név');
    // Jobb mell felirat (névsorból) egy még üres névsorsornál: halvány mintaszöveg, rákattintva kijelölhető.
    await page.click('#nbt-add-player');
    await page.click('.nbt-chip:has-text("Jobb mell felirat")');
    const ghost = await page.evaluate(() => { const o = window.NBTeamDesigner.sides.front.canvas.getObjects().find(x => x.nbBind === 'name'); return { text: o.text, opacity: o.opacity }; });
    assert.deepEqual(ghost, { text: 'Név / beosztás', opacity: 0.35 });
    await page.evaluate(() => window.NBTeamDesigner.sides.front.canvas.discardActiveObject().requestRenderAll());
    const ghostAt = await page.evaluate(() => { const c = window.NBTeamDesigner.sides.front.canvas; const o = c.getObjects().find(x => x.nbBind === 'name'); const p = o.getCenterPoint(); const r = c.upperCanvasEl.getBoundingClientRect(); const k = r.width / c.getWidth(); return { x: r.left + p.x * k, y: r.top + p.y * k }; });
    await page.mouse.click(ghostAt.x, ghostAt.y);
    assert.equal(await page.evaluate(() => (window.NBTeamDesigner.sides.front.canvas.getActiveObject() || {}).nbBind), 'name', 'the faded sample text can be clicked');
    assert.match(await page.locator('#nbt-bind-current').textContent(), /üres/);
    await page.screenshot({ path: 'tmp/ui-qa/team-work-roster.png' });
    // Ha a névmezők kikerülnek a tervből, a névsor eltűnik, és a darabszámok szerkeszthetők maradnak.
    await page.evaluate(() => ['front', 'back'].forEach(side => { const c = window.NBTeamDesigner.sides[side].canvas; c.discardActiveObject(); c.getObjects().filter(o => o.nbBind).forEach(o => c.remove(o)); }));
    await page.click('#nbt-add-text');
    await page.click('#nbt-delete');
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#nbt-step-roster').isHidden(), true);
    assert.equal(await page.locator('#nbt-step-qty-num').textContent(), '3');
    assert.deepEqual(await page.locator('.nbt-row').first().locator('input').evaluateAll(els => els.map(e => e.value)), ['', '1', '3', ''], 'roster counts carry over to the quantity grid');

    assert.deepEqual(errors, [], 'no page errors');
    console.log('team designer smoke test passed');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
