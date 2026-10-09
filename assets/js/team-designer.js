/* Csapat- és munkaruha-tervező (külön modul, az eredeti tervezőtől független). */
(function () {
  'use strict';

  const D = window.NB_TEAM || {};
  const app = document.getElementById('nbt-app');
  if (!app || typeof fabric === 'undefined') return;

  const catalog = D.catalog || {};
  const mockups = D.mockups || {};
  const team = D.team || {};
  const presets = Array.isArray(team.presets) ? team.presets : [];
  const minQty = Math.max(1, parseInt(team.min_qty, 10) || 1);
  const maxColors = Math.max(1, parseInt(team.max_colors, 10) || 8);
  const personalFee = Math.max(0, Number(team.personal_fee) || 0);
  const maxPlayers = Math.max(1, parseInt(team.max_players, 10) || 100);
  // Az elemek saját tulajdonságai, amelyeket mentéskor és másoláskor is meg kell tartani.
  const OBJECT_PROPS = ['nbKind', 'nbMaxW', 'nbBaseScale', 'nbBind', 'nbPlaceholder', 'nbPreset'];
  const DRAFT_KEY = 'nb_team_draft_v1';
  const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
  const PRINT_MAX_BYTES = 24 * 1024 * 1024;

  const $ = id => document.getElementById(id);
  const el = {
    mode: $('nbt-mode'), work: $('nbt-work'), modeLabel: $('nbt-mode-label'),
    types: $('nbt-types'), colors: $('nbt-colors'), colorName: $('nbt-color-name'),
    presets: $('nbt-presets'), upload: $('nbt-upload'), file: $('nbt-file'), logoName: $('nbt-logo-name'),
    uploadImage: $('nbt-upload-image'), imageFile: $('nbt-image-file'),
    addText: $('nbt-add-text'), rows: $('nbt-rows'), addColor: $('nbt-add-color'), addColorWrap: $('nbt-add-color-wrap'),
    frame: $('nbt-canvas-frame'), empty: $('nbt-canvas-empty'),
    selection: $('nbt-selection'), textInput: $('nbt-text-input'), font: $('nbt-font'), textColor: $('nbt-text-color'),
    sizeReadout: $('nbt-size-readout'), center: $('nbt-center'), duplicate: $('nbt-duplicate'), del: $('nbt-delete'),
    warnings: $('nbt-warnings'),
    sumQty: $('nbt-sum-qty'), sumSides: $('nbt-sum-sides'), sumPersonalRow: $('nbt-sum-personal-row'), sumPersonal: $('nbt-sum-personal'),
    sumUnit: $('nbt-sum-unit'), sumTotal: $('nbt-sum-total'), bands: $('nbt-bands'), nextTier: $('nbt-next-tier'),
    stepRoster: $('nbt-step-roster'), stepQtyNum: $('nbt-step-qty-num'), qtySummary: $('nbt-qty-summary'), sumSizeRow: $('nbt-sum-size-row'), sumSize: $('nbt-sum-size'), rosterHelp: $('nbt-roster-help'), textLabel: $('nbt-text-label'), bindNumber: $('nbt-bind-number'),
    error: $('nbt-error'), cart: $('nbt-cart'), barQty: $('nbt-bar-qty'), barTotal: $('nbt-bar-total'), barCart: $('nbt-bar-cart'),
    busy: $('nbt-busy'), busyText: $('nbt-busy-text'), toast: $('nbt-toast'),
    draft: $('nbt-draft'), draftRestore: $('nbt-draft-restore'), draftDiscard: $('nbt-draft-discard'),
    bind: $('nbt-bind'), textField: $('nbt-text-field'), bindHint: $('nbt-bind-hint'), bindCurrent: $('nbt-bind-current'),
    qtyGrid: $('nbt-qty-grid'), qtyRoster: $('nbt-qty-roster'), roster: $('nbt-roster'), addPlayer: $('nbt-add-player'), rosterSum: $('nbt-roster-sum')
  };

  const FONTS = [
    { label: 'Montserrat', family: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&display=swap' },
    { label: 'Oswald', family: 'Oswald', url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap' },
    { label: 'Anton', family: 'Anton', url: 'https://fonts.googleapis.com/css2?family=Anton&display=swap' },
    { label: 'Bebas Neue', family: 'Bebas Neue', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap' },
    { label: 'Roboto', family: 'Roboto', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap' },
    { label: 'Archivo Black', family: 'Archivo Black', url: 'https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap' },
    { label: 'Playfair Display', family: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap' },
    { label: 'Arial', family: 'Arial', url: '' }
  ];
  (Array.isArray(D.fonts) ? D.fonts : []).forEach(entry => {
    const parts = String(entry).split('|').map(p => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const font = parts.length === 1 ? { label: parts[0], family: parts[0], url: '' }
      : parts.length === 2 ? { label: parts[0], family: parts[0], url: parts[1] }
        : { label: parts[0], family: parts[1], url: parts[2] };
    if (!FONTS.some(f => f.family === font.family)) FONTS.push(font);
  });
  const TEXT_FONT = 'Montserrat';
  const NUMBER_FONT = 'Oswald';

  const HU_COLORS = {
    'fekete': '#1c1c1c', 'fehér': '#ffffff', 'natúr': '#efe6d2', 'krém': '#f3ead6', 'ekrü': '#efe6d2',
    'piros': '#d32f2f', 'vörös': '#c62828', 'bordó': '#7b1f2b', 'meggy': '#8e1b32',
    'kék': '#1e5bd8', 'királykék': '#1f4fbf', 'sötétkék': '#1b2a4a', 'tengerészkék': '#1b2a4a', 'navy': '#1b2a4a',
    'világoskék': '#8ec5ff', 'égkék': '#8ec5ff', 'babakék': '#bcdcff', 'türkiz': '#1fb5b0', 'petrol': '#1d5c63',
    'zöld': '#2e7d32', 'sötétzöld': '#1b4d2b', 'világoszöld': '#8bd17c', 'fűzöld': '#4caf50', 'menta': '#a8e6cf',
    'khaki': '#8a8456', 'keki': '#8a8456', 'oliva': '#6b6b2f', 'olíva': '#6b6b2f',
    'sárga': '#f6d32d', 'mustár': '#d4a017', 'narancs': '#f57c00', 'narancssárga': '#f57c00', 'barack': '#ffcba4', 'korall': '#ff7f6e',
    'lila': '#7b3fa6', 'padlizsán': '#4b2a4f', 'levendula': '#b9a3e3', 'rózsaszín': '#f48fb1', 'pink': '#ec407a', 'magenta': '#c2185b',
    'szürke': '#9e9e9e', 'világosszürke': '#d0d0d0', 'sötétszürke': '#4a4a4a', 'melírszürke': '#b5b5b5', 'melír': '#b5b5b5',
    'antracit': '#3b3d40', 'grafit': '#41434a', 'ezüst': '#c0c0c0', 'arany': '#c9a227',
    'barna': '#6d4c41', 'csokoládé': '#4e342e', 'bézs': '#d8c3a5', 'homok': '#d9c7a3', 'teve': '#b38b59'
  };

  const norm = v => (v === undefined || v === null) ? '' : String(v).trim().toLowerCase();
  const colorLabel = c => String(c || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || String(c || '');

  function colorHex(name) {
    const meta = D.colorMeta && D.colorMeta[norm(String(name).replace(/\([^)]*\)/g, ''))];
    if (meta && /^#[0-9a-f]{6}$/i.test(meta.hex || '')) return meta.hex;
    const hex = String(name).match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (hex) return '#' + hex[1];
    const cleaned = norm(String(name).replace(/\([^)]*\)/g, ''));
    if (HU_COLORS[cleaned]) return HU_COLORS[cleaned];
    const compact = cleaned.replace(/[\s_-]+/g, '');
    if (HU_COLORS[compact]) return HU_COLORS[compact];
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', cleaned)) {
      const probe = document.createElement('span');
      probe.style.color = cleaned;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      const m = rgb.match(/\d+/g);
      if (m) return '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('');
    }
    return '';
  }

  function luminance(hex) {
    const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex || '');
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const ch = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    if (la === null || lb === null) return 21;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function formatPrice(amount) {
    if (!Number.isFinite(amount)) return '–';
    const r = Math.round(amount);
    return (r < 0 ? '-' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft';
  }
  const cm = mm => (Math.round(mm) / 10).toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  /* ---------------------------------------------------------------------- */
  /* Katalógus                                                               */
  /* ---------------------------------------------------------------------- */

  function productOptions() {
    const list = [];
    Object.keys(catalog).forEach(pid => {
      const p = catalog[pid];
      const types = Array.isArray(p.types) && p.types.length ? p.types : [''];
      types.forEach(type => {
        const typeKey = norm(type);
        const colors = colorsFor(p, typeKey);
        if (!colors.length) return;
        const mk = mockupFor(p, typeKey, colors[0], 'front');
        list.push({ key: pid + '|' + typeKey, pid: String(pid), type, typeKey, label: type || p.title, sub: type ? p.title : '', image: mk ? mk.image_url : '' });
      });
    });
    return list;
  }

  function colorsFor(product, typeKey) {
    const byType = product.colors_by_type && Array.isArray(product.colors_by_type[typeKey]) ? product.colors_by_type[typeKey] : null;
    const list = byType || product.colors || [];
    return list.filter(c => product.map && product.map[typeKey + '|' + norm(c)]);
  }

  function mockupFor(product, typeKey, color, side) {
    const entry = product && product.map ? product.map[typeKey + '|' + norm(color)] : null;
    if (!entry) return null;
    const id = side === 'back' ? (entry.back || entry.front) : entry.front;
    return mockups[id] || null;
  }

  function areaFor(mk, side) {
    const areas = mk && Array.isArray(mk.areas) ? mk.areas : [];
    const area = areas.find(a => a && a.role === side) || areas[0] || {};
    return {
      x: Number(area.x) || 50, y: Number(area.y) || 50, w: Math.max(1, Number(area.w) || 200), h: Math.max(1, Number(area.h) || 300),
      canvasW: Math.max(1, Number(area.canvas_w) || Number(mk && mk.canvas_w) || 420),
      canvasH: Math.max(1, Number(area.canvas_h) || Number(mk && mk.canvas_h) || 560),
      widthMm: Number(area.width_mm) > 0 ? Number(area.width_mm) : 300,
      heightMm: Number(area.height_mm) > 0 ? Number(area.height_mm) : 400,
      dpi: Number(area.dpi) > 0 ? Number(area.dpi) : 300
    };
  }

  function sizesFor(product) {
    const sizes = product && Array.isArray(product.sizes) ? product.sizes.map(s => String(s).trim()).filter(Boolean) : [];
    return sizes.length ? sizes : [''];
  }

  /** A termék (típus) ársávjai: [{min, max, single, double}] – a darabár a nyomtatással együtt. */
  function bandsFor() {
    const p = product();
    const map = p && p.bands_by_type && typeof p.bands_by_type === 'object' ? p.bands_by_type : null;
    if (!map) return [];
    const list = map[state.option.typeKey] || map[''] || Object.values(map)[0];
    return Array.isArray(list) ? list.map(b => ({ min: parseInt(b.min, 10) || 1, max: parseInt(b.max, 10) || 0, single: Number(b.single) || 0, double: Number(b.double) || 0 })) : [];
  }

  /** A darabszámhoz tartozó sáv: a legnagyobb, amelynek alsó határát elérte (ugyanígy számol a szerver). */
  function bandIndexFor(bands, qty) {
    let found = bands.length ? 0 : -1;
    bands.forEach((b, i) => { if (qty >= b.min) found = i; });
    return found;
  }

  /* ---------------------------------------------------------------------- */
  /* Állapot                                                                 */
  /* ---------------------------------------------------------------------- */

  const state = {
    mode: 'work',
    option: null,      // kiválasztott termék + típus
    color: '',         // előnézeti szín
    rows: [],          // [{ color, qty: { size: n } }]
    qtyMode: 'grid',   // 'grid' = darabszám, 'roster' = névsor
    roster: [],        // [{ name, number, size, color }]
    activePlayer: -1,  // a vásznon látszó játékos
    side: 'front',
    logo: null,        // { src, name }
    pendingPreset: null,
    busy: false
  };

  const sides = {};
  ['front', 'back'].forEach(side => {
    const canvas = new fabric.Canvas('nbt-canvas-' + side, { preserveObjectStacking: true, selection: false, backgroundColor: '#ffffff' });
    sides[side] = { canvas, area: null, areaRect: null, token: null, wrap: app.querySelector('.nbt-canvas[data-side="' + side + '"]') };
    // A vászon eseményeiben futó saját kód hibája nem akaszthatja meg a húzást
    // (különben a kijelölt elem az egérhez ragad); a frissítés a húzás lezárása után fut.
    const safe = fn => e => { try { fn(e); } catch (err) { if (window.console) console.error(err); } };
    canvas.on('object:moving', safe(e => keepInside(e.target, side)));
    canvas.on('object:scaling', safe(e => keepInside(e.target, side)));
    canvas.on('object:modified', safe(e => {
      const o = e.target;
      if (o && o.type === 'text' && o.nbMaxW) o.set({ nbBaseScale: o.scaleX, nbMaxW: o.getScaledWidth() });
      setTimeout(() => { syncSelection(); refresh(); }, 0);
    }));
    canvas.on('selection:created', safe(syncSelection));
    canvas.on('selection:updated', safe(syncSelection));
    canvas.on('selection:cleared', safe(syncSelection));
  });

  fabric.Object.prototype.set({
    transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#1f6feb', borderColor: '#1f6feb',
    cornerStyle: 'circle', cornerSize: 14, touchCornerSize: 28, padding: 4
  });

  const activeCanvas = () => sides[state.side].canvas;
  const designObjects = side => sides[side].canvas.getObjects().filter(o => !o.nbArea);
  const product = () => state.option ? catalog[state.option.pid] : null;
  const isSport = () => state.mode === 'sport';
  // Munkaruhán a felirat legfeljebb 3 soros lehet (pl. cégnév), csapatmezen egysoros.
  const maxTextLines = () => isSport() ? 1 : 3;

  /* ---------------------------------------------------------------------- */
  /* Vászon                                                                  */
  /* ---------------------------------------------------------------------- */

  function fitCanvasCss() {
    const frameWidth = el.frame.clientWidth || 360;
    // Asztali gépen a vászon a mellette lévő szerkesztővel együtt elfér a képernyőn, így görgetés közben is teljesen látszik.
    const desktop = window.innerWidth >= 960;
    const maxHeight = desktop
      ? Math.max(340, Math.min(window.innerHeight - 340, 820))
      : Math.max(280, Math.min(window.innerHeight * 0.58, 640));
    ['front', 'back'].forEach(side => {
      const c = sides[side].canvas;
      const scale = Math.min(frameWidth / c.getWidth(), maxHeight / c.getHeight());
      c.setDimensions({ width: Math.floor(c.getWidth() * scale) + 'px', height: Math.floor(c.getHeight() * scale) + 'px' }, { cssOnly: true });
      if (c.wrapperEl) {
        c.wrapperEl.style.width = Math.floor(c.getWidth() * scale) + 'px';
        c.wrapperEl.style.height = Math.floor(c.getHeight() * scale) + 'px';
      }
      c.calcOffset();
    });
  }

  function loadImage(url) {
    return new Promise(resolve => {
      if (!url) { resolve(null); return; }
      fabric.Image.fromURL(url, img => resolve(img && img.width ? img : null), { crossOrigin: 'anonymous' });
    });
  }

  /** A szín mockupját állítja be mindkét oldalon; ha a nyomtatási felület változik, az elemek a fizikai méretüket megtartva követik. */
  async function applyMockups(color) {
    const p = product();
    if (!p) return;
    await Promise.all(['front', 'back'].map(async side => {
      const s = sides[side];
      const mk = mockupFor(p, state.option.typeKey, color, side);
      const area = areaFor(mk, side);
      const c = s.canvas;
      const prev = s.area;
      if (c.getWidth() !== area.canvasW || c.getHeight() !== area.canvasH) {
        c.setDimensions({ width: area.canvasW, height: area.canvasH }, { backstoreOnly: true });
      }
      if (prev && (prev.x !== area.x || prev.y !== area.y || prev.w !== area.w || prev.h !== area.h || prev.widthMm !== area.widthMm)) {
        const sx = (area.w / area.widthMm) / (prev.w / prev.widthMm);
        const sy = (area.h / area.heightMm) / (prev.h / prev.heightMm);
        designObjects(side).forEach(o => {
          const relX = ((o.left - prev.x) / prev.w) * prev.widthMm;
          const relY = ((o.top - prev.y) / prev.h) * prev.heightMm;
          o.set({
            left: area.x + relX * area.w / area.widthMm,
            top: area.y + relY * area.h / area.heightMm,
            scaleX: o.scaleX * sx, scaleY: o.scaleY * sy
          });
          o.setCoords();
        });
      }
      s.area = area;
      if (s.areaRect) c.remove(s.areaRect);
      s.areaRect = new fabric.Rect({
        left: area.x, top: area.y, width: area.w, height: area.h, fill: 'rgba(31,111,235,0.04)',
        stroke: 'rgba(31,111,235,0.55)', strokeWidth: 1.5, strokeDashArray: [8, 6], selectable: false, evented: false, excludeFromExport: true
      });
      s.areaRect.nbArea = true;
      c.add(s.areaRect);
      c.sendToBack(s.areaRect);
      const token = Symbol('bg');
      s.token = token;
      const img = await loadImage(mk ? mk.image_url : '');
      if (s.token !== token) return;
      if (img) {
        const scale = Math.min(c.getWidth() / img.width, c.getHeight() / img.height) || 1;
        img.set({ left: 0, top: 0, originX: 'left', originY: 'top', scaleX: scale, scaleY: scale, selectable: false, evented: false });
        c.setBackgroundImage(img, c.renderAll.bind(c));
      } else {
        c.setBackgroundImage(null, c.renderAll.bind(c));
      }
    }));
    fitCanvasCss();
    designObjects('front').concat(designObjects('back')).forEach(o => o.setCoords());
    ['front', 'back'].forEach(side => sides[side].canvas.requestRenderAll());
  }

  function keepInside(obj, side) {
    const area = sides[side].area;
    if (!obj || !area) return;
    obj.setCoords();
    let box = obj.getBoundingRect(true, true);
    if (box.width > area.w + 0.5 || box.height > area.h + 0.5) {
      const f = Math.min(area.w / box.width, area.h / box.height);
      obj.set({ scaleX: obj.scaleX * f, scaleY: obj.scaleY * f });
      obj.setCoords();
      box = obj.getBoundingRect(true, true);
    }
    let dx = 0, dy = 0;
    if (box.left < area.x) dx = area.x - box.left;
    else if (box.left + box.width > area.x + area.w) dx = area.x + area.w - box.left - box.width;
    if (box.top < area.y) dy = area.y - box.top;
    else if (box.top + box.height > area.y + area.h) dy = area.y + area.h - box.top - box.height;
    if (dx || dy) {
      obj.set({ left: obj.left + dx, top: obj.top + dy });
      obj.setCoords();
    }
  }

  /** Elemek mm-ben, a nyomtatási felület bal felső sarkához képest – ebből számol az ár. */
  function measureElements() {
    const list = [];
    ['front', 'back'].forEach(side => {
      const area = sides[side].area;
      if (!area) return;
      designObjects(side).forEach(o => {
        if (o.type !== 'image' && !(o.text || '').trim()) return;
        o.setCoords();
        const b = o.getBoundingRect(true, true);
        const x1 = Math.max(area.x, b.left), y1 = Math.max(area.y, b.top);
        const x2 = Math.min(area.x + area.w, b.left + b.width), y2 = Math.min(area.y + area.h, b.top + b.height);
        if (x2 <= x1 || y2 <= y1) return;
        const kx = area.widthMm / area.w, ky = area.heightMm / area.h;
        list.push({ side, x_mm: (x1 - area.x) * kx, y_mm: (y1 - area.y) * ky, w_mm: (x2 - x1) * kx, h_mm: (y2 - y1) * ky, obj: o });
      });
    });
    return list;
  }

  /** Ugyanaz a csoportosítás, mint a szerveren: közeli elemek = egy nyomat. */
  function presetBox(preset, side) {
    const area = sides[side].area;
    const kx = area.w / area.widthMm, ky = area.h / area.heightMm;
    const w = Math.min(preset.w_mm, area.widthMm) * kx;
    const h = Math.min(preset.h_mm, area.heightMm) * ky;
    let left = area.x + preset.cx * area.w - w / 2;
    let top = area.y + preset.top * area.h;
    left = Math.min(Math.max(left, area.x), area.x + area.w - w);
    top = Math.min(Math.max(top, area.y), area.y + area.h - h);
    return { left, top, w, h };
  }

  function fitIntoBox(obj, box) {
    const w = obj.width || 1, h = obj.height || 1;
    const scale = Math.min(box.w / w, box.h / h);
    obj.set({ scaleX: scale, scaleY: scale, originX: 'left', originY: 'top' });
    obj.set({ left: box.left + (box.w - w * scale) / 2, top: box.top });
    obj.setCoords();
  }

  function defaultTextColor() {
    const lum = luminance(colorHex(state.color));
    return lum !== null && lum < 0.35 ? '#ffffff' : '#111111';
  }

  const loadedFonts = new Set();
  function ensureFont(family) {
    const font = FONTS.find(f => f.family === family);
    if (!font || !font.url || loadedFonts.has(font.url)) return Promise.resolve();
    loadedFonts.add(font.url);
    if (/\.(woff2?|ttf|otf)$/i.test(font.url) && typeof FontFace !== 'undefined') {
      const face = new FontFace(font.family, 'url(' + font.url + ')');
      return face.load().then(f => { document.fonts.add(f); }).catch(() => { });
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.url;
    document.head.appendChild(link);
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return new Promise(resolve => {
      link.onload = () => document.fonts.load('700 40px "' + family + '"').then(resolve, resolve);
      link.onerror = resolve;
    });
  }

  function refitTextAfterFont(obj, side) {
    ensureFont(obj.fontFamily).then(() => {
      if (!obj.canvas) return;
      obj.initDimensions && obj.initDimensions();
      fitTextWidth(obj);
      keepInside(obj, side);
      obj.canvas.requestRenderAll();
      refresh();
    });
  }

  /** Átíráskor a felirat magassága marad, de nem nő szélesebbre, mint a helye (a sablon vagy a kézi méretezés). */
  function fitTextWidth(obj) {
    if (!obj.nbMaxW || !obj.nbBaseScale) { obj.setCoords(); return; }
    const scale = Math.min(obj.nbBaseScale, obj.nbMaxW / Math.max(1, obj.width));
    obj.set({ scaleX: scale, scaleY: scale });
    obj.setCoords();
  }

  async function addLogo(box, side) {
    if (!state.logo) return null;
    const img = await loadImage(state.logo.src);
    if (!img) { toast('A képet nem sikerült betölteni.'); return null; }
    img.set({ nbKind: 'logo' });
    fitIntoBox(img, box);
    sides[side].canvas.add(img);
    return img;
  }

  function addText(text, box, side, kind, bind) {
    const obj = new fabric.Text(text, {
      fontFamily: kind === 'number' ? NUMBER_FONT : TEXT_FONT,
      fontWeight: 700, fontSize: 100, fill: defaultTextColor(), textAlign: 'center', nbKind: kind,
      nbBind: bind === 'name' || bind === 'number' ? bind : '', nbPlaceholder: text
    });
    fitIntoBox(obj, box);
    obj.set({ nbMaxW: box.w, nbBaseScale: obj.scaleX });
    sides[side].canvas.add(obj);
    refitTextAfterFont(obj, side);
    return obj;
  }

  async function applyPreset(preset) {
    if (!state.option) { toast('Előbb válassz terméket.'); return; }
    await setSide(preset.side);
    // Ugyanarra a helyre nem rakunk le még egyet: a már elhelyezett elemet jelöljük ki.
    const existing = designObjects(preset.side).find(o => o.nbPreset === preset.id);
    if (existing) {
      sides[preset.side].canvas.setActiveObject(existing).requestRenderAll();
      syncSelection();
      if (isText(existing) && !existing.nbBind) focusTextInput();
      return;
    }
    const box = presetBox(preset, preset.side);
    let obj;
    if (preset.kind === 'logo') {
      if (!state.logo) {
        state.pendingPreset = preset;
        el.file.click();
        return;
      }
      obj = await addLogo(box, preset.side);
    } else {
      obj = addText(preset.text || (preset.kind === 'number' ? '10' : 'FELIRAT'), box, preset.side, preset.kind, preset.bind);
    }
    if (!obj) return;
    obj.set({ nbPreset: preset.id });
    if (obj.nbBind) { syncQtyMode(); displayPlayer(); }
    sides[preset.side].canvas.setActiveObject(obj);
    sides[preset.side].canvas.requestRenderAll();
    syncSelection();
    refresh();
    if (preset.kind !== 'logo' && !obj.nbBind) focusTextInput();
  }

  /* ---------------------------------------------------------------------- */
  /* Játékosonként változó feliratok                                         */
  /* ---------------------------------------------------------------------- */

  const isText = o => !!o && (o.type === 'text' || o.type === 'i-text' || o.type === 'textbox');
  const boundObjects = side => designObjects(side).filter(o => isText(o) && o.nbBind);
  const hasBound = () => boundObjects('front').length + boundObjects('back').length > 0;
  const playerValue = (player, bind) => String((bind === 'number' ? player.number : player.name) || '').trim();
  const isPersonal = player => !!(String(player.name || '').trim() || String(player.number || '').trim());
  /** Kerül-e a játékos adatából valami a mezre (van hozzá kötött felirat és kitöltött adat). */
  const playerHasPrint = player => ['front', 'back'].some(side => boundObjects(side).some(o => playerValue(player, o.nbBind) !== ''));

  /**
   * A kötött felirat a játékos adatát mutatja; játékos nélkül a mintaszöveget. Ha a
   * kiválasztott sorban még nincs adat, a mintaszöveg halványan látszik (így kattintható),
   * de nyomdai fájlba és előnézetbe nem kerül (nbGhost).
   */
  function setBoundText(obj, player, side) {
    const value = player ? playerValue(player, obj.nbBind) : '';
    const ghost = !!player && value === '';
    const text = value || obj.nbPlaceholder || (obj.nbBind === 'number' ? '10' : 'NÉV');
    const centerX = obj.left + obj.getScaledWidth() / 2;
    obj.set({ text, visible: true, opacity: ghost ? 0.35 : 1, nbGhost: ghost });
    obj.initDimensions();
    fitTextWidth(obj);
    obj.set('left', centerX - obj.getScaledWidth() / 2);
    keepInside(obj, side);
  }

  function activePlayer() {
    return state.qtyMode === 'roster' ? (state.roster[state.activePlayer] || null) : null;
  }

  function displayPlayer(player) {
    const shown = player === undefined ? activePlayer() : player;
    ['front', 'back'].forEach(side => {
      boundObjects(side).forEach(o => setBoundText(o, shown, side));
      sides[side].canvas.requestRenderAll();
    });
    syncSelection();
  }

  function focusTextInput() {
    if (window.matchMedia('(pointer: fine)').matches) {
      el.textInput.focus();
      el.textInput.select();
    }
  }

  function fallbackBox(side, kind) {
    const fitting = presets.find(p => (p.mode === state.mode || p.mode === 'both') && p.side === side && (kind === 'logo' ? p.kind === 'logo' : p.kind !== 'logo'));
    if (fitting) return presetBox(fitting, side);
    const area = sides[side].area;
    return { left: area.x + area.w * 0.2, top: area.y + area.h * 0.1, w: area.w * 0.6, h: area.h * 0.25 };
  }

  async function setSide(side) {
    if (state.side === side) return;
    activeCanvas().discardActiveObject().requestRenderAll();
    state.side = side;
    ['front', 'back'].forEach(s => { sides[s].wrap.hidden = s !== side; });
    app.querySelectorAll('.nbt-sides [data-side]').forEach(b => b.setAttribute('aria-selected', b.dataset.side === side ? 'true' : 'false'));
    fitCanvasCss();
    syncSelection();
    updateEmptyHint();
  }

  function updateEmptyHint() {
    el.empty.hidden = designObjects(state.side).length > 0;
  }

  /* ---------------------------------------------------------------------- */
  /* Kijelölés                                                               */
  /* ---------------------------------------------------------------------- */

  function selected() { return activeCanvas().getActiveObject() || null; }

  function syncSelection() {
    const obj = selected();
    el.selection.hidden = !obj;
    if (!obj) { updateEmptyHint(); return; }
    const isText = obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox';
    el.selection.querySelectorAll('.nbt-selection__text').forEach(row => { row.hidden = !isText; });
    if (isText) {
      const bound = !!obj.nbBind;
      el.bindNumber.hidden = !isSport() && obj.nbBind !== 'number';
      el.bind.value = obj.nbBind || '';
      el.textInput.rows = maxTextLines();
      el.textLabel.textContent = isSport() ? 'Felirat' : 'Felirat (legfeljebb 3 sor)';
      el.textField.hidden = bound;
      el.bindHint.hidden = !bound;
      if (bound) el.bindCurrent.textContent = obj.nbGhost ? '(üres – ezen a darabon nem lesz felirat)' : (obj.text || '');
      if (document.activeElement !== el.textInput) el.textInput.value = bound ? (obj.nbPlaceholder || '') : (obj.text || '');
      el.font.value = obj.fontFamily;
      el.textColor.value = /^#[0-9a-f]{6}$/i.test(obj.fill) ? obj.fill : '#111111';
    }
    const b = obj.getBoundingRect(true, true);
    const area = sides[state.side].area;
    if (area) {
      el.sizeReadout.textContent = cm(b.width * area.widthMm / area.w) + ' × ' + cm(b.height * area.heightMm / area.h) + ' cm';
    }
    updateEmptyHint();
  }

  el.textInput.addEventListener('input', () => {
    const obj = selected();
    if (!obj || obj.type !== 'text') return;
    const oldWidth = obj.getScaledWidth();
    const centerX = obj.left + oldWidth / 2;
    const lines = el.textInput.value.split('\n');
    if (lines.length > maxTextLines()) {
      // Egysoros feliratnál a sortörés szóköz lesz, többsorosnál a 3. sor után levágjuk.
      el.textInput.value = maxTextLines() > 1 ? lines.slice(0, maxTextLines()).join('\n') : lines.join(' ').replace(/\s+/g, ' ');
    }
    obj.set('text', el.textInput.value || ' ');
    obj.initDimensions();
    fitTextWidth(obj);
    obj.set('left', centerX - obj.getScaledWidth() / 2);
    keepInside(obj, state.side);
    activeCanvas().requestRenderAll();
    syncSelection();
    scheduleRefresh();
  });

  el.bind.addEventListener('change', () => {
    const obj = selected();
    if (!isText(obj)) return;
    const bind = el.bind.value;
    if (bind) {
      if (!obj.nbBind) obj.set({ nbPlaceholder: obj.text });
      if (!obj.nbMaxW) obj.set({ nbMaxW: obj.getScaledWidth(), nbBaseScale: obj.scaleX });
      obj.set({ nbBind: bind });
    } else {
      obj.set({ nbBind: '', visible: true });
    }
    displayPlayer();
    refresh();
  });

  // Kiürített felirat ne tűnjön el a vászonról: visszakapja a mintaszöveget.
  el.textInput.addEventListener('blur', () => {
    const obj = selected();
    if (!isText(obj) || obj.nbBind || el.textInput.value.trim()) return;
    el.textInput.value = obj.nbPlaceholder || 'FELIRAT';
    el.textInput.dispatchEvent(new Event('input'));
  });

  el.textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && el.textInput.value.split('\n').length >= maxTextLines()) e.preventDefault();
  });

  el.font.addEventListener('change', () => {
    const obj = selected();
    if (!obj || obj.type !== 'text') return;
    obj.set('fontFamily', el.font.value);
    obj.initDimensions();
    fitTextWidth(obj);
    keepInside(obj, state.side);
    activeCanvas().requestRenderAll();
    refitTextAfterFont(obj, state.side);
    refresh();
  });

  el.textColor.addEventListener('input', () => {
    const obj = selected();
    if (!obj || obj.type !== 'text') return;
    obj.set('fill', el.textColor.value);
    activeCanvas().requestRenderAll();
    scheduleRefresh();
  });

  el.center.addEventListener('click', () => {
    const obj = selected();
    const area = sides[state.side].area;
    if (!obj || !area) return;
    const b = obj.getBoundingRect(true, true);
    obj.set('left', obj.left + (area.x + area.w / 2) - (b.left + b.width / 2));
    obj.setCoords();
    activeCanvas().requestRenderAll();
    refresh();
  });

  el.duplicate.addEventListener('click', () => {
    const obj = selected();
    if (!obj) return;
    obj.clone(copy => {
      copy.set({ left: obj.left + 15, top: obj.top + 15 });
      activeCanvas().add(copy);
      keepInside(copy, state.side);
      activeCanvas().setActiveObject(copy).requestRenderAll();
      syncSelection();
      refresh();
    }, OBJECT_PROPS);
  });

  function deleteSelected() {
    const obj = selected();
    if (!obj) return;
    activeCanvas().remove(obj);
    activeCanvas().discardActiveObject().requestRenderAll();
    syncSelection();
    refresh();
  }
  el.del.addEventListener('click', deleteSelected);
  document.addEventListener('keydown', e => {
    if (el.work.hidden || (e.key !== 'Delete' && e.key !== 'Backspace')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (!selected()) return;
    e.preventDefault();
    deleteSelected();
  });

  /* ---------------------------------------------------------------------- */
  /* Logó feltöltés                                                          */
  /* ---------------------------------------------------------------------- */

  el.upload.addEventListener('click', () => { state.pendingPreset = null; el.file.click(); });

  /** Saját kép (fotó, grafika): a logótól függetlenül, az aktuális oldal közepére kerül, utána szabadon mozgatható. */
  el.uploadImage.addEventListener('click', () => {
    if (!state.option) { toast('Előbb válassz terméket.'); return; }
    el.imageFile.click();
  });
  el.imageFile.addEventListener('change', () => {
    const file = el.imageFile.files && el.imageFile.files[0];
    el.imageFile.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { toast('PNG, JPG, WEBP vagy SVG képet tölts fel.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast('A kép legfeljebb 15 MB lehet.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await loadImage(reader.result);
      if (!img) { toast('A képet nem sikerült betölteni.'); return; }
      const area = sides[state.side].area;
      img.set({ nbKind: 'image' });
      fitIntoBox(img, { left: area.x + area.w * 0.15, top: area.y + area.h * 0.12, w: area.w * 0.7, h: area.h * 0.6 });
      activeCanvas().add(img);
      keepInside(img, state.side);
      activeCanvas().setActiveObject(img).requestRenderAll();
      syncSelection();
      refresh();
    };
    reader.readAsDataURL(file);
  });
  el.file.addEventListener('change', () => {
    const file = el.file.files && el.file.files[0];
    el.file.value = '';
    if (!file) { state.pendingPreset = null; return; }
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { toast('PNG, JPG, WEBP vagy SVG képet tölts fel.'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast('A kép legfeljebb 15 MB lehet.'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      state.logo = { src: reader.result, name: file.name };
      el.logoName.textContent = file.name;
      el.upload.textContent = 'Másik logó';
      if (!state.option) return;
      const preset = state.pendingPreset;
      state.pendingPreset = null;
      if (preset) { await applyPreset(preset); return; }
      const current = selected();
      if (current && current.type === 'image') {
        const box = { left: current.getBoundingRect(true, true).left, top: current.getBoundingRect(true, true).top, w: current.getScaledWidth(), h: current.getScaledHeight() };
        activeCanvas().remove(current);
        const img = await addLogo(box, state.side);
        if (img) activeCanvas().setActiveObject(img);
      } else {
        const img = await addLogo(fallbackBox(state.side, 'logo'), state.side);
        if (img) { keepInside(img, state.side); activeCanvas().setActiveObject(img); }
      }
      activeCanvas().requestRenderAll();
      syncSelection();
      refresh();
    };
    reader.readAsDataURL(file);
  });

  el.addText.addEventListener('click', () => {
    if (!state.option) { toast('Előbb válassz terméket.'); return; }
    const box = fallbackBox(state.side, 'text');
    const obj = addText('FELIRAT', { left: box.left, top: box.top, w: box.w, h: Math.min(box.h, sides[state.side].area.h * 0.12) }, state.side, 'text');
    keepInside(obj, state.side);
    activeCanvas().setActiveObject(obj).requestRenderAll();
    syncSelection();
    refresh();
    focusTextInput();
  });

  /* ---------------------------------------------------------------------- */
  /* Termék, szín, sablonok, mennyiség                                       */
  /* ---------------------------------------------------------------------- */

  function renderTypes() {
    const options = productOptions();
    el.types.innerHTML = '';
    if (!options.length) {
      el.types.innerHTML = '<p class="nbt-help">Jelenleg nincs rendelhető termék.</p>';
      return;
    }
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nbt-type';
      btn.setAttribute('aria-pressed', state.option && state.option.key === opt.key ? 'true' : 'false');
      btn.innerHTML = '<span class="nbt-type__img"></span><span class="nbt-type__text"><span class="nbt-type__label"></span><small></small></span>';
      if (opt.image) {
        const img = document.createElement('img');
        img.src = opt.image; img.alt = ''; img.loading = 'lazy';
        btn.querySelector('.nbt-type__img').appendChild(img);
      }
      btn.querySelector('.nbt-type__label').textContent = opt.label;
      btn.querySelector('small').textContent = opt.sub;
      btn.addEventListener('click', () => selectOption(opt));
      el.types.appendChild(btn);
    });
  }

  async function selectOption(opt, keepRows) {
    const p = catalog[opt.pid];
    const colors = colorsFor(p, opt.typeKey);
    state.option = opt;
    if (!keepRows) {
      const sizes = sizesFor(p);
      const kept = state.rows.filter(r => colors.some(c => norm(c) === norm(r.color)));
      state.rows = (kept.length ? kept : [{ color: colors[0], qty: {} }]).map(r => ({
        color: colors.find(c => norm(c) === norm(r.color)),
        qty: sizes.reduce((acc, s) => { if (r.qty[s]) acc[s] = r.qty[s]; return acc; }, {})
      }));
    }
    if (!colors.some(c => norm(c) === norm(state.color))) state.color = state.rows[0] ? state.rows[0].color : colors[0];
    const sizes = sizesFor(p);
    state.roster.forEach(player => {
      if (!sizes.includes(player.size)) player.size = sizes[0];
      const match = colors.find(c => norm(c) === norm(player.color));
      player.color = match || state.color;
    });
    renderTypes();
    renderColors();
    renderQtyMode();
    await applyMockups(state.color);
    refresh();
  }

  function renderColors() {
    const p = product();
    el.colors.innerHTML = '';
    if (!p) return;
    colorsFor(p, state.option.typeKey).forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nbt-swatch';
      btn.title = colorLabel(color);
      btn.setAttribute('aria-label', colorLabel(color));
      btn.setAttribute('aria-pressed', norm(color) === norm(state.color) ? 'true' : 'false');
      const hex = colorHex(color);
      if (hex) btn.style.setProperty('--swatch', hex);
      const meta = D.colorMeta && D.colorMeta[norm(color)];
      if (meta && meta.texture_url) btn.style.backgroundImage = 'url("' + String(meta.texture_url).replace(/["\\]/g, '\\$&') + '")';
      btn.addEventListener('click', () => previewColor(color, true));
      el.colors.appendChild(btn);
    });
    el.colorName.textContent = colorLabel(state.color);
  }

  /** Az alapszín választása: ha még csak egy üres sor van, az a sor is átszíneződik. */
  async function previewColor(color, fromSwatch) {
    if (fromSwatch && state.rows.length === 1 && rowTotal(state.rows[0]) === 0) state.rows[0].color = color;
    if (fromSwatch && state.qtyMode === 'roster' && state.roster.length === 1 && !isPersonal(state.roster[0])) {
      state.roster[0].color = color;
      renderRoster();
    }
    state.color = color;
    renderColors();
    if (state.qtyMode === 'grid') renderRows();
    await applyMockups(color);
    refresh();
  }

  function renderPresets() {
    el.presets.innerHTML = '';
    ['front', 'back'].forEach(side => {
      const list = presets.filter(p => p.side === side && (p.mode === state.mode || p.mode === 'both'));
      if (!list.length) return;
      const group = document.createElement('div');
      group.className = 'nbt-preset-group';
      const title = document.createElement('p');
      title.className = 'nbt-label';
      title.textContent = side === 'front' ? 'Elöl' : 'Hátul';
      group.appendChild(title);
      const wrap = document.createElement('div');
      wrap.className = 'nbt-chips';
      list.forEach(preset => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nbt-chip nbt-chip--' + preset.kind;
        btn.innerHTML = '<span></span><small></small>';
        btn.querySelector('span').textContent = preset.label;
        btn.querySelector('small').textContent = cm(preset.w_mm) + '×' + cm(preset.h_mm) + ' cm';
        btn.addEventListener('click', () => applyPreset(preset));
        wrap.appendChild(btn);
      });
      group.appendChild(wrap);
      el.presets.appendChild(group);
    });
  }

  const rowTotal = row => Object.keys(row.qty).reduce((sum, s) => sum + (parseInt(row.qty[s], 10) || 0), 0);
  const totalQty = () => state.qtyMode === 'roster' ? state.roster.length : state.rows.reduce((sum, r) => sum + rowTotal(r), 0);

  /** A rendelés sorai (szín, méret, darab, névvel/számmal), a választott módtól függetlenül. */
  function orderRows() {
    const p = product();
    if (!p) return [];
    const rows = [];
    const add = (color, size, qty, personal) => {
      const found = rows.find(r => norm(r.color) === norm(color) && r.size === size && r.personal === personal);
      if (found) found.qty += qty; else rows.push({ color, size, qty, personal });
    };
    if (state.qtyMode === 'roster') {
      state.roster.forEach(player => add(player.color, player.size, 1, playerHasPrint(player)));
    } else {
      state.rows.forEach(r => sizesFor(p).forEach(size => {
        const n = parseInt(r.qty[size], 10) || 0;
        if (n) add(r.color, size, n, false);
      }));
    }
    return rows;
  }

  function orderColors() {
    const colors = [];
    orderRows().forEach(r => { if (!colors.some(c => norm(c) === norm(r.color))) colors.push(r.color); });
    return colors;
  }

  /* Névsor ---------------------------------------------------------------- */

  function newPlayer() {
    const p = product();
    const last = state.roster[state.roster.length - 1];
    const sizes = sizesFor(p);
    return { name: '', number: '', size: last ? last.size : sizes[Math.min(2, sizes.length - 1)], color: last ? last.color : state.color };
  }

  function setQtyMode(mode) {
    if (mode === state.qtyMode) return;
    const p = product();
    if (mode === 'roster' && p) {
      if (!state.roster.length) {
        // A már megadott darabszámokból üres sorok lesznek, csak a neveket kell beírni.
        state.rows.forEach(r => sizesFor(p).forEach(size => {
          const n = parseInt(r.qty[size], 10) || 0;
          for (let i = 0; i < n && state.roster.length < maxPlayers; i++) state.roster.push({ name: '', number: '', size, color: r.color });
        }));
        if (!state.roster.length) state.roster.push(newPlayer());
      }
      state.activePlayer = 0;
    } else if (mode === 'grid' && p && state.roster.length) {
      const rows = [];
      state.roster.forEach(player => {
        let row = rows.find(r => norm(r.color) === norm(player.color));
        if (!row) rows.push(row = { color: player.color, qty: {} });
        row.qty[player.size] = (row.qty[player.size] || 0) + 1;
      });
      state.rows = rows;
      state.activePlayer = -1;
    }
    state.qtyMode = mode;
    renderQtyMode();
    displayPlayer();
    refresh();
  }

  /** Névsor akkor kell, ha a tervben van névsorból jövő felirat; ilyenkor a darabszám is abból adódik. */
  function syncQtyMode() {
    if (!state.option) return;
    const want = hasBound() ? 'roster' : 'grid';
    if (want !== state.qtyMode) setQtyMode(want);
  }

  function renderQtyMode() {
    const roster = state.qtyMode === 'roster';
    el.stepRoster.hidden = !roster;
    el.stepQtyNum.textContent = roster ? '4' : '3';
    el.qtyGrid.hidden = roster;
    el.qtyRoster.hidden = !roster;
    if (roster) { renderRoster(); renderQtySummary(); } else renderRows();
  }

  /** Névsornál a 4. csempe: színenként és méretenként hány darab jön ki a névsorból. */
  function renderQtySummary() {
    if (state.qtyMode !== 'roster') return;
    const p = product();
    el.qtySummary.innerHTML = '';
    if (!p) return;
    const sizes = sizesFor(p);
    orderColors().forEach(color => {
      const card = document.createElement('div');
      card.className = 'nbt-row is-summary';
      const head = document.createElement('div');
      head.className = 'nbt-row__head';
      const name = document.createElement('span');
      name.className = 'nbt-row__color';
      const dot = document.createElement('span');
      dot.className = 'nbt-dot';
      const hex = colorHex(color);
      if (hex) dot.style.setProperty('--swatch', hex);
      name.appendChild(dot);
      name.appendChild(document.createTextNode(colorLabel(color)));
      const players = state.roster.filter(pl => norm(pl.color) === norm(color));
      const total = document.createElement('span');
      total.className = 'nbt-row__total';
      total.textContent = players.length + ' db';
      head.appendChild(name);
      head.appendChild(total);
      card.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'nbt-sizes';
      sizes.forEach(size => {
        const cell = document.createElement('div');
        cell.className = 'nbt-size';
        const label = document.createElement('span');
        label.textContent = size || 'Darab';
        const value = document.createElement('b');
        const n = players.filter(pl => pl.size === size).length;
        value.textContent = String(n);
        value.className = n ? 'has-value' : '';
        cell.appendChild(label);
        cell.appendChild(value);
        grid.appendChild(cell);
      });
      card.appendChild(grid);
      el.qtySummary.appendChild(card);
    });
  }

  function setActivePlayer(index) {
    // A játékos kiválasztásakor azt az oldalt mutatjuk, ahol a neve vagy száma van.
    if (!boundObjects(state.side).length) {
      const other = state.side === 'front' ? 'back' : 'front';
      if (boundObjects(other).length) setSide(other);
    }
    if (index === state.activePlayer) return;
    state.activePlayer = index;
    el.roster.querySelectorAll('.nbt-player').forEach((row, i) => row.classList.toggle('is-active', i === index));
    const player = state.roster[index];
    if (player && norm(player.color) !== norm(state.color)) previewColor(player.color, false).then(() => displayPlayer());
    else displayPlayer();
  }

  function renderRoster() {
    const p = product();
    el.roster.innerHTML = '';
    if (!p) return;
    const sizes = sizesFor(p);
    const colors = colorsFor(p, state.option.typeKey);
    state.roster.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = 'nbt-player' + (index === state.activePlayer ? ' is-active' : '');
      row.addEventListener('focusin', () => setActivePlayer(index));
      row.addEventListener('click', () => setActivePlayer(index));
      const sport = isSport();
      if (!sport) row.classList.add('no-number');
      if (colors.length < 2) row.classList.add('no-color');
      const name = document.createElement('input');
      name.type = 'text'; name.className = 'nbt-player__name'; name.placeholder = (index + 1) + (sport ? '. játékos neve' : '. név'); name.maxLength = 30;
      name.autocomplete = 'off'; name.value = player.name;
      name.setAttribute('aria-label', (index + 1) + '. név');
      const number = document.createElement('input');
      number.type = 'text'; number.className = 'nbt-player__number'; number.placeholder = 'Szám'; number.maxLength = 3;
      number.inputMode = 'numeric'; number.autocomplete = 'off'; number.value = player.number;
      number.setAttribute('aria-label', (index + 1) + '. szám');
      name.addEventListener('input', () => { player.name = name.value; if (index === state.activePlayer) displayPlayer(); scheduleRefresh(); });
      number.addEventListener('input', () => {
        const clean = number.value.replace(/\D/g, '').slice(0, 3);
        if (clean !== number.value) number.value = clean;
        player.number = clean;
        if (index === state.activePlayer) displayPlayer();
        scheduleRefresh();
      });
      // „Kaci 5” egyben is beírható: a végén álló számot a szám mezőbe tesszük.
      const splitNameNumber = () => {
        if (!sport) return false;
        const m = name.value.match(/^(.*\S)\s+#?(\d{1,3})$/);
        if (!m || player.number) return false;
        name.value = player.name = m[1];
        number.value = player.number = m[2];
        if (index === state.activePlayer) displayPlayer();
        scheduleRefresh();
        return true;
      };
      name.addEventListener('blur', splitNameNumber);
      name.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (!splitNameNumber() && sport) { number.focus(); return; }
        const next = el.roster.querySelectorAll('.nbt-player__name')[index + 1];
        if (next) next.focus(); else addPlayer();
      });
      number.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const next = el.roster.querySelectorAll('.nbt-player__name')[index + 1];
        if (next) next.focus(); else addPlayer();
      });
      row.appendChild(name);
      if (sport) row.appendChild(number);
      if (sizes.length > 1 || sizes[0] !== '') {
        const size = document.createElement('select');
        size.className = 'nbt-player__size';
        size.setAttribute('aria-label', (index + 1) + '. méret');
        sizes.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = sizeLabel(s); size.appendChild(o); });
        size.value = player.size;
        size.addEventListener('change', () => { player.size = size.value; scheduleRefresh(); });
        row.appendChild(size);
      }
      if (colors.length > 1) {
        const color = document.createElement('select');
        color.className = 'nbt-player__color';
        color.setAttribute('aria-label', (index + 1) + '. szín');
        colors.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = colorLabel(c); color.appendChild(o); });
        color.value = colors.find(c => norm(c) === norm(player.color)) || colors[0];
        color.addEventListener('change', () => {
          player.color = color.value;
          if (index === state.activePlayer) previewColor(player.color, false).then(() => displayPlayer());
          scheduleRefresh();
        });
        row.appendChild(color);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'nbt-player__remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', (index + 1) + '. sor törlése');
      remove.disabled = state.roster.length < 2;
      remove.addEventListener('click', e => {
        e.stopPropagation();
        state.roster.splice(index, 1);
        state.activePlayer = Math.min(state.activePlayer, state.roster.length - 1);
        renderRoster();
        displayPlayer();
        refresh();
      });
      row.appendChild(remove);
      el.roster.appendChild(row);
    });
    el.addPlayer.hidden = state.roster.length >= maxPlayers;
    el.addPlayer.textContent = isSport() ? '+ Játékos' : '+ Név';
    renderRosterSum();
  }

  function addPlayer() {
    if (state.roster.length >= maxPlayers) { toast('Egy rendelésben legfeljebb ' + maxPlayers + ' sor lehet a névsorban.'); return; }
    state.roster.push(newPlayer());
    state.activePlayer = state.roster.length - 1;
    renderRoster();
    displayPlayer();
    refresh();
    const inputs = el.roster.querySelectorAll('.nbt-player__name');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function renderRosterSum() {
    if (state.qtyMode !== 'roster') return;
    const p = product();
    const parts = orderColors().map(color => {
      const sizes = sizesFor(p).map(size => {
        const n = state.roster.filter(pl => norm(pl.color) === norm(color) && pl.size === size).length;
        return n ? (size ? size + ': ' + n : n + ' db') : '';
      }).filter(Boolean).join(', ');
      return colorLabel(color) + ' – ' + sizes;
    });
    el.rosterSum.textContent = state.roster.length + (isSport() ? ' mez' : ' db') + (parts.length ? ' · ' + parts.join(' · ') : '');
  }

  function renderRows() {
    const p = product();
    el.rows.innerHTML = '';
    if (!p) return;
    const sizes = sizesFor(p);
    state.rows.forEach((row, index) => {
      const card = document.createElement('div');
      card.className = 'nbt-row' + (norm(row.color) === norm(state.color) ? ' is-preview' : '');
      const head = document.createElement('div');
      head.className = 'nbt-row__head';
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'nbt-row__color';
      name.title = 'Előnézet ebben a színben';
      const dot = document.createElement('span');
      dot.className = 'nbt-dot';
      const hex = colorHex(row.color);
      if (hex) dot.style.setProperty('--swatch', hex);
      name.appendChild(dot);
      name.appendChild(document.createTextNode(colorLabel(row.color)));
      name.addEventListener('click', () => previewColor(row.color, false));
      const total = document.createElement('span');
      total.className = 'nbt-row__total';
      total.textContent = rowTotal(row) + ' db';
      head.appendChild(name);
      head.appendChild(total);
      if (state.rows.length > 1) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'nbt-row__remove';
        remove.setAttribute('aria-label', colorLabel(row.color) + ' sor törlése');
        remove.textContent = '×';
        remove.addEventListener('click', () => {
          state.rows.splice(index, 1);
          if (!state.rows.some(r => norm(r.color) === norm(state.color))) previewColor(state.rows[0].color, false);
          else { renderRows(); refresh(); }
        });
        head.appendChild(remove);
      }
      card.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'nbt-sizes';
      sizes.forEach(size => {
        const label = document.createElement('label');
        label.className = 'nbt-size';
        const span = document.createElement('span');
        span.textContent = size || 'Darab';
        if (sizeFee(size) > 0) {
          const fee = document.createElement('small');
          fee.textContent = '+' + formatPrice(sizeFee(size));
          span.appendChild(fee);
        }
        const input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.max = '9999'; input.step = '1'; input.inputMode = 'numeric';
        input.placeholder = '0';
        input.value = row.qty[size] ? String(row.qty[size]) : '';
        input.setAttribute('aria-label', colorLabel(row.color) + ' ' + (size || '') + ' darabszám');
        input.addEventListener('input', () => {
          const n = Math.max(0, Math.min(9999, parseInt(input.value, 10) || 0));
          if (n) row.qty[size] = n; else delete row.qty[size];
          total.textContent = rowTotal(row) + ' db';
          input.classList.toggle('has-value', n > 0);
          scheduleRefresh();
        });
        input.classList.toggle('has-value', !!row.qty[size]);
        label.appendChild(span);
        label.appendChild(input);
        grid.appendChild(label);
      });
      card.appendChild(grid);
      el.rows.appendChild(card);
    });
    renderAddColor();
  }

  /** Újabb szín: gombok színmintával és névvel (a legördülő lista nem tud mintát mutatni). */
  function renderAddColor() {
    const p = product();
    const used = state.rows.map(r => norm(r.color));
    const free = p ? colorsFor(p, state.option.typeKey).filter(c => !used.includes(norm(c))) : [];
    el.addColorWrap.hidden = !free.length || state.rows.length >= maxColors;
    el.addColor.innerHTML = '';
    free.forEach(color => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nbt-add-color__btn';
      btn.dataset.color = color;
      const dot = document.createElement('span');
      dot.className = 'nbt-dot';
      const hex = colorHex(color);
      if (hex) dot.style.setProperty('--swatch', hex);
      btn.appendChild(dot);
      btn.appendChild(document.createTextNode(colorLabel(color)));
      btn.addEventListener('click', () => addColorRow(color));
      el.addColor.appendChild(btn);
    });
  }

  function addColorRow(color) {
    state.rows.push({ color, qty: {} });
    previewColor(color, false).then(() => {
      const inputs = el.rows.querySelectorAll('.nbt-row:last-child input');
      if (inputs[0] && window.matchMedia('(pointer: fine)').matches) inputs[0].focus();
    });
  }

  /* Méretfelár ------------------------------------------------------------ */

  function sizeFee(size) {
    const p = product();
    const map = p && p.size_fees_by_type && typeof p.size_fees_by_type === 'object' ? p.size_fees_by_type : null;
    const fees = map ? (map[state.option.typeKey] || map[''] || {}) : {};
    return Math.max(0, Number(fees[String(size).trim()]) || 0);
  }

  const sizeLabel = size => size ? (sizeFee(size) > 0 ? size + ' +' + formatPrice(sizeFee(size)) : size) : 'Darab';

  /* ---------------------------------------------------------------------- */
  /* Összesítő, figyelmeztetések                                             */
  /* ---------------------------------------------------------------------- */

  let refreshTimer = 0;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 120);
  }

  function computeQuote() {
    const elements = measureElements();
    const sides = Array.from(new Set(elements.map(e => e.side)));
    const double = sides.length > 1;
    const qty = totalQty();
    const bands = state.option ? bandsFor() : [];
    const bandIndex = bandIndexFor(bands, Math.max(1, qty));
    const band = bands[bandIndex] || null;
    const unit = band ? band.single + (double ? band.double : 0) : NaN;
    const rows = state.option ? orderRows() : [];
    const personalQty = rows.reduce((sum, r) => sum + (r.personal ? r.qty : 0), 0);
    const sizeFees = rows.reduce((sum, r) => sum + sizeFee(r.size) * r.qty, 0);
    const sizeFeeQty = rows.reduce((sum, r) => sum + (sizeFee(r.size) > 0 ? r.qty : 0), 0);
    const total = Number.isFinite(unit) ? unit * qty + personalFee * personalQty + sizeFees : NaN;
    return { elements, sides, double, qty, bands, bandIndex, unit, personalQty, sizeFees, sizeFeeQty, total };
  }

  function bandLabel(b) {
    return b.max ? (b.min === b.max ? b.min + ' db' : b.min + '–' + b.max + ' db') : b.min + ' db-tól';
  }

  /** Ársávok táblázata: egyoldalas és kétoldalas darabár, kiemelve az aktuális sáv és nyomtatás. */
  function renderBands(q) {
    el.bands.innerHTML = '';
    if (!q.bands.length) return;
    const table = document.createElement('table');
    table.className = 'nbt-bands__table';
    const head = document.createElement('tr');
    [['Mennyiség', ''], ['Egyoldalas', q.double ? '' : 'is-active'], ['Kétoldalas', q.double ? 'is-active' : '']].forEach(([label, cls]) => {
      const th = document.createElement('th');
      th.textContent = label;
      if (cls) th.className = cls;
      head.appendChild(th);
    });
    const thead = document.createElement('thead');
    thead.appendChild(head);
    table.appendChild(thead);
    const body = document.createElement('tbody');
    q.bands.forEach((b, i) => {
      const tr = document.createElement('tr');
      if (i === q.bandIndex && q.qty > 0) tr.className = 'is-current';
      [[bandLabel(b), ''], [formatPrice(b.single), q.double ? '' : 'is-active'], [formatPrice(b.single + b.double), q.double ? 'is-active' : '']].forEach(([text, cls]) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (cls) td.className = cls;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    const caption = document.createElement('p');
    caption.className = 'nbt-bands__title';
    caption.textContent = 'Darabárak a nyomtatással együtt';
    el.bands.appendChild(caption);
    el.bands.appendChild(table);
    const fees = sizesFor(product()).filter(size => sizeFee(size) > 0).map(size => size + ': +' + formatPrice(sizeFee(size)));
    if (fees.length) {
      const note = document.createElement('p');
      note.className = 'nbt-bands__note';
      note.textContent = 'Méretfelár darabonként – ' + fees.join(', ');
      el.bands.appendChild(note);
    }
  }

  function refresh() {
    // Ha a tervbe név került (vagy kikerült), előbb a névsor/darabszám nézet vált; az újra frissít.
    if (state.option && (hasBound() ? 'roster' : 'grid') !== state.qtyMode) { syncQtyMode(); return; }
    const q = computeQuote();
    el.sumQty.textContent = q.qty + ' db';
    el.barQty.textContent = q.qty + ' db';
    el.sumSides.textContent = !q.sides.length ? '–' : (q.double ? 'Kétoldalas (elöl és hátul)' : 'Egyoldalas (' + (q.sides[0] === 'back' ? 'hátul' : 'elöl') + ')');
    el.sumPersonalRow.hidden = !(personalFee > 0 && q.personalQty > 0);
    el.sumPersonalRow.querySelector('dt').textContent = isSport() ? 'Név/szám felár' : 'Név felár';
    el.sumPersonal.textContent = '+' + formatPrice(personalFee) + ' × ' + q.personalQty + ' db';
    el.sumSizeRow.hidden = !(q.sizeFees > 0);
    el.sumSize.textContent = '+' + formatPrice(q.sizeFees) + ' (' + q.sizeFeeQty + ' db)';
    renderRosterSum();
    renderQtySummary();
    renderBands(q);
    const hasTotal = q.qty > 0 && Number.isFinite(q.total);
    el.sumUnit.textContent = Number.isFinite(q.unit) ? formatPrice(q.unit) : '–';
    el.sumTotal.textContent = hasTotal ? formatPrice(q.total) : '–';
    el.barTotal.textContent = hasTotal ? formatPrice(q.total) : '–';
    const next = q.bands[q.bandIndex + 1];
    el.nextTier.hidden = !next || q.qty === 0;
    if (next) el.nextTier.textContent = 'Még ' + (next.min - q.qty) + ' db, és a darabár ' + formatPrice(next.single + (q.double ? next.double : 0)) + '.';
    const ready = readiness(q);
    if (errorIsCheck && !el.error.hidden) showError(ready, true);
    [el.cart, el.barCart].forEach(b => { b.dataset.ready = ready ? 'false' : 'true'; b.disabled = state.busy; });
    el.cart.title = ready || '';
    renderWarnings(q);
    updateEmptyHint();
    saveDraftSoon();
  }

  function readiness(q) {
    if (!state.option) return 'Válassz terméket.';
    if (!q.elements.length) return 'Tegyél a termékre logót vagy feliratot.';
    if (state.qtyMode === 'roster' && !state.roster.length) return isSport() ? 'Adj hozzá legalább egy játékost.' : 'Adj hozzá legalább egy nevet.';
    if (state.qtyMode === 'grid' && hasBound()) return 'A tervben darabonként változó ' + (isSport() ? 'név vagy szám' : 'név') + ' van: töltsd ki a Névsort, vagy a feliratnál válaszd a „Mindenkinél ugyanaz” tartalmat.';
    if (q.qty < 1) return 'Add meg, melyik méretből hány darab kell.';
    if (q.qty < minQty) return 'A minimum rendelés ' + minQty + ' db.';
    return '';
  }

  function renderWarnings(q) {
    const warnings = [];
    const colors = orderColors();
    if (!colors.length && state.color) colors.push(state.color);
    if (state.qtyMode === 'roster') {
      if (!hasBound() && state.roster.some(isPersonal)) {
        warnings.push(isSport()
          ? 'A névsorban megadott nevek és számok nem kerülnek a mezre, mert a tervben nincs név- vagy számmező. Adj hozzá „Hát név” vagy „Hát szám” elhelyezést, vagy egy feliratnál válaszd a „Név a névsorból” tartalmat.'
          : 'A névsorban megadott nevek nem kerülnek a ruhára, mert a tervben nincs névmező. Adj hozzá „Jobb mell felirat” elhelyezést, vagy egy feliratnál válaszd a „Név a névsorból” tartalmat.');
      }
      const byNumber = {};
      state.roster.forEach(pl => {
        const n = String(pl.number || '').trim();
        if (!n) return;
        const key = norm(pl.color) + '|' + n;
        (byNumber[key] = byNumber[key] || []).push(String(pl.name || '').trim() || '(név nélkül)');
      });
      Object.keys(byNumber).forEach(key => {
        if (byNumber[key].length > 1) warnings.push('A(z) ' + key.split('|')[1] + '-es szám többször szerepel: ' + byNumber[key].join(', ') + '.');
      });
    }
    q.elements.forEach(e => {
      const o = e.obj;
      if (o.type === 'text' && /^#[0-9a-f]{6}$/i.test(o.fill)) {
        colors.forEach(color => {
          const hex = colorHex(color);
          if (hex && contrast(o.fill, hex) < 1.7) warnings.push('A(z) „' + (o.nbBind ? (o.nbBind === 'number' ? 'szám' : 'név') : o.text) + '” felirat a(z) ' + colorLabel(color).toLowerCase() + ' színű ruhán alig fog látszani. Válassz más betűszínt.');
        });
      }
      if (o.type === 'image' && o._element && o._element.naturalWidth && !/svg/i.test(String(o.getSrc ? o.getSrc() : '').slice(0, 30))) {
        const dpi = o._element.naturalWidth / (e.w_mm / 25.4);
        if (dpi < 120) warnings.push('A logó felbontása alacsony (kb. ' + Math.round(dpi) + ' dpi ebben a méretben), nyomtatásban pixeles lehet. Tölts fel nagyobb vagy vektoros (SVG) változatot.');
      }
    });
    el.warnings.innerHTML = '';
    Array.from(new Set(warnings)).forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      el.warnings.appendChild(li);
    });
  }

  function toast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.toast.hidden = true; }, 3500);
  }

  let errorIsCheck = false;
  function showError(message, isCheck) {
    if (isCheck && errorIsCheck && el.error.textContent !== message) el.toast.hidden = true;
    errorIsCheck = !!isCheck;
    el.error.textContent = message;
    el.error.hidden = !message;
  }

  /* ---------------------------------------------------------------------- */
  /* Kosárba tétel                                                           */
  /* ---------------------------------------------------------------------- */

  function withHiddenHelpers(side, fn) {
    const s = sides[side];
    const c = s.canvas;
    const bg = c.backgroundImage;
    const bgColor = c.backgroundColor;
    c.discardActiveObject();
    if (s.areaRect) s.areaRect.visible = false;
    c.backgroundImage = null;
    c.backgroundColor = 'rgba(0,0,0,0)';
    c.renderAll();
    try { return fn(c); } finally {
      c.backgroundImage = bg;
      c.backgroundColor = bgColor;
      if (s.areaRect) s.areaRect.visible = true;
      c.renderAll();
    }
  }

  /** only: 'common' = a mindenkinél azonos elemek, 'personal' = csak a játékosonként változó feliratok. */
  function exportPrint(side, only) {
    const hidden = [];
    designObjects(side).forEach(o => {
      const bound = isText(o) && !!o.nbBind;
      if (o.visible !== false && (o.nbGhost || (only === 'common' && bound) || (only === 'personal' && !bound))) {
        o.visible = false;
        hidden.push(o);
      }
    });
    try { return exportArea(side); } finally { hidden.forEach(o => { o.visible = true; }); }
  }

  function exportArea(side) {
    const area = sides[side].area;
    const target = Math.min(area.widthMm / 25.4 * area.dpi, 3600);
    let multiplier = Math.min(target / area.w, 11000 / area.h);
    return withHiddenHelpers(side, c => {
      let url = '';
      for (let attempt = 0; attempt < 4; attempt++) {
        url = c.toDataURL({ format: 'png', left: area.x, top: area.y, width: area.w, height: area.h, multiplier, enableRetinaScaling: false });
        if (url.length * 0.75 < PRINT_MAX_BYTES) break;
        multiplier *= 0.75;
      }
      return url;
    });
  }

  function exportPreview(side) {
    const s = sides[side];
    const c = s.canvas;
    c.discardActiveObject();
    if (s.areaRect) s.areaRect.visible = false;
    const ghosts = designObjects(side).filter(o => o.nbGhost && o.visible !== false);
    ghosts.forEach(o => { o.visible = false; });
    c.renderAll();
    try {
      return c.toDataURL({ format: 'png', multiplier: Math.min(1, 520 / c.getWidth()), enableRetinaScaling: false });
    } finally {
      ghosts.forEach(o => { o.visible = true; });
      if (s.areaRect) s.areaRect.visible = true;
      c.renderAll();
    }
  }

  /** A rétegadatokból kihagyjuk a háttérképet és a nagy beágyazott képeket: a nyomdai PNG úgyis tartalmazza őket. */
  function compactLayers(json) {
    const objects = (json.objects || []).map(o => {
      if (o.type === 'image' && typeof o.src === 'string' && o.src.indexOf('data:') === 0 && o.src.length > 200000) {
        return Object.assign({}, o, { src: '', nbOmittedSrc: true });
      }
      return o;
    });
    return { version: json.version, objects };
  }

  async function submitOrder() {
    if (state.busy) return;
    const quote = computeQuote();
    const problem = readiness(quote);
    if (problem) { showError(problem, true); toast(problem); return; }
    showError('');
    state.busy = true;
    el.busy.hidden = false;
    el.busyText.textContent = 'Nyomdai fájlok készítése…';
    const previewBefore = state.color;
    try {
      const families = new Set();
      ['front', 'back'].forEach(side => designObjects(side).forEach(o => { if (o.type === 'text') families.add(o.fontFamily); }));
      await Promise.all(Array.from(families).map(ensureFont));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const sidesUsed = quote.sides;
      const print = {};
      const roster = state.qtyMode === 'roster';
      displayPlayer(null);
      sidesUsed.forEach(side => { print[side] = exportPrint(side, roster ? 'common' : ''); });
      const personal = [];
      if (roster && hasBound()) {
        for (let i = 0; i < state.roster.length; i++) {
          const player = state.roster[i];
          personal[i] = {};
          if (!playerHasPrint(player)) continue;
          el.busyText.textContent = 'Névfájlok készítése (' + (i + 1) + '/' + state.roster.length + ')…';
          if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
          displayPlayer(player);
          ['front', 'back'].forEach(side => {
            if (boundObjects(side).some(o => o.visible !== false && !o.nbGhost)) personal[i][side] = exportPrint(side, 'personal');
          });
        }
      }
      const colors = orderColors();
      const previews = [];
      for (let i = 0; i < colors.length; i++) {
        el.busyText.textContent = 'Előnézetek készítése (' + (i + 1) + '/' + colors.length + ')…';
        displayPlayer(roster ? (state.roster.find(pl => norm(pl.color) === norm(colors[i]) && isPersonal(pl)) || null) : null);
        await applyMockups(colors[i]);
        previews.push({
          color: colors[i],
          front: exportPreview('front'),
          back: sidesUsed.includes('back') ? exportPreview('back') : ''
        });
      }
      await applyMockups(previewBefore);
      displayPlayer();
      const rows = orderRows().map(r => ({ color: r.color, size: r.size, qty: r.qty }));
      const elements = measureElements().map(e => ({ side: e.side, x_mm: e.x_mm, y_mm: e.y_mm, w_mm: e.w_mm, h_mm: e.h_mm }));
      el.busyText.textContent = 'Kosárba tétel…';
      const body = {
        product_id: parseInt(state.option.pid, 10),
        type: state.option.type,
        mode: state.mode,
        elements,
        layers: { front: compactLayers(sides.front.canvas.toJSON(OBJECT_PROPS)), back: compactLayers(sides.back.canvas.toJSON(OBJECT_PROPS)) },
        print,
        previews,
        rows,
        roster: roster ? state.roster.map((pl, i) => ({ name: pl.name.trim(), number: pl.number, size: pl.size, color: pl.color, personal: personal[i] || {} })) : []
      };
      let res;
      try {
        res = await fetch(D.rest + 'team/order', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': D.nonce },
          body: JSON.stringify(body)
        });
      } catch (err) {
        throw new Error('Hálózati hiba. Ellenőrizd az internetkapcsolatot, majd próbáld újra.');
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json && json.message ? json.message : 'Nem sikerült kosárba tenni.');
      clearDraft();
      el.busyText.textContent = 'Kész, irány a kosár…';
      window.location.href = json.redirect || D.cartUrl || '/';
    } catch (err) {
      await applyMockups(previewBefore).catch(() => { });
      displayPlayer();
      el.busy.hidden = true;
      state.busy = false;
      refresh();
      showError(err.message || 'Nem sikerült kosárba tenni.');
      toast(err.message || 'Nem sikerült kosárba tenni.');
    }
  }
  el.cart.addEventListener('click', submitOrder);
  el.barCart.addEventListener('click', submitOrder);

  /* ---------------------------------------------------------------------- */
  /* Piszkozat a böngészőben                                                 */
  /* ---------------------------------------------------------------------- */

  let draftTimer = 0;
  let draftEnabled = false;
  function saveDraftSoon() {
    if (!draftEnabled) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 800);
  }

  function saveDraft() {
    if (!state.option) return;
    const data = {
      t: Date.now(), mode: state.mode, option: state.option.key, color: state.color, rows: state.rows,
      qtyMode: state.qtyMode, roster: state.roster, activePlayer: state.activePlayer,
      logo: state.logo, front: sides.front.canvas.toJSON(OBJECT_PROPS), back: sides.back.canvas.toJSON(OBJECT_PROPS)
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {
      try { data.logo = null; localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e2) { /* nincs hely */ }
    }
  }

  function readDraft() {
    try {
      const data = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (data && data.option && Date.now() - (data.t || 0) < 30 * 86400000) return data;
    } catch (e) { /* sérült vagy tiltott tároló */ }
    return null;
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* tiltott tároló */ }
  }

  function loadSide(side, json) {
    return new Promise(resolve => {
      if (!json || !Array.isArray(json.objects)) { resolve(); return; }
      const objects = json.objects.filter(o => !o.nbArea);
      fabric.util.enlivenObjects(objects, enlivened => {
        enlivened.forEach(o => {
          sides[side].canvas.add(o);
          if (o.type === 'text') refitTextAfterFont(o, side);
        });
        resolve();
      });
    });
  }

  async function restoreDraft(data) {
    const opt = productOptions().find(o => o.key === data.option);
    if (!opt) { clearDraft(); return false; }
    state.mode = data.mode === 'sport' ? 'sport' : 'work';
    state.rows = Array.isArray(data.rows) ? data.rows.filter(r => r && r.color).map(r => ({ color: r.color, qty: r.qty || {} })) : [];
    state.color = data.color || '';
    state.logo = data.logo || null;
    state.roster = Array.isArray(data.roster) ? data.roster.filter(pl => pl && typeof pl === 'object').map(pl => ({
      name: String(pl.name || ''), number: String(pl.number || ''), size: String(pl.size || ''), color: String(pl.color || '')
    })) : [];
    state.qtyMode = data.qtyMode === 'roster' && state.roster.length ? 'roster' : 'grid';
    state.activePlayer = state.qtyMode === 'roster' ? Math.min(Math.max(0, parseInt(data.activePlayer, 10) || 0), state.roster.length - 1) : -1;
    if (state.logo) { el.logoName.textContent = state.logo.name || 'Feltöltött logó'; el.upload.textContent = 'Másik logó'; }
    showWork();
    await selectOption(opt, state.rows.length > 0);
    if (!state.rows.length) await selectOption(opt);
    await loadSide('front', data.front);
    await loadSide('back', data.back);
    renderQtyMode();
    displayPlayer();
    refresh();
    return true;
  }

  /* ---------------------------------------------------------------------- */
  /* Indulás                                                                 */
  /* ---------------------------------------------------------------------- */

  function showWork() {
    el.mode.hidden = true;
    el.work.hidden = false;
    app.dataset.view = 'work';
    el.modeLabel.textContent = isSport() ? 'Csapatmez' : 'Munkaruha';
    el.rosterHelp.textContent = isSport()
      ? 'Mezenként egy sor: név és szám párban (a névmezőbe egyben is írhatod, pl. „Kaci 5”). A darabszámot a névsorból számoljuk; név vagy szám nélkül is felvehetsz mezt. Kattints egy játékosra, és a mezen az ő neve látszik.'
      : 'Darabonként egy sor a névvel, mérettel és színnel. A darabszámot a névsorból számoljuk; név nélküli darabot is felvehetsz. Kattints egy névre, és a ruhán az látszik.';
    renderPresets();
    if (state.option) renderQtyMode();
    requestAnimationFrame(fitCanvasCss);
  }

  async function startMode(mode) {
    state.mode = mode === 'sport' ? 'sport' : 'work';
    showWork();
    if (!state.option) {
      const params = new URLSearchParams(window.location.search);
      const options = productOptions();
      const wanted = options.find(o => o.pid === params.get('nb_product') && (!params.get('nb_type') || o.typeKey === norm(params.get('nb_type'))));
      if (wanted || options[0]) await selectOption(wanted || options[0]);
    }
    draftEnabled = true;
    refresh();
    window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' });
  }

  app.querySelectorAll('.nbt-mode-card').forEach(btn => btn.addEventListener('click', () => startMode(btn.dataset.mode)));
  $('nbt-change-mode').addEventListener('click', () => {
    el.work.hidden = true;
    el.mode.hidden = false;
    el.draft.hidden = true;
    app.dataset.view = 'mode';
  });
  app.querySelectorAll('.nbt-sides [data-side]').forEach(btn => btn.addEventListener('click', () => setSide(btn.dataset.side)));
  el.addPlayer.addEventListener('click', addPlayer);

  FONTS.forEach(f => {
    const o = document.createElement('option');
    o.value = f.family; o.textContent = f.label;
    el.font.appendChild(o);
  });
  ensureFont(TEXT_FONT);
  ensureFont(NUMBER_FONT);
  renderTypes();

  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitCanvasCss, 100); });

  const draft = readDraft();
  if (draft) {
    el.draft.hidden = false;
    el.draftRestore.addEventListener('click', async () => {
      el.draft.hidden = true;
      if (await restoreDraft(draft)) draftEnabled = true;
    });
    el.draftDiscard.addEventListener('click', () => { clearDraft(); el.draft.hidden = true; });
  }

  const initialMode = new URLSearchParams(window.location.search).get('mode');
  if (!draft && (initialMode === 'work' || initialMode === 'sport')) startMode(initialMode);

  window.NBTeamDesigner = { state, sides, computeQuote };
})();
