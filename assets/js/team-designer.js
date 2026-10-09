/* Csapat- és munkaruha-tervező (külön modul, az eredeti tervezőtől független). */
(function () {
  'use strict';

  const D = window.NB_TEAM || {};
  const app = document.getElementById('nbt-app');
  if (!app || typeof fabric === 'undefined') return;

  const catalog = D.catalog || {};
  const mockups = D.mockups || {};
  const team = D.team || {};
  const tiers = Array.isArray(team.tiers) ? team.tiers : [];
  const presets = Array.isArray(team.presets) ? team.presets : [];
  const discounts = Array.isArray(D.discounts) ? D.discounts : [];
  const gapMm = Number(team.gap_mm) >= 0 ? Number(team.gap_mm) : 20;
  const minQty = Math.max(1, parseInt(team.min_qty, 10) || 1);
  const maxColors = Math.max(1, parseInt(team.max_colors, 10) || 8);
  const DRAFT_KEY = 'nb_team_draft_v1';
  const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
  const PRINT_MAX_BYTES = 24 * 1024 * 1024;

  const $ = id => document.getElementById(id);
  const el = {
    mode: $('nbt-mode'), work: $('nbt-work'), modeLabel: $('nbt-mode-label'),
    types: $('nbt-types'), colors: $('nbt-colors'), colorName: $('nbt-color-name'),
    presets: $('nbt-presets'), upload: $('nbt-upload'), file: $('nbt-file'), logoName: $('nbt-logo-name'),
    addText: $('nbt-add-text'), rows: $('nbt-rows'), addColor: $('nbt-add-color'), addColorWrap: $('nbt-add-color-wrap'),
    frame: $('nbt-canvas-frame'), empty: $('nbt-canvas-empty'),
    selection: $('nbt-selection'), textInput: $('nbt-text-input'), font: $('nbt-font'), textColor: $('nbt-text-color'),
    sizeReadout: $('nbt-size-readout'), center: $('nbt-center'), duplicate: $('nbt-duplicate'), del: $('nbt-delete'),
    warnings: $('nbt-warnings'),
    sumQty: $('nbt-sum-qty'), sumPrint: $('nbt-sum-print'), sumDiscountRow: $('nbt-sum-discount-row'), sumDiscount: $('nbt-sum-discount'),
    sumUnit: $('nbt-sum-unit'), sumTotal: $('nbt-sum-total'), placements: $('nbt-placements'), nextTier: $('nbt-next-tier'),
    error: $('nbt-error'), cart: $('nbt-cart'), barQty: $('nbt-bar-qty'), barTotal: $('nbt-bar-total'), barCart: $('nbt-bar-cart'),
    busy: $('nbt-busy'), busyText: $('nbt-busy-text'), toast: $('nbt-toast'),
    draft: $('nbt-draft'), draftRestore: $('nbt-draft-restore'), draftDiscard: $('nbt-draft-discard')
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

  function basePrice(product, typeKey, color, size) {
    const key = typeKey + '|' + norm(color) + '|' + size;
    if (product.prices && Number.isFinite(Number(product.prices[key]))) return Number(product.prices[key]);
    return Number.isFinite(Number(product.price_value)) && product.price_value !== null ? Number(product.price_value) : NaN;
  }

  function discountFor(qty) {
    let best = 0;
    discounts.forEach(t => {
      const min = parseInt(t.min_qty, 10) || 0;
      const max = parseInt(t.max_qty, 10) || 0;
      const pct = Number(t.percent) || 0;
      if (min > 0 && qty >= min && (!max || qty <= max) && pct > best) best = pct;
    });
    return best;
  }

  function nextDiscount(qty, current) {
    return discounts
      .map(t => ({ min: parseInt(t.min_qty, 10) || 0, pct: Number(t.percent) || 0 }))
      .filter(t => t.min > qty && t.pct > current)
      .sort((a, b) => a.min - b.min)[0] || null;
  }

  /* ---------------------------------------------------------------------- */
  /* Állapot                                                                 */
  /* ---------------------------------------------------------------------- */

  const state = {
    mode: 'work',
    option: null,      // kiválasztott termék + típus
    color: '',         // előnézeti szín
    rows: [],          // [{ color, qty: { size: n } }]
    side: 'front',
    logo: null,        // { src, name }
    pendingPreset: null,
    busy: false
  };

  const sides = {};
  ['front', 'back'].forEach(side => {
    const canvas = new fabric.Canvas('nbt-canvas-' + side, { preserveObjectStacking: true, selection: false, backgroundColor: '#ffffff' });
    sides[side] = { canvas, area: null, areaRect: null, token: null, wrap: app.querySelector('.nbt-canvas[data-side="' + side + '"]') };
    canvas.on('object:moving', e => keepInside(e.target, side));
    canvas.on('object:scaling', e => keepInside(e.target, side));
    canvas.on('object:modified', e => {
      const o = e.target;
      if (o && o.type === 'text' && o.nbMaxW) o.set({ nbBaseScale: o.scaleX, nbMaxW: o.getScaledWidth() });
      syncSelection();
      refresh();
    });
    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', syncSelection);
  });

  fabric.Object.prototype.set({
    transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: '#1f6feb', borderColor: '#1f6feb',
    cornerStyle: 'circle', cornerSize: 14, touchCornerSize: 28, padding: 4
  });

  const activeCanvas = () => sides[state.side].canvas;
  const designObjects = side => sides[side].canvas.getObjects().filter(o => !o.nbArea);
  const product = () => state.option ? catalog[state.option.pid] : null;

  /* ---------------------------------------------------------------------- */
  /* Vászon                                                                  */
  /* ---------------------------------------------------------------------- */

  function fitCanvasCss() {
    const frameWidth = el.frame.clientWidth || 360;
    const maxHeight = Math.max(280, Math.min(window.innerHeight * (window.innerWidth < 960 ? 0.58 : 0.78), 900));
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
  function pricePlacements(elements) {
    const placements = [];
    ['front', 'back'].forEach(side => {
      const items = elements.filter(e => e.side === side);
      const parent = items.map((_, i) => i);
      const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          if (a.x_mm <= b.x_mm + b.w_mm + gapMm && b.x_mm <= a.x_mm + a.w_mm + gapMm &&
            a.y_mm <= b.y_mm + b.h_mm + gapMm && b.y_mm <= a.y_mm + a.h_mm + gapMm) {
            const ri = find(i), rj = find(j);
            if (ri !== rj) parent[rj] = ri;
          }
        }
      }
      const boxes = {};
      items.forEach((e, i) => {
        const r = find(i);
        const box = boxes[r] || (boxes[r] = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
        box.x1 = Math.min(box.x1, e.x_mm); box.y1 = Math.min(box.y1, e.y_mm);
        box.x2 = Math.max(box.x2, e.x_mm + e.w_mm); box.y2 = Math.max(box.y2, e.y_mm + e.h_mm);
      });
      Object.keys(boxes).forEach(r => {
        const w = boxes[r].x2 - boxes[r].x1, h = boxes[r].y2 - boxes[r].y1;
        const tier = tiers.find(t => (w <= t.max_w_mm + 1 && h <= t.max_h_mm + 1) || (w <= t.max_h_mm + 1 && h <= t.max_w_mm + 1)) || tiers[tiers.length - 1];
        if (tier) placements.push({ side, w_mm: w, h_mm: h, label: tier.label, price: Number(tier.price) || 0 });
      });
    });
    return placements;
  }

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

  function addText(text, box, side, kind) {
    const obj = new fabric.Text(text, {
      fontFamily: kind === 'number' ? NUMBER_FONT : TEXT_FONT,
      fontWeight: 700, fontSize: 100, fill: defaultTextColor(), textAlign: 'center', nbKind: kind
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
      obj = addText(preset.text || (preset.kind === 'number' ? '10' : 'FELIRAT'), box, preset.side, preset.kind);
    }
    if (!obj) return;
    sides[preset.side].canvas.setActiveObject(obj);
    sides[preset.side].canvas.requestRenderAll();
    syncSelection();
    refresh();
    if (preset.kind !== 'logo') focusTextInput();
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
      if (document.activeElement !== el.textInput) el.textInput.value = obj.text || '';
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
    obj.set('text', el.textInput.value || ' ');
    obj.initDimensions();
    fitTextWidth(obj);
    obj.set('left', centerX - obj.getScaledWidth() / 2);
    keepInside(obj, state.side);
    activeCanvas().requestRenderAll();
    syncSelection();
    scheduleRefresh();
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
      copy.set({ left: obj.left + 15, top: obj.top + 15, nbKind: obj.nbKind });
      activeCanvas().add(copy);
      keepInside(copy, state.side);
      activeCanvas().setActiveObject(copy).requestRenderAll();
      syncSelection();
      refresh();
    }, ['nbKind', 'nbMaxW', 'nbBaseScale']);
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
      btn.innerHTML = '<span class="nbt-type__img"></span><span class="nbt-type__label"></span><small></small>';
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
    renderTypes();
    renderColors();
    renderRows();
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
    state.color = color;
    renderColors();
    renderRows();
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
  const totalQty = () => state.rows.reduce((sum, r) => sum + rowTotal(r), 0);

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

  function renderAddColor() {
    const p = product();
    const used = state.rows.map(r => norm(r.color));
    const free = p ? colorsFor(p, state.option.typeKey).filter(c => !used.includes(norm(c))) : [];
    el.addColorWrap.hidden = !free.length || state.rows.length >= maxColors;
    el.addColor.innerHTML = '<option value="">Válassz színt…</option>';
    free.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = colorLabel(c);
      el.addColor.appendChild(o);
    });
  }

  el.addColor.addEventListener('change', () => {
    const color = el.addColor.value;
    if (!color) return;
    state.rows.push({ color, qty: {} });
    previewColor(color, false).then(() => {
      const inputs = el.rows.querySelectorAll('.nbt-row:last-child input');
      if (inputs[0] && window.matchMedia('(pointer: fine)').matches) inputs[0].focus();
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Összesítő, figyelmeztetések                                             */
  /* ---------------------------------------------------------------------- */

  let refreshTimer = 0;
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 120);
  }

  function computeQuote() {
    const p = product();
    const elements = measureElements();
    const placements = pricePlacements(elements);
    const unitPrint = placements.reduce((s, x) => s + x.price, 0);
    const qty = totalQty();
    let subtotal = 0;
    let priceKnown = true;
    if (p) {
      const sizes = sizesFor(p);
      state.rows.forEach(row => sizes.forEach(size => {
        const n = parseInt(row.qty[size], 10) || 0;
        if (!n) return;
        const base = basePrice(p, state.option.typeKey, row.color, size);
        if (!Number.isFinite(base)) priceKnown = false;
        subtotal += ((Number.isFinite(base) ? base : 0) + unitPrint) * n;
      }));
    }
    const pct = discountFor(qty);
    const discount = subtotal * pct / 100;
    return { elements, placements, unitPrint, qty, subtotal, pct, discount, total: subtotal - discount, priceKnown };
  }

  function refresh() {
    const q = computeQuote();
    el.sumQty.textContent = q.qty + ' db';
    el.barQty.textContent = q.qty + ' db';
    el.sumPrint.textContent = q.placements.length ? '+' + formatPrice(q.unitPrint) + ' (' + q.placements.length + ' nyomat)' : '–';
    el.placements.innerHTML = '';
    q.placements.forEach(pl => {
      const li = document.createElement('li');
      li.textContent = (pl.side === 'front' ? 'Elöl' : 'Hátul') + ': ' + pl.label + ', ' + cm(pl.w_mm) + '×' + cm(pl.h_mm) + ' cm – ' + formatPrice(pl.price);
      el.placements.appendChild(li);
    });
    el.sumDiscountRow.hidden = !(q.pct > 0 && q.qty > 0);
    el.sumDiscount.textContent = '−' + String(q.pct).replace('.', ',') + '% (−' + formatPrice(q.discount) + ')';
    const hasTotal = q.qty > 0 && q.priceKnown;
    el.sumUnit.textContent = hasTotal ? formatPrice(q.total / q.qty) : '–';
    el.sumTotal.textContent = hasTotal ? formatPrice(q.total) : (q.qty > 0 ? 'A kosárban látható' : '–');
    el.barTotal.textContent = hasTotal ? formatPrice(q.total) : '–';
    const next = nextDiscount(q.qty, q.pct);
    el.nextTier.hidden = !next || q.qty === 0;
    if (next) el.nextTier.textContent = 'Még ' + (next.min - q.qty) + ' db, és ' + String(next.pct).replace('.', ',') + '% kedvezmény jár.';
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
    if (!q.placements.length) return 'Tegyél a termékre logót vagy feliratot.';
    if (q.qty < 1) return 'Add meg, melyik méretből hány darab kell.';
    if (q.qty < minQty) return 'A minimum rendelés ' + minQty + ' db.';
    return '';
  }

  function renderWarnings(q) {
    const warnings = [];
    const colors = state.rows.filter(r => rowTotal(r) > 0).map(r => r.color);
    if (!colors.length && state.color) colors.push(state.color);
    q.elements.forEach(e => {
      const o = e.obj;
      if (o.type === 'text' && /^#[0-9a-f]{6}$/i.test(o.fill)) {
        colors.forEach(color => {
          const hex = colorHex(color);
          if (hex && contrast(o.fill, hex) < 1.7) warnings.push('A(z) „' + o.text + '” felirat a(z) ' + colorLabel(color).toLowerCase() + ' színű ruhán alig fog látszani. Válassz más betűszínt.');
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

  function exportPrint(side) {
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
    c.renderAll();
    try {
      return c.toDataURL({ format: 'png', multiplier: Math.min(1, 520 / c.getWidth()), enableRetinaScaling: false });
    } finally {
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
      const sidesUsed = Array.from(new Set(quote.placements.map(p => p.side)));
      const print = {};
      sidesUsed.forEach(side => { print[side] = exportPrint(side); });
      const colors = [];
      state.rows.forEach(r => { if (rowTotal(r) > 0 && !colors.some(c => norm(c) === norm(r.color))) colors.push(r.color); });
      const previews = [];
      for (let i = 0; i < colors.length; i++) {
        el.busyText.textContent = 'Előnézetek készítése (' + (i + 1) + '/' + colors.length + ')…';
        await applyMockups(colors[i]);
        previews.push({
          color: colors[i],
          front: exportPreview('front'),
          back: sidesUsed.includes('back') ? exportPreview('back') : ''
        });
      }
      await applyMockups(previewBefore);
      const p = product();
      const rows = [];
      state.rows.forEach(r => sizesFor(p).forEach(size => {
        const n = parseInt(r.qty[size], 10) || 0;
        if (n) rows.push({ color: r.color, size, qty: n });
      }));
      const elements = measureElements().map(e => ({ side: e.side, x_mm: e.x_mm, y_mm: e.y_mm, w_mm: e.w_mm, h_mm: e.h_mm }));
      el.busyText.textContent = 'Kosárba tétel…';
      const body = {
        product_id: parseInt(state.option.pid, 10),
        type: state.option.type,
        mode: state.mode,
        elements,
        layers: { front: compactLayers(sides.front.canvas.toJSON(['nbKind', 'nbMaxW', 'nbBaseScale'])), back: compactLayers(sides.back.canvas.toJSON(['nbKind', 'nbMaxW', 'nbBaseScale'])) },
        print,
        previews,
        rows
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
      logo: state.logo, front: sides.front.canvas.toJSON(['nbKind', 'nbMaxW', 'nbBaseScale']), back: sides.back.canvas.toJSON(['nbKind', 'nbMaxW', 'nbBaseScale'])
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
    if (state.logo) { el.logoName.textContent = state.logo.name || 'Feltöltött logó'; el.upload.textContent = 'Másik logó'; }
    showWork();
    await selectOption(opt, state.rows.length > 0);
    if (!state.rows.length) await selectOption(opt);
    await loadSide('front', data.front);
    await loadSide('back', data.back);
    ['front', 'back'].forEach(s => sides[s].canvas.requestRenderAll());
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
    el.modeLabel.textContent = state.mode === 'sport' ? 'Csapatmez' : 'Munkaruha';
    renderPresets();
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
